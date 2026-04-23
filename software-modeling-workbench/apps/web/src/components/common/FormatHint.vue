<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'compact' | 'warn' | 'title';
  }>(),
  { variant: 'compact' },
);
</script>

<template>
  <p class="canvas-hint" :class="variant === 'warn' ? 'canvas-hint--warn' : variant === 'title' ? 'title' : 'canvas-hint--compact'">
    <slot />
  </p>
</template>

<style scoped>
.canvas-hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: #475569;
}
.canvas-hint.title {
  font-weight: 700;
  color: #0f172a;
}
.canvas-hint--warn {
  color: #b45309;
}
.canvas-hint--compact {
  font-size: 0.76rem;
  margin-bottom: 6px;
}
</style>
