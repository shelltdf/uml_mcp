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
import { getSyncConfigFromTabs, resolveClassImplementationPaths } from '../lib/classImplPaths';
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
  if (!state.meta?.inherits) return null;
  return {
    id: 'ghost-inh',
    name: state.meta.inherits,
    attributes: [' '],
    methods: [' '],
  };
});

const ghostAssocs = computed<ClassDef[]>(() =>
  (state.meta?.associations ?? []).map((name, i) => ({
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

const classMdWorkspacePath = computed(() => workspace.getTabPathById(props.tabId));

const resolvedImplPaths = computed(() => {
  try {
    return resolveClassImplementationPaths(
      classMdWorkspacePath.value,
      state.title,
      state.meta?.code_files,
      getSyncConfigFromTabs(workspace.state.tabs),
    );
  } catch {
    return [] as string[];
  }
});

const syncedModalOpen = ref(false);
const syncedEntries = ref<{ path: string; content: string; inWorkspace: boolean }[]>([]);

function openSyncedCodeModal(): void {
  const paths = resolvedImplPaths.value;
  syncedEntries.value = paths.map((p) => {
    const tab = workspace.findTabByWorkspacePath(p);
    return { path: p, content: tab?.content ?? '', inWorkspace: !!tab };
  });
  syncedModalOpen.value = true;
}

function focusImplTab(p: string): void {
  workspace.focusTabByWorkspacePath(p);
}
</script>

<template>
  <div class="ccmd">
    <div
      ref="viewportRef"
      class="ccmd-viewport"
      :class="{ 'ccmd-viewport--panning': isPanning }"
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
            <text x="8" y="20" font-size="12" font-weight="700" fill="#334155" style="pointer-events: none; user-select: none">
              {{ escapeXml(ghostInherit.name) }}
            </text>
            <text x="8" y="38" font-size="9" fill="#475569" style="pointer-events: none; user-select: none">
              {{ m.classMdReadonlyInherit }}
            </text>
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
            <text x="8" y="20" font-size="12" font-weight="700" fill="#334155" style="pointer-events: none; user-select: none">
              {{ escapeXml(gc.name) }}
            </text>
            <text x="8" y="38" font-size="9" fill="#475569" style="pointer-events: none; user-select: none">
              {{ m.classMdReadonlyAssoc }}
            </text>
          </g>

          <g
            class="ccmd-main-class"
            :transform="`translate(${mainPos.x}, ${mainPos.y})`"
            @pointerdown="onMainPointerDown"
            @pointermove="onMainPointerMove"
            @pointerup="onMainPointerUp"
            @pointercancel="onMainPointerUp"
          >
            <rect
              class="ccmd-class-body"
              x="0"
              y="0"
              width="248"
              :height="estimateClassSize(mainClassDef, false).h"
              fill="hsl(200, 58%, 88%)"
              stroke="hsl(200, 42%, 42%)"
              stroke-width="2"
              rx="4"
              style="pointer-events: visiblePainted; cursor: move"
            />
            <text
              x="8"
              y="20"
              font-size="12"
              font-weight="700"
              fill="#0f172a"
              style="pointer-events: none; user-select: none"
            >
              {{ escapeXml(mainClassDef.name) }}
            </text>
            <rect
              x="0"
              y="36"
              width="248"
              :height="attrBlockHeight(mainClassDef)"
              fill="hsl(200, 42%, 96%)"
              style="pointer-events: none"
            />
            <text
              v-for="(a, ai) in mainClassDef.attributes"
              :key="'a' + ai"
              x="8"
              :y="attrTextY(ai)"
              font-size="10"
              font-family="ui-monospace, Consolas, monospace"
              fill="#14532d"
              style="pointer-events: none; user-select: none"
            >
              {{ escapeXml(a) }}
            </text>
            <rect
              x="0"
              :y="36 + attrBlockHeight(mainClassDef)"
              width="248"
              :height="methBlockHeight(mainClassDef)"
              fill="hsl(212, 48%, 95%)"
              style="pointer-events: none"
            />
            <text
              v-for="(meth, mi) in mainClassDef.methods"
              :key="'m' + mi"
              x="8"
              :y="methTextY(mainClassDef, mi)"
              font-size="10"
              font-family="ui-monospace, Consolas, monospace"
              fill="#1e3a5f"
              style="pointer-events: none; user-select: none"
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
      <div class="ccmd-members-card">
        <div class="ccmd-members-card__head">
          <div class="ccmd-members-card__head-row">
            <h3 class="ccmd-members-card__title">{{ m.classMdMembersTitle }}</h3>
            <button
              type="button"
              class="ccmd-btn-sync"
              :disabled="resolvedImplPaths.length === 0"
              :title="resolvedImplPaths.length === 0 ? m.classMdSyncedNoPaths : m.classMdViewSyncedCode"
              @click="openSyncedCodeModal"
            >
              {{ m.classMdViewSyncedCode }}
            </button>
          </div>
          <p class="ccmd-members-card__hint">{{ m.classMdTableHint }}</p>
        </div>
        <div class="ccmd-table-scroll">
          <table class="ccmd-table">
            <thead>
              <tr>
                <th>{{ m.codeCanvasFieldKind }}</th>
                <th>{{ m.codeCanvasFieldName }}</th>
                <th>{{ m.codeCanvasFieldType }}</th>
                <th>{{ m.codeCanvasFieldNote }}</th>
                <th class="ccmd-table__col-actions" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in state.rows" :key="ri">
                <td><input v-model="row.kind" class="ccmd-inp" @change="onCellChange" /></td>
                <td><input v-model="row.name" class="ccmd-inp" @change="onCellChange" /></td>
                <td><input v-model="row.type" class="ccmd-inp" @change="onCellChange" /></td>
                <td><input v-model="row.note" class="ccmd-inp" @change="onCellChange" /></td>
                <td class="ccmd-table__col-actions">
                  <button type="button" class="ccmd-del" :title="m.cdeDelete" @click="removeRow(ri)">
                    {{ m.cdeDelete }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button type="button" class="ccmd-add" @click="addRow">{{ m.classMdAddRow }}</button>
      </div>
    </div>

    <div
      v-if="syncedModalOpen"
      class="ccmd-sync-overlay"
      role="presentation"
      @click.self="syncedModalOpen = false"
    >
      <div
        class="ccmd-sync-dialog"
        role="dialog"
        :aria-label="m.classMdSyncedModalTitle"
        @click.stop
      >
        <div class="ccmd-sync-dialog__head">
          <h3 class="ccmd-sync-dialog__title">{{ m.classMdSyncedModalTitle }}</h3>
          <button type="button" class="ccmd-sync-dialog__close" @click="syncedModalOpen = false">
            {{ m.classMdSyncedClose }}
          </button>
        </div>
        <p v-if="resolvedImplPaths.length === 0" class="ccmd-sync-empty">{{ m.classMdSyncedNoPaths }}</p>
        <div v-else class="ccmd-sync-grid">
          <section v-for="(ent, ei) in syncedEntries" :key="ei" class="ccmd-sync-block">
            <header class="ccmd-sync-block__head">
              <code class="ccmd-sync-block__path">{{ ent.path }}</code>
              <button
                v-if="ent.inWorkspace"
                type="button"
                class="ccmd-sync-block__tab"
                @click="
                  focusImplTab(ent.path);
                  syncedModalOpen = false;
                "
              >
                {{ m.classMdSyncedOpenInTab }}
              </button>
              <span v-else class="ccmd-sync-block__missing">{{ m.classMdSyncedMissing }}</span>
            </header>
            <pre v-if="ent.inWorkspace" class="ccmd-sync-block__pre">{{ ent.content }}</pre>
          </section>
        </div>
      </div>
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
  user-select: none;
  -webkit-user-select: none;
}
:root[data-theme='dark'] .ccmd {
  --canvas-bg: #1a1b1f;
}

.ccmd-viewport {
  flex: 1;
  min-height: 180px;
  position: relative;
  overflow: hidden;
  cursor: default;
  touch-action: none;
}
.ccmd-viewport--panning {
  cursor: grabbing;
}
.ccmd-class-body:hover {
  filter: brightness(1.02);
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
  max-height: 44vh;
  overflow: hidden;
  padding: 12px 14px 16px;
  border-top: 1px solid color-mix(in srgb, var(--border, #ccc) 80%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--editor-bg, #fff) 96%, #64748b) 0%, var(--editor-bg, #fff) 32%);
}
:root[data-theme='dark'] .ccmd-table-wrap {
  --editor-bg: #25262c;
}

.ccmd-members-card {
  max-width: 960px;
  margin: 0 auto;
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 70%, transparent);
  background: color-mix(in srgb, var(--editor-bg, #fff) 97%, #94a3b8);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}
:root[data-theme='dark'] .ccmd-members-card {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
}
.ccmd-members-card__head {
  margin-bottom: 12px;
}
.ccmd-members-card__head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.ccmd-members-card__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text, #0f172a);
}
.ccmd-btn-sync {
  flex-shrink: 0;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, #2563eb 45%, var(--border, #ccc));
  color: #1d4ed8;
  background: color-mix(in srgb, var(--editor-bg, #fff) 90%, #93c5fd);
}
.ccmd-btn-sync:hover:not(:disabled) {
  filter: brightness(1.04);
}
.ccmd-btn-sync:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ccmd-members-card__hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  opacity: 0.88;
  color: color-mix(in srgb, var(--text, #0f172a) 88%, transparent);
}

.ccmd-table-scroll {
  overflow: auto;
  max-height: min(28vh, 320px);
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 55%, transparent);
  background: var(--editor-bg, #fff);
}
.ccmd-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8rem;
}
.ccmd-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--text, #334155) 85%, transparent);
  background: color-mix(in srgb, var(--editor-bg, #fff) 92%, #64748b);
  border-bottom: 1px solid color-mix(in srgb, var(--border, #ccc) 60%, transparent);
  white-space: nowrap;
}
.ccmd-table tbody tr:nth-child(even) td {
  background: color-mix(in srgb, var(--editor-bg, #fff) 97%, #94a3b8);
}
.ccmd-table tbody tr:hover td {
  background: color-mix(in srgb, var(--editor-bg, #fff) 93%, #3b82f6);
}
.ccmd-table th,
.ccmd-table td {
  padding: 6px 8px;
  vertical-align: middle;
  border-bottom: 1px solid color-mix(in srgb, var(--border, #ccc) 45%, transparent);
}
.ccmd-table__col-actions {
  width: 4.5rem;
  text-align: center;
  white-space: nowrap;
}
.ccmd-inp {
  width: 100%;
  min-width: 3.5rem;
  font: inherit;
  font-size: 0.82rem;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 65%, transparent);
  background: color-mix(in srgb, var(--editor-bg, #fff) 96%, #f1f5f9);
  color: inherit;
  outline: none;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.ccmd-inp:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.ccmd-del {
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, #b91c1c 35%, var(--border, #ccc));
  color: #b91c1c;
  background: color-mix(in srgb, #fff 92%, #fecaca);
}
:root[data-theme='dark'] .ccmd-del {
  background: color-mix(in srgb, var(--editor-bg, #25262c) 90%, #7f1d1d);
  color: #fca5a5;
}
.ccmd-del:hover {
  filter: brightness(1.05);
}
.ccmd-add {
  margin-top: 12px;
  font: inherit;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 55%, #3b82f6);
  color: #1d4ed8;
  background: color-mix(in srgb, var(--editor-bg, #fff) 94%, #93c5fd);
}
.ccmd-add:hover {
  filter: brightness(1.03);
}
.ccmd-table-wrap .ccmd-inp,
.ccmd-table-wrap .ccmd-add,
.ccmd-table-wrap .ccmd-del {
  user-select: text;
  -webkit-user-select: text;
}

.ccmd-sync-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}
.ccmd-sync-dialog {
  width: min(960px, 100%);
  max-height: min(88vh, 900px);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: var(--editor-bg, #fff);
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.ccmd-sync-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--border, #ccc) 70%, transparent);
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 88%, transparent);
}
.ccmd-sync-dialog__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
.ccmd-sync-dialog__close {
  font: inherit;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
}
.ccmd-sync-empty {
  margin: 0;
  padding: 16px 20px;
  font-size: 0.85rem;
  opacity: 0.9;
}
.ccmd-sync-grid {
  padding: 12px 16px 18px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ccmd-sync-block {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 65%, transparent);
  overflow: hidden;
  background: color-mix(in srgb, var(--editor-bg, #fff) 96%, #64748b);
}
.ccmd-sync-block__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 8px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border, #ccc) 50%, transparent);
  font-size: 0.75rem;
}
.ccmd-sync-block__path {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.72rem;
  word-break: break-all;
}
.ccmd-sync-block__tab {
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, #2563eb 40%, var(--border, #ccc));
  color: #1d4ed8;
  background: color-mix(in srgb, var(--editor-bg, #fff) 92%, #bfdbfe);
}
.ccmd-sync-block__missing {
  color: #b45309;
  max-width: 36rem;
  line-height: 1.35;
}
:root[data-theme='dark'] .ccmd-sync-block__missing {
  color: #fbbf24;
}
.ccmd-sync-block__pre {
  margin: 0;
  max-height: min(40vh, 360px);
  overflow: auto;
  padding: 10px 12px;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.72rem;
  line-height: 1.4;
  white-space: pre;
  tab-size: 2;
}
</style>
