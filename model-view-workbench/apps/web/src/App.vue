<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  parseMarkdownBlocks,
  replaceBlockInnerById,
  type MvModelPayload,
  type MvViewPayload,
  type ParsedFenceBlock,
} from '@mvwb/core';
import { detectShell } from './platform';

const shell = computed(() => detectShell());
const files = ref<Map<string, string>>(new Map());
const selectedPath = ref<string | null>(null);
const parseErrors = ref<string[]>([]);
const editOpen = ref(false);
const editJson = ref('');
const editBlockId = ref<string | null>(null);
const workspaceHint = ref('请用「打开文件夹」选择含 .md 的目录（浏览器）或使用 Electron / VS Code 扩展。');
const blockOnly = ref(false);
const electronApi = computed(() => (typeof window !== 'undefined' ? window.electronAPI : undefined));
const openMenu = ref<null | 'file' | 'view' | 'help'>(null);
const chromeRef = ref<HTMLElement | null>(null);
const folderInputRef = ref<HTMLInputElement | null>(null);
const logLines = ref<string[]>([]);
const logOpen = ref(false);
const lastParseErrSig = ref('');

function logLine(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const ts = new Date().toISOString().slice(11, 19);
  logLines.value = [...logLines.value, `[${ts}] [${level}] ${message}`].slice(-800);
}

function onStatusClick() {
  logOpen.value = true;
}

async function copyLogToClipboard() {
  const text = logTextPlain.value;
  try {
    await navigator.clipboard.writeText(text);
    logLine('已复制日志全文到剪贴板', 'info');
  } catch {
    window.alert('复制失败：浏览器未授予剪贴板权限或不可用。');
  }
}

const logTextPlain = computed(() => logLines.value.join('\n'));

const statusLeftText = computed(() => {
  const lines = logLines.value;
  if (!lines.length) return '就绪 — 点击查看日志';
  const last = lines[lines.length - 1]!;
  return last.length > 72 ? `${last.slice(0, 69)}…` : last;
});

function toggleMenu(id: 'file' | 'view' | 'help') {
  openMenu.value = openMenu.value === id ? null : id;
}

function closeMenus() {
  openMenu.value = null;
}

function openFolderDialog() {
  closeMenus();
  folderInputRef.value?.click();
}

function newFromMenu() {
  closeMenus();
  newMarkdownFile();
}

function saveFromMenu() {
  closeMenus();
  saveCurrentToFile();
}

async function pickFromMenu() {
  closeMenus();
  await pickWorkspaceElectron();
}

function showAbout() {
  closeMenus();
  logLine('关于：已打开对话框', 'info');
  window.alert(`MV Workbench 0.1\n\n${workspaceHint.value}`);
}

function onGlobalPointerDown(ev: PointerEvent) {
  const el = chromeRef.value;
  const t = ev.target as Node;
  if (el && !el.contains(t)) closeMenus();
}

const sortedPaths = computed(() => [...files.value.keys()].sort());

const currentContent = computed(() => {
  if (!selectedPath.value) return '';
  return files.value.get(selectedPath.value) ?? '';
});

const blocks = computed(() => {
  const src = currentContent.value;
  if (!src) return [] as ParsedFenceBlock[];
  const r = parseMarkdownBlocks(src);
  parseErrors.value = r.errors.map((e) => (e.line ? `L${e.line}: ` : '') + e.message);
  return r.blocks;
});

function selectFile(p: string) {
  selectedPath.value = p;
}

/** 标签上显示短名（路径最后一段） */
function tabLabel(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(i + 1) : path;
}

/** 关闭标签：从工作区移除；若关的是当前文档则选中右侧或左侧相邻。 */
function closeTab(path: string) {
  if (!files.value.has(path)) return;
  const keys = [...files.value.keys()].sort();
  const i = keys.indexOf(path);
  const nextMap = new Map(files.value);
  nextMap.delete(path);
  files.value = nextMap;
  if (editOpen.value && selectedPath.value === path) {
    editOpen.value = false;
  }
  if (selectedPath.value !== path) return;
  const rem = [...nextMap.keys()].sort();
  if (rem.length === 0) {
    selectedPath.value = null;
    return;
  }
  selectedPath.value = rem[i < rem.length ? i : i - 1] ?? rem[0];
}

