<script setup lang="ts">
import { computed } from 'vue';
import type { LocaleId } from '../i18n/ui';
import { getMessages } from '../i18n/ui';

const props = defineProps<{
  content: string;
  path: string;
  locale: LocaleId;
}>();

const m = computed(() => getMessages(props.locale));
const baseName = computed(() => props.path.split(/[/\\]/).pop() ?? props.path);
</script>

<template>
  <div class="src-canvas" :aria-label="m.sourceCanvasAria">
    <header class="src-canvas__head">
      <span class="src-canvas__path" :title="path">{{ baseName }}</span>
      <span class="src-canvas__hint">{{ m.sourceCanvasHint }}</span>
    </header>
    <pre class="src-canvas__pre">{{ content }}</pre>
  </div>
</template>

<style scoped>
.src-canvas {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--canvas-bg, #eceff4);
  color: var(--fg, #0f172a);
}
:root[data-theme='dark'] .src-canvas {
  --canvas-bg: #1a1b1f;
}
.src-canvas__head {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  padding: 8px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--border, #ccc) 70%, transparent);
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 90%, transparent);
  font-size: 0.8rem;
}
.src-canvas__path {
  font-family: ui-monospace, Consolas, monospace;
  font-weight: 600;
}
.src-canvas__hint {
  opacity: 0.75;
  font-size: 0.75rem;
}
.src-canvas__pre {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: 0.78rem;
  line-height: 1.45;
  tab-size: 2;
  white-space: pre;
  background: transparent;
}
</style>
