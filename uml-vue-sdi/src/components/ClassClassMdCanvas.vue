<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { LocaleId } from '../i18n/ui';
import { getMessages } from '../i18n/ui';
import {
  type ClassMdState,
  parseClassMdMarkdown,
  rowToDiagramAttr,
  serializeClassMdMarkdown,
} from '../lib/classClassMdModel';
import { estimateClassSize, type ClassDef } from '../lib/classDiagramModel';
import { workspace } from '../stores/workspace';

const props = defineProps<{
  markdown: string;
  tabId: string;
  locale: LocaleId;
}>();

const m = computed(() => getMessages(props.locale));

const viewportRef = ref<HTMLElement | null>(null);
const state = reactive<ClassMdState>({
  title: 'Class',
  introMarkdown: '',
  meta: { inherits: null, associations: [] },
  rows: [],
});
const lastSynced = ref('');

const scale = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;

const mainPos = reactive({ x: 260, y: 260 });

function load(md: string): void {
  const s = parseClassMdMarkdown(md);
  state.title = s.title;
  state.introMarkdown = s.introMarkdown;
  state.meta = { ...s.meta };
  state.rows.splice(0, state.rows.length, ...s.rows);
  lastSynced.value = md;
}

function pushMd(): void {
  const md = serializeClassMdMarkdown(props.markdown, state);
  lastSynced.value = md;
  workspace.updateContent(props.tabId, md);
}

watch(
  () => props.markdown,
  (md) => {
    if (md === lastSynced.value) return;
    load(md);
  },
);

watch(
  () => props.tabId,
  () => load(props.markdown),
);

onMounted(() => {
  load(props.markdown);
});

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

function onPanMove(e: PointerEvent): void {
  if (!isPanning.value) return;
  panX.value = panOriginX + (e.clientX - panStartX);
  panY.value = panOriginY + (e.clientY - panStartY);
}

