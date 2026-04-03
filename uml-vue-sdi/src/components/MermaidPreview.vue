<script setup lang="ts">
import mermaid from 'mermaid';
import { computed, nextTick, ref, watch } from 'vue';
import type { LocaleId } from '../i18n/ui';
import ClassDiagramCanvas from './ClassDiagramCanvas.vue';
import { extractMermaidBlocks, inferMermaidDiagramTypeFromMarkdown } from '../lib/formats';
import {
  clearMermaidSelectionInRoot,
  describeMermaidGroup,
  findGroupByNodeId,
  findMermaidInteractiveGroup,
  setMermaidGroupSelected,
} from '../lib/mermaidCanvas';
import { workspace } from '../stores/workspace';

const props = withDefaults(
  defineProps<{
    markdown: string;
    kind: string;
    /** 当前标签 id（classDiagram 可编辑画布需要） */
    tabId?: string;
    locale?: LocaleId;
    /** 多语言提示：存在多个块时 */
    multiBlockHint?: string;
    resetLabel?: string;
    viewportTitle?: string;
  }>(),
  {
    tabId: '',
    locale: 'zh' as LocaleId,
    multiBlockHint: '',
    resetLabel: 'Reset view',
    viewportTitle: 'Middle-drag to pan · Wheel to zoom',
  },
);

const htmlChunks = ref<string[]>([]);
const errorText = ref('');
const viewportRef = ref<HTMLElement | null>(null);
const sceneRef = ref<HTMLElement | null>(null);
const scale = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;

const allBlocks = computed(() => {
  if (props.kind !== 'uml') return [];
  return extractMermaidBlocks(props.markdown);
});

const blocks = computed(() => {
  if (allBlocks.value.length === 0) return [];
  return [allBlocks.value[0]];
});

const isClassDiagram = computed(
  () => inferMermaidDiagramTypeFromMarkdown(props.markdown) === 'classDiagram',
);

/** 类图可编辑画布：不走 Mermaid 静态渲染与 SVG 命中 */
const useClassDiagramEditor = computed(
  () => props.kind === 'uml' && isClassDiagram.value && !!props.tabId,
);

const showMultiHint = computed(
  () => props.kind === 'uml' && allBlocks.value.length > 1 && props.multiBlockHint,
);

function initMermaidTheme(): void {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'base',
    themeVariables: dark
      ? {
          primaryColor: '#2e3440',
          primaryTextColor: '#eceff4',
          primaryBorderColor: '#88c0d0',
          lineColor: '#81a1c1',
          secondaryColor: '#3b4252',
          tertiaryColor: '#434c5e',
        }
      : {
          primaryColor: '#ffffff',
          primaryTextColor: '#1e293b',
          primaryBorderColor: '#334155',
          lineColor: '#64748b',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#e2e8f0',
        },
  });
}

initMermaidTheme();

async function renderAll(): Promise<void> {
  errorText.value = '';
  htmlChunks.value = [];
  if (useClassDiagramEditor.value) {
    return;
  }
  if (props.kind !== 'uml' || blocks.value.length === 0) {
    return;
  }
  const out: string[] = [];
  let i = 0;
  for (const code of blocks.value) {
    const id = `mm-${Date.now()}-${i}`;
    i += 1;
    try {
      const { svg } = await mermaid.render(id, code);
      out.push(svg);
    } catch (e) {
      errorText.value = e instanceof Error ? e.message : String(e);
      break;
    }
  }
  htmlChunks.value = out;
}

function syncSelectionHighlight(): void {
  const tab = workspace.activeTab.value;
  const sel = workspace.propertySelection.value;
  const root = sceneRef.value;
  if (!root) return;
  clearMermaidSelectionInRoot(root);
  if (!tab || sel.kind !== 'mermaid' || sel.tabId !== tab.id) return;
  const g = findGroupByNodeId(root, sel.nodeId);
  if (g) setMermaidGroupSelected(g, true);
}

