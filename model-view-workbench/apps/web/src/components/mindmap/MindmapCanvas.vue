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
    | 'set-theme'
    | 'toggle-collapsed'
    | 'add-child'
    | 'add-sibling'
    | 'delete-node';
  payload?: string;
}

const props = defineProps<{ modelValue: string; canvasId: string; dockCommand?: MindmapDockCommand | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  dockContext: [ctx: CodespaceDockContextPayload];
  dockState: [ctx: MindmapDockState];
}>();

const viewportRef = ref<HTMLElement | null>(null);
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
const hoverDropTargetId = ref<string | null>(null);
const lastSynced = ref('');
const ctx = reactive({ open: false, x: 0, y: 0, nodeId: '' as string });
const lastCommandId = ref(0);

const layoutNodes = computed(() => layoutMindmap(state.nodes));
const byId = computed(() => new Map(layoutNodes.value.map((n) => [n.id, n] as const)));
const edges = computed(() =>
  state.nodes
    .filter((n) => n.parentId)
    .map((n, i) => ({ id: `e_${i}`, from: n.parentId!, to: n.id }))
    .filter((e) => byId.value.has(e.from) && byId.value.has(e.to)),
);
const editingNodeLayout = computed(() => (editNodeId.value ? byId.value.get(editNodeId.value) ?? null : null));

function emitDockContext(): void {
  const firstId = selectedIds.value[0];
  const first = firstId ? state.nodes.find((n) => n.id === firstId) : undefined;
  const summary = first
    ? `Mindmap node: ${first.label}`
    : selectedIds.value.length > 1
      ? `Mindmap selection (${selectedIds.value.length})`
      : 'Mindmap';
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
    theme: state.theme,
  });
}