function onPickFolder(e: Event) {
  const input = e.target as HTMLInputElement;
  const fl = input.files;
  if (!fl?.length) return;
  const next = new Map<string, string>();
  void Promise.all(
    [...fl].map(
      (f) =>
        new Promise<void>((resolve) => {
          const wf = f as File & { webkitRelativePath?: string };
          const rel = wf.webkitRelativePath ?? f.name;
          if (!rel.endsWith('.md')) {
            resolve();
            return;
          }
          const r = new FileReader();
          r.onload = () => {
            next.set(rel, String(r.result ?? ''));
            resolve();
          };
          r.readAsText(f);
        }),
    ),
  ).then(() => {
    files.value = next;
    const keys = [...next.keys()].sort();
    selectedPath.value = keys[0] ?? null;
    logLine(`已打开文件夹：${keys.length} 个 .md 文件`, 'info');
  });
  input.value = '';
}

function newMarkdownFile() {
  const base = 'untitled';
  let i = 0;
  let name = `${base}.md`;
  while (files.value.has(name)) {
    i++;
    name = `${base}-${i}.md`;
  }
  const fence = '```';
  const initial = [
    '# 新文档',
    '',
    `${fence}mv-model`,
    JSON.stringify(
      {
        id: 'example_model',
        columns: [{ name: 'id', type: 'string' }],
        rows: [{ id: '1' }],
      },
      null,
      2,
    ),
    fence,
    '',
    `${fence}mv-view`,
    JSON.stringify(
      {
        id: 'example_view',
        kind: 'table-readonly',
        modelRefs: ['example_model'],
      },
      null,
      2,
    ),
    fence,
    '',
  ].join('\n');
  files.value = new Map(files.value).set(name, initial);
  selectedPath.value = name;
  logLine(`新建文档：${name}`, 'info');
}

function saveCurrentToFile() {
  const p = selectedPath.value;
  const c = currentContent.value;
  if (!p || !c) return;
  const blob = new Blob([c], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = p.split('/').pop() ?? 'doc.md';
  a.click();
  URL.revokeObjectURL(a.href);
  logLine(`已导出：${a.download}`, 'info');
}

function openEdit(block: ParsedFenceBlock) {
  editBlockId.value = block.payload.id;
  editJson.value = JSON.stringify(block.payload, null, 2);
  editOpen.value = true;
}

function applyEdit() {
  const p = selectedPath.value;
  const id = editBlockId.value;
  if (!p || !id) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(editJson.value);
  } catch {
    return;
  }
  const cur = files.value.get(p);
  if (!cur) return;
  const nextInner = JSON.stringify(parsed, null, 2);
  const out = replaceBlockInnerById(cur, id, nextInner);
  if (!out) return;
  files.value = new Map(files.value).set(p, out);
  editOpen.value = false;
  void electronApi.value?.writeWorkspaceFile(p, out);
}

async function pickWorkspaceElectron() {
  const api = electronApi.value;
  if (!api?.pickWorkspace) return;
  const r = await api.pickWorkspace();
  if (!r?.files) return;
  files.value = new Map(Object.entries(r.files));
  const keys = [...files.value.keys()].sort();
  selectedPath.value = keys[0] ?? null;
  logLine(`Electron 工作区已加载：${keys.length} 个文件`, 'info');
}

function modelForRef(ref: string): MvModelPayload | null {
  const p = selectedPath.value;
  if (!p) return null;
  const same = files.value.get(p);
  if (!same) return null;
  const { blocks } = parseMarkdownBlocks(same);
  const m = blocks.find((b) => b.kind === 'mv-model' && b.payload.id === ref);
  return m && m.kind === 'mv-model' ? (m.payload as MvModelPayload) : null;
}

