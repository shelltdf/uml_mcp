<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import DiagramThumbnail from './components/DiagramThumbnail.vue';
import EditorTabs from './components/EditorTabs.vue';
import FileKindCanvas from './components/FileKindCanvas.vue';
import MermaidPreview from './components/MermaidPreview.vue';
import TextContentDock from './components/TextContentDock.vue';
import { DIAGRAM_TYPES, NEW_SYNC_CARD, type DiagramTypeId } from './lib/diagramTemplates';
import { getMessages, LOCALE_OPTIONS, type LocaleId } from './i18n/ui';
import { getSyncPanelModel } from './lib/formats';
import { workspace } from './stores/workspace';
import { APP_VERSION } from './version';

const anyDirty = workspace.anyDirty;

const theme = ref<'system' | 'light' | 'dark'>('system');
const locale = ref<LocaleId>('zh');

const msg = computed(() => getMessages(locale.value));

function applyTheme() {
  const root = document.documentElement;
  let dark = false;
  if (theme.value === 'dark') dark = true;
  else if (theme.value === 'light') dark = false;
  else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'dark' : 'light';
}

watch(theme, applyTheme, { immediate: true });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (theme.value === 'system') applyTheme();
});

function setTheme(v: 'system' | 'light' | 'dark') {
  theme.value = v;
}

watch(
  locale,
  (loc) => {
    document.documentElement.lang = loc === 'zh' ? 'zh-CN' : 'en';
  },
  { immediate: true },
);

watch(
  [anyDirty, locale],
  () => {
    const m = getMessages(locale.value);
    document.title = anyDirty.value ? `${m.docTitle} ·` : m.docTitle;
  },
  { immediate: true },
);

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (anyDirty.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}

/** 当前为 uml.sync 标签时，右侧展示完整「同步配置」解析结果 */
const syncPanel = computed(() => {
  const tab = workspace.activeTab.value;
  if (!tab || tab.kind !== 'sync') return null;
  return getSyncPanelModel(tab.content);
});

const logLines = ref<string[]>([]);
function pushLog(line: string) {
  logLines.value = [...logLines.value.slice(-200), `[${new Date().toLocaleTimeString()}] ${line}`];
}
const logOpen = ref(false);

const helpOpen = ref(false);
const aboutOpen = ref(false);
const formatsOpen = ref(false);
const newDiagramOpen = ref(false);

function openHelp() {
  aboutOpen.value = false;
  formatsOpen.value = false;
  helpOpen.value = true;
  closeMenus();
}

function openAbout() {
  helpOpen.value = false;
  formatsOpen.value = false;
  aboutOpen.value = true;
  closeMenus();
}

function openFormats() {
  helpOpen.value = false;
  aboutOpen.value = false;
  formatsOpen.value = true;
  closeMenus();
}

function openNewDiagramModal() {
  closeMenus();
  newDiagramOpen.value = true;
}

function pickNewDiagram(id: DiagramTypeId) {
  workspace.newUmlDiagram(id);
  newDiagramOpen.value = false;
  pushLog(`new diagram: ${id}`);
}

function pickNewSyncFromModal() {
  workspace.newSyncConfig();
  newDiagramOpen.value = false;
  pushLog('new uml.sync (from new dialog)');
}

async function runOpenFile() {
  closeMenus();
  const ok = await workspace.openFileFromDisk('any');
  if (ok) pushLog('open file');
}

async function runSaveFile() {
  closeMenus();
  const r = await workspace.saveActive();
  if (r === 'ok') pushLog('save');
}

async function runSaveAs() {
  closeMenus();
  const ok = await workspace.saveActiveAs();
  if (ok) pushLog('save as');
}

