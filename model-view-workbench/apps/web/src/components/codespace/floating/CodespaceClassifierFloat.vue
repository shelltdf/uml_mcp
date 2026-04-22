<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import type {
  MvCodespaceAccessorVisibility,
  MvCodespaceClassEnum,
  MvCodespaceClassMember,
  MvCodespaceClassMethod,
  MvCodespaceClassifier,
  MvCodespaceClassifierBase,
  MvCodespaceMethodKind,
  MvCodespaceMethodParam,
  MvCodespaceMethodParamPassMode,
  MvCodespaceProperty,
  MvModelCodespacePayload,
} from '@mvwb/core';
import { slug } from '@mvwb/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import {
  collectClassifierIds,
  getNamespaceAtPath,
  rebuildPathIdsForModule,
} from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const csMsg = inject(CS_CANVAS_MSG_KEY)!;

const CLASSIFIER_KINDS = ['class', 'interface', 'struct'] as const;
const BASE_REL = ['generalization', 'realization'] as const;
const METHOD_KINDS: readonly MvCodespaceMethodKind[] = [
  'normal',
  'constructor',
  'destructor',
  'functor',
  'operator',
];
const ACCESS_VIS: readonly MvCodespaceAccessorVisibility[] = ['public', 'protected', 'private', 'package'];
const MEMBER_VIS_OPTIONS: readonly string[] = ['public', 'protected', 'private', 'package'];
const MEMBER_TYPE_OPTIONS: readonly string[] = [
  'string',
  'int',
  'float',
  'boolean',
  'json',
  'number',
  'void',
  'any',
  'unknown',
];
const OPERATOR_SYMBOL_OPTIONS = ['+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>=', '[]', '()'] as const;
const METHOD_PARAM_PASS_MODES: readonly MvCodespaceMethodParamPassMode[] = ['value', 'reference', 'pointer'];

type SpecialMethodTemplate = {
  id: string;
  category: string;
  label: string;
  method: Omit<MvCodespaceClassMethod, 'name' | 'notes'> & { name: string };
};

const SPECIAL_METHOD_TEMPLATES: readonly SpecialMethodTemplate[] = [
  { id: 'ctor-default', category: '构造/析构', label: '默认构造函数', method: { name: 'constructor', methodKind: 'constructor', type: 'void', params: [] } },
  {
    id: 'ctor-copy',
    category: '构造/析构',
    label: '拷贝构造函数',
    method: { name: 'constructor', methodKind: 'constructor', type: 'void', params: [{ name: 'other', type: 'Self', passMode: 'reference', isConst: true }] },
  },
  { id: 'dtor', category: '构造/析构', label: '析构函数', method: { name: 'destructor', methodKind: 'destructor', type: 'void', params: [] } },
  {
    id: 'op-eq',
    category: '运算符',
    label: 'operator=',
    method: { name: 'operatorAssign', methodKind: 'operator', operatorSymbol: '=', type: 'Self&', params: [{ name: 'other', type: 'Self', passMode: 'reference', isConst: true }] },
  },
  {
    id: 'op-call',
    category: '运算符',
    label: 'operator()',
    method: { name: 'operatorCall', methodKind: 'operator', operatorSymbol: '()', type: 'void', params: [] },
  },
  { id: 'dispose', category: '生命周期', label: 'Dispose', method: { name: 'Dispose', methodKind: 'normal', type: 'void', params: [] } },
];

const props = defineProps<{
  open: boolean;
  modelValue: MvModelCodespacePayload;
  mi: number;
  path: number[];
  ci: number;
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
  diagramAssocTargetsByClassId?: Record<string, string[]>;
}>();

const emit = defineEmits<{
  close: [];
}>();

const selectedClass = computed((): MvCodespaceClassifier | null =>
  getNamespaceAtPath(props.modelValue, props.mi, props.path)?.classes?.[props.ci] ?? null,
);
const selectedNamespace = computed(() => getNamespaceAtPath(props.modelValue, props.mi, props.path));

const classifierOptions = computed(() => collectClassifierIds(props.modelValue));
const fieldRows = computed(() =>
  (selectedClass.value?.members ?? [])
    .map((mem, idx) => ({ mem, idx }))
    .filter((r) => r.mem.accessor === undefined || r.mem.accessor === 'none'),
);
const methodRows = computed(() => (selectedClass.value?.methods ?? []).map((mem, idx) => ({ mem, idx })));
const enumRows = computed(() => (selectedClass.value?.enums ?? []).map((mem, idx) => ({ mem, idx })));
const propertyRows = computed(() => selectedClass.value?.properties ?? []);
const specialMethodPickerOpen = ref(false);
const specialMethodTemplateGroups = computed(() => {
  const groups = new Map<string, SpecialMethodTemplate[]>();
  for (const t of SPECIAL_METHOD_TEMPLATES) {
    const arr = groups.get(t.category) ?? [];
    arr.push(t);
    groups.set(t.category, arr);
  }
  return [...groups.entries()].map(([category, templates]) => ({ category, templates }));
});

