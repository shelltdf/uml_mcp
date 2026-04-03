<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import EditorTabs from './components/EditorTabs.vue';
import MermaidPreview from './components/MermaidPreview.vue';
import { parseUmlSyncMarkdown } from './lib/formats';
import { workspace } from './stores/workspace';

const theme = ref<'system' | 'light' | 'dark'>('system');
const lang = ref<'zh' | 'en'>('zh');

const messages = {
  zh: {
    title: 'UML Markdown 工作台',
    file: '文件',
    resetDemo: '重置示例',
    view: '视图',
    theme: '主题',
    themeCycle: '循环切换：system → light → dark',
    lang: '语言',
    langToggle: '中文 / English',
    help: '帮助',
    helpText: '使用 uml.sync.md 配置目录与规则；*.uml.md 中用 mermaid 代码块绘制 UML。',
    statusReady: '就绪',
    syncSummary: '同步配置',
    umlRoot: 'UML 根',
    codeRoots: '代码根',
    namespaces: '命名空间目录',
  },
  en: {
    title: 'UML Markdown Workbench',
    file: 'File',
    resetDemo: 'Reset demo',
    view: 'View',
    theme: 'Theme',
    themeCycle: 'Cycle: system → light → dark',
    lang: 'Language',
    langToggle: '中文 / English',
    help: 'Help',
    helpText: 'Configure paths and rules in uml.sync.md; use fenced mermaid blocks in *.uml.md.',
    statusReady: 'Ready',
    syncSummary: 'Sync config',
    umlRoot: 'UML root',
    codeRoots: 'Code roots',
    namespaces: 'Namespace dirs',
  },
} as const;

const t = computed(() => messages[lang.value]);

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

const syncInfo = computed(() => {
  const tab = workspace.activeTab.value;
  if (!tab || tab.kind !== 'sync') return null;
  return parseUmlSyncMarkdown(tab.content);
});

function cycleTheme() {
  const order: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
  const i = order.indexOf(theme.value);
  theme.value = order[(i + 1) % order.length];
}

function toggleLang() {
  lang.value = lang.value === 'zh' ? 'en' : 'zh';
}

const logLines = ref<string[]>([]);
function pushLog(line: string) {
  logLines.value = [...logLines.value.slice(-200), `[${new Date().toLocaleTimeString()}] ${line}`];
}
const logOpen = ref(false);

const activeTab = workspace.activeTab;

function copyLog() {
  void window.navigator.clipboard.writeText(logLines.value.join('\n'));
}

/** 顶层菜单：与标题条分行，符合 window-gui-documentation「菜单栏在标题栏下方」 */
const openMenu = ref<null | 'file' | 'view' | 'lang' | 'help'>(null);
const menuBarRef = ref<HTMLElement | null>(null);

function closeMenus() {
  openMenu.value = null;
}

function toggleMenu(id: 'file' | 'view' | 'lang' | 'help') {
  openMenu.value = openMenu.value === id ? null : id;
}

function onDocPointerDown(ev: PointerEvent) {
  const bar = menuBarRef.value;
  if (!bar || openMenu.value === null) return;
  if (!bar.contains(ev.target as Node)) {
    openMenu.value = null;
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true);
});
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true);
});
</script>

