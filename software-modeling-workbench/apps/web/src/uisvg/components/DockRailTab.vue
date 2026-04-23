<script setup lang="ts">
/**
 * 收起到边条时的窄条按钮（由父级放在独立列，避免与主内容区同一列抢占布局）
 */
defineProps<{
  title: string
  railEdge: 'left' | 'right'
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="dock-rail-tab"
    :class="`dock-rail-tab--${railEdge}`"
    :title="`展开：${title}`"
    @click="emit('click')"
  >
    <span class="dock-rail-tab__chev" aria-hidden="true">{{ railEdge === 'left' ? '▶' : '◀' }}</span>
    <span class="dock-rail-tab__label">{{ title }}</span>
  </button>
</template>

<style scoped>
.dock-rail-tab {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  width: 18px;
  min-height: 72px;
  flex: 0 0 auto;
  align-self: stretch;
  padding: 8px 0;
  margin: 0;
  border: none;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  color: #303030;
  user-select: none;
}

.dock-rail-tab--left {
  border-right: 1px solid var(--win-border);
  background: linear-gradient(to right, #e8e8e8, #f2f2f2);
}

.dock-rail-tab--right {
  border-left: 1px solid var(--win-border);
  background: linear-gradient(to left, #e8e8e8, #f2f2f2);
}

.dock-rail-tab:hover,
.dock-rail-tab:focus-visible {
  background: linear-gradient(to bottom, #d4eaff, #e8f2ff);
  outline: 1px dotted #333;
  outline-offset: -2px;
}

.dock-rail-tab__chev {
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
}

.dock-rail-tab__label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.02em;
  max-height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