const classifierNameById = computed(() => {
  const m = new Map<string, string>();
  for (const mod of props.modelValue.modules ?? []) {
    const walk = (nodes: NonNullable<typeof mod.namespaces>) => {
      for (const n of nodes) {
        for (const c of n.classes ?? []) m.set(c.id, (c.name ?? c.id).trim());
        if (n.namespaces?.length) walk(n.namespaces);
      }
    };
    if (mod.namespaces?.length) walk(mod.namespaces);
  }
  return m;
});

const classifierIdSet = computed(() => new Set(classifierOptions.value));

/** bases 下拉：排除自身；标签为「类型名 (id)」，值仍为 id */
const baseTargetPickOptions = computed(() => {
  const self = selectedClass.value?.id;
  const nm = classifierNameById.value;
  const ids = classifierOptions.value.filter((id) => id !== self);
  return [...ids]
    .map((id) => {
      const n = (nm.get(id) ?? '').trim();
      const label = n && n !== id ? `${n} (${id})` : id;
      return { id, label };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
});

const associatedTypeCandidates = computed((): string[] => {
  const cls = selectedClass.value;
  const ns = selectedNamespace.value;
  if (!cls || !ns) return [];
  const out: string[] = [];
  const push = (id: string) => {
    const t = classifierNameById.value.get(id) ?? id;
    if (t && !out.includes(t)) out.push(t);
  };
  for (const a of ns.associations ?? []) {
    if (a.fromClassifierId === cls.id && a.toClassifierId !== cls.id) push(a.toClassifierId);
    else if (a.toClassifierId === cls.id && a.fromClassifierId !== cls.id) push(a.fromClassifierId);
  }
  const diag = props.diagramAssocTargetsByClassId;
  if (diag) {
    const keys = [cls.id, slug((cls.name ?? cls.id).trim())].filter((k) => k.length > 0);
    for (const k of keys) {
      for (const tid of diag[k] ?? []) push(tid);
    }
  }
  return out;
});

function preferredAssociatedType(): string {
  return associatedTypeCandidates.value[0] ?? '';
}

/** 类图邻居：当前类 — 指定 `associatedClassifierId` 是否有一条边（支持 slug / cls-id）。 */
function resolveDiagramAssocTypeForTarget(assocClassifierId: string): string | undefined {
  const cls = selectedClass.value;
  const diag = props.diagramAssocTargetsByClassId;
  if (!cls || !diag) return undefined;
  const bid = assocClassifierId.trim();
  if (!bid) return undefined;
  const ownerName = (cls.name ?? cls.id).trim();
  const otherName = (classifierNameById.value.get(bid) ?? '').trim();
  const neighborKeys = new Set<string>(
    [bid, otherName ? slug(otherName) : ''].filter((x) => x.length > 0),
  );
  const ownerKeys = [cls.id, slug(ownerName)].filter((x) => x.length > 0);
  for (const ok of ownerKeys) {
    const neigh = diag[ok];
    if (!neigh) continue;
    for (const nid of neigh) {
      if (neighborKeys.has(nid)) {
        return classifierNameById.value.get(bid) ?? classifierNameById.value.get(nid) ?? nid;
      }
    }
  }
  return undefined;
}

function resolveRowAssocType(
  associatedClassifierId: string | undefined,
  opts?: { emptyMeansPreferred?: boolean },
): string | undefined {
  const cls = selectedClass.value;
  const ns = selectedNamespace.value;
  const emptyMeansPreferred = opts?.emptyMeansPreferred !== false;
  if (!cls) return undefined;
  const bid = associatedClassifierId?.trim();
  if (!bid) return emptyMeansPreferred ? preferredAssociatedType() : undefined;

  const fromDiagram = resolveDiagramAssocTypeForTarget(bid);
  if (fromDiagram) return fromDiagram;

  for (const a of ns?.associations ?? []) {
    if (
      (a.fromClassifierId === cls.id && a.toClassifierId === bid) ||
      (a.toClassifierId === cls.id && a.fromClassifierId === bid)
    ) {
      return classifierNameById.value.get(bid) ?? bid;
    }
  }
  return classifierNameById.value.get(bid) ?? bid;
}

function onFieldMemberAssocClassifierChange(miIdx: number, ev: Event) {
  const raw = (ev.target as HTMLSelectElement).value.trim();
  const part: Partial<MvCodespaceClassMember> = {
    associatedClassifierId: raw || undefined,
  };
  const t = resolveRowAssocType(raw || undefined, { emptyMeansPreferred: false });
  if (t) {
    part.typeFromAssociation = true;
    part.type = t;
  } else {
    part.typeFromAssociation = undefined;
  }
  patchFieldMember(miIdx, part);
}

function onPropertyAssocClassifierChange(pi: number, ev: Event) {
  const raw = (ev.target as HTMLSelectElement).value.trim();
  const part: Partial<MvCodespaceProperty> = {
    associatedClassifierId: raw || undefined,
  };
  const t = resolveRowAssocType(raw || undefined, { emptyMeansPreferred: false });
  if (t) {
    part.typeFromAssociation = true;
    part.type = t;
  } else {
    part.typeFromAssociation = undefined;
  }
  patchProperty(pi, part);
}
function classTemplateParamsStr(): string {
  const c = getNamespaceAtPath(props.modelValue, props.mi, props.path)?.classes?.[props.ci];
  return (c?.templateParams ?? []).join(', ');
}

function patchClassField(key: keyof MvCodespaceClassifier, value: unknown) {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
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
    if (key === 'name') {
      (c as unknown as Record<string, unknown>)[key] = value;
      rebuildPathIdsForModule(d, props.mi);
      return;
    }
    if (key === 'stereotype' || key === 'notes') {
      const str = String(value ?? '').trim();
      (c as unknown as Record<string, unknown>)[key] = str ? String(value) : undefined;
    }
  });
}

