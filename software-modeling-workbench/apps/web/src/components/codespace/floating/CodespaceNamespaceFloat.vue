<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import type { MvCodespaceNamespaceNode, MvModelCodespacePayload } from '@smw/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import { getNamespaceAtPath, rebuildPathIdsForModule } from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const cs = inject(CS_CANVAS_MSG_KEY)!;

const props = defineProps<{
  open: boolean;
  modelValue: MvModelCodespacePayload;
  mi: number;
  path: number[];
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
}>();

const emit = defineEmits<{
  close: [];
  addChildNs: [mi: number, path: number[]];
  addClass: [mi: number, path: number[]];
  addEnum: [mi: number, path: number[]];
  addVar: [mi: number, path: number[]];
  addFn: [mi: number, path: number[]];
  addMacro: [mi: number, path: number[]];
  requestDeleteNs: [mi: number, path: number[]];
}>();

const ns = computed((): MvCodespaceNamespaceNode | null =>
  getNamespaceAtPath(props.modelValue, props.mi, props.path),
);
const isRootNamespace = computed(() => props.path.length === 1 && props.path[0] === 0);
function moduleLabel(mi: number): string {
  const raw = (props.modelValue.modules?.[mi]?.name ?? '').trim();
  return raw ? raw : `Module#${mi + 1}`;
}
function splitPathSegments(chain: string): string[] {
  return String(chain ?? '')
    .split('.')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
function formatModuleScopedPath(mi: number, ...chains: string[]): string {
  const modulePart = `[${moduleLabel(mi)}]`;
  const segs = chains.flatMap((c) => splitPathSegments(c));
  return segs.length ? `${modulePart}.${segs.join('.')}` : modulePart;
}
function resolveNamespacePathLabel(payload: MvModelCodespacePayload, mi: number, path: number[]): string {
  const mod = payload.modules?.[mi];
  const names: string[] = [];
  let nodes = mod?.namespaces ?? [];
  for (const idx of path) {
    const n = nodes?.[idx];
    if (!n) break;
    const name = (n.name ?? '').trim();
    if (name) names.push(name);
    nodes = n.namespaces ?? [];
  }
  return names.length ? `.${names.join('.')}` : '.';
}
function appendNsChain(parent: string, name: string): string {
  const nn = (name ?? '').trim();
  if (!nn) return parent;
  if (!parent) return nn;
  return `${parent}.${nn}`;
}
const parentPathKey = computed(() => `${props.mi}:${props.path.slice(0, -1).join('.')}`);
const parentNsOptions = computed(() => {
  const out: Array<{ key: string; label: string; path: number[]; mi: number }> = [
    {
      key: `${props.mi}:`,
      label: formatModuleScopedPath(props.mi),
      path: [],
      mi: props.mi,
    },
  ];
  const selfPath = props.path;
  const selfMi = props.mi;
  const isDescendantPath = (candidate: number[]): boolean => {
    if (candidate.length < selfPath.length) return false;
    for (let i = 0; i < selfPath.length; i++) {
      if (candidate[i] !== selfPath[i]) return false;
    }
    return true;
  };
  const walk = (
    nodes: MvCodespaceNamespaceNode[] | undefined,
    mi: number,
    base: number[],
    nsChain: string,
  ) => {
    if (!nodes) return;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!;
      const p = [...base, i];
      // 不能迁移到自身或后代下，避免循环。
      const blockedByCycle = mi === selfMi && isDescendantPath(p);
      if (!blockedByCycle) {
        const nextNsChain = appendNsChain(nsChain, n.name);
        out.push({
          key: `${mi}:${p.join('.')}`,
          label: formatModuleScopedPath(mi, nextNsChain),
          path: p,
          mi,
        });
      }
      walk(n.namespaces, mi, p, appendNsChain(nsChain, n.name));
    }
  };
  for (let mi = 0; mi < (props.modelValue.modules?.length ?? 0); mi++) {
    const mod = props.modelValue.modules?.[mi];
    if (mi !== selfMi) {
      out.push({
        key: `${mi}:`,
        label: formatModuleScopedPath(mi),
        path: [],
        mi,
      });
    }
    walk(mod?.namespaces, mi, [], '');
  }
  const current: Array<{ key: string; label: string; path: number[]; mi: number }> = [];
  const cross: Array<{ key: string; label: string; path: number[]; mi: number }> = [];
  for (const opt of out) {
    if (opt.key.startsWith(`${selfMi}:`)) current.push(opt);
    else cross.push(opt);
  }
  return [...current, ...cross];
});
const ENGLISH_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const nameError = ref('');
const parentPickerOpen = ref(false);
const parentSearch = ref('');
const pendingParentKey = ref('');
const currentParentNamespaceLabel = computed(() => {
  const hit = parentNsOptions.value.find((o) => o.key === parentPathKey.value);
  return hit?.label ?? parentPathKey.value;
});
const currentParentNamespacePathLabel = computed(() => {
  const parentPath = props.path.slice(0, -1);
  return resolveNamespacePathLabel(props.modelValue, props.mi, parentPath);
});
const currentNamespacePathLabel = computed(() =>
  resolveNamespacePathLabel(props.modelValue, props.mi, props.path),
);
const filteredParentNsOptions = computed(() => {
  const q = parentSearch.value.trim().toLowerCase();
  if (!q) return parentNsOptions.value;
  return parentNsOptions.value.filter((o) => o.label.toLowerCase().includes(q));
});
const groupedParentNsOptions = computed(() => {
  const groups = new Map<number, Array<{ key: string; label: string; path: number[] }>>();
  for (const opt of filteredParentNsOptions.value) {
    const mi = Number(opt.key.split(':')[0] ?? '-1');
    const arr = groups.get(mi) ?? [];
    arr.push(opt);
    groups.set(mi, arr);
  }
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === props.mi) return -1;
    if (b[0] === props.mi) return 1;
    return a[0] - b[0];
  });
});
function treeItemLabel(label: string, mi: number): string {
  const scoped = `[${moduleLabel(mi)}].`;
  const plain = `[${moduleLabel(mi)}]`;
  if (label.startsWith(scoped)) return label.slice(scoped.length);
  if (label === plain) return '.';
  return label;
}
const currentNamespaceFullPathLabel = computed(() =>
  formatModuleScopedPath(props.mi, resolveNamespacePathLabel(props.modelValue, props.mi, props.path)),
);
function namespaceParentItemKind(key: string): 'root' | 'namespace' {
  const path = key.split(':')[1] ?? '';
  return path.trim() ? 'namespace' : 'root';
}

