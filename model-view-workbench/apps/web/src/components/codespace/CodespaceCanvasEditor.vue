<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  MvCodespaceAssociation,
  MvCodespaceAssociationKind,
  MvCodespaceClassifier,
  MvCodespaceClassifierBase,
  MvCodespaceFunction,
  MvCodespaceMacro,
  MvCodespaceMember,
  MvCodespaceNamespaceNode,
  MvCodespaceVariable,
  MvModelCodespaceModule,
  MvModelCodespacePayload,
} from '@mvwb/core';
import {
  collectClassifierIds,
  getNamespaceAtPath,
  insertNamespaceChild,
  newCodespaceUniqueId,
  removeNamespaceAtPath,
} from '../../utils/codespace-canvas';

const props = defineProps<{
  modelValue: MvModelCodespacePayload;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: MvModelCodespacePayload): void;
}>();

type CsSelection =
  | { t: 'meta' }
  | { t: 'module'; mi: number }
  | { t: 'ns'; mi: number; path: number[] }
  | { t: 'class'; mi: number; path: number[]; ci: number }
  | { t: 'var'; mi: number; path: number[]; vi: number }
  | { t: 'fn'; mi: number; path: number[]; fi: number }
  | { t: 'macro'; mi: number; path: number[]; maci: number }
  | { t: 'assoc'; mi: number; path: number[]; ai: number };

const selection = ref<CsSelection>({ t: 'meta' });
const advancedJsonOpen = ref(false);
const advancedJsonText = ref('');
const moduleDeleteMi = ref<number | null>(null);
const nsDeleteCtx = ref<{ mi: number; path: number[] } | null>(null);

function patch(updater: (d: MvModelCodespacePayload) => void) {
  const d = JSON.parse(JSON.stringify(props.modelValue)) as MvModelCodespacePayload;
  updater(d);
  emit('update:modelValue', d);
}

watch(
  () => props.modelValue,
  () => {
    if (advancedJsonOpen.value) {
      advancedJsonText.value = JSON.stringify(props.modelValue, null, 2);
    }
  },
  { deep: true },
);

function onAdvancedToggle(ev: Event) {
  const el = ev.target as HTMLDetailsElement;
  advancedJsonOpen.value = el.open;
  if (el.open) advancedJsonText.value = JSON.stringify(props.modelValue, null, 2);
}

function applyAdvancedJson() {
  try {
    const p = JSON.parse(advancedJsonText.value) as MvModelCodespacePayload;
    if (!p || typeof p !== 'object' || !Array.isArray(p.modules)) {
      window.alert('JSON 须为对象且含 modules 数组。');
      return;
    }
    emit('update:modelValue', p);
    selection.value = { t: 'meta' };
    advancedJsonText.value = JSON.stringify(p, null, 2);
  } catch {
    window.alert('JSON 解析失败。');
  }
}

interface FlatRow {
  depth: number;
  label: string;
  sel: CsSelection;
}

const sidebarRows = computed((): FlatRow[] => {
  const d = props.modelValue;
  const rows: FlatRow[] = [];
  rows.push({ depth: 0, label: '块属性 · workspace / title', sel: { t: 'meta' } });
  (d.modules ?? []).forEach((m, mi) => {
    rows.push({ depth: 0, label: `模块 · ${m.name} (${m.id})`, sel: { t: 'module', mi } });
    const walkNs = (nodes: MvCodespaceNamespaceNode[] | undefined, path: number[], baseDepth: number) => {
      if (!nodes?.length) return;
      nodes.forEach((ns, i) => {
        const pth = [...path, i];
        rows.push({ depth: baseDepth, label: `命名空间 · ${ns.name}`, sel: { t: 'ns', mi, path: pth } });
        (ns.classes ?? []).forEach((_c: MvCodespaceClassifier, ci: number) => {
          rows.push({
            depth: baseDepth + 1,
            label: `类 · ${ns.classes![ci].name}`,
            sel: { t: 'class', mi, path: pth, ci },
          });
        });
        (ns.variables ?? []).forEach((_v: MvCodespaceVariable, vi: number) => {
          rows.push({
            depth: baseDepth + 1,
            label: `变量 · ${ns.variables![vi].name}`,
            sel: { t: 'var', mi, path: pth, vi },
          });
        });
        (ns.functions ?? []).forEach((_f: MvCodespaceFunction, fi: number) => {
          rows.push({
            depth: baseDepth + 1,
            label: `函数 · ${ns.functions![fi].name}`,
            sel: { t: 'fn', mi, path: pth, fi },
          });
        });
        (ns.macros ?? []).forEach((_m: MvCodespaceMacro, maci: number) => {
          rows.push({
            depth: baseDepth + 1,
            label: `宏 · ${ns.macros![maci].name}`,
            sel: { t: 'macro', mi, path: pth, maci },
          });
        });
        (ns.associations ?? []).forEach((_a: MvCodespaceAssociation, ai: number) => {
          rows.push({
            depth: baseDepth + 1,
            label: `关联 · ${ns.associations![ai].id}`,
            sel: { t: 'assoc', mi, path: pth, ai },
          });
        });
        walkNs(ns.namespaces, pth, baseDepth + 1);
      });
    };
    walkNs(m.namespaces, [], 1);
  });
  return rows;
});