<template>
  <div class="app" :lang="lang">
    <header class="window-chrome">
      <div id="title-strip" class="title-strip" role="banner">
        <span class="app-title">{{ t.title }}</span>
      </div>
      <nav
        id="menu-bar"
        ref="menuBarRef"
        class="menu-bar"
        role="menubar"
        :aria-label="lang === 'zh' ? '主菜单' : 'Main menu'"
      >
        <div class="menu-item">
          <button
            type="button"
            class="menu-heading"
            role="menuitem"
            :aria-expanded="openMenu === 'file'"
            :title="`${t.file} — 无全局快捷键`"
            @click="toggleMenu('file')"
          >
            {{ t.file }}
          </button>
          <ul v-show="openMenu === 'file'" class="menu-dropdown" role="menu" @click.stop>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                title="重置示例 — 无全局快捷键"
                @click="
                  workspace.resetDemo();
                  pushLog('reset demo');
                  closeMenus();
                "
              >
                {{ t.resetDemo }}
              </button>
            </li>
          </ul>
        </div>
        <div class="menu-item">
          <button
            type="button"
            class="menu-heading"
            role="menuitem"
            :aria-expanded="openMenu === 'view'"
            :title="`${t.view} — 无全局快捷键`"
            @click="toggleMenu('view')"
          >
            {{ t.view }}
          </button>
          <ul v-show="openMenu === 'view'" class="menu-dropdown" role="menu" @click.stop>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                :title="`${t.theme} — 无全局快捷键`"
                @click="
                  cycleTheme();
                  closeMenus();
                "
              >
                {{ t.theme }} ({{ theme }})
              </button>
            </li>
            <li class="menu-hint">{{ t.themeCycle }}</li>
          </ul>
        </div>
        <div class="menu-item">
          <button
            type="button"
            class="menu-heading"
            role="menuitem"
            :aria-expanded="openMenu === 'lang'"
            :title="`${t.lang} — 无全局快捷键`"
            @click="toggleMenu('lang')"
          >
            {{ t.lang }}
          </button>
          <ul v-show="openMenu === 'lang'" class="menu-dropdown" role="menu" @click.stop>
            <li>
              <button
                type="button"
                class="menu-entry"
                role="menuitem"
                title="中/English — 无全局快捷键"
                @click="
                  toggleLang();
                  closeMenus();
                "
              >
                {{ t.langToggle }}
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
            :title="`${t.help} — 无全局快捷键`"
            @click="toggleMenu('help')"
          >
            {{ t.help }}
          </button>
          <div v-show="openMenu === 'help'" class="menu-dropdown menu-dropdown--text" role="presentation" @click.stop>
            <p class="help-blurb">{{ t.helpText }}</p>
          </div>
        </div>
      </nav>
    </header>

    <main class="main">
      <section class="pane editor-pane">
        <EditorTabs />
      </section>
      <section class="pane preview-pane">
        <div v-if="syncInfo?.config" class="sync-panel">
          <h3>{{ t.syncSummary }}</h3>
          <ul>
            <li><strong>{{ t.umlRoot }}:</strong> {{ syncInfo.config.uml_root }}</li>
            <li>
              <strong>{{ t.namespaces }}:</strong>
              {{ syncInfo.config.namespace_dirs.join(', ') || '—' }}
            </li>
            <li>
              <strong>{{ t.codeRoots }}:</strong>
              {{ syncInfo.config.code_roots.join(', ') || '—' }}
            </li>
          </ul>
        </div>
        <MermaidPreview v-if="activeTab" :markdown="activeTab.content" :kind="activeTab.kind" />
      </section>
    </main>

    <footer class="statusbar" title="点击查看 Log — 无全局快捷键" @click="logOpen = !logOpen">
      <span>{{ t.statusReady }}</span>
      <span v-if="activeTab" class="path">{{ activeTab.path }}</span>
    </footer>

    <div v-if="logOpen" class="log-backdrop" @click.self="logOpen = false">
      <div class="log-window">
        <div class="log-head">
          <span>Log</span>
          <button type="button" title="复制全文 — 无全局快捷键" @click="copyLog">复制</button>
          <button type="button" @click="logOpen = false">关闭</button>
        </div>
        <pre class="log-body">{{ logLines.join('\n') || '(empty)' }}</pre>
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
  --menu-hover: rgba(0, 0, 0, 0.06);
}
:root[data-theme='light'] .app,
.app {
  --menu-hover: rgba(0, 0, 0, 0.06);
}
:root[data-theme='dark'] .app {
  --menu-hover: rgba(255, 255, 255, 0.08);
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
  padding: 8px 14px;
  background: var(--chrome-title, #dfe1e6);
  border-bottom: 1px solid var(--border, #bbb);
}
:root[data-theme='dark'] .title-strip {
  --chrome-title: #2d2d32;
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
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--editor-bg, #fff);
  color: var(--fg, #111);
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.menu-dropdown--text {
  padding: 10px 12px;
}

.help-blurb {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  max-width: 320px;
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
.menu-entry:hover,
.menu-entry:focus-visible {
  background: var(--menu-hover);
  outline: none;
}

.menu-hint {
  padding: 6px 14px 8px;
  font-size: 0.8rem;
  opacity: 0.75;
  list-style: none;
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
.path {
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.log-window {
  width: min(720px, 92vw);
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
}
.log-body {
  margin: 0;
  padding: 12px;
  overflow: auto;
  flex: 1;
  white-space: pre-wrap;
  font-size: 0.85rem;
}
</style>
