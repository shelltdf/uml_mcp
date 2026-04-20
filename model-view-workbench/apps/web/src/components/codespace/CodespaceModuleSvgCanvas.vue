<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { MvModelCodespacePayload } from '@mvwb/core';
import { useCanvasViewport } from '../../composables/useCanvasViewport';
import { layoutCodespaceSvg, type CodespaceLayoutNode, type CodespaceSvgPick } from '../../utils/codespace-svg-layout';

const props = defineProps<{
  modelValue: MvModelCodespacePayload;
  selected: CodespaceSvgPick | null;
}>();

const emit = defineEmits<{
  select: [CodespaceSvgPick];
  openDefinition: [CodespaceSvgPick];
  addModule: [];
}>();

const viewportRef = ref<HTMLElement | null>(null);
const vp = useCanvasViewport(viewportRef);

const layout = computed(() => layoutCodespaceSvg(props.modelValue));

const worldMetrics = computed(() => {
  const b = layout.value.bounds;
  const w = Math.max(480, b.maxX + 80);
  const h = Math.max(320, b.maxY + 80);
  return { w, h };
});

const worldDivStyle = computed(() => ({
  width: `${worldMetrics.value.w}px`,
  height: `${worldMetrics.value.h}px`,
  transform: vp.transformStyle.value,
  transformOrigin: '0 0' as const,
}));

function pickKey(p: CodespaceSvgPick): string {
  if (p.t === 'module') return `m-${p.mi}`;
  if (p.t === 'ns') return `ns-${p.mi}-${p.path.join('.')}`;
  if (p.t === 'class') return `c-${p.mi}-${p.path.join('.')}-${p.ci}`;
  if (p.t === 'var') return `v-${p.mi}-${p.path.join('.')}-${p.vi}`;
  if (p.t === 'fn') return `f-${p.mi}-${p.path.join('.')}-${p.fi}`;
  return `mac-${p.mi}-${p.path.join('.')}-${p.maci}`;
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

function fillFor(n: CodespaceLayoutNode): string {
  if (n.pick.t === 'module') return '#e0e7ff';
  if (n.pick.t === 'ns') return '#f1f5f9';
  if (n.pick.t === 'class') return '#fef9c3';
  if (n.pick.t === 'var') return '#ecfccb';
  if (n.pick.t === 'fn') return '#dbeafe';
  return '#fce7f3';
}

function strokeFor(n: CodespaceLayoutNode): string {
  if (isSelected(n.pick)) return '#2563eb';
  return '#94a3b8';
}

function strokeW(n: CodespaceLayoutNode): number {
  return isSelected(n.pick) ? 2.5 : 1;
}

function fitView() {
  vp.zoomToFit(layout.value.bounds, 36);
}

function originView() {
  vp.originToContentCenter(layout.value.bounds);
}

function mountedFit() {
  requestAnimationFrame(() => {
    fitView();
  });
}

const ctxMenuOpen = ref(false);
const ctxMenuX = ref(0);
const ctxMenuY = ref(0);

function closeCtxMenu() {
  ctxMenuOpen.value = false;
}

function onViewportContextMenu(e: MouseEvent) {
  e.preventDefault();
  const pad = 8;
  const mw = 168;
  const mh = 44;
  ctxMenuX.value = Math.min(e.clientX, window.innerWidth - mw - pad);
  ctxMenuY.value = Math.min(e.clientY, window.innerHeight - mh - pad);
  ctxMenuOpen.value = true;
}

function onAddModuleFromMenu() {
  emit('addModule');
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
      <summary title="展开/折叠 — 无全局快捷键">快捷键与操作</summary>
      <pre class="cs-svg-keys-pre">中键拖拽：平移视口
滚轮：缩放（以指针为锚点）
单击：选中节点
双击：打开定义悬浮窗
右键：画布菜单（添加模块等）</pre>
    </details>

    <div
      ref="viewportRef"
      class="cs-svg-viewport"
      @wheel="vp.onWheel"
      @pointerdown="vp.onPointerDown"
      @pointermove="vp.onPointerMove"
      @pointerup="vp.onPointerUp"
      @pointerleave="vp.onPointerUp"
      @pointercancel="vp.onPointerUp"
      @contextmenu="onViewportContextMenu"
    >
      <div class="cs-svg-world" :style="worldDivStyle">
        <svg
          class="cs-svg-root"
          :width="worldMetrics.w"
          :height="worldMetrics.h"
          :viewBox="`0 0 ${worldMetrics.w} ${worldMetrics.h}`"
          aria-label="代码空间模块树"
        >
          <rect :width="worldMetrics.w" :height="worldMetrics.h" fill="#fafafa" />
          <g v-for="n in layout.nodes" :key="pickKey(n.pick)" class="cs-svg-nodeg">
            <rect
              :x="n.x"
              :y="n.y"
              :width="n.w"
              :height="n.h"
              :rx="4"
              :fill="fillFor(n)"
              :stroke="strokeFor(n)"
              :stroke-width="strokeW(n)"
              class="cs-svg-hit"
              :tabindex="0"
              role="button"
              :aria-label="n.label"
              vector-effect="non-scaling-stroke"
              @click="onNodeClick(n, $event)"
              @dblclick="onNodeDblClick(n, $event)"
              @keydown.enter.prevent="emit('openDefinition', n.pick)"
            />
            <text
              :x="n.x + 8"
              :y="n.y + n.h * 0.72"
              class="cs-svg-txt"
              pointer-events="none"
              font-size="12"
              fill="#0f172a"
            >
              {{ n.label }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <div class="cs-svg-hud" aria-label="视口缩放">
      <button type="button" class="cs-svg-hud-btn" title="缩小 — 无全局快捷键" @click="vp.zoomDelta(-0.1)">−</button>
      <span class="cs-svg-hud-pct" :title="'当前缩放 — 无全局快捷键'">{{ vp.zoomPercent }}</span>
      <button type="button" class="cs-svg-hud-btn" title="放大 — 无全局快捷键" @click="vp.zoomDelta(0.1)">+</button>
      <button type="button" class="cs-svg-hud-btn cs-svg-hud-wide" title="适应全部 — 无全局快捷键" @click="fitView">适应</button>
      <button type="button" class="cs-svg-hud-btn cs-svg-hud-wide" title="原点（内容中心对齐视口）— 无全局快捷键" @click="originView">原点</button>
      <button type="button" class="cs-svg-hud-btn cs-svg-hud-wide" title="还原 100%（以视口中心为锚）— 无全局快捷键" @click="vp.resetZoom">还原</button>
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
            type="button"
            class="cs-ctx-menu-item"
            role="menuitem"
            title="添加模块 — 无全局快捷键"
            @click="onAddModuleFromMenu"
          >
            ＋ 添加模块
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
</style>
