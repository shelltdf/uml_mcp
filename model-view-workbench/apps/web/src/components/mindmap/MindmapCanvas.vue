<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { idsInMarquee, pickNodeAt, pointToWorld, zoomAt } from './core/interaction';
import { layoutMindmap } from './core/layout';
import { parseMindmapPayloadText, serializeMindmapPayload } from './core/adapter';
import type { MindmapGraphState, MindmapNodeData } from './core/types';
import type { CodespaceDockContextPayload } from '../../utils/codespace-dock-context';

export interface MindmapDockState {
  selectedId: string | null;
  selectedLabel: string;
  selectedParentId: string | null;
  selectedChildren: number;
  selectedCollapsed: boolean;
  totalNodes: number;
  selectedIcon: string;
  selectedNote: string;
  selectedTextColor: string;
  selectedBgColor: string;
  selectedFontSize: number;
  selectedBorderStyle: 'square' | 'rounded' | 'bottom';
  selectedBorderWidth: number;
  selectedBorderColor: string;
  theme: string;
}

export interface MindmapDockCommand {
  id: number;
  action:
    | 'set-label'
    | 'set-note'
    | 'set-icon'
    | 'set-text-color'
    | 'set-bg-color'
    | 'set-font-size'
    | 'set-border-style'
    | 'set-border-width'
    | 'set-border-color'
    | 'set-theme'
    | 'toggle-collapsed'
    | 'add-child'
    | 'add-sibling'
    | 'delete-node'
    | 'promote-node'
    | 'demote-node'
    | 'move-node-up'
    | 'move-node-down';
  payload?: string;
}

const props = defineProps<{ modelValue: string; canvasId: string; dockCommand?: MindmapDockCommand | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  dockContext: [ctx: CodespaceDockContextPayload];
  dockState: [ctx: MindmapDockState];
}>();

const viewportRef = ref<HTMLElement | null>(null);
const editInputRef = ref<HTMLInputElement | null>(null);
const state = reactive<MindmapGraphState>({ nodes: [], edges: [], panX: 0, panY: 0, scale: 1, theme: 'classic' });
const selectedIds = ref<string[]>([]);
const dragNodeId = ref<string | null>(null);
const dragOffset = reactive({ x: 0, y: 0 });
const dragSnapshots = ref<Record<string, { x: number; y: number }>>({});
const dragStartClient = reactive({ x: 0, y: 0 });
const dragPanOrigin = reactive({ x: 0, y: 0 });
const panning = ref(false);
const panStart = reactive({ x: 0, y: 0, ox: 0, oy: 0 });
const marquee = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
const editNodeId = ref<string | null>(null);
const editText = ref('');
const editComposing = ref(false);
const imeSeed = reactive({ pending: false, key: '' });
const hoverDropTargetId = ref<string | null>(null);
const lastSynced = ref('');
const ctx = reactive({ open: false, x: 0, y: 0, nodeId: '' as string });
const lastCommandId = ref(0);
interface ClipboardPayload {
  root: MindmapNodeData;
  descendants: MindmapNodeData[];
}
const clipboardNode = ref<ClipboardPayload | null>(null);

const layoutNodes = computed(() => layoutMindmap(state.nodes));
const byId = computed(() => new Map(layoutNodes.value.map((n) => [n.id, n] as const)));
const editingNodeLayout = computed(() => (editNodeId.value ? byId.value.get(editNodeId.value) ?? null : null));
const zoomPercent = computed(() => `${Math.round(state.scale * 100)}%`);
const viewportW = ref(1);
const viewportH = ref(1);

function viewportRect(): DOMRect {
  return viewportRef.value?.getBoundingClientRect() ?? new DOMRect(0, 0, 1, 1);
}
function syncViewportSize(): void {
  const r = viewportRect();
  viewportW.value = Math.max(1, r.width);
  viewportH.value = Math.max(1, r.height);
}

const isCanvasFullscreen = ref(false);
function syncCanvasFullscreenFlag(): void {
  const el = viewportRef.value;
  const now = Boolean(el && document.fullscreenElement === el);
  const entered = now && !isCanvasFullscreen.value;
  isCanvasFullscreen.value = now;
  syncViewportSize();
  if (entered) void nextTick(() => fitView());
}
async function toggleCanvasFullscreen(): Promise<void> {
  const el = viewportRef.value;
  if (!el) return;
  try {
    if (document.fullscreenElement === el) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  } catch {
    /* Fullscreen API may be blocked or unsupported */
  }
}
function isEditableElement(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}
function primeImeInput(): void {
  if (editNodeId.value) return;
  void nextTick(() => {
    const active = document.activeElement;
    if (active && active !== document.body && active !== editInputRef.value && isEditableElement(active)) return;
    editInputRef.value?.focus();
  });
}
function worldAt(clientX: number, clientY: number): { x: number; y: number } {
  return pointToWorld(clientX, clientY, viewportRect(), state.panX, state.panY, state.scale);
}
function firstSelectedNode(): MindmapNodeData | undefined {
  const id = selectedIds.value[0];
  return id ? state.nodes.find((n) => n.id === id) : undefined;
}
/** After structural/view changes, keep the primary selected node inside the viewport (minimal pan). */
function revealPrimarySelectionIfClipped(): void {
  const id = selectedIds.value[0];
  if (!id) return;
  const n = byId.value.get(id);
  if (!n) return;
  const s = state.scale;
  const rect = viewportRect();
  const vw = Math.max(1, rect.width);
  const vh = Math.max(1, rect.height);
  const m = 28;
  const b = {
    x1: state.panX + n.x * s,
    y1: state.panY + n.y * s,
    x2: state.panX + (n.x + n.w) * s,
    y2: state.panY + (n.y + n.h) * s,
  };
  const bw = b.x2 - b.x1;
  const bh = b.y2 - b.y1;
  let dx = 0;
  let dy = 0;
  if (bw <= vw - 2 * m) {
    if (b.x1 < m) dx = m - b.x1;
    else if (b.x2 > vw - m) dx = vw - m - b.x2;
  } else {
    dx = m - b.x1;
  }
  if (bh <= vh - 2 * m) {
    if (b.y1 < m) dy = m - b.y1;
    else if (b.y2 > vh - m) dy = vh - m - b.y2;
  } else {
    dy = m - b.y1;
  }
  if (dx !== 0 || dy !== 0) {
    state.panX += dx;
    state.panY += dy;
  }
}

