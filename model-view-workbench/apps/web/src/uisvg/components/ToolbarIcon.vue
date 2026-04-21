<script setup lang="ts">
defineProps<{
  name:
    | 'new'
    | 'open'
    | 'save'
    | 'reset'
    | 'fit'
    | 'preview'
    | 'fullscreen'
    | 'fullscreenExit'
    | 'debug'
    | 'alignLeft'
    | 'alignHCenter'
    | 'alignRight'
    | 'alignTop'
    | 'alignVCenter'
    | 'alignBottom'
}>()
</script>

<template>
  <svg class="tb-glyph" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g v-if="name === 'new'" fill="none" stroke="currentColor" stroke-width="1.1">
      <path d="M4 2.5h5.5L12 5v9.5H4V2.5z" fill="#fff" />
      <path d="M9.5 2.5V5H12" />
    </g>
    <g v-else-if="name === 'open'" fill="none" stroke="currentColor" stroke-width="1.1">
      <path d="M2 6h3.5l1.2-1.5H14v9H2V6z" fill="#fff" />
      <path d="M2 6h12" />
    </g>
    <g v-else-if="name === 'save'" stroke="currentColor" stroke-width="1.1">
      <rect x="3" y="2" width="10" height="12" rx="1" fill="#fff" />
      <rect x="5" y="2" width="6" height="3.5" fill="currentColor" opacity="0.22" stroke="none" />
      <rect x="5" y="9" width="6" height="3.5" fill="currentColor" opacity="0.12" stroke="none" />
    </g>
    <g v-else-if="name === 'reset'" fill="none" stroke="currentColor" stroke-width="1.1">
      <circle cx="8" cy="8" r="5.2" />
      <path d="M8 4.5v-1.5M8 13v-1.5M4.5 8H3M13 8h-1.5" />
    </g>
    <g v-else-if="name === 'fit'" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round">
      <path d="M3.5 6.5h3v-3M12.5 9.5h-3v3M9.5 3.5h3v3M6.5 12.5h-3v-3" />
      <rect x="5" y="5" width="6" height="6" rx="0.8" />
    </g>
    <g v-else-if="name === 'preview'" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round">
      <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
      <path d="M6.5 8.5l2.2 1.8 3.8-5.2" fill="none" />
      <circle cx="5" cy="5.5" r="0.9" fill="currentColor" stroke="none" />
    </g>
    <g v-else-if="name === 'fullscreen'" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="square">
      <path d="M2.5 6V2.5H6M13.5 6V2.5H10M2.5 10v3.5H6M13.5 10v3.5H10" />
    </g>
    <g v-else-if="name === 'fullscreenExit'" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="square">
      <path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10" />
    </g>
    <g v-else-if="name === 'debug'" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.2" />
      <path d="M4.5 5.5h7M4.5 8h5M4.5 10.5h6" />
    </g>
    <!-- 对齐：竖线为参考边，小矩形为对象 -->
    <g v-else-if="name === 'alignLeft'" fill="currentColor" stroke="currentColor" stroke-width="1.1">
      <line x1="3" y1="2.5" x2="3" y2="13.5" />
      <rect x="4.5" y="3.5" width="8" height="2.4" rx="0.35" stroke="none" />
      <rect x="4.5" y="6.8" width="5.5" height="2.4" rx="0.35" stroke="none" />
      <rect x="4.5" y="10.1" width="7" height="2.4" rx="0.35" stroke="none" />
    </g>
    <g v-else-if="name === 'alignHCenter'" fill="currentColor" stroke="currentColor" stroke-width="1.1">
      <line x1="8" y1="2.5" x2="8" y2="13.5" />
      <rect x="5" y="3.5" width="6" height="2.4" rx="0.35" stroke="none" />
      <rect x="4" y="6.8" width="8" height="2.4" rx="0.35" stroke="none" />
      <rect x="5.5" y="10.1" width="5" height="2.4" rx="0.35" stroke="none" />
    </g>
    <g v-else-if="name === 'alignRight'" fill="currentColor" stroke="currentColor" stroke-width="1.1">
      <line x1="13" y1="2.5" x2="13" y2="13.5" />
      <rect x="3.5" y="3.5" width="8" height="2.4" rx="0.35" stroke="none" />
      <rect x="5" y="6.8" width="6.5" height="2.4" rx="0.35" stroke="none" />
      <rect x="4" y="10.1" width="7.5" height="2.4" rx="0.35" stroke="none" />
    </g>
    <g v-else-if="name === 'alignTop'" fill="currentColor" stroke="currentColor" stroke-width="1.1">
      <line x1="2.5" y1="3" x2="13.5" y2="3" />
      <rect x="3.5" y="4.5" width="2.4" height="8" rx="0.35" stroke="none" />
      <rect x="6.8" y="4.5" width="2.4" height="5.5" rx="0.35" stroke="none" />
      <rect x="10.1" y="4.5" width="2.4" height="7" rx="0.35" stroke="none" />
    </g>
    <g v-else-if="name === 'alignVCenter'" fill="currentColor" stroke="currentColor" stroke-width="1.1">
      <line x1="2.5" y1="8" x2="13.5" y2="8" />
      <rect x="3.5" y="5" width="2.4" height="6" rx="0.35" stroke="none" />
      <rect x="6.8" y="4" width="2.4" height="8" rx="0.35" stroke="none" />
      <rect x="10.1" y="5.5" width="2.4" height="5" rx="0.35" stroke="none" />
    </g>
    <g v-else-if="name === 'alignBottom'" fill="currentColor" stroke="currentColor" stroke-width="1.1">
      <line x1="2.5" y1="13" x2="13.5" y2="13" />
      <rect x="3.5" y="3.5" width="2.4" height="8" rx="0.35" stroke="none" />
      <rect x="6.8" y="6" width="2.4" height="6.5" rx="0.35" stroke="none" />
      <rect x="10.1" y="4.5" width="2.4" height="7.5" rx="0.35" stroke="none" />
    </g>
  </svg>
</template>

<style scoped>
.tb-glyph {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: block;
  color: #2c2c2c;
}
</style>