function openBlockInShell(block: ParsedFenceBlock) {
  const p = selectedPath.value;
  if (!p) return;
  if (electronApi.value?.openBlockEditor) {
    electronApi.value.openBlockEditor(p, block.payload.id);
  } else {
    openEdit(block);
  }
}

watch(selectedPath, () => {
  editOpen.value = false;
});

watch(
  () => parseErrors.value.join('\n'),
  (sig) => {
    if (!sig) {
      lastParseErrSig.value = '';
      return;
    }
    if (sig === lastParseErrSig.value) return;
    lastParseErrSig.value = sig;
    for (const line of parseErrors.value) logLine(line, 'warn');
  },
);

onMounted(async () => {
  logLine('MV Workbench 已启动', 'info');
  document.addEventListener('pointerdown', onGlobalPointerDown, true);
  const u = new URLSearchParams(window.location.search);
  const rel = u.get('path') ?? '';
  const bid = u.get('blockId') ?? '';
  if (u.get('mvwb_block') === '1' && rel && bid && electronApi.value?.readWorkspaceFile) {
    blockOnly.value = true;
    try {
      const text = await electronApi.value.readWorkspaceFile(rel);
      files.value = new Map([[rel, text]]);
      selectedPath.value = rel;
      const blk = parseMarkdownBlocks(text).blocks.find((b) => b.payload.id === bid);
      if (blk) {
        editBlockId.value = bid;
        editJson.value = JSON.stringify(blk.payload, null, 2);
        editOpen.value = true;
      }
    } catch {
      workspaceHint.value = '无法读取块文件（请先在工作区主窗口选择磁盘目录）。';
      logLine(workspaceHint.value, 'error');
    }
    return;
  }
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onGlobalPointerDown, true);
});
</script>

