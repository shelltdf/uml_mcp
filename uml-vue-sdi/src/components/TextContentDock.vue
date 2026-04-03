<script setup lang="ts">
import { computed } from 'vue';
import { getMessages, type LocaleId } from '../i18n/ui';
import { workspace } from '../stores/workspace';

const props = defineProps<{
  locale: LocaleId;
  /** 仅收起主体（源码区），标题栏保留 */
  bodyFolded: boolean;
  /** 当前是否处于「该侧最大化」 */
  maximized: boolean;
}>();

const emit = defineEmits<{
  'update:bodyFolded': [value: boolean];
  'toggle-maximize': [];
  close: [];
}>();

const m = computed(() => getMessages(props.locale));

function onInput(e: Event) {
  const tab = workspace.activeTab.value;
  if (!tab) return;
  const v = (e.target as HTMLTextAreaElement).value;
  workspace.updateContent(tab.id, v);
}

function toggleBody() {
  emit('update:bodyFolded', !props.bodyFolded);
}
</script>

<template>
  <div class="dock-window">
    <div class="dock-window__title" role="toolbar" :aria-label="m.dockTitleBarAria">
      <span class="dock-window__title-text" role="heading" aria-level="2">{{ m.dockTextContent }}</span>
      <div class="dock-window__actions">
        <button
          type="button"
          class="dock-win-btn"
          :title="`${bodyFolded ? m.dockUnfoldBody : m.dockFoldBody} — 无全局快捷键`"
          :aria-expanded="!bodyFolded"
          @click="toggleBody"
        >
          <span class="dock-win-btn__glyph" aria-hidden="true">{{ bodyFolded ? '▾' : '▴' }}</span>
        </button>
        <button
          type="button"
          class="dock-win-btn"
          :title="`${maximized ? m.dockRestoreSize : m.dockMaximize} — 无全局快捷键`"
          @click="emit('toggle-maximize')"
        >
          <span class="dock-win-btn__glyph dock-win-btn__glyph--max" aria-hidden="true">⬚</span>
        </button>
        <button
          type="button"
          class="dock-win-btn dock-win-btn--close"
          :title="`${m.dockClose} — 无全局快捷键`"
          @click="emit('close')"
        >
          <span class="dock-win-btn__glyph" aria-hidden="true">×</span>
        </button>
      </div>
    </div>
    <template v-if="workspace.activeTab.value">
      <textarea
        v-show="!bodyFolded"
        class="dock-window__body text-dock__area"
        spellcheck="false"
        :value="workspace.activeTab.value.content"
        :aria-label="m.dockTextContent"
        @input="onInput"
      />
    </template>
    <p v-else-if="!bodyFolded" class="text-dock__empty">{{ m.dockNoActiveFile }}</p>
  </div>
</template>

<style scoped>
.dock-window {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  min-width: 0;
  background: var(--editor-bg, #fff);
}
.dock-window__title {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 2px 6px;
  min-height: 22px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-bottom: 1px solid var(--border, #ccc);
  background: var(--tab-bg, #e8e8ea);
  user-select: none;
}
.dock-window__title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.dock-window__actions {
  display: flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
}
.dock-win-btn {
  padding: 1px 5px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1;
  cursor: pointer;
}
.dock-win-btn:hover,
.dock-win-btn:focus-visible {
  background: var(--menu-hover, rgba(0, 0, 0, 0.06));
  outline: none;
}
.dock-win-btn--close:hover {
  background: rgba(220, 50, 50, 0.15);
}
.dock-win-btn__glyph {
  display: inline-block;
  font-size: 0.85rem;
  line-height: 1;
}
.dock-win-btn__glyph--max {
  font-size: 0.75rem;
  opacity: 0.9;
}
.text-dock__area {
  flex: 1;
  width: 100%;
  min-height: 60px;
  padding: 4px 6px;
  border: none;
  resize: none;
  line-height: 1.35;
  tab-size: 2;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.78rem;
  background: var(--editor-bg, #fff);
  color: inherit;
}
.text-dock__area:focus {
  outline: none;
}
.text-dock__empty {
  margin: 0;
  padding: 8px;
  font-size: 0.78rem;
  opacity: 0.75;
}
</style>