const classifierOptions = computed(() => collectClassifierIds(props.modelValue));

function selectRow(sel: CsSelection) {
  selection.value = sel;
}

function addModule() {
  patch((d) => {
    d.modules.push({
      id: newCodespaceUniqueId('mod', d),
      name: '新模块',
    });
  });
}

function tryRequestDeleteModule(mi: number) {
  if (props.modelValue.modules.length <= 1) {
    window.alert('至少保留一个模块。');
    return;
  }
  moduleDeleteMi.value = mi;
}

function confirmDeleteModule() {
  const mi = moduleDeleteMi.value;
  moduleDeleteMi.value = null;
  if (mi === null) return;
  patch((d) => {
    if (d.modules.length <= 1) return;
    d.modules.splice(mi, 1);
    selection.value = { t: 'meta' };
  });
}

function cancelDeleteModule() {
  moduleDeleteMi.value = null;
}

function requestDeleteNs(mi: number, path: number[]) {
  nsDeleteCtx.value = { mi, path };
}

function confirmDeleteNs() {
  const ctx = nsDeleteCtx.value;
  nsDeleteCtx.value = null;
  if (!ctx) return;
  patch((d) => {
    removeNamespaceAtPath(d, ctx.mi, ctx.path);
  });
  selection.value = { t: 'module', mi: ctx.mi };
}

function cancelDeleteNs() {
  nsDeleteCtx.value = null;
}

function addTopLevelNs(mi: number) {
  patch((d) => {
    insertNamespaceChild(d, mi, [], {
      id: newCodespaceUniqueId('ns', d),
      name: '新命名空间',
      namespaces: [],
    });
  });
}

function addChildNs(mi: number, parentPath: number[]) {
  patch((d) => {
    insertNamespaceChild(d, mi, parentPath, {
      id: newCodespaceUniqueId('ns', d),
      name: '子命名空间',
      namespaces: [],
    });
  });
}

function addClass(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.classes) n.classes = [];
    n.classes.push({
      id: newCodespaceUniqueId('cls', d),
      name: '新类',
      kind: 'class',
    });
  });
}

function removeClass(mi: number, path: number[], ci: number) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    n?.classes?.splice(ci, 1);
  });
}

function addVar(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.variables) n.variables = [];
    n.variables.push({ id: newCodespaceUniqueId('var', d), name: '新变量' });
  });
}

function addFn(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.functions) n.functions = [];
    n.functions.push({ id: newCodespaceUniqueId('fn', d), name: '新函数' });
  });
}

function addMacro(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.macros) n.macros = [];
    n.macros.push({ id: newCodespaceUniqueId('mac', d), name: '新宏' });
  });
}

function addAssoc(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.associations) n.associations = [];
    const ids = collectClassifierIds(d);
    const from = ids[0] ?? '';
    const to = ids[1] ?? from;
    n.associations.push({
      id: newCodespaceUniqueId('asc', d),
      kind: 'association',
      fromClassifierId: from,
      toClassifierId: to,
    });
  });
}

function isSelRow(sel: CsSelection, row: FlatRow): boolean {
  return JSON.stringify(sel) === JSON.stringify(row.sel);
}

const ASSOC_KINDS: MvCodespaceAssociationKind[] = [
  'association',
  'aggregation',
  'composition',
  'dependency',
];
const CLASSIFIER_KINDS = ['class', 'interface', 'struct'] as const;
const MEMBER_KINDS = ['field', 'method', 'enumLiteral'] as const;
const BASE_REL = ['generalization', 'realization'] as const;

const selectedModule = computed((): MvModelCodespaceModule | null => {
  const s = selection.value;
  if (s.t !== 'module') return null;
  return props.modelValue.modules[s.mi] ?? null;
});

const selectedNs = computed((): MvCodespaceNamespaceNode | null => {
  const s = selection.value;
  if (s.t !== 'ns') return null;
  return getNamespaceAtPath(props.modelValue, s.mi, s.path);
});

const selectedClass = computed((): MvCodespaceClassifier | null => {
  const s = selection.value;
  if (s.t !== 'class') return null;
  return getNamespaceAtPath(props.modelValue, s.mi, s.path)?.classes?.[s.ci] ?? null;
});

const selectedVar = computed((): MvCodespaceVariable | null => {
  const s = selection.value;
  if (s.t !== 'var') return null;
  return getNamespaceAtPath(props.modelValue, s.mi, s.path)?.variables?.[s.vi] ?? null;
});

const selectedFn = computed((): MvCodespaceFunction | null => {
  const s = selection.value;
  if (s.t !== 'fn') return null;
  return getNamespaceAtPath(props.modelValue, s.mi, s.path)?.functions?.[s.fi] ?? null;
});

const selectedMacro = computed((): MvCodespaceMacro | null => {
  const s = selection.value;
  if (s.t !== 'macro') return null;
  return getNamespaceAtPath(props.modelValue, s.mi, s.path)?.macros?.[s.maci] ?? null;
});

const selectedAssoc = computed((): MvCodespaceAssociation | null => {
  const s = selection.value;
  if (s.t !== 'assoc') return null;
  return getNamespaceAtPath(props.modelValue, s.mi, s.path)?.associations?.[s.ai] ?? null;
});

