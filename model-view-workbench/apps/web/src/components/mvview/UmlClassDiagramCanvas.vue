<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  type ClassDef,
  type ClassDiagramState,
  type ClassPositions,
  type ClassDiagramEdgeVisibility,
  buildClassDiagramViewPayload,
  classDiagramHeaderHeight,
  parseViewPayloadClassDiagram,
  slug,
} from '../../utils/uml-class-payload';
import { useAppLocale } from '../../composables/useAppLocale';
import { classDiagramCanvasMessages } from '../../i18n/class-diagram-canvas-messages';
import {
  type CodespaceClassTreeItem,
  listOneHopRelatedClassifierIdsForDiagramClass,
} from '../../utils/class-canvas-codespace-bridge';

type ClassDefCompat = ClassDef & {
  stereotype?: string | null;
  attributes?: string[];
  methods?: string[];
};

const props = defineProps<{
  modelValue: string;
  /** 用于 SVG marker id 去重 */
  canvasId: string;
  /** 当前 mv-view 绑定 modelRefs 解析出的 codespace 类树（同文件） */
  codespaceClasses?: CodespaceClassTreeItem[];
  /** model 来源是否有效（由父层按 modelRefs 校验） */
  modelSourceValid?: boolean;
  /** 可选：父层自定义错误提示 */
  modelSourceError?: string;
  /** 为 true：只读观察 bound model，仅允许改布局位置等；不写 codespace、不拉继承/关联到 model */
  observeCodespaceOnly?: boolean;
  /** 与同文件 mv-view 的 codespace 解析一致，用于「添加一层相关类型」右键菜单 */
  codespaceResolveMarkdown?: string;
  /** mv-view.modelRefs，与 codespaceResolveMarkdown 一起解析 Classifier */
  modelRefs?: string[];
}>();

const layoutOnly = computed(() => props.observeCodespaceOnly === true);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  openClassifier: [payload: { classDiagramClassId: string; className: string }];
  createMissingClassifier: [payload: { classId: string; className: string }];
}>();

const { locale } = useAppLocale();
const cd = computed(() => classDiagramCanvasMessages[locale.value]);
const noGlobalShortcutText = computed(() => (locale.value === 'en' ? 'No global shortcuts' : '无全局快捷键'));

const mkId = computed(() => `mk-${props.canvasId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
const markerAssocUrl = computed(() => `url(#${mkId.value}-asc)`);
const markerInheritUrl = computed(() => `url(#${mkId.value}-inh)`);
const markerDependencyUrl = computed(() => `url(#${mkId.value}-dep)`);
const modelSourceErrorText = computed(() => {
  if (props.modelSourceValid !== false) return '';
  const custom = (props.modelSourceError ?? '').trim();
  return custom || cd.value.cdeModelSourceInvalid;
});
const WORLD_HALF = 100000;
const WORLD_SIZE = WORLD_HALF * 2;

/** fit / 原点：扣除浮在视口上的 HUD、侧栏，避免自动排版后内容仍被底部控件遮挡 */
const VIEWPORT_FIT_MARGIN = { top: 10, bottom: 108, left: 10, right: 16 } as const;

const viewportRef = ref<HTMLElement | null>(null);
const state = reactive<ClassDiagramState>({ classes: [], links: [] });
const positions = reactive<ClassPositions>({});
const folded = reactive<Record<string, boolean>>({});
const edgeVisibility = reactive<ClassDiagramEdgeVisibility>({ inherit: true, association: true });
const lastSynced = ref('');

const scale = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;

/** 多选：类 id 列表 */
const selectedIds = ref<string[]>([]);
const ctx = reactive({ open: false, x: 0, y: 0, classId: '' as string });
const addCtx = reactive({ open: false, x: 0, y: 0 });
const classSearch = ref('');
const customClassName = ref('');
const classSearchWarn = ref('');
const customClassWarn = ref('');
type DragState = {
  primaryId: string;
  ox: number;
  oy: number;
  snapshots: Record<string, { x: number; y: number }>;
};
const drag = ref<DragState | null>(null);

/** 框选（世界坐标） */
const marquee = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

function isClassSelected(id: string): boolean {
  return selectedIds.value.includes(id);
}

const marqueeNorm = computed(() => {
  const mq = marquee.value;
  if (!mq) return null;
  return {
    x: Math.min(mq.x0, mq.x1),
    y: Math.min(mq.y0, mq.y1),
    w: Math.abs(mq.x1 - mq.x0),
    h: Math.abs(mq.y1 - mq.y0),
  };
});

const shortcutsOpen = ref(false);
const visibilityOpen = ref(false);
type LayoutBeautyMode = 'fast' | 'balanced' | 'polish';
const layoutBeautyMode = ref<LayoutBeautyMode>('balanced');
const layoutBeautyLabel = computed(() =>
  layoutBeautyMode.value === 'fast'
    ? cd.value.cdeLayoutBeautyFast
    : layoutBeautyMode.value === 'polish'
      ? cd.value.cdeLayoutBeautyPolish
      : cd.value.cdeLayoutBeautyBalanced,
);

const inheritDrag = ref<{ fromId: string } | null>(null);
const tempInheritLine = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
const associationDrag = ref<{ fromId: string; sectionIndex: number; lineIndex: number; anchor: 'left' | 'right' } | null>(null);
const tempAssociationLine = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
const dependencyDrag = ref<{ fromId: string } | null>(null);
const tempDependencyLine = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
const selectedEdgeId = ref<string | null>(null);
const selectedInheritHandleClassId = ref<string | null>(null);
const edgeCtx = reactive({ open: false, x: 0, y: 0, edgeId: '' as string });
const edgeEditor = reactive({ open: false, x: 0, y: 0, edgeId: '' as string });
const associationAnchorByEdge = reactive<Record<string, { sectionIndex: number; lineIndex: number }>>({});
const edgeRenderById = reactive<Record<string, 'straight' | 'orthogonal' | 'curve'>>({});

function loadFromPayload(payload: string): void {
  const raw = (payload ?? '').trim();
  if (!raw) {
    state.classes.splice(0, state.classes.length);
    state.links.splice(0, state.links.length);
    Object.keys(positions).forEach((k) => delete positions[k]);
    Object.keys(folded).forEach((k) => delete folded[k]);
    edgeVisibility.inherit = true;
    edgeVisibility.association = true;
    Object.keys(associationAnchorByEdge).forEach((k) => delete associationAnchorByEdge[k]);
    Object.keys(edgeRenderById).forEach((k) => delete edgeRenderById[k]);
    lastSynced.value = payload;
    return;
  }
  const { state: s, positions: p, folded: f, edgeVisibility: ev } = parseViewPayloadClassDiagram(payload);
  state.classes.splice(0, state.classes.length, ...s.classes);
  const strictLinks = s.links.filter((l) => {
    if (l.kind !== 'association') return true;
    const sec = l.fromSlotSection;
    const nm = (l.fromSlotName ?? '').trim();
    return (sec === 'members' || sec === 'properties') && !!nm;
  });
  state.links.splice(0, state.links.length, ...strictLinks);
  Object.keys(positions).forEach((k) => delete positions[k]);
  Object.assign(positions, p);
  Object.keys(folded).forEach((k) => delete folded[k]);
  Object.assign(folded, f);
  edgeVisibility.inherit = ev.inherit;
  edgeVisibility.association = ev.association;
  Object.keys(associationAnchorByEdge).forEach((k) => delete associationAnchorByEdge[k]);
  Object.keys(edgeRenderById).forEach((k) => delete edgeRenderById[k]);
  normalizeClassIdentityFromModel(false);
  normalizeDuplicateClassIds(false);
  collapseOverlappingDuplicateClasses(false);
  lastSynced.value = payload;
}

function normalizeClassIdentityFromModel(emitPayload: boolean): void {
  const rows = props.codespaceClasses ?? [];
  if (!rows.length || !state.classes.length) return;
  const byId = new Map(rows.map((r) => [r.classId, r] as const));
  const byName = new Map(rows.map((r) => [r.className, r] as const));
  const bySlug = new Map(rows.map((r) => [slug(r.className), r] as const));
  let changed = false;
  const taken = new Set(state.classes.map((c) => c.id));
  for (const c of state.classes) {
    const hit = byId.get(c.id) ?? byName.get(c.name) ?? bySlug.get(slug(c.name));
    if (!hit) continue;
    const targetId = hit.classId;
    const targetName = hit.className;
    if (targetName && c.name !== targetName) {
      c.name = targetName;
      changed = true;
    }
    if (!targetId || c.id === targetId) continue;
    if (taken.has(targetId)) continue;
    const oldId = c.id;
    c.id = targetId;
    taken.delete(oldId);
    taken.add(targetId);
    if (positions[oldId]) {
      positions[targetId] = positions[oldId]!;
      delete positions[oldId];
    }
    if (folded[oldId] !== undefined) {
      folded[targetId] = folded[oldId]!;
      delete folded[oldId];
    }
    for (const l of state.links) {
      if (l.from === oldId) l.from = targetId;
      if (l.to === oldId) l.to = targetId;
    }
    changed = true;
  }
  if (changed && emitPayload) pushPayload();
}

function normalizeDuplicateClassIds(emitPayload: boolean): void {
  if (!state.classes.length) return;
  const seen = new Set<string>();
  let changed = false;
  for (const c of state.classes) {
    const base = (c.id ?? '').trim() || slug(c.name || 'class');
    if (!seen.has(base)) {
      seen.add(base);
      if (!c.id) {
        c.id = base;
        changed = true;
      }
      continue;
    }
    let i = 2;
    let next = `${base}_${i}`;
    while (seen.has(next)) {
      i++;
      next = `${base}_${i}`;
    }
    const oldId = c.id;
    c.id = next;
    seen.add(next);
    changed = true;
    const p = positions[oldId];
    if (p) positions[next] = { x: p.x + 36 * (i - 1), y: p.y + 24 * (i - 1) };
    if (folded[oldId] !== undefined && folded[next] === undefined) folded[next] = folded[oldId]!;
  }
  if (changed && emitPayload) pushPayload();
}

function collapseOverlappingDuplicateClasses(emitPayload: boolean): void {
  if (state.classes.length < 2) return;
  const sameName = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();
  const removed = new Set<string>();
  const redirect = new Map<string, string>();
  let changed = false;
  for (let i = 0; i < state.classes.length; i++) {
    const a = state.classes[i]!;
    if (removed.has(a.id)) continue;
    const pa = positions[a.id];
    if (!pa) continue;
    for (let j = i + 1; j < state.classes.length; j++) {
      const b = state.classes[j]!;
      if (removed.has(b.id)) continue;
      if (!sameName(a.name ?? a.id, b.name ?? b.id)) continue;
      const pb = positions[b.id];
      if (!pb) continue;
      const closeX = Math.abs(pa.x - pb.x) <= 8;
      const closeY = Math.abs(pa.y - pb.y) <= 8;
      if (!closeX || !closeY) continue;
      removed.add(b.id);
      redirect.set(b.id, a.id);
      changed = true;
    }
  }
  if (!changed) return;
  for (const l of state.links) {
    const nf = redirect.get(l.from);
    const nt = redirect.get(l.to);
    if (nf) l.from = nf;
    if (nt) l.to = nt;
  }
  state.links = state.links.filter((l, idx, arr) => {
    if (l.from === l.to) return false;
    const key = `${l.kind}|${l.from}|${l.to}|${l.fromSlotSection ?? ''}|${l.fromSlotName ?? ''}`;
    return arr.findIndex((x) => `${x.kind}|${x.from}|${x.to}|${x.fromSlotSection ?? ''}|${x.fromSlotName ?? ''}` === key) === idx;
  });
  for (const oldId of removed) {
    delete positions[oldId];
    delete folded[oldId];
  }
  state.classes = state.classes.filter((c) => !removed.has(c.id));
  if (emitPayload) pushPayload();
}

function pushPayload(): void {
  const next = buildClassDiagramViewPayload(
    lastSynced.value,
    state,
    positions,
    { ...folded },
    { inherit: edgeVisibility.inherit, association: edgeVisibility.association },
  );
  lastSynced.value = next;
  emit('update:modelValue', next);
}

watch(
  () => props.modelValue,
  (md) => {
    if (md === lastSynced.value) return;
    loadFromPayload(md ?? '');
    selectedIds.value = [];
    ctx.open = false;
  },
);

watch(
  () => props.canvasId,
  () => {
    loadFromPayload(props.modelValue ?? '');
    resetView();
  },
);

watch(
  () => props.codespaceClasses,
  () => {
    normalizeClassIdentityFromModel(true);
    normalizeDuplicateClassIds(true);
    collapseOverlappingDuplicateClasses(true);
  },
  { deep: true },
);

function onMarqueePointerMove(e: PointerEvent): void {
  if (!marquee.value) return;
  const w = clientToWorld(e.clientX, e.clientY);
  marquee.value = { ...marquee.value, x1: w.x, y1: w.y };
}

function onMarqueePointerUp(e: PointerEvent): void {
  window.removeEventListener('pointermove', onMarqueePointerMove);
  window.removeEventListener('pointerup', onMarqueePointerUp);
  window.removeEventListener('pointercancel', onMarqueePointerUp);
  const mq = marquee.value;
  marquee.value = null;
  if (!mq) return;
  const x0 = Math.min(mq.x0, mq.x1);
  const x1 = Math.max(mq.x0, mq.x1);
  const y0 = Math.min(mq.y0, mq.y1);
  const y1 = Math.max(mq.y0, mq.y1);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const additive = e.ctrlKey || e.metaKey;
  if (dx < 4 && dy < 4) {
    if (!additive) selectedIds.value = [];
    return;
  }
  const hits: string[] = [];
  for (const c of state.classes) {
    const p = positions[c.id];
    if (!p) continue;
    const { w: cw, h: ch } = classBoxSize(c);
    const ix0 = p.x;
    const iy0 = p.y;
    const ix1 = p.x + cw;
    const iy1 = p.y + ch;
    if (ix1 >= x0 && ix0 <= x1 && iy1 >= y0 && iy0 <= y1) hits.push(c.id);
  }
  if (additive) {
    selectedIds.value = [...new Set([...selectedIds.value, ...hits])];
  } else {
    selectedIds.value = hits;
  }
}

function onSvgBackgroundPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return;
  e.preventDefault();
  edgeCtx.open = false;
  selectedEdgeId.value = null;
  selectedInheritHandleClassId.value = null;
  const w = clientToWorld(e.clientX, e.clientY);
  marquee.value = { x0: w.x, y0: w.y, x1: w.x, y1: w.y };
  window.addEventListener('pointermove', onMarqueePointerMove);
  window.addEventListener('pointerup', onMarqueePointerUp);
  window.addEventListener('pointercancel', onMarqueePointerUp);
}

function addNewClass(): void {
  if (layoutOnly.value) return;
  const el = viewportRef.value;
  if (el) {
    const r = el.getBoundingClientRect();
    const p = clampAddCtxPosition(r.left + 24, r.top + 24);
    addCtx.x = p.x;
    addCtx.y = p.y;
  }
  addCtx.open = true;
  customClassName.value = '';
  ctx.open = false;
}

function ensureUniqueClassId(baseId: string): string {
  const ids = new Set(state.classes.map((c) => c.id));
  if (!ids.has(baseId)) return baseId;
  let i = 2;
  while (ids.has(`${baseId}_${i}`)) i += 1;
  return `${baseId}_${i}`;
}

const SEARCH_ALLOWED_RE = /^[A-Za-z0-9_.\s]*$/;
const CLASS_NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const ADD_CTX_MARGIN = 12;
const ADD_CTX_MAX_WIDTH = 460;
const ADD_CTX_MAX_HEIGHT = 520;

function clampAddCtxPosition(x: number, y: number): { x: number; y: number } {
  const vw = Math.max(window.innerWidth || 0, 0);
  const vh = Math.max(window.innerHeight || 0, 0);
  const panelW = Math.min(ADD_CTX_MAX_WIDTH, Math.max(vw - ADD_CTX_MARGIN * 2, 220));
  const panelH = Math.min(ADD_CTX_MAX_HEIGHT, Math.max(vh - ADD_CTX_MARGIN * 2, 220));
  const maxX = Math.max(ADD_CTX_MARGIN, vw - panelW - ADD_CTX_MARGIN);
  const maxY = Math.max(ADD_CTX_MARGIN, vh - panelH - ADD_CTX_MARGIN);
  return {
    x: Math.min(Math.max(x, ADD_CTX_MARGIN), maxX),
    y: Math.min(Math.max(y, ADD_CTX_MARGIN), maxY),
  };
}

/** Root namespace is `""` in model; omit empty segments so we never get `.Core` → `[mod]..Core` when joining. */
function codespaceNsChain(namespacePath: string[]): string {
  return (namespacePath ?? []).map((s) => (s ?? '').trim()).filter(Boolean).join('.');
}

function onClassSearchInput(ev: Event): void {
  const raw = (ev.target as HTMLInputElement).value;
  classSearch.value = raw;
  classSearchWarn.value = SEARCH_ALLOWED_RE.test(raw)
    ? ''
    : locale.value === 'en'
      ? 'Only letters, numbers, underscores, dots, and spaces are allowed.'
      : '仅允许英文、数字、下划线、点与空格';
}

function onCustomClassInput(ev: Event): void {
  const raw = (ev.target as HTMLInputElement).value;
  customClassName.value = raw;
  customClassWarn.value =
    raw.trim() === '' || CLASS_NAME_RE.test(raw.trim())
      ? ''
      : locale.value === 'en'
        ? 'Class name must start with a letter and can contain letters, numbers, or underscores.'
        : '类名仅允许英文开头，后续可含英文/数字/下划线';
}

const codespaceClassRows = computed(() => {
  const q = classSearch.value.trim().toLowerCase();
  const src = props.codespaceClasses ?? [];
  const rows = src
    .map((it) => {
      const ns = codespaceNsChain(it.namespacePath);
      const pathLabel = ns ? `${it.moduleName}.${ns}` : it.moduleName;
      const searchKey = `${it.moduleId}/${ns}/${it.classId}/${it.className}`.toLowerCase();
      const dedupeKey = `${it.moduleId}/${ns}/${it.className}`.toLowerCase();
      return { ...it, ns, pathLabel, searchKey, dedupeKey };
    })
    .filter((r) => !q || r.searchKey.includes(q))
    .sort((a, b) => {
      const pa = `${a.moduleName}.${a.ns}`;
      const pb = `${b.moduleName}.${b.ns}`;
      return pa === pb ? a.className.localeCompare(b.className) : pa.localeCompare(pb);
    });
  const uniq = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!uniq.has(r.dedupeKey)) uniq.set(r.dedupeKey, r);
  }
  return [...uniq.values()];
});