function normalizeFieldMember(mem: MvCodespaceClassMember): void {
  const m = mem as MvCodespaceClassMember & Record<string, unknown>;
  delete m.signature;
  delete m.methodKind;
  delete m.operatorSymbol;
  delete m.enumGroup;
  if (!mem.visibility) mem.visibility = 'private';
  delete mem.accessor;
}

function normalizeMethodMember(mem: MvCodespaceClassMethod): void {
  const m = mem as MvCodespaceClassMethod & Record<string, unknown>;
  delete m.accessor;
  delete m.enumGroup;
  if (!mem.methodKind) mem.methodKind = 'normal';
  if (!mem.params && mem.signature) {
    mem.params = parseParamsFromSignature(mem.signature);
  }
  if (!mem.signature) mem.signature = '()';
  if (!mem.type) mem.type = 'int';
  if (mem.methodKind !== 'operator') delete mem.operatorSymbol;
  if (!mem.params) mem.params = [];
  mem.signature = buildMethodSignature(mem);
}

function normalizeEnumMember(mem: MvCodespaceClassEnum): void {
  const m = mem as MvCodespaceClassEnum & Record<string, unknown>;
  delete m.signature;
  delete m.accessor;
  delete m.methodKind;
  delete m.operatorSymbol;
  delete m.virtual;
  delete m.static;
  delete m.typeFromAssociation;
  if (!mem.value && mem.type) mem.value = mem.type;
  if (mem.value && !mem.type) mem.type = mem.value;
}

function parseParamsFromSignature(signature: string): MvCodespaceMethodParam[] {
  const s = signature.trim();
  const l = s.indexOf('(');
  const r = s.lastIndexOf(')');
  if (l < 0 || r <= l) return [];
  const body = s.slice(l + 1, r).trim();
  if (!body) return [];
  return body
    .split(',')
    .map((raw, i) => {
      const token = raw.trim().replace(/\s+/g, ' ');
      if (!token) return null;
      const isConst = /\bconst\b/.test(token);
      const passMode: MvCodespaceMethodParamPassMode = token.includes('*')
        ? 'pointer'
        : token.includes('&')
          ? 'reference'
          : 'value';
      const cleaned = token.replace(/\bconst\b/g, '').replace(/[&*]/g, '').trim();
      const parts = cleaned.split(' ').filter(Boolean);
      const name = parts.pop() ?? `arg${i + 1}`;
      const type = parts.join(' ').trim() || 'int';
      return { name, type, passMode, isConst };
    })
    .filter((x): x is MvCodespaceMethodParam => !!x);
}

function buildMethodSignature(mem: MvCodespaceClassMethod): string {
  const params = mem.params ?? [];
  const body = params
    .map((p, i) => {
      const name = (p.name ?? '').trim() || `arg${i + 1}`;
      const type = (p.type ?? '').trim() || 'int';
      const pass = p.passMode === 'reference' ? '&' : p.passMode === 'pointer' ? '*' : '';
      const cst = p.isConst ? 'const ' : '';
      return `${cst}${type}${pass} ${name}`.trim();
    })
    .join(', ');
  return `(${body})`;
}

function setClassTemplateParams(raw: string) {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    const parts = raw
      .split(/[,，\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    c.templateParams = parts.length ? parts : undefined;
  });
}

function addBase() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.bases) c.bases = [];
    const ids = collectClassifierIds(d);
    const tid = ids.find((id) => id !== c.id) ?? ids[0] ?? c.id;
    c.bases.push({ targetId: tid, relation: 'generalization' });
  });
}

function patchBase(bi: number, part: Partial<MvCodespaceClassifierBase>) {
  props.runPatch((d) => {
    const b = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.bases?.[bi];
    if (!b) return;
    Object.assign(b, part);
  });
}

function removeBase(bi: number) {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.bases?.splice(bi, 1);
  });
}

