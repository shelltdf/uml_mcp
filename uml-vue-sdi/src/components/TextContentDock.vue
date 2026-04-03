<script setup lang="ts">
import { computed } from 'vue';
import { getMessages, type LocaleId } from '../i18n/ui';
import { workspace } from '../stores/workspace';

const props = defineProps<{
  locale: LocaleId;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  'update:collapsed': [value: boolean];
}>();

const m = computed(() => getMessages(props.locale));

function onInput(e: Event) {
  const tab = workspace.activeTab.value;
  if (!tab) return;
  const v = (e.target as HTMLTextAreaElement).value;
  workspace.updateContent(tab.id, v);
}

function fold() {
  emit('update:collapsed', true);
}

function unfold() {
  emit('update:collapsed', false);
}
</script>

<template>
  <div class="text-dock-root" :class="{ 'text-dock-root--collapsed': collapsed }">
    <template v-if="!collapsed">
      <div class="text-dock__head">
        <span class="text-dock__head-title" role="heading" aria-level="2">{{ m.dockTextContent }}</span>
        <button
          type="button"
          class="text-dock__head-btn"
          :title="`${m.dockCollapse} — 无全局快捷键`"
          aria-expanded="true"
          @click="fold"
        >
          ⟨
        </button>
      </div>
      <textarea
        v-if="workspace.activeTab.value"
        class="text-dock__area"
        spellcheck="false"
        :value="workspace.activeTab.value.content"
        :aria-label="m.dockTextContent"
        @input="onInput"
      />
      <p v-else class="text-dock__empty">{{ m.dockNoActiveFile }}</p>
    </template>
    <button
      v-else
      type="button"
      class="text-dock__expand-strip"
      :title="`${m.dockExpand} — 无全局快捷键`"
      aria-expanded="false"
      @click="unfold"
    >
      <span class="text-dock__expand-label">{{ m.dockTextContent }}</span>
    </button>
  </div>
</template>

<style scoped>
.text-dock-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  min-width: 0;
  background: var(--editor-bg, #fff);
}
.text-dock-root--collapsed {
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
}
.text-dock__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-bottom: 1px solid var(--border, #ccc);
  background: var(--tab-bg, #e8e8ea);
  user-select: none;
}
.text-dock__head-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.text-dock__head-btn {
  flex-shrink: 0;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  line-height: 1;
}
.text-dock__head-btn:hover,
.text-dock__head-btn:focus-visible {
  background: var(--menu-hover, rgba(0, 0, 0, 0.06));
  outline: none;
}
.text-dock__area {
  flex: 1;
  width: 100%;
  min-height: 80px;
  padding: 6px 8px;
  border: none;
  resize: none;
  line-height: 1.4;
  tab-size: 2;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.8rem;
  background: var(--editor-bg, #fff);
  color: inherit;
}
.text-dock__area:focus {
  outline: none;
}
.text-dock__empty {
  margin: 0;
  padding: 10px;
  font-size: 0.82rem;
  opacity: 0.75;
}
.text-dock__expand-strip {
  flex: 1;
  width: 100%;
  min-height: 0;
  padding: 8px 2px;
  border: none;
  border-left: 1px solid var(--border, #ccc);
  background: var(--tab-bg, #e8e8ea);
  color: inherit;
  font: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.text-dock__expand-strip:hover,
.text-dock__expand-strip:focus-visible {
  filter: brightness(0.97);
  outline: none;
}
.text-dock__expand-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  opacity: 0.9;
}
</style>
