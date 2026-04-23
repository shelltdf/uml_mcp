<script setup lang="ts">
/**
 * workbench 嵌入时不渲染 data-panel__main，子节点直接挂在 DataPanel 根下。
 */
withDefaults(
  defineProps<{
    hoistMain?: boolean
    emptyMain?: boolean
  }>(),
  { hoistMain: false, emptyMain: false },
)
</script>

<template>
  <div
    v-if="!hoistMain"
    class="data-panel__main"
    :class="{ 'data-panel__main--empty': emptyMain }"
  >
    <slot />
  </div>
  <slot v-else />
</template>