function addMember() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.members) c.members = [];
    const name = ensureUniqueClassifierItemName(c, csMsg.value.newMemberName);
    c.members.push({ name, visibility: 'public', type: 'int' });
  });
}

function addProperty() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.properties) c.properties = [];
    const name = ensureUniquePropertyName(c.properties, 'property');
    c.properties.push({
      name,
      backingFieldName: `_${name}`,
      backingVisibility: 'private',
      type: 'int',
      hasGetter: true,
      hasSetter: true,
      getterVisibility: 'public',
      setterVisibility: 'public',
    });
  });
}

function allNamesInClassifier(c: MvCodespaceClassifier): Set<string> {
  const used = new Set<string>();
  for (const m of c.members ?? []) used.add((m.name ?? '').trim());
  for (const m of c.methods ?? []) used.add((m.name ?? '').trim());
  for (const m of c.enums ?? []) used.add((m.name ?? '').trim());
  return used;
}

function ensureUniqueClassifierItemName(c: MvCodespaceClassifier, preferred: string): string {
  const base = (preferred || 'member').trim() || 'member';
  const used = allNamesInClassifier(c);
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

function ensureUniquePropertyName(properties: MvCodespaceProperty[], preferred: string): string {
  const base = (preferred || 'property').trim() || 'property';
  const used = new Set(properties.map((p) => (p.name ?? '').trim()).filter(Boolean));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

function memberTypeKnown(v: string | undefined): boolean {
  const t = (v ?? '').trim();
  return !!t && MEMBER_TYPE_OPTIONS.includes(t);
}

function addMethodMember() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.methods) c.methods = [];
    const name = ensureUniqueClassifierItemName(c, 'method');
    c.methods.push({ name, methodKind: 'normal', signature: '()', params: [], type: 'int' });
  });
}

function addSpecialMethodFromTemplate(t: SpecialMethodTemplate) {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.methods) c.methods = [];
    const name = ensureUniqueClassifierItemName(c, t.method.name);
    const method: MvCodespaceClassMethod & Record<string, unknown> = {
      ...JSON.parse(JSON.stringify(t.method)),
      name,
      notes: '',
      __specialTemplateId: t.id,
    };
    normalizeMethodMember(method);
    c.methods.push(method);
  });
  specialMethodPickerOpen.value = false;
}

function addEnumMember() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.enums) c.enums = [];
    const name = ensureUniqueClassifierItemName(c, 'ENUM');
    c.enums.push({ name, enumGroup: 'default', value: '0' });
  });
}

function patchProperty(pi: number, part: Partial<MvCodespaceProperty>) {
  props.runPatch((d) => {
    const prop = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.properties?.[pi];
    if (!prop) return;
    Object.assign(prop, part);
  });
}

function enableAssocTypeForCurrentRows(): void {
  for (const r of fieldRows.value) {
    const t = resolveRowAssocType(r.mem.associatedClassifierId);
    if (!t) continue;
    patchFieldMember(r.idx, { typeFromAssociation: true, type: t });
  }
  for (let pi = 0; pi < propertyRows.value.length; pi++) {
    const t = resolveRowAssocType(propertyRows.value[pi]?.associatedClassifierId);
    if (!t) continue;
    patchProperty(pi, { typeFromAssociation: true, type: t });
  }
}

function removeProperty(pi: number) {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.properties?.splice(pi, 1);
  });
}

function patchFieldMember(miIdx: number, part: Partial<MvCodespaceClassMember>) {
  props.runPatch((d) => {
    const mem = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.members?.[miIdx];
    if (!mem) return;
    Object.assign(mem, part);
    normalizeFieldMember(mem);
  });
}

function patchMethodMember(miIdx: number, part: Partial<MvCodespaceClassMethod>) {
  props.runPatch((d) => {
    const mem = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.methods?.[miIdx];
    if (!mem) return;
    Object.assign(mem, part);
    normalizeMethodMember(mem);
    if (mem.methodKind === 'operator') {
      const op = String(mem.operatorSymbol ?? '').trim();
      mem.operatorSymbol = op || '()';
    }
  });
}

function methodIsTemplateLocked(mem: MvCodespaceClassMethod): boolean {
  return typeof (mem as Record<string, unknown>).__specialTemplateId === 'string';
}

function addMethodParam(miIdx: number) {
  props.runPatch((d) => {
    const mem = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.methods?.[miIdx];
    if (!mem) return;
    if (methodIsTemplateLocked(mem)) return;
    if (!mem.params) mem.params = [];
    mem.params.push({ name: `arg${(mem.params?.length ?? 0) + 1}`, type: 'int', passMode: 'value' });
    normalizeMethodMember(mem);
  });
}