type AddCtxHierarchyRow =
  | { kind: 'module'; key: string; label: string; level: number }
  | { kind: 'namespace'; key: string; label: string; level: number }
  | { kind: 'class'; key: string; label: string; level: number; item: (typeof codespaceClassRows.value)[number] };

const codespaceHierarchyRows = computed<AddCtxHierarchyRow[]>(() => {
  const byModule = new Map<string, (typeof codespaceClassRows.value)>();
  for (const row of codespaceClassRows.value) {
    const arr = byModule.get(row.moduleId) ?? [];
    arr.push(row);
    byModule.set(row.moduleId, arr);
  }
  const out: AddCtxHierarchyRow[] = [];
  const modules = [...byModule.entries()]
    .map(([moduleId, rows]) => ({
      moduleId,
      moduleName: rows[0]?.moduleName ?? moduleId,
      rows,
    }))
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  for (const mod of modules) {
    out.push({ kind: 'module', key: `m:${mod.moduleId}`, label: mod.moduleName, level: 0 });
    const nsSet = new Set<string>();
    for (const row of mod.rows) {
      let acc: string[] = [];
      for (const seg of row.namespacePath) {
        if (!seg) continue;
        acc = [...acc, seg];
        nsSet.add(acc.join('.'));
      }
    }
    const namespaces = [...nsSet].sort((a, b) => a.localeCompare(b));
    for (const ns of namespaces) {
      const level = ns.split('.').length;
      out.push({ kind: 'namespace', key: `n:${mod.moduleId}:${ns}`, label: ns.split('.').pop() ?? ns, level });
      const classes = mod.rows
        .filter((r) => r.namespacePath.filter(Boolean).join('.') === ns)
        .sort((a, b) => a.className.localeCompare(b.className));
      for (const row of classes) {
        out.push({
          kind: 'class',
          key: `c:${row.moduleId}:${row.namespacePath.join('.')}:${row.classId}`,
          label: row.className,
          level: level + 1,
          item: row,
        });
      }
    }
    const rootClasses = mod.rows
      .filter((r) => r.namespacePath.filter(Boolean).length === 0)
      .sort((a, b) => a.className.localeCompare(b.className));
    for (const row of rootClasses) {
      out.push({
        kind: 'class',
        key: `c:${row.moduleId}::${row.classId}`,
        label: row.className,
        level: 1,
        item: row,
      });
    }
  }
  return out;
});

const boundClassKeySet = computed(() => {
  const s = new Set<string>();
  for (const r of props.codespaceClasses ?? []) {
    const nameSlug = slug(r.className);
    s.add(`id:${r.classId}`);
    s.add(`name:${r.className}`);
    s.add(`slug:${nameSlug}`);
  }
  return s;
});

const classDisplayNameMap = computed(() => {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const r of props.codespaceClasses ?? []) {
    const ns = codespaceNsChain(r.namespacePath);
    const moduleLabel = (r.moduleName ?? '').trim() || r.moduleId;
    const full = ns ? `[${moduleLabel}].${ns}.${r.className}` : `[${moduleLabel}].${r.className}`;
    if (!byId.has(r.classId)) byId.set(r.classId, full);
    if (!byName.has(r.className)) byName.set(r.className, full);
  }
  return { byId, byName };
});

function nameTail(v: string): string {
  const t = (v ?? '').trim();
  if (!t) return '';
  const i = t.lastIndexOf('.');
  return i >= 0 ? t.slice(i + 1).trim() : t;
}

const codespaceMembersByKey = computed(() => {
  const byId = new Map<string, { attrs: string[]; props: string[]; enums: string[]; meths: string[] }>();
  const byIdSlug = new Map<string, { attrs: string[]; props: string[]; enums: string[]; meths: string[] }>();
  const byName = new Map<string, { attrs: string[]; props: string[]; enums: string[]; meths: string[] }>();
  const byNameSlug = new Map<string, { attrs: string[]; props: string[]; enums: string[]; meths: string[] }>();
  const byFullName = new Map<string, { attrs: string[]; props: string[]; enums: string[]; meths: string[] }>();
  const byTailName = new Map<string, { attrs: string[]; props: string[]; enums: string[]; meths: string[] }>();
  for (const r of props.codespaceClasses ?? []) {
    const ns = codespaceNsChain(r.namespacePath);
    const full = ns ? `${ns}.${r.className}` : r.className;
    const val = {
      attrs: r.attributeLines ?? [],
      props: r.propertyLines ?? [],
      enums: r.enumLiteralLines ?? [],
      meths: r.methodLines ?? [],
    };
    if (!byId.has(r.classId)) byId.set(r.classId, val);
    if (!byIdSlug.has(slug(r.classId))) byIdSlug.set(slug(r.classId), val);
    if (!byName.has(r.className)) byName.set(r.className, val);
    if (!byNameSlug.has(slug(r.className))) byNameSlug.set(slug(r.className), val);
    if (!byFullName.has(full)) byFullName.set(full, val);
    const tail = nameTail(full);
    if (tail && !byTailName.has(tail)) byTailName.set(tail, val);
  }
  return { byId, byIdSlug, byName, byNameSlug, byFullName, byTailName };
});

function resolveCodespaceMembers(c: ClassDef):
  | { attrs: string[]; props: string[]; enums: string[]; meths: string[] }
  | undefined {
  const id = (c.id ?? '').trim();
  const name = (c.name ?? '').trim();
  const tail = nameTail(name);
  const maps = codespaceMembersByKey.value;
  return (
    maps.byId.get(id) ??
    maps.byIdSlug.get(slug(id)) ??
    maps.byName.get(name) ??
    maps.byFullName.get(name) ??
    maps.byNameSlug.get(slug(name)) ??
    (tail ? maps.byName.get(tail) : undefined) ??
    (tail ? maps.byTailName.get(tail) : undefined)
  );
}

function effectiveAttributes(c: ClassDef): string[] {
  const fromModel = resolveCodespaceMembers(c)?.attrs;
  if (fromModel && fromModel.length) return fromModel;
  const cc = c as ClassDefCompat;
  return cc.attributes ?? c.attrs ?? [];
}

function effectiveProperties(c: ClassDef): string[] {
  const fromModel = resolveCodespaceMembers(c)?.props;
  if (fromModel && fromModel.length) return fromModel;
  return [];
}

function effectiveMethods(c: ClassDef): string[] {
  const fromModel = resolveCodespaceMembers(c)?.meths;
  if (fromModel && fromModel.length) return fromModel;
  const cc = c as ClassDefCompat;
  return cc.methods ?? c.meth ?? [];
}

function effectiveEnumLiterals(c: ClassDef): string[] {
  const fromModel = resolveCodespaceMembers(c)?.enums;
  if (fromModel && fromModel.length) return fromModel;
  return [];
}

const EMPTY_MEMBER_LINE = '-';

function displayAttributes(c: ClassDef): string[] {
  const lines = effectiveAttributes(c);
  return lines.length ? lines : [EMPTY_MEMBER_LINE];
}

function displayProperties(c: ClassDef): string[] {
  const lines = effectiveProperties(c);
  return lines.length ? lines : [EMPTY_MEMBER_LINE];
}

function displayEnumLiterals(c: ClassDef): string[] {
  const lines = effectiveEnumLiterals(c);
  return lines.length ? lines : [EMPTY_MEMBER_LINE];
}

function displayMethods(c: ClassDef): string[] {
  const lines = effectiveMethods(c);
  return lines.length ? lines : [EMPTY_MEMBER_LINE];
}

type PreviewSection = { label: string; lines: string[] };
const PREVIEW_LINE_HEIGHT = 12;
const PREVIEW_TOP_PAD = 8;
const PREVIEW_BOTTOM_PAD = 8;
const PREVIEW_LABEL_TO_LINES_GAP = 2;
const PREVIEW_SECTION_GAP = 4;
const PREVIEW_LABEL_X = 10;
const PREVIEW_CONTENT_X = 34; // visual indent for section content

function previewSections(c: ClassDef): PreviewSection[] {
  return [
    { label: 'MEMB', lines: displayAttributes(c) },
    { label: 'PROP', lines: displayProperties(c) },
    { label: 'ENUM', lines: displayEnumLiterals(c) },
    { label: 'METH', lines: displayMethods(c) },
  ];
}

function previewSectionHeight(sec: PreviewSection): number {
  return PREVIEW_LINE_HEIGHT + PREVIEW_LABEL_TO_LINES_GAP + sec.lines.length * PREVIEW_LINE_HEIGHT + PREVIEW_SECTION_GAP;
}

function previewBaseY(c: ClassDef): number {
  return classDiagramHeaderHeight(c) + PREVIEW_TOP_PAD;
}

function previewSectionStartY(c: ClassDef, index: number): number {
  let y = previewBaseY(c);
  const secs = previewSections(c);
  for (let i = 0; i < index; i++) y += previewSectionHeight(secs[i]!);
  return y;
}

function previewSectionLabelY(c: ClassDef, index: number): number {
  return previewSectionStartY(c, index);
}

function previewSectionLineY(c: ClassDef, index: number, lineIndex: number): number {
  return previewSectionStartY(c, index) + PREVIEW_LINE_HEIGHT + PREVIEW_LABEL_TO_LINES_GAP + lineIndex * PREVIEW_LINE_HEIGHT;
}

function previewIndentedLine(line: string): string {
  return line;
}

function rightHandleRows(c: ClassDef): Array<{ key: string; sectionIndex: number; lineIndex: number }> {
  const out: Array<{ key: string; sectionIndex: number; lineIndex: number }> = [];
  const memb = effectiveAttributes(c);
  for (let i = 0; i < memb.length; i++) out.push({ key: `m-${i}`, sectionIndex: 0, lineIndex: i });
  const prop = effectiveProperties(c);
  for (let i = 0; i < prop.length; i++) out.push({ key: `p-${i}`, sectionIndex: 1, lineIndex: i });
  return out;
}

function extractSlotName(rawLine: string): string {
  const s = String(rawLine ?? '').trim();
  if (!s || s === '-') return '';
  // Property preview line format is usually:
  // "private _field -> propertyName: Type (get/set)".
  // For slot binding we must use the property name on the right side of "->".
  const rhs = s.includes('->') ? s.split('->').slice(1).join('->').trim() : s;
  const noLead = rhs.replace(/^[+\-#~$]+/, '').trim();
  const m = noLead.match(/[A-Za-z_][A-Za-z0-9_]*/);
  return m ? m[0]! : '';
}

function fromSlotMeta(c: ClassDef, sectionIndex: number, lineIndex: number): {
  fromSlotSection: 'members' | 'properties';
  fromSlotName: string;
} | null {
  if (sectionIndex === 0) {
    const line = effectiveAttributes(c)[lineIndex] ?? '';
    const name = extractSlotName(line);
    return name ? { fromSlotSection: 'members', fromSlotName: name } : null;
  }
  if (sectionIndex === 1) {
    const line = effectiveProperties(c)[lineIndex] ?? '';
    const name = extractSlotName(line);
    return name ? { fromSlotSection: 'properties', fromSlotName: name } : null;
  }
  return null;
}

function rightHandleTipY(c: ClassDef, h: { sectionIndex: number; lineIndex: number }): number {
  return previewSectionLineY(c, h.sectionIndex, h.lineIndex) - 4;
}

function handleRowBySlotMeta(
  c: ClassDef,
  section: 'members' | 'properties' | undefined,
  slotName: string | undefined,
): { sectionIndex: number; lineIndex: number } | null {
  const target = (slotName ?? '').trim();
  if (!target) return null;
  const lower = target.toLowerCase();
  if (section === 'members') {
    const list = effectiveAttributes(c);
    for (let i = 0; i < list.length; i++) {
      if (extractSlotName(list[i] ?? '').toLowerCase() === lower) return { sectionIndex: 0, lineIndex: i };
    }
    return null;
  }
  if (section === 'properties') {
    const list = effectiveProperties(c);
    for (let i = 0; i < list.length; i++) {
      if (extractSlotName(list[i] ?? '').toLowerCase() === lower) return { sectionIndex: 1, lineIndex: i };
    }
    return null;
  }
  return null;
}

function associationSourceTip(
  edgeId: string,
  edgeMeta: { fromSlotSection?: 'members' | 'properties'; fromSlotName?: string },
  fromClass: ClassDef,
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
): { x: number; y: number } {
  const rows = rightHandleRows(fromClass);
  if (!rows.length) return { x: fromPos.x + 264, y: fromPos.y + 18 };
  const byMeta = handleRowBySlotMeta(fromClass, edgeMeta.fromSlotSection, edgeMeta.fromSlotName);
  if (byMeta) {
    associationAnchorByEdge[edgeId] = byMeta;
    return { x: fromPos.x + 264, y: fromPos.y + rightHandleTipY(fromClass, byMeta) };
  }
  const pinned = associationAnchorByEdge[edgeId];
  if (pinned) {
    const found = rows.find((r) => r.sectionIndex === pinned.sectionIndex && r.lineIndex === pinned.lineIndex);
    if (found) {
      return { x: fromPos.x + 264, y: fromPos.y + rightHandleTipY(fromClass, found) };
    }
  }
  // Strict row binding: no metadata means no row-level source anchor.
  return { x: fromPos.x + 264, y: fromPos.y + 18 };
}

function classBoxSize(c: ClassDef): { w: number; h: number } {
  const w = 248;
  const h =
    classDiagramHeaderHeight(c) +
    PREVIEW_TOP_PAD +
    previewSections(c).reduce((sum, sec) => sum + previewSectionHeight(sec), 0) +
    PREVIEW_BOTTOM_PAD;
  return { w, h };
}

/** 与 `classBoxSize` 一致（含 codespace 预览成员），供 fit / 居中；避免与仅 JSON 的 diagramBounds 不一致导致裁切 */
function canvasDiagramBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!state.classes.length) return { minX: -240, minY: -160, maxX: 240, maxY: 160 };
  const inheritHandleAbove = 16;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const c of state.classes) {
    const p = positions[c.id] ?? { x: 0, y: 0 };
    const { w, h } = classBoxSize(c);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y - inheritHandleAbove);
    maxX = Math.max(maxX, p.x + w);
    /* 多重性标签、线宽与箭头 marker 会略超出类框底边 */
    maxY = Math.max(maxY, p.y + h + 14);
  }
  return { minX, minY, maxX, maxY };
}

