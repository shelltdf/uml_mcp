<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import type {
  MvCodespaceAccessorVisibility,
  MvCodespaceClassEnum,
  MvCodespaceClassMember,
  MvCodespaceClassMethod,
  MvCodespaceClassifier,
  MvCodespaceClassifierBase,
  MvCodespaceNamespaceNode,
  MvCodespaceMethodKind,
  MvCodespaceMethodParam,
  MvCodespaceMethodParamPassMode,
  MvCodespaceProperty,
  MvModelCodespacePayload,
} from '@mvwb/core';
import { slug } from '@mvwb/mermaid';
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
type ClassifierTabKey = 'basic' | 'bases' | 'members' | 'properties' | 'methods';

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
  classPath?: number[];
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
  diagramAssocTargetsByClassId?: Record<string, string[]>;
}>();

const emit = defineEmits<{
  close: [];
}>();

function resolveSelectedClass(payload: MvModelCodespacePayload): MvCodespaceClassifier | null {
  let c = getNamespaceAtPath(payload, props.mi, props.path)?.classes?.[props.ci];
  for (const idx of props.classPath ?? []) c = c?.classes?.[idx];
  return c ?? null;
}

const selectedClass = computed((): MvCodespaceClassifier | null => resolveSelectedClass(props.modelValue));
const selectedNamespace = computed(() => getNamespaceAtPath(props.modelValue, props.mi, props.path));
function moduleLabel(mi: number): string {
  const raw = (props.modelValue.modules?.[mi]?.name ?? '').trim();
  return raw ? raw : `Module#${mi + 1}`;
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
  if (!parent) return name;
  return `${parent}.${name}`;
}
const currentClassParentKey = computed(() => {
  const cp = props.classPath ?? [];
  if (!cp.length) return `ns:${props.mi}:${props.path.join('.')}`;
  return `cls:${props.mi}:${props.path.join('.')}|${props.ci}|${cp.slice(0, -1).join('.')}`;
});
const classParentOptions = computed(() => {
  const out: Array<{ key: string; label: string; mi: number }> = [];
  const self = selectedClass.value;
  const selfId = self?.id;
  const descendantIds = new Set<string>();
  const collectDescendantIds = (c: MvCodespaceClassifier | undefined) => {
    for (const cc of c?.classes ?? []) {
      if (cc.id) descendantIds.add(cc.id);
      collectDescendantIds(cc);
    }
  };
  collectDescendantIds(self ?? undefined);
  const walkClasses = (
    classes: MvCodespaceClassifier[] | undefined,
    mi: number,
    nsPath: number[],
    rootCi: number,
    classPath: number[],
    classChain: string,
  ) => {
    if (!classes) return;
    for (let i = 0; i < classes.length; i++) {
      const c = classes[i]!;
      const p = [...classPath, i];
      const key = `cls:${mi}:${nsPath.join('.')}|${rootCi}|${p.join('.')}`;
      if (c.id !== selfId && !descendantIds.has(c.id)) {
        out.push({
          key,
          mi,
          label: `${classChain}.${c.name}`,
        });
      }
      walkClasses(c.classes, mi, nsPath, rootCi, p, `${classChain}.${c.name}`);
    }
  };
  const walkNs = (
    nodes: MvCodespaceNamespaceNode[] | undefined,
    mi: number,
    path: number[],
    nsChain: string,
  ) => {
    if (!nodes) return;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!;
      const p = [...path, i];
      const nextNsChain = appendNsChain(nsChain, n.name);
      out.push({
        key: `ns:${mi}:${p.join('.')}`,
        mi,
        label: `${moduleLabel(mi)}.${nextNsChain}`,
      });
      for (let ci = 0; ci < (n.classes?.length ?? 0); ci++) {
        const c = n.classes![ci]!;
        const classChain = `${nextNsChain}.${c.name}`;
        if (c.id !== selfId && !descendantIds.has(c.id)) {
          out.push({
            key: `cls:${mi}:${p.join('.')}|${ci}|`,
            mi,
            label: `${moduleLabel(mi)}.${classChain}`,
          });
        }
        walkClasses(c.classes, mi, p, ci, [], classChain);
      }
      walkNs(n.namespaces, mi, p, nextNsChain);
    }
  };
  for (let mi = 0; mi < (props.modelValue.modules?.length ?? 0); mi++) {
    const mod = props.modelValue.modules?.[mi];
    walkNs(mod?.namespaces, mi, [], '');
  }
  const current: Array<{ key: string; label: string; mi: number }> = [];
  const cross: Array<{ key: string; label: string; mi: number }> = [];
  for (const opt of out) {
    if (opt.key.startsWith(`ns:${props.mi}:`) || opt.key.startsWith(`cls:${props.mi}:`)) current.push(opt);
    else cross.push(opt);
  }
  return [...current, ...cross].map((opt) => ({ key: opt.key, label: opt.label }));
});

