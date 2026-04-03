<script setup lang="ts">
import { computed } from 'vue';
import { getMessages, type LocaleId } from '../i18n/ui';
import { workspace, type PropertySelection } from '../stores/workspace';

const props = defineProps<{
  locale: LocaleId;
  bodyFolded: boolean;
  maximized: boolean;
}>();

const emit = defineEmits<{
  'update:bodyFolded': [value: boolean];
  'toggle-maximize': [];
  close: [];
}>();

const m = computed(() => getMessages(props.locale));

const tab = computed(() => workspace.activeTab.value);

const selection = computed((): PropertySelection => workspace.propertySelection.value);

const kindLabel = computed(() => {
  const k = tab.value?.kind;
  if (!k) return '—';
  const msg = m.value;
  if (k === 'sync') return msg.propsKindSync;
  if (k === 'uml') return msg.propsKindUml;
  if (k === 'class') return msg.propsKindClass;
  if (k === 'code') return msg.propsKindCode;
  return msg.propsKindOther;
});

const lineCount = computed(() => {
  if (!tab.value) return 0;
  if (tab.value.content.length === 0) return 1;
  return tab.value.content.split('\n').length;
});

/** 有选中且属于当前活动标签 → 显示对象属性 */
const showObjectProps = computed(() => {
  const t = tab.value;
  const s = selection.value;
  if (!t) return false;
  if (s.kind === 'none') return false;
  return s.tabId === t.id;
});

function toggleBody() {
  emit('update:bodyFolded', !props.bodyFolded);
}
</script>

<template>
  <div class="dock-window">
    <div class="dock-window__title" role="toolbar" :aria-label="m.dockPropsTitleBarAria">
      <span class="dock-window__title-text" role="heading" aria-level="2">{{ m.dockProperties }}</span>
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
    <div v-show="!bodyFolded" class="dock-window__body props-body">
      <template v-if="tab">
        <!-- 选中对象：图中元素 -->
        <template v-if="showObjectProps && selection.kind === 'mermaid'">
          <p class="props-context">
            <span class="props-context__k">{{ m.propsContext }}</span>
            <span class="props-context__v">{{ m.propsContextObject }} · {{ m.propsMermaidElement }}</span>
          </p>
          <dl class="props-dl">
            <div class="props-row">
              <dt>{{ m.propsNodeId }}</dt>
              <dd class="props-dd--mono">{{ selection.nodeId }}</dd>
            </div>
            <div class="props-row">
              <dt>{{ m.propsNodeLabel }}</dt>
              <dd>{{ selection.label }}</dd>
            </div>
          </dl>
        </template>

        <!-- 选中对象：文本选区 -->
        <template v-else-if="showObjectProps && selection.kind === 'text'">
          <p class="props-context">
            <span class="props-context__k">{{ m.propsContext }}</span>
            <span class="props-context__v">{{ m.propsContextObject }} · {{ m.propsTextRange }}</span>
          </p>
          <dl class="props-dl">
            <div class="props-row">
              <dt>{{ m.propsSelRange }}</dt>
              <dd class="props-dd--mono">{{ selection.start }} – {{ selection.end }}</dd>
            </div>
            <div class="props-row">
              <dt>{{ m.propsSelLength }}</dt>
              <dd>{{ selection.end - selection.start }}</dd>
            </div>
            <div class="props-row props-row--preview">
              <dt>{{ m.propsSelPreview }}</dt>
              <dd class="props-dd--preview">{{ selection.snippet }}</dd>
            </div>
          </dl>
        </template>

        <!-- 无选中：当前文档 -->
        <template v-else>
          <p class="props-context">
            <span class="props-context__k">{{ m.propsContext }}</span>
            <span class="props-context__v">{{ m.propsContextDocument }}</span>
          </p>
          <dl class="props-dl">
            <div class="props-row">
              <dt>{{ m.propsPath }}</dt>
              <dd class="props-dd--path" :title="tab.path">{{ tab.path }}</dd>
            </div>
            <div class="props-row">
              <dt>{{ m.propsKind }}</dt>
              <dd>{{ kindLabel }}</dd>
            </div>
            <div class="props-row">
              <dt>{{ m.propsDirty }}</dt>
              <dd>{{ tab.isDirty ? m.propsDirtyYes : m.propsDirtyNo }}</dd>
            </div>
            <div class="props-row">
              <dt>{{ m.propsLines }}</dt>
              <dd>{{ lineCount }}</dd>
            </div>
            <div class="props-row">
              <dt>{{ m.propsEncoding }}</dt>
              <dd>UTF-8</dd>
            </div>
          </dl>
        </template>
      </template>
      <p v-else class="props-empty">{{ m.dockNoActiveFile }}</p>
    </div>
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
.props-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 8px;
  font-size: 0.72rem;
  line-height: 1.35;
}
.props-context {
  margin: 0 0 8px;
  padding: 4px 6px;
  font-size: 0.68rem;
  line-height: 1.3;
  border-radius: 4px;
  background: color-mix(in srgb, var(--tab-bg, #e8e8ea) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 50%, transparent);
}
.props-context__k {
  opacity: 0.75;
  font-weight: 700;
  margin-right: 6px;
}
.props-context__v {
  font-weight: 600;
}
.props-dl {
  margin: 0;
}
.props-row {
  display: grid;
  grid-template-columns: 4.2em minmax(0, 1fr);
  gap: 6px 8px;
  margin: 0 0 6px;
  align-items: baseline;
}
.props-row--preview {
  align-items: start;
}
.props-row dt {
  margin: 0;
  opacity: 0.75;
  font-weight: 600;
}
.props-row dd {
  margin: 0;
  word-break: break-word;
}
.props-dd--path {
  font-family: ui-monospace, 'Consolas', monospace;
  font-size: 0.68rem;
  word-break: break-all;
}
.props-dd--mono {
  font-family: ui-monospace, 'Consolas', monospace;
  font-size: 0.65rem;
  word-break: break-all;
}
.props-dd--preview {
  font-family: ui-monospace, 'Consolas', monospace;
  font-size: 0.65rem;
  white-space: pre-wrap;
  max-height: 6.5em;
  overflow: auto;
}
.props-empty {
  margin: 0;
  opacity: 0.75;
}
</style>
