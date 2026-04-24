<script setup lang="ts">
/**
 * Dock 内面板：
 * - 垂直：▼ 折叠内容（open）
 * - 水平：收起到左/右侧窄条（railOpen），不再使用整侧 dock 的全局折叠按钮
 */
const open = defineModel<boolean>({ default: true })
const railOpen = defineModel<boolean>('railOpen', { default: true })
const emit = defineEmits<{
  close: []
}>()

withDefaults(
  defineProps<{
    title: string
    panelId: string
    rootClass?: string
    /** 收起后边条位置：左侧 dock 用 left，右侧 dock 用 right */
    railEdge: 'left' | 'right'
    /**
     * 为 true 时不在本组件内绘制收起窄条（由父级单独一列渲染），避免与主内容区同一列冲突
     */
    externalRailStrip?: boolean
    /**
     * 外层已有 workbench dock 标题/侧栏按钮时：只渲染 body，不再套 ▼ 与收起到边条。
     */
    plainBody?: boolean
    /**
     * 与主窗口右侧「属性」面板一致：`dock-special-panel` + `dock-special-head` + 内容区；
     * 无收起到边条，右上角仅保留关闭当前 panel。
     */
    workbenchDockPanel?: boolean
    closeTitle?: string
  }>(),
  { externalRailStrip: false, plainBody: false, workbenchDockPanel: false, closeTitle: '' },
)
</script>

<template>
  <section
    v-if="workbenchDockPanel"
    class="dock-section dock-fold-workbench dock-special-panel"
    :class="rootClass"
  >
    <div class="dock-special-head">
      <h3 class="dock-subh dock-subh--special">{{ title }}</h3>
      <div class="dock-special-head-actions">
        <button
          type="button"
          class="dock-fold-workbench__close"
          :title="closeTitle || 'Hide this panel'"
          :aria-label="closeTitle || 'Hide this panel'"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
    </div>
    <div
      :id="panelId"
      class="dock-fold-workbench__body"
      role="region"
    >
      <slot />
    </div>
  </section>
  <div v-else-if="plainBody" class="dock-fold-outer dock-fold-outer--plain" :class="rootClass">
    <section class="dock-fold dock-fold--plain">
      <div :id="panelId" class="dock-fold__body" role="region">
        <slot />
      </div>
    </section>
  </div>
  <div
    v-else
    class="dock-fold-outer"
    :class="[
      rootClass,
      `dock-fold-outer--rail-${railEdge}`,
      { 'dock-fold-outer--rail-collapsed': !railOpen },
    ]"
  >
    <!-- 仅侧栏条：点击展开（父级 externalRailStrip 时改由父级独立列渲染） -->
    <button
      v-if="!railOpen && !externalRailStrip"
      type="button"
      class="dock-fold__rail-tab"
      :class="`dock-fold__rail-tab--${railEdge}`"
      :title="`展开：${title}`"
      @click="railOpen = true"
    >
      <span class="dock-fold__rail-tab__chev" aria-hidden="true">{{
        railEdge === 'left' ? '▶' : '◀'
      }}</span>
      <span class="dock-fold__rail-tab__label">{{ title }}</span>
    </button>

    <!-- 与上一段 button 不用 v-else：externalRailStrip 且收起时由父级渲染窄条，此处留空直至卸载 -->
    <section
      v-if="railOpen"
      class="dock-fold"
      :class="{ 'dock-fold--collapsed': !open }"
    >
      <div class="dock-fold__header-row">
        <button
          v-if="railEdge === 'right'"
          type="button"
          class="dock-fold__rail-hide"
          title="收起到右侧边条"
          aria-label="收起到右侧边条"
          @click="railOpen = false"
        >
          ▶
        </button>
        <button
          type="button"
          class="dock-fold__header"
          :aria-expanded="open"
          :aria-controls="panelId"
          @click="open = !open"
        >
          <span
            class="dock-fold__chev"
            :class="{ 'dock-fold__chev--collapsed': !open }"
            aria-hidden="true"
            >▼</span
          >
          <span class="dock-fold__title">{{ title }}</span>
        </button>
        <button
          v-if="railEdge === 'left'"
          type="button"
          class="dock-fold__rail-hide"
          title="收起到左侧边条"
          aria-label="收起到左侧边条"
          @click="railOpen = false"
        >
          ◀
        </button>
      </div>
      <div
        v-show="open"
        :id="panelId"
        class="dock-fold__body"
        role="region"
        :aria-hidden="!open"
      >
        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped>