function patchNsField(key: 'name' | 'qualifiedName' | 'notes', value: string) {
  props.runPatch((d) => {
    const n = getNamespaceAtPath(d, props.mi, props.path);
    if (!n) return;
    if (key === 'name') {
      if (isRootNamespace.value) return;
      n.name = value;
      rebuildPathIdsForModule(d, props.mi);
    }
    else {
      const v = value.trim();
      n[key] = v ? value : undefined;
    }
  });
}

function onNsNameInput(value: string) {
  if (!ENGLISH_NAME_RE.test(value)) {
    nameError.value = cs.value.flNsNameEnglishOnly;
    return;
  }
  nameError.value = '';
  patchNsField('name', value);
}

function moveNamespaceParent(targetKey: string): void {
  if (isRootNamespace.value) return;
  if (targetKey === parentPathKey.value) return;
  const [targetMiRaw, targetPathKey = ''] = targetKey.split(':');
  const targetMi = Number(targetMiRaw ?? `${props.mi}`);
  const targetPath = targetPathKey
    .split('.')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x));
  if (!Number.isFinite(targetMi)) return;
  props.runPatch((d) => {
    const sourceMi = props.mi;
    const sourceMod = d.modules?.[sourceMi];
    const targetMod = d.modules?.[targetMi];
    if (!sourceMod?.namespaces || !targetMod) return;
    const oldParentPath = props.path.slice(0, -1);
    const oldIdx = props.path[props.path.length - 1];
    let oldSiblings: MvCodespaceNamespaceNode[] | undefined;
    if (!oldParentPath.length) oldSiblings = sourceMod.namespaces;
    else oldSiblings = getNamespaceAtPath(d, sourceMi, oldParentPath)?.namespaces;
    if (!oldSiblings || oldIdx === undefined) return;
    const [moved] = oldSiblings.splice(oldIdx, 1);
    if (!moved) return;
    if (!targetPath.length) {
      if (!targetMod.namespaces) targetMod.namespaces = [];
      targetMod.namespaces.push(moved);
    } else {
      const parent = getNamespaceAtPath(d, targetMi, targetPath);
      if (!parent) return;
      if (!parent.namespaces) parent.namespaces = [];
      parent.namespaces.push(moved);
    }
    rebuildPathIdsForModule(d, sourceMi);
    if (targetMi !== sourceMi) rebuildPathIdsForModule(d, targetMi);
  });
  emit('close');
}