function classDisplayLabel(c: ClassDef): string {
  return (
    classDisplayNameMap.value.byId.get(c.id) ??
    classDisplayNameMap.value.byName.get(c.name) ??
    c.name
  );
}

function classExistsInBoundModel(c: ClassDef): boolean {
  if (!props.codespaceClasses || props.codespaceClasses.length === 0) return true;
  return (
    boundClassKeySet.value.has(`id:${c.id}`) ||
    boundClassKeySet.value.has(`name:${c.name}`) ||
    boundClassKeySet.value.has(`slug:${slug(c.name)}`)
  );
}

function classOutOfBoundModel(c: ClassDef): boolean {
  return !classExistsInBoundModel(c);
}

function isClassAlreadyAdded(row: (typeof codespaceClassRows.value)[number]): boolean {
  const rowClassId = String(row.classId ?? '').trim();
  return state.classes.some((c) => {
    if (rowClassId) return c.id === rowClassId;
    return c.id === slug(row.className);
  });
}

function treeRowsForClassifierIds(ids: string[]): CodespaceClassTreeItem[] {
  const src = props.codespaceClasses ?? [];
  const out: CodespaceClassTreeItem[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (!id) continue;
    const r = src.find((x) => x.classId === id);
    if (!r || seen.has(r.classId)) continue;
    seen.add(r.classId);
    out.push(r);
  }
  return out;
}

function labelForCodespaceTreeRow(row: CodespaceClassTreeItem): string {
  return (
    classDisplayNameMap.value.byId.get(row.classId) ??
    `[${row.moduleName}].${codespaceNsChain(row.namespacePath)}.${row.className}`
  );
}

const canUseRelatedTypesMenu = computed(
  () =>
    !layoutOnly.value &&
    props.modelSourceValid !== false &&
    !!(props.codespaceResolveMarkdown ?? '').trim() &&
    (props.modelRefs ?? []).length > 0,
);

const ctxRelatedOneHopPack = computed(() => {
  if (!ctx.open || !canUseRelatedTypesMenu.value) return null;
  const c = state.classes.find((x) => x.id === ctx.classId);
  if (!c) return null;
  return listOneHopRelatedClassifierIdsForDiagramClass(
    (props.codespaceResolveMarkdown ?? '').trim(),
    props.modelRefs ?? [],
    c.id,
    (c.name ?? '').trim(),
  );
});

const ctxRelatedInheritanceRows = computed(() => {
  const pack = ctxRelatedOneHopPack.value;
  if (!pack) return [];
  return treeRowsForClassifierIds(pack.inheritanceIds).filter((r) => !isClassAlreadyAdded(r));
});

const ctxRelatedAssociationRows = computed(() => {
  const pack = ctxRelatedOneHopPack.value;
  if (!pack) return [];
  return treeRowsForClassifierIds(pack.associationIds).filter((r) => !isClassAlreadyAdded(r));
});

function addRelatedClassifierFromTree(row: CodespaceClassTreeItem, kind: 'inherit' | 'association'): void {
  if (layoutOnly.value) return;
  const anchorId = ctx.classId;
  const anchor = state.classes.find((x) => x.id === anchorId);
  if (!anchor) return;

  const rowClassId = String(row.classId ?? '').trim();
  const existingPeer = state.classes.find((cl) => {
    if (rowClassId) return cl.id === rowClassId;
    return cl.id === slug(row.className);
  });

  let peerId: string;
  if (existingPeer) {
    peerId = existingPeer.id;
  } else {
    peerId = ensureUniqueClassId(row.classId || slug(row.className));
    const ap = positions[anchorId] ?? { x: 120, y: 120 };
    const offsetX = kind === 'inherit' ? -280 : 280;
    state.classes.push({
      id: peerId,
      name: row.className,
      attrs: [],
      meth: [],
    });
    positions[peerId] = { x: ap.x + offsetX, y: ap.y };
  }

  const linkKind = kind === 'inherit' ? 'inherit' : 'association';
  const exists = state.links.some(
    (l) =>
      l.kind === linkKind &&
      ((l.from === anchorId && l.to === peerId) ||
        (linkKind === 'association' && l.from === peerId && l.to === anchorId)),
  );
  if (!exists) {
    const lid =
      linkKind === 'inherit' ? `inh-${anchorId}-${peerId}` : `asc-${anchorId}-${peerId}`;
    state.links.push({ id: lid, from: anchorId, to: peerId, kind: linkKind });
  }

  selectedIds.value = [peerId];
  ctx.open = false;
  pushPayload();
}

function addClassFromCodespace(row: (typeof codespaceClassRows.value)[number]): void {
  if (layoutOnly.value) return;
  const rowClassId = String(row.classId ?? '').trim();
  const existing = state.classes.find((c) => {
    if (rowClassId) return c.id === rowClassId;
    return c.id === slug(row.className);
  });
  if (existing) {
    selectedIds.value = [existing.id];
    addCtx.open = false;
    return;
  }
  const id = ensureUniqueClassId(row.classId || slug(row.className));
  const { w: vw, h: vh } = getViewportSize();
  const cx = (vw / 2 - panX.value) / scale.value;
  const cy = (vh / 2 - panY.value) / scale.value;
  state.classes.push({
    id,
    name: row.className,
    attrs: [],
    meth: [],
  });
  positions[id] = { x: cx - 124, y: cy - 50 };
  selectedIds.value = [id];
  addCtx.open = false;
  pushPayload();
}

function addCustomClassAndSyncModel(): void {
  if (layoutOnly.value) return;
  const raw = customClassName.value.trim();
  if (!raw) return;
  if (!CLASS_NAME_RE.test(raw)) {
    customClassWarn.value =
      locale.value === 'en'
        ? 'Class name must start with a letter and can contain letters, numbers, or underscores.'
        : '类名仅允许英文开头，后续可含英文/数字/下划线';
    return;
  }
  const desiredId = slug(raw);
  const existing = state.classes.find((c) => c.id === desiredId || slug(c.name) === desiredId);
  if (existing) {
    selectedIds.value = [existing.id];
    addCtx.open = false;
    return;
  }
  const id = ensureUniqueClassId(desiredId);
  const { w: vw, h: vh } = getViewportSize();
  const cx = (vw / 2 - panX.value) / scale.value;
  const cy = (vh / 2 - panY.value) / scale.value;
  state.classes.push({
    id,
    name: raw,
    attrs: [],
    meth: [],
  });
  positions[id] = { x: cx - 124, y: cy - 50 };
  selectedIds.value = [id];
  emit('createMissingClassifier', { classId: id, className: raw });
  customClassName.value = '';
  addCtx.open = false;
  pushPayload();
}

onMounted(() => {
  loadFromPayload(props.modelValue ?? '');
  // Default behavior: run one auto layout when the canvas is opened.
  nextTick(() => {
    autoLayoutClasses();
  });
  window.addEventListener('click', onWindowClick);
  window.addEventListener('pointermove', onGlobalPointerMove);
  window.addEventListener('pointerup', onGlobalPointerUp);
});
onUnmounted(() => {
  window.removeEventListener('click', onWindowClick);
  window.removeEventListener('pointermove', onGlobalPointerMove);
  window.removeEventListener('pointerup', onGlobalPointerUp);
  window.removeEventListener('pointermove', onMarqueePointerMove);
  window.removeEventListener('pointerup', onMarqueePointerUp);
  window.removeEventListener('pointercancel', onMarqueePointerUp);
});

function onWindowClick(e: MouseEvent): void {
  const t = e.target as Node;
  if (ctx.open && viewportRef.value && !viewportRef.value.querySelector('.cde-ctx')?.contains(t)) {
    ctx.open = false;
  }
  if (edgeCtx.open && viewportRef.value && !viewportRef.value.querySelector('.cde-edgectx')?.contains(t)) {
    edgeCtx.open = false;
  }
  if (edgeEditor.open && viewportRef.value && !viewportRef.value.querySelector('.cde-edgeedit')?.contains(t)) {
    edgeEditor.open = false;
  }
  if (addCtx.open && viewportRef.value && !viewportRef.value.querySelector('.cde-addctx')?.contains(t)) {
    addCtx.open = false;
  }
}

function isDarkTheme(): boolean {
  return document.documentElement.dataset.theme === 'dark';
}

/** 按 UML 构造型区分主色（无构造型时用序号色相） */
function classBodyFill(c: ClassDef, index: number): string {
  const s = (((c as ClassDefCompat).stereotype ?? '') as string).toLowerCase();
  if (s === 'interface') return isDarkTheme() ? '#1e3a2f' : '#dcfce7';
  if (s === 'abstract' || s.includes('abstract')) return isDarkTheme() ? '#1e2a3e' : '#dbeafe';
  if (s === 'enumeration' || s === 'enum') return isDarkTheme() ? '#3b2a4a' : '#fae8ff';
  if (s === 'final') return isDarkTheme() ? '#3a2a1a' : '#ffedd5';
  if (s === 'static' || s === 'utility') return isDarkTheme() ? '#2a2d35' : '#e2e8f0';
  const h = (index * 47) % 360;
  return `hsl(${h}, ${isDarkTheme() ? 35 : 58}%, ${isDarkTheme() ? 22 : 88}%)`;
}

function classBodyStroke(c: ClassDef, index: number): string {
  const s = (((c as ClassDefCompat).stereotype ?? '') as string).toLowerCase();
  if (s === 'interface') return isDarkTheme() ? '#4ade80' : '#166534';
  if (s === 'abstract' || s.includes('abstract')) return isDarkTheme() ? '#60a5fa' : '#1d4ed8';
  if (s === 'enumeration' || s === 'enum') return isDarkTheme() ? '#c084fc' : '#7e22ce';
  if (s === 'final') return isDarkTheme() ? '#fb923c' : '#c2410c';
  if (s === 'static' || s === 'utility') return isDarkTheme() ? '#94a3b8' : '#475569';
  const h = (index * 47) % 360;
  return `hsl(${h}, 42%, ${isDarkTheme() ? 48 : 42}%)`;
}

function classAttrBg(c: ClassDef, index: number): string {
  const s = (((c as ClassDefCompat).stereotype ?? '') as string).toLowerCase();
  if (s === 'interface') return isDarkTheme() ? 'rgba(34, 197, 94, 0.12)' : 'hsl(142, 42%, 96%)';
  if (s === 'abstract' || s.includes('abstract')) return isDarkTheme() ? 'rgba(59, 130, 246, 0.12)' : 'hsl(214, 42%, 96%)';
  const h = (index * 47) % 360;
  return `hsl(${h}, ${isDarkTheme() ? 28 : 42}%, ${isDarkTheme() ? 18 : 96}%)`;
}

function classMethBg(c: ClassDef, index: number): string {
  const s = (((c as ClassDefCompat).stereotype ?? '') as string).toLowerCase();
  if (s === 'interface') return isDarkTheme() ? 'rgba(16, 185, 129, 0.1)' : 'hsl(150, 38%, 95%)';
  if (s === 'abstract' || s.includes('abstract')) return isDarkTheme() ? 'rgba(96, 165, 250, 0.1)' : 'hsl(220, 48%, 95%)';
  const h = (index * 47) % 360;
  return `hsl(${(h + 12) % 360}, ${isDarkTheme() ? 30 : 48}%, ${isDarkTheme() ? 16 : 95}%)`;
}

function classStereotype(c: ClassDef): string {
  return (((c as ClassDefCompat).stereotype ?? '') as string).trim();
}

function worldTransform(): Record<string, string> {
  return {
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
    transformOrigin: '0 0',
  };
}

function clientToWorld(clientX: number, clientY: number): { x: number; y: number } {
  const el = viewportRef.value;
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  return { x: (sx - panX.value) / scale.value, y: (sy - panY.value) / scale.value };
}

function onWheel(e: WheelEvent): void {
  if (!viewportRef.value) return;
  const rect = viewportRef.value.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const prev = scale.value;
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const next = Math.min(4, Math.max(0.25, prev + delta));
  if (next === prev) return;
  e.preventDefault();
  const k = next / prev;
  panX.value = cx - k * (cx - panX.value);
  panY.value = cy - k * (cy - panY.value);
  scale.value = next;
}

function onViewportPointerDown(e: PointerEvent): void {
  if (e.button !== 1) return;
  e.preventDefault();
  isPanning.value = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panOriginX = panX.value;
  panOriginY = panY.value;
  viewportRef.value?.setPointerCapture(e.pointerId);
}

function onViewportPointerMove(e: PointerEvent): void {
  if (!isPanning.value) return;
  panX.value = panOriginX + (e.clientX - panStartX);
  panY.value = panOriginY + (e.clientY - panStartY);
}

