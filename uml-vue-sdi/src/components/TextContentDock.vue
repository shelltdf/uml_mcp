<script setup lang="ts">
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { getMessages, type LocaleId } from '../i18n/ui';
import {
  getLanguageExtension,
  resolveLanguageId,
  type TextDockLanguageId,
} from '../lib/textDockCm';
import { analyzeTextContent, type TextFileMetaRaw } from '../lib/textFileMeta';
import type { Tab } from '../stores/workspace';
import { workspace } from '../stores/workspace';

const props = defineProps<{
  locale: LocaleId;
  editorDark: boolean;
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

const lightCmTheme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--editor-bg, #fff)' },
    '.cm-scroller': {
      fontFamily: "ui-monospace, 'Cascadia Code', 'Consolas', monospace",
      fontSize: '12px',
      lineHeight: 1.35,
    },
    '.cm-gutters': {
      backgroundColor: 'var(--tab-bg, #e8e8ea)',
      borderRight: '1px solid var(--border, #ccc)',
      color: 'var(--editor-fg, #666)',
    },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  },
  { dark: false },
);

const langComp = new Compartment();
const themeComp = new Compartment();
const lineWrapComp = new Compartment();

let view: EditorView | null = null;
const cmHost = ref<HTMLDivElement | null>(null);

function destroyCm() {
  if (view) {
    view.destroy();
    view = null;
  }
}

function reportSel(v: EditorView, tabId: string) {
  const tab = workspace.activeTab.value;
  if (!tab || tab.id !== tabId) return;
  const sel = v.state.selection.main;
  const doc = v.state.doc.toString();
  if (sel.empty) {
    workspace.clearPropertySelection();
  } else {
    const start = Math.min(sel.from, sel.to);
    const end = Math.max(sel.from, sel.to);
    const snippet = doc.slice(start, Math.min(end, start + 160));
    workspace.setPropertySelection({
      kind: 'text',
      tabId,
      start,
      end,
      snippet,
    });
  }
}

function buildExtensions(
  tabId: string,
  langId: TextDockLanguageId,
  dark: boolean,
  lineWrap: boolean,
) {
  return [
    basicSetup,
    langComp.of(getLanguageExtension(langId)),
    themeComp.of(dark ? oneDark : lightCmTheme),
    lineWrapComp.of(lineWrap ? EditorView.lineWrapping : []),
    EditorView.updateListener.of((u) => {
      const tab = workspace.activeTab.value;
      if (!tab || tab.id !== tabId) return;
      if (u.docChanged) {
        const text = u.state.doc.toString();
        if (text !== tab.content) {
          workspace.updateContent(tabId, text);
        }
      }
      if (u.selectionSet || u.docChanged) {
        reportSel(u.view, tabId);
      }
    }),
  ];
}

function mountEditor(tab: Tab) {
  if (!cmHost.value) return;
  const langId = resolveLanguageId(tab.path, tab.textDockLanguage);
  const lineWrap = tab.textDockLineWrap === true;
  view = new EditorView({
    state: EditorState.create({
      doc: tab.content,
      extensions: buildExtensions(tab.id, langId, props.editorDark, lineWrap),
    }),
    parent: cmHost.value,
  });
}

watch(
  () => [workspace.activeTab.value?.id, props.bodyFolded] as const,
  async () => {
    await nextTick();
    destroyCm();
    if (props.bodyFolded) return;
    const tab = workspace.activeTab.value;
    if (!tab) return;
    await nextTick();
    mountEditor(tab);
  },
  { immediate: true },
);

watch(
  () => workspace.activeTab.value?.content,
  (content) => {
    const tab = workspace.activeTab.value;
    if (!view || content === undefined || !tab) return;
    const cur = view.state.doc.toString();
    if (cur === content) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
    });
  },
);

watch(
  () => props.editorDark,
  (dark) => {
    if (!view) return;
    view.dispatch({
      effects: themeComp.reconfigure(dark ? oneDark : lightCmTheme),
    });
  },
);

