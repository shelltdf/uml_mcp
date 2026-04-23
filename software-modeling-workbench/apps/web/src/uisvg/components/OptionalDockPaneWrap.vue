<script setup lang="ts">
/**
 * 独立 dock 场景需要外层 dock-pane；主窗口右侧嵌入时省略该 div，避免 display:contents 造成 0×0 节点。
 */
import type { StyleValue } from 'vue'

withDefaults(
  defineProps<{
    wrap: boolean
    wrapClass?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
    wrapStyle?: StyleValue
  }>(),
  { wrap: true },
)
</script>

<template>
  <div v-if="wrap" :class="wrapClass" :style="wrapStyle">
    <slot />
  </div>
  <slot v-else />
</template>