function onViewportPointerUp(e: PointerEvent): void {
  if (!isPanning.value) return;
  isPanning.value = false;
  try {
    viewportRef.value?.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function getViewportSize(): { w: number; h: number } {
  const el = viewportRef.value;
  if (!el) return { w: 800, h: 600 };
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

/** 用于「适应 / 居中」的可视区域（全矩形减去 HUD 等浮层占位） */
function getViewportFitBox(): { w: number; h: number; cx: number; cy: number } {
  const { w: fw, h: fh } = getViewportSize();
  const { top, bottom, left, right } = VIEWPORT_FIT_MARGIN;
  const w = Math.max(120, fw - left - right);
  const h = Math.max(120, fh - top - bottom);
  return { w, h, cx: left + w / 2, cy: top + h / 2 };
}

function fitAll(): void {
  const b = canvasDiagramBounds();
  const pad = 48;
  const bw = b.maxX - b.minX + pad * 2;
  const bh = b.maxY - b.minY + pad * 2;
  const { w: vw, h: vh, cx, cy } = getViewportFitBox();
  const sx = vw / bw;
  const sy = vh / bh;
  const next = Math.min(4, Math.max(0.25, Math.min(sx, sy)));
  scale.value = next;
  const ccx = (b.minX + b.maxX) / 2;
  const ccy = (b.minY + b.maxY) / 2;
  panX.value = cx - next * ccx;
  panY.value = cy - next * ccy;
}

function originCenter(): void {
  const b = canvasDiagramBounds();
  const { cx, cy } = getViewportFitBox();
  const s = scale.value;
  const ccx = (b.minX + b.maxX) / 2;
  const ccy = (b.minY + b.maxY) / 2;
  panX.value = cx - s * ccx;
  panY.value = cy - s * ccy;
}

function resetZoom100(): void {
  const { w: vw, h: vh } = getViewportSize();
  const cx = vw / 2;
  const cy = vh / 2;
  const wx = (cx - panX.value) / scale.value;
  const wy = (cy - panY.value) / scale.value;
  scale.value = 1;
  panX.value = cx - wx;
  panY.value = cy - wy;
}

function resetView(): void {
  scale.value = 1;
  panX.value = 0;
  panY.value = 0;
}

function zoomDelta(d: number): void {
  const { w: vw, h: vh } = getViewportSize();
  const cx = vw / 2;
  const cy = vh / 2;
  const prev = scale.value;
  const next = Math.min(4, Math.max(0.25, prev + d));
  if (next === prev) return;
  const k = next / prev;
  panX.value = cx - k * (cx - panX.value);
  panY.value = cy - k * (cy - panY.value);
  scale.value = next;
}

function autoLayoutClasses(): void {
  const classes = state.classes;
  if (!classes.length) return;
  const byId = new Map(classes.map((c) => [c.id, c] as const));
  const enforceDirectionalConstraintsFinal = (): void => {
    const assocGap = 56;
    const depGap = 44;
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (const l of state.links) {
        if (l.kind !== 'association' && l.kind !== 'dependency') continue;
        const fromPos = positions[l.from];
        const toPos = positions[l.to];
        const fromClass = byId.get(l.from);
        if (!fromPos || !toPos || !fromClass) continue;
        const minGap = l.kind === 'dependency' ? depGap : assocGap;
        const minToX = fromPos.x + classBoxSize(fromClass).w + minGap;
        if (toPos.x < minToX) {
          toPos.x = minToX;
          moved = true;
        }
      }
      if (!moved) break;
    }
  };
  normalizeDuplicateClassIds(false);
  collapseOverlappingDuplicateClasses(false);
  const beauty = (() => {
    if (layoutBeautyMode.value === 'fast') {
      return {
        edgeImproveIter: 2,
        baryRounds: 1,
        swapPass: 0,
        swapGuard: 2,
        gridHGap: 52,
        gridVGap: 52,
        treeHGap: 34,
        treeGap: 54,
        treeVGap: 52,
        relationPasses: 2,
        relationPull: 0.1,
        assocRender: 'straight' as const,
      };
    }
    if (layoutBeautyMode.value === 'polish') {
      return {
        edgeImproveIter: 12,
        baryRounds: 6,
        swapPass: 3,
        swapGuard: 20,
        gridHGap: 90,
        gridVGap: 86,
        treeHGap: 62,
        treeGap: 98,
        treeVGap: 86,
        relationPasses: 8,
        relationPull: 0.26,
        assocRender: 'orthogonal' as const,
      };
    }
    return {
      edgeImproveIter: 7,
      baryRounds: 3,
      swapPass: 1,
      swapGuard: 10,
      gridHGap: 68,
      gridVGap: 64,
      treeHGap: 44,
      treeGap: 72,
      treeVGap: 64,
      relationPasses: 4,
      relationPull: 0.16,
      assocRender: 'orthogonal' as const,
    };
  })();
  const applyBeautyEdgeRender = (): void => {
    for (const l of state.links) {
      if (l.kind === 'inherit') continue;
      edgeRenderById[l.id] = l.kind === 'dependency' ? 'orthogonal' : beauty.assocRender;
    }
  };
  const resolveClassBoxOverlaps = (): void => {
    const ids = classes.map((c) => c.id).filter((id) => !!positions[id] && !!byId.get(id));
    if (ids.length < 2) return;
    const pad = 18;
    // Phase 1: symmetric separation (keeps center balance).
    for (let iter = 0; iter < 24; iter++) {
      let moved = false;
      for (let i = 0; i < ids.length; i++) {
        const aId = ids[i]!;
        const aPos = positions[aId];
        const aCls = byId.get(aId);
        if (!aPos || !aCls) continue;
        const aSize = classBoxSize(aCls);
        for (let j = i + 1; j < ids.length; j++) {
          const bId = ids[j]!;
          const bPos = positions[bId];
          const bCls = byId.get(bId);
          if (!bPos || !bCls) continue;
          const bSize = classBoxSize(bCls);
          const overlapX = Math.min(aPos.x + aSize.w + pad, bPos.x + bSize.w + pad) - Math.max(aPos.x - pad, bPos.x - pad);
          const overlapY = Math.min(aPos.y + aSize.h + pad, bPos.y + bSize.h + pad) - Math.max(aPos.y - pad, bPos.y - pad);
          if (overlapX <= 0 || overlapY <= 0) continue;
          moved = true;
          if (overlapX <= overlapY) {
            const dx = overlapX / 2 + 1;
            if (aPos.x <= bPos.x) {
              aPos.x -= dx;
              bPos.x += dx;
            } else {
              aPos.x += dx;
              bPos.x -= dx;
            }
          } else {
            const dy = overlapY / 2 + 1;
            if (aPos.y <= bPos.y) {
              aPos.y -= dy;
              bPos.y += dy;
            } else {
              aPos.y += dy;
              bPos.y -= dy;
            }
          }
        }
      }
      if (!moved) break;
    }
    // Phase 2: deterministic shove-out (hard guarantee, avoids oscillation leftovers).
    for (let iter = 0; iter < 48; iter++) {
      let moved = false;
      for (let i = 0; i < ids.length; i++) {
        const aId = ids[i]!;
        const aPos = positions[aId];
        const aCls = byId.get(aId);
        if (!aPos || !aCls) continue;
        const aSize = classBoxSize(aCls);
        for (let j = i + 1; j < ids.length; j++) {
          const bId = ids[j]!;
          const bPos = positions[bId];
          const bCls = byId.get(bId);
          if (!bPos || !bCls) continue;
          const bSize = classBoxSize(bCls);
          const overlapX = Math.min(aPos.x + aSize.w + pad, bPos.x + bSize.w + pad) - Math.max(aPos.x - pad, bPos.x - pad);
          const overlapY = Math.min(aPos.y + aSize.h + pad, bPos.y + bSize.h + pad) - Math.max(aPos.y - pad, bPos.y - pad);
          if (overlapX <= 0 || overlapY <= 0) continue;
          moved = true;
          // Prefer pushing the "later" box away to guarantee monotonic convergence.
          if (overlapX <= overlapY) {
            const dx = overlapX + 2;
            bPos.x += dx;
          } else {
            const dy = overlapY + 2;
            bPos.y += dy;
          }
        }
      }
      if (!moved) break;
    }
    // Phase 3: hard packing fallback.
    // If any overlap still exists after iterative relaxation, place boxes into nearest free slots.
    const sorted = [...ids].sort((a, b) => {
      const pa = positions[a]!;
      const pb = positions[b]!;
      if (Math.abs(pa.y - pb.y) > 1) return pa.y - pb.y;
      return pa.x - pb.x;
    });
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    const collide = (x: number, y: number, w: number, h: number): boolean => {
      for (const r of placed) {
        const ox = Math.min(x + w + pad, r.x + r.w + pad) - Math.max(x - pad, r.x - pad);
        const oy = Math.min(y + h + pad, r.y + r.h + pad) - Math.max(y - pad, r.y - pad);
        if (ox > 0 && oy > 0) return true;
      }
      return false;
    };
    const leftBase = Math.min(...sorted.map((id) => positions[id]!.x));
    const rightLimit = leftBase + 2200;
    const laneStep = 24;
    for (const id of sorted) {
      const p = positions[id];
      const c = byId.get(id);
      if (!p || !c) continue;
      const s = classBoxSize(c);
      let x = p.x;
      let y = p.y;
      let guard = 0;
      while (collide(x, y, s.w, s.h) && guard < 800) {
        x += laneStep;
        if (x + s.w > rightLimit) {
          x = leftBase;
          y += s.h + laneStep;
        }
        guard++;
      }
      p.x = x;
      p.y = y;
      placed.push({ x, y, w: s.w, h: s.h });
    }
  };
  // 继承树布局：父类在上、子类在下；多个根按森林横向排列。
  // 纵向间距按每一层节点“真实框高”计算，避免内容多的类框重叠。
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const l of state.links) {
    if (l.kind !== 'inherit') continue;
    if (!byId.has(l.from) || !byId.has(l.to)) continue;
    const arr = children.get(l.to) ?? [];
    if (!arr.includes(l.from)) arr.push(l.from);
    children.set(l.to, arr);
    hasParent.add(l.from);
  }
  for (const arr of children.values()) {
    arr.sort((a, b) => classDisplayLabel(byId.get(a)!).localeCompare(classDisplayLabel(byId.get(b)!)));
  }
  const hasInheritLinks = children.size > 0;
  const linkedNeighbors = (() => {
    const m = new Map<string, Set<string>>();
    for (const c of classes) m.set(c.id, new Set<string>());
    for (const l of state.links) {
      if (l.kind !== 'association' && l.kind !== 'dependency') continue;
      if (!byId.has(l.from) || !byId.has(l.to)) continue;
      m.get(l.from)?.add(l.to);
      m.get(l.to)?.add(l.from);
    }
    return m;
  })();
  function improveEdgeAesthetics(): void {
    const ids = classes.map((c) => c.id).filter((id) => !!positions[id]);
    if (ids.length < 2) return;
    const yWeight = hasInheritLinks ? 0.05 : 0.2;
    const xWeight = 0.24;
    for (let iter = 0; iter < beauty.edgeImproveIter; iter++) {
      for (const id of ids) {
        const p = positions[id];
        const me = byId.get(id);
        if (!p || !me) continue;
        const neighbors = [...(linkedNeighbors.get(id) ?? [])].filter((nid) => !!positions[nid]);
        if (!neighbors.length) continue;
        const mySize = classBoxSize(me);
        let sumX = 0;
        let sumY = 0;
        for (const nid of neighbors) {
          const np = positions[nid]!;
          const nSize = classBoxSize(byId.get(nid)!);
          sumX += np.x + nSize.w / 2;
          sumY += np.y + nSize.h / 2;
        }
        const targetX = sumX / neighbors.length - mySize.w / 2;
        const targetY = sumY / neighbors.length - mySize.h / 2;
        positions[id] = {
          x: p.x + (targetX - p.x) * xWeight,
          y: p.y + (targetY - p.y) * yWeight,
        };
      }
      for (let i = 0; i < ids.length; i++) {
        const aId = ids[i]!;
        const aPos = positions[aId];
        const aClass = byId.get(aId);
        if (!aPos || !aClass) continue;
        const aSize = classBoxSize(aClass);
        for (let j = i + 1; j < ids.length; j++) {
          const bId = ids[j]!;
          const bPos = positions[bId];
          const bClass = byId.get(bId);
          if (!bPos || !bClass) continue;
          const bSize = classBoxSize(bClass);
          const overlapX = Math.min(aPos.x + aSize.w, bPos.x + bSize.w) - Math.max(aPos.x, bPos.x);
          const overlapY = Math.min(aPos.y + aSize.h, bPos.y + bSize.h) - Math.max(aPos.y, bPos.y);
          if (overlapX <= 0 || overlapY <= 0) continue;
          if (overlapX < overlapY) {
            const shift = overlapX / 2 + 16;
            if (aPos.x <= bPos.x) {
              aPos.x -= shift;
              bPos.x += shift;
            } else {
              aPos.x += shift;
              bPos.x -= shift;
            }
          } else {
            const shift = overlapY / 2 + 12;
            if (aPos.y <= bPos.y) {
              aPos.y -= shift;
              bPos.y += shift;
            } else {
              aPos.y += shift;
              bPos.y -= shift;
            }
          }
        }
      }
    }
  }

  // 无继承链时改为紧凑网格布局，避免所有类横向排成一条长带。
  if (!hasInheritLinks) {
    const sorted = [...classes].sort((a, b) => classDisplayLabel(a).localeCompare(classDisplayLabel(b)));
    const n = sorted.length;
    const colCount = Math.max(1, Math.ceil(Math.sqrt(n)));
    const hGap = beauty.gridHGap;
    const vGap = beauty.gridVGap;
    const startX = 80;
    const startY = 80;
    const boxW = classBoxSize(sorted[0]!).w;
    const rowHeights: number[] = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / colCount);
      const h = classBoxSize(sorted[i]!).h;
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, h);
    }
    const rowTopY: number[] = [];
    let curY = startY;
    for (let r = 0; r < rowHeights.length; r++) {
      rowTopY[r] = curY;
      curY += (rowHeights[r] ?? 160) + vGap;
    }
    for (let i = 0; i < n; i++) {
      const c = sorted[i]!;
      const row = Math.floor(i / colCount);
      const col = i % colCount;
      positions[c.id] = {
        x: startX + col * (boxW + hGap),
        y: rowTopY[row] ?? startY,
      };
    }
    // Keep association/dependency direction semantics in grid layout:
    // target node should stay on the right side of source node.
    const assocGap = 56;
    const depGap = 44;
    for (let pass = 0; pass < beauty.relationPasses; pass++) {
      let moved = false;
      for (const l of state.links) {
        if (l.kind !== 'association' && l.kind !== 'dependency') continue;
        const fromPos = positions[l.from];
        const toPos = positions[l.to];
        const fromClass = byId.get(l.from);
        if (!fromPos || !toPos || !fromClass) continue;
        const minGap = l.kind === 'dependency' ? depGap : assocGap;
        const minToX = fromPos.x + classBoxSize(fromClass).w + minGap;
        if (toPos.x < minToX) {
          positions[l.to] = { ...toPos, x: minToX };
          moved = true;
        }
      }
      if (!moved) break;
    }
    applyBeautyEdgeRender();
    improveEdgeAesthetics();
    resolveClassBoxOverlaps();
    enforceDirectionalConstraintsFinal();
    pushPayload();
    fitAll();
    void nextTick(() => fitAll());
    return;
  }

  let roots = classes.filter((c) => !hasParent.has(c.id)).map((c) => c.id);
  if (!roots.length) roots = classes.map((c) => c.id);
  roots.sort((a, b) => classDisplayLabel(byId.get(a)!).localeCompare(classDisplayLabel(byId.get(b)!)));

  const hGap = beauty.treeHGap;
  const treeGap = beauty.treeGap;
  const vGap = beauty.treeVGap;
  const measureMemo = new Map<string, number>();
  const measuring = new Set<string>();
  const nodeWidth = (id: string) => classBoxSize(byId.get(id)!).w;
  const nodeHeight = (id: string) => classBoxSize(byId.get(id)!).h;

  const measure = (id: string): number => {
    if (measureMemo.has(id)) return measureMemo.get(id)!;
    if (measuring.has(id)) return nodeWidth(id);
    measuring.add(id);
    const kids = children.get(id) ?? [];
    let w = nodeWidth(id);
    if (kids.length) {
      const sub = kids.reduce((sum, k, i) => sum + measure(k) + (i > 0 ? hGap : 0), 0);
      if (sub > w) w = sub;
    }
    measuring.delete(id);
    measureMemo.set(id, w);
    return w;
  };

  const depthMaxHeight = new Map<number, number>();
  const depthTopY = new Map<number, number>();
  const placed = new Set<string>();
  const depthById = new Map<string, number>();
  const measureDepthHeights = (id: string, depth: number) => {
    const h = nodeHeight(id);
    depthMaxHeight.set(depth, Math.max(depthMaxHeight.get(depth) ?? 0, h));
    const kids = children.get(id) ?? [];
    for (const k of kids) measureDepthHeights(k, depth + 1);
  };
  for (const r of roots) measureDepthHeights(r, 0);
  let y = 80;
  const maxDepth = Math.max(...depthMaxHeight.keys(), 0);
  for (let d = 0; d <= maxDepth; d++) {
    depthTopY.set(d, y);
    y += (depthMaxHeight.get(d) ?? 160) + vGap;
  }

  const place = (id: string, left: number, depth: number) => {
    if (placed.has(id)) return;
    placed.add(id);
    const boxW = nodeWidth(id);
    const boxH = nodeHeight(id);
    const subW = measure(id);
    const centerX = left + subW / 2;
    const topY = depthTopY.get(depth) ?? 80 + depth * (boxH + vGap);
    positions[id] = { x: centerX - boxW / 2, y: topY };
    depthById.set(id, depth);
    const kids = children.get(id) ?? [];
    let cur = left;
    for (const k of kids) {
      const kw = measure(k);
      place(k, cur, depth + 1);
      cur += kw + hGap;
    }
  };

  let curX = 80;
  for (const r of roots) {
    const rw = measure(r);
    place(r, curX, 0);
    curX += rw + treeGap;
  }

  // 兜底：环路或孤立节点未放置时，按平铺放到最右侧。
  for (const c of classes) {
    if (placed.has(c.id)) continue;
    const w = nodeWidth(c.id);
    positions[c.id] = { x: curX, y: 80 };
    depthById.set(c.id, 0);
    curX += w + treeGap;
  }

  const relationNeighbors = (() => {
    const m = new Map<string, Set<string>>();
    for (const c of classes) m.set(c.id, new Set<string>());
    for (const l of state.links) {
      if (!positions[l.from] || !positions[l.to]) continue;
      m.get(l.from)?.add(l.to);
      m.get(l.to)?.add(l.from);
    }
    return m;
  })();
  const centerXOf = (id: string): number => {
    const p = positions[id]!;
    return p.x + nodeWidth(id) / 2;
  };
  const edgeCrossCount = (depth: number, ids: string[]): number => {
    const next = depth + 1;
    const prev = depth - 1;
    const edges: Array<{ ax: number; bx: number }> = [];
    for (const id of ids) {
      const a = centerXOf(id);
      const ns = relationNeighbors.get(id) ?? new Set<string>();
      for (const nid of ns) {
        const nd = depthById.get(nid);
        if (nd !== next && nd !== prev) continue;
        edges.push({ ax: a, bx: centerXOf(nid) });
      }
    }
    let c = 0;
    for (let i = 0; i < edges.length; i++) {
      const e1 = edges[i]!;
      for (let j = i + 1; j < edges.length; j++) {
        const e2 = edges[j]!;
        if ((e1.ax - e2.ax) * (e1.bx - e2.bx) < 0) c++;
      }
    }
    return c;
  };
  const applyLayerOrder = (depth: number, ids: string[]): void => {
    if (!ids.length) return;
    const minX = Math.min(...ids.map((id) => positions[id]!.x));
    let x = minX;
    for (const id of ids) {
      positions[id] = { ...positions[id]!, x };
      x += nodeWidth(id) + hGap;
    }
    for (const id of ids) {
      positions[id] = { ...positions[id]!, y: depthTopY.get(depth) ?? positions[id]!.y };
    }
  };
  const reorderByBarycenter = (depth: number, refDepth: number): void => {
    const ids = classes.filter((c) => depthById.get(c.id) === depth).map((c) => c.id);
    if (ids.length < 2) return;
    const score = (id: string): number => {
      const ns = [...(relationNeighbors.get(id) ?? [])].filter((nid) => depthById.get(nid) === refDepth);
      if (!ns.length) return centerXOf(id);
      const sum = ns.reduce((acc, nid) => acc + centerXOf(nid), 0);
      return sum / ns.length;
    };
    const sorted = [...ids].sort((a, b) => score(a) - score(b));
    applyLayerOrder(depth, sorted);
  };
  const localSwapReduceCross = (depth: number): void => {
    const ids = classes.filter((c) => depthById.get(c.id) === depth).map((c) => c.id);
    if (ids.length < 3) return;
    let order = [...ids].sort((a, b) => positions[a]!.x - positions[b]!.x);
    let improved = true;
    let guard = 0;
    while (improved && guard < beauty.swapGuard) {
      improved = false;
      guard++;
      for (let i = 0; i < order.length - 1; i++) {
        const curr = [...order];
        const bestBefore = edgeCrossCount(depth, curr);
        const swapped = [...curr];
        const t = swapped[i]!;
        swapped[i] = swapped[i + 1]!;
        swapped[i + 1] = t;
        applyLayerOrder(depth, swapped);
        const after = edgeCrossCount(depth, swapped);
        if (after < bestBefore) {
          order = swapped;
          improved = true;
        } else {
          applyLayerOrder(depth, curr);
        }
      }
    }
  };
  // 轻量 crossing reduction：按层对齐到相邻层 barycenter，减少交叉与折返。
  for (let round = 0; round < beauty.baryRounds; round++) {
    for (let d = 1; d <= maxDepth; d++) reorderByBarycenter(d, d - 1);
    for (let d = maxDepth - 1; d >= 0; d--) reorderByBarycenter(d, d + 1);
  }
  // 在 barycenter 后做局部相邻交换，进一步降低剩余交叉。
  for (let pass = 0; pass < beauty.swapPass; pass++) {
    for (let d = 0; d <= maxDepth; d++) localSwapReduceCross(d);
  }

  // Association/dependency direction constraint: target should stay on the right side.
  // Apply multiple passes to propagate shifts across relation chains.
  const assocGap = 56;
  const depGap = 44;
  for (let pass = 0; pass < beauty.relationPasses; pass++) {
    let moved = false;
    for (const l of state.links) {
      if (l.kind !== 'association' && l.kind !== 'dependency') continue;
      const fromPos = positions[l.from];
      const toPos = positions[l.to];
      const fromClass = byId.get(l.from);
      if (!fromPos || !toPos || !fromClass) continue;
      const minGap = l.kind === 'dependency' ? depGap : assocGap;
      const minToX = fromPos.x + classBoxSize(fromClass).w + minGap;
      if (toPos.x < minToX) {
        positions[l.to] = { ...toPos, x: minToX };
        moved = true;
      }
      const verticalPull = hasInheritLinks ? beauty.relationPull * 0.6 : beauty.relationPull;
      const alignedY = fromPos.y + (l.kind === 'dependency' ? 0 : 6);
      const nextY = toPos.y + (alignedY - toPos.y) * verticalPull;
      if (Math.abs(nextY - toPos.y) > 1) {
        positions[l.to] = { ...positions[l.to]!, y: nextY };
        moved = true;
      }
    }
    if (!moved) break;
  }
  applyBeautyEdgeRender();
  improveEdgeAesthetics();
  resolveClassBoxOverlaps();
  enforceDirectionalConstraintsFinal();

  pushPayload();
  fitAll();
  void nextTick(() => fitAll());
}