watch(
  () =>
    [
      workspace.activeTab.value?.id,
      workspace.activeTab.value?.textDockLanguage,
      workspace.activeTab.value?.path,
    ] as const,
  () => {
    const tab = workspace.activeTab.value;
    if (!view || !tab || props.bodyFolded) return;
    const langId = resolveLanguageId(tab.path, tab.textDockLanguage);
    view.dispatch({ effects: langComp.reconfigure(getLanguageExtension(langId)) });
  },
);

watch(
  () => workspace.activeTab.value?.textDockLineWrap,
  () => {
    const tab = workspace.activeTab.value;
    if (!view || !tab || props.bodyFolded) return;
    const on = tab.textDockLineWrap === true;
    view.dispatch({
      effects: lineWrapComp.reconfigure(on ? EditorView.lineWrapping : []),
    });
  },
);

const textMeta = computed(() => {
  const tab = workspace.activeTab.value;
  if (!tab) return null;
  return analyzeTextContent(tab.content);
});

function formatLineEnding(meta: TextFileMetaRaw): string {
  const mm = m.value;
  if (meta.lineEndingKey === 'mixed') {
    return mm.textDockLeMixedDetail
      .replace('{crlf}', String(meta.crlf))
      .replace('{lf}', String(meta.lf))
      .replace('{cr}', String(meta.cr));
  }
  const map: Record<TextFileMetaRaw['lineEndingKey'], string> = {
    crlf: mm.textDockLeCrlf,
    lf: mm.textDockLeLf,
    cr: mm.textDockLeCr,
    mixed: mm.textDockLeMixed,
    none: mm.textDockLeNone,
  };
  return map[meta.lineEndingKey];
}

function formatIndent(meta: TextFileMetaRaw): string {
  const mm = m.value;
  switch (meta.indentKey) {
    case 'tab':
      return mm.textDockIndentTab;
    case 'space2':
      return mm.textDockIndentSpace2;
    case 'space4':
      return mm.textDockIndentSpace4;
    case 'mixed':
      return mm.textDockIndentMixed;
    default:
      return mm.textDockIndentUnknown;
  }
}

function encodingLabel(meta: TextFileMetaRaw): string {
  const mm = m.value;
  return meta.encodingKey === 'utf8bom' ? mm.textDockEncUtf8Bom : mm.textDockEncUtf8;
}

const languageSelectOptions = computed(() => {
  const mm = m.value;
  return [
    { value: 'auto', label: mm.textDockLangAuto },
    { value: 'plain', label: mm.textDockLangPlain },
    { value: 'markdown', label: mm.textDockLangMarkdown },
    { value: 'javascript', label: mm.textDockLangJavaScript },
    { value: 'typescript', label: mm.textDockLangTypeScript },
    { value: 'tsx', label: mm.textDockLangTSX },
    { value: 'jsx', label: mm.textDockLangJSX },
    { value: 'json', label: mm.textDockLangJSON },
    { value: 'yaml', label: mm.textDockLangYAML },
    { value: 'cpp', label: mm.textDockLangCpp },
    { value: 'python', label: mm.textDockLangPython },
    { value: 'xml', label: mm.textDockLangXML },
    { value: 'css', label: mm.textDockLangCSS },
    { value: 'html', label: mm.textDockLangHTML },
    { value: 'vue', label: mm.textDockLangVue },
  ];
});

const resolvedLangLabel = computed(() => {
  const tab = workspace.activeTab.value;
  if (!tab) return '';
  const mm = m.value;
  const id = resolveLanguageId(tab.path, tab.textDockLanguage);
  const map: Record<TextDockLanguageId, string> = {
    plain: mm.textDockLangPlain,
    markdown: mm.textDockLangMarkdown,
    javascript: mm.textDockLangJavaScript,
    typescript: mm.textDockLangTypeScript,
    tsx: mm.textDockLangTSX,
    jsx: mm.textDockLangJSX,
    json: mm.textDockLangJSON,
    yaml: mm.textDockLangYAML,
    cpp: mm.textDockLangCpp,
    python: mm.textDockLangPython,
    xml: mm.textDockLangXML,
    css: mm.textDockLangCSS,
    html: mm.textDockLangHTML,
    vue: mm.textDockLangVue,
  };
  return map[id] ?? id;
});

