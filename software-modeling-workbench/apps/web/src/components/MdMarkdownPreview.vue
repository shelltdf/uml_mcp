<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { smwVditorPreviewOptions } from '../utils/vditor-smw-preview-options';

const props = defineProps<{ markdown: string }>();

const root = ref<HTMLDivElement | null>(null);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let layoutObs: MutationObserver | undefined;
let layoutStableTimer: ReturnType<typeof setTimeout> | undefined;
let layoutFallbackTimer: ReturnType<typeof setTimeout> | undefined;

/** Mermaid / 其它异步渲染在 preview 完成后才插入 DOM，需触发滚动容器重算高度，否则底部会被裁切 */
function syncPreviewScrollLayout(el: HTMLElement) {
  window.requestAnimationFrame(() => {
    void el.offsetHeight;
    void el.scrollHeight;
  });
}

/** Vditor/hljs 可能给 code 注入 max-height 内联样式，导致预览内出现滚动条 */
function forceExpandCodeBlocks(el: HTMLElement) {
  const codeNodes = el.querySelectorAll('pre > code, code.hljs');
  codeNodes.forEach((node) => {
    const codeEl = node as HTMLElement;
    codeEl.style.maxHeight = 'none';
    codeEl.style.overflow = 'visible';
  });
}

function watchAsyncPreviewLayout(el: HTMLElement) {
  layoutObs?.disconnect();
  clearTimeout(layoutStableTimer);
  clearTimeout(layoutFallbackTimer);
  const bump = () => {
    clearTimeout(layoutStableTimer);
    layoutStableTimer = window.setTimeout(() => {
      forceExpandCodeBlocks(el);
      syncPreviewScrollLayout(el);
    }, 240);
  };
  layoutObs = new MutationObserver(bump);
  layoutObs.observe(el, { subtree: true, childList: true, characterData: true });
  bump();
  /* Mermaid 多块时可能仍有漏网 mutation，延迟再同步一次 scrollHeight */
  layoutFallbackTimer = window.setTimeout(() => {
    layoutFallbackTimer = undefined;
    forceExpandCodeBlocks(el);
    syncPreviewScrollLayout(el);
  }, 1500);
}

async function renderPreview() {
  const el = root.value;
  if (!el) return;
  layoutObs?.disconnect();
  clearTimeout(layoutStableTimer);
  clearTimeout(layoutFallbackTimer);
  try {
    await Vditor.preview(el, props.markdown, smwVditorPreviewOptions);
    forceExpandCodeBlocks(el);
    watchAsyncPreviewLayout(el);
    syncPreviewScrollLayout(el);
  } catch {
    el.textContent = '（预览渲染失败，请检查 Markdown 或网络与 Vditor CDN）';
  }
}

function scheduleRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    void renderPreview();
  }, 100);
}

onMounted(() => {
  void renderPreview();
});

watch(
  () => props.markdown,
  () => {
    scheduleRender();
  },
);

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
  clearTimeout(layoutStableTimer);
  clearTimeout(layoutFallbackTimer);
  layoutObs?.disconnect();
  layoutObs = undefined;
  if (root.value) root.value.innerHTML = '';
});

/** 供导出：与 Vditor.preview 根节点一致，用于 HTML/PNG/SVG 与可见预览对齐 */
function getVditorResetElement(): HTMLElement | null {
  const el = root.value;
  if (!el) return null;
  if (el.classList.contains('vditor-reset')) return el;
  return (el.querySelector('.vditor-reset') as HTMLElement | null) ?? null;
}

defineExpose({ getVditorResetElement });
</script>

<template>
  <div class="md-preview-wrap" aria-label="Markdown 只读预览">
    <div ref="root" class="md-preview-root" />
  </div>
</template>

<style scoped>
.md-preview-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
}
.md-preview-root {
  flex: 1;
  min-height: 0;
  /* 与 Vditor 打在根节点上的 .vditor-reset{overflow:auto} 同源：仅此一层滚动，!important 保证不被主题覆盖 */
  overflow: auto !important;
  padding: 12px 14px;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #0f172a;
}
.md-preview-root :deep(.vditor-reset) {
  color: inherit;
  overflow: visible !important;
}
.md-preview-root :deep(.vditor-reset pre),
.md-preview-root :deep(.vditor-reset pre > code) {
  overflow: visible !important;
  max-height: none !important;
}
.md-preview-root :deep(.vditor-reset pre > code.hljs),
.md-preview-root :deep(.vditor-reset code.hljs) {
  overflow: visible !important;
  max-height: none !important;
}
.md-preview-root :deep(.vditor-reset pre > code[style*='max-height']),
.md-preview-root :deep(.vditor-reset code[style*='max-height']) {
  max-height: none !important;
  overflow: visible !important;
}
/* Mermaid / flowchart 等由 JS 替换为 SVG，避免块级 code 仍带 overflow 导致裁切 */
.md-preview-root :deep(pre:has(.language-mermaid)),
.md-preview-root :deep(pre:has(.language-flowchart)),
.md-preview-root :deep(pre:has(.language-graphviz)) {
  overflow: visible !important;
  max-height: none !important;
}
.md-preview-root :deep(.language-mermaid),
.md-preview-root :deep(.language-flowchart),
.md-preview-root :deep(.language-graphviz) {
  overflow: visible !important;
  max-height: none !important;
}
.md-preview-root :deep(.language-mermaid svg),
.md-preview-root :deep(.language-flowchart svg),
.md-preview-root :deep(.language-graphviz svg) {
  max-height: none !important;
}
</style>