function classIdAtWorldPoint(wx: number, wy: number): string | null {
  for (const c of state.classes) {
    const p = positions[c.id];
    if (!p) continue;
    const { w, h } = classBoxSize(c);
    if (wx >= p.x && wx <= p.x + w && wy >= p.y && wy <= p.y + h) return c.id;
  }
  return null;
}

function classIdAtLeftHandlePoint(wx: number, wy: number): string | null {
  for (const c of state.classes) {
    const p = positions[c.id];
    if (!p) continue;
    // Left triangle around points: (-16,18) (0,10) (0,26)
    const x0 = p.x - 18;
    const x1 = p.x + 2;
    const y0 = p.y + 8;
    const y1 = p.y + 28;
    if (wx >= x0 && wx <= x1 && wy >= y0 && wy <= y1) return c.id;
  }
  return null;
}

function classIdAtRightHandlePoint(wx: number, wy: number): string | null {
  for (const c of state.classes) {
    const p = positions[c.id];
    if (!p) continue;
    const rows = rightHandleRows(c);
    for (const h of rows) {
      const cy = p.y + previewSectionLineY(c, h.sectionIndex, h.lineIndex) - 4;
      // Right triangle around points: (264,cy) (248,cy-8) (248,cy+4)
      const x0 = p.x + 246;
      const x1 = p.x + 266;
      const y0 = cy - 10;
      const y1 = cy + 6;
      if (wx >= x0 && wx <= x1 && wy >= y0 && wy <= y1) return c.id;
    }
  }
  return null;
}

function startInheritDrag(e: PointerEvent, childId: string, anchor: 'top' | 'left' = 'top'): void {
  if (layoutOnly.value) return;
  e.stopPropagation();
  e.preventDefault();
  selectedInheritHandleClassId.value = childId;
  selectedEdgeId.value = null;
  const p = positions[childId];
  if (!p) return;
  const child = state.classes.find((x) => x.id === childId);
  if (!child) return;
  const s = classBoxSize(child);
  const x1 = anchor === 'left' ? p.x : p.x + s.w / 2;
  const y1 = anchor === 'left' ? p.y + 18 : p.y;
  inheritDrag.value = { fromId: childId };
  const w = clientToWorld(e.clientX, e.clientY);
  tempInheritLine.value = { x1, y1, x2: w.x, y2: w.y };
}

function startAssociationDrag(
  e: PointerEvent,
  fromId: string,
  sectionIndex: number,
  lineIndex: number,
  anchor: 'left' | 'right' = 'right',
): void {
  if (layoutOnly.value) return;
  // Strict sync mode: association must originate from member/property slot handles only.
  if (anchor !== 'right') return;
  e.stopPropagation();
  e.preventDefault();
  const p = positions[fromId];
  const c = state.classes.find((x) => x.id === fromId);
  if (!p || !c) return;
  selectedInheritHandleClassId.value = null;
  selectedEdgeId.value = null;
  associationDrag.value = { fromId, sectionIndex, lineIndex, anchor };
  const x1 = anchor === 'left' ? p.x - 16 : p.x + 264;
  const y1 = anchor === 'left' ? p.y + 18 : p.y + rightHandleTipY(c, { sectionIndex, lineIndex });
  const w = clientToWorld(e.clientX, e.clientY);
  tempAssociationLine.value = { x1, y1, x2: w.x, y2: w.y };
}

function startDependencyDrag(e: PointerEvent, fromId: string): void {
  if (layoutOnly.value) return;
  e.stopPropagation();
  e.preventDefault();
  const p = positions[fromId];
  const c = state.classes.find((x) => x.id === fromId);
  if (!p || !c) return;
  selectedInheritHandleClassId.value = null;
  selectedEdgeId.value = null;
  dependencyDrag.value = { fromId };
  const x1 = p.x + classBoxSize(c).w + 16;
  const y1 = p.y + 18;
  const w = clientToWorld(e.clientX, e.clientY);
  tempDependencyLine.value = { x1, y1, x2: w.x, y2: w.y };
}

function onGlobalPointerMove(e: PointerEvent): void {
  const w = clientToWorld(e.clientX, e.clientY);
  if (inheritDrag.value && tempInheritLine.value) {
    tempInheritLine.value = {
      ...tempInheritLine.value,
      x2: w.x,
      y2: w.y,
    };
  }
  if (associationDrag.value && tempAssociationLine.value) {
    tempAssociationLine.value = {
      ...tempAssociationLine.value,
      x2: w.x,
      y2: w.y,
    };
  }
  if (dependencyDrag.value && tempDependencyLine.value) {
    tempDependencyLine.value = {
      ...tempDependencyLine.value,
      x2: w.x,
      y2: w.y,
    };
  }
}

function onGlobalPointerUp(e: PointerEvent): void {
  if (layoutOnly.value) {
    inheritDrag.value = null;
    associationDrag.value = null;
    dependencyDrag.value = null;
    tempInheritLine.value = null;
    tempAssociationLine.value = null;
    tempDependencyLine.value = null;
    return;
  }
  if (!inheritDrag.value && !associationDrag.value && !dependencyDrag.value) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const w = clientToWorld(e.clientX, e.clientY);
  const targetId = classIdAtWorldPoint(w.x, w.y);
  if (inheritDrag.value) {
    const childId = inheritDrag.value.fromId;
    inheritDrag.value = null;
    tempInheritLine.value = null;
    if (targetId && targetId !== childId) {
      state.links = state.links.filter((l) => !(l.kind === 'inherit' && l.from === childId));
      const newId = `inh-${childId}-${targetId}`;
      state.links.push({
        id: newId,
        from: childId,
        to: targetId,
        kind: 'inherit',
      });
      selectedEdgeId.value = newId;
      pushPayload();
    }
  }
  if (associationDrag.value) {
    const fromId = associationDrag.value.fromId;
    const anchor = associationDrag.value.anchor;
    const dragSectionIndex = associationDrag.value.sectionIndex;
    const dragLineIndex = associationDrag.value.lineIndex;
    associationDrag.value = null;
    tempAssociationLine.value = null;
    const anchorTargetId =
      anchor === 'right' ? classIdAtLeftHandlePoint(w.x, w.y) : classIdAtRightHandlePoint(w.x, w.y);
    if (anchorTargetId && anchorTargetId !== fromId) {
      const newId = `asc-${Date.now()}`;
      // Side-to-side association rule:
      // right handle: source.right -> target.left  => from=source, to=target
      // left handle:  source.left  -> target.right => from=target, to=source
      const from = anchor === 'right' ? fromId : anchorTargetId;
      const to = anchor === 'right' ? anchorTargetId : fromId;
      const fromClass = state.classes.find((x) => x.id === from);
      const slotMeta =
        anchor === 'right' && fromClass ? fromSlotMeta(fromClass, dragSectionIndex, dragLineIndex) : null;
      state.links.push({
        id: newId,
        from,
        to,
        kind: 'association',
        ...(slotMeta ?? {}),
      });
      if (anchor === 'right') {
        associationAnchorByEdge[newId] = {
          sectionIndex: dragSectionIndex,
          lineIndex: dragLineIndex,
        };
      }
      selectedEdgeId.value = newId;
      pushPayload();
    }
  }
  if (dependencyDrag.value) {
    const fromId = dependencyDrag.value.fromId;
    dependencyDrag.value = null;
    tempDependencyLine.value = null;
    if (targetId && targetId !== fromId) {
      const newId = `dep-${Date.now()}`;
      state.links.push({
        id: newId,
        from: fromId,
        to: targetId,
        kind: 'dependency',
      });
      selectedEdgeId.value = newId;
      pushPayload();
    }
  }
}

function onEdgePointerDown(e: PointerEvent, edgeId: string): void {
  e.stopPropagation();
  selectedEdgeId.value = edgeId;
  selectedInheritHandleClassId.value = null;
  ctx.open = false;
  addCtx.open = false;
}

function openEdgeEditor(edgeId: string, x: number, y: number): void {
  if (layoutOnly.value) return;
  selectedEdgeId.value = edgeId;
  selectedInheritHandleClassId.value = null;
  ctx.open = false;
  addCtx.open = false;
  edgeCtx.open = false;
  edgeEditor.open = true;
  edgeEditor.edgeId = edgeId;
  edgeEditor.x = x;
  edgeEditor.y = y;
}

function onEdgeContextMenu(e: MouseEvent, edgeId: string): void {
  if (layoutOnly.value) return;
  e.preventDefault();
  e.stopPropagation();
  selectedEdgeId.value = edgeId;
  selectedInheritHandleClassId.value = null;
  ctx.open = false;
  addCtx.open = false;
  edgeEditor.open = false;
  edgeCtx.open = true;
  edgeCtx.edgeId = edgeId;
  edgeCtx.x = e.clientX;
  edgeCtx.y = e.clientY;
}

function onEdgeDblClick(e: MouseEvent, edgeId: string): void {
  e.preventDefault();
  e.stopPropagation();
  if (layoutOnly.value) return;
  openEdgeEditor(edgeId, e.clientX, e.clientY);
}

function deleteEdge(edgeId: string): void {
  if (layoutOnly.value) return;
  state.links = state.links.filter((l) => l.id !== edgeId);
  delete associationAnchorByEdge[edgeId];
  delete edgeRenderById[edgeId];
  if (selectedEdgeId.value === edgeId) selectedEdgeId.value = null;
  edgeCtx.open = false;
  if (edgeEditor.edgeId === edgeId) edgeEditor.open = false;
  pushPayload();
}

const selectedEdge = computed(() => state.links.find((l) => l.id === edgeEditor.edgeId));
const selectedEdgeRender = computed<'straight' | 'orthogonal' | 'curve'>(() => {
  const edge = selectedEdge.value;
  if (!edge) return 'straight';
  return edgeRenderById[edgeEditor.edgeId] ?? (edge.kind === 'dependency' ? 'orthogonal' : 'straight');
});

function patchEdge(part: Partial<{ kind: 'inherit' | 'association' | 'dependency'; fromMult: string; toMult: string }>): void {
  if (layoutOnly.value) return;
  const edge = state.links.find((l) => l.id === edgeEditor.edgeId);
  if (!edge) return;
  if (part.kind !== undefined) {
    if (part.kind === 'association') {
      const sec = edge.fromSlotSection;
      const nm = (edge.fromSlotName ?? '').trim();
      if ((sec !== 'members' && sec !== 'properties') || !nm) return;
    }
    edge.kind = part.kind;
  }
  if (part.fromMult !== undefined) edge.fromMult = part.fromMult || undefined;
  if (part.toMult !== undefined) edge.toMult = part.toMult || undefined;
  pushPayload();
}

function patchEdgeRender(mode: 'straight' | 'orthogonal' | 'curve'): void {
  if (!edgeEditor.edgeId) return;
  edgeRenderById[edgeEditor.edgeId] = mode;
}

