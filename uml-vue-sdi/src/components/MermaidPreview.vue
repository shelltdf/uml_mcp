<script setup lang="ts">
import mermaid from 'mermaid';
import { computed, ref, watch } from 'vue';
import { extractMermaidBlocks } from '../lib/formats';

const props = withDefaults(
  defineProps<{
    markdown: string;
    kind: string;
    /** 多语言提示：存在多个块时 */
    multiBlockHint?: string;
    resetLabel?: string;
    viewportTitle?: string;
  }>(),
  {
    multiBlockHint: '',
    resetLabel: 'Reset view',
    viewportTitle: 'Middle-drag to pan · Wheel to zoom',
  },
);

const htmlChunks = ref<string[]>([]);
const errorText = ref('');
const viewportRef = ref<HTMLElement | null>(null);
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

/** 一文件一图：画布仅渲染第一个 mermaid 块 */
const blocks = computed(() => {
  if (allBlocks.value.length === 0) return [];
  return [allBlocks.value[0]];
});

const showMultiHint = computed(
  () => props.kind === 'uml' && allBlocks.value.length > 1 && props.multiBlockHint,
);

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
});

async function renderAll() {
  errorText.value = '';
  htmlChunks.value = [];
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

watch(
  () => [props.markdown, props.kind],
  () => {
    void renderAll();
  },
  { immediate: true },
);

function onWheel(e: WheelEvent) {
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

function onPointerDown(e: PointerEvent) {
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

function onPointerMove(e: PointerEvent) {
  if (!isPanning.value) return;
  panX.value = panOriginX + (e.clientX - panStartX);
  panY.value = panOriginY + (e.clientY - panStartY);
}

function onPointerUp(e: PointerEvent) {
  if (!isPanning.value) return;
  isPanning.value = false;
  const el = viewportRef.value;
  try {
    el?.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function resetView() {
  scale.value = 1;
  panX.value = 0;
  panY.value = 0;
}

const transformStyle = computed(
  () => `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
);
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
      <p v-if="showMultiHint" class="multi-hint">{{ multiBlockHint }}</p>
      <p v-if="errorText" class="err">{{ errorText }}</p>
      <div class="canvas-chrome">
        <div class="canvas-meta">
          <span class="zoom-label">{{ Math.round(scale * 100) }}%</span>
          <button
            type="button"
            class="chrome-btn"
            :title="`${resetLabel} — 无全局快捷键`"
            @click="resetView"
          >
            {{ resetLabel }}
          </button>
        </div>
        <div
          ref="viewportRef"
          class="canvas-viewport"
          :title="`${viewportTitle} — 无全局快捷键`"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <div class="canvas-inner" :style="{ transform: transformStyle }">
            <div v-for="(h, idx) in htmlChunks" :key="idx" class="svg-wrap" v-html="h" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.preview {
  padding: 0;
  overflow: hidden;
  height: 100%;
  min-height: 280px;
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
.canvas-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border, #ccc);
  background: var(--panel-bg, #fafafa);
}
.zoom-label {
  min-width: 3.5em;
  font-variant-numeric: tabular-nums;
}
.chrome-btn {
  font: inherit;
  padding: 4px 10px;
  cursor: pointer;
}

.canvas-viewport {
  flex: 1;
  min-height: 200px;
  overflow: hidden;
  cursor: grab;
  position: relative;
  touch-action: none;
}
.canvas-viewport:active {
  cursor: grabbing;
}

.canvas-inner {
  transform-origin: 0 0;
  padding: 24px;
  display: inline-block;
  min-width: min(100%, 400px);
}

.svg-wrap {
  margin-bottom: 16px;
}
.svg-wrap :deep(svg) {
  max-width: none;
  height: auto;
  display: block;
}
</style>
