<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  type ClassDef,
  type ClassDiagramState,
  type ClassPositions,
  type ClassDiagramEdgeVisibility,
  buildClassDiagramViewPayload,
  classDiagramHeaderHeight,
  diagramBounds,
  parseViewPayloadClassDiagram,
  slug,
} from '../../utils/uml-class-payload';
import { useAppLocale } from '../../composables/useAppLocale';
import { classDiagramCanvasMessages } from '../../i18n/class-diagram-canvas-messages';
import type { CodespaceClassTreeItem } from '../../utils/class-canvas-codespace-bridge';
import { UmlCanvasInteractionService } from '../../application/services/UmlCanvasInteractionService';

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
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  openClassifier: [payload: { classDiagramClassId: string; className: string }];
  createMissingClassifier: [payload: { classId: string; className: string }];
}>();

const { locale } = useAppLocale();
const cd = computed(() => classDiagramCanvasMessages[locale.value]);

const mkId = computed(() => `mk-${props.canvasId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
const markerAssocUrl = computed(() => `url(#${mkId.value}-asc)`);
const markerInheritUrl = computed(() => `url(#${mkId.value}-inh)`);
const modelSourceErrorText = computed(() => {
  if (props.modelSourceValid !== false) return '';
  const custom = (props.modelSourceError ?? '').trim();
  return custom || cd.value.cdeModelSourceInvalid;
});
const WORLD_HALF = 100000;
const WORLD_SIZE = WORLD_HALF * 2;

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
const visibilityOpen = ref(true);

const inheritDrag = ref<{ fromId: string } | null>(null);
const tempInheritLine = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
const associationDrag = ref<{ fromId: string; sectionIndex: number; lineIndex: number; anchor: 'left' | 'right' } | null>(null);
const tempAssociationLine = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
const selectedEdgeId = ref<string | null>(null);
const selectedInheritHandleClassId = ref<string | null>(null);
const edgeCtx = reactive({ open: false, x: 0, y: 0, edgeId: '' as string });
const edgeEditor = reactive({ open: false, x: 0, y: 0, edgeId: '' as string });
const associationAnchorByEdge = reactive<Record<string, { sectionIndex: number; lineIndex: number }>>({});
const edgeRenderById = reactive<Record<string, 'straight' | 'orthogonal' | 'curve'>>({});
const interactionService = new UmlCanvasInteractionService();

function ensureClassPosition(classId: string): { x: number; y: number } {
  const p = positions[classId];
  if (p) return p;
  const fallback = { x: 0, y: 0 };
  positions[classId] = fallback;
  return fallback;
}
function openClassMenuAt(classId: string, clientX: number, clientY: number): void {
  edgeCtx.open = false;
  addCtx.open = false;
  selectedIds.value = [classId];
  ctx.open = true;
  ctx.x = clientX;
  ctx.y = clientY;
  ctx.classId = classId;
}

function openBackgroundMenuAt(clientX: number, clientY: number): void {
  edgeCtx.open = false;
  ctx.open = false;
  addCtx.open = true;
  customClassName.value = '';
  addCtx.x = clientX;
  addCtx.y = clientY;
}

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
  state.links.splice(0, state.links.length, ...s.links);
  Object.keys(positions).forEach((k) => delete positions[k]);
  Object.assign(positions, p);
  Object.keys(folded).forEach((k) => delete folded[k]);
  Object.assign(folded, f);
  edgeVisibility.inherit = ev.inherit;
  edgeVisibility.association = ev.association;
  Object.keys(associationAnchorByEdge).forEach((k) => delete associationAnchorByEdge[k]);
  Object.keys(edgeRenderById).forEach((k) => delete edgeRenderById[k]);
  normalizeClassIdentityFromModel(false);
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
    const p = ensureClassPosition(c.id);
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
  const el = viewportRef.value;
  if (el) {
    const r = el.getBoundingClientRect();
    addCtx.x = r.left + 24;
    addCtx.y = r.top + 24;
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

function onClassSearchInput(ev: Event): void {
  const raw = (ev.target as HTMLInputElement).value;
  classSearch.value = raw;
  classSearchWarn.value = SEARCH_ALLOWED_RE.test(raw)
    ? ''
    : '仅允许英文、数字、下划线、点与空格';
}

function onCustomClassInput(ev: Event): void {
  const raw = (ev.target as HTMLInputElement).value;
  customClassName.value = raw;
  customClassWarn.value =
    raw.trim() === '' || CLASS_NAME_RE.test(raw.trim())
      ? ''
      : '类名仅允许英文开头，后续可含英文/数字/下划线';
}

const codespaceClassRows = computed(() => {
  const q = classSearch.value.trim().toLowerCase();
  const src = props.codespaceClasses ?? [];
  const rows = src
    .map((it) => {
      const ns = it.namespacePath.join('.');
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

const codespaceTreeGroups = computed(() => {
  const groups = new Map<string, { pathLabel: string; items: (typeof codespaceClassRows.value)[number][] }>();
  for (const row of codespaceClassRows.value) {
    const g = groups.get(row.pathLabel) ?? { pathLabel: row.pathLabel, items: [] };
    g.items.push(row);
    groups.set(row.pathLabel, g);
  }
  return [...groups.values()].sort((a, b) => a.pathLabel.localeCompare(b.pathLabel));
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
    const ns = r.namespacePath.join('.');
    const full = ns ? `${ns}.${r.className}` : r.className;
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
    const ns = r.namespacePath.join('.');
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
  return c.attributes;
}

function effectiveProperties(c: ClassDef): string[] {
  const fromModel = resolveCodespaceMembers(c)?.props;
  if (fromModel && fromModel.length) return fromModel;
  return [];
}

function effectiveMethods(c: ClassDef): string[] {
  const fromModel = resolveCodespaceMembers(c)?.meths;
  if (fromModel && fromModel.length) return fromModel;
  return c.methods;
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

function rightHandleTipY(c: ClassDef, h: { sectionIndex: number; lineIndex: number }): number {
  return previewSectionLineY(c, h.sectionIndex, h.lineIndex) - 4;
}

function associationSourceTip(
  edgeId: string,
  fromClass: ClassDef,
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
): { x: number; y: number } {
  const rows = rightHandleRows(fromClass);
  if (!rows.length) return { x: fromPos.x + 264, y: fromPos.y + 18 };
  const pinned = associationAnchorByEdge[edgeId];
  if (pinned) {
    const found = rows.find((r) => r.sectionIndex === pinned.sectionIndex && r.lineIndex === pinned.lineIndex);
    if (found) {
      return { x: fromPos.x + 264, y: fromPos.y + rightHandleTipY(fromClass, found) };
    }
  }
  const targetY = toPos.y + 18;
  let best = rows[0]!;
  let bestD = Math.abs(fromPos.y + rightHandleTipY(fromClass, best) - targetY);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const d = Math.abs(fromPos.y + rightHandleTipY(fromClass, r) - targetY);
    if (d < bestD) {
      best = r;
      bestD = d;
    }
  }
  associationAnchorByEdge[edgeId] = { sectionIndex: best.sectionIndex, lineIndex: best.lineIndex };
  return { x: fromPos.x + 264, y: fromPos.y + rightHandleTipY(fromClass, best) };
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
  return state.classes.some(
    (c) => c.id === row.classId || c.name === row.className || slug(c.name) === row.classId,
  );
}

function addClassFromCodespace(row: (typeof codespaceClassRows.value)[number]): void {
  const existing = state.classes.find(
    (c) => c.id === row.classId || c.name === row.className || slug(c.name) === row.classId,
  );
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
    stereotype: null,
    attributes: [],
    methods: [],
  });
  positions[id] = { x: cx - 124, y: cy - 50 };
  selectedIds.value = [id];
  addCtx.open = false;
  pushPayload();
}

function addCustomClassAndSyncModel(): void {
  const raw = customClassName.value.trim();
  if (!raw) return;
  if (!CLASS_NAME_RE.test(raw)) {
    customClassWarn.value = '类名仅允许英文开头，后续可含英文/数字/下划线';
    return;
  }
  const desiredId = slug(raw);
  const existing = state.classes.find(
    (c) => c.id === desiredId || c.name === raw || slug(c.name) === desiredId,
  );
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
    stereotype: null,
    attributes: [],
    methods: [],
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
  const s = (c.stereotype ?? '').toLowerCase();
  if (s === 'interface') return isDarkTheme() ? '#1e3a2f' : '#dcfce7';
  if (s === 'abstract' || s.includes('abstract')) return isDarkTheme() ? '#1e2a3e' : '#dbeafe';
  if (s === 'enumeration' || s === 'enum') return isDarkTheme() ? '#3b2a4a' : '#fae8ff';
  if (s === 'final') return isDarkTheme() ? '#3a2a1a' : '#ffedd5';
  if (s === 'static' || s === 'utility') return isDarkTheme() ? '#2a2d35' : '#e2e8f0';
  const h = (index * 47) % 360;
  return `hsl(${h}, ${isDarkTheme() ? 35 : 58}%, ${isDarkTheme() ? 22 : 88}%)`;
}

function classBodyStroke(c: ClassDef, index: number): string {
  const s = (c.stereotype ?? '').toLowerCase();
  if (s === 'interface') return isDarkTheme() ? '#4ade80' : '#166534';
  if (s === 'abstract' || s.includes('abstract')) return isDarkTheme() ? '#60a5fa' : '#1d4ed8';
  if (s === 'enumeration' || s === 'enum') return isDarkTheme() ? '#c084fc' : '#7e22ce';
  if (s === 'final') return isDarkTheme() ? '#fb923c' : '#c2410c';
  if (s === 'static' || s === 'utility') return isDarkTheme() ? '#94a3b8' : '#475569';
  const h = (index * 47) % 360;
  return `hsl(${h}, 42%, ${isDarkTheme() ? 48 : 42}%)`;
}

function classAttrBg(c: ClassDef, index: number): string {
  const s = (c.stereotype ?? '').toLowerCase();
  if (s === 'interface') return isDarkTheme() ? 'rgba(34, 197, 94, 0.12)' : 'hsl(142, 42%, 96%)';
  if (s === 'abstract' || s.includes('abstract')) return isDarkTheme() ? 'rgba(59, 130, 246, 0.12)' : 'hsl(214, 42%, 96%)';
  const h = (index * 47) % 360;
  return `hsl(${h}, ${isDarkTheme() ? 28 : 42}%, ${isDarkTheme() ? 18 : 96}%)`;
}

function classMethBg(c: ClassDef, index: number): string {
  const s = (c.stereotype ?? '').toLowerCase();
  if (s === 'interface') return isDarkTheme() ? 'rgba(16, 185, 129, 0.1)' : 'hsl(150, 38%, 95%)';
  if (s === 'abstract' || s.includes('abstract')) return isDarkTheme() ? 'rgba(96, 165, 250, 0.1)' : 'hsl(220, 48%, 95%)';
  const h = (index * 47) % 360;
  return `hsl(${(h + 12) % 360}, ${isDarkTheme() ? 30 : 48}%, ${isDarkTheme() ? 16 : 95}%)`;
}

function worldTransform(): Record<string, string> {
  return {
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
    transformOrigin: '0 0',
  };
}

function clientToWorld(clientX: number, clientY: number): { x: number; y: number } {
  return interactionService.clientToWorld(clientX, clientY, viewportRef.value, panX.value, panY.value, scale.value);
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

function fitAll(): void {
  const b = diagramBounds(state, positions, folded);
  const pad = 48;
  const bw = b.maxX - b.minX + pad * 2;
  const bh = b.maxY - b.minY + pad * 2;
  const { w: vw, h: vh } = getViewportSize();
  const sx = vw / bw;
  const sy = vh / bh;
  const next = Math.min(4, Math.max(0.25, Math.min(sx, sy)));
  scale.value = next;
  const ccx = (b.minX + b.maxX) / 2;
  const ccy = (b.minY + b.maxY) / 2;
  panX.value = vw / 2 - next * ccx;
  panY.value = vh / 2 - next * ccy;
}

function originCenter(): void {
  const b = diagramBounds(state, positions, folded);
  const { w: vw, h: vh } = getViewportSize();
  const s = scale.value;
  const ccx = (b.minX + b.maxX) / 2;
  const ccy = (b.minY + b.maxY) / 2;
  panX.value = vw / 2 - s * ccx;
  panY.value = vh / 2 - s * ccy;
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
  // 继承树布局：父类在上、子类在下；多个根按森林横向排列。
  // 纵向间距按每一层节点“真实框高”计算，避免内容多的类框重叠。
  const byId = new Map(classes.map((c) => [c.id, c] as const));
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

  let roots = classes.filter((c) => !hasParent.has(c.id)).map((c) => c.id);
  if (!roots.length) roots = classes.map((c) => c.id);
  roots.sort((a, b) => classDisplayLabel(byId.get(a)!).localeCompare(classDisplayLabel(byId.get(b)!)));

  const hGap = 44;
  const treeGap = 72;
  const vGap = 64;
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
    curX += w + treeGap;
  }

  // Association direction constraint: target class should stay on the right side.
  // Apply multiple passes to propagate shifts across association chains.
  const assocGap = 56;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const l of state.links) {
      if (l.kind !== 'association') continue;
      const fromPos = positions[l.from];
      const toPos = positions[l.to];
      const fromClass = byId.get(l.from);
      if (!fromPos || !toPos || !fromClass) continue;
      const minToX = fromPos.x + classBoxSize(fromClass).w + assocGap;
      if (toPos.x < minToX) {
        positions[l.to] = { ...toPos, x: minToX };
        moved = true;
      }
    }
    if (!moved) break;
  }

  pushPayload();
  fitAll();
}

function classIdAtWorldPoint(wx: number, wy: number): string | null {
  return interactionService.classIdAtWorldPoint(wx, wy, state.classes, positions, classBoxSize);
}

function classIdAtLeftHandlePoint(wx: number, wy: number): string | null {
  for (const c of state.classes) {
    const p = ensureClassPosition(c.id);
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
    const p = ensureClassPosition(c.id);
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
  e.stopPropagation();
  e.preventDefault();
  selectedInheritHandleClassId.value = childId;
  selectedEdgeId.value = null;
  const p = ensureClassPosition(childId);
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
  e.stopPropagation();
  e.preventDefault();
  const p = ensureClassPosition(fromId);
  const c = state.classes.find((x) => x.id === fromId);
  if (!c) return;
  selectedInheritHandleClassId.value = null;
  selectedEdgeId.value = null;
  associationDrag.value = { fromId, sectionIndex, lineIndex, anchor };
  const x1 = anchor === 'left' ? p.x - 16 : p.x + 264;
  const y1 = anchor === 'left' ? p.y + 18 : p.y + rightHandleTipY(c, { sectionIndex, lineIndex });
  const w = clientToWorld(e.clientX, e.clientY);
  tempAssociationLine.value = { x1, y1, x2: w.x, y2: w.y };
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
}

function onGlobalPointerUp(e: PointerEvent): void {
  if (!inheritDrag.value && !associationDrag.value) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const w = clientToWorld(e.clientX, e.clientY);
  const targetId = classIdAtWorldPoint(w.x, w.y);
  if (inheritDrag.value) {
    const childId = inheritDrag.value.fromId;
    inheritDrag.value = null;
    tempInheritLine.value = null;
    if (targetId && targetId !== childId) {
      state.links = state.links.filter((l) => !(l.kind === 'inherit' && l.from === childId));
      const newId = `inh-${Date.now()}`;
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
      state.links.push({
        id: newId,
        from,
        to,
        kind: 'association',
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
}

function onEdgePointerDown(e: PointerEvent, edgeId: string): void {
  e.stopPropagation();
  selectedEdgeId.value = edgeId;
  selectedInheritHandleClassId.value = null;
  ctx.open = false;
  addCtx.open = false;
}

function openEdgeEditor(edgeId: string, x: number, y: number): void {
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
  openEdgeEditor(edgeId, e.clientX, e.clientY);
}

function deleteEdge(edgeId: string): void {
  state.links = state.links.filter((l) => l.id !== edgeId);
  delete associationAnchorByEdge[edgeId];
  delete edgeRenderById[edgeId];
  if (selectedEdgeId.value === edgeId) selectedEdgeId.value = null;
  edgeCtx.open = false;
  if (edgeEditor.edgeId === edgeId) edgeEditor.open = false;
  pushPayload();
}

const selectedEdge = computed(() => state.links.find((l) => l.id === edgeEditor.edgeId));
const selectedEdgeRender = computed<'straight' | 'orthogonal' | 'curve'>(() => edgeRenderById[edgeEditor.edgeId] ?? 'straight');

function patchEdge(part: Partial<{ kind: 'inherit' | 'association' | 'dependency'; fromMult: string; toMult: string }>): void {
  const edge = state.links.find((l) => l.id === edgeEditor.edgeId);
  if (!edge) return;
  if (part.kind !== undefined) edge.kind = part.kind;
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
  const pos = ensureClassPosition(classId);
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
  openClassMenuAt(classId, e.clientX, e.clientY);
}

function onBackgroundContextMenu(e: MouseEvent): void {
  e.preventDefault();
  e.stopPropagation();
  openBackgroundMenuAt(e.clientX, e.clientY);
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

const edgePaths = computed((): EdgePathItem[] => {
  const out: EdgePathItem[] = [];
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
    } else {
      // Association anchors: from right triangle tip -> to left triangle tip.
      const src = associationSourceTip(l.id, fc, p1, p2);
      x1 = src.x;
      y1 = src.y;
      x2 = p2.x - 16;
      y2 = p2.y + 18;
    }
    const render = edgeRenderById[l.id] ?? 'straight';
    if (render === 'orthogonal') {
      const mx = (x1 + x2) / 2;
      dpath = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
    } else if (render === 'curve') {
      const dx = x2 - x1;
      const c1x = x1 + dx * 0.33;
      const c2x = x1 + dx * 0.66;
      dpath = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
    } else {
      dpath = `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const dash = l.kind === 'dependency' ? '6 4' : undefined;
    const markerEnd = l.kind === 'inherit' ? markerInheritUrl.value : markerAssocUrl.value;
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
  return c.stereotype ? 30 : 20;
}

function openClassifierFromDiagram(classId: string): void {
  const c = state.classes.find((x) => x.id === classId);
  if (!c) return;
  emit('openClassifier', { classDiagramClassId: c.id, className: c.name.trim() });
  ctx.open = false;
}

function onClassDblClick(classId: string): void {
  openClassifierFromDiagram(classId);
}

function deleteClass(classId: string): void {
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
      :title="`${cd.cdeFit} · ${cd.cdeOrigin} · ${cd.cdeResetZoom} — 无全局快捷键`"
      @wheel.prevent="onWheel"
      @pointerdown="onViewportPointerDown"
      @pointermove="onViewportPointerMove"
      @pointerup="onViewportPointerUp"
      @pointercancel="onViewportPointerUp"
    >
      <div v-if="modelSourceErrorText" class="cde-model-source-error" role="alert">
        {{ modelSourceErrorText }}
      </div>
      <div class="cde-world" :style="worldTransform()">
        <div class="cde-grid" aria-hidden="true" />
        <svg
          class="cde-svg"
          xmlns="http://www.w3.org/2000/svg"
          :width="WORLD_SIZE"
          :height="WORLD_SIZE"
          style="pointer-events: all"
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
          </defs>

          <rect
            class="cde-svg-bg"
            :x="-WORLD_HALF"
            :y="-WORLD_HALF"
            :width="WORLD_SIZE"
            :height="WORLD_SIZE"
            fill="transparent"
            style="pointer-events: all"
            @pointerdown="onSvgBackgroundPointerDown"
            @contextmenu="onBackgroundContextMenu"
          />

          <g
            v-for="(c, idx) in state.classes"
            :key="c.id"
            :transform="`translate(${positions[c.id]?.x ?? 0}, ${positions[c.id]?.y ?? 0})`"
            style="pointer-events: all"
            @pointerdown="onSvgClassPointerDown($event, c.id)"
            @pointermove="onSvgClassPointerMove($event, c.id)"
            @pointerup="onSvgClassPointerUp($event, c.id)"
            @dblclick.stop="onClassDblClick(c.id)"
            @contextmenu="onClassContextMenu($event, c.id)"
          >
            <polygon
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
              style="pointer-events: all"
              @pointerdown="onSvgClassPointerDown($event, c.id)"
              @pointermove="onSvgClassPointerMove($event, c.id)"
              @pointerup="onSvgClassPointerUp($event, c.id)"
              @contextmenu="onClassContextMenu($event, c.id)"
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
              v-if="c.stereotype"
              x="124"
              y="14"
              text-anchor="middle"
              font-size="9"
              :fill="isDarkTheme() ? '#94a3b8' : '#475569'"
              style="pointer-events: none; user-select: none"
            >
              «{{ escapeXml(c.stereotype) }}»
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
              points="-16,18 0,10 0,26"
              :fill="isDarkTheme() ? '#94a3b8' : '#475569'"
              style="cursor: crosshair"
              @pointerdown.stop="startAssociationDrag($event, c.id, 0, 0, 'left')"
            />
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
              v-for="h in rightHandleRows(c)"
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
              :stroke-width="selectedEdgeId === ep.id ? 3 : ep.kind === 'inherit' ? 2 : 1.75"
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
            :title="`${cd.cdeShortcutsPanel} — 无全局快捷键`"
            @click="shortcutsOpen = !shortcutsOpen"
          >
            {{ cd.cdeShortcutsPanel }}
            <span class="cde-panel__glyph">{{ shortcutsOpen ? '▴' : '▾' }}</span>
          </button>
          <pre v-show="shortcutsOpen" class="cde-panel__body">{{ cd.cdeShortcutsBody }}</pre>
        </div>

        <div class="cde-canvas-toolbar" role="toolbar" :aria-label="cd.cdeToolbarAria">
          <button
            type="button"
            class="cde-canvas-toolbar__btn"
            :aria-label="cd.cdeAutoLayout"
            :title="`${cd.cdeAutoLayout} — 无全局快捷键`"
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
            type="button"
            class="cde-canvas-toolbar__btn"
            :aria-label="cd.cdeNewClass"
            :title="`${cd.cdeNewClassHint} — 无全局快捷键`"
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
          :title="`${cd.cdeVisibilityPanel} — 无全局快捷键`"
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
            :title="`${cd.cdeFit} — 无全局快捷键`"
            @click="fitAll"
          >
            <span class="cde-hud__glyph" aria-hidden="true">⤢</span>
          </button>
          <button
            type="button"
            class="cde-hud__mini cde-hud__iconbtn"
            :aria-label="cd.cdeOrigin"
            :title="`${cd.cdeOrigin} — 无全局快捷键`"
            @click="originCenter"
          >
            <span class="cde-hud__glyph" aria-hidden="true">◎</span>
          </button>
          <button
            type="button"
            class="cde-hud__mini cde-hud__iconbtn"
            :aria-label="cd.cdeResetZoom"
            :title="`${cd.cdeResetZoom} — 无全局快捷键`"
            @click="resetZoom100"
          >
            <span class="cde-hud__glyph" aria-hidden="true">↺</span>
          </button>
        </div>
        <div class="cde-hud__row cde-hud__row--zoom">
          <button type="button" class="cde-hud__zoombtn" :title="`${cd.cdeZoomOut} — 无全局快捷键`" @click="zoomDelta(-0.1)">
            −
          </button>
          <span class="cde-hud__pct">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="cde-hud__zoombtn" :title="`${cd.cdeZoomIn} — 无全局快捷键`" @click="zoomDelta(0.1)">
            +
          </button>
        </div>
      </div>

      <div
        v-if="ctx.open"
        class="cde-ctx"
        :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }"
        role="menu"
        @click.stop
      >
        <button type="button" @click="openClassifierFromDiagram(ctx.classId)">{{ cd.cdeOpenCodespaceClass }}</button>
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
        <div class="cde-addctx-title">从已绑定 model 添加 class</div>
        <div class="cde-addctx-custom">
          <input
            :value="customClassName"
            type="text"
            class="cde-addctx-search"
            placeholder="新增不存在的 class 名称（会同步到 model）"
            @input="onCustomClassInput"
            @keydown.enter.prevent="addCustomClassAndSyncModel"
          />
          <button type="button" class="cde-addctx-custom-btn" :disabled="!!customClassWarn" @click="addCustomClassAndSyncModel">
            添加新 class
          </button>
        </div>
        <p v-if="customClassWarn" class="cde-addctx-warn">{{ customClassWarn }}</p>
        <input
          :value="classSearch"
          type="text"
          class="cde-addctx-search"
          placeholder="搜索 module / namespace / class"
          @input="onClassSearchInput"
        />
        <p v-if="classSearchWarn" class="cde-addctx-warn">{{ classSearchWarn }}</p>
        <div class="cde-addctx-list" @wheel.stop>
          <div v-if="!codespaceClassRows.length" class="cde-addctx-empty">未匹配到可添加的 class</div>
          <div v-for="g in codespaceTreeGroups" :key="'grp-' + g.pathLabel" class="cde-addctx-group">
            <div class="cde-addctx-group-title">{{ g.pathLabel }}</div>
            <button
              v-for="row in g.items"
              :key="`${row.moduleId}/${row.namespacePath.join('.')}/${row.classId}`"
              type="button"
              class="cde-addctx-item"
              @click="addClassFromCodespace(row)"
            >
              <span class="cde-addctx-item-class">{{ row.className }}</span>
              <span v-if="isClassAlreadyAdded(row)" class="cde-addctx-item-added">已添加</span>
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