const classifierOptions = computed(() => collectClassifierIds(props.modelValue));
const fieldRows = computed(() =>
  (selectedClass.value?.members ?? [])
    .map((mem, idx) => ({ mem, idx }))
    .filter((r) => r.mem.accessor === undefined || r.mem.accessor === 'none'),
);
const methodRows = computed(() => (selectedClass.value?.methods ?? []).map((mem, idx) => ({ mem, idx })));
const propertyRows = computed(() => selectedClass.value?.properties ?? []);
const specialMethodPickerOpen = ref(false);
const parentPickerOpen = ref(false);
const parentSearch = ref('');
const pendingParentKey = ref('');
const activeTab = ref<ClassifierTabKey>('basic');
const currentClassParentLabel = computed(() => {
  const hit = classParentOptions.value.find((o) => o.key === currentClassParentKey.value);
  return hit?.label ?? currentClassParentKey.value;
});
const currentClassParentKind = computed<'namespace' | 'class'>(() =>
  currentClassParentKey.value.startsWith('cls:') ? 'class' : 'namespace',
);
const currentClassNamespacePathLabel = computed(() =>
  resolveNamespacePathLabel(props.modelValue, props.mi, props.path),
);
const filteredClassParentOptions = computed(() => {
  const q = parentSearch.value.trim().toLowerCase();
  if (!q) return classParentOptions.value;
  return classParentOptions.value.filter((o) => o.label.toLowerCase().includes(q));
});
const groupedClassParentOptions = computed(() => {
  const groups = new Map<number, Array<{ key: string; label: string }>>();
  for (const opt of filteredClassParentOptions.value) {
    const mi = opt.key.startsWith('ns:')
      ? Number(opt.key.slice(3).split(':')[0] ?? '-1')
      : Number(opt.key.slice(4).split(':')[0] ?? '-1');
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
  const mod = moduleLabel(mi);
  const p1 = `${mod} (current).`;
  const p2 = `${mod}.`;
  if (label.startsWith(p1)) return label.slice(p1.length);
  if (label.startsWith(p2)) return label.slice(p2.length);
  return label;
}
function classParentItemKind(key: string): 'namespace' | 'class' {
  return key.startsWith('cls:') ? 'class' : 'namespace';
}
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
  const c = resolveSelectedClass(props.modelValue);
  return (c?.templateParams ?? []).join(', ');
}

function withSelectedClassMutable(
  d: MvModelCodespacePayload,
  fn: (c: MvCodespaceClassifier) => void,
) {
  const c = resolveSelectedClass(d);
  if (!c) return;
  fn(c);
}

function removeSelectedClassMutable(d: MvModelCodespacePayload): void {
  const ns = getNamespaceAtPath(d, props.mi, props.path);
  if (!ns) return;
  const cp = props.classPath ?? [];
  if (!cp.length) {
    ns.classes?.splice(props.ci, 1);
    return;
  }
  let parent = ns.classes?.[props.ci];
  for (let i = 0; i < cp.length - 1; i++) parent = parent?.classes?.[cp[i]];
  const last = cp[cp.length - 1];
  parent?.classes?.splice(last, 1);
}

function moveClassParent(targetKey: string): void {
  if (!selectedClass.value) return;
  if (targetKey === currentClassParentKey.value) return;
  props.runPatch((d) => {
    const moved = resolveSelectedClass(d);
    if (!moved) return;
    const sourceMi = props.mi;
    // 先从原父容器移除
    removeSelectedClassMutable(d);
    let targetMi = sourceMi;
    if (targetKey.startsWith('ns:')) {
      const body = targetKey.slice(3);
      const [miRaw, nsKey] = body.split(':');
      targetMi = Number(miRaw ?? `${sourceMi}`);
      const nsPath = nsKey ? nsKey.split('.').map((x) => Number(x)) : [];
      const ns = getNamespaceAtPath(d, targetMi, nsPath);
      if (!ns) return;
      if (!ns.classes) ns.classes = [];
      ns.classes.push(moved);
    } else if (targetKey.startsWith('cls:')) {
      const body = targetKey.slice(4);
      const [miAndNsKey, rootCiRaw, classPathRaw] = body.split('|');
      const [miRaw, nsKey] = (miAndNsKey ?? '').split(':');
      targetMi = Number(miRaw ?? `${sourceMi}`);
      const nsPath = nsKey ? nsKey.split('.').map((x) => Number(x)) : [];
      const rootCi = Number(rootCiRaw ?? '0');
      const classPath = (classPathRaw ?? '')
        .split('.')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => Number(x));
      let parent = getNamespaceAtPath(d, targetMi, nsPath)?.classes?.[rootCi];
      for (const idx of classPath) parent = parent?.classes?.[idx];
      if (!parent) return;
      if (!parent.classes) parent.classes = [];
      parent.classes.push(moved);
    }
    rebuildPathIdsForModule(d, sourceMi);
    if (targetMi !== sourceMi) rebuildPathIdsForModule(d, targetMi);
  });
  emit('close');
}