function patchMetaTitle(title: string) {
  patch((d) => {
    d.title = title.trim() ? title : undefined;
  });
}

function patchMetaRoot(root: string) {
  patch((d) => {
    d.workspaceRoot = root.trim() ? root : undefined;
  });
}

function patchModuleField(mi: number, key: keyof MvModelCodespaceModule, value: string) {
  patch((d) => {
    const m = d.modules[mi];
    if (!m) return;
    if (key === 'id' || key === 'name') {
      (m as unknown as Record<string, unknown>)[key] = value;
      return;
    }
    const v = value.trim();
    (m as unknown as Record<string, unknown>)[key] = v ? value : undefined;
  });
}

function patchNsField(mi: number, path: number[], key: 'name' | 'qualifiedName' | 'notes', value: string) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (key === 'name') n.name = value;
    else {
      const v = value.trim();
      n[key] = v ? value : undefined;
    }
  });
}

function patchClassField(
  mi: number,
  path: number[],
  ci: number,
  key: keyof MvCodespaceClassifier,
  value: unknown,
) {
  patch((d) => {
    const c = getNamespaceAtPath(d, mi, path)?.classes?.[ci];
    if (!c) return;
    if (key === 'kind') {
      const s = typeof value === 'string' ? value : '';
      if (!s || s === 'class') delete c.kind;
      else c.kind = s as MvCodespaceClassifier['kind'];
      return;
    }
    if (key === 'abstract') {
      c.abstract = value === true ? true : undefined;
      return;
    }
    if (key === 'id' || key === 'name') {
      (c as unknown as Record<string, unknown>)[key] = value;
      return;
    }
    if (key === 'stereotype' || key === 'notes') {
      const str = String(value ?? '').trim();
      (c as unknown as Record<string, unknown>)[key] = str ? String(value) : undefined;
    }
  });
}

function classTemplateParamsStr(mi: number, path: number[], ci: number): string {
  const c = getNamespaceAtPath(props.modelValue, mi, path)?.classes?.[ci];
  return (c?.templateParams ?? []).join(', ');
}