async function runSaveAll() {
  closeMenus();
  const r = await workspace.saveAll();
  if (r.written > 0) pushLog(`save all: ${r.written}`);
  if (r.failed > 0) pushLog(`save all failed: ${r.failed}`);
  const m = msg.value;
  const parts: string[] = [];
  if (r.written > 0) parts.push(m.saveAllDone.replace(/\{n\}/g, String(r.written)));
  if (r.skippedNoHandle > 0) parts.push(m.saveAllSkipped.replace(/\{m\}/g, String(r.skippedNoHandle)));
  if (parts.length === 0) window.alert(m.saveAllNone);
  else window.alert(parts.join('\n'));
}

function runRevert() {
  closeMenus();
  const m = msg.value;
  const tab = workspace.activeTab.value;
  if (!tab) return;
  if (!window.confirm(m.confirmRevert)) return;
  if (workspace.revertActive()) pushLog('revert');
}

const textDockCollapsed = ref(false);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'F1') {
    e.preventDefault();
    openHelp();
    return;
  }
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (e.shiftKey) void runSaveAs();
    else void runSaveFile();
    return;
  }
  if (mod && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    void runOpenFile();
    return;
  }
  if (mod && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    openNewDiagramModal();
  }
}

const activeTab = workspace.activeTab;

function copyLog() {
  const text = logLines.value.length ? logLines.value.join('\n') : msg.value.logEmptyPlaceholder;
  void window.navigator.clipboard.writeText(text);
}

const openMenu = ref<null | 'file' | 'theme' | 'lang' | 'help'>(null);
const chromeRef = ref<HTMLElement | null>(null);

function closeMenus() {
  openMenu.value = null;
}

function toggleMenu(id: 'file' | 'theme' | 'lang' | 'help') {
  openMenu.value = openMenu.value === id ? null : id;
}

function onDocPointerDown(ev: PointerEvent) {
  const chrome = chromeRef.value;
  if (!chrome || openMenu.value === null) return;
  if (!chrome.contains(ev.target as Node)) {
    openMenu.value = null;
  }
}

function runResetDemo() {
  const m = msg.value;
  if (anyDirty.value && !window.confirm(m.confirmReset)) {
    closeMenus();
    return;
  }
  workspace.resetDemo();
  pushLog('reset demo');
  closeMenus();
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('beforeunload', onBeforeUnload);
});
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true);
  window.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('beforeunload', onBeforeUnload);
});
</script>

