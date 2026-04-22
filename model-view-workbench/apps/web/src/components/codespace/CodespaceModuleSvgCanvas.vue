<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import type { MvModelCodespacePayload } from '@mvwb/core';
import { useCanvasViewport } from '../../composables/useCanvasViewport';
import { CS_CANVAS_MSG_KEY, makeCodespaceLayoutLabels } from '../../i18n/codespace-canvas-messages';
import { layoutCodespaceSvg, type CodespaceLayoutNode, type CodespaceSvgPick } from '../../utils/codespace-svg-layout';

const csMsg = inject(CS_CANVAS_MSG_KEY)!;

const props = defineProps<{
  modelValue: MvModelCodespacePayload;
  selected: CodespaceSvgPick | null;
}>();

const emit = defineEmits<{
  select: [CodespaceSvgPick | null];
  openDefinition: [CodespaceSvgPick];
  addModule: [];
  addTopLevelNs: [mi: number];
  addChildNs: [mi: number, path: number[]];
  addClass: [mi: number, path: number[]];
  addClassEnum: [mi: number, path: number[], ci: number, classPath?: number[]];
  addEnum: [mi: number, path: number[]];
  addVar: [mi: number, path: number[]];
  addFn: [mi: number, path: number[]];
  addMacro: [mi: number, path: number[]];
  requestDeletePick: [pick: CodespaceSvgPick];
}>();

const viewportRef = ref<HTMLElement | null>(null);
const vp = useCanvasViewport(viewportRef);

const layout = computed(() =>
  layoutCodespaceSvg(props.modelValue, makeCodespaceLayoutLabels(csMsg.value)),
);

const contentOffset = computed(() => {
  const b = layout.value.bounds;
  return {
    x: b.minX < 24 ? 24 - b.minX : 0,
    y: b.minY < 24 ? 24 - b.minY : 0,
  };
});

const worldMetrics = computed(() => {
  const b = layout.value.bounds;
  const w = Math.max(480, b.maxX + contentOffset.value.x + 80);
  const h = Math.max(320, b.maxY + contentOffset.value.y + 80);
  return { w, h };
});

const worldDivStyle = computed(() => ({
  width: `${worldMetrics.value.w}px`,
  height: `${worldMetrics.value.h}px`,
  transform: vp.transformStyle.value,
  transformOrigin: '0 0' as const,
}));

const renderDebugSnapshot = computed(() => ({
  timestamp: new Date().toISOString(),
  viewport: {
    scale: vp.scale.value,
    panX: vp.panX.value,
    panY: vp.panY.value,
    zoomPercent: vp.zoomPercent.value,
  },
  worldMetrics: worldMetrics.value,
  contentOffset: contentOffset.value,
  bounds: layout.value.bounds,
  viewBounds: viewBounds.value,
  nodes: layout.value.nodes.map((n) => ({
    pick: n.pick,
    label: n.label,
    x: n.x,
    y: n.y,
    w: n.w,
    h: n.h,
  })),
  edges: layout.value.edges.map((e) => ({
    kind: e.kind ?? 'tree',
    d: e.d,
  })),
}));

const viewBounds = computed(() => {
  const b = layout.value.bounds;
  return {
    minX: b.minX + contentOffset.value.x,
    minY: b.minY + contentOffset.value.y,
    maxX: b.maxX + contentOffset.value.x,
    maxY: b.maxY + contentOffset.value.y,
  };
});

const viewportBgStyle = computed(() => {
  const s = Math.max(8, Math.round(24 * vp.scale.value));
  const px = Math.round(vp.panX.value);
  const py = Math.round(vp.panY.value);
  return {
    backgroundSize: `${s}px ${s}px`,
    backgroundPosition: `${px}px ${py}px`,
  };
});

function pickKey(p: CodespaceSvgPick): string {
  if (p.t === 'module') return `m-${p.mi}`;
  if (p.t === 'ns') return `ns-${p.mi}-${p.path.join('.')}`;
  if (p.t === 'class') return `c-${p.mi}-${p.path.join('.')}-${p.ci}-${(p.classPath ?? []).join('.')}`;
  if (p.t === 'enum') return `e-${p.mi}-${p.path.join('.')}-${p.ci ?? -1}-${(p.classPath ?? []).join('.')}-${p.eni}`;
  if (p.t === 'var') return `v-${p.mi}-${p.path.join('.')}-${p.vi}`;
  if (p.t === 'fn') return `f-${p.mi}-${p.path.join('.')}-${p.fi}`;
  return `mac-${p.mi}-${p.path.join('.')}-${p.maci}`;
}