function openParentPicker(): void {
  pendingParentKey.value = currentClassParentKey.value;
  parentSearch.value = '';
  parentPickerOpen.value = true;
}

function applyParentPicker(): void {
  const target = pendingParentKey.value || currentClassParentKey.value;
  parentPickerOpen.value = false;
  moveClassParent(target);
}

function patchClassField(key: keyof MvCodespaceClassifier, value: unknown) {
  props.runPatch((d) => {
    let c: MvCodespaceClassifier | null = null;
    withSelectedClassMutable(d, (x) => {
      c = x;
    });
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
    let c: MvCodespaceClassifier | null = null;
    withSelectedClassMutable(d, (x) => {
      c = x;
    });
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
    let c: MvCodespaceClassifier | null = null;
    withSelectedClassMutable(d, (x) => {
      c = x;
    });
    if (!c) return;
    if (!c.bases) c.bases = [];
    const ids = collectClassifierIds(d);
    const tid = ids.find((id) => id !== c.id) ?? ids[0] ?? c.id;
    c.bases.push({ targetId: tid, relation: 'generalization' });
  });
}

function ensureUniqueClassName(
  classes: MvCodespaceClassifier[],
  preferred: string,
): string {
  const base = (preferred || 'Class').trim() || 'Class';
  const used = new Set(classes.map((c) => (c.name ?? '').trim().toLowerCase()).filter(Boolean));
  if (!used.has(base.toLowerCase())) return base;
  let i = 2;
  while (used.has(`${base}_${i}`.toLowerCase())) i++;
  return `${base}_${i}`;
}

function normalizeEnglishIdentifier(raw: string, fallback: string): string {
  const t = (raw || '').trim();
  const cleaned = t.replace(/[^A-Za-z0-9_]/g, '_');
  const startOk = /^[A-Za-z_]/.test(cleaned);
  const base = (startOk ? cleaned : `_${cleaned}`).replace(/_+/g, '_').replace(/^_+$/, '');
  const out = base.trim() || fallback;
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(out) ? out : fallback;
}

function addSubclass() {
  props.runPatch((d) => {
    const parent = resolveSelectedClass(d);
    if (!parent) return;
    if (!parent.classes) parent.classes = [];
    const preferred = normalizeEnglishIdentifier(`${parent.name || 'Class'}Child`, 'ClassChild');
    const childName = ensureUniqueClassName(parent.classes, preferred);
    const childId = slug([...props.path.map((x) => String(x)), childName].join('/'));
    parent.classes.push({
      id: childId,
      name: childName,
      kind: 'class',
    });
  });
}

function patchBase(bi: number, part: Partial<MvCodespaceClassifierBase>) {
  props.runPatch((d) => {
    const b = resolveSelectedClass(d)?.bases?.[bi];
    if (!b) return;
    Object.assign(b, part);
  });
}

function removeBase(bi: number) {
  props.runPatch((d) => {
    resolveSelectedClass(d)?.bases?.splice(bi, 1);
  });
}

