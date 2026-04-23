<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref } from 'vue';
import type { MvModelCodespacePayload } from '@mvwb/core';
import { useCanvasViewport } from '../../composables/useCanvasViewport';
import { CS_CANVAS_MSG_KEY, makeCodespaceLayoutLabels } from '../../i18n/codespace-canvas-messages';
import { layoutCodespaceSvg, type CodespaceLayoutNode, type CodespaceSvgPick } from '../../utils/codespace-svg-layout';

const csMsg = inject(CS_CANVAS_MSG_KEY)!;

const props = defineProps<{
  modelValue: MvModelCodespacePayload;
  selected: CodespaceSvgPick | null;
  /** 与编辑器紧凑布局对齐：缩小边距与字号 */
  compact?: boolean;
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

const viewportRef = ref<SVGSVGElement | null>(null);
const vp = useCanvasViewport(viewportRef);

const canvasBox = ref({ w: 400, h: 400 });
let canvasResizeObs: ResizeObserver | undefined;

const worldGroupTransform = computed(
  () => `translate(${vp.panX.value}, ${vp.panY.value}) scale(${vp.scale.value})`,
);

const chromeInset = computed(() => (props.compact ? 8 : 12));

const leftPanelW = computed(() =>
  props.compact
    ? Math.min(240, Math.max(120, canvasBox.value.w - 24))
    : Math.min(280, Math.max(120, canvasBox.value.w - 24)),
);

/** 调试条尺寸与画布角间距（与 HUD 分离，单独贴右下角） */
const CS_DEBUG_BTN_W = 158;
const CS_DEBUG_BTN_H = 26;
const chromeCornerGap = 8;

const debugX = computed(() =>
  Math.max(chromeInset.value, canvasBox.value.w - CS_DEBUG_BTN_W - chromeCornerGap),
);

const debugY = computed(() =>
  Math.max(chromeInset.value, canvasBox.value.h - CS_DEBUG_BTN_H - chromeCornerGap),
);

/** 快捷键说明：按行拆成 <text> 行（纯 SVG，无 foreignObject） */
const shortcutLines = computed(() => csMsg.value.svgKeysBody.split('\n'));
const shortcutsExpanded = ref(false);
const keysHeaderH = 22;
const keysLineGap = 13;
const keysPanelBodyH = computed(() =>
  shortcutsExpanded.value ? 8 + shortcutLines.value.length * keysLineGap + 6 : 0,
);
const keysPanelH = computed(() => keysHeaderH + keysPanelBodyH.value);
const toolbarCardSize = 40;
const toolbarGap = 10;

function toggleShortcuts(e: MouseEvent) {
  e.stopPropagation();
  shortcutsExpanded.value = !shortcutsExpanded.value;
}

const hudPad = 6;
const hudBtnH = 24;
const hudGap = 6;

const hudY = computed(() =>
  Math.max(chromeInset.value, canvasBox.value.h - (hudBtnH + hudPad * 2) - chromeInset.value),
);

const hudLayout = computed(() => {
  const M = csMsg.value;
  const pct = vp.zoomPercent.value;
  const items: {
    key: string;
    label: string;
    w: number;
    title: string;
    run?: () => void;
  }[] = [
    { key: 'zout', label: '−', w: 26, title: M.svgZoomOutTitle, run: () => vp.zoomDelta(-0.1) },
    { key: 'pct', label: pct, w: 44, title: M.svgZoomPctTitle },
    { key: 'zin', label: '+', w: 26, title: M.svgZoomInTitle, run: () => vp.zoomDelta(0.1) },
    { key: 'fit', label: M.svgFitLabel, w: 52, title: M.svgFitTitle, run: () => fitView() },
    { key: 'origin', label: M.svgOriginLabel, w: 52, title: M.svgOriginTitle, run: () => originView() },
    { key: 'reset', label: M.svgResetLabel, w: 52, title: M.svgResetTitle, run: () => vp.resetZoom() },
  ];
  let x = hudPad;
  const laid = items.map((it) => {
    const ox = x;
    x += it.w + hudGap;
    return { ...it, x: ox };
  });
  const totalW = Math.max(x - hudGap + hudPad, 120);
  return { items: laid, totalW };
});

/** 用户点击「重新排版」时递增，强制 layout 计算属性重跑布局算法（即使 model 引用未变） */
const layoutReloadNonce = ref(0);

const layout = computed(() => {
  void layoutReloadNonce.value;
  return layoutCodespaceSvg(props.modelValue, makeCodespaceLayoutLabels(csMsg.value));
});

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

/**
 * 将 path `d` 上相邻数值视为 (x,y) 对，逐项加上 translate(tx,ty)，
 * 与 `<path :d :transform="'translate(tx,ty)'">` 在几何上等价（便于与 node worldRect 同坐标系）。
 */
function translateSvgPathD(d: string, tx: number, ty: number): string {
  let i = 0;
  return d.replace(/[-+]?(?:\d*\.\d+|\d+(?:\.\d+)?)(?:[eE][-+]?\d+)?/g, (tok) => {
    const v = parseFloat(tok);
    if (Number.isNaN(v)) return tok;
    const out = v + (i % 2 === 0 ? tx : ty);
    i++;
    return String(out);
  });
}

const renderDebugSnapshot = computed(() => {
  const ox = contentOffset.value.x;
  const oy = contentOffset.value.y;
  const nodes = layout.value.nodes.map((n, ni) => ({
    index: ni,
    pick: n.pick,
    label: n.label,
    /** 布局算法坐标（与 layout 一致） */
    layoutRect: { x: n.x, y: n.y, w: n.w, h: n.h },
    /** 与 DOM `<rect :x="n.x+ox" ...>` 同一世界坐标系 */
    worldRect: {
      x: n.x + ox,
      y: n.y + oy,
      w: n.w,
      h: n.h,
      maxX: n.x + ox + n.w,
      maxY: n.y + oy + n.h,
    },
  }));
  const edges = layout.value.edges.map((e, ei) => ({
    index: ei,
    kind: e.kind ?? 'tree',
    /** 与 `<path :d>` 完全一致（不含 transform） */
    dLocal: e.d,
    /** 折合 `translate(contentOffset)` 后的路径，便于与 worldRect / diagramBounds 对齐排查 */
    dWorld: translateSvgPathD(e.d, ox, oy),
  }));

  return {
    timestamp: new Date().toISOString(),
    coordsNote:
      'nodes.worldRect、edges.dWorld：与 SVG 内容同一坐标系（含 contentOffset）。edges.dLocal 与 DOM path[d] 一致，path 另有 transform=translate(contentOffset)。',
    nodeCount: nodes.length,
    edgeCount: edges.length,
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
    nodes,
    edges,
  };
});

const viewBounds = computed(() => {
  const b = layout.value.bounds;
  return {
    minX: b.minX + contentOffset.value.x,
    minY: b.minY + contentOffset.value.y,
    maxX: b.maxX + contentOffset.value.x,
    maxY: b.maxY + contentOffset.value.y,
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

function reflowLayout() {
  layoutReloadNonce.value += 1;
  nextTick(() => {
    fitView();
  });
}

function originView() {
  vp.originToContentCenter(viewBounds.value);
}

const copyDebugFeedback = ref('');
let copyDebugFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

async function copyRenderDebugInfo() {
  const text = JSON.stringify(renderDebugSnapshot.value, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    if (copyDebugFeedbackTimer) {
      clearTimeout(copyDebugFeedbackTimer);
      copyDebugFeedbackTimer = null;
    }
    copyDebugFeedback.value = 'Copied';
    copyDebugFeedbackTimer = setTimeout(() => {
      copyDebugFeedback.value = '';
      copyDebugFeedbackTimer = null;
    }, 2000);
  } catch {
    copyDebugFeedback.value = 'Copy failed';
    copyDebugFeedbackTimer = setTimeout(() => {
      copyDebugFeedback.value = '';
      copyDebugFeedbackTimer = null;
    }, 2500);
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
  const svg = viewportRef.value;
  if (svg) {
    const r = svg.getBoundingClientRect();
    const lx = e.clientX - r.left;
    const ly = e.clientY - r.top;
    ctxMenuX.value = Math.min(Math.max(pad, lx), Math.max(pad, r.width - mw - pad));
    ctxMenuY.value = Math.min(Math.max(pad, ly), Math.max(pad, r.height - mh - pad));
  } else {
    ctxMenuX.value = Math.min(e.clientX, window.innerWidth - mw - pad);
    ctxMenuY.value = Math.min(e.clientY, window.innerHeight - mh - pad);
  }
  ctxMenuItems.value = items;
  ctxMenuOpen.value = true;
}

const ctxMenuH = computed(() => Math.max(44, ctxMenuItems.value.length * 36 + 8));

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

function bindCanvasResize() {
  canvasResizeObs?.disconnect();
  const el = viewportRef.value;
  if (!el) return;
  const sync = () => {
    const r = el.getBoundingClientRect();
    canvasBox.value = { w: r.width, h: r.height };
  };
  sync();
  canvasResizeObs = new ResizeObserver(sync);
  canvasResizeObs.observe(el);
}

onMounted(() => {
  mountedFit();
  window.addEventListener('keydown', onCtxKeydown);
  nextTick(() => {
    bindCanvasResize();
  });
});

onUnmounted(() => {
  canvasResizeObs?.disconnect();
  canvasResizeObs = undefined;
  if (copyDebugFeedbackTimer) {
    clearTimeout(copyDebugFeedbackTimer);
    copyDebugFeedbackTimer = null;
  }
  window.removeEventListener('keydown', onCtxKeydown);
});
</script>

<template>
  <svg
    ref="viewportRef"
    class="cs-svg-canvas"
    :class="{ 'cs-svg-canvas--compact': compact }"
    role="region"
    :aria-label="csMsg.svgCanvasRegionAria"
    width="100%"
    height="100%"
    @wheel="vp.onWheel"
    @pointerdown="vp.onPointerDown"
    @pointermove="vp.onPointerMove"
    @pointerup="vp.onPointerUp"
    @pointerleave="vp.onPointerUp"
    @pointercancel="vp.onPointerUp"
    @contextmenu="onViewportContextMenu"
  >
    <rect class="cs-svg-underlay" x="0" y="0" width="100%" height="100%" fill="#f8fafc" />

    <defs>
      <filter id="cs-svg-toolbar-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.1" />
      </filter>
      <filter id="cs-svg-menu-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.18" />
      </filter>
    </defs>

    <g :transform="worldGroupTransform">
      <g class="cs-svg-world">
        <rect
          x="0"
          y="0"
          :width="worldMetrics.w"
          :height="worldMetrics.h"
          fill="transparent"
          @click="onViewportClick"
        />
        <g
          id="mv-codespace-module-tree-svg"
          class="cs-svg-diagram-root"
          role="img"
          :aria-label="csMsg.svgAriaModuleTree"
          focusable="false"
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
        </g>
      </g>
    </g>

    <!-- 纯 SVG 叠层：快捷键、工具条、HUD、调试（无 foreignObject） -->
    <g class="cs-svg-chrome" pointer-events="none">
      <g
        class="cs-svg-left-stack"
        pointer-events="auto"
        :transform="`translate(${chromeInset}, ${chromeInset})`"
      >
        <g class="cs-svg-keys" @click.stop>
          <rect
            :width="leftPanelW"
            :height="keysPanelH"
            rx="6"
            fill="rgba(255,255,255,0.92)"
            stroke="#e2e8f0"
          />
          <rect
            :width="leftPanelW"
            :height="keysHeaderH"
            fill="transparent"
            class="cs-svg-keys-hit"
            @click="toggleShortcuts"
          >
            <title>{{ csMsg.svgKeysTitle }}</title>
          </rect>
          <text x="8" y="15" class="cs-svg-keys-summary" pointer-events="none">
            {{ csMsg.svgKeysSummary }} {{ shortcutsExpanded ? '▴' : '▾' }}
          </text>
          <g v-if="shortcutsExpanded">
            <text
              v-for="(line, li) in shortcutLines"
              :key="'sk-' + li"
              x="8"
              :y="keysHeaderH + 8 + (li + 1) * keysLineGap - 2"
              class="cs-svg-keys-line"
            >
              {{ line }}
            </text>
          </g>
        </g>

        <g
          class="cs-svg-canvas-toolbar"
          role="toolbar"
          :aria-label="csMsg.svgCanvasToolbarAria"
          :transform="`translate(0, ${keysPanelH + toolbarGap})`"
        >
          <rect
            x="0"
            y="0"
            :width="toolbarCardSize"
            :height="toolbarCardSize"
            rx="8"
            fill="color-mix(in srgb, #fafafa 94%, transparent)"
            stroke="#ccc"
            filter="url(#cs-svg-toolbar-shadow)"
          />
          <g
            role="button"
            :tabindex="0"
            :aria-label="csMsg.svgRelayoutLabel"
            :transform="`translate(${toolbarCardSize / 2 - 11}, ${toolbarCardSize / 2 - 11})`"
            class="cs-svg-relayout-btn"
            @click.stop="reflowLayout"
            @keydown.enter.prevent="reflowLayout"
          >
            <title>{{ csMsg.svgRelayoutTitle }}</title>
            <rect x="-6" y="-6" width="34" height="34" rx="6" fill="transparent" class="cs-svg-relayout-hit" />
            <g stroke="#0f172a" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="6" height="6" rx="1.2" stroke-width="1.6" />
              <rect x="15" y="4" width="6" height="6" rx="1.2" stroke-width="1.6" />
              <rect x="9" y="14" width="6" height="6" rx="1.2" stroke-width="1.6" />
              <path d="M9 7h6M12 10v4" stroke-width="1.4" />
            </g>
          </g>
        </g>
      </g>

      <g
        class="cs-svg-hud-wrap"
        pointer-events="auto"
        :transform="`translate(${chromeInset}, ${hudY})`"
        :aria-label="csMsg.svgHudAria"
      >
        <rect
          x="0"
          y="0"
          :width="hudLayout.totalW"
          :height="hudBtnH + hudPad * 2"
          rx="6"
          fill="rgba(255, 255, 255, 0.94)"
          stroke="#cbd5e1"
        />
        <g
          v-for="it in hudLayout.items"
          :key="it.key"
          :transform="`translate(${it.x}, ${hudPad})`"
          class="cs-svg-hud-cell"
        >
          <title>{{ it.title }}</title>
          <template v-if="it.run">
            <rect
              :width="it.w"
              :height="hudBtnH"
              rx="4"
              fill="#fff"
              stroke="#94a3b8"
              class="cs-svg-hud-btn-rect"
              @click.stop="it.run()"
            />
            <text
              :x="it.w / 2"
              :y="hudBtnH / 2 + 4"
              text-anchor="middle"
              class="cs-svg-hud-txt"
              pointer-events="none"
            >
              {{ it.label }}
            </text>
          </template>
          <template v-else>
            <rect :width="it.w" :height="hudBtnH" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
            <text
              :x="it.w / 2"
              :y="hudBtnH / 2 + 4"
              text-anchor="middle"
              class="cs-svg-hud-pct-txt"
              pointer-events="none"
            >
              {{ it.label }}
            </text>
          </template>
        </g>
      </g>

      <g class="cs-svg-debug-wrap" pointer-events="auto" :transform="`translate(${debugX}, ${debugY})`">
        <g class="cs-svg-debug-actions" @click.stop="copyRenderDebugInfo">
          <title>Copy full layout: every node worldRect + every edge dLocal/dWorld (SVG paths)</title>
          <rect
            x="0"
            y="0"
            :width="CS_DEBUG_BTN_W"
            :height="CS_DEBUG_BTN_H"
            rx="4"
            fill="#fff"
            stroke="#94a3b8"
            class="cs-svg-debug-btn-rect"
          />
          <text :x="CS_DEBUG_BTN_W / 2" y="17" text-anchor="middle" class="cs-svg-debug-btn-txt">
            Copy drawing info
          </text>
        </g>
        <text
          v-if="copyDebugFeedback"
          x="-8"
          y="17"
          text-anchor="end"
          class="cs-svg-copy-toast-txt"
          role="status"
        >
          {{ copyDebugFeedback }}
        </text>
      </g>
    </g>

    <g v-if="ctxMenuOpen" class="cs-svg-ctx-layer" pointer-events="auto">
      <rect width="100%" height="100%" fill="transparent" class="cs-svg-ctx-backdrop" @click="closeCtxMenu" @contextmenu.prevent="closeCtxMenu" />
      <g :transform="`translate(${ctxMenuX}, ${ctxMenuY})`" role="menu">
        <rect width="220" :height="ctxMenuH" rx="8" fill="#fff" stroke="#94a3b8" filter="url(#cs-svg-menu-shadow)" />
        <g
          v-for="(item, ci) in ctxMenuItems"
          :key="'ctx-' + item.key"
          :transform="`translate(0, ${4 + ci * 36})`"
          role="menuitem"
          class="cs-svg-ctx-row"
          @click.stop="onCtxMenuItemClick(item)"
        >
          <title>{{ item.title ?? item.label }}</title>
          <rect width="220" height="36" fill="transparent" class="cs-svg-ctx-hit" />
          <text x="14" y="23" :class="item.danger ? 'cs-svg-ctx-txt cs-svg-ctx-txt--danger' : 'cs-svg-ctx-txt'" pointer-events="none">
            {{ item.label }}
          </text>
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.cs-svg-canvas {
  display: block;
  flex: 1;
  min-width: 0;
  min-height: 260px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  cursor: default;
}

.cs-svg-diagram-root {
  transform-origin: 0 0;
}

.cs-svg-hit {
  cursor: pointer;
}

.cs-svg-txt {
  user-select: none;
}

.cs-svg-keys-summary {
  font-size: 11px;
  fill: #334155;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.cs-svg-keys-line {
  font-size: 11px;
  fill: #475569;
  font-family: ui-monospace, Consolas, monospace;
}

.cs-svg-keys-hit {
  cursor: pointer;
}

.cs-svg-relayout-btn {
  cursor: pointer;
  outline: none;
}

.cs-svg-relayout-btn:focus .cs-svg-relayout-hit {
  stroke: #2563eb;
  stroke-width: 1;
}

.cs-svg-hud-btn-rect {
  cursor: pointer;
}

.cs-svg-hud-btn-rect:hover {
  fill: #f1f5f9;
}

.cs-svg-hud-txt {
  font-size: 12px;
  fill: #0f172a;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.cs-svg-hud-pct-txt {
  font-size: 12px;
  fill: #0f172a;
  font-variant-numeric: tabular-nums;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.cs-svg-debug-btn-rect {
  cursor: pointer;
}

.cs-svg-debug-btn-rect:hover {
  fill: #f8fafc;
}

.cs-svg-debug-btn-txt {
  font-size: 11px;
  fill: #0f172a;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.cs-svg-copy-toast-txt {
  font-size: 11px;
  fill: #15803d;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.cs-svg-ctx-hit {
  cursor: pointer;
}

.cs-svg-ctx-hit:hover {
  fill: #f1f5f9;
}

.cs-svg-ctx-txt {
  font-size: 13px;
  fill: #0f172a;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.cs-svg-ctx-txt--danger {
  fill: #b91c1c;
}

.cs-svg-canvas--compact .cs-svg-keys-summary {
  font-size: 10px;
}

.cs-svg-canvas--compact .cs-svg-keys-line {
  font-size: 10px;
}

.cs-svg-canvas--compact .cs-svg-hud-txt,
.cs-svg-canvas--compact .cs-svg-hud-pct-txt {
  font-size: 11px;
}

.cs-svg-canvas--compact .cs-svg-debug-btn-txt {
  font-size: 10px;
}
</style>