function patchMethodParam(
  miIdx: number,
  pi: number,
  part: Partial<MvCodespaceMethodParam>,
) {
  props.runPatch((d) => {
    const mem = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.methods?.[miIdx];
    if (!mem) return;
    if (methodIsTemplateLocked(mem)) return;
    if (!mem.params) mem.params = [];
    const p = mem.params[pi];
    if (!p) return;
    Object.assign(p, part);
    if (!p.name) p.name = `arg${pi + 1}`;
    normalizeMethodMember(mem);
  });
}

function removeMethodParam(miIdx: number, pi: number) {
  props.runPatch((d) => {
    const mem = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.methods?.[miIdx];
    if (!mem) return;
    if (methodIsTemplateLocked(mem)) return;
    mem.params?.splice(pi, 1);
    normalizeMethodMember(mem);
  });
}

function patchEnumMember(miIdx: number, part: Partial<MvCodespaceClassEnum>) {
  props.runPatch((d) => {
    const mem = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.enums?.[miIdx];
    if (!mem) return;
    if ('value' in part) {
      const v = String(part.value ?? '').trim();
      part.type = v || undefined;
      part.value = v || undefined;
    }
    Object.assign(mem, part);
    normalizeEnumMember(mem);
  });
}

function removeFieldMember(miIdx: number) {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.members?.splice(miIdx, 1);
  });
}

function removeMethodMember(miIdx: number) {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.methods?.splice(miIdx, 1);
  });
}

function removeEnumMember(miIdx: number) {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.enums?.splice(miIdx, 1);
  });
}

function removeClass() {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.splice(props.ci, 1);
  });
  emit('close');
}