function openParentPicker(): void {
  pendingParentKey.value = parentPathKey.value;
  parentSearch.value = '';
  parentPickerOpen.value = true;
}

function applyParentPicker(): void {
  const target = pendingParentKey.value || parentPathKey.value;
  parentPickerOpen.value = false;
  moveNamespaceParent(target);
}

watch(
  () => props.open,
  (next) => {
    if (!next) {
      parentPickerOpen.value = false;
      parentSearch.value = '';
    }
  },
);
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!ns"
    :title="ns ? cs.flNsTitle(currentNamespaceFullPathLabel) : cs.flNsBare"
    @close="emit('close')"
  >
    <template v-if="ns">
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="ns.name"
          :title="cs.flNsNameTitle"
          :readonly="isRootNamespace"
          @input="onNsNameInput(($event.target as HTMLInputElement).value)"
        />
        <small v-if="nameError" class="cs-error">{{ nameError }}</small>
      </label>
      <label class="field">
        <span>qualifiedName</span>
        <input
          type="text"
          class="wide"
          :value="ns.qualifiedName ?? ''"
          :title="cs.flNsQNameTitle"
          @input="patchNsField('qualifiedName', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>namespacePath</span>
        <input
          type="text"
          class="wide"
          :value="currentNamespacePathLabel"
          title="Absolute namespace path"
          readonly
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="ns.notes ?? ''"
          :title="cs.flNsNotesTitle"
          @input="patchNsField('notes', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label v-if="!isRootNamespace" class="field">
        <span>parentContainer</span>
        <div class="cs-parent-picker-inline">
          <span class="cs-parent-inline-kind cs-node-kind cs-node-kind--ns">N</span>
          <input
            type="text"
            class="wide"
            :value="currentParentNamespaceLabel"
            title="Current parent namespace"
            readonly
          />
          <button type="button" class="cs-parent-picker-btn" title="Pick parent container" @click="openParentPicker">
            修改
          </button>
        </div>
      </label>
      <label v-if="!isRootNamespace" class="field">
        <span>parentNamespace</span>
        <div class="cs-parent-picker-inline">
          <span class="cs-parent-inline-kind cs-node-kind cs-node-kind--ns">N</span>
          <input
            type="text"
            class="wide"
            :value="currentParentNamespacePathLabel"
            title="Current parent namespace path"
            readonly
          />
        </div>
      </label>
      <div class="cs-actions">
        <button type="button" class="add-row" :title="cs.flNsAddChildNsTitle" @click="emit('addChildNs', props.mi, props.path)">
          {{ cs.flNsAddChildNsLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddClassTitle" @click="emit('addClass', props.mi, props.path)">
          {{ cs.flNsAddClassLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddEnumTitle" @click="emit('addEnum', props.mi, props.path)">
          {{ cs.flNsAddEnumLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddVarTitle" @click="emit('addVar', props.mi, props.path)">
          {{ cs.flNsAddVarLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddFnTitle" @click="emit('addFn', props.mi, props.path)">
          {{ cs.flNsAddFnLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddMacroTitle" @click="emit('addMacro', props.mi, props.path)">
          {{ cs.flNsAddMacroLabel }}
        </button>
        <button
          v-if="!isRootNamespace"
          type="button"
          class="link-btn cs-danger"
          :title="cs.flNsDeleteTitle"
          @click="emit('requestDeleteNs', props.mi, props.path)"
        >
          {{ cs.flNsDeleteLabel }}
        </button>
      </div>
      <dialog v-if="parentPickerOpen" open class="cs-parent-picker-dialog">
        <div class="cs-special-picker">
          <div class="cs-special-picker__header">
            <strong>选择父容器</strong>
            <button type="button" class="link-btn" @click="parentPickerOpen = false">Close</button>
          </div>
          <label class="field">
            <span>搜索</span>
            <input v-model="parentSearch" type="text" class="wide" placeholder="搜索 module/namespace..." />
          </label>
          <div class="cs-parent-tree" role="tree" aria-label="Parent namespace tree">
            <details v-for="[mi, items] in groupedParentNsOptions" :key="'pnsg-' + mi" open>
              <summary role="treeitem">
                <span class="cs-node-kind cs-node-kind--module">M</span>
                {{ moduleLabel(mi) }}
              </summary>
              <div role="group">
                <button
                  v-for="opt in items"
                  :key="'pnst-' + opt.key"
                  type="button"
                  role="treeitem"
                  class="cs-parent-tree__item"
                  :class="{ 'cs-parent-tree__item--active': pendingParentKey === opt.key }"
                  @click="pendingParentKey = opt.key"
                >
                  <span
                    class="cs-node-kind"
                    :class="{
                      'cs-node-kind--root': namespaceParentItemKind(opt.key) === 'root',
                      'cs-node-kind--ns': namespaceParentItemKind(opt.key) === 'namespace',
                    }"
                  >
                    {{ namespaceParentItemKind(opt.key) === 'root' ? 'R' : 'N' }}
                  </span>
                  {{ treeItemLabel(opt.label, mi) }}
                </button>
              </div>
            </details>
          </div>
          <div class="cs-actions">
            <button type="button" class="add-row" @click="applyParentPicker">确定</button>
            <button type="button" class="link-btn" @click="parentPickerOpen = false">取消</button>
          </div>
        </div>
      </dialog>
    </template>
  </CodespaceFloatShell>
</template>

<style scoped>
.cs-parent-picker-inline {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}
.cs-parent-inline-kind {
  flex: 0 0 auto;
}
.cs-parent-picker-inline .wide {
  flex: 1 1 auto;
  min-width: 0;
}
.cs-parent-picker-btn {
  flex: 0 0 auto;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.cs-parent-picker-dialog {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  width: min(760px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 24px);
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
}
.cs-parent-picker-dialog::backdrop {
  background: rgba(15, 23, 42, 0.38);
}
.cs-special-picker {
  padding: 12px;
}
.cs-special-picker__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.cs-parent-tree {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  max-height: min(320px, calc(100vh - 260px));
  overflow: auto;
  padding: 6px;
  background: #fff;
}
.cs-parent-tree details {
  margin-bottom: 6px;
}
.cs-parent-tree summary {
  cursor: pointer;
  font-weight: 600;
  color: #334155;
  margin: 2px 0 4px;
}
.cs-parent-tree__item {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cs-parent-tree__item:hover {
  background: #f8fafc;
}
.cs-parent-tree__item--active {
  background: #e2e8f0;
}
.cs-node-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  flex: 0 0 auto;
}
.cs-node-kind--module {
  border-color: #93c5fd;
  background: #dbeafe;
  color: #1d4ed8;
}
.cs-node-kind--root {
  border-color: #c4b5fd;
  background: #ede9fe;
  color: #6d28d9;
}
.cs-node-kind--ns {
  border-color: #86efac;
  background: #dcfce7;
  color: #15803d;
}
</style>