<template>
  <div class="app">
    <header ref="chromeRef" class="window-chrome">
      <div id="title-strip" class="title-strip" role="banner">
        <img class="title-icon" src="/favicon.svg" width="20" height="20" alt="" />
        <span class="app-title">{{ msg.titleStrip }}</span>
      </div>
      <nav
        id="menu-bar"
        class="menu-bar"
        role="menubar"
        :aria-label="locale === 'zh' ? '主菜单' : 'Main menu'"
      >
        <div class="menu-item">
          <button
            type="button"
            class="menu-heading"
            role="menuitem"
            :aria-expanded="openMenu === 'file'"
            :title="`${msg.file} — 无全局快捷键`"
            @click="toggleMenu('file')"
          >
            {{ msg.file }}
          </button>
          <ul v-show="openMenu === 'file'" class="menu-dropdown" role="menu" @click.stop>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                :title="`${msg.fileNew} — Ctrl+N`"
                @click="openNewDiagramModal"
              >
                {{ msg.fileNew }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                :title="`${msg.fileOpen} — Ctrl+O`"
                @click="runOpenFile"
              >
                {{ msg.fileOpen }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                :title="`${msg.fileSave} — Ctrl+S`"
                @click="runSaveFile"
              >
                {{ msg.fileSave }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                :title="`${msg.fileSaveAll} — 无全局快捷键`"
                @click="runSaveAll"
              >
                {{ msg.fileSaveAll }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                :title="`${msg.fileSaveAs} — Ctrl+Shift+S`"
                @click="runSaveAs"
              >
                {{ msg.fileSaveAs }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                :title="`${msg.fileRevert} — 无全局快捷键`"
                @click="runRevert"
              >
                {{ msg.fileRevert }}
              </button>
            </li>
            <li class="menu-sep" role="separator" />
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                title="重置示例 — 无全局快捷键"
                @click="runResetDemo"
              >
                {{ msg.resetDemo }}
              </button>
            </li>
          </ul>
        </div>

        <div class="menu-item">
          <button
            type="button"
            class="menu-heading"
            role="menuitem"
            :aria-expanded="openMenu === 'lang'"
            :title="`${msg.langMenu} — 无全局快捷键`"
            @click="toggleMenu('lang')"
          >
            {{ msg.langMenu }}
          </button>
          <ul v-show="openMenu === 'lang'" class="menu-dropdown" role="menu" @click.stop>
            <li v-for="opt in LOCALE_OPTIONS" :key="opt.id">
              <button
                type="button"
                class="menu-entry menu-entry--row"
                role="menuitem"
                :title="`${opt.label} — 无全局快捷键`"
                @click="
                  locale = opt.id;
                  closeMenus();
                "
              >
                <span class="check" aria-hidden="true">{{ locale === opt.id ? '✓' : '' }}</span>
                {{ opt.label }}
              </button>
            </li>
          </ul>
        </div>

        <div class="menu-item">
          <button
            type="button"
            class="menu-heading"
            role="menuitem"
            :aria-expanded="openMenu === 'theme'"
            :title="`${msg.themeMenu} — 无全局快捷键`"
            @click="toggleMenu('theme')"
          >
            {{ msg.themeMenu }}
          </button>
          <ul v-show="openMenu === 'theme'" class="menu-dropdown" role="menu" @click.stop>
            <li>
              <button
                type="button"
                class="menu-entry menu-entry--row"
                role="menuitem"
                title="跟随系统 — 无全局快捷键"
                @click="
                  setTheme('system');
                  closeMenus();
                "
              >
                <span class="check" aria-hidden="true">{{ theme === 'system' ? '✓' : '' }}</span>
                {{ msg.themeSystem }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="menu-entry menu-entry--row"
                role="menuitem"
                title="浅色 — 无全局快捷键"
                @click="
                  setTheme('light');
                  closeMenus();
                "
              >
                <span class="check" aria-hidden="true">{{ theme === 'light' ? '✓' : '' }}</span>
                {{ msg.themeLight }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="menu-entry menu-entry--row"
                role="menuitem"
                title="深色 — 无全局快捷键"
                @click="
                  setTheme('dark');
                  closeMenus();
                "
              >
                <span class="check" aria-hidden="true">{{ theme === 'dark' ? '✓' : '' }}</span>
                {{ msg.themeDark }}
              </button>
            </li>
          </ul>
        </div>

        <div class="menu-item">
          <button
            type="button"
            class="menu-heading"
            role="menuitem"
            :aria-expanded="openMenu === 'help'"
            :title="`${msg.helpMenu} — 无全局快捷键`"
            @click="toggleMenu('help')"
          >
            {{ msg.helpMenu }}
          </button>
          <ul v-show="openMenu === 'help'" class="menu-dropdown" role="menu" @click.stop>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                :title="`F1 — ${msg.helpInfo}`"
                @click="openHelp"
              >
                {{ msg.helpInfo }} ({{ msg.helpInfoF1Hint }})
              </button>
            </li>
            <li>
              <button type="button" class="menu-entry" role="menuitem" @click="openFormats">
                {{ msg.fileFormats }}
              </button>
            </li>
            <li>
              <button type="button" class="menu-entry" role="menuitem" @click="openAbout">
                {{ msg.about }}
              </button>
            </li>
          </ul>
        </div>
      </nav>
      <div
        class="toolbar"
        role="toolbar"
        :aria-label="msg.toolbarAriaLabel"
      >
        <button type="button" class="tb-btn" :title="`${msg.toolbarNew} — Ctrl+N`" @click="openNewDiagramModal">
          {{ msg.toolbarNew }}
        </button>
        <span class="tb-sep" aria-hidden="true" />
        <button type="button" class="tb-btn" :title="`${msg.toolbarOpen} — Ctrl+O`" @click="runOpenFile">
          {{ msg.toolbarOpen }}
        </button>
        <span class="tb-sep" aria-hidden="true" />
        <button type="button" class="tb-btn" :title="`${msg.toolbarSave} — Ctrl+S`" @click="runSaveFile">
          {{ msg.toolbarSave }}
        </button>
        <button type="button" class="tb-btn" :title="`${msg.toolbarSaveAll} — 无全局快捷键`" @click="runSaveAll">
          {{ msg.toolbarSaveAll }}
        </button>
        <button type="button" class="tb-btn" :title="`${msg.toolbarSaveAs} — Ctrl+Shift+S`" @click="runSaveAs">
          {{ msg.toolbarSaveAs }}
        </button>
        <span class="tb-sep" aria-hidden="true" />
        <button type="button" class="tb-btn" :title="`${msg.toolbarRevert} — 无全局快捷键`" @click="runRevert">
          {{ msg.toolbarRevert }}
        </button>
      </div>
    </header>

    <main class="main main-mdi" :class="{ 'main-mdi--dock-collapsed': textDockCollapsed }">
      <section class="workspace-mdi pane" :aria-label="msg.mdiWorkspaceLabel">
        <EditorTabs :locale="locale" />
        <div class="canvas-region" :aria-label="msg.canvasAriaLabel">
          <div v-if="syncPanel && activeTab?.kind === 'sync'" class="sync-panel sync-panel--main">
            <h3>{{ msg.syncSummary }}</h3>
            <p v-if="!syncPanel.hasYamlFrontMatter" class="sync-yaml-hint">{{ msg.syncMissingYamlHint }}</p>
            <ul>
              <li><strong>{{ msg.umlRoot }}:</strong> {{ syncPanel.config.uml_root }}</li>
              <li>
                <strong>{{ msg.namespaces }}:</strong>
                {{ syncPanel.config.namespace_dirs.join(', ') || '—' }}
              </li>
              <li>
                <strong>{{ msg.codeRoots }}:</strong>
                {{ syncPanel.config.code_roots.join(', ') || '—' }}
              </li>
              <li><strong>{{ msg.syncProfile }}:</strong> {{ syncPanel.config.sync_profile }}</li>
            </ul>
          </div>
          <MermaidPreview
            v-else-if="activeTab && activeTab.kind === 'uml'"
            :markdown="activeTab.content"
            :kind="activeTab.kind"
            :multi-block-hint="msg.canvasMultiMermaidHint"
            :reset-label="msg.canvasResetView"
            :viewport-title="msg.canvasViewportTitle"
          />
          <FileKindCanvas
            v-else-if="activeTab && activeTab.kind === 'class'"
            kind="class"
            :title="msg.canvasKindClassTitle"
            :hint="msg.canvasKindClassHint"
          />
          <FileKindCanvas
            v-else-if="activeTab && activeTab.kind === 'code'"
            kind="code"
            :title="msg.canvasKindCodeTitle"
            :hint="msg.canvasKindCodeHint"
          />
          <FileKindCanvas
            v-else-if="activeTab && activeTab.kind === 'unknown'"
            kind="unknown"
            :title="msg.canvasKindUnknownTitle"
            :hint="msg.canvasKindUnknownHint"
          />
          <div v-else class="canvas-empty">{{ msg.canvasEmptyHint }}</div>
        </div>
      </section>
      <aside class="text-dock-aside pane" :aria-label="msg.dockTextContent">
        <TextContentDock
          :locale="locale"
          :collapsed="textDockCollapsed"
          @update:collapsed="textDockCollapsed = $event"
        />
      </aside>
    </main>

    <footer
      class="statusbar"
      :title="
        anyDirty
          ? msg.statusDirty + ' — 点击查看 Log — 无全局快捷键'
          : msg.statusReady + ' — 点击查看 Log — 无全局快捷键'
      "
      @click="logOpen = !logOpen"
    >
      <span v-if="anyDirty" class="dirty">{{ msg.statusDirty }}</span>
      <span v-else>{{ msg.statusReady }}</span>
      <span v-if="activeTab" class="path">{{ activeTab.path }}</span>
    </footer>

    <div v-if="helpOpen" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="helpOpen = false">
      <div class="modal-window">
        <div class="modal-head">
          <h2 class="modal-title">{{ msg.helpPanelTitle }}</h2>
          <button type="button" class="modal-btn" @click="helpOpen = false">{{ msg.modalClose }}</button>
        </div>
        <pre class="modal-body modal-body--pre">{{ msg.helpBody }}</pre>
      </div>
    </div>

    <div v-if="formatsOpen" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="formatsOpen = false">
      <div class="modal-window">
        <div class="modal-head">
          <h2 class="modal-title">{{ msg.formatsTitle }}</h2>
          <button type="button" class="modal-btn" @click="formatsOpen = false">{{ msg.modalClose }}</button>
        </div>
        <pre class="modal-body modal-body--pre">{{ msg.formatsBody }}</pre>
      </div>
    </div>

    <div
      v-if="newDiagramOpen"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      @click.self="newDiagramOpen = false"
    >
      <div class="modal-window modal-window--wide">
        <div class="modal-head">
          <h2 class="modal-title">{{ msg.newDiagramTitle }}</h2>
          <button type="button" class="modal-btn" @click="newDiagramOpen = false">{{ msg.modalClose }}</button>
        </div>
        <p class="modal-intro">{{ msg.newDiagramHint }}</p>
        <div class="diagram-modal-body">
          <section class="diagram-section" :aria-label="msg.newDiagramSectionSync">
            <h3 class="diagram-section__title">{{ msg.newDiagramSectionSync }}</h3>
            <div class="diagram-grid diagram-grid--sync">
              <button
                type="button"
                class="diagram-card"
                :title="`${locale === 'zh' ? NEW_SYNC_CARD.labelZh : NEW_SYNC_CARD.labelEn} — 无全局快捷键`"
                @click="pickNewSyncFromModal"
              >
                <span class="diagram-card__thumb" aria-hidden="true">
                  <DiagramThumbnail :diagram-id="NEW_SYNC_CARD.id" />
                </span>
                <span class="diagram-card__text">
                  <span class="diagram-card__name">{{
                    locale === 'zh' ? NEW_SYNC_CARD.labelZh : NEW_SYNC_CARD.labelEn
                  }}</span>
                  <span class="diagram-card__id">uml.sync.md</span>
                </span>
              </button>
            </div>
          </section>
          <section class="diagram-section" :aria-label="msg.newDiagramSectionDiagrams">
            <h3 class="diagram-section__title">{{ msg.newDiagramSectionDiagrams }}</h3>
            <div class="diagram-grid">
              <button
                v-for="d in DIAGRAM_TYPES"
                :key="d.id"
                type="button"
                class="diagram-card"
                :title="`${locale === 'zh' ? d.labelZh : d.labelEn} — 无全局快捷键`"
                @click="pickNewDiagram(d.id)"
              >
                <span class="diagram-card__thumb" aria-hidden="true">
                  <DiagramThumbnail :diagram-id="d.id" />
                </span>
                <span class="diagram-card__text">
                  <span class="diagram-card__name">{{ locale === 'zh' ? d.labelZh : d.labelEn }}</span>
                  <span class="diagram-card__id">{{ d.id }}</span>
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div v-if="aboutOpen" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="aboutOpen = false">
      <div class="modal-window modal-window--about">
        <div class="modal-head">
          <img src="/favicon.svg" width="40" height="40" alt="" class="about-icon" />
          <div>
            <h2 class="modal-title">{{ msg.aboutTitle }}</h2>
            <p class="about-ver">v{{ APP_VERSION }}</p>
          </div>
          <button type="button" class="modal-btn" @click="aboutOpen = false">{{ msg.modalClose }}</button>
        </div>
        <p class="modal-body">{{ msg.aboutBody }}</p>
      </div>
    </div>

    <div v-if="logOpen" class="log-backdrop" @click.self="logOpen = false">
      <div class="log-window">
        <div class="log-head">
          <span>{{ msg.logTitle }}</span>
          <button type="button" :title="`${msg.logCopy} — 无全局快捷键`" @click="copyLog">{{ msg.logCopy }}</button>
          <button type="button" @click="logOpen = false">{{ msg.logClose }}</button>
        </div>
        <pre class="log-body">{{ logLines.length ? logLines.join('\n') : msg.logEmptyPlaceholder }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--fg, #1a1a1a);
  background: var(--bg, #f4f4f5);
}
:root[data-theme='dark'] .app {
  --fg: #e8e8ea;
  --bg: #121214;
  --tab-bg: #2a2a2e;
  --border: #444;
  --tab-active: #1e1e22;
  --editor-bg: #1e1e22;
  --panel-bg: #1a1a1c;
  --menu-hover: rgba(255, 255, 255, 0.08);
}
.app {
  --menu-hover: rgba(0, 0, 0, 0.06);
}

.window-chrome {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex-shrink: 0;
}

.title-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--chrome-title, #dfe1e6);
  border-bottom: 1px solid var(--border, #bbb);
}
:root[data-theme='dark'] .title-strip {
  --chrome-title: #2d2d32;
}

.title-icon {
  flex-shrink: 0;
  display: block;
}

.app-title {
  font-weight: 600;
  font-size: 0.95rem;
  user-select: none;
}

.menu-bar {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0;
  padding: 1px 4px;
  background: var(--tab-bg, #e8e8ea);
  border-bottom: 1px solid var(--border, #ccc);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  background: var(--tab-bg, #e8e8ea);
  border-bottom: 1px solid var(--border, #ccc);
}
.tb-btn {
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.78rem;
  cursor: default;
}
.tb-btn:hover,
.tb-btn:focus-visible {
  background: var(--menu-hover);
  outline: none;
}
.tb-sep {
  width: 1px;
  height: 14px;
  background: var(--border, #ccc);
  margin: 0 2px;
  opacity: 0.85;
}

.menu-item {
  position: relative;
}

.menu-heading {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.82rem;
  cursor: default;
}
.menu-heading:hover,
.menu-heading:focus-visible {
  background: var(--menu-hover);
  outline: none;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 40;
  min-width: 220px;
  max-height: min(70vh, 420px);
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--editor-bg, #fff);
  color: var(--fg, #111);
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.menu-entry {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}
.menu-entry--row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.check {
  display: inline-block;
  width: 1.25em;
  text-align: center;
  font-weight: 600;
}
.menu-entry:hover,
.menu-entry:focus-visible {
  background: var(--menu-hover);
  outline: none;
}

.main.main-mdi {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 36%);
}
.main.main-mdi.main-mdi--dock-collapsed {
  grid-template-columns: minmax(0, 1fr) 28px;
}
@media (max-width: 900px) {
  .main.main-mdi {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(240px, 1fr) minmax(160px, 38vh);
  }
  .main.main-mdi.main-mdi--dock-collapsed {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(240px, 1fr) 28px;
  }
  .text-dock-aside {
    border-left: none !important;
    border-top: 1px solid var(--border, #ccc);
  }
}
.pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.workspace-mdi {
  min-width: 0;
  border-right: 1px solid var(--border, #ccc);
  background: var(--panel-bg, #fafafa);
}
.text-dock-aside {
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--editor-bg, #fff);
}
.canvas-region {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg, #fafafa);
}
.canvas-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  text-align: center;
  font-size: 0.85rem;
  opacity: 0.8;
}
.sync-panel {
  padding: 8px 12px;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border, #ddd);
}
.sync-panel--main {
  flex: 1;
  overflow: auto;
  min-height: 0;
  border-bottom: none;
  padding: 10px 12px;
  font-size: 0.85rem;
}
.sync-panel--main h3 {
  font-size: 0.95rem;
}
.sync-yaml-hint {
  margin: 0 0 12px;
  padding: 10px 12px;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #bf6f00;
  background: rgba(255, 193, 7, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
}
:root[data-theme='dark'] .sync-yaml-hint {
  color: #ffb74d;
  background: rgba(255, 193, 7, 0.08);
  border-color: rgba(255, 255, 255, 0.08);
}
.sync-panel h3 {
  margin: 0 0 6px;
  font-size: 0.95rem;
}
.sync-panel ul {
  margin: 0;
  padding-left: 18px;
}

.statusbar {
  display: flex;
  gap: 8px;
  padding: 4px 10px;
  font-size: 0.8rem;
  border-top: 1px solid var(--border, #ccc);
  background: var(--tab-bg, #e8e8ea);
  cursor: pointer;
}
.statusbar .dirty {
  color: #e65100;
  font-weight: 600;
}
.path {
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 16px;
}
.modal-window--wide {
  width: min(720px, 100%);
}
.modal-intro {
  margin: 0;
  padding: 0 16px 10px;
  font-size: 0.9rem;
  opacity: 0.9;
  line-height: 1.45;
}
.diagram-modal-body {
  max-height: min(58vh, 520px);
  overflow-y: auto;
  padding-bottom: 8px;
}
.diagram-section__title {
  margin: 0 0 10px;
  padding: 0 16px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.72;
}
.diagram-section + .diagram-section {
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid var(--border, #ddd);
}
.diagram-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  padding: 0 16px 4px;
}
.diagram-grid--sync {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
.diagram-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border, #ccc);
  border-radius: 8px;
  background: var(--tab-bg, #f0f0f2);
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.diagram-card:hover,
.diagram-card:focus-visible {
  outline: 2px solid var(--border, #888);
  outline-offset: 1px;
}
.diagram-card__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--editor-bg, #fff);
  border: 1px solid var(--border, #ddd);
  color: var(--fg, #2a2a2e);
}
.diagram-card__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.diagram-card__name {
  font-weight: 600;
  font-size: 0.95rem;
}
.diagram-card__id {
  font-size: 0.78rem;
  opacity: 0.75;
  font-family: ui-monospace, monospace;
}
.menu-sep {
  height: 1px;
  margin: 4px 0;
  padding: 0;
  list-style: none;
  background: var(--border, #ccc);
  pointer-events: none;
}
.modal-window {
  width: min(520px, 100%);
  max-height: min(80vh, 640px);
  background: var(--editor-bg, #fff);
  color: var(--fg, #111);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}
.modal-window--about .modal-head {
  align-items: flex-start;
}
.about-icon {
  flex-shrink: 0;
}
.about-ver {
  margin: 4px 0 0;
  font-size: 0.9rem;
  opacity: 0.85;
}
.modal-head {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border, #ccc);
  align-items: center;
  flex-wrap: wrap;
}
.modal-title {
  margin: 0;
  font-size: 1.1rem;
  flex: 1;
  min-width: 0;
}
.modal-btn {
  font: inherit;
  padding: 4px 10px;
  cursor: pointer;
}
.modal-body {
  margin: 0;
  padding: 14px 16px;
  font-size: 0.92rem;
  line-height: 1.5;
  overflow: auto;
}
.modal-body--pre {
  margin: 0;
  padding: 14px 16px;
  white-space: pre-wrap;
  font-family: ui-monospace, monospace;
  font-size: 0.88rem;
  line-height: 1.45;
  flex: 1;
  overflow: auto;
}

.log-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}
.log-window {
  width: min(720px, 100%);
  min-height: 320px;
  max-height: 80vh;
  background: var(--editor-bg, #fff);
  color: var(--fg, #111);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.log-head {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border, #ccc);
  align-items: center;
  flex-shrink: 0;
}
.log-body {
  margin: 0;
  padding: 14px 16px;
  overflow: auto;
  flex: 1;
  min-height: 240px;
  white-space: pre-wrap;
  font-size: 0.85rem;
  line-height: 1.5;
}
</style>
