<script setup lang="ts">
/**
 * workbench 嵌入时不渲染外层 div.data-panel，子节点提升到父级（与 Properties 同为 scroll 的直接子项）。
 */
import { ref } from 'vue'

withDefaults(
  defineProps<{
    bare?: boolean
    allRailsCollapsed?: boolean
  }>(),
  { bare: false, allRailsCollapsed: false },
)

const shellRef = ref<HTMLElement | null>(null)

defineExpose({ shellRef })
</script>

<template>
  <div
    v-if="!bare"
    ref="shellRef"
    class="data-panel"
    :class="{
      'data-panel--all-rail-tabs': allRailsCollapsed,
    }"
  >
    <slot />
  </div>
  <slot v-else />
</template>