function emitDockContext(): void {
  const first = firstSelectedNode();
  const summary = first ? `Mindmap node: ${first.label}` : selectedIds.value.length > 1 ? `Mindmap selection (${selectedIds.value.length})` : 'Mindmap';
  const lines = first
    ? [
        { label: 'id', value: first.id },
        { label: 'label', value: first.label },
        { label: 'parentId', value: first.parentId ?? '(root)' },
        { label: 'children', value: String(state.nodes.filter((n) => n.parentId === first.id).length) },
      ]
    : [{ label: 'nodes', value: String(state.nodes.length) }];
  emit('dockContext', { summary, lines });
  emit('dockState', {
    selectedId: first?.id ?? null,
    selectedLabel: first?.label ?? '',
    selectedParentId: first?.parentId ?? null,
    selectedChildren: first ? state.nodes.filter((n) => n.parentId === first.id).length : 0,
    selectedCollapsed: first?.collapsed === true,
    totalNodes: state.nodes.length,
    selectedIcon: first?.icon ?? '',
    selectedNote: first?.note ?? '',
    selectedTextColor: first?.textColor ?? '',
    selectedBgColor: first?.bgColor ?? '',
    selectedFontSize: first?.fontSize ?? 13,
    selectedBorderStyle: first?.borderStyle ?? 'rounded',
    selectedBorderWidth: first?.borderWidth ?? 1.4,
    selectedBorderColor: first?.borderColor ?? '',
    theme: state.theme,
  });
}
function pushPayload(): void {
  revealPrimarySelectionIfClipped();
  const next = serializeMindmapPayload(state);
  lastSynced.value = next;
  emit('update:modelValue', next);
  emitDockContext();
}
function loadPayload(text: string): void {
  const parsed = parseMindmapPayloadText(text);
  state.nodes.splice(0, state.nodes.length, ...parsed.nodes);
  state.edges.splice(0, state.edges.length, ...parsed.edges);
  state.panX = parsed.panX;
  state.panY = parsed.panY;
  state.scale = parsed.scale;
  state.theme = parsed.theme || 'classic';
  selectedIds.value = [];
  editNodeId.value = null;
  lastSynced.value = text;
  emitDockContext();
}
watch(() => props.modelValue, (v) => { if (v !== lastSynced.value) loadPayload(v ?? ''); }, { immediate: true });