function addMember() {
  props.runPatch((d) => {
    const c = resolveSelectedClass(d);
    if (!c) return;
    if (!c.members) c.members = [];
    const name = ensureUniqueClassifierItemName(c, csMsg.value.newMemberName);
    c.members.push({ name, visibility: 'public', type: 'int' });
  });
}

function addProperty() {
  props.runPatch((d) => {
    const c = resolveSelectedClass(d);
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
    const c = resolveSelectedClass(d);
    if (!c) return;
    if (!c.methods) c.methods = [];
    const name = ensureUniqueClassifierItemName(c, 'method');
    c.methods.push({ name, methodKind: 'normal', signature: '()', params: [], type: 'int' });
  });
}

function addSpecialMethodFromTemplate(t: SpecialMethodTemplate) {
  props.runPatch((d) => {
    const c = resolveSelectedClass(d);
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
    const c = resolveSelectedClass(d);
    if (!c) return;
    if (!c.enums) c.enums = [];
    const name = ensureUniqueClassifierItemName(c, 'ENUM');
    c.enums.push({ name, enumGroup: 'default', value: '0' });
  });
}

function patchProperty(pi: number, part: Partial<MvCodespaceProperty>) {
  props.runPatch((d) => {
    const prop = resolveSelectedClass(d)?.properties?.[pi];
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
    resolveSelectedClass(d)?.properties?.splice(pi, 1);
  });
}

function patchFieldMember(miIdx: number, part: Partial<MvCodespaceClassMember>) {
  props.runPatch((d) => {
    const mem = resolveSelectedClass(d)?.members?.[miIdx];
    if (!mem) return;
    Object.assign(mem, part);
    normalizeFieldMember(mem);
  });
}

function patchMethodMember(miIdx: number, part: Partial<MvCodespaceClassMethod>) {
  props.runPatch((d) => {
    const mem = resolveSelectedClass(d)?.methods?.[miIdx];
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
    const mem = resolveSelectedClass(d)?.methods?.[miIdx];
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
    const mem = resolveSelectedClass(d)?.methods?.[miIdx];
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
    const mem = resolveSelectedClass(d)?.methods?.[miIdx];
    if (!mem) return;
    if (methodIsTemplateLocked(mem)) return;
    mem.params?.splice(pi, 1);
    normalizeMethodMember(mem);
  });
}

function removeFieldMember(miIdx: number) {
  props.runPatch((d) => {
    resolveSelectedClass(d)?.members?.splice(miIdx, 1);
  });
}

function removeMethodMember(miIdx: number) {
  props.runPatch((d) => {
    resolveSelectedClass(d)?.methods?.splice(miIdx, 1);
  });
}

