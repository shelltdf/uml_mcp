<script setup lang="ts">
import { workspace } from '../stores/workspace';

function onInput(e: Event) {
  const tab = workspace.activeTab.value;
  if (!tab) return;
  const v = (e.target as HTMLTextAreaElement).value;
  workspace.updateContent(tab.id, v);
}
</script>

<template>
  <div class="editor-root">
    <div class="tabs" role="tablist">
      <button
        v-for="t in workspace.state.tabs"
        :key="t.id"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="t.id === workspace.state.activeTabId"
        :title="t.path + (t.isDirty ? '（未保存）' : '') + ' — 无全局快捷键'"
        @click="workspace.selectTab(t.id)"
      >
        <span class="name">{{ t.path.split('/').pop() }}</span>
        <span v-if="t.isDirty" class="dot">·</span>
        <span
          class="close"
          title="关闭 — 无全局快捷键"
          @click.stop="workspace.closeTab(t.id)"
          >×</span
        >
      </button>
    </div>
    <textarea
      v-if="workspace.activeTab.value"
      class="area"
      spellcheck="false"
      :value="workspace.activeTab.value.content"
      @input="onInput"
    />
    <p v-else class="empty">无打开文件</p>
  </div>
</template>

<style scoped>
.editor-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px;
  background: var(--tab-bg, #e8e8ea);
  border-bottom: 1px solid var(--border, #ccc);
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
}
.tab[aria-selected='true'] {
  background: var(--tab-active, #fff);
  border-color: var(--border, #ccc);
}
.name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dot {
  color: #e65100;
  font-weight: bold;
}
.close {
  opacity: 0.6;
  padding: 0 2px;
}
.close:hover {
  opacity: 1;
}
.area {
  flex: 1;
  width: 100%;
  min-height: 240px;
  padding: 12px;
  border: none;
  resize: none;
  line-height: 1.4;
  tab-size: 2;
  background: var(--editor-bg, #fff);
  color: inherit;
}
.empty {
  padding: 16px;
  margin: 0;
}
</style>