function createNode(parentId: string | null, label = 'New node'): string {
  const id = `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const order = state.nodes.filter((n) => n.parentId === parentId).length;
  state.nodes.push({ id, label, parentId, order });
  normalizeSiblingOrder(parentId);
  return id;
}
function beginInlineEdit(id: string, opts?: { selectAll?: boolean }): void {
  const n = state.nodes.find((x) => x.id === id);
  if (!n) return;
  editNodeId.value = id;
  editText.value = n.label;
  void nextTick(() => {
    editInputRef.value?.focus();
    if (opts?.selectAll !== false) editInputRef.value?.select();
  });
}
function clearImeSeed(): void {
  imeSeed.pending = false;
  imeSeed.key = '';
}
function onEditorCompositionStart(): void {
  editComposing.value = true;
}
function onEditorCompositionEnd(): void {
  editComposing.value = false;
  clearImeSeed();
}
function confirmInlineEdit(): void {
  if (editComposing.value) return;
  const id = editNodeId.value;
  if (!id) return;
  const n = state.nodes.find((x) => x.id === id);
  if (n) n.label = (editText.value || '').trim() || 'Untitled';
  editNodeId.value = null;
  clearImeSeed();
  pushPayload();
}
/** Overlay input keeps focus for IME; Enter must be handled here when not editing. */
function onEditorEnterKey(e: KeyboardEvent): void {
  if (e.isComposing || editComposing.value) return;
  if (editNodeId.value) {
    e.preventDefault();
    e.stopPropagation();
    confirmInlineEdit();
    return;
  }
  const first = selectedIds.value[0] ?? null;
  if (!first) return;
  e.preventDefault();
  e.stopPropagation();
  addSibling(first);
}
function cancelInlineEdit(): void {
  editNodeId.value = null;
  clearImeSeed();
}
function deleteSelected(): void {
  const del = new Set(selectedIds.value);
  if (!del.size) return;
  const roots = state.nodes.filter((n) => n.parentId === null && !del.has(n.id));
  if (!roots.length) return;
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of state.nodes) {
      if (n.parentId && del.has(n.parentId) && !del.has(n.id)) {
        del.add(n.id);
        changed = true;
      }
    }
  }
  state.nodes.splice(0, state.nodes.length, ...state.nodes.filter((n) => !del.has(n.id)));
  selectedIds.value = [];
  pushPayload();
}
function addChild(parentId: string | null): void {
  const id = createNode(parentId, 'New child');
  selectedIds.value = [id];
  pushPayload();
}
function addSibling(sourceId: string | null): void {
  const source = sourceId ? state.nodes.find((n) => n.id === sourceId) : undefined;
  const parentId = source?.parentId ?? null;
  const sorted = state.nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  let insertIdx = sorted.length;
  if (source) {
    const si = sorted.findIndex((s) => s.id === source.id);
    insertIdx = si >= 0 ? si + 1 : sorted.length;
  }
  const id = `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  state.nodes.push({ id, label: 'New sibling', parentId, order: 0 });
  const ids = sorted.map((n) => n.id);
  ids.splice(insertIdx, 0, id);
  ids.forEach((nid, idx) => {
    const n = state.nodes.find((x) => x.id === nid);
    if (n) n.order = idx;
  });
  selectedIds.value = [id];
  pushPayload();
}
function normalizeSiblingOrder(parentId: string | null): void {
  const sibs = state.nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  sibs.forEach((n, idx) => { n.order = idx; });
}
function moveNodeUp(id: string): void {
  const node = state.nodes.find((n) => n.id === id);
  if (!node) return;
  const sibs = state.nodes
    .filter((n) => n.parentId === node.parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  const i = sibs.findIndex((n) => n.id === id);
  if (i <= 0) return;
  const prev = sibs[i - 1];
  const curOrder = node.order ?? i;
  node.order = prev.order ?? (i - 1);
  prev.order = curOrder;
  normalizeSiblingOrder(node.parentId ?? null);
  pushPayload();
}
function moveNodeDown(id: string): void {
  const node = state.nodes.find((n) => n.id === id);
  if (!node) return;
  const sibs = state.nodes
    .filter((n) => n.parentId === node.parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  const i = sibs.findIndex((n) => n.id === id);
  if (i < 0 || i >= sibs.length - 1) return;
  const next = sibs[i + 1];
  const curOrder = node.order ?? i;
  node.order = next.order ?? (i + 1);
  next.order = curOrder;
  normalizeSiblingOrder(node.parentId ?? null);
  pushPayload();
}
function promoteNode(id: string): void {
  const node = state.nodes.find((n) => n.id === id);
  if (!node || !node.parentId) return;
  const parent = state.nodes.find((n) => n.id === node.parentId);
  if (!parent) return;
  const grandParentId = parent.parentId ?? null;
  node.parentId = grandParentId;
  const parentOrder = parent.order ?? 0;
  node.order = parentOrder + 1;
  normalizeSiblingOrder(parent.id);
  normalizeSiblingOrder(grandParentId);
  pushPayload();
}
function demoteNode(id: string): void {
  const node = state.nodes.find((n) => n.id === id);
  if (!node) return;
  const sibs = state.nodes
    .filter((n) => n.parentId === node.parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  const i = sibs.findIndex((n) => n.id === id);
  if (i <= 0) return;
  const prevSibling = sibs[i - 1];
  if (isDescendant(prevSibling.id, node.id)) return;
  node.parentId = prevSibling.id;
  node.order = state.nodes.filter((n) => n.parentId === prevSibling.id).length;
  normalizeSiblingOrder(sibs[0]?.parentId ?? null);
  normalizeSiblingOrder(prevSibling.id);
  pushPayload();
}
function toggleCollapseSelected(): void {
  const first = firstSelectedNode();
  if (!first) return;
  first.collapsed = !(first.collapsed === true);
  pushPayload();
}
function collectSubtree(id: string): MindmapNodeData[] {
  const out: MindmapNodeData[] = [];
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const n = state.nodes.find((x) => x.id === cur);
    if (!n) continue;
    out.push({ ...n });
    const kids = state.nodes
      .filter((x) => x.parentId === cur)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
      .map((x) => x.id);
    queue.push(...kids);
  }
  return out;
}
function cloneSubtreeInto(parentId: string | null, payload: ClipboardPayload): string {
  const map = new Map<string, string>();
  const newId = (oldId: string) => `n_${Date.now().toString(36)}_${oldId.slice(-4)}_${Math.random().toString(36).slice(2, 5)}`;
  for (const n of [payload.root, ...payload.descendants]) map.set(n.id, newId(n.id));
  const all = [payload.root, ...payload.descendants];
  const rootCloneId = map.get(payload.root.id)!;
  for (const n of all) {
    const id = map.get(n.id)!;
    const nextParent = n.id === payload.root.id ? parentId : (n.parentId ? map.get(n.parentId) ?? null : null);
    state.nodes.push({
      ...n,
      id,
      parentId: nextParent,
      order: state.nodes.filter((x) => x.parentId === nextParent).length,
    });
  }
  const touchedParents = new Set<string | null>();
  for (const n of all) {
    const nextParent = n.id === payload.root.id ? parentId : (n.parentId ? map.get(n.parentId) ?? null : null);
    touchedParents.add(nextParent);
  }
  for (const p of touchedParents) normalizeSiblingOrder(p);
  return rootCloneId;
}

function isDescendant(targetId: string, possibleAncestorId: string): boolean {
  let cur = state.nodes.find((n) => n.id === targetId)?.parentId ?? null;
  const guard = new Set<string>();
  while (cur) {
    if (cur === possibleAncestorId) return true;
    if (guard.has(cur)) return false;
    guard.add(cur);
    cur = state.nodes.find((n) => n.id === cur)?.parentId ?? null;
  }
  return false;
}
function beginNodeDrag(e: PointerEvent, id: string): void {
  if (e.button !== 0) return;
  if (editNodeId.value && editNodeId.value !== id) confirmInlineEdit();
  const additive = e.ctrlKey || e.metaKey;
  if (additive) {
    selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter((x) => x !== id) : [...selectedIds.value, id];
    revealPrimarySelectionIfClipped();
    emitDockContext();
    primeImeInput();
    return;
  }
  if (!selectedIds.value.includes(id)) selectedIds.value = [id];
  revealPrimarySelectionIfClipped();
  primeImeInput();
  const hit = byId.value.get(id);
  if (!hit) return;
  const w = worldAt(e.clientX, e.clientY);
  dragNodeId.value = id;
  dragStartClient.x = e.clientX;
  dragStartClient.y = e.clientY;
  dragPanOrigin.x = state.panX;
  dragPanOrigin.y = state.panY;
  dragOffset.x = w.x - hit.x;
  dragOffset.y = w.y - hit.y;
  const snaps: Record<string, { x: number; y: number }> = {};
  for (const sid of selectedIds.value) {
    const s = byId.value.get(sid);
    if (s) snaps[sid] = { x: s.x, y: s.y };
  }
  dragSnapshots.value = snaps;
  (e.currentTarget as Element).setPointerCapture(e.pointerId);
}
function updateNodeDrag(e: PointerEvent): void {
  const pid = dragNodeId.value;
  if (!pid) return;
  const source = state.nodes.find((n) => n.id === pid);
  if (source?.parentId === null) {
    state.panX = dragPanOrigin.x + (e.clientX - dragStartClient.x);
    state.panY = dragPanOrigin.y + (e.clientY - dragStartClient.y);
    hoverDropTargetId.value = null;
    return;
  }
  const w = worldAt(e.clientX, e.clientY);
  const base = dragSnapshots.value[pid];
  if (!base) return;
  const nx = w.x - dragOffset.x;
  const ny = w.y - dragOffset.y;
  const dx = nx - base.x;
  const dy = ny - base.y;
  hoverDropTargetId.value = pickNodeAt(layoutNodes.value, w.x, w.y)?.id ?? null;
  for (const sid of selectedIds.value) {
    const ln = byId.value.get(sid);
    const s = dragSnapshots.value[sid];
    if (ln && s) {
      ln.x = s.x + dx;
      ln.y = s.y + dy;
    }
  }
}
function endNodeDrag(e: PointerEvent): void {
  const sourceId = dragNodeId.value;
  if (!sourceId) return;
  const dropTargetId = hoverDropTargetId.value;
  if (dropTargetId && sourceId !== dropTargetId && !isDescendant(dropTargetId, sourceId)) {
    const src = state.nodes.find((n) => n.id === sourceId);
    if (src) {
      src.parentId = dropTargetId;
      src.order = state.nodes.filter((n) => n.parentId === dropTargetId).length;
      normalizeSiblingOrder(dropTargetId);
    }
  }
  dragNodeId.value = null;
  hoverDropTargetId.value = null;
  try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  pushPayload();
}

function fitView(): void {
  if (!layoutNodes.value.length) return;
  const minX = Math.min(...layoutNodes.value.map((n) => n.x));
  const maxX = Math.max(...layoutNodes.value.map((n) => n.x + n.w));
  const minY = Math.min(...layoutNodes.value.map((n) => n.y));
  const maxY = Math.max(...layoutNodes.value.map((n) => n.y + n.h));
  const rect = viewportRect();
  const pad = 40;
  const bw = maxX - minX + pad * 2;
  const bh = maxY - minY + pad * 2;
  state.scale = Math.min(3, Math.max(0.3, Math.min(rect.width / bw, rect.height / bh)));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  state.panX = rect.width / 2 - state.scale * cx;
  state.panY = rect.height / 2 - state.scale * cy;
  pushPayload();
}
function originView(): void {
  if (!layoutNodes.value.length) return;
  const minX = Math.min(...layoutNodes.value.map((n) => n.x));
  const maxX = Math.max(...layoutNodes.value.map((n) => n.x + n.w));
  const minY = Math.min(...layoutNodes.value.map((n) => n.y));
  const maxY = Math.max(...layoutNodes.value.map((n) => n.y + n.h));
  const rect = viewportRect();
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  state.panX = rect.width / 2 - state.scale * cx;
  state.panY = rect.height / 2 - state.scale * cy;
  pushPayload();
}
function resetZoom(): void {
  const rect = viewportRect();
  const worldCx = (rect.width / 2 - state.panX) / state.scale;
  const worldCy = (rect.height / 2 - state.panY) / state.scale;
  state.scale = 1;
  state.panX = rect.width / 2 - worldCx;
  state.panY = rect.height / 2 - worldCy;
  pushPayload();
}
function zoomByStep(step: number): void {
  const rect = viewportRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const target = Math.min(3, Math.max(0.3, state.scale + step));
  const delta = target > state.scale ? -120 : 120;
  const z = zoomAt(state.scale, state.panX, state.panY, cx, cy, rect, delta);
  state.scale = target;
  state.panX = z.panX;
  state.panY = z.panY;
  pushPayload();
}

function onBackgroundPointerDown(e: PointerEvent): void {
  ctx.open = false;
  if (editNodeId.value) confirmInlineEdit();
  if (e.button === 1) {
    panning.value = true;
    panStart.x = e.clientX;
    panStart.y = e.clientY;
    panStart.ox = state.panX;
    panStart.oy = state.panY;
    return;
  }
  if (e.button !== 0) return;
  const w = worldAt(e.clientX, e.clientY);
  marquee.value = { x0: w.x, y0: w.y, x1: w.x, y1: w.y };
  if (!(e.ctrlKey || e.metaKey)) selectedIds.value = [];
  emitDockContext();
  primeImeInput();
}
function onViewportPointerMove(e: PointerEvent): void {
  if (panning.value) {
    state.panX = panStart.ox + (e.clientX - panStart.x);
    state.panY = panStart.oy + (e.clientY - panStart.y);
    return;
  }
  if (dragNodeId.value) return updateNodeDrag(e);
  if (!marquee.value) return;
  const w = worldAt(e.clientX, e.clientY);
  marquee.value = { ...marquee.value, x1: w.x, y1: w.y };
}
function onViewportPointerUp(): void {
  if (panning.value) {
    panning.value = false;
    pushPayload();
    return;
  }
  if (!marquee.value) return;
  selectedIds.value = idsInMarquee(layoutNodes.value, marquee.value.x0, marquee.value.y0, marquee.value.x1, marquee.value.y1);
  marquee.value = null;
  pushPayload();
  emitDockContext();
}
function onWheel(e: WheelEvent): void {
  const z = zoomAt(state.scale, state.panX, state.panY, e.clientX, e.clientY, viewportRect(), e.deltaY);
  state.scale = z.scale;
  state.panX = z.panX;
  state.panY = z.panY;
  revealPrimarySelectionIfClipped();
}

function openContextMenu(e: MouseEvent, nodeId: string | null): void {
  e.preventDefault();
  if (nodeId && !selectedIds.value.includes(nodeId)) selectedIds.value = [nodeId];
  revealPrimarySelectionIfClipped();
  emitDockContext();
  ctx.open = true;
  ctx.x = e.clientX;
  ctx.y = e.clientY;
  ctx.nodeId = nodeId ?? '';
}
function addChildFromContext(): void { addChild(ctx.nodeId || selectedIds.value[0] || null); ctx.open = false; }
function addSiblingFromContext(): void { addSibling(ctx.nodeId || selectedIds.value[0] || null); ctx.open = false; }
function deleteFromContext(): void { if (ctx.nodeId && !selectedIds.value.includes(ctx.nodeId)) selectedIds.value = [ctx.nodeId]; deleteSelected(); ctx.open = false; }
function editFromContext(): void { const id = ctx.nodeId || selectedIds.value[0]; if (id) beginInlineEdit(id); ctx.open = false; }

function onKeyDown(e: KeyboardEvent): void {
  if (e.defaultPrevented) return;
  const target = e.target as HTMLElement | null;
  // Inline editor handles Enter/Escape/composition via its own listeners; if the event
  // bubbles here after confirmInlineEdit(), `editing` is already false and Enter
  // would incorrectly add a second sibling.
  if (target === editInputRef.value) return;
  const isEditableTarget = !!target && (
    target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
    || target.isContentEditable
  );
  const isCanvasInlineEditor = target === editInputRef.value;
  if (isEditableTarget && !isCanvasInlineEditor) return;

  const editing = !!editNodeId.value;
  if (editing) {
    if (e.isComposing || editComposing.value) return;
    const inputFocused = document.activeElement === editInputRef.value;
    if (inputFocused) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelInlineEdit();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelInlineEdit();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmInlineEdit();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      editText.value = editText.value.slice(0, -1);
      return;
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
      e.preventDefault();
      editText.value += e.key;
      return;
    }
    return;
  }
  const first = selectedIds.value[0] ?? null;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    selectedIds.value = state.nodes.map((n) => n.id);
    revealPrimarySelectionIfClipped();
    pushPayload();
    return emitDockContext();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    if (!first) return;
    const [root, ...descendants] = collectSubtree(first);
    clipboardNode.value = root ? { root, descendants } : null;
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
    e.preventDefault();
    if (!first) return;
    const [root, ...descendants] = collectSubtree(first);
    clipboardNode.value = root ? { root, descendants } : null;
    deleteSelected();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    if (!clipboardNode.value) return;
    const parentId = first ?? state.nodes.find((n) => n.parentId === null)?.id ?? null;
    const id = cloneSubtreeInto(parentId, clipboardNode.value);
    selectedIds.value = [id];
    pushPayload();
    return;
  }
  if (e.altKey && e.key === 'ArrowUp' && first) { e.preventDefault(); return moveNodeUp(first); }
  if (e.altKey && e.key === 'ArrowDown' && first) { e.preventDefault(); return moveNodeDown(first); }
  if (e.altKey && e.key === 'ArrowLeft' && first) { e.preventDefault(); return promoteNode(first); }
  if (e.altKey && e.key === 'ArrowRight' && first) { e.preventDefault(); return demoteNode(first); }
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); return zoomByStep(0.1); }
  if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); return zoomByStep(-0.1); }
  if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); return resetZoom(); }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); return deleteSelected(); }
  if (e.key === 'Enter') { e.preventDefault(); return addSibling(first); }
  if (e.key === 'Tab') { e.preventDefault(); return addChild(first ?? state.nodes.find((n) => n.parentId === null)?.id ?? null); }
  if (e.key === 'Insert') { e.preventDefault(); return addSibling(first); }
  if (e.key === ' ') { e.preventDefault(); return toggleCollapseSelected(); }
  if (
    first
    && !e.ctrlKey
    && !e.metaKey
    && !e.altKey
    && (e.key === 'Process' || (e.key.length === 1 && !/\s/.test(e.key)))
  ) {
    const alphaSeed = /^[a-zA-Z]$/.test(e.key);
    const fromInlineInput = target === editInputRef.value;
    if (e.key !== 'Process' && !alphaSeed) e.preventDefault();
    imeSeed.pending = alphaSeed || e.key === 'Process';
    imeSeed.key = alphaSeed ? e.key.toLowerCase() : '';
    beginInlineEdit(first, { selectAll: false });
    // If key comes from the always-focused inline input, never overwrite text;
    // keep IME/native pipeline untouched.
    if (!fromInlineInput) {
      // For alphabet seed keys, let IME consume the first key.
      editText.value = (e.key === 'Process' || alphaSeed) ? '' : e.key;
    }
    return;
  }
  if (!first) return;
  const current = state.nodes.find((n) => n.id === first);
  if (!current) return;
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (current.parentId) {
      selectedIds.value = [current.parentId];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const firstChild = state.nodes
      .filter((n) => n.parentId === current.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))[0];
    if (firstChild) {
      selectedIds.value = [firstChild.id];
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    const sibs = state.nodes
      .filter((n) => n.parentId === current.parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
    const i = sibs.findIndex((n) => n.id === current.id);
    const next = e.key === 'ArrowLeft' ? sibs[i - 1] : sibs[i + 1];
    if (next) {
      selectedIds.value = [next.id];
    }
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    revealPrimarySelectionIfClipped();
    pushPayload();
  }
  emitDockContext();
}

