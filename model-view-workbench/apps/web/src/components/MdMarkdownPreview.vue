<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

const props = defineProps<{ markdown: string }>();

const root = ref<HTMLDivElement | null>(null);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

async function renderPreview() {
  const el = root.value;
  if (!el) return;
  try {
    await Vditor.preview(el, props.markdown, {
      mode: 'light',
      lang: 'zh_CN',
      markdown: {
        toc: true,
        mark: false,
        footnotes: true,
        autoSpace: true,
      },
    });
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
  if (root.value) root.value.innerHTML = '';
});
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
  overflow: auto;
  padding: 12px 14px;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #0f172a;
}
.md-preview-root :deep(.vditor-reset) {
  color: inherit;
}
</style>