function pushPayload(): void {
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

watch(
  () => props.modelValue,
  (v) => {
    if (v === lastSynced.value) return;
    loadPayload(v ?? '');
  },
  { immediate: true },
);
watch(
  () => props.dockCommand,
  (cmd) => {
    if (!cmd || cmd.id <= lastCommandId.value) return;
    lastCommandId.value = cmd.id;
    const first = selectedIds.value[0] ? state.nodes.find((n) => n.id === selectedIds.value[0]) : null;
    if (cmd.action === 'set-label' && first) {
      first.label = (cmd.payload ?? '').trim() || 'Untitled';
      pushPayload();
      return;
    }
    if (cmd.action === 'set-note' && first) {
      first.note = (cmd.payload ?? '').trim() || undefined;
      pushPayload();
      return;
    }
    if (cmd.action === 'set-icon' && first) {
      first.icon = (cmd.payload ?? '').trim() || undefined;
      pushPayload();
      return;
    }
    if (cmd.action === 'set-text-color' && first) {
      first.textColor = (cmd.payload ?? '').trim() || undefined;
      pushPayload();
      return;
    }
    if (cmd.action === 'set-bg-color' && first) {
      first.bgColor = (cmd.payload ?? '').trim() || undefined;
      pushPayload();
      return;
    }
    if (cmd.action === 'set-font-size' && first) {
      const n = Number(cmd.payload ?? '');
      first.fontSize = Number.isFinite(n) ? Math.max(10, Math.min(28, n)) : undefined;
      pushPayload();
      return;
    }
    if (cmd.action === 'set-theme') {
      state.theme = (cmd.payload ?? '').trim() || 'classic';
      pushPayload();
      return;
    }
    if (cmd.action === 'toggle-collapsed' && first) {
      first.collapsed = !(first.collapsed === true);
      pushPayload();
      return;
    }
    if (cmd.action === 'add-child') {
      const parentId = first?.id ?? state.nodes.find((n) => n.parentId === null)?.id ?? null;
      const id = createNode(parentId, 'New child');
      selectedIds.value = [id];
      beginInlineEdit(id);
      pushPayload();
      return;
    }
    if (cmd.action === 'add-sibling') {
      const id = createNode(first?.parentId ?? null, 'New sibling');
      selectedIds.value = [id];
      beginInlineEdit(id);
      pushPayload();
      return;
    }
    if (cmd.action === 'delete-node') deleteSelected();
  },
  { deep: true },
);

function viewportRect(): DOMRect {
  return viewportRef.value?.getBoundingClientRect() ?? new DOMRect(0, 0, 1, 1);
}

function worldAt(clientX: number, clientY: number): { x: number; y: number } {
  const r = viewportRect();
  return pointToWorld(clientX, clientY, r, state.panX, state.panY, state.scale);
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
  const hit = byId.value.get(id);
  if (!hit) return;
  const additive = e.ctrlKey || e.metaKey;
  if (additive) {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter((x) => x !== id)
      : [...selectedIds.value, id];
    emitDockContext();
    return;
  }
  if (!selectedIds.value.includes(id)) selectedIds.value = [id];
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
  if (!dragNodeId.value) return;
  const pid = dragNodeId.value;
  const source = state.nodes.find((n) => n.id === pid);
  if (source?.parentId === null) {
    // Root drag behaves like canvas pan, so users can "move root".
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
    const n = state.nodes.find((x) => x.id === sid);
    const s = dragSnapshots.value[sid];
    if (n && s) {
      const ln = byId.value.get(sid);
      if (ln) {
        const tx = s.x + dx;
        const ty = s.y + dy;
        ln.x = tx;
        ln.y = ty;
      }
    }
  }
}

function applyReparentByDrop(dropTargetId: string | null): void {
  if (!dragNodeId.value || !dropTargetId) return;
  const sourceId = dragNodeId.value;
  if (sourceId === dropTargetId) return;
  if (isDescendant(dropTargetId, sourceId)) return;
  const src = state.nodes.find((n) => n.id === sourceId);
  if (!src) return;
  src.parentId = dropTargetId;
  const sibCount = state.nodes.filter((n) => n.parentId === dropTargetId).length;
  src.order = sibCount + 1;
}

function endNodeDrag(e: PointerEvent): void {
  if (!dragNodeId.value) return;
  applyReparentByDrop(hoverDropTargetId.value);
  dragNodeId.value = null;
  hoverDropTargetId.value = null;
  try {
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  pushPayload();
}

function onBackgroundPointerDown(e: PointerEvent): void {
  ctx.open = false;
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
}

function onViewportPointerMove(e: PointerEvent): void {
  if (panning.value) {
    state.panX = panStart.ox + (e.clientX - panStart.x);
    state.panY = panStart.oy + (e.clientY - panStart.y);
    return;
  }
  if (dragNodeId.value) {
    updateNodeDrag(e);
    return;
  }
  if (!marquee.value) return;
  const w = worldAt(e.clientX, e.clientY);
  marquee.value = { ...marquee.value, x1: w.x, y1: w.y };
}

function onViewportPointerUp(_e: PointerEvent): void {
  if (panning.value) {
    panning.value = false;
    pushPayload();
    return;
  }
  if (marquee.value) {
    const ids = idsInMarquee(layoutNodes.value, marquee.value.x0, marquee.value.y0, marquee.value.x1, marquee.value.y1);
    selectedIds.value = ids;
    marquee.value = null;
    emitDockContext();
  }
}

function openContextMenu(e: MouseEvent, nodeId: string | null): void {
  e.preventDefault();
  if (nodeId) {
    if (!selectedIds.value.includes(nodeId)) selectedIds.value = [nodeId];
    emitDockContext();
  }
  ctx.open = true;
  ctx.x = e.clientX;
  ctx.y = e.clientY;
  ctx.nodeId = nodeId ?? '';
}

function onWheel(e: WheelEvent): void {
  const rect = viewportRect();
  const z = zoomAt(state.scale, state.panX, state.panY, e.clientX, e.clientY, rect, e.deltaY);
  state.scale = z.scale;
  state.panX = z.panX;
  state.panY = z.panY;
}

function createNode(parentId: string | null, label = 'New node'): string {
  const id = `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const order = state.nodes.filter((n) => n.parentId === parentId).length;
  state.nodes.push({ id, label, parentId, order });
  return id;
}

function deleteSelected(): void {
  const del = new Set(selectedIds.value);
  if (!del.size) return;
  // keep at least one root
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
  state.nodes.splice(
    0,
    state.nodes.length,
    ...state.nodes.filter((n) => !del.has(n.id)),
  );
  selectedIds.value = [];
  pushPayload();
}

function beginInlineEdit(id: string): void {
  const n = state.nodes.find((x) => x.id === id);
  if (!n) return;
  editNodeId.value = id;
  editText.value = n.label;
}

function confirmInlineEdit(): void {
  if (!editNodeId.value) return;
  const n = state.nodes.find((x) => x.id === editNodeId.value);
  if (n) n.label = (editText.value || '').trim() || 'Untitled';
  editNodeId.value = null;
  pushPayload();
}

function onKeyDown(e: KeyboardEvent): void {
  if (editNodeId.value) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmInlineEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editNodeId.value = null;
    }
    return;
  }
  const first = selectedIds.value[0] ?? null;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    deleteSelected();
    return;
  }
  if (e.key === 'Enter' && first) {
    e.preventDefault();
    beginInlineEdit(first);
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const parent = first ?? state.nodes.find((n) => n.parentId === null)?.id ?? null;
    const id = createNode(parent, 'New child');
    selectedIds.value = [id];
    beginInlineEdit(id);
    pushPayload();
    return;
  }
  if (e.key === 'Insert') {
    e.preventDefault();
    const source = first ? state.nodes.find((n) => n.id === first) : null;
    const id = createNode(source?.parentId ?? null, 'New sibling');
    selectedIds.value = [id];
    beginInlineEdit(id);
    pushPayload();
    return;
  }
  const index = first ? layoutNodes.value.findIndex((n) => n.id === first) : -1;
  if (index < 0) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    const next = layoutNodes.value[Math.min(layoutNodes.value.length - 1, index + 1)];
    if (next) selectedIds.value = [next.id];
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const prev = layoutNodes.value[Math.max(0, index - 1)];
    if (prev) selectedIds.value = [prev.id];
  }
  emitDockContext();
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
  const s = Math.min(2.5, Math.max(0.3, Math.min(rect.width / bw, rect.height / bh)));
  state.scale = s;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  state.panX = rect.width / 2 - s * cx;
  state.panY = rect.height / 2 - s * cy;
  pushPayload();
}

function addRootNode(): void {
  const id = createNode(null, 'New root');
  selectedIds.value = [id];
  beginInlineEdit(id);
  pushPayload();
}

function addChildFromContext(): void {
  const pid = ctx.nodeId || selectedIds.value[0] || null;
  const id = createNode(pid, 'New child');
  selectedIds.value = [id];
  beginInlineEdit(id);
  ctx.open = false;
  pushPayload();
}

function addSiblingFromContext(): void {
  const sid = ctx.nodeId || selectedIds.value[0] || null;
  const s = sid ? state.nodes.find((n) => n.id === sid) : null;
  const id = createNode(s?.parentId ?? null, 'New sibling');
  selectedIds.value = [id];
  beginInlineEdit(id);
  ctx.open = false;
  pushPayload();
}

function deleteFromContext(): void {
  if (ctx.nodeId && !selectedIds.value.includes(ctx.nodeId)) selectedIds.value = [ctx.nodeId];
  deleteSelected();
  ctx.open = false;
}

function editFromContext(): void {
  const id = ctx.nodeId || selectedIds.value[0];
  if (id) beginInlineEdit(id);
  ctx.open = false;
}

function onWindowPointerDown(e: PointerEvent): void {
  const root = viewportRef.value;
  if (!root) return;
  const t = e.target as Node | null;
  if (!t) return;
  if (!root.contains(t)) ctx.open = false;
}

const marqueeRect = computed(() => {
  if (!marquee.value) return null;
  return {
    x: Math.min(marquee.value.x0, marquee.value.x1),
    y: Math.min(marquee.value.y0, marquee.value.y1),
    w: Math.abs(marquee.value.x1 - marquee.value.x0),
    h: Math.abs(marquee.value.y1 - marquee.value.y0),
  };
});

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('pointerdown', onWindowPointerDown);
  nextTick(() => fitView());
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('pointerdown', onWindowPointerDown);
});
</script>

<template>
  <div ref="viewportRef" class="mmc" @pointermove="onViewportPointerMove" @pointerup="onViewportPointerUp" @wheel.prevent="onWheel">
    <svg class="mmc-svg" xmlns="http://www.w3.org/2000/svg">
      <g :transform="`translate(${state.panX},${state.panY}) scale(${state.scale})`">
        <rect
          x="-100000"
          y="-100000"
          width="200000"
          height="200000"
          fill="transparent"
          @pointerdown="onBackgroundPointerDown"
          @contextmenu="openContextMenu($event, null)"
        />

        <path
          v-for="e in edges"
          :key="e.id"
          :d="`M ${byId.get(e.from)?.x! + byId.get(e.from)?.w!} ${byId.get(e.from)?.y! + byId.get(e.from)?.h!/2}
                C ${byId.get(e.from)?.x! + byId.get(e.from)?.w! + 36} ${byId.get(e.from)?.y! + byId.get(e.from)?.h!/2},
                  ${byId.get(e.to)?.x! - 36} ${byId.get(e.to)?.y! + byId.get(e.to)?.h!/2},
                  ${byId.get(e.to)?.x!} ${byId.get(e.to)?.y! + byId.get(e.to)?.h!/2}`"
          fill="none"
          stroke="#64748b"
          stroke-width="1.8"
        />

        <g
          v-for="n in layoutNodes"
          :key="n.id"
          :transform="`translate(${n.x},${n.y})`"
          @pointerdown.stop="beginNodeDrag($event, n.id)"
          @pointerup.stop="endNodeDrag"
          @dblclick.stop="beginInlineEdit(n.id)"
          @contextmenu.stop="openContextMenu($event, n.id)"
        >
          <rect
            :width="n.w"
            :height="n.h"
            rx="8"
            :fill="selectedIds.includes(n.id) ? '#dbeafe' : (n.bgColor || (state.theme === 'night' ? '#1f2937' : state.theme === 'forest' ? '#ecfdf5' : '#ffffff'))"
            :stroke="hoverDropTargetId === n.id ? '#16a34a' : selectedIds.includes(n.id) ? '#2563eb' : '#94a3b8'"
            :stroke-width="selectedIds.includes(n.id) ? 2.5 : 1.4"
          />
          <text
            x="12"
            y="25"
            :fill="n.textColor || (state.theme === 'night' ? '#f8fafc' : '#0f172a')"
            :font-size="n.fontSize || 13"
          >
            {{ n.icon ? `${n.icon} ` : '' }}{{ n.label }}
          </text>
        </g>

        <rect
          v-if="marqueeRect"
          :x="marqueeRect.x"
          :y="marqueeRect.y"
          :width="marqueeRect.w"
          :height="marqueeRect.h"
          fill="rgba(37,99,235,0.12)"
          stroke="#2563eb"
          stroke-dasharray="4 3"
        />
      </g>
    </svg>

    <input
      v-if="editingNodeLayout"
      v-model="editText"
      class="mmc-editor"
      :style="{
        left: `${state.panX + state.scale * (editingNodeLayout.x + 8)}px`,
        top: `${state.panY + state.scale * (editingNodeLayout.y + 8)}px`,
        width: `${Math.max(80, state.scale * (editingNodeLayout.w - 16))}px`,
      }"
      @keydown.enter.prevent="confirmInlineEdit"
      @keydown.esc.prevent="editNodeId = null"
      @blur="confirmInlineEdit"
    />

    <div class="mmc-tools">
      <button type="button" @click="fitView">Fit</button>
      <button type="button" @click="addRootNode">+ Root</button>
    </div>
    <div
      v-if="ctx.open"
      class="mmc-ctx"
      :style="{ left: `${ctx.x}px`, top: `${ctx.y}px` }"
      @pointerdown.stop
      @contextmenu.prevent
    >
      <button type="button" @click="addChildFromContext">Add child</button>
      <button type="button" @click="addSiblingFromContext">Add sibling</button>
      <button type="button" :disabled="!(ctx.nodeId || selectedIds[0])" @click="editFromContext">Rename</button>
      <button type="button" :disabled="!(ctx.nodeId || selectedIds[0])" @click="deleteFromContext">Delete</button>
      <button type="button" @click="fitView(); ctx.open = false">Fit view</button>
    </div>
  </div>
</template>

<style scoped>
.mmc { position: relative; flex: 1; min-height: 0; background: #f8fafc; overflow: hidden; }
.mmc-svg { width: 100%; height: 100%; display: block; }
.mmc-tools { position: absolute; left: 10px; bottom: 10px; display: flex; gap: 6px; }
.mmc-tools button { border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 4px 9px; cursor: pointer; }
.mmc-editor { position: absolute; z-index: 10; border: 1px solid #2563eb; border-radius: 6px; padding: 4px 6px; }
.mmc-ctx { position: fixed; z-index: 20; display: flex; flex-direction: column; min-width: 132px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18); padding: 4px; }
.mmc-ctx button { text-align: left; background: transparent; border: 0; border-radius: 6px; padding: 6px 8px; cursor: pointer; }
.mmc-ctx button:hover:not(:disabled) { background: #eff6ff; }
.mmc-ctx button:disabled { color: #94a3b8; cursor: not-allowed; }
</style>