watch(
  () => props.dockCommand,
  (cmd) => {
    if (!cmd || cmd.id <= lastCommandId.value) return;
    lastCommandId.value = cmd.id;
    const first = firstSelectedNode();
    if (cmd.action === 'set-label' && first) { first.label = (cmd.payload ?? '').trim() || 'Untitled'; return pushPayload(); }
    if (cmd.action === 'set-note' && first) { first.note = (cmd.payload ?? '').trim() || undefined; return pushPayload(); }
    if (cmd.action === 'set-icon' && first) { first.icon = (cmd.payload ?? '').trim() || undefined; return pushPayload(); }
    if (cmd.action === 'set-text-color' && first) { first.textColor = (cmd.payload ?? '').trim() || undefined; return pushPayload(); }
    if (cmd.action === 'set-bg-color' && first) { first.bgColor = (cmd.payload ?? '').trim() || undefined; return pushPayload(); }
    if (cmd.action === 'set-font-size' && first) { const n = Number(cmd.payload ?? ''); first.fontSize = Number.isFinite(n) ? Math.max(10, Math.min(28, n)) : undefined; return pushPayload(); }
    if (cmd.action === 'set-border-style' && first) {
      const v = (cmd.payload ?? '').trim();
      first.borderStyle = v === 'square' || v === 'rounded' || v === 'bottom' ? v : undefined;
      return pushPayload();
    }
    if (cmd.action === 'set-border-width' && first) {
      const n = Number(cmd.payload ?? '');
      first.borderWidth = Number.isFinite(n) ? Math.max(0, Math.min(8, n)) : undefined;
      return pushPayload();
    }
    if (cmd.action === 'set-border-color' && first) {
      first.borderColor = (cmd.payload ?? '').trim() || undefined;
      return pushPayload();
    }
    if (cmd.action === 'set-theme') { state.theme = (cmd.payload ?? '').trim() || 'classic'; return pushPayload(); }
    if (cmd.action === 'toggle-collapsed' && first) { first.collapsed = !(first.collapsed === true); return pushPayload(); }
    if (cmd.action === 'add-child') return addChild(first?.id ?? state.nodes.find((n) => n.parentId === null)?.id ?? null);
    if (cmd.action === 'add-sibling') return addSibling(first?.id ?? null);
    if (cmd.action === 'delete-node') return deleteSelected();
    if (cmd.action === 'promote-node' && first) return promoteNode(first.id);
    if (cmd.action === 'demote-node' && first) return demoteNode(first.id);
    if (cmd.action === 'move-node-up' && first) return moveNodeUp(first.id);
    if (cmd.action === 'move-node-down' && first) return moveNodeDown(first.id);
  },
  { deep: true },
);