<template>
  <div class="layout" :class="{ blockOnly }">
    <input
      ref="folderInputRef"
      type="file"
      class="hidden"
      webkitdirectory
      directory
      multiple
      @change="onPickFolder"
    />
    <header v-if="!blockOnly" ref="chromeRef" class="win-chrome">
      <div class="title-strip">
        <span class="app-title">MV Workbench</span>
        <span class="app-title-ver">0.1</span>
      </div>
      <nav class="menu-bar" aria-label="主菜单">
        <div class="menu-entry">
          <button type="button" class="menu-top" @click.stop="toggleMenu('file')">文件(F)</button>
          <ul v-show="openMenu === 'file'" class="menu-dropdown" role="menu" @click.stop>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="openFolderDialog">打开文件夹…</button>
            </li>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="newFromMenu">新建 MD</button>
            </li>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" :disabled="!selectedPath" @click="saveFromMenu">
                导出当前…
              </button>
            </li>
            <template v-if="electronApi?.pickWorkspace">
              <li class="menu-sep" role="separator" />
              <li role="none">
                <button type="button" class="menu-item" role="menuitem" @click="pickFromMenu">打开磁盘工作区…</button>
              </li>
            </template>
          </ul>
        </div>
        <div class="menu-entry">
          <button type="button" class="menu-top" @click.stop="toggleMenu('view')">视图(V)</button>
          <ul v-show="openMenu === 'view'" class="menu-dropdown" role="menu" @click.stop>
            <li class="menu-info" role="none">文档在顶部标签栏切换；关闭标签用 ×。</li>
          </ul>
        </div>
        <div class="menu-entry">
          <button type="button" class="menu-top" @click.stop="toggleMenu('help')">帮助(H)</button>
          <ul v-show="openMenu === 'help'" class="menu-dropdown" role="menu" @click.stop>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="showAbout">关于 MV Workbench…</button>
            </li>
          </ul>
        </div>
      </nav>
      <div class="toolbar-row" aria-label="工具栏">
        <button type="button" class="tb-btn" title="打开文件夹 — 无全局快捷键" @click="openFolderDialog">打开文件夹</button>
        <span class="tb-sep" aria-hidden="true" />
        <button type="button" class="tb-btn" title="新建 MD — 无全局快捷键" @click="newMarkdownFile">新建 MD</button>
        <button
          type="button"
          class="tb-btn"
          :disabled="!selectedPath"
          title="导出当前 — 无全局快捷键"
          @click="saveCurrentToFile"
        >
          导出当前
        </button>
        <template v-if="electronApi?.pickWorkspace">
          <span class="tb-sep" aria-hidden="true" />
          <button type="button" class="tb-btn" title="Electron 工作区 — 无全局快捷键" @click="pickWorkspaceElectron">
            磁盘工作区
          </button>
        </template>
      </div>
    </header>
    <main class="main">
      <header v-if="sortedPaths.length" class="doc-tabs">
        <nav class="tab-strip" role="tablist" aria-label="已打开文档">
          <div
            v-for="path in sortedPaths"
            :key="path"
            class="tab-wrap"
            :class="{ active: path === selectedPath }"
            role="none"
          >
            <button
              type="button"
              class="tab-main"
              role="tab"
              :aria-selected="path === selectedPath"
              :title="path"
              @click="selectFile(path)"
            >
              {{ tabLabel(path) }}
            </button>
            <button
              type="button"
              class="tab-close"
              :title="`关闭 ${path}`"
              :aria-label="`关闭 ${tabLabel(path)}`"
              @click.stop="closeTab(path)"
            >
              ×
            </button>
          </div>
        </nav>
      </header>
      <template v-if="selectedPath">
        <div class="split">
          <section class="md-pane">
            <h2>Markdown 原文</h2>
            <pre class="md-src">{{ currentContent }}</pre>
          </section>
          <section class="blocks-pane">
            <h2>Model / View 块</h2>
            <ul v-if="parseErrors.length" class="errors">
              <li v-for="(e, i) in parseErrors" :key="i">{{ e }}</li>
            </ul>
            <article v-for="b in blocks" :key="b.payload.id" class="card">
              <header>
                <span class="badge">{{ b.kind }}</span>
                <code>{{ b.payload.id }}</code>
              </header>
              <div v-if="b.kind === 'mv-model'" class="preview">
                <table>
                  <thead>
                    <tr>
                      <th v-for="c in (b.payload as MvModelPayload).columns" :key="c.name">{{ c.name }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, ri) in (b.payload as MvModelPayload).rows" :key="ri">
                      <td v-for="c in (b.payload as MvModelPayload).columns" :key="c.name">{{ row[c.name] }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else-if="b.kind === 'mv-map'" class="preview">
                <pre class="mermaid-src">{{ JSON.stringify(b.payload, null, 2) }}</pre>
              </div>
              <div v-else-if="b.kind === 'mv-view'" class="preview">
                <template v-if="(b.payload as MvViewPayload).kind === 'table-readonly'">
                  <table v-if="modelForRef((b.payload as MvViewPayload).modelRefs[0] ?? '')">
                    <thead>
                      <tr>
                        <th v-for="c in modelForRef((b.payload as MvViewPayload).modelRefs[0] ?? '')!.columns" :key="c.name">
                          {{ c.name }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in modelForRef((b.payload as MvViewPayload).modelRefs[0] ?? '')!.rows" :key="ri">
                        <td v-for="c in modelForRef((b.payload as MvViewPayload).modelRefs[0] ?? '')!.columns" :key="c.name">
                          {{ row[c.name] }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-else class="muted">未找到同文件 model: {{ (b.payload as MvViewPayload).modelRefs[0] }}</p>
                </template>
                <pre v-else-if="(b.payload as MvViewPayload).kind === 'mermaid-class'" class="mermaid-src">{{
                  (b.payload as MvViewPayload).payload ?? '(无 payload)'
                }}</pre>
              </div>
              <footer class="card-actions">
                <button type="button" @click="openEdit(b)">编辑 JSON</button>
                <button type="button" @click="openBlockInShell(b)">独立编辑</button>
              </footer>
            </article>
          </section>
        </div>
      </template>
      <p v-else class="empty">{{ sortedPaths.length ? '请选择标签' : '未打开文档：请使用菜单「文件」或工具栏打开/新建' }}</p>
    </main>
    <footer v-if="!blockOnly" class="statusbar" role="status" title="点击查看完整日志" @click="onStatusClick">
      <span class="status-left" :title="statusLeftText">{{ statusLeftText }}</span>
      <span class="status-right">
        <span title="运行壳">壳 {{ shell }}</span>
        <span class="status-sep" aria-hidden="true">|</span>
        <span title="已打开文档数">文档 {{ sortedPaths.length }}</span>
        <template v-if="selectedPath">
          <span class="status-sep" aria-hidden="true">|</span>
          <span class="status-path" :title="selectedPath">{{ selectedPath }}</span>
        </template>
      </span>
    </footer>
    <div v-if="editOpen" class="modal-back" @click.self="editOpen = false">
      <div class="modal">
        <h3>编辑块 {{ editBlockId }}</h3>
        <textarea v-model="editJson" class="json-area" spellcheck="false" />
        <div class="modal-actions">
          <button type="button" @click="editOpen = false">取消</button>
          <button type="button" class="primary" @click="applyEdit">保存到 MD</button>
        </div>
      </div>
    </div>
    <div v-if="logOpen" class="modal-back log-modal-back" @click.self="logOpen = false">
      <div class="modal log-modal">
        <h3>日志</h3>
        <p class="log-hint">纯文本历史记录；「复制」写入当前全文（与下方文本一致）。</p>
        <pre class="log-body" tabindex="0">{{ logTextPlain }}</pre>
        <div class="modal-actions">
          <button type="button" @click="logOpen = false">关闭</button>
          <button type="button" class="primary" title="复制全部日志 — 无全局快捷键" @click="copyLogToClipboard">复制全文</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.layout.blockOnly .main {
  max-width: 100%;
}
.layout.blockOnly .split {
  grid-template-columns: 1fr;
}
.hidden {
  display: none;
}
.win-chrome {
  flex-shrink: 0;
  border-bottom: 1px solid #9aa7c0;
  background: linear-gradient(to bottom, #f2f4f8 0%, #e8ecf4 100%);
  user-select: none;
}
.title-strip {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 10px 2px;
  border-bottom: 1px solid #d0d6e4;
  background: linear-gradient(to bottom, #dfe6f2, #d4dbe8);
}
.app-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1e293b;
}
.app-title-ver {
  font-size: 0.7rem;
  color: #64748b;
}
.menu-bar {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0 4px;
  min-height: 26px;
  border-bottom: 1px solid #c5c9d4;
  background: #eceef4;
}
.menu-entry {
  position: relative;
}
.menu-top {
  margin: 0;
  border: none;
  padding: 4px 10px;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  color: #0f172a;
  background: transparent;
  border-radius: 2px;
}
.menu-top:hover {
  background: rgba(37, 99, 235, 0.12);
}
.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  min-width: 220px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: #fff;
  border: 1px solid #a8b0c4;
  box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.12);
}
.menu-item {
  display: block;
  width: 100%;
  margin: 0;
  border: none;
  padding: 6px 14px;
  font: inherit;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  color: #0f172a;
  background: transparent;
}
.menu-item:hover:not(:disabled) {
  background: #2563eb;
  color: #fff;
}
.menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.menu-sep {
  height: 1px;
  margin: 4px 8px;
  background: #d4d8e4;
  list-style: none;
}
.menu-info {
  padding: 8px 14px;
  font-size: 0.75rem;
  color: #475569;
  line-height: 1.35;
  max-width: 280px;
}
.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 4px 8px 5px;
  background: linear-gradient(to bottom, #f6f7fb, #ebeff7);
}
.tb-btn {
  margin: 0;
  border: 1px solid #b8c0d4;
  padding: 3px 10px;
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  color: #0f172a;
  background: linear-gradient(to bottom, #fff, #eef1f8);
  border-radius: 3px;
}
.tb-btn:hover:not(:disabled) {
  border-color: #7c8aad;
  background: linear-gradient(to bottom, #fff, #e4e9f5);
}
.tb-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tb-sep {
  width: 1px;
  height: 18px;
  margin: 0 4px;
  background: #c5c9d4;
  flex-shrink: 0;
}
.statusbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
  padding: 2px 10px;
  font-size: 0.72rem;
  color: #1e293b;
  background: linear-gradient(to bottom, #eceef4, #dfe3ec);
  border-top: 1px solid #a8b0c4;
  cursor: pointer;
}
.statusbar:hover {
  background: linear-gradient(to bottom, #e4e7ef, #d6dae6);
}
.status-left {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 55%;
}
.status-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-sep {
  opacity: 0.45;
}
.log-modal-back {
  z-index: 60;
}
.log-modal {
  max-width: min(720px, 96vw);
  width: 100%;
}
.log-hint {
  margin: 0 0 8px;
  font-size: 0.75rem;
  color: #64748b;
}
.log-body {
  margin: 0;
  max-height: min(420px, 55vh);
  overflow: auto;
  padding: 8px;
  font-size: 0.75rem;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fff;
  border: 1px solid #c5c9d4;
  border-radius: 4px;
  font-family: ui-monospace, Consolas, monospace;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.doc-tabs {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  min-height: 38px;
  padding: 0 8px;
  border-bottom: 1px solid #c5c9d4;
  background: linear-gradient(to bottom, #eef0f4, #e4e6ec);
  gap: 4px;
}
.tab-strip {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 3px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-top: 6px;
  scrollbar-width: thin;
}
.tab-wrap {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: stretch;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  color: #334155;
  background: #d8dce6;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.06);
}
.tab-wrap:hover {
  background: #e2e6f0;
  color: #0f172a;
}
.tab-wrap.active {
  color: #0f172a;
  font-weight: 600;
  background: #fff;
  border-color: #c5c9d4;
  border-bottom-color: #fff;
  margin-bottom: -1px;
  position: relative;
  z-index: 1;
  box-shadow: none;
}
.tab-main {
  margin: 0;
  border: none;
  padding: 6px 8px 6px 12px;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
  color: inherit;
  background: transparent;
  text-align: left;
}
.tab-main:hover {
  background: rgba(255, 255, 255, 0.25);
}
.tab-wrap.active .tab-main:hover {
  background: rgba(0, 0, 0, 0.03);
}
.tab-close {
  margin: 0;
  border: none;
  padding: 0 8px 0 2px;
  font: inherit;
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  opacity: 0.55;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-close:hover {
  opacity: 1;
  background: rgba(185, 28, 28, 0.12);
  color: #b91c1c;
}
.tab-wrap.active .tab-close:hover {
  background: rgba(185, 28, 28, 0.1);
}
.split {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 0;
}
.md-pane,
.blocks-pane {
  overflow: auto;
  padding: 12px;
  min-height: 0;
}
.md-src {
  white-space: pre-wrap;
  font-size: 0.78rem;
  background: #fff;
  border: 1px solid #e5e5e5;
  padding: 8px;
  border-radius: 6px;
  max-height: calc(100vh - 120px);
}
.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  background: #fff;
}
.badge {
  font-size: 0.7rem;
  background: #eef2ff;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 6px;
}
.preview {
  margin-top: 8px;
  font-size: 0.85rem;
}
.preview table {
  border-collapse: collapse;
  width: 100%;
}
.preview th,
.preview td {
  border: 1px solid #ccc;
  padding: 4px 6px;
}
.mermaid-src {
  white-space: pre-wrap;
  font-size: 0.78rem;
  background: #f4f4f5;
  padding: 8px;
  border-radius: 4px;
}
.muted {
  color: #888;
  font-size: 0.8rem;
}
.card-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
.card-actions button {
  font-size: 0.8rem;
}
.empty {
  padding: 24px;
  color: #888;
}
.errors {
  color: #b91c1c;
  font-size: 0.8rem;
}
.modal-back {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  background: #fff;
  padding: 16px;
  border-radius: 10px;
  width: min(640px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
}
.json-area {
  flex: 1;
  min-height: 200px;
  font-family: ui-monospace, monospace;
  font-size: 0.82rem;
  margin: 10px 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.modal-actions .primary {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
}
</style>