function setClassTemplateParams(mi: number, path: number[], ci: number, raw: string) {
  patch((d) => {
    const c = getNamespaceAtPath(d, mi, path)?.classes?.[ci];
    if (!c) return;
    const parts = raw
      .split(/[,，\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    c.templateParams = parts.length ? parts : undefined;
  });
}

function addBase(mi: number, path: number[], ci: number) {
  patch((d) => {
    const c = getNamespaceAtPath(d, mi, path)?.classes?.[ci];
    if (!c) return;
    if (!c.bases) c.bases = [];
    const ids = collectClassifierIds(d);
    const tid = ids.find((id) => id !== c.id) ?? ids[0] ?? c.id;
    c.bases.push({ targetId: tid, relation: 'generalization' });
  });
}

function patchBase(
  mi: number,
  path: number[],
  ci: number,
  bi: number,
  part: Partial<MvCodespaceClassifierBase>,
) {
  patch((d) => {
    const b = getNamespaceAtPath(d, mi, path)?.classes?.[ci]?.bases?.[bi];
    if (!b) return;
    Object.assign(b, part);
  });
}

function removeBase(mi: number, path: number[], ci: number, bi: number) {
  patch((d) => {
    getNamespaceAtPath(d, mi, path)?.classes?.[ci]?.bases?.splice(bi, 1);
  });
}

function addMember(mi: number, path: number[], ci: number) {
  patch((d) => {
    const c = getNamespaceAtPath(d, mi, path)?.classes?.[ci];
    if (!c) return;
    if (!c.members) c.members = [];
    c.members.push({ name: 'member', kind: 'field' });
  });
}

function patchMember(
  mi: number,
  path: number[],
  ci: number,
  miIdx: number,
  part: Partial<MvCodespaceMember>,
) {
  patch((d) => {
    const mem = getNamespaceAtPath(d, mi, path)?.classes?.[ci]?.members?.[miIdx];
    if (!mem) return;
    Object.assign(mem, part);
  });
}

function removeMember(mi: number, path: number[], ci: number, miIdx: number) {
  patch((d) => {
    getNamespaceAtPath(d, mi, path)?.classes?.[ci]?.members?.splice(miIdx, 1);
  });
}

function patchVar(mi: number, path: number[], vi: number, part: Partial<MvCodespaceVariable>) {
  patch((d) => {
    const v = getNamespaceAtPath(d, mi, path)?.variables?.[vi];
    if (!v) return;
    Object.assign(v, part);
  });
}

function removeVar(mi: number, path: number[], vi: number) {
  patch((d) => {
    getNamespaceAtPath(d, mi, path)?.variables?.splice(vi, 1);
  });
}

function patchFn(mi: number, path: number[], fi: number, part: Partial<MvCodespaceFunction>) {
  patch((d) => {
    const f = getNamespaceAtPath(d, mi, path)?.functions?.[fi];
    if (!f) return;
    Object.assign(f, part);
  });
}

function removeFn(mi: number, path: number[], fi: number) {
  patch((d) => {
    getNamespaceAtPath(d, mi, path)?.functions?.splice(fi, 1);
  });
}

function patchMacro(mi: number, path: number[], maci: number, part: Partial<MvCodespaceMacro>) {
  patch((d) => {
    const m = getNamespaceAtPath(d, mi, path)?.macros?.[maci];
    if (!m) return;
    Object.assign(m, part);
  });
}

function removeMacro(mi: number, path: number[], maci: number) {
  patch((d) => {
    getNamespaceAtPath(d, mi, path)?.macros?.splice(maci, 1);
  });
}

function patchAssoc(mi: number, path: number[], ai: number, part: Partial<MvCodespaceAssociation>) {
  patch((d) => {
    const a = getNamespaceAtPath(d, mi, path)?.associations?.[ai];
    if (!a) return;
    Object.assign(a, part);
  });
}

function patchAssocEnd(
  mi: number,
  path: number[],
  ai: number,
  end: 'fromEnd' | 'toEnd',
  part: Record<string, unknown>,
) {
  patch((d) => {
    const a = getNamespaceAtPath(d, mi, path)?.associations?.[ai];
    if (!a) return;
    const cur = { ...(a[end] ?? {}) };
    Object.assign(cur, part);
    a[end] = cur;
  });
}

function removeAssoc(mi: number, path: number[], ai: number) {
  patch((d) => {
    getNamespaceAtPath(d, mi, path)?.associations?.splice(ai, 1);
  });
}
</script>

<template>
  <div class="cs-editor">
    <div class="cs-split">
      <nav class="cs-tree" aria-label="代码空间结构树">
        <div class="cs-tree-head">结构</div>
        <ul class="cs-tree-ul">
          <li
            v-for="(row, idx) in sidebarRows"
            :key="idx"
            class="cs-tree-li"
            :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
          >
            <button
              type="button"
              class="cs-tree-btn"
              :class="{ 'cs-tree-btn--active': isSelRow(selection, row) }"
              title="选中 — 无全局快捷键"
              @click="selectRow(row.sel)"
            >
              {{ row.label }}
            </button>
          </li>
        </ul>
        <button type="button" class="link-btn cs-add-mod" title="添加模块 — 无全局快捷键" @click="addModule">＋ 添加模块</button>
      </nav>

      <section class="cs-detail">
        <template v-if="selection.t === 'meta'">
          <h4 class="cs-detail-title">块与工作区</h4>
          <p class="canvas-hint canvas-hint--compact">围栏内 <code>id</code> 与文档块绑定，此处只读。</p>
          <label class="field">
            <span>id（只读）</span>
            <input type="text" class="wide" :value="modelValue.id" readonly />
          </label>
          <label class="field">
            <span>title</span>
            <input
              type="text"
              class="wide"
              :value="modelValue.title ?? ''"
              title="标题 — 无全局快捷键"
              @input="patchMetaTitle(($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>workspaceRoot</span>
            <input
              type="text"
              class="wide"
              :value="modelValue.workspaceRoot ?? ''"
              title="工作区根路径片段 — 无全局快捷键"
              @input="patchMetaRoot(($event.target as HTMLInputElement).value)"
            />
          </label>
        </template>

        <template v-else-if="selection.t === 'module' && selectedModule">
          <h4 class="cs-detail-title">模块</h4>
          <label class="field">
            <span>id</span>
            <input
              type="text"
              class="wide"
              :value="selectedModule.id"
              title="模块 id — 无全局快捷键"
              @input="patchModuleField(selection.mi, 'id', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>name</span>
            <input
              type="text"
              class="wide"
              :value="selectedModule.name"
              title="模块名称 — 无全局快捷键"
              @input="patchModuleField(selection.mi, 'name', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>path</span>
            <input
              type="text"
              class="wide"
              :value="selectedModule.path ?? ''"
              title="相对路径 — 无全局快捷键"
              @input="patchModuleField(selection.mi, 'path', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>role</span>
            <input
              type="text"
              class="wide"
              :value="selectedModule.role ?? ''"
              title="角色 — 无全局快捷键"
              @input="patchModuleField(selection.mi, 'role', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>notes</span>
            <input
              type="text"
              class="wide"
              :value="selectedModule.notes ?? ''"
              title="备注 — 无全局快捷键"
              @input="patchModuleField(selection.mi, 'notes', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <div class="cs-actions">
            <button
              type="button"
              class="add-row"
              title="在本模块下添加顶层命名空间 — 无全局快捷键"
              @click="addTopLevelNs(selection.mi)"
            >
              ＋ 顶层命名空间
            </button>
            <button
              type="button"
              class="link-btn cs-danger"
              title="删除模块 — 无全局快捷键"
              @click="tryRequestDeleteModule(selection.mi)"
            >
              删除模块…
            </button>
          </div>
        </template>

        <template v-else-if="selection.t === 'ns' && selectedNs">
          <h4 class="cs-detail-title">命名空间</h4>
          <label class="field">
            <span>name</span>
            <input
              type="text"
              class="wide"
              :value="selectedNs.name"
              title="命名空间名称 — 无全局快捷键"
              @input="patchNsField(selection.mi, selection.path, 'name', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>qualifiedName</span>
            <input
              type="text"
              class="wide"
              :value="selectedNs.qualifiedName ?? ''"
              title="可选全名 — 无全局快捷键"
              @input="patchNsField(selection.mi, selection.path, 'qualifiedName', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>notes</span>
            <input
              type="text"
              class="wide"
              :value="selectedNs.notes ?? ''"
              title="备注 — 无全局快捷键"
              @input="patchNsField(selection.mi, selection.path, 'notes', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <div class="cs-actions">
            <button type="button" class="add-row" title="子命名空间 — 无全局快捷键" @click="addChildNs(selection.mi, selection.path)">
              ＋ 子命名空间
            </button>
            <button type="button" class="add-row" title="类 — 无全局快捷键" @click="addClass(selection.mi, selection.path)">＋ 类</button>
            <button type="button" class="add-row" title="变量 — 无全局快捷键" @click="addVar(selection.mi, selection.path)">＋ 变量</button>
            <button type="button" class="add-row" title="函数 — 无全局快捷键" @click="addFn(selection.mi, selection.path)">＋ 函数</button>
            <button type="button" class="add-row" title="宏 — 无全局快捷键" @click="addMacro(selection.mi, selection.path)">＋ 宏</button>
            <button type="button" class="add-row" title="关联 — 无全局快捷键" @click="addAssoc(selection.mi, selection.path)">＋ 关联</button>
            <button
              type="button"
              class="link-btn cs-danger"
              title="删除命名空间子树 — 无全局快捷键"
              @click="requestDeleteNs(selection.mi, selection.path)"
            >
              删除命名空间…
            </button>
          </div>
        </template>

        <template v-else-if="selection.t === 'class' && selectedClass">
          <h4 class="cs-detail-title">Classifier</h4>
          <label class="field">
            <span>id</span>
            <input
              type="text"
              class="wide"
              :value="selectedClass.id"
              title="类 id — 无全局快捷键"
              @input="patchClassField(selection.mi, selection.path, selection.ci, 'id', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>name</span>
            <input
              type="text"
              class="wide"
              :value="selectedClass.name"
              title="类名 — 无全局快捷键"
              @input="patchClassField(selection.mi, selection.path, selection.ci, 'name', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>kind</span>
            <select
              class="wide"
              title="类型 — 无全局快捷键"
              :value="selectedClass.kind ?? 'class'"
              @change="
                patchClassField(
                  selection.mi,
                  selection.path,
                  selection.ci,
                  'kind',
                  ($event.target as HTMLSelectElement).value || undefined,
                )
              "
            >
              <option v-for="k in CLASSIFIER_KINDS" :key="k" :value="k">{{ k }}</option>
            </select>
          </label>
          <label class="field cs-check">
            <input
              type="checkbox"
              :checked="selectedClass.abstract === true"
              title="abstract — 无全局快捷键"
              @change="
                patchClassField(
                  selection.mi,
                  selection.path,
                  selection.ci,
                  'abstract',
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            <span>abstract</span>
          </label>
          <label class="field">
            <span>stereotype</span>
            <input
              type="text"
              class="wide"
              :value="selectedClass.stereotype ?? ''"
              title="版型 — 无全局快捷键"
              @input="
                patchClassField(
                  selection.mi,
                  selection.path,
                  selection.ci,
                  'stereotype',
                  ($event.target as HTMLInputElement).value,
                )
              "
            />
          </label>
          <label class="field">
            <span>templateParams（逗号或换行分隔）</span>
            <textarea
              class="payload-ta"
              rows="3"
              spellcheck="false"
              :value="classTemplateParamsStr(selection.mi, selection.path, selection.ci)"
              title="模板形参 — 无全局快捷键"
              @input="setClassTemplateParams(selection.mi, selection.path, selection.ci, ($event.target as HTMLTextAreaElement).value)"
            />
          </label>
          <label class="field">
            <span>notes</span>
            <input
              type="text"
              class="wide"
              :value="selectedClass.notes ?? ''"
              title="备注 — 无全局快捷键"
              @input="patchClassField(selection.mi, selection.path, selection.ci, 'notes', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <h5 class="cs-subh">bases（继承 / 实现）</h5>
          <div v-for="(b, bi) in selectedClass.bases ?? []" :key="bi" class="cs-rowline">
            <select
              title="targetId — 无全局快捷键"
              :value="b.targetId"
              @change="patchBase(selection.mi, selection.path, selection.ci, bi, { targetId: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="cid in classifierOptions" :key="cid" :value="cid">{{ cid }}</option>
            </select>
            <select
              title="relation — 无全局快捷键"
              :value="b.relation"
              @change="
                patchBase(selection.mi, selection.path, selection.ci, bi, {
                  relation: ($event.target as HTMLSelectElement).value as MvCodespaceClassifierBase['relation'],
                })
              "
            >
              <option v-for="r in BASE_REL" :key="r" :value="r">{{ r }}</option>
            </select>
            <button type="button" class="link-btn" title="删除 — 无全局快捷键" @click="removeBase(selection.mi, selection.path, selection.ci, bi)">
              删
            </button>
          </div>
          <button type="button" class="add-row" title="添加 base — 无全局快捷键" @click="addBase(selection.mi, selection.path, selection.ci)">
            ＋ base
          </button>

          <h5 class="cs-subh">members</h5>
          <table v-if="(selectedClass.members?.length ?? 0) > 0" class="cs-table">
            <thead>
              <tr>
                <th>name</th>
                <th>kind</th>
                <th>visibility</th>
                <th>virtual</th>
                <th>type / signature</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(mem, miIdx) in selectedClass.members" :key="miIdx">
                <td>
                  <input
                    :value="mem.name"
                    title="成员名 — 无全局快捷键"
                    @input="patchMember(selection.mi, selection.path, selection.ci, miIdx, { name: ($event.target as HTMLInputElement).value })"
                  />
                </td>
                <td>
                  <select
                    :value="mem.kind"
                    title="成员种类 — 无全局快捷键"
                    @change="
                      patchMember(selection.mi, selection.path, selection.ci, miIdx, {
                        kind: ($event.target as HTMLSelectElement).value as MvCodespaceMember['kind'],
                      })
                    "
                  >
                    <option v-for="mk in MEMBER_KINDS" :key="mk" :value="mk">{{ mk }}</option>
                  </select>
                </td>
                <td>
                  <input
                    :value="mem.visibility ?? ''"
                    title="可见性 — 无全局快捷键"
                    @input="
                      patchMember(selection.mi, selection.path, selection.ci, miIdx, {
                        visibility: ($event.target as HTMLInputElement).value,
                      })
                    "
                  />
                </td>
                <td class="cs-td-center">
                  <input
                    type="checkbox"
                    :checked="mem.virtual === true"
                    title="virtual — 无全局快捷键"
                    @change="
                      patchMember(selection.mi, selection.path, selection.ci, miIdx, {
                        virtual: ($event.target as HTMLInputElement).checked,
                      })
                    "
                  />
                </td>
                <td>
                  <input
                    :value="mem.kind === 'method' ? mem.signature ?? '' : mem.type ?? ''"
                    :placeholder="mem.kind === 'method' ? 'signature' : 'type'"
                    title="type 或 signature — 无全局快捷键"
                    @input="
                      patchMember(
                        selection.mi,
                        selection.path,
                        selection.ci,
                        miIdx,
                        mem.kind === 'method'
                          ? { signature: ($event.target as HTMLInputElement).value }
                          : { type: ($event.target as HTMLInputElement).value },
                      )
                    "
                  />
                </td>
                <td>
                  <button type="button" class="link-btn" title="删除成员 — 无全局快捷键" @click="removeMember(selection.mi, selection.path, selection.ci, miIdx)">
                    删
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <button type="button" class="add-row" title="添加成员 — 无全局快捷键" @click="addMember(selection.mi, selection.path, selection.ci)">
            ＋ member
          </button>

          <div class="cs-actions">
            <button type="button" class="link-btn cs-danger" title="删除该类 — 无全局快捷键" @click="removeClass(selection.mi, selection.path, selection.ci)">
              删除类
            </button>
          </div>
        </template>

        <template v-else-if="selection.t === 'var' && selectedVar">
          <h4 class="cs-detail-title">变量</h4>
          <label class="field">
            <span>id</span>
            <input type="text" class="wide" :value="selectedVar.id" @input="patchVar(selection.mi, selection.path, selection.vi, { id: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>name</span>
            <input type="text" class="wide" :value="selectedVar.name" @input="patchVar(selection.mi, selection.path, selection.vi, { name: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>type</span>
            <input type="text" class="wide" :value="selectedVar.type ?? ''" @input="patchVar(selection.mi, selection.path, selection.vi, { type: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>notes</span>
            <input type="text" class="wide" :value="selectedVar.notes ?? ''" @input="patchVar(selection.mi, selection.path, selection.vi, { notes: ($event.target as HTMLInputElement).value })" />
          </label>
          <button type="button" class="link-btn cs-danger" title="删除变量 — 无全局快捷键" @click="removeVar(selection.mi, selection.path, selection.vi)">删除变量</button>
        </template>

        <template v-else-if="selection.t === 'fn' && selectedFn">
          <h4 class="cs-detail-title">函数</h4>
          <label class="field">
            <span>id</span>
            <input type="text" class="wide" :value="selectedFn.id" @input="patchFn(selection.mi, selection.path, selection.fi, { id: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>name</span>
            <input type="text" class="wide" :value="selectedFn.name" @input="patchFn(selection.mi, selection.path, selection.fi, { name: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>signature</span>
            <input
              type="text"
              class="wide"
              :value="selectedFn.signature ?? ''"
              @input="patchFn(selection.mi, selection.path, selection.fi, { signature: ($event.target as HTMLInputElement).value })"
            />
          </label>
          <label class="field">
            <span>notes</span>
            <input type="text" class="wide" :value="selectedFn.notes ?? ''" @input="patchFn(selection.mi, selection.path, selection.fi, { notes: ($event.target as HTMLInputElement).value })" />
          </label>
          <button type="button" class="link-btn cs-danger" title="删除函数 — 无全局快捷键" @click="removeFn(selection.mi, selection.path, selection.fi)">删除函数</button>
        </template>

        <template v-else-if="selection.t === 'macro' && selectedMacro">
          <h4 class="cs-detail-title">宏</h4>
          <label class="field">
            <span>id</span>
            <input type="text" class="wide" :value="selectedMacro.id" @input="patchMacro(selection.mi, selection.path, selection.maci, { id: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>name</span>
            <input type="text" class="wide" :value="selectedMacro.name" @input="patchMacro(selection.mi, selection.path, selection.maci, { name: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>params</span>
            <input type="text" class="wide" :value="selectedMacro.params ?? ''" @input="patchMacro(selection.mi, selection.path, selection.maci, { params: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>definitionSnippet</span>
            <textarea
              class="payload-ta"
              rows="3"
              spellcheck="false"
              :value="selectedMacro.definitionSnippet ?? ''"
              @input="
                patchMacro(selection.mi, selection.path, selection.maci, {
                  definitionSnippet: ($event.target as HTMLTextAreaElement).value,
                })
              "
            />
          </label>
          <label class="field">
            <span>notes</span>
            <input type="text" class="wide" :value="selectedMacro.notes ?? ''" @input="patchMacro(selection.mi, selection.path, selection.maci, { notes: ($event.target as HTMLInputElement).value })" />
          </label>
          <button type="button" class="link-btn cs-danger" title="删除宏 — 无全局快捷键" @click="removeMacro(selection.mi, selection.path, selection.maci)">删除宏</button>
        </template>

        <template v-else-if="selection.t === 'assoc' && selectedAssoc">
          <h4 class="cs-detail-title">关联</h4>
          <label class="field">
            <span>id</span>
            <input type="text" class="wide" :value="selectedAssoc.id" @input="patchAssoc(selection.mi, selection.path, selection.ai, { id: ($event.target as HTMLInputElement).value })" />
          </label>
          <label class="field">
            <span>kind</span>
            <select
              class="wide"
              :value="selectedAssoc.kind"
              @change="
                patchAssoc(selection.mi, selection.path, selection.ai, {
                  kind: ($event.target as HTMLSelectElement).value as MvCodespaceAssociationKind,
                })
              "
            >
              <option v-for="k in ASSOC_KINDS" :key="k" :value="k">{{ k }}</option>
            </select>
          </label>
          <label class="field">
            <span>fromClassifierId</span>
            <select
              class="wide"
              :value="selectedAssoc.fromClassifierId"
              @change="
                patchAssoc(selection.mi, selection.path, selection.ai, {
                  fromClassifierId: ($event.target as HTMLSelectElement).value,
                })
              "
            >
              <option v-for="cid in classifierOptions" :key="'f-' + cid" :value="cid">{{ cid }}</option>
            </select>
          </label>
          <label class="field">
            <span>toClassifierId</span>
            <select
              class="wide"
              :value="selectedAssoc.toClassifierId"
              @change="
                patchAssoc(selection.mi, selection.path, selection.ai, {
                  toClassifierId: ($event.target as HTMLSelectElement).value,
                })
              "
            >
              <option v-for="cid in classifierOptions" :key="'t-' + cid" :value="cid">{{ cid }}</option>
            </select>
          </label>
          <label class="field">
            <span>notes</span>
            <input type="text" class="wide" :value="selectedAssoc.notes ?? ''" @input="patchAssoc(selection.mi, selection.path, selection.ai, { notes: ($event.target as HTMLInputElement).value })" />
          </label>
          <h5 class="cs-subh">fromEnd / toEnd</h5>
          <div class="cs-rowline">
            <span>fromEnd.role</span>
            <input
              :value="selectedAssoc.fromEnd?.role ?? ''"
              @input="patchAssocEnd(selection.mi, selection.path, selection.ai, 'fromEnd', { role: ($event.target as HTMLInputElement).value })"
            />
            <span>mult</span>
            <input
              :value="selectedAssoc.fromEnd?.multiplicity ?? ''"
              @input="
                patchAssocEnd(selection.mi, selection.path, selection.ai, 'fromEnd', {
                  multiplicity: ($event.target as HTMLInputElement).value,
                })
              "
            />
            <label class="cs-check">
              <input
                type="checkbox"
                :checked="selectedAssoc.fromEnd?.navigable === true"
                @change="
                  patchAssocEnd(selection.mi, selection.path, selection.ai, 'fromEnd', {
                    navigable: ($event.target as HTMLInputElement).checked,
                  })
                "
              />
              <span>navigable</span>
            </label>
          </div>
          <div class="cs-rowline">
            <span>toEnd.role</span>
            <input
              :value="selectedAssoc.toEnd?.role ?? ''"
              @input="patchAssocEnd(selection.mi, selection.path, selection.ai, 'toEnd', { role: ($event.target as HTMLInputElement).value })"
            />
            <span>mult</span>
            <input
              :value="selectedAssoc.toEnd?.multiplicity ?? ''"
              @input="
                patchAssocEnd(selection.mi, selection.path, selection.ai, 'toEnd', {
                  multiplicity: ($event.target as HTMLInputElement).value,
                })
              "
            />
            <label class="cs-check">
              <input
                type="checkbox"
                :checked="selectedAssoc.toEnd?.navigable === true"
                @change="
                  patchAssocEnd(selection.mi, selection.path, selection.ai, 'toEnd', {
                    navigable: ($event.target as HTMLInputElement).checked,
                  })
                "
              />
              <span>navigable</span>
            </label>
          </div>
          <button type="button" class="link-btn cs-danger" title="删除关联 — 无全局快捷键" @click="removeAssoc(selection.mi, selection.path, selection.ai)">删除关联</button>
        </template>

        <p v-else class="canvas-hint">在左侧选择节点。</p>
      </section>
    </div>

    <details class="cs-advanced" @toggle="onAdvancedToggle">
      <summary>高级：原始 JSON</summary>
      <p class="canvas-hint canvas-hint--compact">编辑后点「应用到树」；须能通过解析校验。</p>
      <textarea v-model="advancedJsonText" class="payload-ta" spellcheck="false" rows="12" aria-label="codespace raw json" />
      <button type="button" class="add-row" title="应用 JSON — 无全局快捷键" @click="applyAdvancedJson">应用到树</button>
    </details>

    <Teleport to="body">
      <div
        v-if="moduleDeleteMi !== null"
        class="msc-del-back"
        role="presentation"
        tabindex="0"
        @click.self="cancelDeleteModule"
      >
        <div
          class="msc-del-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cs-mod-del-title"
          tabindex="-1"
          @keydown.esc.stop="cancelDeleteModule"
        >
          <h2 id="cs-mod-del-title" class="msc-del-title">删除模块</h2>
          <p class="msc-del-desc">确定从代码空间模型中删除该模块？未保存前可关闭画布放弃。</p>
          <div class="msc-del-actions">
            <button type="button" class="msc-del-btn" title="取消 — 无全局快捷键" @click="cancelDeleteModule">取消</button>
            <button type="button" class="msc-del-btn msc-del-btn--danger" title="确定删除 — 无全局快捷键" @click="confirmDeleteModule">
              确定删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="nsDeleteCtx" class="msc-del-back" role="presentation" tabindex="0" @click.self="cancelDeleteNs">
        <div
          class="msc-del-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cs-ns-del-title"
          tabindex="-1"
          @keydown.esc.stop="cancelDeleteNs"
        >
          <h2 id="cs-ns-del-title" class="msc-del-title">删除命名空间</h2>
          <p class="msc-del-desc">将删除该节点及其子命名空间与挂载内容。</p>
          <div class="msc-del-actions">
            <button type="button" class="msc-del-btn" title="取消 — 无全局快捷键" @click="cancelDeleteNs">取消</button>
            <button type="button" class="msc-del-btn msc-del-btn--danger" title="确定删除 — 无全局快捷键" @click="confirmDeleteNs">确定删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cs-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
.cs-split {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: stretch;
  min-height: 280px;
}
.cs-tree {
  flex: 0 0 240px;
  max-width: 44%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  overflow: auto;
  background: #f8fafc;
}
.cs-tree-head {
  font-weight: 700;
  font-size: 0.78rem;
  margin-bottom: 6px;
  color: #334155;
}
.cs-tree-ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.cs-tree-li {
  margin: 0 0 2px;
}
.cs-tree-btn {
  width: 100%;
  text-align: left;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  color: #0f172a;
}
.cs-tree-btn:hover {
  background: #e2e8f0;
}
.cs-tree-btn--active {
  background: #dbeafe;
  border-color: #93c5fd;
}
.cs-add-mod {
  margin-top: 8px;
  width: 100%;
}
.cs-detail {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 4px 8px;
}
.cs-detail-title {
  margin: 0 0 10px;
  font-size: 0.95rem;
}
.cs-subh {
  margin: 14px 0 6px;
  font-size: 0.82rem;
  color: #475569;
}
.cs-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}
.cs-danger {
  color: #b91c1c;
}
.cs-rowline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.78rem;
}
.cs-check {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  margin-bottom: 8px;
}
.cs-table th,
.cs-table td {
  border: 1px solid #e2e8f0;
  padding: 4px;
  vertical-align: middle;
}
.cs-td-center {
  text-align: center;
}
.cs-advanced {
  margin-top: 4px;
  font-size: 0.8rem;
}
.canvas-hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: #475569;
}
.canvas-hint--compact {
  font-size: 0.76rem;
  margin-bottom: 6px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  max-width: 960px;
}
.field span {
  font-size: 0.78rem;
  color: #64748b;
}
.wide {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font: inherit;
}
.payload-ta {
  width: 100%;
  max-width: 960px;
  box-sizing: border-box;
  padding: 10px 12px;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  resize: vertical;
}
.link-btn {
  border: none;
  background: none;
  color: #b91c1c;
  cursor: pointer;
  font-size: 0.78rem;
  text-decoration: underline;
}
.add-row {
  margin-top: 12px;
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #64748b;
  background: #fff;
}
</style>

<style>
.msc-del-back {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  outline: none;
}
.msc-del-dialog {
  width: min(440px, 100%);
  padding: 18px 20px 16px;
  border-radius: 10px;
  border: 1px solid #94a3b8;
  background: #fff;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.25);
  outline: none;
}
.msc-del-title {
  margin: 0 0 10px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #991b1b;
}
.msc-del-desc {
  margin: 0 0 10px;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #334155;
}
.msc-del-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.msc-del-btn {
  padding: 8px 16px;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
  cursor: pointer;
  color: #334155;
}
.msc-del-btn:hover {
  background: #f1f5f9;
}
.msc-del-btn--danger {
  border-color: #dc2626;
  background: #dc2626;
  color: #fff;
  font-weight: 600;
}
.msc-del-btn--danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}
</style>