const marqueeRect = computed(() => {
  if (!marquee.value) return null;
  return { x: Math.min(marquee.value.x0, marquee.value.x1), y: Math.min(marquee.value.y0, marquee.value.y1), w: Math.abs(marquee.value.x1 - marquee.value.x0), h: Math.abs(marquee.value.y1 - marquee.value.y0) };
});

onMounted(() => {
  const closeCtx = (e: PointerEvent) => {
    const t = e.target as Node | null;
    if (t && viewportRef.value && !viewportRef.value.contains(t)) ctx.open = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('pointerdown', closeCtx);
  window.addEventListener('resize', syncViewportSize);
  document.addEventListener('fullscreenchange', syncCanvasFullscreenFlag);
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('pointerdown', closeCtx);
    window.removeEventListener('resize', syncViewportSize);
    document.removeEventListener('fullscreenchange', syncCanvasFullscreenFlag);
  });
  primeImeInput();
  syncViewportSize();
  nextTick(() => fitView());
});
</script>

<template>
  <div ref="viewportRef" class="mmc" @pointermove="onViewportPointerMove" @pointerup="onViewportPointerUp" @wheel.prevent="onWheel">
    <svg class="mmc-svg" xmlns="http://www.w3.org/2000/svg">
      <g :transform="`translate(${state.panX},${state.panY}) scale(${state.scale})`">
        <rect x="-100000" y="-100000" width="200000" height="200000" fill="transparent" @pointerdown="onBackgroundPointerDown" @contextmenu="openContextMenu($event, null)" />
        <path
          v-for="(n, i) in state.nodes.filter((x) => x.parentId && byId.has(x.parentId!))"
          :key="`e_${i}_${n.id}`"
          :d="`M ${byId.get(n.parentId!)!.x + byId.get(n.parentId!)!.w} ${byId.get(n.parentId!)!.y + byId.get(n.parentId!)!.h / 2}
               C ${byId.get(n.parentId!)!.x + byId.get(n.parentId!)!.w + 36} ${byId.get(n.parentId!)!.y + byId.get(n.parentId!)!.h / 2},
                 ${byId.get(n.id)!.x - 36} ${byId.get(n.id)!.y + byId.get(n.id)!.h / 2},
                 ${byId.get(n.id)!.x} ${byId.get(n.id)!.y + byId.get(n.id)!.h / 2}`"
          fill="none"
          stroke="#64748b"
          stroke-width="1.8"
        />
        <g v-for="n in layoutNodes" :key="n.id" :transform="`translate(${n.x},${n.y})`" @pointerdown.stop="beginNodeDrag($event, n.id)" @pointerup.stop="endNodeDrag" @dblclick.stop="beginInlineEdit(n.id)" @contextmenu.stop="openContextMenu($event, n.id)">
          <rect
            :width="n.w"
            :height="n.h"
            :rx="n.borderStyle === 'square' ? 0 : 8"
            :fill="selectedIds.includes(n.id) ? '#dbeafe' : (n.bgColor || (state.theme === 'night' ? '#1f2937' : state.theme === 'forest' ? '#ecfdf5' : '#ffffff'))"
            :stroke="n.borderStyle === 'bottom' ? 'transparent' : (hoverDropTargetId === n.id ? '#16a34a' : selectedIds.includes(n.id) ? '#2563eb' : (n.borderColor || '#94a3b8'))"
            :stroke-width="selectedIds.includes(n.id) ? Math.max(2.5, n.borderWidth || 1.4) : (n.borderWidth || 1.4)"
          />
          <line
            v-if="n.borderStyle === 'bottom'"
            :x1="0"
            :x2="n.w"
            :y1="n.h - ((n.borderWidth || 1.4) / 2)"
            :y2="n.h - ((n.borderWidth || 1.4) / 2)"
            :stroke="hoverDropTargetId === n.id ? '#16a34a' : selectedIds.includes(n.id) ? '#2563eb' : (n.borderColor || '#94a3b8')"
            :stroke-width="selectedIds.includes(n.id) ? Math.max(2.5, n.borderWidth || 1.4) : (n.borderWidth || 1.4)"
          />
          <text x="12" y="25" :fill="n.textColor || (state.theme === 'night' ? '#f8fafc' : '#0f172a')" :font-size="n.fontSize || 13" class="mmc-node-label">
            {{ n.icon ? `${n.icon} ` : '' }}{{ n.label }}
          </text>
        </g>
        <rect v-if="marqueeRect" :x="marqueeRect.x" :y="marqueeRect.y" :width="marqueeRect.w" :height="marqueeRect.h" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-dasharray="4 3" />
      </g>
      <g class="mmc-ui" :transform="`translate(10, ${Math.max(10, viewportH - 34)})`">
        <g class="mmc-tool-btn" transform="translate(0,0)" @click="fitView">
          <rect width="35" height="25" rx="6" />
          <text x="17.5" y="16" text-anchor="middle">Fit</text>
        </g>
        <g class="mmc-tool-btn" transform="translate(41,0)" @click="originView">
          <rect width="56" height="25" rx="6" />
          <text x="28" y="16" text-anchor="middle">Origin</text>
        </g>
        <g class="mmc-tool-btn" transform="translate(103,0)" @click="resetZoom">
          <rect width="55" height="25" rx="6" />
          <text x="27.5" y="16" text-anchor="middle">Reset</text>
        </g>
        <g class="mmc-tool-btn" transform="translate(164,0)" @click="zoomByStep(-0.1)">
          <rect width="24" height="25" rx="6" />
          <text x="12" y="16" text-anchor="middle">-</text>
        </g>
        <g class="mmc-tool-btn" transform="translate(194,0)" @dblclick="resetZoom">
          <rect width="53" height="25" rx="6" />
          <text x="26.5" y="16" text-anchor="middle">{{ zoomPercent }}</text>
        </g>
        <g class="mmc-tool-btn" transform="translate(253,0)" @click="zoomByStep(0.1)">
          <rect width="28" height="25" rx="6" />
          <text x="14" y="16" text-anchor="middle">+</text>
        </g>
      </g>
      <g class="mmc-ui mmc-ui-tr" :transform="`translate(${Math.max(8, viewportW - 8 - 36)}, 8)`">
        <g class="mmc-tool-btn mmc-tool-btn--fs" @click.stop="toggleCanvasFullscreen">
          <title>{{ isCanvasFullscreen ? '退出全屏' : '画布全屏' }}</title>
          <rect width="36" height="26" rx="6" />
          <g
            v-if="!isCanvasFullscreen"
            class="mmc-fs-icon"
            transform="translate(6,1)"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 3 21 3 21 9" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="3" y1="21" x2="10" y2="14" />
            <polyline points="15 21 21 21 21 15" />
            <line x1="21" y1="15" x2="14" y2="22" />
            <polyline points="9 3 3 3 3 9" />
            <line x1="3" y1="9" x2="10" y2="2" />
          </g>
          <g
            v-else
            class="mmc-fs-icon"
            transform="translate(6,1)"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <polyline points="20 14 14 14 14 20" />
            <polyline points="4 10 10 10 10 4" />
          </g>
        </g>
      </g>
    </svg>
    <input
      ref="editInputRef"
      v-model="editText"
      :class="['mmc-editor-overlay', { 'mmc-editor-overlay--hidden': !editingNodeLayout }]"
      :style="editingNodeLayout ? {
        left: `${state.panX + state.scale * (editingNodeLayout.x + 8)}px`,
        top: `${state.panY + state.scale * (editingNodeLayout.y + 6)}px`,
        width: `${Math.max(80, state.scale * (editingNodeLayout.w - 16))}px`,
      } : undefined"
      autofocus
      @compositionstart="onEditorCompositionStart"
      @compositionend="onEditorCompositionEnd"
      @keydown.enter="onEditorEnterKey"
      @keydown.esc.prevent.stop="cancelInlineEdit"
      @blur="editNodeId ? confirmInlineEdit() : undefined"
    />
    <div v-if="ctx.open" class="mmc-ctx" :style="{ left: `${ctx.x}px`, top: `${ctx.y}px` }" @pointerdown.stop @contextmenu.prevent>
      <button type="button" @click="addChildFromContext">Add child</button>
      <button type="button" @click="addSiblingFromContext">Add sibling</button>
      <button type="button" :disabled="!(ctx.nodeId || selectedIds[0])" @click="editFromContext">Rename</button>
      <button type="button" :disabled="!(ctx.nodeId || selectedIds[0])" @click="toggleCollapseSelected">Collapse/Expand</button>
      <button type="button" :disabled="!(ctx.nodeId || selectedIds[0])" @click="deleteFromContext">Delete</button>
      <button type="button" @click="fitView(); ctx.open = false">Fit view</button>
    </div>
  </div>
</template>

<style scoped>
.mmc { position: relative; flex: 1; min-height: 0; background: #f8fafc; overflow: hidden; cursor: default; }
.mmc:fullscreen {
  width: 100%;
  height: 100%;
  background: #f8fafc;
}
.mmc-svg { width: 100%; height: 100%; display: block; }
.mmc-node-label { user-select: none; pointer-events: none; }
.mmc-ui { pointer-events: auto; }
.mmc-tool-btn { cursor: pointer; }
.mmc-tool-btn rect { fill: #fff; stroke: #cbd5e1; stroke-width: 1; }
.mmc-tool-btn text { fill: #334155; font-size: 12px; font-weight: 600; user-select: none; pointer-events: none; }
.mmc-tool-btn:hover rect { fill: #eff6ff; stroke: #93c5fd; }
.mmc-tool-btn--fs .mmc-fs-icon { color: #334155; pointer-events: none; }
.mmc-tool-btn--fs:hover .mmc-fs-icon { color: #2563eb; }
.mmc-editor-overlay {
  position: absolute;
  z-index: 12;
  border: 1px solid #2563eb;
  border-radius: 6px;
  padding: 4px 6px;
  font: inherit;
  font-size: 13px;
  background: #fff;
}
.mmc-editor-overlay--hidden {
  left: -10000px !important;
  top: -10000px !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0;
  pointer-events: none;
}
.mmc-ctx { position: fixed; z-index: 20; display: flex; flex-direction: column; min-width: 132px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18); padding: 4px; }
.mmc-ctx button { text-align: left; background: transparent; border: 0; border-radius: 6px; padding: 6px 8px; cursor: pointer; }
.mmc-ctx button:hover:not(:disabled) { background: #eff6ff; }
.mmc-ctx button:disabled { color: #94a3b8; cursor: not-allowed; }
</style>
