<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import type { LocaleId } from '../i18n/ui';
import { getMessages } from '../i18n/ui';
import {
  type ClassDef,
  type ClassDiagramState,
  type ClassPositions,
  type ClassDiagramEdgeVisibility,
  buildClassDiagramMarkdown,
  diagramBounds,
  estimateClassSize,
  parseOrDefault,
} from '../lib/classDiagramModel';
import { workspace } from '../stores/workspace';

const props = defineProps<{
  markdown: string;
  tabId: string;
  locale: LocaleId;
}>();

const m = computed(() => getMessages(props.locale));
const mkId = computed(() => `mk-${props.tabId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
const markerEndUrl = computed(() => `url(#${mkId.value})`);

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

const selectedClassId = ref<string | null>(null);
const ctx = reactive({ open: false, x: 0, y: 0, classId: '' as string });
const drag = ref<{ id: string; ox: number; oy: number } | null>(null);

const shortcutsOpen = ref(false);
const visibilityOpen = ref(true);

const inheritDrag = ref<{ fromId: string } | null>(null);
const tempInheritLine = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

function loadFromMarkdown(md: string): void {
  const { state: s, positions: p, folded: f, edgeVisibility: ev } = parseOrDefault(md);
  state.classes.splice(0, state.classes.length, ...s.classes);
  state.links.splice(0, state.links.length, ...s.links);
  Object.keys(positions).forEach((k) => delete positions[k]);
  Object.assign(positions, p);
  Object.keys(folded).forEach((k) => delete folded[k]);
  Object.assign(folded, f);
  edgeVisibility.inherit = ev.inherit;
  edgeVisibility.association = ev.association;
  lastSynced.value = md;
}

function pushMarkdown(): void {
  const md = buildClassDiagramMarkdown(
    props.markdown,
    state,
    positions,
    { ...folded },
    { inherit: edgeVisibility.inherit, association: edgeVisibility.association },
  );
  lastSynced.value = md;
  workspace.updateContent(props.tabId, md);
}

watch(
  () => props.markdown,
  (md) => {
    if (md === lastSynced.value) return;
    loadFromMarkdown(md);
    selectedClassId.value = null;
    ctx.open = false;
  },
);

watch(
  () => props.tabId,
  () => {
    loadFromMarkdown(props.markdown);
    resetView();
  },
);

onMounted(() => {
  loadFromMarkdown(props.markdown);
  window.addEventListener('click', onWindowClick);
  window.addEventListener('pointermove', onGlobalPointerMove);
  window.addEventListener('pointerup', onGlobalPointerUp);
});
onUnmounted(() => {
  window.removeEventListener('click', onWindowClick);
  window.removeEventListener('pointermove', onGlobalPointerMove);
  window.removeEventListener('pointerup', onGlobalPointerUp);
});

function onWindowClick(e: MouseEvent): void {
  const t = e.target as Node;
  if (ctx.open && viewportRef.value && !viewportRef.value.querySelector('.cde-ctx')?.contains(t)) {
    ctx.open = false;
  }
}

function classHue(index: number): string {
  const h = (index * 47) % 360;
  return `hsl(${h}, 58%, 88%)`;
}

function classHueStroke(index: number): string {
  const h = (index * 47) % 360;
  return `hsl(${h}, 42%, 42%)`;
}

function classAttrFill(index: number): string {
  const h = (index * 47) % 360;
  return `hsl(${h}, 42%, 96%)`;
}

function classMethFill(index: number): string {
  const h = (index * 47) % 360;
  return `hsl(${(h + 12) % 360}, 48%, 95%)`;
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

function toggleFold(classId: string): void {
  folded[classId] = !folded[classId];
  pushMarkdown();
}

function classIdAtWorldPoint(wx: number, wy: number): string | null {
  for (const c of state.classes) {
    const p = positions[c.id];
    if (!p) continue;
    const { w, h } = estimateClassSize(c, !!folded[c.id]);
    if (wx >= p.x && wx <= p.x + w && wy >= p.y && wy <= p.y + h) return c.id;
  }
  return null;
}

function startInheritDrag(e: PointerEvent, childId: string): void {
  e.stopPropagation();
  e.preventDefault();
  const p = positions[childId];
  if (!p) return;
  const s = estimateClassSize(state.classes.find((x) => x.id === childId)!, !!folded[childId]);
  const x1 = p.x + s.w / 2;
  const y1 = p.y;
  inheritDrag.value = { fromId: childId };
  const w = clientToWorld(e.clientX, e.clientY);
  tempInheritLine.value = { x1, y1, x2: w.x, y2: w.y };
}

function onGlobalPointerMove(e: PointerEvent): void {
  if (!inheritDrag.value || !tempInheritLine.value) return;
  const w = clientToWorld(e.clientX, e.clientY);
  tempInheritLine.value = {
    ...tempInheritLine.value,
    x2: w.x,
    y2: w.y,
  };
}

function onGlobalPointerUp(e: PointerEvent): void {
  if (!inheritDrag.value) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const childId = inheritDrag.value.fromId;
  const w = clientToWorld(e.clientX, e.clientY);
  const targetId = classIdAtWorldPoint(w.x, w.y);
  inheritDrag.value = null;
  tempInheritLine.value = null;
  if (!targetId || targetId === childId) return;
  state.links = state.links.filter((l) => !(l.kind === 'inherit' && l.from === childId));
  state.links.push({
    id: `inh-${Date.now()}`,
    from: childId,
    to: targetId,
    kind: 'inherit',
  });
  pushMarkdown();
}

function onSvgClassPointerDown(e: PointerEvent, classId: string): void {
  if (e.button !== 0 || inheritDrag.value) return;
  selectedClassId.value = classId;
  ctx.open = false;
  const pos = positions[classId];
  if (!pos) return;
  const w = clientToWorld(e.clientX, e.clientY);
  drag.value = { id: classId, ox: w.x - pos.x, oy: w.y - pos.y };
  (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
}

function onSvgClassPointerMove(e: PointerEvent, classId: string): void {
  const d = drag.value;
  if (!d || d.id !== classId || inheritDrag.value) return;
  const w = clientToWorld(e.clientX, e.clientY);
  positions[classId] = { x: w.x - d.ox, y: w.y - d.oy };
}

function onSvgClassPointerUp(e: PointerEvent, classId: string): void {
  if (drag.value?.id === classId) {
    drag.value = null;
    pushMarkdown();
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
  selectedClassId.value = classId;
  ctx.open = true;
  ctx.x = e.clientX;
  ctx.y = e.clientY;
  ctx.classId = classId;
}

const edgePaths = computed(() => {
  const out: { id: string; d: string; kind: string }[] = [];
  for (const l of state.links) {
    if (l.kind === 'inherit' && !edgeVisibility.inherit) continue;
    if (l.kind === 'association' && !edgeVisibility.association) continue;
    const fc = state.classes.find((x) => x.id === l.from);
    const tc = state.classes.find((x) => x.id === l.to);
    if (!fc || !tc) continue;
    const p1 = positions[l.from];
    const p2 = positions[l.to];
    if (!p1 || !p2) continue;
    const s1 = estimateClassSize(fc, !!folded[l.from]);
    const s2 = estimateClassSize(tc, !!folded[l.to]);
    let dpath: string;
    if (l.kind === 'inherit') {
      const x1 = p1.x + s1.w / 2;
      const y1 = p1.y;
      const x2 = p2.x + s2.w / 2;
      const y2 = p2.y + s2.h;
      dpath = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else {
      const x1 = p1.x + s1.w;
      const y1 = p1.y + s1.h / 2;
      const x2 = p2.x;
      const y2 = p2.y + s2.h / 2;
      dpath = `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    out.push({ id: l.id, d: dpath, kind: l.kind });
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

/** Mermaid 行首可见性：+ - # ~（与文档一致；私有成员以 - 开头） */
function memberVisibilityLead(line: string): string | null {
  const t = line.trimStart();
  const c = t.charAt(0);
  if (c === '-' || c === '#' || c === '~' || c === '+') return c;
  return null;
}

function memberAttrFill(line: string): string {
  const v = memberVisibilityLead(line);
  if (v === '-') return '#0f5132';
  if (v === '#') return '#166534';
  if (v === '~') return '#15803d';
  return '#14532d';
}

function memberMethFill(line: string): string {
  const v = memberVisibilityLead(line);
  if (v === '-') return '#1e40af';
  if (v === '#') return '#1d4ed8';
  if (v === '~') return '#1e3a8a';
  return '#1e3a5f';
}

function memberFontStyle(line: string): string {
  return memberVisibilityLead(line) === '-' ? 'italic' : 'normal';
}

function addAttrTo(classId: string): void {
  const c = state.classes.find((x) => x.id === classId);
  if (!c) return;
  c.attributes.push('+string newAttr');
  ctx.open = false;
  pushMarkdown();
}

function addMethodTo(classId: string): void {
  const c = state.classes.find((x) => x.id === classId);
  if (!c) return;
  c.methods.push('+newMethod()');
  ctx.open = false;
  pushMarkdown();
}

function addMemberTo(classId: string): void {
  addAttrTo(classId);
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

function deleteClass(classId: string): void {
  state.classes = state.classes.filter((c) => c.id !== classId);
  state.links = state.links.filter((l) => l.from !== classId && l.to !== classId);
  delete positions[classId];
  delete folded[classId];
  selectedClassId.value = null;
  ctx.open = false;
  pushMarkdown();
}
</script>

<template>
  <div class="cde">
    <div
      ref="viewportRef"
      class="cde-viewport"
      :title="`${m.cdeFit} · ${m.cdeOrigin} · ${m.cdeResetZoom} — 无全局快捷键`"
      @wheel.prevent="onWheel"
      @pointerdown="onViewportPointerDown"
      @pointermove="onViewportPointerMove"
      @pointerup="onViewportPointerUp"
      @pointercancel="onViewportPointerUp"
    >
      <div class="cde-world" :style="worldTransform()">
        <div class="cde-grid" aria-hidden="true" />
        <svg
          class="cde-svg"
          xmlns="http://www.w3.org/2000/svg"
          width="4800"
          height="3600"
          @contextmenu.prevent
        >
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

          <g
            v-for="(c, idx) in state.classes"
            :key="c.id"
            :transform="`translate(${positions[c.id]?.x ?? 0}, ${positions[c.id]?.y ?? 0})`"
            @pointerdown="onSvgClassPointerDown($event, c.id)"
            @pointermove="onSvgClassPointerMove($event, c.id)"
            @pointerup="onSvgClassPointerUp($event, c.id)"
            @contextmenu="onClassContextMenu($event, c.id)"
          >
            <circle
              :cx="124"
              :cy="-10"
              r="8"
              :fill="selectedClassId === c.id ? '#2563eb' : '#94a3b8'"
              stroke="#334155"
              stroke-width="1"
              class="cde-inherit-handle"
              @pointerdown.stop="startInheritDrag($event, c.id)"
            >
              <title>{{ m.cdsInheritHandleHint }}</title>
            </circle>
            <rect
              x="0"
              y="0"
              width="248"
              :height="estimateClassSize(c, !!folded[c.id]).h"
              :fill="classHue(idx)"
              :stroke="classHueStroke(idx)"
              stroke-width="2"
              rx="4"
              style="pointer-events: visiblePainted"
            />
            <rect
              x="4"
              y="4"
              width="22"
              height="22"
              fill="rgba(255,255,255,0.35)"
              stroke="#64748b"
              rx="2"
              @pointerdown.stop
              @click.stop="toggleFold(c.id)"
            />
            <text x="30" y="20" font-size="12" font-weight="700" fill="#0f172a" style="pointer-events: none; user-select: none">
              {{ escapeXml(c.name) }}
            </text>
            <template v-if="!folded[c.id]">
              <rect
                x="0"
                y="36"
                width="248"
                :height="attrBlockHeight(c)"
                :fill="classAttrFill(idx)"
                stroke="none"
                style="pointer-events: none"
              />
              <text
                v-for="(a, ai) in c.attributes"
                :key="'a' + ai"
                x="8"
                :y="attrTextY(ai)"
                font-size="10"
                font-family="ui-monospace, Consolas, monospace"
                :fill="memberAttrFill(a)"
                :font-style="memberFontStyle(a)"
                style="pointer-events: none; user-select: none"
              >
                {{ escapeXml(a) }}
              </text>
              <rect
                x="0"
                :y="36 + attrBlockHeight(c)"
                width="248"
                :height="methBlockHeight(c)"
                :fill="classMethFill(idx)"
                stroke="none"
                style="pointer-events: none"
              />
              <text
                v-for="(meth, mi) in c.methods"
                :key="'m' + mi"
                x="8"
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

          <path
            v-if="tempInheritLine"
            :d="`M ${tempInheritLine.x1} ${tempInheritLine.y1} L ${tempInheritLine.x2} ${tempInheritLine.y2}`"
            fill="none"
            stroke="#2563eb"
            stroke-width="2"
            stroke-dasharray="6 4"
            pointer-events="none"
          />
        </svg>
      </div>

      <div class="cde-panel cde-panel--shortcuts" :class="{ 'cde-panel--collapsed': !shortcutsOpen }">
        <button
          type="button"
          class="cde-panel__toggle"
          :aria-expanded="shortcutsOpen"
          :title="`${m.cdeShortcutsPanel} — 无全局快捷键`"
          @click="shortcutsOpen = !shortcutsOpen"
        >
          {{ m.cdeShortcutsPanel }}
          <span class="cde-panel__glyph">{{ shortcutsOpen ? '▴' : '▾' }}</span>
        </button>
        <pre v-show="shortcutsOpen" class="cde-panel__body">{{ m.cdeShortcutsBody }}</pre>
      </div>

      <div class="cde-panel cde-panel--visibility" :class="{ 'cde-panel--collapsed': !visibilityOpen }">
        <button
          type="button"
          class="cde-panel__toggle"
          :aria-expanded="visibilityOpen"
          :title="`${m.cdeVisibilityPanel} — 无全局快捷键`"
          @click="visibilityOpen = !visibilityOpen"
        >
          {{ m.cdeVisibilityPanel }}
          <span class="cde-panel__glyph">{{ visibilityOpen ? '▴' : '▾' }}</span>
        </button>
        <div v-show="visibilityOpen" class="cde-panel__body cde-panel__checks">
          <label class="cde-check">
            <input v-model="edgeVisibility.inherit" type="checkbox" @change="pushMarkdown()" />
            {{ m.cdeShowInherit }}
          </label>
          <label class="cde-check">
            <input v-model="edgeVisibility.association" type="checkbox" @change="pushMarkdown()" />
            {{ m.cdeShowAssoc }}
          </label>
        </div>
      </div>

      <div class="cde-hud" aria-hidden="false">
        <div class="cde-hud__row cde-hud__row--tools">
          <button
            type="button"
            class="cde-hud__mini cde-hud__iconbtn"
            :aria-label="m.cdeFit"
            :title="`${m.cdeFit} — 无全局快捷键`"
            @click="fitAll"
          >
            <span class="cde-hud__glyph" aria-hidden="true">⤢</span>
          </button>
          <button
            type="button"
            class="cde-hud__mini cde-hud__iconbtn"
            :aria-label="m.cdeOrigin"
            :title="`${m.cdeOrigin} — 无全局快捷键`"
            @click="originCenter"
          >
            <span class="cde-hud__glyph" aria-hidden="true">◎</span>
          </button>
          <button
            type="button"
            class="cde-hud__mini cde-hud__iconbtn"
            :aria-label="m.cdeResetZoom"
            :title="`${m.cdeResetZoom} — 无全局快捷键`"
            @click="resetZoom100"
          >
            <span class="cde-hud__glyph" aria-hidden="true">↺</span>
          </button>
        </div>
        <div class="cde-hud__row cde-hud__row--zoom">
          <button type="button" class="cde-hud__zoombtn" :title="`${m.cdeZoomOut} — 无全局快捷键`" @click="zoomDelta(-0.1)">
            −
          </button>
          <span class="cde-hud__pct">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="cde-hud__zoombtn" :title="`${m.cdeZoomIn} — 无全局快捷键`" @click="zoomDelta(0.1)">
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
        <button type="button" @click="addMemberTo(ctx.classId)">{{ m.cdeCtxMember }}</button>
        <button type="button" @click="addAttrTo(ctx.classId)">{{ m.cdeCtxAttr }}</button>
        <button type="button" @click="addMethodTo(ctx.classId)">{{ m.cdeCtxMethod }}</button>
        <button type="button" class="cde-ctx-danger" @click="deleteClass(ctx.classId)">{{ m.cdeDeleteClass }}</button>
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
}
:root[data-theme='dark'] .cde {
  --canvas-bg: #1a1b1f;
}

.cde-viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.cde-viewport:active {
  cursor: grabbing;
}

.cde-world {
  position: relative;
  display: inline-block;
  transform-origin: 0 0;
}

.cde-grid {
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
:root[data-theme='dark'] .cde-grid {
  --uml-paper-bg: #1c2028;
  --uml-grid-major: rgba(236, 239, 244, 0.07);
}

.cde-svg {
  position: relative;
  z-index: 1;
  display: block;
}

.cde-inherit-handle {
  cursor: crosshair;
}

.cde-panel {
  position: absolute;
  z-index: 8;
  max-width: min(280px, 42vw);
  border-radius: 6px;
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 94%, transparent);
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 0.72rem;
}
.cde-panel--shortcuts {
  left: 12px;
  top: 12px;
}
.cde-panel--visibility {
  right: 12px;
  top: 12px;
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
</style>