function onLanguageChange(e: Event) {
  const tab = workspace.activeTab.value;
  if (!tab) return;
  const v = (e.target as HTMLSelectElement).value;
  workspace.setTextDockLanguage(tab.id, v === 'auto' ? null : v);
  if (view) {
    const langId = resolveLanguageId(tab.path, v === 'auto' ? null : v);
    view.dispatch({ effects: langComp.reconfigure(getLanguageExtension(langId)) });
  }
}

function onLineWrapChange(e: Event) {
  const tab = workspace.activeTab.value;
  if (!tab) return;
  workspace.setTextDockLineWrap(tab.id, (e.target as HTMLInputElement).checked);
}

function langSelectValue(tab: Tab): string {
  return tab.textDockLanguage == null || tab.textDockLanguage === '' ? 'auto' : tab.textDockLanguage;
}

function toggleBody() {
  emit('update:bodyFolded', !props.bodyFolded);
}

onUnmounted(() => {
  destroyCm();
});
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
      <div v-show="!bodyFolded" class="text-dock__chrome">
        <div class="text-dock__toolbar">
          <label class="text-dock__lang-label">
            <span>{{ m.textDockSyntaxLang }}</span>
            <select
              class="text-dock__lang-select"
              :value="langSelectValue(workspace.activeTab.value)"
              :aria-label="m.textDockSyntaxLang"
              @change="onLanguageChange"
            >
              <option v-for="opt in languageSelectOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </label>
          <span class="text-dock__resolved" :title="m.textDockSyntaxLang">
            → {{ resolvedLangLabel }}
          </span>
          <label class="text-dock__wrap-label">
            <input
              type="checkbox"
              class="text-dock__wrap-input"
              :checked="workspace.activeTab.value?.textDockLineWrap === true"
              :title="`${m.textDockLineWrap} — 无全局快捷键`"
              @change="onLineWrapChange"
            />
            <span>{{ m.textDockLineWrap }}</span>
          </label>
        </div>
        <div v-if="textMeta" class="text-dock__meta" role="status">
          <span class="text-dock__meta-item">
            {{ m.propsEncoding }}: {{ encodingLabel(textMeta) }}（{{ m.textDockMetaInferred }}）
          </span>
          <span class="text-dock__meta-sep" aria-hidden="true">·</span>
          <span class="text-dock__meta-item"> {{ m.textDockMetaEOL }}: {{ formatLineEnding(textMeta) }}（{{ m.textDockMetaInferred }}） </span>
          <span class="text-dock__meta-sep" aria-hidden="true">·</span>
          <span class="text-dock__meta-item"> {{ m.textDockMetaIndent }}: {{ formatIndent(textMeta) }}（{{ m.textDockMetaInferred }}） </span>
          <span class="text-dock__meta-sep" aria-hidden="true">·</span>
          <span class="text-dock__meta-item"> {{ m.textDockMetaEndian }}: {{ m.textDockEndianNa }} </span>
        </div>
        <div ref="cmHost" class="text-dock__cm" />
      </div>
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
.text-dock__chrome {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
}
.text-dock__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 6px;
  font-size: 0.68rem;
  border-bottom: 1px solid var(--border, #ddd);
  background: var(--editor-bg, #fff);
}
.text-dock__lang-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.text-dock__lang-select {
  max-width: 160px;
  font: inherit;
  font-size: 0.68rem;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
  color: inherit;
}
.text-dock__resolved {
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.text-dock__wrap-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  margin-left: auto;
}
.text-dock__wrap-input {
  margin: 0;
  cursor: pointer;
}
.text-dock__meta {
  flex-shrink: 0;
  padding: 2px 6px 4px;
  font-size: 0.62rem;
  line-height: 1.35;
  opacity: 0.9;
  border-bottom: 1px solid var(--border, #eee);
  word-break: break-word;
}
.text-dock__meta-sep {
  margin: 0 3px;
  opacity: 0.5;
}
.text-dock__cm {
  flex: 1;
  min-height: 60px;
  min-width: 0;
  overflow: hidden;
}
.text-dock__cm :deep(.cm-editor) {
  height: 100%;
}
.text-dock__cm :deep(.cm-scroller) {
  overflow: auto;
}
.text-dock__empty {
  margin: 0;
  padding: 8px;
  font-size: 0.78rem;
  opacity: 0.75;
}
</style>