function onPanUp(e: PointerEvent): void {
  if (!isPanning.value) return;
  isPanning.value = false;
  try {
    viewportRef.value?.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function zoomDelta(d: number): void {
  const next = Math.min(4, Math.max(0.25, scale.value + d));
  scale.value = next;
}

function resetZoom100(): void {
  scale.value = 1;
}

const mainClassDef = computed<ClassDef>(() => {
  const attrs: string[] = [];
  const meths: string[] = [];
  for (const r of state.rows) {
    const line = rowToDiagramAttr(r);
    const k = r.kind.toLowerCase();
    if (k === 'method' || k === 'function') meths.push(line);
    else attrs.push(line);
  }
  if (attrs.length === 0) attrs.push(' ');
  if (meths.length === 0) meths.push(' ');
  return {
    id: 'main',
    name: state.title,
    attributes: attrs,
    methods: meths,
  };
});

const ghostInherit = computed<ClassDef | null>(() => {
  if (!state.meta.inherits) return null;
  return {
    id: 'ghost-inh',
    name: state.meta.inherits,
    attributes: [' '],
    methods: [' '],
  };
});

const ghostAssocs = computed<ClassDef[]>(() =>
  state.meta.associations.map((name, i) => ({
    id: `ghost-asc-${i}`,
    name,
    attributes: [' '],
    methods: [' '],
  })),
);

const ghostInheritPos = computed(() => ({ x: mainPos.x, y: 48 }));
const ghostAssocPos = computed(() =>
  ghostAssocs.value.map((_, i) => ({
    x: mainPos.x + 380,
    y: mainPos.y - 40 + i * 200,
  })),
);

const edgePaths = computed(() => {
  const out: { id: string; d: string; kind: 'inherit' | 'association' }[] = [];
  const mc = mainClassDef.value;
  const p0 = mainPos;
  const s0 = estimateClassSize(mc, false);

  const g = ghostInherit.value;
  if (g) {
    const p1 = ghostInheritPos.value;
    const s1 = estimateClassSize(g, false);
    const x1 = p0.x + s0.w / 2;
    const y1 = p0.y;
    const x2 = p1.x + s1.w / 2;
    const y2 = p1.y + s1.h;
    out.push({ id: 'e-inh', d: `M ${x1} ${y1} L ${x2} ${y2}`, kind: 'inherit' });
  }

  ghostAssocs.value.forEach((gc, i) => {
    const p2 = ghostAssocPos.value[i];
    if (!p2) return;
    const s2 = estimateClassSize(gc, false);
    const x1 = p0.x + s0.w;
    const y1 = p0.y + s0.h / 2;
    const x2 = p2.x;
    const y2 = p2.y + s2.h / 2;
    out.push({ id: `e-asc-${i}`, d: `M ${x1} ${y1} L ${x2} ${y2}`, kind: 'association' });
  });

  return out;
});

const mkId = computed(() => `mk-classmd-${props.tabId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
const markerEndUrl = computed(() => `url(#${mkId.value})`);

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attrBlockHeight(c: ClassDef): number {
  return Math.max(1, c.attributes.length) * 22 + 8;
}

function methBlockHeight(c: ClassDef): number {
  return Math.max(1, c.methods.length) * 22 + 8;
}

function attrTextY(i: number): number {
  return 50 + i * 22;
}

function methTextY(c: ClassDef, i: number): number {
  return 36 + attrBlockHeight(c) + 14 + i * 22;
}

const dragMain = ref(false);
let dragOx = 0;
let dragOy = 0;

function onMainPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return;
  const w = clientToWorld(e.clientX, e.clientY);
  dragMain.value = true;
  dragOx = w.x - mainPos.x;
  dragOy = w.y - mainPos.y;
  (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
}

function onMainPointerMove(e: PointerEvent): void {
  if (!dragMain.value) return;
  const w = clientToWorld(e.clientX, e.clientY);
  mainPos.x = w.x - dragOx;
  mainPos.y = w.y - dragOy;
}

function onMainPointerUp(e: PointerEvent): void {
  if (dragMain.value) {
    dragMain.value = false;
    try {
      (e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
}

function addRow(): void {
  state.rows.push({ kind: 'field', name: 'newField', type: 'string', note: '' });
  pushMd();
}

function removeRow(i: number): void {
  state.rows.splice(i, 1);
  pushMd();
}

function onCellChange(): void {
  pushMd();
}
</script>

<template>
  <div class="ccmd">
    <div
      ref="viewportRef"
      class="ccmd-viewport"
      :title="m.canvasViewportTitle"
      @wheel.prevent="onWheel"
      @pointerdown="onViewportPointerDown"
      @pointermove="onPanMove"
      @pointerup="onPanUp"
      @pointercancel="onPanUp"
    >
      <div class="ccmd-world" :style="worldTransform()">
        <div class="ccmd-grid" aria-hidden="true" />
        <svg class="ccmd-svg" xmlns="http://www.w3.org/2000/svg" width="4800" height="3600">
          <defs>
            <marker
              :id="mkId"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
            </marker>
          </defs>

          <template v-for="ep in edgePaths" :key="ep.id">
            <path
              :d="ep.d"
              fill="none"
              :stroke="ep.kind === 'inherit' ? '#475569' : '#64748b'"
              :stroke-width="ep.kind === 'inherit' ? 2 : 1.75"
              :stroke-dasharray="ep.kind === 'inherit' ? '7 5' : undefined"
              :marker-end="ep.kind === 'association' ? markerEndUrl : 'none'"
              pointer-events="none"
            />
          </template>

          <g v-if="ghostInherit" :transform="`translate(${ghostInheritPos.x}, ${ghostInheritPos.y})`">
            <rect
              x="0"
              y="0"
              width="248"
              :height="estimateClassSize(ghostInherit, false).h"
              fill="rgba(148, 163, 184, 0.35)"
              stroke="#64748b"
              stroke-width="2"
              stroke-dasharray="4 3"
              rx="4"
            />
            <text x="8" y="20" font-size="12" font-weight="700" fill="#334155">{{ escapeXml(ghostInherit.name) }}</text>
            <text x="8" y="38" font-size="9" fill="#475569">{{ m.classMdReadonlyInherit }}</text>
          </g>

          <g
            v-for="(gc, gi) in ghostAssocs"
            :key="gc.id"
            :transform="`translate(${ghostAssocPos[gi]?.x ?? 0}, ${ghostAssocPos[gi]?.y ?? 0})`"
          >
            <rect
              x="0"
              y="0"
              width="248"
              :height="estimateClassSize(gc, false).h"
              fill="rgba(148, 163, 184, 0.25)"
              stroke="#64748b"
              stroke-width="2"
              stroke-dasharray="4 3"
              rx="4"
            />
            <text x="8" y="20" font-size="12" font-weight="700" fill="#334155">{{ escapeXml(gc.name) }}</text>
            <text x="8" y="38" font-size="9" fill="#475569">{{ m.classMdReadonlyAssoc }}</text>
          </g>

          <g
            :transform="`translate(${mainPos.x}, ${mainPos.y})`"
            @pointerdown="onMainPointerDown"
            @pointermove="onMainPointerMove"
            @pointerup="onMainPointerUp"
            @pointercancel="onMainPointerUp"
          >
            <rect
              x="0"
              y="0"
              width="248"
              :height="estimateClassSize(mainClassDef, false).h"
              fill="hsl(200, 58%, 88%)"
              stroke="hsl(200, 42%, 42%)"
              stroke-width="2"
              rx="4"
              style="cursor: move"
            />
            <text x="8" y="20" font-size="12" font-weight="700" fill="#0f172a">{{ escapeXml(mainClassDef.name) }}</text>
            <rect x="0" y="36" width="248" :height="attrBlockHeight(mainClassDef)" fill="hsl(200, 42%, 96%)" />
            <text
              v-for="(a, ai) in mainClassDef.attributes"
              :key="'a' + ai"
              x="8"
              :y="attrTextY(ai)"
              font-size="10"
              font-family="ui-monospace, Consolas, monospace"
              fill="#14532d"
            >
              {{ escapeXml(a) }}
            </text>
            <rect
              x="0"
              :y="36 + attrBlockHeight(mainClassDef)"
              width="248"
              :height="methBlockHeight(mainClassDef)"
              fill="hsl(212, 48%, 95%)"
            />
            <text
              v-for="(meth, mi) in mainClassDef.methods"
              :key="'m' + mi"
              x="8"
              :y="methTextY(mainClassDef, mi)"
              font-size="10"
              font-family="ui-monospace, Consolas, monospace"
              fill="#1e3a5f"
            >
              {{ escapeXml(meth) }}
            </text>
          </g>
        </svg>
      </div>

      <div class="ccmd-hud">
        <div class="ccmd-hud__row">
          <button type="button" class="ccmd-hud__btn" :title="m.cdeResetZoom" @click="resetZoom100">100%</button>
          <button type="button" class="ccmd-hud__btn" @click="zoomDelta(-0.1)">−</button>
          <span class="ccmd-hud__pct">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="ccmd-hud__btn" @click="zoomDelta(0.1)">+</button>
        </div>
      </div>
    </div>

    <div class="ccmd-table-wrap">
      <p class="ccmd-table-hint">{{ m.classMdTableHint }}</p>
      <table class="ccmd-table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Name</th>
            <th>Type</th>
            <th>Note</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in state.rows" :key="ri">
            <td><input v-model="row.kind" class="ccmd-inp" @change="onCellChange" /></td>
            <td><input v-model="row.name" class="ccmd-inp" @change="onCellChange" /></td>
            <td><input v-model="row.type" class="ccmd-inp" @change="onCellChange" /></td>
            <td><input v-model="row.note" class="ccmd-inp" @change="onCellChange" /></td>
            <td>
              <button type="button" class="ccmd-del" @click="removeRow(ri)">{{ m.cdeDelete }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="ccmd-add" @click="addRow">{{ m.classMdAddRow }}</button>
    </div>
  </div>
</template>

<style scoped>
.ccmd {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--canvas-bg, #eceff4);
}
:root[data-theme='dark'] .ccmd {
  --canvas-bg: #1a1b1f;
}

.ccmd-viewport {
  flex: 1;
  min-height: 180px;
  position: relative;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.ccmd-viewport:active {
  cursor: grabbing;
}

.ccmd-world {
  position: relative;
  display: inline-block;
  transform-origin: 0 0;
}

.ccmd-grid {
  position: absolute;
  left: 0;
  top: 0;
  width: 4800px;
  height: 3600px;
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
:root[data-theme='dark'] .ccmd-grid {
  --uml-paper-bg: #1c2028;
  --uml-grid-major: rgba(236, 239, 244, 0.07);
}

.ccmd-svg {
  position: relative;
  z-index: 1;
  display: block;
}

.ccmd-hud {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 7;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ccmd-hud__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 65%, transparent);
}
.ccmd-hud__btn {
  font: inherit;
  font-size: 0.75rem;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
}
.ccmd-hud__pct {
  min-width: 3.5em;
  text-align: center;
  font-weight: 600;
  font-size: 0.8rem;
}

.ccmd-table-wrap {
  flex: 0 0 auto;
  max-height: 40vh;
  overflow: auto;
  padding: 10px 12px 14px;
  border-top: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
}
:root[data-theme='dark'] .ccmd-table-wrap {
  --editor-bg: #25262c;
}
.ccmd-table-hint {
  margin: 0 0 8px;
  font-size: 0.8rem;
  opacity: 0.85;
}
.ccmd-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.ccmd-table th,
.ccmd-table td {
  border: 1px solid var(--border, #ccc);
  padding: 4px 6px;
  text-align: left;
}
.ccmd-inp {
  width: 100%;
  min-width: 4rem;
  font: inherit;
  border: none;
  background: transparent;
  color: inherit;
}
.ccmd-del {
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}
.ccmd-add {
  margin-top: 8px;
  font: inherit;
  cursor: pointer;
  padding: 6px 12px;
}
</style>