.dock-fold-workbench {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.dock-fold-workbench__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.dock-fold-workbench__close {
  margin: 0;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  padding: 2px 8px;
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.2;
  cursor: pointer;
  color: #1e293b;
  background: #fff;
  flex-shrink: 0;
}

.dock-fold-workbench__close:hover {
  border-color: #64748b;
  background: #f8fafc;
}

.dock-fold-outer--plain {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dock-fold--plain {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dock-fold-outer {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
  flex: 1 1 auto;
}

.dock-fold-outer--rail-collapsed.dock-fold-outer--rail-left {
  flex-direction: row;
  justify-content: flex-start;
}

.dock-fold-outer--rail-collapsed.dock-fold-outer--rail-right {
  flex-direction: row;
  justify-content: flex-end;
}

/** 收起到边条时不占满 flex 高度，多个 dock 自上而下只显示窄条 */
.dock-fold-outer--rail-collapsed {
  flex: 0 0 auto;
  height: auto;
  min-height: 0;
}

.dock-fold__rail-tab {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  width: 18px;
  min-height: 72px;
  flex: 0 0 18px;
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

.dock-fold__rail-tab--left {
  border-right: 1px solid var(--win-border);
  background: linear-gradient(to right, #e8e8e8, #f2f2f2);
}

.dock-fold__rail-tab--right {
  border-left: 1px solid var(--win-border);
  background: linear-gradient(to left, #e8e8e8, #f2f2f2);
}

.dock-fold__rail-tab:hover,
.dock-fold__rail-tab:focus-visible {
  background: linear-gradient(to bottom, #d4eaff, #e8f2ff);
  outline: 1px dotted #333;
  outline-offset: -2px;
}

.dock-fold__rail-tab__chev {
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
}

.dock-fold__rail-tab__label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.02em;
  max-height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dock-fold {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  flex: 1 1 auto;
}

/** 垂直折叠（▼）时仅保留标题行高度，不把父级 flex 高度占满 */
.dock-fold--collapsed {
  flex: 0 0 auto;
}

/**
 * 垂直 ▼ 收起时，覆盖外层 height:100% / 父级 rootClass 的 flex:1，
 * 避免仍占满 dock-pane 分配高度。
 */
.dock-fold-outer:has(.dock-fold--collapsed) {
  flex: 0 0 auto !important;
  height: auto !important;
  max-height: none;
  min-height: 0;
}

.dock-fold__header-row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
}

.dock-fold__rail-hide {
  flex: 0 0 18px;
  width: 18px;
  padding: 0;
  margin: 0;
  border: none;
  border-bottom: 1px solid var(--win-border);
  background: linear-gradient(to bottom, #ececec, #dedede);
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
  color: #404040;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dock-fold__rail-hide:hover,
.dock-fold__rail-hide:focus-visible {
  background: linear-gradient(to bottom, #cce8ff, #b8d4f0);
  outline: 1px dotted #333;
  outline-offset: -2px;
}

.dock-fold__header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 4px 6px;
  border: none;
  border-bottom: 1px solid var(--win-border);
  background: linear-gradient(to bottom, #fafafa, #f0f0f0);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #303030;
  text-align: left;
  cursor: pointer;
  user-select: none;
}

.dock-fold__header:hover {
  background: linear-gradient(to bottom, #eaf4ff, #dce8f5);
}

.dock-fold__header:focus-visible {
  outline: 1px dotted #000;
  outline-offset: -2px;
}

.dock-fold__chev {
  display: inline-block;
  width: 12px;
  font-size: 9px;
  line-height: 1;
  color: #505050;
  transform-origin: center;
  transition: transform 0.12s ease;
}

.dock-fold__chev--collapsed {
  transform: rotate(-90deg);
}

.dock-fold__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock-fold__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
}
</style>