/** SVG `id` 合法字符（path 含 `.` 等） */
function clipIdFor(p: CodespaceSvgPick): string {
  return `cp-${pickKey(p).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function clipIdForIndex(i: number): string {
  return `cp-i-${i}`;
}

function isSelected(p: CodespaceSvgPick): boolean {
  const s = props.selected;
  if (!s) return false;
  return JSON.stringify(s) === JSON.stringify(p);
}

function onNodeClick(n: CodespaceLayoutNode, e: MouseEvent) {
  e.stopPropagation();
  emit('select', n.pick);
}

function onNodeDblClick(n: CodespaceLayoutNode, e: MouseEvent) {
  e.stopPropagation();
  emit('select', n.pick);
  emit('openDefinition', n.pick);
}

function onViewportClick(e: MouseEvent) {
  if (e.defaultPrevented) return;
  closeCtxMenu();
  emit('select', null);
}

function fillFor(n: CodespaceLayoutNode): string {
  if (n.pick.t === 'module') return '#e0e7ff';
  if (n.pick.t === 'ns') return '#f1f5f9';
  if (n.pick.t === 'class') return '#fef9c3';
  if (n.pick.t === 'enum') return '#f3e8ff';
  if (n.pick.t === 'var') return '#ecfccb';
  if (n.pick.t === 'fn') return '#dbeafe';
  return '#fce7f3';
}

function strokeFor(n: CodespaceLayoutNode): string {
  if (isSelected(n.pick)) return '#2563eb';
  return '#94a3b8';
}

function strokeW(n: CodespaceLayoutNode): number {
  return isSelected(n.pick) ? 1.75 : 0.85;
}

function edgeStroke(e: { kind?: 'tree' | 'inheritance' | 'containment' }): string {
  if (e.kind === 'containment') return '#64748b';
  if (e.kind === 'inheritance') return '#475569';
  return '#64748b';
}

function edgeStrokeWidth(e: { kind?: 'tree' | 'inheritance' | 'containment' }): number {
  if (e.kind === 'containment') return 1;
  return 1;
}

function edgeDash(e: { kind?: 'tree' | 'inheritance' | 'containment' }): string | undefined {
  return undefined;
}

function fitView() {
  vp.zoomToFit(viewBounds.value, 28);
}

function originView() {
  vp.originToContentCenter(viewBounds.value);
}

async function copyRenderDebugInfo() {
  const text = JSON.stringify(renderDebugSnapshot.value, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    window.alert('Drawing info copied to clipboard.');
  }
  catch {
    window.alert('Copy failed: clipboard write is not supported in this environment.');
  }
}

function mountedFit() {
  requestAnimationFrame(() => {
    fitView();
  });
}

const ctxMenuOpen = ref(false);
const ctxMenuX = ref(0);
const ctxMenuY = ref(0);
type CtxMenuItem = {
  key: string;
  label: string;
  title?: string;
  danger?: boolean;
  run: () => void;
};
const ctxMenuItems = ref<CtxMenuItem[]>([]);

function closeCtxMenu() {
  ctxMenuOpen.value = false;
  ctxMenuItems.value = [];
}

function openCtxMenu(e: MouseEvent, items: CtxMenuItem[]) {
  const pad = 8;
  const mw = 220;
  const mh = Math.max(44, items.length * 36 + 8);
  ctxMenuX.value = Math.min(e.clientX, window.innerWidth - mw - pad);
  ctxMenuY.value = Math.min(e.clientY, window.innerHeight - mh - pad);
  ctxMenuItems.value = items;
  ctxMenuOpen.value = true;
}

function onViewportContextMenu(e: MouseEvent) {
  e.preventDefault();
  openCtxMenu(e, [
    {
      key: 'add-module',
      label: csMsg.value.svgCtxAddModuleLabel,
      title: csMsg.value.svgCtxAddModuleTitle,
      run: () => emit('addModule'),
    },
  ]);
}

function onNodeContextMenu(n: CodespaceLayoutNode, e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  emit('select', n.pick);
  const p = n.pick;
  const items: CtxMenuItem[] = [
    {
      key: 'edit',
      label: '编辑',
      title: '打开属性窗口',
      run: () => emit('openDefinition', p),
    },
  ];
  if (p.t === 'module') {
    items.push({
      key: 'add-ns',
      label: csMsg.value.flModAddRootNsLabel,
      title: csMsg.value.flModAddRootNsTitle,
      run: () => emit('addTopLevelNs', p.mi),
    });
  }
  if (p.t === 'ns') {
    items.push(
      {
        key: 'add-child-ns',
        label: csMsg.value.flNsAddChildNsLabel,
        title: csMsg.value.flNsAddChildNsTitle,
        run: () => emit('addChildNs', p.mi, p.path),
      },
      {
        key: 'add-class',
        label: csMsg.value.flNsAddClassLabel,
        title: csMsg.value.flNsAddClassTitle,
        run: () => emit('addClass', p.mi, p.path),
      },
      {
        key: 'add-enum',
        label: csMsg.value.flNsAddEnumLabel,
        title: csMsg.value.flNsAddEnumTitle,
        run: () => emit('addEnum', p.mi, p.path),
      },
      {
        key: 'add-var',
        label: csMsg.value.flNsAddVarLabel,
        title: csMsg.value.flNsAddVarTitle,
        run: () => emit('addVar', p.mi, p.path),
      },
      {
        key: 'add-fn',
        label: csMsg.value.flNsAddFnLabel,
        title: csMsg.value.flNsAddFnTitle,
        run: () => emit('addFn', p.mi, p.path),
      },
      {
        key: 'add-macro',
        label: csMsg.value.flNsAddMacroLabel,
        title: csMsg.value.flNsAddMacroTitle,
        run: () => emit('addMacro', p.mi, p.path),
      },
    );
  }
  if (p.t === 'class') {
    items.push({
      key: 'add-class-enum',
      label: csMsg.value.flNsAddEnumLabel,
      title: csMsg.value.flNsAddEnumTitle,
      run: () => emit('addClassEnum', p.mi, p.path, p.ci, p.classPath),
    });
  }
  items.push({
    key: 'delete',
    label: '删除',
    title: '删除当前对象',
    danger: true,
    run: () => emit('requestDeletePick', p),
  });
  openCtxMenu(e, items);
}

function onCtxMenuItemClick(item: CtxMenuItem) {
  item.run();
  closeCtxMenu();
}

function onCtxKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeCtxMenu();
}

onMounted(() => {
  mountedFit();
  window.addEventListener('keydown', onCtxKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onCtxKeydown);
});
</script>

<template>
  <div class="cs-svg-canvas">
    <details class="cs-svg-keys">
      <summary :title="csMsg.svgKeysTitle">{{ csMsg.svgKeysSummary }}</summary>
      <pre class="cs-svg-keys-pre">{{ csMsg.svgKeysBody }}</pre>
    </details>

    <div
      ref="viewportRef"
      class="cs-svg-viewport"
      :style="viewportBgStyle"
      @wheel="vp.onWheel"
      @pointerdown="vp.onPointerDown"
      @pointermove="vp.onPointerMove"
      @pointerup="vp.onPointerUp"
      @pointerleave="vp.onPointerUp"
      @pointercancel="vp.onPointerUp"
      @click="onViewportClick"
      @contextmenu="onViewportContextMenu"
    >
      <div class="cs-svg-world" :style="worldDivStyle">
        <svg
          class="cs-svg-root"
          :width="worldMetrics.w"
          :height="worldMetrics.h"
          :viewBox="`0 0 ${worldMetrics.w} ${worldMetrics.h}`"
          :aria-label="csMsg.svgAriaModuleTree"
        >
          <defs>
            <clipPath v-for="(n, ni) in layout.nodes" :key="'clipdef-' + ni" :id="clipIdForIndex(ni)">
              <rect
                :x="n.x + contentOffset.x + 1"
                :y="n.y + contentOffset.y + 1"
                :width="Math.max(0, n.w - 2)"
                :height="Math.max(0, n.h - 2)"
                rx="2"
              />
            </clipPath>
          </defs>
          <!-- 连线 → 矩形 → 文字：贝塞尔边在矩形之下；实线 -->
          <g class="cs-svg-edges" aria-hidden="true">
            <path
              v-for="(e, ei) in layout.edges"
              :key="'e-' + ei"
              :d="e.d"
              :transform="`translate(${contentOffset.x}, ${contentOffset.y})`"
              class="cs-svg-edge"
              fill="none"
              :stroke="edgeStroke(e)"
              :stroke-width="edgeStrokeWidth(e)"
              :stroke-dasharray="edgeDash(e)"
              stroke-linecap="round"
              stroke-linejoin="round"
              pointer-events="none"
            />
          </g>
          <g v-for="(n, ni) in layout.nodes" :key="'r-' + ni" class="cs-svg-nodeg cs-svg-nodeg-rect">
            <rect
              :x="n.x + contentOffset.x"
              :y="n.y + contentOffset.y"
              :width="n.w"
              :height="n.h"
              :rx="3"
              :fill="fillFor(n)"
              :stroke="strokeFor(n)"
              :stroke-width="strokeW(n)"
              class="cs-svg-hit"
              :tabindex="0"
              role="button"
              :aria-label="n.label"
              vector-effect="non-scaling-stroke"
              @click="onNodeClick(n, $event)"
              @contextmenu="onNodeContextMenu(n, $event)"
              @dblclick="onNodeDblClick(n, $event)"
              @keydown.enter.prevent="emit('openDefinition', n.pick)"
            />
          </g>
          <g v-for="(n, ni) in layout.nodes" :key="'t-' + ni" class="cs-svg-nodeg cs-svg-nodeg-txt">
            <text
              :x="n.x + contentOffset.x + 6"
              :y="n.y + contentOffset.y + n.h / 2"
              class="cs-svg-txt"
              dominant-baseline="middle"
              text-anchor="start"
              pointer-events="none"
              :clip-path="`url(#${clipIdForIndex(ni)})`"
              :font-size="n.pick.t === 'module' ? 10.5 : 11"
              fill="#0f172a"
            >
              {{ n.label }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <div class="cs-svg-hud" :aria-label="csMsg.svgHudAria">
      <button type="button" class="cs-svg-hud-btn" :title="csMsg.svgZoomOutTitle" @click="vp.zoomDelta(-0.1)">−</button>
      <span class="cs-svg-hud-pct" :title="csMsg.svgZoomPctTitle">{{ vp.zoomPercent }}</span>
      <button type="button" class="cs-svg-hud-btn" :title="csMsg.svgZoomInTitle" @click="vp.zoomDelta(0.1)">+</button>
      <button type="button" class="cs-svg-hud-btn cs-svg-hud-wide" :title="csMsg.svgFitTitle" @click="fitView">{{ csMsg.svgFitLabel }}</button>
      <button type="button" class="cs-svg-hud-btn cs-svg-hud-wide" :title="csMsg.svgOriginTitle" @click="originView">
        {{ csMsg.svgOriginLabel }}
      </button>
      <button type="button" class="cs-svg-hud-btn cs-svg-hud-wide" :title="csMsg.svgResetTitle" @click="vp.resetZoom">
        {{ csMsg.svgResetLabel }}
      </button>
    </div>
    <div class="cs-svg-debug-actions">
      <button
        type="button"
        class="cs-svg-hud-btn cs-svg-hud-wide"
        title="Copy current drawing info to clipboard"
        @click="copyRenderDebugInfo"
      >
        Copy drawing info
      </button>
    </div>

    <Teleport to="body">
      <template v-if="ctxMenuOpen">
        <div
          class="cs-ctx-backdrop"
          role="presentation"
          aria-hidden="true"
          @click="closeCtxMenu"
          @contextmenu.prevent="closeCtxMenu"
        />
        <div
          class="cs-ctx-menu"
          role="menu"
          :style="{ left: `${ctxMenuX}px`, top: `${ctxMenuY}px` }"
          @click.stop
        >
          <button
            v-for="item in ctxMenuItems"
            :key="'ctx-' + item.key"
            type="button"
            class="cs-ctx-menu-item"
            :class="{ 'cs-ctx-menu-item--danger': item.danger }"
            role="menuitem"
            :title="item.title ?? item.label"
            @click="onCtxMenuItemClick(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<style scoped>
.cs-svg-canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 260px;
  flex: 1;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.cs-svg-viewport {
  flex: 1;
  min-height: 220px;
  overflow: hidden;
  cursor: default;
  background-color: #f8fafc;
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.22) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.22) 1px, transparent 1px);
}
.cs-svg-world {
  position: relative;
  transform-origin: 0 0;
}
.cs-svg-root {
  display: block;
  vertical-align: top;
}
.cs-svg-hit {
  cursor: pointer;
}
.cs-svg-txt {
  user-select: none;
}
.cs-svg-keys {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  max-width: min(280px, 42vw);
  font-size: 0.72rem;
  color: #334155;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 8px;
}
.cs-svg-keys-pre {
  margin: 6px 0 0;
  white-space: pre-wrap;
  font: 11px/1.45 ui-monospace, Consolas, monospace;
  color: #475569;
}
.cs-svg-hud {
  position: absolute;
  left: 8px;
  bottom: 8px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.78rem;
}
.cs-svg-hud-pct {
  min-width: 3.2em;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.cs-svg-hud-btn {
  padding: 4px 8px;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font: inherit;
}
.cs-svg-hud-btn:hover {
  background: #f1f5f9;
}
.cs-svg-hud-wide {
  padding-inline: 6px;
}
.cs-svg-debug-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
}
</style>

<style>
/* Teleport 到 body，不受画布 overflow 裁剪 */
.cs-ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 250;
  background: transparent;
}
.cs-ctx-menu {
  position: fixed;
  z-index: 251;
  min-width: 160px;
  padding: 4px 0;
  border: 1px solid #94a3b8;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
}
.cs-ctx-menu-item {
  display: block;
  width: 100%;
  margin: 0;
  padding: 8px 14px;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  color: #0f172a;
}
.cs-ctx-menu-item:hover {
  background: #f1f5f9;
}
.cs-ctx-menu-item--danger {
  color: #b91c1c;
}
.cs-ctx-menu-item--danger:hover {
  background: #fef2f2;
}
</style>
