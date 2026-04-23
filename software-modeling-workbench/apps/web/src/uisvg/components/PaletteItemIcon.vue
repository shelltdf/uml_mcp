<script setup lang="ts">
import { computed } from 'vue'
import { basicPaletteIconSvgInner, windowsPaletteIconSvgInner } from '../lib/windowsPaletteIcons'

const props = defineProps<{
  variant: 'basic' | 'windows'
  id: string
}>()

const markup = computed(() => {
  if (props.variant === 'basic') {
    return basicPaletteIconSvgInner(props.id as 'rect' | 'text' | 'frame')
  }
  return windowsPaletteIconSvgInner(props.id)
})
</script>

<template>
  <svg
    class="palette-item-icon"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g class="palette-item-icon-inner" v-html="markup" />
  </svg>
</template>

<style scoped>
.palette-item-icon {
  width: 24px;
  height: 24px;
  display: block;
  flex-shrink: 0;
}

.palette-item-icon :deep(*) {
  vector-effect: non-scaling-stroke;
}
</style>
