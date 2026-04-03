<script setup lang="ts">
import type { FileKind } from '../lib/formats';

defineProps<{
  kind: FileKind;
  title: string;
  hint: string;
}>();
</script>

<template>
  <div class="kind-canvas">
    <p class="kind-canvas__kind">{{ kind }}</p>
    <h3 class="kind-canvas__title">{{ title }}</h3>
    <p class="kind-canvas__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.kind-canvas {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  background: var(--canvas-bg, #eceff4);
  color: var(--fg, #333);
}
:root[data-theme='dark'] .kind-canvas {
  --canvas-bg: #1a1b1f;
}
.kind-canvas__kind {
  margin: 0 0 8px;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.kind-canvas__title {
  margin: 0 0 10px;
  font-size: 1.05rem;
  font-weight: 600;
}
.kind-canvas__hint {
  margin: 0;
  max-width: 28rem;
  font-size: 0.9rem;
  line-height: 1.5;
  opacity: 0.85;
}
</style>