function removeClass() {
  props.runPatch((d) => {
    removeSelectedClassMutable(d);
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

watch(
  () => props.open,
  (next) => {
    if (!next) {
      specialMethodPickerOpen.value = false;
      parentPickerOpen.value = false;
      parentSearch.value = '';
      activeTab.value = 'basic';
    }
  },
);
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!selectedClass"
    :allow-maximize="true"
    :title="selectedClass ? csMsg.flClassifierTitle(selectedClass.name) : csMsg.flClassifierBare"
    @close="emit('close')"
  >
    <template v-if="selectedClass">
      <div class="cde-float-tabs">
        <button type="button" class="cde-tab-btn" :class="{ 'cde-tab-btn--active': activeTab === 'basic' }" @click="activeTab = 'basic'">基础信息</button>
        <button type="button" class="cde-tab-btn" :class="{ 'cde-tab-btn--active': activeTab === 'bases' }" @click="activeTab = 'bases'">继承关系</button>
        <button type="button" class="cde-tab-btn" :class="{ 'cde-tab-btn--active': activeTab === 'members' }" @click="activeTab = 'members'">成员</button>
        <button type="button" class="cde-tab-btn" :class="{ 'cde-tab-btn--active': activeTab === 'properties' }" @click="activeTab = 'properties'">属性</button>
        <button type="button" class="cde-tab-btn" :class="{ 'cde-tab-btn--active': activeTab === 'methods' }" @click="activeTab = 'methods'">方法</button>
      </div>

      <section v-if="activeTab === 'basic'" class="cde-section-card">
        <h4 class="cde-section-title">基础信息</h4>
        <label class="field">
          <span>parentContainer</span>
          <div class="cs-parent-picker-inline">
            <span
              class="cs-parent-inline-kind cs-node-kind"
              :class="{
                'cs-node-kind--cls': currentClassParentKind === 'class',
                'cs-node-kind--ns': currentClassParentKind === 'namespace',
              }"
            >
              {{ currentClassParentKind === 'class' ? 'C' : 'N' }}
            </span>
            <input
              type="text"
              class="wide"
              :value="currentClassParentLabel"
              title="Current parent container"
              readonly
            />
            <button type="button" class="cs-parent-picker-btn" title="Pick parent container" @click="openParentPicker">
              修改
            </button>
          </div>
        </label>
        <label class="field">
          <span>id</span>
          <input type="text" class="wide" :value="selectedClass.id" :title="csMsg.flClsIdTitle" readonly />
          <p class="cs-field-hint">{{ csMsg.flClsIdReadonlyHint }}</p>
        </label>
        <label class="field">
          <span>namespacePath</span>
          <input
            type="text"
            class="wide"
            :value="currentClassNamespacePathLabel"
            title="Absolute namespace path"
            readonly
          />
        </label>
        <label class="field">
          <span>name</span>
          <input type="text" class="wide" :value="selectedClass.name" :title="csMsg.flClsNameTitle" @input="patchClassField('name', ($event.target as HTMLInputElement).value)" />
        </label>
        <div class="cs-inline-pair">
          <label class="field">
            <span>kind</span>
            <select class="wide" :title="csMsg.flClsKindTitle" :value="selectedClass.kind ?? 'class'" @change="patchClassField('kind', ($event.target as HTMLSelectElement).value || undefined)">
              <option v-for="k in CLASSIFIER_KINDS" :key="k" :value="k">{{ k }}</option>
            </select>
          </label>
          <label class="field cs-check">
            <input type="checkbox" :checked="selectedClass.abstract === true" :title="csMsg.flClsAbstractTitle" @change="patchClassField('abstract', ($event.target as HTMLInputElement).checked)" />
            <span>abstract</span>
          </label>
        </div>
        <label class="field">
          <span>stereotype</span>
          <input type="text" class="wide" :value="selectedClass.stereotype ?? ''" :placeholder="csMsg.flClsStereotypePlaceholder" :title="csMsg.flClsStereotypeTitle" @input="patchClassField('stereotype', ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="field">
          <span>{{ csMsg.flClsTemplateParamsLabel }}</span>
          <textarea class="payload-ta" rows="3" spellcheck="false" :value="classTemplateParamsStr()" :placeholder="csMsg.flClsTemplateParamsPlaceholder" :title="csMsg.flClsTemplateParamsTitle" @input="setClassTemplateParams(($event.target as HTMLTextAreaElement).value)" />
        </label>
        <label class="field">
          <span>notes</span>
          <textarea class="payload-ta" rows="6" :value="selectedClass.notes ?? ''" :placeholder="csMsg.flClsNotesPlaceholder" :title="csMsg.flClsNotesTitle" @input="patchClassField('notes', ($event.target as HTMLTextAreaElement).value)" />
        </label>
      </section>

      <section v-if="activeTab === 'bases'" class="cde-section-card">
        <h4 class="cde-section-title">{{ csMsg.flClsBasesHeading }}</h4>
        <div v-for="(b, bi) in selectedClass.bases ?? []" :key="'cbase-' + bi + '-' + b.targetId" class="cs-rowline cs-base-row">
          <div class="cs-base-main">
            <label class="field cs-base-field">
              <span>{{ csMsg.flClsBaseTypeLabel }}</span>
              <select class="wide" :title="csMsg.flClsTargetIdTitle" :value="b.targetId" @change="patchBase(bi, { targetId: ($event.target as HTMLSelectElement).value })">
                <option v-if="!classifierIdSet.has(b.targetId)" :value="b.targetId">
                  {{ csMsg.flClsBaseInvalidTargetPrefix }} {{ b.targetId }}
                </option>
                <option v-for="opt in baseTargetPickOptions" :key="'bopt-' + opt.id" :value="opt.id">{{ opt.label }}</option>
              </select>
            </label>
            <div class="cs-base-ref" :class="{ 'cs-base-ref--warn': !classifierIdSet.has(b.targetId) }" :title="csMsg.flClsBaseRefCaption">
              <span class="cs-base-ref-name">{{ classifierNameById.get(b.targetId) ?? '—' }}</span>
              <code class="cs-base-ref-id">{{ b.targetId }}</code>
            </div>
          </div>
          <select class="cs-base-rel" :title="csMsg.flClsRelationTitle" :value="b.relation" @change="patchBase(bi, { relation: ($event.target as HTMLSelectElement).value as MvCodespaceClassifierBase['relation'] })">
            <option v-for="r in BASE_REL" :key="r" :value="r">{{ r }}</option>
          </select>
          <button type="button" class="link-btn" :title="csMsg.flClsDelShortTitle" @click="removeBase(bi)">
            {{ csMsg.flClsDelShortLabel }}
          </button>
        </div>
        <div class="cs-actions">
          <button type="button" class="add-row" :title="csMsg.flClsAddBaseTitle" @click="addBase">
            {{ csMsg.flClsAddBaseLabel }}
          </button>
          <button type="button" class="add-row" title="新增当前类内部的嵌套类" @click="addSubclass">
            ＋ 内部类
          </button>
          <button type="button" class="add-row" :title="csMsg.flClsAddEnumLiteralTitle" @click="addEnumMember">
            ＋ 内部枚举
          </button>
        </div>
      </section>

      <section v-if="activeTab === 'members'" class="cde-section-card">
        <h4 class="cde-section-title">{{ csMsg.flClsMembersHeading }}</h4>
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
                <input :value="mem.name" :title="csMsg.flClsMemberNameTitle" @input="patchFieldMember(idx, { name: ($event.target as HTMLInputElement).value })" />
              </td>
              <td>
                <select :value="mem.visibility ?? 'public'" :title="csMsg.flClsMemberVisTitle" @change="patchFieldMember(idx, { visibility: ($event.target as HTMLSelectElement).value })">
                  <option v-for="v in MEMBER_VIS_OPTIONS" :key="'mv-' + v" :value="v">{{ v }}</option>
                </select>
              </td>
              <td>
                <select :value="mem.type ?? 'int'" :title="csMsg.flClsMemberTypeSigTitle" :disabled="mem.typeFromAssociation === true" @change="patchFieldMember(idx, { type: ($event.target as HTMLSelectElement).value })">
                  <option v-for="t in MEMBER_TYPE_OPTIONS" :key="'mt-' + t" :value="t">{{ t }}</option>
                  <option v-if="mem.type && !memberTypeKnown(mem.type)" :value="mem.type">
                    {{ mem.type }}
                  </option>
                </select>
              </td>
              <td>
                <select class="wide" :value="mem.associatedClassifierId ?? ''" title="与该成员关联的类型端 Classifier（可与类图中不同邻居分别对应）" @change="onFieldMemberAssocClassifierChange(idx, $event)">
                  <option value="">—</option>
                  <option v-for="cid in classifierOptions" :key="'macf-' + cid" :value="cid">
                    {{ classifierNameById.get(cid) ?? cid }}
                  </option>
                </select>
              </td>
              <td class="cs-td-center">
                <input type="checkbox" :checked="mem.typeFromAssociation === true" title="Read-only: controlled by association links" disabled />
              </td>
              <td class="cs-td-center">
                <input type="checkbox" :checked="mem.static === true" :title="csMsg.flClsMemberStaticTitle" @change="patchFieldMember(idx, { static: ($event.target as HTMLInputElement).checked })" />
              </td>
              <td>
                <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeFieldMember(idx)">
                  {{ csMsg.flClsRemoveMemberLabel }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="cs-actions">
          <button type="button" class="add-row" :title="csMsg.flClsAddMemberTitle" @click="addMember">
            {{ csMsg.flClsAddMemberLabel }}
          </button>
        </div>
      </section>

      <section v-if="activeTab === 'properties'" class="cde-section-card">
        <h4 class="cde-section-title">{{ csMsg.flClsFieldsHeading }}</h4>
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
        <div class="cs-actions">
          <button type="button" class="add-row" :title="csMsg.flClsAddFieldTitle" @click="addProperty">
            {{ csMsg.flClsAddFieldLabel }}
          </button>
        </div>
      </section>

      <section v-if="activeTab === 'methods'" class="cde-section-card">
        <h4 class="cde-section-title">{{ csMsg.flClsMethodsHeading }}</h4>
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
        <div class="cs-actions">
          <button type="button" class="add-row" :title="csMsg.flClsAddMethodTitle" @click="addMethodMember">
            {{ csMsg.flClsAddMethodLabel }}
          </button>
          <button type="button" class="add-row" title="添加特殊方法模板" @click="specialMethodPickerOpen = true">
            ＋ 特殊方法
          </button>
        </div>
      </section>

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

      <dialog v-if="parentPickerOpen" open class="cs-parent-picker-dialog">
        <div class="cs-special-picker">
          <div class="cs-special-picker__header">
            <strong>选择父容器</strong>
            <button type="button" class="link-btn" @click="parentPickerOpen = false">Close</button>
          </div>
          <label class="field">
            <span>搜索</span>
            <input v-model="parentSearch" type="text" class="wide" placeholder="搜索 namespace/class..." />
          </label>
          <div class="cs-parent-tree" role="tree" aria-label="Parent container tree">
            <details v-for="[mi, items] in groupedClassParentOptions" :key="'pcg-' + mi" open>
              <summary role="treeitem">
                <span class="cs-node-kind cs-node-kind--module">M</span>
                {{ moduleLabel(mi) }}{{ mi === props.mi ? ' (current)' : '' }}
              </summary>
              <div role="group">
                <button
                  v-for="opt in items"
                  :key="'pct-' + opt.key"
                  type="button"
                  role="treeitem"
                  class="cs-parent-tree__item"
                  :class="{ 'cs-parent-tree__item--active': pendingParentKey === opt.key }"
                  @click="pendingParentKey = opt.key"
                >
                  <span
                    class="cs-node-kind"
                    :class="{
                      'cs-node-kind--ns': classParentItemKind(opt.key) === 'namespace',
                      'cs-node-kind--cls': classParentItemKind(opt.key) === 'class',
                    }"
                  >
                    {{ classParentItemKind(opt.key) === 'class' ? 'C' : 'N' }}
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

      <div class="cs-actions cde-float-final-actions">
        <button type="button" class="link-btn cs-danger" :title="csMsg.flClsRemoveClassTitle" @click="removeClass">
          {{ csMsg.flClsRemoveClassLabel }}
        </button>
      </div>
    </template>
  </CodespaceFloatShell>
</template>

<style scoped>
.cde-float-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.cde-tab-btn {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}
.cde-tab-btn--active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
.cde-section-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px;
  margin-bottom: 12px;
}
.cde-section-title {
  margin: 0 0 10px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}
.cde-float-final-actions {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  margin-top: 10px;
}
.cs-special-method-dialog {
  width: min(680px, 92vw);
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0;
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
.cs-special-picker__group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0 4px;
}
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
.cs-node-kind--ns {
  border-color: #86efac;
  background: #dcfce7;
  color: #15803d;
}
.cs-node-kind--cls {
  border-color: #fcd34d;
  background: #fef3c7;
  color: #92400e;
}
.cs-inline-pair {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.cs-inline-pair .field {
  flex: 1 1 auto;
}
.cs-inline-pair .cs-check {
  flex: 0 0 auto;
  margin-bottom: 10px;
}
.cs-rowline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.cs-base-row {
  align-items: flex-start;
}
.cs-base-main {
  flex: 1 1 240px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cs-base-field {
  margin-bottom: 0;
}
.cs-base-ref {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  font-size: 0.78rem;
  color: #475569;
  line-height: 1.35;
}
.cs-base-ref--warn {
  color: #b45309;
}
.cs-base-ref-name {
  font-weight: 600;
}
.cs-base-ref-id {
  font-size: 0.74rem;
  padding: 1px 4px;
  border-radius: 3px;
  background: #f1f5f9;
}
.cs-base-ref--warn .cs-base-ref-id {
  background: #ffedd5;
}
.cs-base-rel {
  flex: 0 0 auto;
}
.cs-param-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cs-param-row {
  display: grid;
  grid-template-columns: 110px 1fr 1fr auto auto;
  gap: 6px;
  align-items: center;
}
.cs-param-const {
  margin-bottom: 0;
}
</style>
