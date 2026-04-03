<script setup lang="ts">
import { computed } from 'vue';
import { getMessages, type LocaleId } from '../i18n/ui';
import { workspace } from '../stores/workspace';

const props = defineProps<{
  locale: LocaleId;
}>();

const m = computed(() => getMessages(props.locale));

function tryCloseTab(id: string) {
  const tab = workspace.state.tabs.find((t) => t.id === id);
  if (tab?.isDirty && !window.confirm(m.value.confirmCloseTab)) {
    return;
  }
  workspace.closeTab(id);
}

function basename(path: string) {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}
</script>

<template>
  <div class="workspace-tabs" role="tablist" :aria-label="m.mdiTabStripLabel">
    <button
      v-for="t in workspace.state.tabs"
      :key="t.id"
      type="button"
      role="tab"
      class="tab"
      :class="{ 'tab--active': t.id === workspace.state.activeTabId }"
      :aria-selected="t.id === workspace.state.activeTabId"
      :aria-label="basename(t.path) + (t.isDirty ? ', ' + m.dirtyTabHint : '')"
      :title="basename(t.path) + (t.isDirty ? ' — ' + m.dirtyTabHint : '') + ' — 无全局快捷键'"
      @click="workspace.selectTab(t.id)"
    >
      <span class="tab__dirty" aria-hidden="true">
        <span v-if="t.isDirty" class="tab__dirty-dot" :title="m.dirtyTabHint" />
        <span v-else class="tab__dirty-placeholder" />
      </span>
      <span class="tab__name">{{ basename(t.path) }}</span>
      <span class="tab__close" :title="m.closeTabHint + ' — 无全局快捷键'" @click.stop="tryCloseTab(t.id)">×</span>
    </button>
  </div>
</template>

<style scoped>
.workspace-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1px;
  padding: 2px 4px 0;
  background: var(--tab-bg, #e8e8ea);
  border-bottom: 1px solid var(--border, #ccc);
  flex-shrink: 0;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 140px;
  padding: 2px 5px 4px;
  font-size: 0.7rem;
  line-height: 1.15;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 3px 3px 0 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.tab--active {
  background: var(--editor-bg, #fff);
  border-color: var(--border, #ccc);
  border-bottom-color: var(--editor-bg, #fff);
  margin-bottom: -1px;
  padding-bottom: 5px;
  font-weight: 600;
}
.tab__dirty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 7px;
  flex-shrink: 0;
}
.tab__dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e65100;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
}
.tab__dirty-placeholder {
  width: 6px;
  height: 6px;
}
.tab__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.tab__close {
  flex-shrink: 0;
  opacity: 0.55;
  padding: 0 1px;
  font-size: 0.95rem;
  line-height: 1;
}
.tab__close:hover {
  opacity: 1;
}
</style>
