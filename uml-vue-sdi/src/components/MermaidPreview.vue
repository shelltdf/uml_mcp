<script setup lang="ts">
import mermaid from 'mermaid';
import { computed, ref, watch } from 'vue';
import { extractMermaidBlocks } from '../lib/formats';

const props = defineProps<{
  markdown: string;
  kind: string;
}>();

const htmlChunks = ref<string[]>([]);
const errorText = ref('');

const blocks = computed(() => {
  if (props.kind !== 'uml') return [];
  return extractMermaidBlocks(props.markdown);
});

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
</script>

<template>
  <div class="preview">
    <template v-if="kind !== 'uml'">
      <p class="hint">当前文件类型不包含 Mermaid UML 预览（{{ kind }}）。</p>
    </template>
    <template v-else-if="blocks.length === 0">
      <p class="hint">未找到 <code>```mermaid</code> 代码块。</p>
    </template>
    <template v-else>
      <p v-if="errorText" class="err">{{ errorText }}</p>
      <div v-for="(h, idx) in htmlChunks" :key="idx" class="svg-wrap" v-html="h" />
    </template>
  </div>
</template>

<style scoped>
.preview {
  padding: 12px;
  overflow: auto;
  height: 100%;
  background: var(--panel-bg, #fff);
}
@media (prefers-color-scheme: dark) {
  .preview {
    --panel-bg: #1e1e22;
  }
}
.hint,
.err {
  margin: 0 0 8px;
  font-size: 0.9rem;
}
.err {
  color: #c62828;
}
.svg-wrap {
  margin-bottom: 16px;
}
.svg-wrap :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