function onSvgClassPointerDown(e: PointerEvent, classId: string): void {
  if (e.button !== 0 || inheritDrag.value) return;
  e.stopPropagation();
  selectedEdgeId.value = null;
  const additive = e.ctrlKey || e.metaKey || e.shiftKey;
  if (additive) {
    if (selectedIds.value.includes(classId)) {
      selectedIds.value = selectedIds.value.filter((x) => x !== classId);
    } else {
      selectedIds.value = [...selectedIds.value, classId];
    }
    ctx.open = false;
    return;
  }
  if (!selectedIds.value.includes(classId)) {
    selectedIds.value = [classId];
  }
  ctx.open = false;
  const pos = positions[classId];
  if (!pos) return;
  const w = clientToWorld(e.clientX, e.clientY);
  const snapshots: Record<string, { x: number; y: number }> = {};
  for (const id of selectedIds.value) {
    const pp = positions[id];
    if (pp) snapshots[id] = { ...pp };
  }
  drag.value = {
    primaryId: classId,
    ox: w.x - pos.x,
    oy: w.y - pos.y,
    snapshots,
  };
  (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
}

function onSvgClassPointerMove(e: PointerEvent, classId: string): void {
  const d = drag.value;
  if (!d || d.primaryId !== classId || inheritDrag.value) return;
  const w = clientToWorld(e.clientX, e.clientY);
  const s0 = d.snapshots[classId];
  if (!s0) return;
  const newPx = w.x - d.ox;
  const newPy = w.y - d.oy;
  const dx = newPx - s0.x;
  const dy = newPy - s0.y;
  for (const id of selectedIds.value) {
    const snap = d.snapshots[id];
    if (!snap) continue;
    positions[id] = { x: snap.x + dx, y: snap.y + dy };
  }
}

function onSvgClassPointerUp(e: PointerEvent, classId: string): void {
  if (drag.value?.primaryId === classId) {
    drag.value = null;
    pushPayload();
  }
  try {
    (e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function onClassContextMenu(e: MouseEvent, classId: string): void {
  e.preventDefault();
  e.stopPropagation();
  if (layoutOnly.value) return;
  edgeCtx.open = false;
  addCtx.open = false;
  selectedIds.value = [classId];
  ctx.open = true;
  ctx.x = e.clientX;
  ctx.y = e.clientY;
  ctx.classId = classId;
}

function onBackgroundContextMenu(e: MouseEvent): void {
  e.preventDefault();
  e.stopPropagation();
  edgeCtx.open = false;
  ctx.open = false;
  if (layoutOnly.value) return;
  addCtx.open = true;
  customClassName.value = '';
  const p = clampAddCtxPosition(e.clientX, e.clientY);
  addCtx.x = p.x;
  addCtx.y = p.y;
}

type EdgePathItem = {
  id: string;
  d: string;
  kind: 'inherit' | 'association' | 'dependency';
  dash?: string;
  markerEnd?: string;
  fromMult?: string;
  toMult?: string;
  lx?: number;
  ly?: number;
  rx?: number;
  ry?: number;
};

function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: { x: number; y: number; w: number; h: number },
  pad = 6,
): boolean {
  const left = r.x - pad;
  const right = r.x + r.w + pad;
  const top = r.y - pad;
  const bottom = r.y + r.h + pad;
  if (x1 === x2) {
    if (x1 < left || x1 > right) return false;
    const a = Math.min(y1, y2);
    const b = Math.max(y1, y2);
    return b >= top && a <= bottom;
  }
  if (y1 === y2) {
    if (y1 < top || y1 > bottom) return false;
    const a = Math.min(x1, x2);
    const b = Math.max(x1, x2);
    return b >= left && a <= right;
  }
  return false;
}

const edgePaths = computed((): EdgePathItem[] => {
  const out: EdgePathItem[] = [];
  const classRectById = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const c of state.classes) {
    const p = positions[c.id];
    if (!p) continue;
    const s = classBoxSize(c);
    classRectById.set(c.id, { x: p.x, y: p.y, w: s.w, h: s.h });
  }
  const nonInheritEdges = state.links.filter((l) => l.kind === 'association' || l.kind === 'dependency');
  const outEdgeIdsByClass = new Map<string, string[]>();
  const inEdgeIdsByClass = new Map<string, string[]>();
  for (const e of nonInheritEdges) {
    const outArr = outEdgeIdsByClass.get(e.from) ?? [];
    outArr.push(e.id);
    outEdgeIdsByClass.set(e.from, outArr);
    const inArr = inEdgeIdsByClass.get(e.to) ?? [];
    inArr.push(e.id);
    inEdgeIdsByClass.set(e.to, inArr);
  }
  const laneByEdgeId = new Map<string, { outRank: number; outTotal: number; inRank: number; inTotal: number }>();
  for (const ids of outEdgeIdsByClass.values()) ids.sort();
  for (const ids of inEdgeIdsByClass.values()) ids.sort();
  for (const e of nonInheritEdges) {
    const outIds = outEdgeIdsByClass.get(e.from) ?? [];
    const inIds = inEdgeIdsByClass.get(e.to) ?? [];
    laneByEdgeId.set(e.id, {
      outRank: Math.max(0, outIds.indexOf(e.id)),
      outTotal: outIds.length,
      inRank: Math.max(0, inIds.indexOf(e.id)),
      inTotal: inIds.length,
    });
  }
  const orthogonalPathAvoidingClasses = (
    fromId: string,
    toId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    startLaneOffset: number,
    endLaneOffset: number,
    channelBias: number,
  ): string => {
    const startStub = x1 + 20 + startLaneOffset;
    const endStub = x2 - 20 + endLaneOffset;
    const left = Math.min(startStub, endStub);
    const right = Math.max(startStub, endStub);
    const candidates = [
      (y1 + y2) / 2 + channelBias,
      y1 - 56,
      y1 + 56,
      y2 - 56,
      y2 + 56,
      Math.min(y1, y2) - 72,
      Math.max(y1, y2) + 72,
    ];
    let bestY = candidates[0]!;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const cy of candidates) {
      let hit = 0;
      for (const [id, r] of classRectById.entries()) {
        if (id === fromId || id === toId) continue;
        if (
          segmentIntersectsRect(left, cy, right, cy, r) ||
          segmentIntersectsRect(startStub, y1, startStub, cy, r) ||
          segmentIntersectsRect(endStub, cy, endStub, y2, r)
        ) {
          hit++;
        }
      }
      const bend = Math.abs(cy - y1) + Math.abs(cy - y2);
      const cost = hit * 10000 + bend;
      if (cost < bestCost) {
        bestCost = cost;
        bestY = cy;
      }
    }
    return `M ${x1} ${y1} L ${startStub} ${y1} L ${startStub} ${bestY} L ${endStub} ${bestY} L ${endStub} ${y2} L ${x2} ${y2}`;
  };
  for (const l of state.links) {
    if (l.kind === 'inherit' && !edgeVisibility.inherit) continue;
    if ((l.kind === 'association' || l.kind === 'dependency') && !edgeVisibility.association) continue;
    const fc = state.classes.find((x) => x.id === l.from);
    const tc = state.classes.find((x) => x.id === l.to);
    if (!fc || !tc) continue;
    const p1 = positions[l.from];
    const p2 = positions[l.to];
    if (!p1 || !p2) continue;
    const s1 = classBoxSize(fc);
    const s2 = classBoxSize(tc);
    let dpath: string;
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;
    if (l.kind === 'inherit') {
      x1 = p1.x + s1.w / 2;
      y1 = p1.y;
      x2 = p2.x + s2.w / 2;
      y2 = p2.y + s2.h;
    } else if (l.kind === 'dependency') {
      // class-level dependency: class right handle -> target left handle
      x1 = p1.x + s1.w + 16;
      y1 = p1.y + 18;
      x2 = p2.x - 16;
      y2 = p2.y + 18;
    } else {
      // Association anchors: from right triangle tip -> to left triangle tip.
      const src = associationSourceTip(l.id, { fromSlotSection: l.fromSlotSection, fromSlotName: l.fromSlotName }, fc, p1, p2);
      x1 = src.x;
      y1 = src.y;
      x2 = p2.x - 16;
      y2 = p2.y + 18;
    }
    const lane = laneByEdgeId.get(l.id);
    const laneStep = 9;
    const outLaneOffset = lane ? (lane.outRank - (lane.outTotal - 1) / 2) * laneStep : 0;
    const inLaneOffset = lane ? (lane.inRank - (lane.inTotal - 1) / 2) * laneStep : 0;
    if (l.kind === 'dependency') {
      y1 += outLaneOffset * 0.5;
      y2 += inLaneOffset * 0.5;
    }
    const render = edgeRenderById[l.id] ?? (l.kind === 'dependency' ? 'orthogonal' : 'straight');
    if (render === 'orthogonal') {
      dpath = orthogonalPathAvoidingClasses(l.from, l.to, x1, y1, x2, y2, outLaneOffset, inLaneOffset, outLaneOffset * 0.35);
    } else if (render === 'curve') {
      const dx = x2 - x1;
      const c1x = x1 + dx * 0.33;
      const c2x = x1 + dx * 0.66;
      dpath = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
    } else {
      dpath = `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const dash = l.kind === 'dependency' ? '7 4' : undefined;
    const markerEnd =
      l.kind === 'inherit' ? markerInheritUrl.value : l.kind === 'dependency' ? markerDependencyUrl.value : markerAssocUrl.value;
    const fromMult = l.fromMult;
    const toMult = l.toMult;
    const t0 = 0.22;
    const t1 = 0.78;
    const lx = x1 + (x2 - x1) * t0;
    const ly = y1 + (y2 - y1) * t0;
    const rx = x1 + (x2 - x1) * t1;
    const ry = y1 + (y2 - y1) * t1;
    out.push({
      id: l.id,
      d: dpath,
      kind: l.kind,
      dash,
      markerEnd,
      fromMult,
      toMult,
      lx,
      ly,
      rx,
      ry,
    });
  }
  return out;
});

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 类图成员可见性前缀：+ - # ~（与文档一致；私有成员以 - 开头） */
function memberVisibilityLead(line: string): string | null {
  const t = line.trimStart();
  const c = t.charAt(0);
  if (c === '-' || c === '#' || c === '~' || c === '+') return c;
  return null;
}

function memberAttrFill(line: string): string {
  const v = memberVisibilityLead(line);
  if (isDarkTheme()) {
    if (v === '-') return '#86efac';
    if (v === '#') return '#4ade80';
    if (v === '~') return '#bbf7d0';
    return '#bbf7d0';
  }
  if (v === '-') return '#0f5132';
  if (v === '#') return '#166534';
  if (v === '~') return '#15803d';
  return '#14532d';
}

function memberMethFill(line: string): string {
  const v = memberVisibilityLead(line);
  if (isDarkTheme()) {
    if (v === '-') return '#93c5fd';
    if (v === '#') return '#60a5fa';
    if (v === '~') return '#bfdbfe';
    return '#dbeafe';
  }
  if (v === '-') return '#1e40af';
  if (v === '#') return '#1d4ed8';
  if (v === '~') return '#1e3a8a';
  return '#1e3a5f';
}

function memberFontStyle(line: string): string {
  return memberVisibilityLead(line) === '-' ? 'italic' : 'normal';
}

const SECTION_LAB = 10;

function attrBlockHeight(c: ClassDef): number {
  return SECTION_LAB + displayAttributes(c).length * 22 + 6;
}

function methBlockHeight(c: ClassDef): number {
  return SECTION_LAB + displayMethods(c).length * 22 + 6;
}

function enumBlockHeight(c: ClassDef): number {
  return SECTION_LAB + displayEnumLiterals(c).length * 22 + 6;
}

function attrBlockTopY(c: ClassDef): number {
  return classDiagramHeaderHeight(c) + 2;
}

function methBlockTopY(c: ClassDef): number {
  return attrBlockTopY(c) + attrBlockHeight(c) + 2 + propBlockHeight(c) + 2 + enumBlockHeight(c) + 2;
}

function attrTextY(c: ClassDef, i: number): number {
  return attrBlockTopY(c) + SECTION_LAB + 4 + i * 22;
}

function methTextY(c: ClassDef, i: number): number {
  return methBlockTopY(c) + SECTION_LAB + 4 + i * 22;
}

function enumBlockTopY(c: ClassDef): number {
  return attrBlockTopY(c) + attrBlockHeight(c) + 2 + propBlockHeight(c) + 2;
}

function enumTextY(c: ClassDef, i: number): number {
  return enumBlockTopY(c) + SECTION_LAB + 4 + i * 22;
}

function propBlockTopY(c: ClassDef): number {
  return attrBlockTopY(c) + attrBlockHeight(c) + 2;
}

function propBlockHeight(c: ClassDef): number {
  return SECTION_LAB + displayProperties(c).length * 22 + 6;
}

function propTextY(c: ClassDef, i: number): number {
  return propBlockTopY(c) + SECTION_LAB + 4 + i * 22;
}

function titleNameY(c: ClassDef): number {
  return classStereotype(c) ? 30 : 20;
}

function openClassifierFromDiagram(classId: string): void {
  if (layoutOnly.value) return;
  const c = state.classes.find((x) => x.id === classId);
  if (!c) return;
  emit('openClassifier', { classDiagramClassId: c.id, className: c.name.trim() });
  ctx.open = false;
}

function onClassDblClick(classId: string): void {
  openClassifierFromDiagram(classId);
}

function deleteClass(classId: string): void {
  if (layoutOnly.value) return;
  if (!window.confirm(cd.value.cdeDeleteClassConfirm)) return;
  state.classes = state.classes.filter((c) => c.id !== classId);
  state.links = state.links.filter((l) => l.from !== classId && l.to !== classId);
  delete positions[classId];
  delete folded[classId];
  selectedIds.value = selectedIds.value.filter((x) => x !== classId);
  ctx.open = false;
  pushPayload();
}
</script>

<template>
  <div class="cde">
    <div
      ref="viewportRef"
      class="cde-viewport"
      :class="{
        'cde-viewport--panning': isPanning,
        'cde-viewport--marquee': !!marquee,
        'cde-viewport--dragging': !!drag,
      }"
      :title="`${cd.cdeFit} · ${cd.cdeOrigin} · ${cd.cdeResetZoom} — ${noGlobalShortcutText}`"
      @wheel.prevent="onWheel"
      @pointerdown="onViewportPointerDown"
      @pointermove="onViewportPointerMove"
      @pointerup="onViewportPointerUp"
      @pointercancel="onViewportPointerUp"
    >
      <div v-if="modelSourceErrorText" class="cde-model-source-error" role="alert">
        {{ modelSourceErrorText }}
      </div>
      <div v-else-if="layoutOnly" class="cde-model-source-error cde-model-source-error--info" role="status">
        {{ cd.cdeObserveModeBanner }}
      </div>
      <div class="cde-world" :style="worldTransform()">
        <div class="cde-grid" aria-hidden="true" />
        <svg
          class="cde-svg"
          xmlns="http://www.w3.org/2000/svg"
          :width="WORLD_SIZE"
          :height="WORLD_SIZE"
          @contextmenu.prevent
        >
          <defs>
            <!-- 泛化：空心三角（指向父类一端） -->
            <marker
              :id="`${mkId}-inh`"
              markerWidth="14"
              markerHeight="14"
              refX="12"
              refY="7"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d="M0,1 L0,13 L12,7 z"
                fill="#f8fafc"
                stroke="#475569"
                stroke-width="1.35"
              />
            </marker>
            <!-- 关联：开口箭头 -->
            <marker
              :id="`${mkId}-asc`"
              markerWidth="12"
              markerHeight="10"
              refX="10"
              refY="5"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,-4 L10,0 L0,4" fill="none" stroke="#64748b" stroke-width="1.5" stroke-linejoin="round" />
            </marker>
            <!-- 依赖：细虚线 + 开口箭头（更轻） -->
            <marker
              :id="`${mkId}-dep`"
              markerWidth="11"
              markerHeight="9"
              refX="9"
              refY="4.5"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,-3.5 L9,0 L0,3.5" fill="none" stroke="#64748b" stroke-width="1.2" stroke-linejoin="round" />
            </marker>
          </defs>

          <rect
            class="cde-svg-bg"
            :x="-WORLD_HALF"
            :y="-WORLD_HALF"
            :width="WORLD_SIZE"
            :height="WORLD_SIZE"
            fill="transparent"
            @pointerdown="onSvgBackgroundPointerDown"
            @contextmenu="onBackgroundContextMenu"
          />

          <g
            v-for="(c, idx) in state.classes"
            :key="`${c.id}::${idx}`"
            :transform="`translate(${positions[c.id]?.x ?? 0}, ${positions[c.id]?.y ?? 0})`"
            @pointerdown="onSvgClassPointerDown($event, c.id)"
            @pointermove="onSvgClassPointerMove($event, c.id)"
            @pointerup="onSvgClassPointerUp($event, c.id)"
            @dblclick.stop="onClassDblClick(c.id)"
            @contextmenu="onClassContextMenu($event, c.id)"
          >
            <polygon
              v-if="!layoutOnly"
              points="124,-14 116,0 132,0"
              :fill="selectedInheritHandleClassId === c.id || isClassSelected(c.id) ? '#2563eb' : '#94a3b8'"
              stroke="#334155"
              :stroke-width="selectedInheritHandleClassId === c.id ? 2 : 1"
              class="cde-inherit-handle"
              @pointerdown.stop="startInheritDrag($event, c.id, 'top')"
            >
              <title>{{ cd.cdsInheritHandleHint }}</title>
            </polygon>
            <rect
              class="cde-class-body"
              x="0"
              y="0"
              width="248"
              :height="classBoxSize(c).h"
              :fill="classBodyFill(c, idx)"
              :stroke="isClassSelected(c.id) ? '#2563eb' : classBodyStroke(c, idx)"
              :stroke-width="isClassSelected(c.id) ? 3 : 2"
              rx="4"
              style="pointer-events: visiblePainted"
            />
            <g v-if="classOutOfBoundModel(c)">
              <circle cx="236" cy="12" r="8" fill="#dc2626" />
              <text
                x="236"
                y="15"
                text-anchor="middle"
                font-size="10"
                font-weight="700"
                fill="#fff"
                style="pointer-events: none; user-select: none"
              >
                !
              </text>
            </g>
            <text
              v-if="classStereotype(c)"
              x="124"
              y="14"
              text-anchor="middle"
              font-size="9"
              :fill="isDarkTheme() ? '#94a3b8' : '#475569'"
              style="pointer-events: none; user-select: none"
            >
              «{{ escapeXml(classStereotype(c)) }}»
            </text>
            <text
              x="124"
              :y="titleNameY(c)"
              text-anchor="middle"
              font-size="11"
              font-weight="700"
              :fill="isDarkTheme() ? '#f1f5f9' : '#0f172a'"
              style="pointer-events: none; user-select: none"
            >
              <title>{{ classDisplayLabel(c) }}</title>
              {{ escapeXml(classDisplayLabel(c)) }}
            </text>
            <polygon
              v-if="!layoutOnly"
              points="-16,18 0,10 0,26"
              :fill="isDarkTheme() ? '#94a3b8' : '#475569'"
              style="cursor: default"
            />
            <polygon
              v-if="!layoutOnly"
              points="248,18 264,10 264,26"
              :fill="isDarkTheme() ? '#cbd5e1' : '#334155'"
              class="cde-dependency-handle"
              @pointerdown.stop="startDependencyDrag($event, c.id)"
            >
              <title>{{ locale === 'en' ? 'Drag to target class to create dependency' : '拖到目标类以创建依赖关系' }}</title>
            </polygon>
            <template v-for="(sec, si) in previewSections(c)" :key="'pv-sec-' + si">
              <text
                :x="PREVIEW_LABEL_X"
                :y="previewSectionLabelY(c, si)"
                font-size="9"
                font-family="ui-monospace, Consolas, monospace"
                :fill="isDarkTheme() ? '#e2e8f0' : '#0f172a'"
                style="pointer-events: none; user-select: none"
              >
                {{ sec.label }}:
              </text>
              <text
                v-for="(line, li) in sec.lines"
                :key="'pv-ln-' + si + '-' + li"
                :x="PREVIEW_CONTENT_X"
                :y="previewSectionLineY(c, si, li)"
                font-size="9"
                font-family="ui-monospace, Consolas, monospace"
                :fill="isDarkTheme() ? '#e2e8f0' : '#0f172a'"
                style="pointer-events: none; user-select: none"
              >
                {{ escapeXml(previewIndentedLine(line)) }}
              </text>
            </template>
            <polygon
              v-for="h in layoutOnly ? [] : rightHandleRows(c)"
              :key="'memb-handle-' + h.key"
              :points="`264,${previewSectionLineY(c, h.sectionIndex, h.lineIndex) - 4} 248,${previewSectionLineY(c, h.sectionIndex, h.lineIndex) - 12} 248,${previewSectionLineY(c, h.sectionIndex, h.lineIndex) + 4}`"
              :fill="isDarkTheme() ? '#93c5fd' : '#2563eb'"
              style="cursor: crosshair"
              @pointerdown.stop="startAssociationDrag($event, c.id, h.sectionIndex, h.lineIndex, 'right')"
            />
            <template v-if="false">
              <line
                :x1="6"
                :y1="attrBlockTopY(c) - 1"
                :x2="242"
                :y2="attrBlockTopY(c) - 1"
                :stroke="isDarkTheme() ? 'rgba(148,163,184,0.45)' : 'rgba(71,85,105,0.35)'"
                stroke-width="1"
                style="pointer-events: none"
              />
              <text
                :x="10"
                :y="attrBlockTopY(c) + 8"
                font-size="8"
                font-weight="600"
                :fill="isDarkTheme() ? '#94a3b8' : '#64748b'"
                style="pointer-events: none; user-select: none"
              >
                {{ cd.cdeSectionAttrs }}
              </text>
              <rect
                x="5"
                :y="attrBlockTopY(c)"
                width="238"
                :height="attrBlockHeight(c)"
                :fill="classAttrBg(c, idx)"
                :stroke="isDarkTheme() ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.25)'"
                stroke-width="1"
                rx="2"
                style="pointer-events: none"
              />
              <text
                v-for="(a, ai) in displayAttributes(c)"
                :key="'a' + ai"
                x="10"
                :y="attrTextY(c, ai)"
                font-size="10"
                font-family="ui-monospace, Consolas, monospace"
                :fill="memberAttrFill(a)"
                :font-style="memberFontStyle(a)"
                style="pointer-events: none; user-select: none"
              >
                {{ escapeXml(a) }}
              </text>
              <template>
                <line
                  :x1="6"
                  :y1="propBlockTopY(c) - 1"
                  :x2="242"
                  :y2="propBlockTopY(c) - 1"
                  :stroke="isDarkTheme() ? 'rgba(148,163,184,0.45)' : 'rgba(71,85,105,0.35)'"
                  stroke-width="1"
                  style="pointer-events: none"
                />
                <text
                  :x="10"
                  :y="propBlockTopY(c) + 8"
                  font-size="8"
                  font-weight="600"
                  :fill="isDarkTheme() ? '#94a3b8' : '#64748b'"
                  style="pointer-events: none; user-select: none"
                >
                  {{ cd.cdeSectionProps }}
                </text>
                <rect
                  x="5"
                  :y="propBlockTopY(c)"
                  width="238"
                  :height="propBlockHeight(c)"
                  :fill="classAttrBg(c, idx)"
                  :stroke="isDarkTheme() ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.25)'"
                  stroke-width="1"
                  rx="2"
                  style="pointer-events: none"
                />
                <text
                  v-for="(pv, pi) in displayProperties(c)"
                  :key="'p' + pi"
                  x="10"
                  :y="propTextY(c, pi)"
                  font-size="10"
                  font-family="ui-monospace, Consolas, monospace"
                  :fill="memberAttrFill(pv)"
                  :font-style="memberFontStyle(pv)"
                  style="pointer-events: none; user-select: none"
                >
                  {{ escapeXml(pv) }}
                </text>
              </template>
              <line
                :x1="6"
                :y1="methBlockTopY(c) - 1"
                :x2="242"
                :y2="methBlockTopY(c) - 1"
                :stroke="isDarkTheme() ? 'rgba(148,163,184,0.45)' : 'rgba(71,85,105,0.35)'"
                stroke-width="1"
                style="pointer-events: none"
              />
              <text
                :x="10"
                :y="methBlockTopY(c) + 8"
                font-size="8"
                font-weight="600"
                :fill="isDarkTheme() ? '#94a3b8' : '#64748b'"
                style="pointer-events: none; user-select: none"
              >
                {{ cd.cdeSectionMethods }}
              </text>
              <template>
                <line
                  :x1="6"
                  :y1="enumBlockTopY(c) - 1"
                  :x2="242"
                  :y2="enumBlockTopY(c) - 1"
                  :stroke="isDarkTheme() ? 'rgba(148,163,184,0.45)' : 'rgba(71,85,105,0.35)'"
                  stroke-width="1"
                  style="pointer-events: none"
                />
                <text
                  :x="10"
                  :y="enumBlockTopY(c) + 8"
                  font-size="8"
                  font-weight="600"
                  :fill="isDarkTheme() ? '#94a3b8' : '#64748b'"
                  style="pointer-events: none; user-select: none"
                >
                  {{ cd.cdeSectionEnums }}
                </text>
                <rect
                  x="5"
                  :y="enumBlockTopY(c)"
                  width="238"
                  :height="enumBlockHeight(c)"
                  :fill="classAttrBg(c, idx)"
                  :stroke="isDarkTheme() ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.25)'"
                  stroke-width="1"
                  rx="2"
                  style="pointer-events: none"
                />
                <text
                  v-for="(ev, ei) in displayEnumLiterals(c)"
                  :key="'e' + ei"
                  x="10"
                  :y="enumTextY(c, ei)"
                  font-size="10"
                  font-family="ui-monospace, Consolas, monospace"
                  :fill="memberAttrFill(ev)"
                  :font-style="memberFontStyle(ev)"
                  style="pointer-events: none; user-select: none"
                >
                  {{ escapeXml(ev) }}
                </text>
              </template>
              <rect
                x="5"
                :y="methBlockTopY(c)"
                width="238"
                :height="methBlockHeight(c)"
                :fill="classMethBg(c, idx)"
                :stroke="isDarkTheme() ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.25)'"
                stroke-width="1"
                rx="2"
                style="pointer-events: none"
              />
              <text
                v-for="(meth, mi) in displayMethods(c)"
                :key="'m' + mi"
                x="10"
                :y="methTextY(c, mi)"
                font-size="10"
                font-family="ui-monospace, Consolas, monospace"
                :fill="memberMethFill(meth)"
                :font-style="memberFontStyle(meth)"
                style="pointer-events: none; user-select: none"
              >
                {{ escapeXml(meth) }}
              </text>
            </template>
          </g>

          <template v-for="ep in edgePaths" :key="ep.id">
            <path
              :d="ep.d"
              fill="none"
              stroke="transparent"
              stroke-width="14"
              style="pointer-events: visibleStroke; cursor: pointer"
              @pointerdown="onEdgePointerDown($event, ep.id)"
              @contextmenu="onEdgeContextMenu($event, ep.id)"
              @dblclick="onEdgeDblClick($event, ep.id)"
            />
            <path
              :d="ep.d"
              fill="none"
              :stroke="selectedEdgeId === ep.id ? '#2563eb' : ep.kind === 'inherit' ? '#475569' : '#64748b'"
              :stroke-width="selectedEdgeId === ep.id ? 3 : ep.kind === 'inherit' ? 2 : ep.kind === 'dependency' ? 1.4 : 1.75"
              :stroke-dasharray="ep.dash"
              :marker-end="ep.markerEnd ?? 'none'"
              style="pointer-events: visibleStroke; cursor: pointer"
              @pointerdown="onEdgePointerDown($event, ep.id)"
              @contextmenu="onEdgeContextMenu($event, ep.id)"
              @dblclick="onEdgeDblClick($event, ep.id)"
            />
            <text
              v-if="ep.fromMult"
              :x="ep.lx"
              :y="ep.ly"
              font-size="9"
              fill="#64748b"
              text-anchor="middle"
              style="pointer-events: none; user-select: none"
            >
              {{ escapeXml(ep.fromMult) }}
            </text>
            <text
              v-if="ep.toMult"
              :x="ep.rx"
              :y="ep.ry"
              font-size="9"
              fill="#64748b"
              text-anchor="middle"
              style="pointer-events: none; user-select: none"
            >
              {{ escapeXml(ep.toMult) }}
            </text>
          </template>

          <path
            v-if="tempInheritLine"
            :d="`M ${tempInheritLine.x1} ${tempInheritLine.y1} L ${tempInheritLine.x2} ${tempInheritLine.y2}`"
            fill="none"
            stroke="#2563eb"
            stroke-width="2"
            stroke-dasharray="6 4"
            pointer-events="none"
          />
          <path
            v-if="tempAssociationLine"
            :d="`M ${tempAssociationLine.x1} ${tempAssociationLine.y1} L ${tempAssociationLine.x2} ${tempAssociationLine.y2}`"
            fill="none"
            stroke="#2563eb"
            stroke-width="2"
            stroke-dasharray="6 4"
            pointer-events="none"
          />
          <path
            v-if="tempDependencyLine"
            :d="`M ${tempDependencyLine.x1} ${tempDependencyLine.y1} L ${tempDependencyLine.x2} ${tempDependencyLine.y2}`"
            fill="none"
            stroke="#64748b"
            stroke-width="2"
            stroke-dasharray="6 4"
            pointer-events="none"
          />
          <rect
            v-if="marqueeNorm"
            class="cde-marquee-rect"
            :x="marqueeNorm.x"
            :y="marqueeNorm.y"
            :width="marqueeNorm.w"
            :height="marqueeNorm.h"
            fill="rgba(37, 99, 235, 0.12)"
            stroke="#2563eb"
            stroke-width="1"
            stroke-dasharray="4 3"
            pointer-events="none"
          />
        </svg>
      </div>

      <div class="cde-left-stack">
        <div class="cde-panel cde-panel--shortcuts" :class="{ 'cde-panel--collapsed': !shortcutsOpen }">
          <button
            type="button"
            class="cde-panel__toggle"
            :aria-expanded="shortcutsOpen"
            :title="`${cd.cdeShortcutsPanel} — ${noGlobalShortcutText}`"
            @click="shortcutsOpen = !shortcutsOpen"
          >
            {{ cd.cdeShortcutsPanel }}
            <span class="cde-panel__glyph">{{ shortcutsOpen ? '▴' : '▾' }}</span>
          </button>
          <pre v-show="shortcutsOpen" class="cde-panel__body">{{ cd.cdeShortcutsBody }}</pre>
        </div>

        <div class="cde-canvas-toolbar" role="toolbar" :aria-label="cd.cdeToolbarAria">
          <label class="cde-canvas-toolbar__select-wrap" :title="`${cd.cdeLayoutBeauty} — ${layoutBeautyLabel}`">
            <span class="cde-canvas-toolbar__select-label">{{ cd.cdeLayoutBeauty }}</span>
            <select v-model="layoutBeautyMode" class="cde-canvas-toolbar__select">
              <option value="fast">{{ cd.cdeLayoutBeautyFast }}</option>
              <option value="balanced">{{ cd.cdeLayoutBeautyBalanced }}</option>
              <option value="polish">{{ cd.cdeLayoutBeautyPolish }}</option>
            </select>
          </label>
          <button
            type="button"
            class="cde-canvas-toolbar__btn"
            :aria-label="cd.cdeAutoLayout"
            :title="`${cd.cdeAutoLayout} (${layoutBeautyLabel}) — ${noGlobalShortcutText}`"
            @click="autoLayoutClasses"
          >
            <svg class="cde-canvas-toolbar__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <rect x="3" y="4" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6" />
              <rect x="15" y="4" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6" />
              <rect x="9" y="14" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M9 7h6M12 10v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            </svg>
          </button>
          <button
            v-if="!layoutOnly"
            type="button"
            class="cde-canvas-toolbar__btn"
            :aria-label="cd.cdeNewClass"
            :title="`${cd.cdeNewClassHint} — ${noGlobalShortcutText}`"
            @click="addNewClass"
          >
            <svg class="cde-canvas-toolbar__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.75" />
              <path
                d="M12 8v8M8 12h8"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="cde-panel cde-panel--visibility" :class="{ 'cde-panel--collapsed': !visibilityOpen }">
        <button
          type="button"
          class="cde-panel__toggle"
          :aria-expanded="visibilityOpen"
          :title="`${cd.cdeVisibilityPanel} — ${noGlobalShortcutText}`"
          @click="visibilityOpen = !visibilityOpen"
        >
          {{ cd.cdeVisibilityPanel }}
          <span class="cde-panel__glyph">{{ visibilityOpen ? '▴' : '▾' }}</span>
        </button>
        <div v-show="visibilityOpen" class="cde-panel__body cde-panel__checks">
          <label class="cde-check">
            <input v-model="edgeVisibility.inherit" type="checkbox" @change="pushPayload()" />
            {{ cd.cdeShowInherit }}
          </label>
          <label class="cde-check">
            <input v-model="edgeVisibility.association" type="checkbox" @change="pushPayload()" />
            {{ cd.cdeShowAssoc }}
          </label>
        </div>
      </div>

      <div class="cde-hud" aria-hidden="false">
        <div class="cde-hud__row cde-hud__row--tools">
          <button
            type="button"
            class="cde-hud__mini cde-hud__iconbtn"
            :aria-label="cd.cdeFit"
            :title="`${cd.cdeFit} — ${noGlobalShortcutText}`"
            @click="fitAll"
          >
            <span class="cde-hud__glyph" aria-hidden="true">⤢</span>
          </button>
          <button
            type="button"
            class="cde-hud__mini cde-hud__iconbtn"
            :aria-label="cd.cdeOrigin"
            :title="`${cd.cdeOrigin} — ${noGlobalShortcutText}`"
            @click="originCenter"
          >
            <span class="cde-hud__glyph" aria-hidden="true">◎</span>
          </button>
          <button
            type="button"
            class="cde-hud__mini cde-hud__iconbtn"
            :aria-label="cd.cdeResetZoom"
            :title="`${cd.cdeResetZoom} — ${noGlobalShortcutText}`"
            @click="resetZoom100"
          >
            <span class="cde-hud__glyph" aria-hidden="true">↺</span>
          </button>
        </div>
        <div class="cde-hud__row cde-hud__row--zoom">
          <button type="button" class="cde-hud__zoombtn" :title="`${cd.cdeZoomOut} — ${noGlobalShortcutText}`" @click="zoomDelta(-0.1)">
            −
          </button>
          <span class="cde-hud__pct">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="cde-hud__zoombtn" :title="`${cd.cdeZoomIn} — ${noGlobalShortcutText}`" @click="zoomDelta(0.1)">
            +
          </button>
        </div>
      </div>

      <div
        v-if="ctx.open"
        class="cde-ctx"
        :class="{ 'cde-ctx--wide': canUseRelatedTypesMenu }"
        :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }"
        role="menu"
        @click.stop
      >
        <button type="button" @click="openClassifierFromDiagram(ctx.classId)">{{ cd.cdeOpenCodespaceClass }}</button>
        <template v-if="canUseRelatedTypesMenu">
          <div class="cde-ctx-group">
            <div class="cde-ctx-sub">{{ cd.cdeCtxAddRelatedHeader }}</div>
            <template v-if="ctxRelatedInheritanceRows.length">
              <div class="cde-ctx-hint">{{ cd.cdeCtxRelatedInheritance }}</div>
              <button
                v-for="r in ctxRelatedInheritanceRows"
                :key="'rel-inh-' + r.classId"
                type="button"
                @click="addRelatedClassifierFromTree(r, 'inherit')"
              >
                + {{ labelForCodespaceTreeRow(r) }}
              </button>
            </template>
            <template v-if="ctxRelatedAssociationRows.length">
              <div class="cde-ctx-hint">{{ cd.cdeCtxRelatedAssociation }}</div>
              <button
                v-for="r in ctxRelatedAssociationRows"
                :key="'rel-asc-' + r.classId"
                type="button"
                @click="addRelatedClassifierFromTree(r, 'association')"
              >
                + {{ labelForCodespaceTreeRow(r) }}
              </button>
            </template>
            <div
              v-if="ctxRelatedOneHopPack && !ctxRelatedInheritanceRows.length && !ctxRelatedAssociationRows.length"
              class="cde-ctx-muted"
            >
              {{ cd.cdeCtxRelatedNone }}
            </div>
            <div v-if="!ctxRelatedOneHopPack" class="cde-ctx-muted">{{ cd.cdeCtxRelatedNoResolve }}</div>
          </div>
        </template>
        <template v-else-if="!layoutOnly">
          <div class="cde-ctx-group">
            <div class="cde-ctx-muted">{{ cd.cdeCtxRelatedNeedModel }}</div>
          </div>
        </template>
        <button type="button" class="cde-ctx-danger" @click="deleteClass(ctx.classId)">{{ cd.cdeDeleteClass }}</button>
      </div>
      <div
        v-if="edgeCtx.open"
        class="cde-ctx cde-edgectx"
        :style="{ left: edgeCtx.x + 'px', top: edgeCtx.y + 'px' }"
        role="menu"
        @click.stop
      >
        <button type="button" @click="openEdgeEditor(edgeCtx.edgeId, edgeCtx.x, edgeCtx.y)">
          {{ locale === 'en' ? 'Edit edge' : '编辑连线' }}
        </button>
        <button type="button" class="cde-ctx-danger" @click="deleteEdge(edgeCtx.edgeId)">
          {{ locale === 'en' ? 'Delete edge' : '删除连线' }}
        </button>
      </div>
      <div
        v-if="edgeEditor.open && selectedEdge"
        class="cde-ctx cde-edgeedit"
        :style="{ left: edgeEditor.x + 'px', top: edgeEditor.y + 'px' }"
        role="dialog"
        @click.stop
      >
        <div class="cde-edgeedit-title">{{ locale === 'en' ? 'Edit edge' : '编辑连线' }}</div>
        <label class="cde-edgeedit-row">
          <span>kind</span>
          <select
            :value="selectedEdge.kind"
            @change="patchEdge({ kind: ($event.target as HTMLSelectElement).value as 'inherit' | 'association' | 'dependency' })"
          >
            <option value="inherit">inherit</option>
            <option value="association">association</option>
            <option value="dependency">dependency</option>
          </select>
        </label>
        <label class="cde-edgeedit-row">
          <span>shape</span>
          <select
            :value="selectedEdgeRender"
            @change="patchEdgeRender(($event.target as HTMLSelectElement).value as 'straight' | 'orthogonal' | 'curve')"
          >
            <option value="straight">{{ locale === 'en' ? 'Straight' : '直线' }}</option>
            <option value="orthogonal">{{ locale === 'en' ? 'Orthogonal' : '折线' }}</option>
            <option value="curve">{{ locale === 'en' ? 'Curve' : '曲线' }}</option>
          </select>
        </label>
        <label class="cde-edgeedit-row">
          <span>fromMult</span>
          <input
            :value="selectedEdge.fromMult ?? ''"
            @input="patchEdge({ fromMult: ($event.target as HTMLInputElement).value })"
          />
        </label>
        <label class="cde-edgeedit-row">
          <span>toMult</span>
          <input
            :value="selectedEdge.toMult ?? ''"
            @input="patchEdge({ toMult: ($event.target as HTMLInputElement).value })"
          />
        </label>
        <div class="cde-edgeedit-actions">
          <button type="button" @click="edgeEditor.open = false">{{ locale === 'en' ? 'Close' : '关闭' }}</button>
          <button type="button" class="cde-ctx-danger" @click="deleteEdge(selectedEdge.id)">
            {{ locale === 'en' ? 'Delete edge' : '删除连线' }}
          </button>
        </div>
      </div>
      <div
        v-if="addCtx.open"
        class="cde-addctx"
        :style="{ left: addCtx.x + 'px', top: addCtx.y + 'px' }"
        role="dialog"
        @click.stop
        @wheel.stop
      >
        <div class="cde-addctx-title">{{ locale === 'en' ? 'Add class from bound model' : '从已绑定 model 添加 class' }}</div>
        <div class="cde-addctx-custom">
          <input
            :value="customClassName"
            type="text"
            class="cde-addctx-search"
            :placeholder="locale === 'en' ? 'Add a new class name (will sync to model)' : '新增不存在的 class 名称（会同步到 model）'"
            @input="onCustomClassInput"
            @keydown.enter.prevent="addCustomClassAndSyncModel"
          />
          <button type="button" class="cde-addctx-custom-btn" :disabled="!!customClassWarn" @click="addCustomClassAndSyncModel">
            {{ locale === 'en' ? 'Add new class' : '添加新 class' }}
          </button>
        </div>
        <p v-if="customClassWarn" class="cde-addctx-warn">{{ customClassWarn }}</p>
        <input
          :value="classSearch"
          type="text"
          class="cde-addctx-search"
          :placeholder="locale === 'en' ? 'Search module / namespace / class' : '搜索 module / namespace / class'"
          @input="onClassSearchInput"
        />
        <p v-if="classSearchWarn" class="cde-addctx-warn">{{ classSearchWarn }}</p>
        <div class="cde-addctx-list" @wheel.stop>
          <div v-if="!codespaceClassRows.length" class="cde-addctx-empty">
            {{ locale === 'en' ? 'No class matched for adding' : '未匹配到可添加的 class' }}
          </div>
          <div v-for="row in codespaceHierarchyRows" :key="row.key">
            <div
              v-if="row.kind === 'module'"
              class="cde-addctx-node cde-addctx-node--module"
              :style="{ paddingLeft: `${row.level * 16}px` }"
            >
              {{ row.label }}
            </div>
            <div
              v-else-if="row.kind === 'namespace'"
              class="cde-addctx-node cde-addctx-node--namespace"
              :style="{ paddingLeft: `${row.level * 16}px` }"
            >
              {{ row.label }}
            </div>
            <button
              v-else
              type="button"
              class="cde-addctx-item"
              :style="{ marginLeft: `${row.level * 16}px` }"
              @click="addClassFromCodespace(row.item)"
            >
              <span class="cde-addctx-item-class">{{ row.label }}</span>
              <span v-if="isClassAlreadyAdded(row.item)" class="cde-addctx-item-added">{{ locale === 'en' ? 'Added' : '已添加' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cde {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--canvas-bg, #eceff4);
  user-select: none;
  -webkit-user-select: none;
}
:root[data-theme='dark'] .cde {
  --canvas-bg: #1a1b1f;
}

.cde-viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  cursor: default;
  touch-action: none;
}
.cde-model-source-error {
  position: absolute;
  z-index: 10;
  left: 12px;
  right: 12px;
  top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #f59e0b;
  background: rgba(254, 243, 199, 0.95);
  color: #7c2d12;
  font-size: 12px;
  line-height: 1.45;
  pointer-events: none;
}
:root[data-theme='dark'] .cde-model-source-error {
  border-color: #fbbf24;
  background: rgba(120, 53, 15, 0.92);
  color: #fde68a;
}
.cde-model-source-error--info {
  border-color: #93c5fd;
  background: rgba(219, 234, 254, 0.95);
  color: #1e3a5f;
}
:root[data-theme='dark'] .cde-model-source-error--info {
  border-color: #3b82f6;
  background: rgba(30, 58, 138, 0.88);
  color: #dbeafe;
}
.cde-viewport--panning {
  cursor: grabbing;
}
.cde-viewport--marquee .cde-svg .cde-svg-bg {
  cursor: crosshair;
}
.cde-viewport--dragging .cde-class-body {
  cursor: move;
}

.cde-world {
  position: relative;
  display: inline-block;
  transform-origin: 0 0;
}

.cde-grid {
  position: absolute;
  left: -100000px;
  top: -100000px;
  width: 200000px;
  height: 200000px;
  pointer-events: none;
  z-index: 0;
  background-color: var(--uml-paper-bg, #f8fafc);
  background-image: linear-gradient(
      to right,
      var(--uml-grid-major, rgba(15, 23, 42, 0.07)) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, var(--uml-grid-major, rgba(15, 23, 42, 0.07)) 1px, transparent 1px);
  background-size: 24px 24px;
}
:root[data-theme='dark'] .cde-grid {
  --uml-paper-bg: #1c2028;
  --uml-grid-major: rgba(236, 239, 244, 0.07);
}

.cde-svg {
  position: relative;
  z-index: 1;
  display: block;
  /* Allow class groups with negative x/y to remain visible instead of clipping at svg viewport origin. */
  overflow: visible;
}

.cde-svg-bg {
  cursor: default;
}

.cde-class-body {
  cursor: move;
}

.cde-fold-hit {
  cursor: pointer;
}

.cde-inherit-handle {
  cursor: crosshair;
}

.cde-dependency-handle {
  cursor: alias;
}

.cde-left-stack {
  position: absolute;
  z-index: 8;
  left: 12px;
  top: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  max-width: min(280px, 42vw);
  pointer-events: none;
}
.cde-left-stack > * {
  pointer-events: auto;
}

.cde-canvas-toolbar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 94%, transparent);
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.cde-canvas-toolbar__select-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 4px 2px 6px;
}
.cde-canvas-toolbar__select-label {
  font-size: 10px;
  line-height: 1;
  color: var(--muted, #64748b);
  text-align: center;
}
.cde-canvas-toolbar__select {
  height: 1.55rem;
  border: 1px solid var(--border, #cbd5e1);
  border-radius: 5px;
  background: var(--editor-bg, #fff);
  color: var(--text, #0f172a);
  font-size: 11px;
  padding: 0 4px;
}
.cde-canvas-toolbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text, #0f172a);
  background: var(--editor-bg, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.cde-canvas-toolbar__btn:hover {
  background: color-mix(in srgb, var(--editor-bg, #fff) 88%, #2563eb);
  color: #1d4ed8;
}
.cde-canvas-toolbar__icon {
  display: block;
}

.cde-panel {
  max-width: min(280px, 42vw);
  border-radius: 6px;
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 94%, transparent);
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 0.72rem;
}
.cde-panel--shortcuts {
  position: relative;
}
.cde-panel--visibility {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 8;
}
.cde-panel__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: transparent;
  text-align: left;
}
.cde-panel__glyph {
  opacity: 0.75;
  font-size: 0.65rem;
}
.cde-panel__body {
  margin: 0;
  padding: 0 10px 8px;
  max-height: 12rem;
  overflow: auto;
  line-height: 1.35;
  white-space: pre-wrap;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.68rem;
}
.cde-panel__checks {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cde-check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.cde-hud {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 7;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}
.cde-hud__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 65%, transparent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.cde-hud__row--tools .cde-hud__mini {
  pointer-events: auto;
}
.cde-hud__iconbtn {
  font: inherit;
  min-width: 2rem;
  height: 2rem;
  padding: 0 6px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cde-hud__glyph {
  font-size: 1.05rem;
  line-height: 1;
}
.cde-hud__row--zoom {
  pointer-events: auto;
}
.cde-hud__pct {
  min-width: 3.5em;
  text-align: center;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
}
.cde-hud__zoombtn {
  font: inherit;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
}

.cde-ctx {
  position: fixed;
  z-index: 100;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 4px;
  border-radius: 6px;
  background: var(--editor-bg, #fff);
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
.cde-ctx button {
  font: inherit;
  font-size: 0.78rem;
  text-align: left;
  padding: 6px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
}
.cde-ctx button:hover {
  background: var(--menu-hover, rgba(0, 0, 0, 0.06));
}
.cde-ctx .cde-ctx-danger {
  color: #b91c1c;
}
.cde-ctx--wide {
  min-width: 220px;
  max-width: min(380px, 82vw);
}
.cde-ctx-group {
  border-top: 1px solid var(--border, #e2e8f0);
  padding-top: 6px;
  margin-top: 6px;
}
.cde-ctx-sub {
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  padding: 2px 4px 6px;
}
.cde-ctx-hint {
  font-size: 0.68rem;
  font-weight: 600;
  color: #64748b;
  padding: 6px 4px 2px;
}
.cde-ctx-muted {
  font-size: 0.72rem;
  color: #94a3b8;
  padding: 4px;
  line-height: 1.35;
}
.cde-edgeedit {
  min-width: 220px;
}
.cde-edgeedit-title {
  font-size: 0.78rem;
  font-weight: 700;
  margin-bottom: 6px;
}
.cde-edgeedit-row {
  display: grid;
  grid-template-columns: 66px 1fr;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.cde-edgeedit-row span {
  font-size: 0.72rem;
  color: #475569;
}
.cde-edgeedit-row input,
.cde-edgeedit-row select {
  font: inherit;
  border: 1px solid var(--border, #d4d4d8);
  border-radius: 6px;
  padding: 3px 6px;
  background: #fff;
  color: #111827;
}
.cde-edgeedit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}
.cde-addctx {
  position: fixed;
  z-index: 101;
  display: flex;
  flex-direction: column;
  width: min(460px, 70vw);
  max-height: min(62vh, 520px);
  padding: 8px;
  border-radius: 8px;
  background: var(--editor-bg, #fff);
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.cde-addctx-title {
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 6px;
}
.cde-addctx-search {
  width: 100%;
  font: inherit;
  font-size: 0.8rem;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}
.cde-addctx-list {
  margin-top: 8px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overscroll-behavior: contain;
}
.cde-addctx-custom {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}
.cde-addctx-custom-btn {
  font: inherit;
  font-size: 0.78rem;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
}
.cde-addctx-custom-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cde-addctx-warn {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: #b45309;
}
.cde-addctx-empty {
  font-size: 0.78rem;
  color: #64748b;
  padding: 6px 2px;
}
.cde-addctx-item {
  font: inherit;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  padding: 6px 8px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 8px;
}
.cde-addctx-item:hover {
  background: #f8fafc;
}
.cde-addctx-item-class {
  font-size: 0.82rem;
  font-weight: 600;
  color: #0f172a;
}
.cde-addctx-item-added {
  font-size: 0.72rem;
  color: #0f766e;
}
.cde-addctx-node {
  font-size: 0.78rem;
  line-height: 1.45;
  padding: 4px 2px;
}
.cde-addctx-node--module {
  font-weight: 700;
  color: #0f172a;
  margin-top: 4px;
}
.cde-addctx-node--namespace {
  color: #475569;
}
.cde-addctx-group {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px;
  background: #fff;
}
.cde-addctx-group-title {
  font-size: 0.72rem;
  color: #64748b;
  margin: 0 0 6px;
}
</style>
