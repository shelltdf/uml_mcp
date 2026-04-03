<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import EditorTabs from './components/EditorTabs.vue';
import MermaidPreview from './components/MermaidPreview.vue';
import { getMessages, LOCALE_OPTIONS, type LocaleId } from './i18n/ui';
import { parseUmlSyncMarkdown } from './lib/formats';
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

const syncInfo = computed(() => {
  const tab = workspace.activeTab.value;
  if (!tab || tab.kind !== 'sync') return null;
  return parseUmlSyncMarkdown(tab.content);
});

const logLines = ref<string[]>([]);
function pushLog(line: string) {
  logLines.value = [...logLines.value.slice(-200), `[${new Date().toLocaleTimeString()}] ${line}`];
}
const logOpen = ref(false);

const helpOpen = ref(false);
const aboutOpen = ref(false);
const formatsOpen = ref(false);

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

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'F1') {
    e.preventDefault();
    openHelp();
  }
}

const activeTab = workspace.activeTab;

function copyLog() {
  const text = logLines.value.length ? logLines.value.join('\n') : msg.value.logEmptyPlaceholder;
  void window.navigator.clipboard.writeText(text);
}

const openMenu = ref<null | 'file' | 'theme' | 'lang' | 'help'>(null);
const menuBarRef = ref<HTMLElement | null>(null);

function closeMenus() {
  openMenu.value = null;
}

function toggleMenu(id: 'file' | 'theme' | 'lang' | 'help') {
  openMenu.value = openMenu.value === id ? null : id;
}

function onDocPointerDown(ev: PointerEvent) {
  const bar = menuBarRef.value;
  if (!bar || openMenu.value === null) return;
  if (!bar.contains(ev.target as Node)) {
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
    <header class="window-chrome">
      <div id="title-strip" class="title-strip" role="banner">
        <img class="title-icon" src="/favicon.svg" width="22" height="22" alt="" />
        <span class="app-title">{{ msg.titleStrip }}</span>
      </div>
      <nav
        id="menu-bar"
        ref="menuBarRef"
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
    </header>

    <main class="main">
      <section class="pane editor-pane">
        <EditorTabs :locale="locale" />
      </section>
      <section class="pane preview-pane">
        <div v-if="syncInfo?.config" class="sync-panel">
          <h3>{{ msg.syncSummary }}</h3>
          <ul>
            <li><strong>{{ msg.umlRoot }}:</strong> {{ syncInfo.config.uml_root }}</li>
            <li>
              <strong>{{ msg.namespaces }}:</strong>
              {{ syncInfo.config.namespace_dirs.join(', ') || '—' }}
            </li>
            <li>
              <strong>{{ msg.codeRoots }}:</strong>
              {{ syncInfo.config.code_roots.join(', ') || '—' }}
            </li>
          </ul>
        </div>
        <MermaidPreview v-if="activeTab" :markdown="activeTab.content" :kind="activeTab.kind" />
      </section>
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
  gap: 10px;
  padding: 8px 14px;
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
  font-size: 1.05rem;
  user-select: none;
}

.menu-bar {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0;
  padding: 2px 6px;
  background: var(--tab-bg, #e8e8ea);
  border-bottom: 1px solid var(--border, #ccc);
}

.menu-item {
  position: relative;
}

.menu-heading {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
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
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
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

.main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 0;
}
@media (max-width: 900px) {
  .main {
    grid-template-columns: 1fr;
  }
}
.pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.editor-pane {
  border-right: 1px solid var(--border, #ccc);
}
.preview-pane {
  background: var(--panel-bg, #fafafa);
}
.sync-panel {
  padding: 8px 12px;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border, #ddd);
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
  gap: 12px;
  padding: 6px 12px;
  font-size: 0.85rem;
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