watch(associatedTypeCandidates, (next, prev) => {
  // When association is newly connected, auto-enable assocType and sync types.
  if (next.length > 0 && (!prev || prev.length === 0)) {
    enableAssocTypeForCurrentRows();
    return;
  }
  for (const r of fieldRows.value) {
    if (r.mem.typeFromAssociation !== true) continue;
    const t = resolveRowAssocType(r.mem.associatedClassifierId);
    if (t) patchFieldMember(r.idx, { type: t });
  }
  for (let pi = 0; pi < propertyRows.value.length; pi++) {
    if (propertyRows.value[pi]?.typeFromAssociation !== true) continue;
    const t = resolveRowAssocType(propertyRows.value[pi]?.associatedClassifierId);
    if (t) patchProperty(pi, { type: t });
  }
  for (const r of methodRows.value) {
    if (r.mem.typeFromAssociation !== true) continue;
    const t = resolveRowAssocType(undefined);
    if (t) patchMethodMember(r.idx, { type: t });
  }
}, { immediate: true });
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!selectedClass"
    :allow-maximize="true"
    :title="selectedClass ? csMsg.flClassifierTitle(selectedClass.name) : csMsg.flClassifierBare"
    @close="emit('close')"
  >
    <template v-if="selectedClass">
      <label class="field">
        <span>id</span>
        <input
          type="text"
          class="wide"
          :value="selectedClass.id"
          :title="csMsg.flClsIdTitle"
          readonly
        />
        <p class="cs-field-hint">{{ csMsg.flClsIdReadonlyHint }}</p>
      </label>
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="selectedClass.name"
          :title="csMsg.flClsNameTitle"
          @input="patchClassField('name', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <div class="cs-inline-pair">
        <label class="field">
          <span>kind</span>
          <select
            class="wide"
            :title="csMsg.flClsKindTitle"
            :value="selectedClass.kind ?? 'class'"
            @change="patchClassField('kind', ($event.target as HTMLSelectElement).value || undefined)"
          >
            <option v-for="k in CLASSIFIER_KINDS" :key="k" :value="k">{{ k }}</option>
          </select>
        </label>
        <label class="field cs-check">
          <input
            type="checkbox"
            :checked="selectedClass.abstract === true"
            :title="csMsg.flClsAbstractTitle"
            @change="patchClassField('abstract', ($event.target as HTMLInputElement).checked)"
          />
          <span>abstract</span>
        </label>
      </div>
      <label class="field">
        <span>stereotype</span>
        <input
          type="text"
          class="wide"
          :value="selectedClass.stereotype ?? ''"
          :placeholder="csMsg.flClsStereotypePlaceholder"
          :title="csMsg.flClsStereotypeTitle"
          @input="patchClassField('stereotype', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>{{ csMsg.flClsTemplateParamsLabel }}</span>
        <textarea
          class="payload-ta"
          rows="3"
          spellcheck="false"
          :value="classTemplateParamsStr()"
          :placeholder="csMsg.flClsTemplateParamsPlaceholder"
          :title="csMsg.flClsTemplateParamsTitle"
          @input="setClassTemplateParams(($event.target as HTMLTextAreaElement).value)"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <textarea
          class="payload-ta"
          rows="6"
          :value="selectedClass.notes ?? ''"
          :placeholder="csMsg.flClsNotesPlaceholder"
          :title="csMsg.flClsNotesTitle"
          @input="patchClassField('notes', ($event.target as HTMLTextAreaElement).value)"
        />
      </label>

      <h5 class="cs-subh">{{ csMsg.flClsBasesHeading }}</h5>
      <div v-for="(b, bi) in selectedClass.bases ?? []" :key="'cbase-' + bi + '-' + b.targetId" class="cs-rowline cs-base-row">
        <div class="cs-base-main">
          <label class="field cs-base-field">
            <span>{{ csMsg.flClsBaseTypeLabel }}</span>
            <select
              class="wide"
              :title="csMsg.flClsTargetIdTitle"
              :value="b.targetId"
              @change="patchBase(bi, { targetId: ($event.target as HTMLSelectElement).value })"
            >
              <option v-if="!classifierIdSet.has(b.targetId)" :value="b.targetId">
                {{ csMsg.flClsBaseInvalidTargetPrefix }} {{ b.targetId }}
              </option>
              <option v-for="opt in baseTargetPickOptions" :key="'bopt-' + opt.id" :value="opt.id">{{ opt.label }}</option>
            </select>
          </label>
          <div
            class="cs-base-ref"
            :class="{ 'cs-base-ref--warn': !classifierIdSet.has(b.targetId) }"
            :title="csMsg.flClsBaseRefCaption"
          >
            <span class="cs-base-ref-name">{{ classifierNameById.get(b.targetId) ?? '—' }}</span>
            <code class="cs-base-ref-id">{{ b.targetId }}</code>
          </div>
        </div>
        <select
          class="cs-base-rel"
          :title="csMsg.flClsRelationTitle"
          :value="b.relation"
          @change="
            patchBase(bi, {
              relation: ($event.target as HTMLSelectElement).value as MvCodespaceClassifierBase['relation'],
            })
          "
        >
          <option v-for="r in BASE_REL" :key="r" :value="r">{{ r }}</option>
        </select>
        <button type="button" class="link-btn" :title="csMsg.flClsDelShortTitle" @click="removeBase(bi)">
          {{ csMsg.flClsDelShortLabel }}
        </button>
      </div>
      <button type="button" class="add-row" :title="csMsg.flClsAddBaseTitle" @click="addBase">
        {{ csMsg.flClsAddBaseLabel }}
      </button>

      <h5 class="cs-subh">{{ csMsg.flClsMembersHeading }}</h5>
      <table class="cs-table">
        <thead>
          <tr>
            <th>name</th>
            <th>visibility</th>
            <th>type</th>
            <th>assocCls</th>
            <th>assocType</th>
            <th>static</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ mem, idx } in fieldRows" :key="'all-' + idx">
            <td>
              <input
                :value="mem.name"
                :title="csMsg.flClsMemberNameTitle"
                @input="patchFieldMember(idx, { name: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td>
              <select
                :value="mem.visibility ?? 'public'"
                :title="csMsg.flClsMemberVisTitle"
                @change="patchFieldMember(idx, { visibility: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="v in MEMBER_VIS_OPTIONS" :key="'mv-' + v" :value="v">{{ v }}</option>
              </select>
            </td>
            <td>
              <select
                :value="mem.type ?? 'int'"
                :title="csMsg.flClsMemberTypeSigTitle"
                :disabled="mem.typeFromAssociation === true"
                @change="patchFieldMember(idx, { type: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="t in MEMBER_TYPE_OPTIONS" :key="'mt-' + t" :value="t">{{ t }}</option>
                <option v-if="mem.type && !memberTypeKnown(mem.type)" :value="mem.type">
                  {{ mem.type }}
                </option>
              </select>
            </td>
            <td>
              <select
                class="wide"
                :value="mem.associatedClassifierId ?? ''"
                title="与该成员关联的类型端 Classifier（可与类图中不同邻居分别对应）"
                @change="onFieldMemberAssocClassifierChange(idx, $event)"
              >
                <option value="">—</option>
                <option v-for="cid in classifierOptions" :key="'macf-' + cid" :value="cid">
                  {{ classifierNameById.get(cid) ?? cid }}
                </option>
              </select>
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="mem.typeFromAssociation === true"
                title="Read-only: controlled by association links"
                disabled
              />
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="mem.static === true"
                :title="csMsg.flClsMemberStaticTitle"
                @change="patchFieldMember(idx, { static: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeFieldMember(idx)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="add-row" :title="csMsg.flClsAddMemberTitle" @click="addMember">
        {{ csMsg.flClsAddMemberLabel }}
      </button>

      <h5 class="cs-subh">{{ csMsg.flClsFieldsHeading }}</h5>
      <table class="cs-table">
        <thead>
          <tr>
            <th>name</th>
            <th>backingField</th>
            <th>backingVisibility</th>
            <th>type</th>
            <th>assocCls</th>
            <th>assocType</th>
            <th>getter</th>
            <th>setter</th>
            <th>getterVis</th>
            <th>setterVis</th>
            <th>static</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(prop, pi) in propertyRows" :key="'p-' + pi">
            <td>
              <input
                :value="prop.name"
                :title="csMsg.flClsMemberNameTitle"
                @input="patchProperty(pi, { name: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td>
              <input
                :value="prop.backingFieldName ?? ''"
                :title="csMsg.flClsMemberVisTitle"
                @input="patchProperty(pi, { backingFieldName: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td>
              <select
                :value="prop.backingVisibility ?? 'private'"
                :title="csMsg.flClsMemberVisTitle"
                @change="patchProperty(pi, { backingVisibility: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="v in MEMBER_VIS_OPTIONS" :key="'pv-' + v" :value="v">{{ v }}</option>
              </select>
            </td>
            <td>
              <select
                :value="prop.type ?? 'int'"
                :title="csMsg.flClsMemberTypeSigTitle"
                :disabled="prop.typeFromAssociation === true"
                @change="patchProperty(pi, { type: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="t in MEMBER_TYPE_OPTIONS" :key="'pt-' + t" :value="t">{{ t }}</option>
                <option v-if="prop.type && !memberTypeKnown(prop.type)" :value="prop.type">
                  {{ prop.type }}
                </option>
              </select>
            </td>
            <td>
              <select
                class="wide"
                :value="prop.associatedClassifierId ?? ''"
                title="与该属性关联的类型端 Classifier"
                @change="onPropertyAssocClassifierChange(pi, $event)"
              >
                <option value="">—</option>
                <option v-for="cid in classifierOptions" :key="'pacf-' + cid" :value="cid">
                  {{ classifierNameById.get(cid) ?? cid }}
                </option>
              </select>
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="prop.typeFromAssociation === true"
                title="Read-only: controlled by association links"
                disabled
              />
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="prop.hasGetter !== false"
                :title="csMsg.flClsMemberAccessorTitle"
                @change="patchProperty(pi, { hasGetter: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="prop.hasSetter !== false"
                :title="csMsg.flClsMemberAccessorTitle"
                @change="patchProperty(pi, { hasSetter: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td>
              <select
                :value="prop.getterVisibility ?? 'public'"
                :title="csMsg.flClsMemberAccessorTitle"
                @change="patchProperty(pi, { getterVisibility: ($event.target as HTMLSelectElement).value as MvCodespaceAccessorVisibility })"
              >
                <option v-for="a in ACCESS_VIS" :key="'gv-' + a" :value="a">{{ a }}</option>
              </select>
            </td>
            <td>
              <select
                :value="prop.setterVisibility ?? 'public'"
                :title="csMsg.flClsMemberAccessorTitle"
                @change="patchProperty(pi, { setterVisibility: ($event.target as HTMLSelectElement).value as MvCodespaceAccessorVisibility })"
              >
                <option v-for="a in ACCESS_VIS" :key="'sv-' + a" :value="a">{{ a }}</option>
              </select>
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="prop.static === true"
                :title="csMsg.flClsMemberStaticTitle"
                @change="patchProperty(pi, { static: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeProperty(pi)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="add-row" :title="csMsg.flClsAddFieldTitle" @click="addProperty">
        {{ csMsg.flClsAddFieldLabel }}
      </button>
      <h5 class="cs-subh">{{ csMsg.flClsMethodsHeading }}</h5>
      <table class="cs-table">
        <thead>
          <tr>
            <th>name</th>
            <th>visibility</th>
            <th>methodKind</th>
            <th>params</th>
            <th>return</th>
            <th>virtual</th>
            <th>operator</th>
            <th>notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ mem, idx } in methodRows" :key="'meth-' + idx">
            <td>
              <input :value="mem.name" :title="csMsg.flClsMemberNameTitle" @input="patchMethodMember(idx, { name: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <select
                :value="mem.visibility ?? 'public'"
                :title="csMsg.flClsMemberVisTitle"
                :disabled="methodIsTemplateLocked(mem)"
                @change="patchMethodMember(idx, { visibility: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="v in MEMBER_VIS_OPTIONS" :key="'mvm-' + v" :value="v">{{ v }}</option>
              </select>
            </td>
            <td>
              <select
                :value="mem.methodKind ?? 'normal'"
                :title="csMsg.flClsMemberMethodKindTitle"
                disabled
              >
                <option v-for="mk in METHOD_KINDS" :key="mk" :value="mk">{{ mk }}</option>
              </select>
            </td>
            <td>
              <div class="cs-param-list">
                <div v-for="(p, pi) in mem.params ?? []" :key="'mp-' + idx + '-' + pi" class="cs-param-row">
                  <select :value="p.passMode ?? 'value'" :disabled="methodIsTemplateLocked(mem)" @change="patchMethodParam(idx, pi, { passMode: ($event.target as HTMLSelectElement).value as MvCodespaceMethodParamPassMode })">
                    <option v-for="mode in METHOD_PARAM_PASS_MODES" :key="'pm-' + mode" :value="mode">{{ mode }}</option>
                  </select>
                  <input :value="p.type ?? ''" placeholder="type" :disabled="methodIsTemplateLocked(mem)" @input="patchMethodParam(idx, pi, { type: ($event.target as HTMLInputElement).value })" />
                  <input :value="p.name" placeholder="name" :disabled="methodIsTemplateLocked(mem)" @input="patchMethodParam(idx, pi, { name: ($event.target as HTMLInputElement).value })" />
                  <label class="cs-check cs-param-const">
                    <input type="checkbox" :checked="p.isConst === true" :disabled="methodIsTemplateLocked(mem)" @change="patchMethodParam(idx, pi, { isConst: ($event.target as HTMLInputElement).checked })" />
                    <span>const</span>
                  </label>
                  <button type="button" class="link-btn" :disabled="methodIsTemplateLocked(mem)" @click="removeMethodParam(idx, pi)">Del</button>
                </div>
                <button type="button" class="link-btn" :disabled="methodIsTemplateLocked(mem)" @click="addMethodParam(idx)">+ param</button>
              </div>
            </td>
            <td>
              <select
                :value="mem.type ?? 'int'"
                :title="csMsg.flClsMemberTypeSigTitle"
                :disabled="mem.typeFromAssociation === true || methodIsTemplateLocked(mem)"
                @change="patchMethodMember(idx, { type: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="t in MEMBER_TYPE_OPTIONS" :key="'mr-' + t" :value="t">{{ t }}</option>
                <option v-if="mem.type && !memberTypeKnown(mem.type)" :value="mem.type">
                  {{ mem.type }}
                </option>
              </select>
            </td>
            <td class="cs-td-center">
              <input type="checkbox" :checked="mem.virtual === true" :title="csMsg.flClsMemberVirtualTitle" :disabled="methodIsTemplateLocked(mem)" @change="patchMethodMember(idx, { virtual: ($event.target as HTMLInputElement).checked })" />
            </td>
            <td>
              <template v-if="(mem.methodKind ?? 'normal') === 'operator'">
                <select
                  :value="mem.operatorSymbol ?? '()'"
                  :title="csMsg.flClsMemberOperatorTitle"
                  :disabled="methodIsTemplateLocked(mem)"
                  @change="patchMethodMember(idx, { operatorSymbol: ($event.target as HTMLSelectElement).value })"
                >
                  <option v-for="op in OPERATOR_SYMBOL_OPTIONS" :key="op" :value="op">{{ op }}</option>
                </select>
              </template>
            </td>
            <td>
              <input :value="mem.notes ?? ''" placeholder="notes" @input="patchMethodMember(idx, { notes: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeMethodMember(idx)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="add-row" :title="csMsg.flClsAddMethodTitle" @click="addMethodMember">
        {{ csMsg.flClsAddMethodLabel }}
      </button>
      <button type="button" class="add-row" title="添加特殊方法模板" @click="specialMethodPickerOpen = true">
        ＋ 特殊方法
      </button>
      <dialog v-if="specialMethodPickerOpen" open class="cs-special-method-dialog">
        <div class="cs-special-picker">
          <div class="cs-special-picker__header">
            <strong>特殊方法模板</strong>
            <button type="button" class="link-btn" @click="specialMethodPickerOpen = false">Close</button>
          </div>
          <details v-for="group in specialMethodTemplateGroups" :key="'smg-' + group.category" open>
            <summary>{{ group.category }}</summary>
            <div class="cs-special-picker__group">
              <button v-for="tpl in group.templates" :key="tpl.id" type="button" class="link-btn" @click="addSpecialMethodFromTemplate(tpl)">
                {{ tpl.label }}
              </button>
            </div>
          </details>
        </div>
      </dialog>

      <h5 class="cs-subh">{{ csMsg.flClsEnumLiteralsHeading }}</h5>
      <table class="cs-table">
        <thead>
          <tr>
            <th>group</th>
            <th>name</th>
            <th>value</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ mem, idx } in enumRows" :key="'en-' + idx">
            <td>
              <input :value="mem.enumGroup ?? ''" placeholder="EnumType" title="enum group" @input="patchEnumMember(idx, { enumGroup: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <input :value="mem.name" :title="csMsg.flClsMemberNameTitle" @input="patchEnumMember(idx, { name: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <input :value="mem.value ?? mem.type ?? ''" :title="csMsg.flClsMemberTypeSigTitle" @input="patchEnumMember(idx, { value: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeEnumMember(idx)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="cs-actions">
        <button type="button" class="add-row" :title="csMsg.flClsAddEnumLiteralTitle" @click="addEnumMember">
          {{ csMsg.flClsAddEnumLiteralLabel }}
        </button>
      </div>

      <div class="cs-actions">
        <button type="button" class="link-btn cs-danger" :title="csMsg.flClsRemoveClassTitle" @click="removeClass">
          {{ csMsg.flClsRemoveClassLabel }}
        </button>
      </div>
    </template>
  </CodespaceFloatShell>
</template>