function onCanvasClick(e: MouseEvent): void {
  if (e.button !== 0) return;
  const tab = workspace.activeTab.value;
  if (!tab || tab.kind !== 'uml') return;
  const g = findMermaidInteractiveGroup(e.target as Element | null);
  if (g) {
    const { id, label } = describeMermaidGroup(g);
    workspace.setPropertySelection({
      kind: 'mermaid',
      tabId: tab.id,
      nodeId: id,
      label,
    });
  } else {
    workspace.clearPropertySelection();
  }
}

watch(
  () => [props.markdown, props.kind],
  () => {
    if (useClassDiagramEditor.value) return;
    workspace.clearPropertySelection();
    void renderAll().then(() => nextTick(() => syncSelectionHighlight()));
  },
  { immediate: true },
);

watch(
  () => [workspace.propertySelection.value, workspace.activeTab.value?.id, htmlChunks.value],
  () => {
    if (useClassDiagramEditor.value) return;
    nextTick(() => syncSelectionHighlight());
  },
);

function onWheel(e: WheelEvent): void {
  if (!viewportRef.value) return;
  const el = viewportRef.value;
  const rect = el.getBoundingClientRect();
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

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 1) return;
  e.preventDefault();
  isPanning.value = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panOriginX = panX.value;
  panOriginY = panY.value;
  const el = viewportRef.value;
  try {
    el?.setPointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function onPointerMove(e: PointerEvent): void {
  if (!isPanning.value) return;
  panX.value = panOriginX + (e.clientX - panStartX);
  panY.value = panOriginY + (e.clientY - panStartY);
}

function onPointerUp(e: PointerEvent): void {
  if (!isPanning.value) return;
  isPanning.value = false;
  const el = viewportRef.value;
  try {
    el?.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function resetView(): void {
  scale.value = 1;
  panX.value = 0;
  panY.value = 0;
}

const transformStyle = computed(
  () => `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
);

const zoomPercent = computed(() => `${Math.round(scale.value * 100)}%`);
</script>

<template>
  <div class="preview">
    <template v-if="kind !== 'uml'">
      <p class="hint">当前文件类型不包含 Mermaid UML 预览（{{ kind }}）。</p>
    </template>
    <template v-else-if="allBlocks.length === 0">
      <p class="hint">未找到 <code>```mermaid</code> 代码块。</p>
    </template>
    <template v-else>
      <ClassDiagramCanvas
        v-if="isClassDiagram && tabId"
        :markdown="markdown"
        :tab-id="tabId"
        :locale="locale"
      />
      <template v-else>
      <p v-if="showMultiHint" class="multi-hint">{{ multiBlockHint }}</p>
      <p v-if="errorText" class="err">{{ errorText }}</p>
      <div class="canvas-chrome">
        <div
          ref="viewportRef"
          class="canvas-viewport"
          :class="{ 'canvas-viewport--class-diagram': isClassDiagram }"
          :title="viewportTitle"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <div class="canvas-inner" :style="{ transform: transformStyle }">
            <div class="canvas-grid" aria-hidden="true" />
            <div
              ref="sceneRef"
              class="uml-svg-scene"
              role="application"
              aria-label="UML SVG canvas"
              @click="onCanvasClick"
            >
              <div v-for="(h, idx) in htmlChunks" :key="idx" class="svg-wrap" v-html="h" />
            </div>
          </div>
          <div class="canvas-hud">
            <span class="canvas-hud__zoom" :title="`${viewportTitle} — 无全局快捷键`">{{
              zoomPercent
            }}</span>
            <button
              type="button"
              class="canvas-hud__btn"
              :title="`${resetLabel} — 无全局快捷键`"
              @click="resetView"
            >
              {{ resetLabel }}
            </button>
          </div>
        </div>
      </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.preview {
  padding: 0;
  overflow: hidden;
  flex: 1 1 0;
  min-height: 0;
  height: auto;
  background: var(--canvas-bg, #eceff4);
  display: flex;
  flex-direction: column;
}
:root[data-theme='dark'] .preview {
  --canvas-bg: #1a1b1f;
}

.hint,
.err,
.multi-hint {
  margin: 0;
  padding: 12px;
  font-size: 0.9rem;
}
.err {
  color: #c62828;
}
.multi-hint {
  color: #bf6f00;
  background: rgba(255, 193, 7, 0.12);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.canvas-chrome {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.canvas-viewport {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  cursor: grab;
  position: relative;
  touch-action: none;
}
.canvas-viewport:active {
  cursor: grabbing;
}

/** 世界坐标纸面 + 网格，随平移缩放 */
.canvas-inner {
  position: relative;
  transform-origin: 0 0;
  padding: 48px;
  display: inline-block;
  min-width: min(100%, 400px);
  z-index: 0;
}

.canvas-grid {
  position: absolute;
  left: -4000px;
  top: -4000px;
  width: 10000px;
  height: 10000px;
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

:root[data-theme='dark'] .canvas-grid {
  --uml-paper-bg: #1c2028;
  --uml-grid-major: rgba(236, 239, 244, 0.07);
}

.uml-svg-scene {
  position: relative;
  z-index: 1;
}

.svg-wrap {
  margin-bottom: 0;
}
.svg-wrap :deep(svg) {
  max-width: none;
  height: auto;
  display: block;
  overflow: visible;
}

/** 左下角缩放与还原（HUD 不拦截滚轮缩放） */
.canvas-hud {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  pointer-events: none;
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 65%, transparent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.canvas-hud__zoom {
  min-width: 3.25em;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.canvas-hud__btn {
  pointer-events: auto;
  font: inherit;
  font-size: 0.78rem;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
}
.canvas-hud__btn:hover {
  background: var(--menu-hover, rgba(0, 0, 0, 0.06));
}

/** 类图：更接近通用 UML 类图（线框、分区感） */
.canvas-viewport--class-diagram .svg-wrap :deep(svg) {
  font-family: ui-sans-serif, 'Segoe UI', system-ui, sans-serif;
}
.canvas-viewport--class-diagram .svg-wrap :deep(svg .node rect),
.canvas-viewport--class-diagram .svg-wrap :deep(svg .node polygon),
.canvas-viewport--class-diagram .svg-wrap :deep(svg g.node rect) {
  stroke: #1e293b;
  stroke-width: 1.75px;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.06));
}
.canvas-viewport--class-diagram .svg-wrap :deep(svg .edgePath path.path) {
  stroke: #475569;
  stroke-width: 1.35px;
}
:root[data-theme='dark'] .canvas-viewport--class-diagram .svg-wrap :deep(svg .node rect),
:root[data-theme='dark'] .canvas-viewport--class-diagram .svg-wrap :deep(svg .node polygon),
:root[data-theme='dark'] .canvas-viewport--class-diagram .svg-wrap :deep(svg g.node rect) {
  stroke: #e5e7eb;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
}
:root[data-theme='dark'] .canvas-viewport--class-diagram .svg-wrap :deep(svg .edgePath path.path) {
  stroke: #94a3b8;
}

/** 选中高亮（由脚本添加 uml-svg-node--selected） */
.svg-wrap :deep(svg g.uml-svg-node--selected rect),
.svg-wrap :deep(svg g.uml-svg-node--selected polygon) {
  stroke: var(--uml-select-stroke, #2563eb) !important;
  stroke-width: 2.75px !important;
}
.svg-wrap :deep(svg g.uml-svg-node--selected path) {
  stroke: var(--uml-select-stroke, #2563eb) !important;
}
:root[data-theme='dark'] .svg-wrap :deep(svg g.uml-svg-node--selected rect),
:root[data-theme='dark'] .svg-wrap :deep(svg g.uml-svg-node--selected polygon) {
  --uml-select-stroke: #93c5fd;
}

.svg-wrap :deep(svg g.node),
.svg-wrap :deep(svg g.classGroup) {
  cursor: pointer;
}
</style>
