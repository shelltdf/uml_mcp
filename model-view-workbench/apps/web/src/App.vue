<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  MV_MAP_CANVAS_TITLE,
  MV_MODEL_INTERFACE_CANVAS_TITLE,
  MV_MODEL_KV_CANVAS_TITLE,
  MV_MODEL_REFS_SCHEME_DOC,
  MV_MODEL_SQL_CANVAS_TITLE,
  MV_MODEL_STRUCT_CANVAS_TITLE,
  isMermaidViewKind,
  parseMarkdownBlocks,
  replaceBlockInnerById,
  type MvFenceKind,
  type MvCodespaceNamespaceNode,
  type MvMapPayload,
  type MvModelCodespacePayload,
  type MvModelInterfacePayload,
  type MvModelKvPayload,
  type MvModelSqlPayload,
  type MvModelStructPayload,
  type MvViewPayload,
  type ParsedFenceBlock,
} from '@mvwb/core';
import { useAppLocale } from './composables/useAppLocale';
import { fenceBlockSubtypeLabel } from './i18n/fence-subtype-label';
import { mvViewKindStrings } from './i18n/mv-view-kind-locale';
import {
  shellChromeMessages,
  trAlertExportFailed,
  trCloseCanvasTabAria,
  trCloseTabAria,
  trCloseTabDirty,
  trCloseTabTitle,
  trDockKvDocumentLine,
  trDockSqlTableLine,
  trDockStructDatasetLine,
  trDockStructGroupLine,
  trLogAutoSaveFailed,
  trLogBlockCanvasBrowserWindow,
  trLogBlockCanvasElectronWindow,
  trLogCanvasLaunchInvalid,
  trLogCanvasLaunchMismatch,
  trLogCanvasMissingData,
  trLogCanvasTabSaved,
  trLogElectronWorkspaceLoaded,
  trLogExportFailed,
  trLogExportOk,
  trLogFullscreenFailed,
  trLogInsertedFence,
  trLogMergedFromCanvasWindow,
  trLogNewMarkdown,
  trLogOpenFilePickerFailed,
  trLogOpenedCanvasTab,
  trLogOpenedFile,
  trLogOpenedFileNoWriteHandle,
  trLogOpenedFolder,
  trLogOutlineJumpMissing,
  trLogSaveAsDone,
  trLogSaveAsFallback,
  trLogSaveAsDownloaded,
  trLogSaveFailed,
  trLogSavedPath,
  trLogStartup,
  trLogSwitchedCanvasTab,
  trModalEditTitle,
  trOutlineJumpTitle,
  trOutlineLineTitle,
  trSelectFenceTitle,
} from './i18n/shell-chrome-messages';
import { detectShell } from './platform';
import MdMarkdownPreview from './components/MdMarkdownPreview.vue';
import MdWysiwygEditor from './components/MdWysiwygEditor.vue';
import BlockCanvasPage from './components/BlockCanvasPage.vue';
import type { MindmapDockCommand, MindmapDockState } from './components/mindmap/MindmapCanvas.vue';
import LeftDockPanel from './uisvg/components/LeftDockPanel.vue';
import DataPanel from './uisvg/components/DataPanel.vue';
import type { UiDesignDockCommand, UiDesignDockState } from './uisvg/uiDesignDockTypes';
import './uisvg/styles/win-theme.css';
import type { CodespaceDockContextPayload, CodespaceDockPropLine } from './utils/codespace-dock-context';
import InsertCodeBlockModal from './components/InsertCodeBlockModal.vue';
import { buildFenceMarkdownForInsert, type InsertCodeBlockKind } from './utils/code-block-insert';
import {
  type ExportVisualOpts,
  exportMarkdownFile,
  exportPng,
  exportStandaloneHtml,
  exportSvg,
  stripMdExtension,
} from './utils/export-document';

type FsFilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};
type FsSaveFilePickerOptions = {
  suggestedName?: string;
  types?: FsFilePickerAcceptType[];
};
type FsOpenFilePickerOptions = {
  multiple?: boolean;
  types?: FsFilePickerAcceptType[];
};
type WindowFsa = Window &
  typeof globalThis & {
    showSaveFilePicker?: (o?: FsSaveFilePickerOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (o?: FsOpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
  };

const { locale, ui, setLocale } = useAppLocale();
const shell = computed(() => detectShell());
const files = ref<Map<string, string>>(new Map());
const selectedPath = ref<string | null>(null);
const parseErrors = ref<string[]>([]);
const editOpen = ref(false);
const editJson = ref('');
const editBlockId = ref<string | null>(null);
/** 画布 / 块 URL 错误时覆盖主提示；否则用当前语言的默认工作区说明 */
const workspaceSurfaceError = ref<null | 'canvas' | 'block'>(null);
const workspaceHintDisplay = computed(() => {
  const L = shellChromeMessages[locale.value];
  if (workspaceSurfaceError.value === 'canvas') return L.errCanvasRead;
  if (workspaceSurfaceError.value === 'block') return L.errBlockRead;
  return L.workspaceHintDefault;
});
const blockOnly = ref(false);
const canvasOnly = ref(false);
const canvasMarkdown = ref('');
const canvasRelPath = ref('');
const canvasBlockId = ref('');
/** 画布弹窗内解析 ref: 跨文件 modelRefs 用的工作区快照（浏览器由 sessionStorage 注入） */
const canvasWorkspaceFiles = ref<Record<string, string>>({});
/** 主窗口内嵌画布标签（同一 relPath+blockId 只保留一条，重复打开则聚焦） */
interface CanvasTabSpec {
  id: string;
  relPath: string;
  blockId: string;
  fenceKind: MvFenceKind;
  subtypeLabel: string;
  /** `mv-model-codespace` 画布：当前选中节点说明（由 CodespaceCanvasEditor 同步） */
  codespaceDockSummary?: string;
  /** 画布选中节点的属性键值（与 `codespaceDockSummary` 同次更新） */
  codespaceDockLines?: CodespaceDockPropLine[];
  /** 画布草稿尚未保存回 Markdown */
  unsaved?: boolean;
  /** mindmap-ui 专用右侧 Dock 状态 */
  mindmapDockState?: MindmapDockState;
  /** ui-design：UISVG 左右栏同步状态 */
  uiDesignDockState?: UiDesignDockState;
}
const canvasTabs = ref<CanvasTabSpec[]>([]);
const mindmapDockCmdSeq = ref(0);
const mindmapDockCommand = ref<MindmapDockCommand | null>(null);
const uiDesignDockCmdSeq = ref(0);
const uiDesignDockCommand = ref<UiDesignDockCommand | null>(null);
/** ui-design 右侧 DataPanel：用户点 × 收起后再用底栏按钮展开 */
const uisvgDataDockCollapsed = ref(false);
/** `'markdown'` = 中间列仅 Markdown 编辑；否则为 `canvasTabs` 中某条 `id` */
const activeEditorTab = ref<'markdown' | string>('markdown');
const electronApi = computed(() => (typeof window !== 'undefined' ? window.electronAPI : undefined));
const openMenu = ref<null | 'file' | 'view' | 'language' | 'help'>(null);
const chromeRef = ref<HTMLElement | null>(null);
const layoutRootRef = ref<HTMLElement | null>(null);
const appIsFullscreen = ref(false);
const folderInputRef = ref<HTMLInputElement | null>(null);
/** 浏览器：单文件 .md（无 webkitdirectory） */
const singleFileInputRef = ref<HTMLInputElement | null>(null);
/** 与各打开文档内容比对，用于未保存提示与保存后清零 */
const savedBaseline = ref<Map<string, string>>(new Map());
/** 浏览器 File System Access：路径键 → 文件句柄（可重复保存） */
const browserSaveHandles = new Map<string, FileSystemFileHandle>();
const logLines = ref<string[]>([]);
const logOpen = ref(false);
const lastParseErrSig = ref('');
/** 预览=只读渲染；富文本=Vditor 所见即所得；原始文本=textarea */
const mdPaneMode = ref<'preview' | 'rich' | 'source'>('preview');
const sourceEditorText = ref('');
const mdCtxOpen = ref(false);
const mdCtxX = ref(0);
const mdCtxY = ref(0);
const mdCtxMenuRef = ref<HTMLElement | null>(null);
const mdWysiwygRef = ref<InstanceType<typeof MdWysiwygEditor> | null>(null);
const mdPreviewRef = ref<InstanceType<typeof MdMarkdownPreview> | null>(null);
const mdSourceTextareaRef = ref<HTMLTextAreaElement | null>(null);
/** Markdown 中间列（预览 / 富文本 / 源码），用于大纲跳转时查找滚动容器与标题 DOM */
const mdPaneRef = ref<HTMLElement | null>(null);
/** 文档章节大纲：被用户折叠的父标题索引（其子项在侧栏隐藏） */
const outlineCollapsedParents = ref(new Set<number>());
const insertCodeBlockOpen = ref(false);
const insertCodeBlockAppendToEnd = ref(false);
let electronWriteTimer: ReturnType<typeof setTimeout> | undefined;


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
    logLine(shellChromeMessages[locale.value].logCopied, 'info');
  } catch {
    window.alert(shellChromeMessages[locale.value].alertCopyFail);
  }
}

const logTextPlain = computed(() => logLines.value.join('\n'));

const statusLeftText = computed(() => {
  const lines = logLines.value;
  if (!lines.length) return shellChromeMessages[locale.value].statusReady;
  const last = lines[lines.length - 1]!;
  return last.length > 72 ? `${last.slice(0, 69)}…` : last;
});

function toggleMenu(id: 'file' | 'view' | 'language' | 'help') {
  openMenu.value = openMenu.value === id ? null : id;
}

function setLocaleFromMenu(next: 'zh' | 'en') {
  setLocale(next);
  closeMenus();
}

function closeMenus() {
  openMenu.value = null;
}

function syncBaselineForPath(path: string, content: string) {
  const m = new Map(savedBaseline.value);
  m.set(path, content);
  savedBaseline.value = m;
}

function replaceAllBaselinesFromFiles(fm: Map<string, string>) {
  savedBaseline.value = new Map(fm);
}

function isDirty(path: string | null | undefined): boolean {
  if (!path) return false;
  const cur = files.value.get(path);
  if (cur === undefined) return false;
  if (!savedBaseline.value.has(path)) return true;
  return cur !== savedBaseline.value.get(path);
}

const currentDocDirty = computed(() => {
  return isDirty(selectedPath.value);
});

function renameOpenDocumentKey(oldPath: string, newPath: string, text: string) {
  const fm = new Map(files.value);
  fm.delete(oldPath);
  fm.set(newPath, text);
  files.value = fm;
  if (browserSaveHandles.has(oldPath)) {
    const h = browserSaveHandles.get(oldPath)!;
    browserSaveHandles.delete(oldPath);
    browserSaveHandles.set(newPath, h);
  }
  const bm = new Map(savedBaseline.value);
  bm.delete(oldPath);
  bm.set(newPath, text);
  savedBaseline.value = bm;
  canvasTabs.value = canvasTabs.value.map((t) => (t.relPath === oldPath ? { ...t, relPath: newPath } : t));
  if (selectedPath.value === oldPath) selectedPath.value = newPath;
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
  void saveCurrentDocument();
}

function saveAsFromMenu() {
  closeMenus();
  void saveCurrentDocumentAs();
}

function openMarkdownFileFromMenu() {
  closeMenus();
  void openMarkdownFileUnified();
}

function closeCurrentDocumentFromMenu() {
  closeMenus();
  const p = selectedPath.value;
  if (p) closeTab(p);
}

/** 预览模式下导出 HTML/图：用可见预览 DOM；否则离屏 Vditor.preview（参数与预览一致） */
function getExportVisualOpts(): ExportVisualOpts | undefined {
  if (mdPaneMode.value !== 'preview') return undefined;
  const el = mdPreviewRef.value?.getVditorResetElement?.() ?? null;
  if (!el) return undefined;
  return { previewRoot: el };
}

function exportMarkdownFromMenu() {
  closeMenus();
  const p = selectedPath.value;
  if (!p) return;
  const base = stripMdExtension(p);
  exportMarkdownFile(base, currentContent.value);
  logLine(trLogExportOk(locale.value, base, 'md'), 'info');
}

async function exportHtmlFromMenu() {
  closeMenus();
  const p = selectedPath.value;
  if (!p) return;
  const base = stripMdExtension(p);
  try {
    await exportStandaloneHtml(currentContent.value, base, base, getExportVisualOpts());
    logLine(trLogExportOk(locale.value, base, 'html'), 'info');
  } catch (e) {
    const msg = String(e);
    logLine(trLogExportFailed(locale.value, 'HTML', msg), 'error');
    window.alert(trAlertExportFailed(locale.value, 'HTML', msg));
  }
}

async function exportSvgFromMenu() {
  closeMenus();
  const p = selectedPath.value;
  if (!p) return;
  const base = stripMdExtension(p);
  try {
    await exportSvg(currentContent.value, base, getExportVisualOpts());
    logLine(trLogExportOk(locale.value, base, 'svg'), 'info');
  } catch (e) {
    const msg = String(e);
    logLine(trLogExportFailed(locale.value, 'SVG', msg), 'error');
    window.alert(trAlertExportFailed(locale.value, 'SVG', msg));
  }
}

async function exportPngFromMenu() {
  closeMenus();
  const p = selectedPath.value;
  if (!p) return;
  const base = stripMdExtension(p);
  try {
    await exportPng(currentContent.value, base, getExportVisualOpts());
    logLine(trLogExportOk(locale.value, base, 'png'), 'info');
  } catch (e) {
    const msg = String(e);
    logLine(trLogExportFailed(locale.value, 'PNG', msg), 'error');
    window.alert(trAlertExportFailed(locale.value, 'PNG', msg));
  }
}

async function pickFromMenu() {
  closeMenus();
  await pickWorkspaceElectron();
}

function showAbout() {
  closeMenus();
  logLine(ui.value.aboutLog, 'info');
  window.alert(`MV Workbench 0.1\n\n${workspaceHintDisplay.value}`);
}

function onGlobalPointerDown(ev: PointerEvent) {
  const el = chromeRef.value;
  const t = ev.target as Node;
  if (el && !el.contains(t)) closeMenus();
  const ctxMenu = mdCtxMenuRef.value;
  if (mdCtxOpen.value && ctxMenu && !ctxMenu.contains(t)) closeMdContextMenu();
}

function onMdPaneContextMenu(e: MouseEvent) {
  e.preventDefault();
  mdCtxOpen.value = true;
  const mw = 220;
  const mh = 220;
  let x = e.clientX;
  let y = e.clientY;
  x = Math.min(x, window.innerWidth - mw - 6);
  y = Math.min(y, window.innerHeight - mh - 6);
  mdCtxX.value = Math.max(4, x);
  mdCtxY.value = Math.max(4, y);
}

function openInsertCodeBlockModal() {
  closeMdContextMenu();
  insertCodeBlockAppendToEnd.value = false;
  const L = shellChromeMessages[locale.value];
  if (!selectedPath.value) {
    logLine(L.logNeedDoc, 'warn');
    return;
  }
  if (mdPaneMode.value === 'preview') {
    logLine(L.logNeedRichOrSource, 'warn');
    return;
  }
  insertCodeBlockOpen.value = true;
}

function openInsertCodeBlockModalFromDock() {
  closeMdContextMenu();
  const L = shellChromeMessages[locale.value];
  if (!selectedPath.value) {
    logLine(L.logNeedDoc, 'warn');
    return;
  }
  insertCodeBlockAppendToEnd.value = true;
  insertCodeBlockOpen.value = true;
}

function insertIntoSourceAtCursor(fragment: string) {
  const el = mdSourceTextareaRef.value;
  const p = selectedPath.value;
  if (!el || !p) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const cur = sourceEditorText.value;
  const next = cur.slice(0, start) + fragment + cur.slice(end);
  sourceEditorText.value = next;
  files.value = new Map(files.value).set(p, next);
  scheduleElectronWrite(p, next);
  void nextTick(() => {
    el.focus();
    const pos = start + fragment.length;
    el.setSelectionRange(pos, pos);
  });
}

function appendToCurrentDocEnd(fragment: string): void {
  const p = selectedPath.value;
  if (!p) return;
  const cur = files.value.get(p) ?? '';
  const needsNewline = cur.length > 0 && !cur.endsWith('\n');
  const next = `${cur}${needsNewline ? '\n' : ''}${fragment}`;
  sourceEditorText.value = next;
  files.value = new Map(files.value).set(p, next);
  scheduleElectronWrite(p, next);
}

function onInsertCodeBlockSelect(kind: InsertCodeBlockKind) {
  const p = selectedPath.value;
  if (!p) return;
  if (mdPaneMode.value === 'preview' && !insertCodeBlockAppendToEnd.value) {
    insertCodeBlockOpen.value = false;
    return;
  }
  const fence = buildFenceMarkdownForInsert(kind, {
    currentFileRel: p,
    currentMarkdown: files.value.get(p) ?? '',
    locale: locale.value,
  });
  insertCodeBlockOpen.value = false;
  if (insertCodeBlockAppendToEnd.value) {
    appendToCurrentDocEnd(fence);
  } else if (mdPaneMode.value === 'rich') {
    mdWysiwygRef.value?.insertMarkdown(fence);
  } else {
    insertIntoSourceAtCursor(fence);
  }
  insertCodeBlockAppendToEnd.value = false;
  logLine(trLogInsertedFence(locale.value, kind), 'info');
}

function closeMdContextMenu() {
  mdCtxOpen.value = false;
}

function flushSourceToFiles() {
  const p = selectedPath.value;
  if (!p) return;
  if (sourceEditorText.value === (files.value.get(p) ?? '')) return;
  files.value = new Map(files.value).set(p, sourceEditorText.value);
  scheduleElectronWrite(p, sourceEditorText.value);
}

function setMdPaneMode(mode: 'preview' | 'rich' | 'source') {
  if (mdPaneMode.value === 'source' && mode !== 'source') {
    flushSourceToFiles();
  }
  if (mode === 'source') {
    const p = selectedPath.value;
    sourceEditorText.value = p ? files.value.get(p) ?? '' : '';
  }
  mdPaneMode.value = mode;
  closeMdContextMenu();
  if (mode === 'source') {
    void nextTick(() => onMdSourceSelectionSync());
  }
}

function onMdSourceInput() {
  const p = selectedPath.value;
  if (!p) return;
  files.value = new Map(files.value).set(p, sourceEditorText.value);
  scheduleElectronWrite(p, sourceEditorText.value);
}

function onMdRichInput(md: string) {
  const p = selectedPath.value;
  if (!p) return;
  files.value = new Map(files.value).set(p, md);
  sourceEditorText.value = md;
  scheduleElectronWrite(p, md);
}

function scheduleElectronWrite(path: string, text: string) {
  const api = electronApi.value;
  if (!api?.writeWorkspaceFile) return;
  clearTimeout(electronWriteTimer);
  electronWriteTimer = setTimeout(() => {
    void api.writeWorkspaceFile(path, text).then(
      () => {
        syncBaselineForPath(path, text);
      },
      (err: unknown) => {
        logLine(trLogAutoSaveFailed(locale.value, String(err)), 'error');
      },
    );
  }, 400);
}

async function flushPendingElectronWrite(): Promise<void> {
  clearTimeout(electronWriteTimer);
  electronWriteTimer = undefined;
  const api = electronApi.value;
  const p = selectedPath.value;
  if (!api?.writeWorkspaceFile || !p) return;
  const text = files.value.get(p);
  if (text === undefined) return;
  await api.writeWorkspaceFile(p, text);
  syncBaselineForPath(p, text);
}

function onGlobalKeyDown(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  const tag = t?.tagName;
  const inField = tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable;

  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    void saveCurrentDocument();
    return;
  }
  if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    void saveCurrentDocumentAs();
    return;
  }
  if (e.ctrlKey && (e.key === 'w' || e.key === 'W') && !inField) {
    e.preventDefault();
    const p = selectedPath.value;
    if (p) closeTab(p);
    return;
  }

  if (e.key === 'Escape') {
    if (insertCodeBlockOpen.value) {
      insertCodeBlockOpen.value = false;
      insertCodeBlockAppendToEnd.value = false;
      return;
    }
    closeMdContextMenu();
    closeMenus();
  }
}

function syncAppFullscreenFlag() {
  appIsFullscreen.value = Boolean(document.fullscreenElement);
}

async function toggleAppFullscreen() {
  const el = layoutRootRef.value;
  if (!el) return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  } catch {
    logLine(trLogFullscreenFailed(locale.value), 'warn');
  }
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

function countCodespaceNamespaceNodes(nodes: MvCodespaceNamespaceNode[] | undefined): number {
  if (!nodes?.length) return 0;
  let total = nodes.length;
  for (const ns of nodes) {
    total += countCodespaceNamespaceNodes(ns.namespaces);
  }
  return total;
}

function countCodespaceClassifiersInNamespaces(nodes: MvCodespaceNamespaceNode[] | undefined): number {
  if (!nodes?.length) return 0;
  let c = 0;
  for (const ns of nodes) {
    c += ns.classes?.length ?? 0;
    c += countCodespaceClassifiersInNamespaces(ns.namespaces);
  }
  return c;
}

function refreshCanvasTabSubtypesForPath(relPath: string, markdown: string) {
  const { blocks: bl } = parseMarkdownBlocks(markdown);
  canvasTabs.value = canvasTabs.value.map((t) => {
    if (t.relPath !== relPath) return t;
    const hit = bl.find((b) => b.payload.id === t.blockId);
    if (!hit) return t;
    return { ...t, fenceKind: hit.kind, subtypeLabel: fenceBlockSubtypeLabel(hit, locale.value) };
  });
}

watch(locale, () => {
  for (const p of files.value.keys()) {
    refreshCanvasTabSubtypesForPath(p, files.value.get(p) ?? '');
  }
});

/** 左侧 Dock：当前选中的围栏块（用于大纲第二段与右侧属性） */
const selectedBlockId = ref<string | null>(null);
const showOutlineDock = ref(true);
const showPropsDock = ref(true);
/** 大纲 Dock 在「已显示」前提下可折叠为窄条，不占 244px 全宽 */
const outlineDockCollapsed = ref(false);
/** 属性 Dock 同上 */
const propertiesDockCollapsed = ref(false);
const mindmapSpecialDockCollapsed = ref(false);
const propertiesDockFolded = ref(false);
const mindmapFormatDockFolded = ref(false);
const mindmapIconDockFolded = ref(false);
const mindmapThemeDockFolded = ref(false);
const mindmapIconDockCollapsed = ref(false);
const mindmapThemeDockCollapsed = ref(false);
const rightDockMaximized = ref<'properties' | 'mindmap-format' | 'mindmap-icon' | 'mindmap-theme' | null>(null);
const rightDockAreaAria = computed(() => (locale.value === 'en' ? 'Right dock area' : '右侧 Dock 区域'));

function toggleShowOutlineDockMenu() {
  showOutlineDock.value = !showOutlineDock.value;
  if (showOutlineDock.value) outlineDockCollapsed.value = false;
  closeMenus();
}

function toggleShowPropsDockMenu() {
  showPropsDock.value = !showPropsDock.value;
  closeMenus();
}

const selectedBlock = computed(() => {
  const id = selectedBlockId.value;
  if (!id) return null;
  return blocks.value.find((b) => b.payload.id === id) ?? null;
});

/** 属性 Dock：选中块时的「基本属性」键值（人类可读） */
interface DockPropLine {
  label: string;
  value: string;
}

const selectedBlockDocLines = computed((): DockPropLine[] | null => {
  const b = selectedBlock.value;
  if (!b) return null;
  const L = shellChromeMessages[locale.value];
  const lines: DockPropLine[] = [
    { label: L.labelKind, value: b.kind },
    { label: L.labelSubtype, value: fenceBlockSubtypeLabel(b, locale.value) },
    { label: L.labelBlockId, value: b.payload.id },
    { label: L.labelFenceLines, value: `L${b.startLine}–L${b.endLine}` },
    { label: L.labelBodyChars, value: `${b.rawInner.length} ${L.labelCharsUnit}` },
  ];
  if (b.kind === 'mv-model-sql') {
    lines.push({ label: L.labelCanvas, value: MV_MODEL_SQL_CANVAS_TITLE });
    const p = b.payload as MvModelSqlPayload;
    if (p.title) lines.push({ label: L.labelGroupTitle, value: p.title });
    lines.push({ label: L.labelTableCount, value: String(p.tables.length) });
    lines.push({ label: L.labelSubtableIds, value: p.tables.map((t) => t.id).join(', ') });
  } else if (b.kind === 'mv-model-kv') {
    lines.push({ label: L.labelCanvas, value: MV_MODEL_KV_CANVAS_TITLE });
    const p = b.payload as MvModelKvPayload;
    if (p.title) lines.push({ label: L.labelTitle, value: p.title });
    lines.push({ label: L.labelDocCount, value: String(p.documents.length) });
  } else if (b.kind === 'mv-model-struct') {
    lines.push({ label: L.labelCanvas, value: MV_MODEL_STRUCT_CANVAS_TITLE });
    const p = b.payload as MvModelStructPayload;
    if (p.title) lines.push({ label: L.labelTitle, value: p.title });
    lines.push({ label: L.labelRootGroupName, value: p.root.name });
  } else if (b.kind === 'mv-model-codespace') {
    lines.push({ label: L.labelCanvas, value: L.canvasTitleMvModelCodespace });
    const p = b.payload as MvModelCodespacePayload;
    if (p.title) lines.push({ label: L.labelTitle, value: p.title });
    if (p.workspaceRoot) lines.push({ label: L.labelWorkspaceRoot, value: p.workspaceRoot });
    lines.push({ label: L.labelModuleCount, value: String(p.modules.length) });
    lines.push({ label: L.labelModuleIds, value: p.modules.map((m) => m.id).join(', ') });
    let ns = 0;
    let cls = 0;
    for (const m of p.modules) {
      ns += countCodespaceNamespaceNodes(m.namespaces);
      cls += countCodespaceClassifiersInNamespaces(m.namespaces);
    }
    if (ns > 0) lines.push({ label: L.labelNsNodeCount, value: String(ns) });
    if (cls > 0) lines.push({ label: L.labelClassifierCount, value: String(cls) });
  } else if (b.kind === 'mv-model-interface') {
    lines.push({ label: L.labelCanvas, value: MV_MODEL_INTERFACE_CANVAS_TITLE });
    const p = b.payload as MvModelInterfacePayload;
    if (p.title) lines.push({ label: L.labelTitle, value: p.title });
    lines.push({ label: L.labelEndpointCount, value: String(p.endpoints.length) });
    lines.push({ label: L.labelEndpointIds, value: p.endpoints.map((e) => e.id).join(', ') });
  } else if (b.kind === 'mv-view') {
    const p = b.payload as MvViewPayload;
    lines.push({ label: L.labelCanvas, value: mvViewKindStrings(p.kind, locale.value).canvasTitle });
    if (p.title) lines.push({ label: L.labelTitle, value: p.title });
    lines.push({
      label: L.labelModelRefs,
      value: p.modelRefs.length ? p.modelRefs.join(locale.value === 'en' ? ', ' : '；') : L.labelModelRefsEmpty,
    });
    if (p.payload != null && String(p.payload).length) {
      const s = String(p.payload);
      lines.push({ label: L.labelPayloadSummary, value: s.length > 140 ? `${s.slice(0, 137)}…` : s });
    }
  } else if (b.kind === 'mv-map') {
    const p = b.payload as MvMapPayload;
    lines.push({ label: L.labelCanvas, value: MV_MAP_CANVAS_TITLE });
    lines.push({
      label: L.labelMapRules,
      value:
        locale.value === 'en'
          ? `${p.rules.length} rule${p.rules.length === 1 ? '' : 's'}`
          : `${p.rules.length} 条`,
    });
  }
  return lines;
});

function canvasPrimaryActionLabel(b: ParsedFenceBlock): string {
  const L = shellChromeMessages[locale.value];
  const pfx = L.canvasOpenPrefix;
  if (b.kind === 'mv-model-sql') return `${pfx}${MV_MODEL_SQL_CANVAS_TITLE}`;
  if (b.kind === 'mv-model-kv') return `${pfx}${MV_MODEL_KV_CANVAS_TITLE}`;
  if (b.kind === 'mv-model-struct') return `${pfx}${MV_MODEL_STRUCT_CANVAS_TITLE}`;
  if (b.kind === 'mv-model-codespace') return `${pfx}${L.canvasTitleMvModelCodespace}`;
  if (b.kind === 'mv-model-interface') return `${pfx}${MV_MODEL_INTERFACE_CANVAS_TITLE}`;
  if (b.kind === 'mv-map') return `${pfx}${MV_MAP_CANVAS_TITLE}`;
  if (b.kind === 'mv-view') {
    const k = (b.payload as MvViewPayload).kind;
    return `${pfx}${mvViewKindStrings(k, locale.value).canvasTitle}`;
  }
  return L.dockOpenCanvasLabelDefault;
}

function canvasPrimaryActionTitle(b: ParsedFenceBlock): string {
  const L = shellChromeMessages[locale.value];
  return `${canvasPrimaryActionLabel(b)} — ${L.canvasOpenInTabHint}`;
}

const canvasPrimaryActionLabelForSelected = computed(() => {
  const b = selectedBlock.value;
  return b ? canvasPrimaryActionLabel(b) : shellChromeMessages[locale.value].dockOpenCanvasLabelDefault;
});

const canvasPrimaryActionTitleForSelected = computed(() => {
  const b = selectedBlock.value;
  return b ? canvasPrimaryActionTitle(b) : shellChromeMessages[locale.value].dockOpenCanvasTitleDefault;
});

const selectedBlockCanvasHint = computed(() => {
  const b = selectedBlock.value;
  if (!b) return '';
  const L = shellChromeMessages[locale.value];
  if (b.kind === 'mv-model-sql') return L.canvasHintSql;
  if (b.kind === 'mv-model-kv') return L.canvasHintKv;
  if (b.kind === 'mv-model-struct') return L.canvasHintStruct;
  if (b.kind === 'mv-model-codespace') return L.canvasHintCodespace;
  if (b.kind === 'mv-model-interface') return L.canvasHintInterface;
  if (b.kind === 'mv-map') return L.canvasHintMap;
  if (b.kind === 'mv-view') {
    return mvViewKindStrings((b.payload as MvViewPayload).kind, locale.value).description;
  }
  return '';
});

function openVisualForSelected() {
  const b = selectedBlock.value;
  if (b) openVisualCanvas(b);
}

function openJsonForSelected() {
  const b = selectedBlock.value;
  if (b) openEdit(b);
}

function openShellForSelected() {
  const b = selectedBlock.value;
  if (b) openBlockInShell(b);
}

interface MdOutlineHeading {
  level: number;
  text: string;
  line: number;
}

function parseMdOutline(src: string): MdOutlineHeading[] {
  const lines = src.split(/\r?\n/);
  const out: MdOutlineHeading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s+(.+)$/.exec(lines[i] ?? '');
    if (m) out.push({ level: m[1].length, text: m[2].trim(), line: i + 1 });
  }
  return out;
}

const mdOutlineHeadings = computed(() => parseMdOutline(currentContent.value));

const MVWB_HEADING_FLASH_MS = 1100;
const MVWB_HEADING_FLASH_CLS = 'mvwb-heading-flash';

function outlineParentIndex(list: readonly MdOutlineHeading[], i: number): number | null {
  const L = list[i]?.level ?? 99;
  for (let j = i - 1; j >= 0; j--) {
    if (list[j].level < L) return j;
  }
  return null;
}

function outlineHasChildren(list: readonly MdOutlineHeading[], i: number): boolean {
  if (i + 1 >= list.length) return false;
  return list[i + 1].level > list[i].level;
}

function outlineIsAncestorOf(list: readonly MdOutlineHeading[], ancestorIdx: number, childIdx: number): boolean {
  if (childIdx <= ancestorIdx) return false;
  let p = outlineParentIndex(list, childIdx);
  while (p !== null) {
    if (p === ancestorIdx) return true;
    if (p < ancestorIdx) return false;
    p = outlineParentIndex(list, p);
  }
  return false;
}

function isOutlineRowHiddenByCollapse(i: number): boolean {
  const list = mdOutlineHeadings.value;
  const collapsed = outlineCollapsedParents.value;
  for (const c of collapsed) {
    if (i === c) continue;
    if (i > c && outlineIsAncestorOf(list, c, i)) return true;
  }
  return false;
}

function isOutlineBranchCollapsed(i: number): boolean {
  return outlineCollapsedParents.value.has(i);
}

function toggleOutlineCollapse(i: number) {
  const next = new Set(outlineCollapsedParents.value);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  outlineCollapsedParents.value = next;
}

/** 1-based 行号 → 该行行首在全文中的 UTF-16 偏移（与 `parseMdOutline` 的 split 规则一致） */
function offsetForLineStart(src: string, line1: number): number {
  if (line1 <= 1) return 0;
  const lines = src.split(/\r?\n/);
  let off = 0;
  for (let li = 0; li < line1 - 1 && li < lines.length; li++) {
    off += (lines[li]?.length ?? 0) + 1;
  }
  return Math.min(off, src.length);
}

/** 1-based 行：该行内容末尾（不含换行）偏移，用于源码行高亮 */
function offsetLineExclusiveEnd(src: string, line1: number): number {
  const lines = src.split(/\r?\n/);
  const li = line1 - 1;
  if (li < 0 || li >= lines.length) return src.length;
  const start = offsetForLineStart(src, line1);
  const row = lines[li] ?? '';
  return Math.min(start + row.length, src.length);
}

function flashDomHeading(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove(MVWB_HEADING_FLASH_CLS);
  void el.offsetWidth;
  el.classList.add(MVWB_HEADING_FLASH_CLS);
  window.setTimeout(() => {
    el.classList.remove(MVWB_HEADING_FLASH_CLS);
  }, MVWB_HEADING_FLASH_MS);
}

/** 原始文本：短暂选中整行以提示对应标题 */
function flashSourceHeadingLine(line1: number) {
  void nextTick(() => {
    window.setTimeout(() => {
      const ta = mdSourceTextareaRef.value;
      if (!ta) return;
      const src = sourceEditorText.value;
      const a = offsetForLineStart(src, line1);
      const b = offsetLineExclusiveEnd(src, line1);
      ta.focus();
      ta.setSelectionRange(a, Math.max(a, b));
      window.setTimeout(() => {
        ta.setSelectionRange(a, a);
      }, 720);
    }, 100);
  });
}

function scrollSourceToLine(line1: number) {
  void nextTick(() => {
    const ta = mdSourceTextareaRef.value;
    if (!ta) return;
    const src = sourceEditorText.value;
    const pos = offsetForLineStart(src, line1);
    ta.focus();
    ta.setSelectionRange(pos, pos);
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
    ta.scrollTop = Math.max(0, (line1 - 1) * lh - ta.clientHeight * 0.25);
  });
}

/** 与大纲顺序一致的正文区标题（排除 Vditor 目录 TOC 内的标题链接） */
function bodyHeadingsInOutlineOrder(root: HTMLElement): HTMLElement[] {
  const all = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')] as HTMLElement[];
  return all.filter((el) => !el.closest('.vditor-toc'));
}

function scrollToOutlineIndex(index: number) {
  const items = mdOutlineHeadings.value;
  const meta = items[index];
  if (!meta) return;
  if (mdPaneMode.value === 'source') {
    scrollSourceToLine(meta.line);
    flashSourceHeadingLine(meta.line);
    return;
  }
  const pane = mdPaneRef.value;
  if (!pane) return;
  const root =
    mdPaneMode.value === 'preview'
      ? (pane.querySelector('.md-preview-root') as HTMLElement | null)
      : (pane.querySelector('.vditor-wysiwyg') as HTMLElement | null);
  if (!root) return;
  void nextTick(() => {
    const heads = bodyHeadingsInOutlineOrder(root);
    const el = heads[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => flashDomHeading(el), 420);
      return;
    }
    logLine(trLogOutlineJumpMissing(locale.value, meta.text, index + 1), 'warn');
  });
}

function extractMermaidClassNames(src: string): string[] {
  const names = new Set<string>();
  for (const m of (src || '').matchAll(/\bclass\s+(\w+)/g)) names.add(m[1]);
  return [...names].sort();
}

function extractMindmapNodeLabels(payload: string, loc: 'zh' | 'en'): string[] {
  const bad = shellChromeMessages[loc].mindmapPayloadBad;
  const s = payload.trim();
  if (!s) return [bad];
  try {
    const o = JSON.parse(s) as { nodes?: Array<{ id?: string; label?: string }> };
    if (!o?.nodes || !Array.isArray(o.nodes)) return [bad];
    const labels = o.nodes.map((n) => (n.label ?? n.id ?? '?').toString()).filter(Boolean);
    return labels.length ? labels : [bad];
  } catch {
    return [bad];
  }
}

function extractPlantumlNames(src: string): string[] {
  const s = src || '';
  try {
    const obj = JSON.parse(s) as { elements?: Array<{ id?: string; name?: string }>; nodes?: Array<{ id?: string; name?: string }> };
    const arr = Array.isArray(obj.elements) ? obj.elements : Array.isArray(obj.nodes) ? obj.nodes : [];
    const fromJson = arr
      .map((e) => (e.name ?? e.id ?? '').toString().trim())
      .filter(Boolean);
    if (fromJson.length) return [...new Set(fromJson)].sort();
  } catch {
    // backward compatible: allow legacy textual payload
  }
  const names = new Set<string>();
  for (const pat of [/\bentity\s+(\w+)/gi, /\bclass\s+(\w+)/gi, /\binterface\s+(\w+)/gi, /\benum\s+(\w+)/gi]) {
    for (const m of s.matchAll(pat)) names.add(m[1]!);
  }
  return [...names].sort();
}

function extractSequenceParticipants(src: string): string[] {
  const names = new Set<string>();
  const s = src || '';
  for (const m of s.matchAll(/\bparticipant\s+"([^"]+)"|\bparticipant\s+(\w+)/gi)) {
    const n = (m[1] || m[2])?.trim();
    if (n) names.add(n);
  }
  for (const m of s.matchAll(/\bactor\s+"([^"]+)"|\bactor\s+(\w+)/gi)) {
    const n = (m[1] || m[2])?.trim();
    if (n) names.add(n);
  }
  return [...names].sort();
}

function extractUseCaseItems(src: string): string[] {
  const s = src || '';
  try {
    const obj = JSON.parse(s) as { actors?: Array<{ id?: string; name?: string }>; useCases?: Array<{ id?: string; name?: string }> };
    const out: string[] = [];
    for (const a of obj.actors ?? []) {
      const n = (a.name ?? a.id ?? '').toString().trim();
      if (n) out.push(`actor: ${n}`);
    }
    for (const u of obj.useCases ?? []) {
      const n = (u.name ?? u.id ?? '').toString().trim();
      if (n) out.push(`usecase: ${n}`);
    }
    if (out.length) return [...new Set(out)].sort();
  } catch {
    // backward compatible: allow legacy textual payload
  }
  const out = new Set<string>();
  for (const m of s.matchAll(/\bactor\s+"([^"]+)"|\bactor\s+(\w+)/gi)) {
    const n = (m[1] || m[2])?.trim();
    if (n) out.add(`actor: ${n}`);
  }
  for (const m of s.matchAll(/\busecase\s+"([^"]+)"(?:\s+as\s+\w+)?|\busecase\s+(\w+)/gi)) {
    const n = (m[1] || m[2])?.trim();
    if (n) out.add(`usecase: ${n}`);
  }
  return [...out].sort();
}

function extractComponentNodes(src: string): string[] {
  const s = src || '';
  try {
    const obj = JSON.parse(s) as { components?: Array<{ id?: string; name?: string }>; nodes?: Array<{ id?: string; name?: string }>; databases?: Array<{ id?: string; name?: string }> };
    const out: string[] = [];
    for (const arr of [obj.components ?? [], obj.nodes ?? [], obj.databases ?? []]) {
      for (const it of arr) {
        const n = (it.name ?? it.id ?? '').toString().trim();
        if (n) out.push(n);
      }
    }
    if (out.length) return [...new Set(out)].sort();
  } catch {
    // backward compatible: allow legacy textual payload
  }
  const out = new Set<string>();
  for (const m of s.matchAll(/\bcomponent\s+"([^"]+)"|\bcomponent\s+(\w+)/gi)) {
    const n = (m[1] || m[2])?.trim();
    if (n) out.add(n);
  }
  for (const m of s.matchAll(/\bnode\s+"([^"]+)"|\bnode\s+(\w+)/gi)) {
    const n = (m[1] || m[2])?.trim();
    if (n) out.add(n);
  }
  for (const m of s.matchAll(/\bdatabase\s+"([^"]+)"|\bdatabase\s+(\w+)/gi)) {
    const n = (m[1] || m[2])?.trim();
    if (n) out.add(n);
  }
  return [...out].sort();
}

function extractUmlGenericOutline(src: string, loc: 'zh' | 'en'): string[] {
  const L = shellChromeMessages[loc];
  try {
    const obj = JSON.parse(src || '') as {
      relations?: Array<{ from?: string; to?: string; type?: string }>;
      transitions?: Array<{ from?: string; to?: string; event?: string }>;
    };
    const rels = Array.isArray(obj.relations) ? obj.relations : Array.isArray(obj.transitions) ? obj.transitions : [];
    const lines = rels
      .map((r) => {
        const a = (r.from ?? '').toString().trim();
        const b = (r.to ?? '').toString().trim();
        const t = ('type' in r ? r.type : ('event' in r ? r.event : ''))?.toString().trim() ?? '';
        if (!a && !b && !t) return '';
        return `${a || '?'} -> ${b || '?'}${t ? ` (${t})` : ''}`;
      })
      .filter(Boolean)
      .slice(0, 12);
    if (lines.length) return lines;
  } catch {
    // fallback textual
  }
  const entities = extractPlantumlNames(src);
  if (entities.length) return entities;
  const parts = extractSequenceParticipants(src);
  if (parts.length) return parts;
  const lines = (src || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(@startuml|@enduml|skinparam|title|legend)/i.test(l))
    .slice(0, 12)
    .map((l) => (l.length > 72 ? `${l.slice(0, 69)}…` : l));
  return lines.length ? lines : [L.dockPayloadEmpty];
}

function extractActivityOutline(src: string, loc: 'zh' | 'en'): string[] {
  const empty = shellChromeMessages[loc].dockActNoSteps;
  const lines = (src || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  for (const l of lines) {
    if (/^(@startuml|@enduml|skinparam|title|legend)/i.test(l)) continue;
    if (l.startsWith(':') || /^if\s/i.test(l) || /^repeat\b/i.test(l) || /^while\b/i.test(l) || /^\|/.test(l)) {
      out.push(l.length > 52 ? `${l.slice(0, 49)}…` : l);
    }
    if (out.length >= 14) break;
  }
  return out.length ? out : [empty];
}

function uiDesignOutlineLines(payload: string, loc: 'zh' | 'en'): string[] {
  const L = shellChromeMessages[loc];
  const t = (payload || '').trim();
  if (!t) return [L.payloadEmptyShort];
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      const keys = Object.keys(o);
      return keys.length ? keys.slice(0, 18).map((k) => `· ${k}`) : [L.emptyObjectShort];
    } catch {
      return [t.length > 96 ? `${t.slice(0, 93)}…` : t];
    }
  }
  return [t.length > 96 ? `${t.slice(0, 93)}…` : t];
}

function collectStructOutlineLines(
  node: { name: string; groups?: unknown[]; datasets?: Array<{ name: string; dtype?: string }> },
  depth: number,
  out: string[],
  max: number,
  loc: 'zh' | 'en',
): void {
  if (out.length >= max) return;
  const pad = '  '.repeat(depth);
  out.push(trDockStructGroupLine(loc, pad, node.name));
  if (node.datasets?.length) {
    for (const ds of node.datasets) {
      if (out.length >= max) return;
      out.push(trDockStructDatasetLine(loc, pad, ds.name, ds.dtype));
    }
  }
  if (node.groups?.length) {
    for (const g of node.groups as Array<{ name: string; groups?: unknown[]; datasets?: Array<{ name: string; dtype?: string }> }>) {
      collectStructOutlineLines(g, depth + 1, out, max, loc);
      if (out.length >= max) return;
    }
  }
}

const dockSecondaryOutline = computed((): { heading: string; lines: string[] } | null => {
  const b = selectedBlock.value;
  if (!b) return null;
  const loc = locale.value;
  const L = shellChromeMessages[loc];
  if (b.kind === 'mv-model-sql') {
    const p = b.payload as MvModelSqlPayload;
    const lines = p.tables.map((tbl) => trDockSqlTableLine(loc, tbl));
    return { heading: L.dockSqlHeading, lines: lines.length ? lines.slice(0, 24) : [L.dockSqlNoTables] };
  }
  if (b.kind === 'mv-model-kv') {
    const p = b.payload as MvModelKvPayload;
    const lines = p.documents.map((d, i) => {
      const keys = Object.keys(d).slice(0, 8);
      const head = keys.join(', ');
      return trDockKvDocumentLine(loc, i, head, Object.keys(d).length > 8);
    });
    return {
      heading: L.dockKvHeading,
      lines: lines.length ? lines.slice(0, 22) : [L.dockKvNoDocs],
    };
  }
  if (b.kind === 'mv-model-struct') {
    const p = b.payload as MvModelStructPayload;
    const lines: string[] = [];
    collectStructOutlineLines(p.root, 0, lines, 26, loc);
    return { heading: L.dockStructHeading, lines: lines.length ? lines : [L.dockStructEmptyRoot] };
  }
  if (b.kind === 'mv-model-codespace') {
    const p = b.payload as MvModelCodespacePayload;
    const lines = p.modules.map(
      (m) =>
        `· ${m.id}: ${m.name}${m.path ? ` @ ${m.path}` : ''}${m.role ? ` [${m.role}]` : ''}`,
    );
    return {
      heading: L.dockCodespaceHeading,
      lines: lines.length ? lines.slice(0, 24) : [L.dockCodespaceNoModules],
    };
  }
  if (b.kind === 'mv-model-interface') {
    const p = b.payload as MvModelInterfacePayload;
    const lines = p.endpoints.map((e) => {
      const mp = [e.method, e.path].filter(Boolean).join(' ');
      return `· ${e.id}: ${e.name}${mp ? ` — ${mp}` : ''}`;
    });
    return {
      heading: L.dockIfHeading,
      lines: lines.length ? lines.slice(0, 24) : [L.dockIfNoEndpoints],
    };
  }
  if (b.kind === 'mv-view') {
    const p = b.payload as MvViewPayload;
    const payloadText =
      typeof p.payload === 'string'
        ? p.payload
        : p.payload && typeof p.payload === 'object'
          ? JSON.stringify(p.payload, null, 2)
          : '';
    if (isMermaidViewKind(p.kind)) {
      if (p.kind === 'mermaid-class') {
        const cls = extractMermaidClassNames(payloadText);
        return {
          heading: L.dockMermaidClassHeading,
          lines: cls.length ? cls : [L.dockMermaidNoClass],
        };
      }
      const excerpt = payloadText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 12);
      const shortTitle = mvViewKindStrings(p.kind, loc).canvasTitle.replace(/画布$| canvas$/i, '').trim();
      return {
        heading: `${L.dockSqlHeading.split(' · ')[0] ?? 'Block'} · ${shortTitle}`,
        lines: excerpt.length ? excerpt : [L.dockPayloadEmpty],
      };
    }
    if (p.kind === 'mindmap-ui') {
      const nodes = extractMindmapNodeLabels(payloadText, loc);
      return { heading: L.dockMindmapHeading, lines: nodes };
    }
    if (p.kind === 'uml-diagram' || p.kind === 'uml-class') {
      const els = extractPlantumlNames(payloadText);
      return {
        heading: p.kind === 'uml-class' ? L.dockUmlClassHeading : L.dockUmlGenericHeading,
        lines: els.length ? els : [L.dockUmlNoEntities],
      };
    }
    if (p.kind === 'uml-object' || p.kind === 'uml-package' || p.kind === 'uml-composite-structure' || p.kind === 'uml-profile') {
      const els = extractPlantumlNames(payloadText);
      const shortTitle = mvViewKindStrings(p.kind, loc).canvasTitle.replace(/画布$| canvas$/i, '').trim();
      return {
        heading: `${L.dockSqlHeading.split(' · ')[0] ?? 'Block'} · ${shortTitle}`,
        lines: els.length ? els : [L.dockUmlNoEntities],
      };
    }
    if (p.kind === 'uml-component' || p.kind === 'uml-deployment') {
      const nodes = extractComponentNodes(payloadText);
      const shortTitle = mvViewKindStrings(p.kind, loc).canvasTitle.replace(/画布$| canvas$/i, '').trim();
      return {
        heading: `${L.dockSqlHeading.split(' · ')[0] ?? 'Block'} · ${shortTitle}`,
        lines: nodes.length ? nodes : [L.dockPayloadEmpty],
      };
    }
    if (p.kind === 'uml-usecase') {
      const items = extractUseCaseItems(payloadText);
      const shortTitle = mvViewKindStrings(p.kind, loc).canvasTitle.replace(/画布$| canvas$/i, '').trim();
      return {
        heading: `${L.dockSqlHeading.split(' · ')[0] ?? 'Block'} · ${shortTitle}`,
        lines: items.length ? items : [L.dockPayloadEmpty],
      };
    }
    if (p.kind === 'uml-sequence') {
      const parts = extractSequenceParticipants(payloadText);
      return {
        heading: L.dockSeqHeading,
        lines: parts.length ? parts : [L.dockSeqNoParticipants],
      };
    }
    if (p.kind === 'uml-communication' || p.kind === 'uml-timing' || p.kind === 'uml-interaction-overview' || p.kind === 'uml-state-machine') {
      const shortTitle = mvViewKindStrings(p.kind, loc).canvasTitle.replace(/画布$| canvas$/i, '').trim();
      return {
        heading: `${L.dockSqlHeading.split(' · ')[0] ?? 'Block'} · ${shortTitle}`,
        lines: extractUmlGenericOutline(payloadText, loc),
      };
    }
    if (p.kind === 'uml-activity') {
      return { heading: L.dockActHeading, lines: extractActivityOutline(payloadText, loc) };
    }
    if (p.kind === 'ui-design') {
      return { heading: L.dockUiHeading, lines: uiDesignOutlineLines(payloadText, loc) };
    }
    return {
      heading: `${L.dockSqlHeading.split(' · ')[0] ?? 'Block'} · ${p.kind}`,
      lines: [`modelRefs: ${p.modelRefs.join(', ') || L.dockViewModelRefsNone}`],
    };
  }
  if (b.kind === 'mv-map') {
    const p = b.payload as MvMapPayload;
    return {
      heading: L.dockMapHeading,
      lines: p.rules.map((r) => `${r.modelId} → ${r.targetPath}`),
    };
  }
  return null;
});

function selectFenceBlock(b: ParsedFenceBlock) {
  selectedBlockId.value = b.payload.id;
}

/** 按 Markdown 字符偏移（与 `ParsedFenceBlock.startOffset`/`endOffset` 同源）更新右侧属性 Dock 选中块 */
function applyCaretOffsetToSelectedBlock(offset: number) {
  if (activeEditorTab.value !== 'markdown') return;
  const md = currentContent.value;
  const pos = Math.max(0, Math.min(offset, md.length));
  const list = blocks.value;
  const hit = list.find((b) => pos >= b.startOffset && pos < b.endOffset);
  selectedBlockId.value = hit?.payload.id ?? null;
}

function onMdWysiwygCaretOffset(offset: number) {
  if (mdPaneMode.value !== 'rich') return;
  applyCaretOffsetToSelectedBlock(offset);
}

function onMdSourceSelectionSync() {
  if (mdPaneMode.value !== 'source') return;
  const ta = mdSourceTextareaRef.value;
  if (!ta || document.activeElement !== ta) return;
  applyCaretOffsetToSelectedBlock(ta.selectionStart ?? 0);
}

function clearFenceSelection() {
  selectedBlockId.value = null;
}

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
  if (isDirty(path)) {
    if (!window.confirm(trCloseTabDirty(locale.value, tabLabel(path)))) return;
  }
  browserSaveHandles.delete(path);
  const bm0 = new Map(savedBaseline.value);
  bm0.delete(path);
  savedBaseline.value = bm0;
  canvasTabs.value = canvasTabs.value.filter((t) => t.relPath !== path);
  if (activeEditorTab.value !== 'markdown' && !canvasTabs.value.some((t) => t.id === activeEditorTab.value)) {
    activeEditorTab.value = 'markdown';
  }
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
    browserSaveHandles.clear();
    files.value = next;
    replaceAllBaselinesFromFiles(next);
    const keys = [...next.keys()].sort();
    selectedPath.value = keys[0] ?? null;
    logLine(trLogOpenedFolder(locale.value, keys.length), 'info');
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
  const initial = `# ${ui.value.newDocHeading}\n`;
  files.value = new Map(files.value).set(name, initial);
  selectedPath.value = name;
  syncBaselineForPath(name, initial);
  logLine(trLogNewMarkdown(locale.value, name), 'info');
}

function fsaSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

function fallbackDownloadMarkdown(suggestedName: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = suggestedName || 'doc.md';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function saveCurrentDocument(): Promise<void> {
  const p = selectedPath.value;
  if (!p) {
    logLine(shellChromeMessages[locale.value].logNeedDoc, 'warn');
    return;
  }
  const text = currentContent.value;

  if (electronApi.value?.writeWorkspaceFile) {
    try {
      await flushPendingElectronWrite();
      logLine(trLogSavedPath(locale.value, p), 'info');
    } catch {
      /* flush 已记录 */
    }
    return;
  }

  const handle = browserSaveHandles.get(p);
  if (handle && fsaSupported()) {
    try {
      const w = await handle.createWritable();
      await w.write(text);
      await w.close();
      syncBaselineForPath(p, text);
      logLine(trLogSavedPath(locale.value, tabLabel(p)), 'info');
    } catch (e) {
      logLine(trLogSaveFailed(locale.value, String(e)), 'error');
    }
    return;
  }

  await saveCurrentDocumentAs(true);
}

async function saveCurrentDocumentAs(fromSaveWithoutTarget = false): Promise<void> {
  const p = selectedPath.value;
  if (!p) {
    logLine(shellChromeMessages[locale.value].logNeedDoc, 'warn');
    return;
  }
  const text = currentContent.value;
  const L = shellChromeMessages[locale.value];

  if (electronApi.value?.saveFileAs) {
    const r = await electronApi.value.saveFileAs(p, text);
    if (!r) return;
    if ('error' in r) {
      if (r.error === 'no_workspace') window.alert(L.alertNoWorkspace);
      else if (r.error === 'outside_workspace') window.alert(L.alertOutsideWorkspaceSave);
      return;
    }
    const newPath = r.relPath;
    if (newPath !== p) {
      renameOpenDocumentKey(p, newPath, text);
    } else {
      files.value = new Map(files.value).set(p, text);
      syncBaselineForPath(p, text);
    }
    logLine(trLogSaveAsDone(locale.value, newPath, fromSaveWithoutTarget), 'info');
    return;
  }

  if (fsaSupported()) {
    try {
      const wfsa = window as unknown as WindowFsa;
      const handle = await wfsa.showSaveFilePicker!({
        suggestedName: tabLabel(p),
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
      });
      const w = await handle.createWritable();
      await w.write(text);
      await w.close();
      const newKey = handle.name;
      if (newKey !== p) {
        renameOpenDocumentKey(p, newKey, text);
      } else {
        files.value = new Map(files.value).set(p, text);
        syncBaselineForPath(p, text);
      }
      const tabKey = selectedPath.value;
      if (tabKey) browserSaveHandles.set(tabKey, handle);
      logLine(trLogSaveAsDone(locale.value, selectedPath.value!, fromSaveWithoutTarget), 'info');
    } catch (e) {
      if (String(e).includes('abort')) return;
      logLine(trLogSaveAsFallback(locale.value, String(e)), 'warn');
      fallbackDownloadMarkdown(tabLabel(p), text);
      syncBaselineForPath(p, text);
    }
    return;
  }

  fallbackDownloadMarkdown(tabLabel(p), text);
  syncBaselineForPath(p, text);
  logLine(trLogSaveAsDownloaded(locale.value, fromSaveWithoutTarget, tabLabel(p)), 'info');
}

async function openMarkdownFileUnified(): Promise<void> {
  if (electronApi.value?.openMarkdownInWorkspace) {
    const r = await electronApi.value.openMarkdownInWorkspace();
    if (!r) return;
    if ('error' in r) {
      const Lo = shellChromeMessages[locale.value];
      if (r.error === 'no_workspace') window.alert(Lo.alertNoWorkspaceOpenFile);
      else if (r.error === 'outside_workspace') window.alert(Lo.alertOutsideWorkspacePick);
      return;
    }
    files.value = new Map(files.value).set(r.relPath, r.text);
    syncBaselineForPath(r.relPath, r.text);
    selectedPath.value = r.relPath;
    logLine(trLogOpenedFile(locale.value, r.relPath), 'info');
    return;
  }

  if (fsaSupported()) {
    try {
      const wfsa = window as unknown as WindowFsa;
      const [handle] = await wfsa.showOpenFilePicker!({
        multiple: false,
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
      });
      const file = await handle.getFile();
      const name = file.name;
      const text = await file.text();
      files.value = new Map(files.value).set(name, text);
      browserSaveHandles.set(name, handle);
      syncBaselineForPath(name, text);
      selectedPath.value = name;
      logLine(trLogOpenedFile(locale.value, name), 'info');
    } catch (e) {
      if (String(e).includes('abort')) return;
      logLine(trLogOpenFilePickerFailed(locale.value, String(e)), 'warn');
      singleFileInputRef.value?.click();
    }
    return;
  }

  singleFileInputRef.value?.click();
}

function onPickSingleMdFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f || !f.name.toLowerCase().endsWith('.md')) {
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result ?? '');
    const name = f.name;
    files.value = new Map(files.value).set(name, text);
    syncBaselineForPath(name, text);
    selectedPath.value = name;
    logLine(trLogOpenedFileNoWriteHandle(locale.value, name), 'info');
  };
  reader.readAsText(f);
  input.value = '';
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
  sourceEditorText.value = out;
  editOpen.value = false;
  syncBaselineForPath(p, out);
  void electronApi.value?.writeWorkspaceFile(p, out);
}

async function pickWorkspaceElectron() {
  const api = electronApi.value;
  if (!api?.pickWorkspace) return;
  const r = await api.pickWorkspace();
  if (!r?.files) return;
  browserSaveHandles.clear();
  const fm = new Map(Object.entries(r.files));
  files.value = fm;
  replaceAllBaselinesFromFiles(fm);
  const keys = [...files.value.keys()].sort();
  selectedPath.value = keys[0] ?? null;
  logLine(trLogElectronWorkspaceLoaded(locale.value, keys.length), 'info');
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

const canvasTabsForCurrentFile = computed(() => {
  const p = selectedPath.value;
  if (!p) return [];
  return canvasTabs.value.filter((t) => t.relPath === p);
});

const activeCanvasSession = computed(() => {
  const id = activeEditorTab.value;
  if (id === 'markdown') return null;
  return canvasTabs.value.find((t) => t.id === id) ?? null;
});

const embeddedCanvasMarkdown = computed(() => {
  const s = activeCanvasSession.value;
  if (!s) return '';
  return files.value.get(s.relPath) ?? '';
});

const activeCanvasBlock = computed((): ParsedFenceBlock | null => {
  const tab = activeCanvasSession.value;
  if (!tab) return null;
  const md = embeddedCanvasMarkdown.value;
  if (!md) return null;
  const { blocks } = parseMarkdownBlocks(md);
  return blocks.find((b) => b.payload.id === tab.blockId) ?? null;
});

/** 主窗口内嵌代码空间画布时，在属性 Dock 展示画布当前选中节点 */
const showCodespaceDockCanvasSelection = computed(() => {
  const tab = activeCanvasSession.value;
  const b = activeCanvasBlock.value;
  if (activeEditorTab.value === 'markdown') return false;
  if (!tab || !b || b.payload.id !== tab.blockId) return false;
  if (b.kind === 'mv-model-codespace') return true;
  if (b.kind === 'mv-view' && (b.payload as MvViewPayload).kind === 'mindmap-ui') return true;
  return false;
});

const codespaceDockCanvasSelectionText = computed(() => {
  const tab = activeCanvasSession.value;
  if (!tab) return '';
  return tab.codespaceDockSummary ?? '';
});

const codespaceDockCanvasLines = computed((): CodespaceDockPropLine[] => {
  const tab = activeCanvasSession.value;
  if (!tab) return [];
  return tab.codespaceDockLines ?? [];
});

function onCodespaceDockContext(ctx: CodespaceDockContextPayload) {
  const tab = activeCanvasSession.value;
  if (!tab) return;
  canvasTabs.value = canvasTabs.value.map((t) =>
    t.id === tab.id ? { ...t, codespaceDockSummary: ctx.summary, codespaceDockLines: ctx.lines } : t,
  );
}

function onMindmapDockState(ctx: MindmapDockState) {
  const tab = activeCanvasSession.value;
  if (!tab) return;
  canvasTabs.value = canvasTabs.value.map((t) => (t.id === tab.id ? { ...t, mindmapDockState: ctx } : t));
}

function onUiDesignDockState(ctx: UiDesignDockState) {
  const tab = activeCanvasSession.value;
  if (!tab) return;
  canvasTabs.value = canvasTabs.value.map((t) => (t.id === tab.id ? { ...t, uiDesignDockState: ctx } : t));
}

const showMindmapSpecialDock = computed(() => {
  if (activeEditorTab.value === 'markdown') return false;
  const b = activeCanvasBlock.value;
  return !!(b && b.kind === 'mv-view' && (b.payload as MvViewPayload).kind === 'mindmap-ui');
});

/** 当前嵌入画布为 mv-view · ui-design：显示 UISVG 左/右 dock */
const showUiDesignSpecialDock = computed(() => {
  if (activeEditorTab.value === 'markdown') return false;
  const b = activeCanvasBlock.value;
  return !!(b && b.kind === 'mv-view' && (b.payload as MvViewPayload).kind === 'ui-design');
});

const showUiDesignLeftDock = computed(() => showUiDesignSpecialDock.value);

const activeMindmapDockState = computed(() => activeCanvasSession.value?.mindmapDockState ?? null);
const activeUiDesignDockState = computed(() => activeCanvasSession.value?.uiDesignDockState ?? null);
const hasPropertiesDockPanel = computed(() => true);
const hasMindmapDockPanel = computed(() => showMindmapSpecialDock.value);
const hasMindmapFormatDockPanel = computed(() => hasMindmapDockPanel.value);
const hasMindmapIconDockPanel = computed(() => hasMindmapDockPanel.value);
const hasMindmapThemeDockPanel = computed(() => hasMindmapDockPanel.value);
const propertiesDockVisibleInView = computed(() => {
  if (propertiesDockCollapsed.value) return false;
  /** ui-design 激活时右侧让给 UISVG DataPanel，避免与通用属性重复占地 */
  if (showUiDesignSpecialDock.value) return false;
  if (
    rightDockMaximized.value === 'mindmap-format' ||
    rightDockMaximized.value === 'mindmap-icon' ||
    rightDockMaximized.value === 'mindmap-theme'
  )
    return false;
  return true;
});
const mindmapFormatDockVisibleInView = computed(() => {
  if (!hasMindmapFormatDockPanel.value || mindmapSpecialDockCollapsed.value) return false;
  if (rightDockMaximized.value === 'properties') return false;
  if (rightDockMaximized.value === 'mindmap-icon' || rightDockMaximized.value === 'mindmap-theme') return false;
  return true;
});
const mindmapIconDockVisibleInView = computed(() => {
  if (!hasMindmapIconDockPanel.value || mindmapIconDockCollapsed.value) return false;
  if (rightDockMaximized.value === 'properties') return false;
  if (rightDockMaximized.value === 'mindmap-format' || rightDockMaximized.value === 'mindmap-theme') return false;
  return true;
});
const mindmapThemeDockVisibleInView = computed(() => {
  if (!hasMindmapThemeDockPanel.value || mindmapThemeDockCollapsed.value) return false;
  if (rightDockMaximized.value === 'properties') return false;
  if (rightDockMaximized.value === 'mindmap-format' || rightDockMaximized.value === 'mindmap-icon') return false;
  return true;
});

const hasUisvgDataDockPanel = computed(() => showUiDesignSpecialDock.value);

const uisvgDataDockVisibleInView = computed(
  () => hasUisvgDataDockPanel.value && !uisvgDataDockCollapsed.value,
);

watch(showUiDesignSpecialDock, (on) => {
  if (on) uisvgDataDockCollapsed.value = false;
});

const showRightDockView = computed(() => {
  return propertiesDockVisibleInView.value
    || mindmapFormatDockVisibleInView.value
    || mindmapIconDockVisibleInView.value
    || mindmapThemeDockVisibleInView.value
    || uisvgDataDockVisibleInView.value;
});

function sendMindmapDockCommand(action: MindmapDockCommand['action'], payload?: string): void {
  mindmapDockCmdSeq.value += 1;
  mindmapDockCommand.value = { id: mindmapDockCmdSeq.value, action, payload };
}

function sendUiDesignDockCommand(action: UiDesignDockCommand['action'], payload?: string): void {
  uiDesignDockCmdSeq.value += 1;
  uiDesignDockCommand.value = { id: uiDesignDockCmdSeq.value, action, payload };
}

function toggleRightDockMaximize(target: 'properties' | 'mindmap-format' | 'mindmap-icon' | 'mindmap-theme'): void {
  rightDockMaximized.value = rightDockMaximized.value === target ? null : target;
}

function onActiveCanvasDirtyChange(dirty: boolean) {
  const tab = activeCanvasSession.value;
  if (!tab) return;
  canvasTabs.value = canvasTabs.value.map((t) => (t.id === tab.id ? { ...t, unsaved: dirty } : t));
}

function workspaceFilesRecord(): Record<string, string> {
  return Object.fromEntries(files.value);
}

function makeCanvasTabId(): string {
  return `cv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function openVisualCanvas(block: ParsedFenceBlock) {
  const p = selectedPath.value;
  if (!p) return;
  const existing = canvasTabs.value.find((t) => t.relPath === p && t.blockId === block.payload.id);
  if (existing) {
    activeEditorTab.value = existing.id;
    logLine(trLogSwitchedCanvasTab(locale.value, block.payload.id), 'info');
    return;
  }
  const id = makeCanvasTabId();
  canvasTabs.value = [
    ...canvasTabs.value,
    {
      id,
      relPath: p,
      blockId: block.payload.id,
      fenceKind: block.kind,
      subtypeLabel: fenceBlockSubtypeLabel(block, locale.value),
      codespaceDockSummary: '',
      codespaceDockLines: [],
      unsaved: false,
    },
  ];
  activeEditorTab.value = id;
  logLine(trLogOpenedCanvasTab(locale.value, block.payload.id), 'info');
}

function closeCanvasTab(tabId: string) {
  canvasTabs.value = canvasTabs.value.filter((t) => t.id !== tabId);
  if (activeEditorTab.value === tabId) {
    activeEditorTab.value = 'markdown';
  }
}

async function onEmbeddedCanvasSaved(payload: { markdown: string; relPath: string }) {
  files.value = new Map(files.value).set(payload.relPath, payload.markdown);
  if (selectedPath.value === payload.relPath) {
    sourceEditorText.value = payload.markdown;
  }
  if (electronApi.value?.writeWorkspaceFile) {
    await electronApi.value.writeWorkspaceFile(payload.relPath, payload.markdown);
  }
  // 块画布保存不应重置“文档保存”基线；顶栏保存状态仅反映 Markdown 编辑保存链路。
  refreshCanvasTabSubtypesForPath(payload.relPath, payload.markdown);
  const tab = activeCanvasSession.value;
  if (tab) {
    canvasTabs.value = canvasTabs.value.map((t) => (t.id === tab.id ? { ...t, unsaved: false } : t));
  }
  logLine(trLogCanvasTabSaved(locale.value, payload.relPath), 'info');
}

async function onCanvasSavedInPopup(payload: { markdown: string; relPath: string }) {
  if (electronApi.value?.writeWorkspaceFile) {
    await electronApi.value.writeWorkspaceFile(payload.relPath, payload.markdown);
  }
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'mvwb:canvasSaved', relPath: payload.relPath, markdown: payload.markdown },
        '*',
      );
    }
  } catch {
    /* noop */
  }
  try {
    window.close();
  } catch {
    /* noop */
  }
}

function onCanvasClosePopup() {
  try {
    window.close();
  } catch {
    /* noop */
  }
}

function onOpenerCanvasSaved(ev: MessageEvent) {
  if (ev.data?.type !== 'mvwb:canvasSaved') return;
  const { relPath, markdown } = ev.data as { relPath?: string; markdown?: string };
  if (typeof relPath !== 'string' || typeof markdown !== 'string') return;
  files.value = new Map(files.value).set(relPath, markdown);
  if (selectedPath.value === relPath) {
    sourceEditorText.value = markdown;
  }
  // 同上：弹窗画布回写也不重置文档保存基线。
  refreshCanvasTabSubtypesForPath(relPath, markdown);
  logLine(trLogMergedFromCanvasWindow(locale.value, relPath), 'info');
}

watch(
  selectedPath,
  () => {
    outlineCollapsedParents.value = new Set();
    editOpen.value = false;
    selectedBlockId.value = null;
    const p = selectedPath.value;
    sourceEditorText.value = p ? files.value.get(p) ?? '' : '';
    activeEditorTab.value = 'markdown';
    if (!p) {
      canvasTabs.value = [];
    }
  },
  { immediate: true },
);

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
  logLine(trLogStartup(locale.value), 'info');
  document.addEventListener('pointerdown', onGlobalPointerDown, true);
  document.addEventListener('keydown', onGlobalKeyDown, true);
  document.addEventListener('fullscreenchange', syncAppFullscreenFlag);
  document.addEventListener('selectionchange', onMdSourceSelectionSync);
  window.addEventListener('message', onOpenerCanvasSaved);
  const u = new URLSearchParams(window.location.search);
  const rel = u.get('path') ?? '';
  const bid = u.get('blockId') ?? '';
  if (u.get('mvwb_canvas') === '1' && rel && bid) {
    canvasRelPath.value = rel;
    canvasBlockId.value = bid;
    if (electronApi.value?.readWorkspaceFile) {
      try {
        canvasMarkdown.value = await electronApi.value.readWorkspaceFile(rel);
        canvasOnly.value = true;
        logLine(trLogBlockCanvasElectronWindow(locale.value), 'info');
      } catch {
        workspaceSurfaceError.value = 'canvas';
        logLine(shellChromeMessages[locale.value].errCanvasRead, 'error');
      }
      return;
    }
    const raw = sessionStorage.getItem('mvwb_canvas_launch');
    if (raw) {
      try {
        const o = JSON.parse(raw) as {
          path?: string;
          blockId?: string;
          markdown?: string;
          workspaceFiles?: Record<string, string>;
        };
        if (o.path === rel && o.blockId === bid && typeof o.markdown === 'string') {
          canvasMarkdown.value = o.markdown;
          canvasWorkspaceFiles.value = o.workspaceFiles && typeof o.workspaceFiles === 'object' ? o.workspaceFiles : {};
          canvasOnly.value = true;
          sessionStorage.removeItem('mvwb_canvas_launch');
          logLine(trLogBlockCanvasBrowserWindow(locale.value), 'info');
        } else {
          logLine(trLogCanvasLaunchMismatch(locale.value), 'warn');
        }
      } catch {
        logLine(trLogCanvasLaunchInvalid(locale.value), 'error');
      }
    } else {
      logLine(trLogCanvasMissingData(locale.value), 'error');
    }
    return;
  }
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
      workspaceSurfaceError.value = 'block';
      logLine(shellChromeMessages[locale.value].errBlockRead, 'error');
    }
    return;
  }
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onGlobalPointerDown, true);
  document.removeEventListener('keydown', onGlobalKeyDown, true);
  document.removeEventListener('fullscreenchange', syncAppFullscreenFlag);
  document.removeEventListener('selectionchange', onMdSourceSelectionSync);
  window.removeEventListener('message', onOpenerCanvasSaved);
  clearTimeout(electronWriteTimer);
});
</script>

<template>
  <BlockCanvasPage
    v-if="canvasOnly && canvasMarkdown"
    :markdown="canvasMarkdown"
    :rel-path="canvasRelPath"
    :block-id="canvasBlockId"
    :workspace-files="canvasWorkspaceFiles"
    :mindmap-dock-command="mindmapDockCommand"
    :ui-design-dock-command="uiDesignDockCommand"
    @saved="onCanvasSavedInPopup"
    @close="onCanvasClosePopup"
    @mindmap-dock-state="onMindmapDockState"
    @ui-design-dock-state="onUiDesignDockState"
    @dirty-change="onActiveCanvasDirtyChange"
  />
  <div v-else ref="layoutRootRef" class="layout" :class="{ blockOnly }">
    <input
      ref="folderInputRef"
      type="file"
      class="hidden"
      webkitdirectory
      directory
      multiple
      @change="onPickFolder"
    />
    <input
      ref="singleFileInputRef"
      type="file"
      class="hidden"
      accept=".md,text/markdown"
      @change="onPickSingleMdFile"
    />
    <header v-if="!blockOnly" ref="chromeRef" class="win-chrome">
      <div class="title-strip">
        <span class="app-title">MV Workbench</span>
        <span class="app-title-ver">0.1</span>
      </div>
      <nav class="menu-bar" :aria-label="ui.navAria">
        <div class="menu-entry">
          <button type="button" class="menu-top" @click.stop="toggleMenu('file')">{{ ui.file }}</button>
          <ul v-show="openMenu === 'file'" class="menu-dropdown" role="menu" @click.stop>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="newFromMenu">{{ ui.new }}</button>
            </li>
            <li class="menu-sep" role="separator" />
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="openMarkdownFileFromMenu">{{ ui.open }}</button>
            </li>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="openFolderDialog">{{ ui.openFolder }}</button>
            </li>
            <li class="menu-sep" role="separator" />
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" :disabled="!selectedPath" @click="saveFromMenu">
                {{ ui.save }}
              </button>
            </li>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" :disabled="!selectedPath" @click="saveAsFromMenu">
                {{ ui.saveAs }}
              </button>
            </li>
            <li class="menu-sep" role="separator" />
            <li role="none">
              <button
                type="button"
                class="menu-item"
                role="menuitem"
                :disabled="!selectedPath"
                :title="ui.exportMdTitle"
                @click="exportMarkdownFromMenu"
              >
                {{ ui.exportMd }}
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                class="menu-item"
                role="menuitem"
                :disabled="!selectedPath"
                :title="ui.exportHtmlTitle"
                @click="exportHtmlFromMenu"
              >
                {{ ui.exportHtml }}
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                class="menu-item"
                role="menuitem"
                :disabled="!selectedPath"
                :title="ui.exportSvgTitle"
                @click="exportSvgFromMenu"
              >
                {{ ui.exportSvg }}
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                class="menu-item"
                role="menuitem"
                :disabled="!selectedPath"
                :title="ui.exportPngTitle"
                @click="exportPngFromMenu"
              >
                {{ ui.exportPng }}
              </button>
            </li>
            <li class="menu-sep" role="separator" />
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" :disabled="!selectedPath" @click="closeCurrentDocumentFromMenu">
                {{ ui.close }}
              </button>
            </li>
            <template v-if="electronApi?.pickWorkspace">
              <li class="menu-sep" role="separator" />
              <li role="none">
                <button type="button" class="menu-item" role="menuitem" @click="pickFromMenu">{{ ui.pickWorkspace }}</button>
              </li>
            </template>
          </ul>
        </div>
        <div class="menu-entry">
          <button type="button" class="menu-top" @click.stop="toggleMenu('view')">{{ ui.view }}</button>
          <ul v-show="openMenu === 'view'" class="menu-dropdown" role="menu" @click.stop>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="toggleShowOutlineDockMenu">
                {{ showOutlineDock ? ui.viewOutlineHide : ui.viewOutlineShow }}
              </button>
            </li>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="toggleShowPropsDockMenu">
                {{ showPropsDock ? ui.viewPropsHide : ui.viewPropsShow }}
              </button>
            </li>
            <li class="menu-sep" role="separator" />
            <li class="menu-info" role="none" v-html="ui.viewHintHtml" />
          </ul>
        </div>
        <div class="menu-entry">
          <button type="button" class="menu-top" @click.stop="toggleMenu('language')">{{ ui.language }}</button>
          <ul v-show="openMenu === 'language'" class="menu-dropdown" role="menu" @click.stop>
            <li role="none">
              <button
                type="button"
                class="menu-item"
                role="menuitemradio"
                :aria-checked="locale === 'zh'"
                title="简体中文 — 无全局快捷键"
                @click="setLocaleFromMenu('zh')"
              >
                {{ ui.langZh }}
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                class="menu-item"
                role="menuitemradio"
                :aria-checked="locale === 'en'"
                title="English — no global shortcut"
                @click="setLocaleFromMenu('en')"
              >
                {{ ui.langEn }}
              </button>
            </li>
          </ul>
        </div>
        <div class="menu-entry">
          <button type="button" class="menu-top" @click.stop="toggleMenu('help')">{{ ui.help }}</button>
          <ul v-show="openMenu === 'help'" class="menu-dropdown" role="menu" @click.stop>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="showAbout">{{ ui.about }}</button>
            </li>
          </ul>
        </div>
      </nav>
      <div class="toolbar-row" :aria-label="ui.tbAria">
        <div class="toolbar-start">
          <button type="button" class="tb-btn" :title="ui.tbNewTitle" @click="newMarkdownFile">{{ ui.tbNew }}</button>
          <span class="tb-sep" aria-hidden="true" />
          <button type="button" class="tb-btn" :title="ui.tbOpenTitle" @click="openMarkdownFileUnified">
            {{ ui.tbOpen }}
          </button>
          <button type="button" class="tb-btn" :title="ui.tbOpenFolderTitle" @click="openFolderDialog">{{ ui.tbOpenFolder }}</button>
          <span class="tb-sep" aria-hidden="true" />
          <button
            type="button"
            :class="['tb-btn', { 'tb-btn-dirty': currentDocDirty }]"
            :disabled="!selectedPath"
            :title="ui.tbSaveTitle"
            @click="saveCurrentDocument"
          >
            {{ ui.tbSave }}
          </button>
          <button
            type="button"
            class="tb-btn"
            :disabled="!selectedPath"
            :title="ui.tbSaveAsTitle"
            @click="() => saveCurrentDocumentAs()"
          >
            {{ ui.tbSaveAs }}
          </button>
          <button
            type="button"
            class="tb-btn"
            :disabled="!selectedPath"
            :title="ui.tbCloseTitle"
            @click="closeCurrentDocumentFromMenu"
          >
            {{ ui.tbClose }}
          </button>
          <template v-if="electronApi?.pickWorkspace">
            <span class="tb-sep" aria-hidden="true" />
            <button type="button" class="tb-btn" :title="ui.tbDiskWorkspaceTitle" @click="pickWorkspaceElectron">
              {{ ui.tbDiskWorkspace }}
            </button>
          </template>
        </div>
        <span class="toolbar-fill" aria-hidden="true" />
        <button
          type="button"
          class="tb-btn tb-btn-fullscreen"
          :title="appIsFullscreen ? ui.tbFullscreenExitTitle : ui.tbFullscreenTitle"
          @click="toggleAppFullscreen"
        >
          {{ appIsFullscreen ? ui.tbFullscreenExit : ui.tbFullscreen }}
        </button>
      </div>
    </header>
    <main class="main">
      <template v-if="sortedPaths.length">
        <div class="workspace-row">
          <aside
            v-if="!blockOnly && showOutlineDock"
            class="dock dock-left dock-area-left"
            :class="{ 'dock-area-left--buttons-only': outlineDockCollapsed }"
            :aria-label="ui.dockOutlineAria"
          >
            <div class="dock-button-bar dock-button-bar--left" aria-label="Dock Button Bar">
              <button
                type="button"
                class="dock-button"
                :class="{ 'dock-button--active': !outlineDockCollapsed }"
                :title="ui.dockOutlineTitle"
                :aria-label="ui.dockOutlineTitle"
                @click="outlineDockCollapsed = !outlineDockCollapsed"
              >
                {{ locale === 'en' ? 'Outl' : '大纲' }}
              </button>
            </div>
            <div v-if="!outlineDockCollapsed" class="dock-view">
            <div class="dock-titlebar">
              <span v-show="!outlineDockCollapsed" class="dock-title">{{ ui.dockOutlineTitle }}</span>
              <button
                type="button"
                class="dock-collapse-toggle"
                :class="{ 'dock-collapse-toggle--fill': outlineDockCollapsed }"
                :title="outlineDockCollapsed ? ui.dockExpandOutline : ui.dockCollapseOutline"
                :aria-expanded="!outlineDockCollapsed"
                @click="outlineDockCollapsed = !outlineDockCollapsed"
              >
                <span v-if="outlineDockCollapsed" class="dock-vlabel">{{ ui.dockOutlineTitle }}</span>
                <span v-else aria-hidden="true">‹</span>
              </button>
            </div>
            <div v-show="!outlineDockCollapsed" class="dock-scroll">
              <section class="dock-section">
                <h3 class="dock-subh">{{ ui.dockSectionDoc }}</h3>
                <ul v-if="mdOutlineHeadings.length" class="dock-outline-list">
                  <li
                    v-for="(h, i) in mdOutlineHeadings"
                    v-show="!isOutlineRowHiddenByCollapse(i)"
                    :key="i"
                    class="dock-outline-li"
                  >
                    <div
                      class="dock-outline-row"
                      :style="{ paddingLeft: `${4 + Math.max(0, h.level - 1) * 12}px` }"
                    >
                      <span
                        v-if="outlineHasChildren(mdOutlineHeadings, i)"
                        class="dock-outline-chev"
                        tabindex="0"
                        role="button"
                        :aria-expanded="!isOutlineBranchCollapsed(i)"
                        :aria-label="isOutlineBranchCollapsed(i) ? ui.outlineExpandChild : ui.outlineCollapseChild"
                        :title="isOutlineBranchCollapsed(i) ? ui.outlineExpandChild : ui.outlineCollapseChild"
                        @click.stop="toggleOutlineCollapse(i)"
                        @keydown.enter.prevent.stop="toggleOutlineCollapse(i)"
                        @keydown.space.prevent.stop="toggleOutlineCollapse(i)"
                      >
                        {{ isOutlineBranchCollapsed(i) ? '▶' : '▼' }}
                      </span>
                      <span v-else class="dock-outline-chev-spacer" aria-hidden="true" />
                      <button
                        type="button"
                        class="dock-outline-item dock-outline-item--btn"
                        :title="trOutlineJumpTitle(locale, h.line)"
                        @click="scrollToOutlineIndex(i)"
                      >
                        <span class="dock-outline-level" :aria-hidden="true">H{{ h.level }}</span>
                        <span class="dock-outline-text">{{ h.text }}</span>
                        <span class="dock-outline-ln" :title="trOutlineLineTitle(locale, h.line)">L{{ h.line }}</span>
                      </button>
                    </div>
                  </li>
                </ul>
                <p v-else class="dock-muted">{{ ui.dockNoHeadings }}</p>
              </section>
              <section class="dock-section">
                <h3 class="dock-subh">{{ ui.dockFenceOutline }}</h3>
                <div class="dock-props-actions" role="group" :aria-label="ui.dockBlockActionsAria">
                  <button
                    type="button"
                    class="dock-action"
                    :title="ui.dockClearSelectionTitle"
                    @click="clearFenceSelection"
                  >
                    {{ ui.dockClearSelection }}
                  </button>
                  <button
                    type="button"
                    class="dock-action dock-action--blue-amber"
                    :title="ui.dockInsertFenceAtEndTitle"
                    @click="openInsertCodeBlockModalFromDock"
                  >
                    {{ ui.dockInsertFenceAtEnd }}
                  </button>
                </div>
                <p class="dock-muted dock-hint dock-hint--tight">
                  {{ ui.dockFenceOutlineHint }}
                </p>
                <ul v-if="blocks.length" class="dock-fence-list" role="list">
                  <li
                    v-for="b in blocks"
                    :key="b.payload.id"
                    class="dock-fence-row"
                    :class="{ 'dock-fence-row--active': selectedBlockId === b.payload.id }"
                  >
                    <button
                      type="button"
                      class="dock-fence-select"
                      :title="trSelectFenceTitle(locale, b.kind, fenceBlockSubtypeLabel(b, locale), b.payload.id)"
                      @click="selectFenceBlock(b)"
                    >
                      <span class="dock-fence-type-line">
                        <span class="dock-fence-kind">{{ b.kind }}</span>
                        <span class="dock-fence-sub">{{ fenceBlockSubtypeLabel(b, locale) }}</span>
                      </span>
                      <code class="dock-fence-id">{{ b.payload.id }}</code>
                    </button>
                    <button
                      type="button"
                      class="dock-fence-canvas"
                      :title="canvasPrimaryActionTitle(b)"
                      @click.stop="openVisualCanvas(b)"
                    >
                      {{ ui.dockFenceOpenCanvas }}
                    </button>
                  </li>
                </ul>
                <p v-else class="dock-muted">{{ ui.dockNoFenceKinds }}</p>
              </section>
              <section v-if="showUiDesignLeftDock" class="dock-section dock-section--uisvg-left">
                <h3 class="dock-subh">{{ locale === 'en' ? 'UI design' : 'UI 设计' }}</h3>
                <p class="dock-muted dock-hint dock-hint--tight">
                  {{ locale === 'en' ? 'Outline and control library for the active ui-design canvas tab.' : '对应当前 ui-design 画布标签页的大纲与控件库。' }}
                </p>
                <div class="dock-uisvg-embed dock-uisvg-embed--left">
                  <LeftDockPanel
                    :nodes="activeUiDesignDockState?.outlineNodes ?? []"
                    :selected-ids="activeUiDesignDockState?.selectedIds ?? []"
                    @select="sendUiDesignDockCommand('outline-select', $event)"
                    @frame-in-view="sendUiDesignDockCommand('outline-frame', $event)"
                    @reparent="sendUiDesignDockCommand('outline-reparent', JSON.stringify($event))"
                    @add-basic="sendUiDesignDockCommand('add-basic', $event)"
                    @add-windows="sendUiDesignDockCommand('add-windows', $event)"
                  />
                </div>
              </section>
              <section v-if="dockSecondaryOutline" class="dock-section">
                <h3 class="dock-subh">{{ dockSecondaryOutline.heading }}</h3>
                <ul class="dock-outline-list dock-outline-list--dense">
                  <li v-for="(ln, i) in dockSecondaryOutline.lines" :key="i" class="dock-outline-item">{{ ln }}</li>
                </ul>
              </section>
              <p v-else class="dock-muted dock-hint">{{ ui.dockSecondaryPlaceholder }}</p>
            </div>
            </div>
          </aside>
          <div class="editor-column">
            <header class="doc-tabs">
              <nav class="tab-strip" role="tablist" :aria-label="ui.docTabsAria">
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
                    :title="trCloseTabTitle(locale, path)"
                    :aria-label="trCloseTabAria(locale, tabLabel(path))"
                    @click.stop="closeTab(path)"
                  >
                    ×
                  </button>
                </div>
              </nav>
            </header>
            <nav
              v-if="selectedPath && canvasTabsForCurrentFile.length"
              class="editor-subtabs"
              role="tablist"
              :aria-label="ui.subtabsAria"
            >
              <button
                type="button"
                class="subtab"
                role="tab"
                :aria-selected="activeEditorTab === 'markdown'"
                :title="ui.subtabDocTitle"
                @click="activeEditorTab = 'markdown'"
              >
                {{ ui.subtabDoc }}
              </button>
              <div
                v-for="t in canvasTabsForCurrentFile"
                :key="t.id"
                class="subtab-wrap"
                :class="{ active: activeEditorTab === t.id }"
                role="none"
              >
                <button
                  type="button"
                  class="subtab subtab-main"
                  role="tab"
                  :aria-selected="activeEditorTab === t.id"
                  :title="`${t.fenceKind} · ${t.subtypeLabel} · ${t.blockId} — ${ui.hintNoShortcut}`"
                  @click="activeEditorTab = t.id"
                >
                  <span class="subtab-meta">
                    <span class="subtab-kind">{{ t.fenceKind }}</span>
                    <span class="subtab-sep">·</span>
                    <span class="subtab-sub">{{ t.subtypeLabel }}</span>
                  </span>
                  <code class="subtab-code">{{ t.blockId }}</code>
                </button>
                <button
                  type="button"
                  class="subtab-close"
                  :title="ui.closeCanvasTabTitle"
                  :aria-label="trCloseCanvasTabAria(locale, t.blockId)"
                  @click.stop="closeCanvasTab(t.id)"
                >
                  ×
                </button>
              </div>
            </nav>
            <template v-if="selectedPath">
              <template v-if="activeEditorTab === 'markdown'">
              <div class="split-wrap">
                <div class="split">
          <section ref="mdPaneRef" class="md-pane" @contextmenu.prevent="onMdPaneContextMenu">
            <h2 class="md-pane-head">
              {{ ui.mdHeadingMarkdown }}
              <span class="md-mode-switch" role="radiogroup" :aria-label="ui.mdModeAria">
                <button
                  type="button"
                  class="md-mode-btn"
                  :class="{ 'md-mode-btn--active': mdPaneMode === 'preview' }"
                  role="radio"
                  :aria-checked="mdPaneMode === 'preview'"
                  :title="ui.mdPreviewTitle"
                  @click="setMdPaneMode('preview')"
                >
                  {{ ui.mdPreview }}
                </button>
                <button
                  type="button"
                  class="md-mode-btn"
                  :class="{ 'md-mode-btn--active': mdPaneMode === 'rich' }"
                  role="radio"
                  :aria-checked="mdPaneMode === 'rich'"
                  :title="ui.mdRichTitle"
                  @click="setMdPaneMode('rich')"
                >
                  {{ ui.mdRich }}
                </button>
                <button
                  type="button"
                  class="md-mode-btn"
                  :class="{ 'md-mode-btn--active': mdPaneMode === 'source' }"
                  role="radio"
                  :aria-checked="mdPaneMode === 'source'"
                  :title="ui.mdSourceTitle"
                  @click="setMdPaneMode('source')"
                >
                  {{ ui.mdSource }}
                </button>
              </span>
            </h2>
            <ul v-if="parseErrors.length" class="errors md-parse-errors">
              <li v-for="(e, i) in parseErrors" :key="i">{{ e }}</li>
            </ul>
            <div v-if="mdPaneMode === 'preview'" class="md-preview-outer">
              <MdMarkdownPreview ref="mdPreviewRef" :key="selectedPath ?? ''" :markdown="currentContent" />
            </div>
            <div v-else-if="mdPaneMode === 'rich'" class="md-wysiwyg-scroll">
              <MdWysiwygEditor
                ref="mdWysiwygRef"
                :key="selectedPath ?? ''"
                :model-value="currentContent"
                @update:model-value="onMdRichInput"
                @caret-offset="onMdWysiwygCaretOffset"
              />
            </div>
            <textarea
              v-show="mdPaneMode === 'source'"
              ref="mdSourceTextareaRef"
              v-model="sourceEditorText"
              class="md-source"
              spellcheck="false"
              :aria-label="ui.mdSourceAreaAria"
              :title="ui.mdSourceAreaTitle"
              @input="onMdSourceInput"
              @click="onMdSourceSelectionSync"
              @keyup="onMdSourceSelectionSync"
            />
          </section>
                </div>
              </div>
              </template>
              <div v-else class="canvas-embed-shell">
                <BlockCanvasPage
                  v-if="activeCanvasSession"
                  embedded
                  :markdown="embeddedCanvasMarkdown"
                  :rel-path="activeCanvasSession.relPath"
                  :block-id="activeCanvasSession.blockId"
                  :workspace-files="workspaceFilesRecord()"
                  :mindmap-dock-command="mindmapDockCommand"
                  :ui-design-dock-command="uiDesignDockCommand"
                  :key="activeCanvasSession.id"
                  @saved="onEmbeddedCanvasSaved"
                  @close="closeCanvasTab(activeCanvasSession.id)"
                  @codespace-dock-context="onCodespaceDockContext"
                  @mindmap-dock-state="onMindmapDockState"
                  @ui-design-dock-state="onUiDesignDockState"
                  @dirty-change="onActiveCanvasDirtyChange"
                />
              </div>
            </template>
            <p v-else class="empty empty--in-column">{{ ui.emptyPickTab }}</p>
          </div>
          <aside
            v-if="!blockOnly && showPropsDock"
            class="dock dock-right dock-area-right"
            :class="{ 'dock-area-right--buttons-only': !showRightDockView }"
            :aria-label="rightDockAreaAria"
          >
                <div v-if="showRightDockView" class="dock-view">
                  <section v-if="propertiesDockVisibleInView" class="dock-special-panel">
                    <div class="dock-special-head">
                      <h3 class="dock-subh dock-subh--special">{{ locale === 'en' ? 'Properties' : '属性' }}</h3>
                      <div class="dock-special-head-actions">
                        <button
                          type="button"
                          class="dock-special-toggle"
                          :title="propertiesDockFolded ? (locale === 'en' ? 'Expand Properties' : '展开属性') : (locale === 'en' ? 'Fold Properties' : '折叠属性')"
                          :aria-label="propertiesDockFolded ? (locale === 'en' ? 'Expand Properties' : '展开属性') : (locale === 'en' ? 'Fold Properties' : '折叠属性')"
                          @click="propertiesDockFolded = !propertiesDockFolded"
                        >
                          {{ propertiesDockFolded ? '▸' : '▾' }}
                        </button>
                        <button
                          type="button"
                          class="dock-special-toggle"
                          :title="rightDockMaximized === 'properties' ? (locale === 'en' ? 'Restore Dock size' : '还原 Dock 尺寸') : (locale === 'en' ? 'Maximize this Dock' : '最大化此 Dock')"
                          :aria-label="rightDockMaximized === 'properties' ? (locale === 'en' ? 'Restore Dock size' : '还原 Dock 尺寸') : (locale === 'en' ? 'Maximize this Dock' : '最大化此 Dock')"
                          @click="toggleRightDockMaximize('properties')"
                        >
                          {{ rightDockMaximized === 'properties' ? '🗗' : '🗖' }}
                        </button>
                        <button
                          type="button"
                          class="dock-special-toggle"
                          :title="locale === 'en' ? 'Close Properties' : '关闭属性'"
                          :aria-label="locale === 'en' ? 'Close Properties' : '关闭属性'"
                          @click="propertiesDockCollapsed = true; if (rightDockMaximized === 'properties') rightDockMaximized = null"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <template v-if="!propertiesDockFolded">
                      <template v-if="selectedBlock && selectedBlockDocLines">
                        <div class="dock-props-actions" role="group" :aria-label="ui.dockBlockActionsAria">
                          <button
                            type="button"
                            class="dock-action dock-action--primary"
                            :title="canvasPrimaryActionTitleForSelected"
                            @click="openVisualForSelected"
                          >
                            {{ canvasPrimaryActionLabelForSelected }}
                          </button>
                          <button
                            type="button"
                            class="dock-action"
                            :title="ui.editJsonTitle"
                            @click="openJsonForSelected"
                          >
                            {{ ui.editJson }}
                          </button>
                          <button
                            type="button"
                            class="dock-action"
                            :title="ui.shellEditTitle"
                            @click="openShellForSelected"
                          >
                            {{ ui.shellEdit }}
                          </button>
                        </div>
                        <p v-if="selectedBlockCanvasHint" class="dock-muted dock-canvas-hint">{{ selectedBlockCanvasHint }}</p>
                        <h3 class="dock-subh">{{ ui.basicProps }}</h3>
                        <dl class="dock-dl dock-dl--props">
                          <template v-for="(row, i) in selectedBlockDocLines" :key="i">
                            <dt>{{ row.label }}</dt>
                            <dd>{{ row.value }}</dd>
                          </template>
                        </dl>
                        <details v-if="selectedBlock.kind === 'mv-view'" class="dock-json-details dock-ref-details">
                          <summary class="dock-json-summary" :title="ui.modelRefsSummaryHover">{{ ui.modelRefsSummaryTitle }}</summary>
                          <p class="dock-muted dock-ref-doc">{{ MV_MODEL_REFS_SCHEME_DOC }}</p>
                        </details>
                        <details class="dock-json-details">
                          <summary class="dock-json-summary" :title="ui.fullJsonSummaryHover">{{ ui.fullJsonSummary }}</summary>
                          <pre class="dock-json dock-json--nested" tabindex="0">{{ JSON.stringify(selectedBlock.payload, null, 2) }}</pre>
                        </details>
                      </template>
                      <template v-if="showCodespaceDockCanvasSelection">
                        <h3 class="dock-subh">{{ ui.codespaceDockSelectionHeading }}</h3>
                        <p class="dock-muted dock-canvas-hint" :title="ui.codespaceCanvasSelectionTitle">
                          {{ codespaceDockCanvasSelectionText || ui.codespaceClickCanvas }}
                        </p>
                        <dl v-if="codespaceDockCanvasLines.length" class="dock-dl dock-dl--props">
                          <template v-for="(row, i) in codespaceDockCanvasLines" :key="'csdock-' + i">
                            <dt>{{ row.label }}</dt>
                            <dd>{{ row.value }}</dd>
                          </template>
                        </dl>
                      </template>
                      <template v-if="!(selectedBlock && selectedBlockDocLines) && !showCodespaceDockCanvasSelection">
                        <dl class="dock-dl dock-dl--props">
                          <dt>{{ ui.propsPath }}</dt>
                          <dd>{{ selectedPath }}</dd>
                          <dt>{{ ui.propsChars }}</dt>
                          <dd>{{ currentContent.length }}</dd>
                          <dt>{{ ui.propsFenceCount }}</dt>
                          <dd>{{ blocks.length }}</dd>
                          <dt>{{ ui.propsParseWarns }}</dt>
                          <dd>{{ parseErrors.length }}</dd>
                        </dl>
                        <p class="dock-muted">{{ ui.propsPickBlockHint }}</p>
                      </template>
                    </template>
                  </section>

                  <section v-if="uisvgDataDockVisibleInView" class="dock-special-panel dock-special-panel--uisvg">
                    <div class="dock-special-head">
                      <h3 class="dock-subh dock-subh--special">{{ locale === 'en' ? 'UISVG' : 'UISVG 数据' }}</h3>
                      <div class="dock-special-head-actions">
                        <button
                          type="button"
                          class="dock-special-toggle"
                          :title="locale === 'en' ? 'Close UISVG panel' : '关闭 UISVG 面板'"
                          :aria-label="locale === 'en' ? 'Close UISVG panel' : '关闭 UISVG 面板'"
                          @click="uisvgDataDockCollapsed = true"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div class="dock-uisvg-embed dock-uisvg-embed--right">
                      <DataPanel
                        :svg-markup="activeUiDesignDockState?.svgMarkup ?? ''"
                        :selected-id="activeUiDesignDockState?.selectedIds?.[0] ?? null"
                        @update:svg="sendUiDesignDockCommand('update-svg', $event)"
                        @update:selected-id="
                          sendUiDesignDockCommand('update-selected-id', $event ?? '')
                        "
                      />
                    </div>
                  </section>

                  <section v-if="mindmapFormatDockVisibleInView" class="dock-special-panel dock-special-panel--mindmap">
                    <div class="dock-special-head">
                      <h3 class="dock-subh dock-subh--special">{{ locale === 'en' ? 'Format' : '格式' }}</h3>
                      <div class="dock-special-head-actions">
                        <button
                          type="button"
                          class="dock-special-toggle"
                          :title="mindmapFormatDockFolded ? (locale === 'en' ? 'Expand Format' : '展开格式') : (locale === 'en' ? 'Fold Format' : '折叠格式')"
                          :aria-label="mindmapFormatDockFolded ? (locale === 'en' ? 'Expand Format' : '展开格式') : (locale === 'en' ? 'Fold Format' : '折叠格式')"
                          @click="mindmapFormatDockFolded = !mindmapFormatDockFolded"
                        >
                          {{ mindmapFormatDockFolded ? '▸' : '▾' }}
                        </button>
                        <button
                          type="button"
                          class="dock-special-toggle"
                          :title="rightDockMaximized === 'mindmap-format' ? (locale === 'en' ? 'Restore Dock size' : '还原 Dock 尺寸') : (locale === 'en' ? 'Maximize this Dock' : '最大化此 Dock')"
                          :aria-label="rightDockMaximized === 'mindmap-format' ? (locale === 'en' ? 'Restore Dock size' : '还原 Dock 尺寸') : (locale === 'en' ? 'Maximize this Dock' : '最大化此 Dock')"
                          @click="toggleRightDockMaximize('mindmap-format')"
                        >
                          {{ rightDockMaximized === 'mindmap-format' ? '🗗' : '🗖' }}
                        </button>
                        <button
                          type="button"
                          class="dock-special-toggle"
                          :title="locale === 'en' ? 'Close Format' : '关闭格式'"
                          :aria-label="locale === 'en' ? 'Close Format' : '关闭格式'"
                          @click="mindmapSpecialDockCollapsed = true; if (rightDockMaximized === 'mindmap-format') rightDockMaximized = null"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <template v-if="!mindmapFormatDockFolded">
                      <p class="dock-muted dock-canvas-hint">
                        {{ activeMindmapDockState?.selectedId ? `selected: ${activeMindmapDockState.selectedId}` : '请选择脑图节点' }}
                      </p>
                      <label class="dock-field">
                        <span>Label</span>
                        <input
                          class="dock-input"
                          type="text"
                          :value="activeMindmapDockState?.selectedLabel ?? ''"
                          :disabled="!activeMindmapDockState?.selectedId"
                          @change="sendMindmapDockCommand('set-label', ($event.target as HTMLInputElement).value)"
                        />
                      </label>
                      <label class="dock-field">
                        <span>Note</span>
                        <input
                          class="dock-input"
                          type="text"
                          :value="activeMindmapDockState?.selectedNote ?? ''"
                          :disabled="!activeMindmapDockState?.selectedId"
                          @change="sendMindmapDockCommand('set-note', ($event.target as HTMLInputElement).value)"
                        />
                      </label>
                      <div class="dock-field">
                        <span>{{ locale === 'en' ? 'Current style' : '当前样式' }}</span>
                        <div
                          class="dock-style-preview"
                          :style="{
                            color: activeMindmapDockState?.selectedTextColor || '#0f172a',
                            background: activeMindmapDockState?.selectedBgColor || '#ffffff',
                            fontSize: `${activeMindmapDockState?.selectedFontSize ?? 13}px`,
                            borderColor: activeMindmapDockState?.selectedBorderColor || '#94a3b8',
                            borderWidth: `${activeMindmapDockState?.selectedBorderWidth ?? 1.4}px`,
                            borderStyle: activeMindmapDockState?.selectedBorderStyle === 'bottom' ? 'none none solid none' : 'solid',
                            borderRadius: activeMindmapDockState?.selectedBorderStyle === 'square' ? '0px' : '8px',
                          }"
                        >
                          {{ activeMindmapDockState?.selectedIcon || '◉' }}
                          {{ activeMindmapDockState?.selectedLabel || (locale === 'en' ? 'Node preview' : '节点预览') }}
                        </div>
                        <small class="dock-muted">
                          {{ locale === 'en' ? 'Preview updates with current node style.' : '预览会随当前节点样式变化。' }}
                        </small>
                      </div>
                      <div class="dock-grid2">
                        <label class="dock-field">
                          <span>Text color</span>
                          <input
                            class="dock-input"
                            type="color"
                            :value="activeMindmapDockState?.selectedTextColor || '#0f172a'"
                            :disabled="!activeMindmapDockState?.selectedId"
                            @input="sendMindmapDockCommand('set-text-color', ($event.target as HTMLInputElement).value)"
                          />
                        </label>
                        <label class="dock-field">
                          <span>Background</span>
                          <input
                            class="dock-input"
                            type="color"
                            :value="activeMindmapDockState?.selectedBgColor || '#ffffff'"
                            :disabled="!activeMindmapDockState?.selectedId"
                            @input="sendMindmapDockCommand('set-bg-color', ($event.target as HTMLInputElement).value)"
                          />
                        </label>
                      </div>
                      <label class="dock-field">
                        <span>{{ locale === 'en' ? 'Border style' : '边框样式' }}</span>
                        <select
                          class="dock-input"
                          :value="activeMindmapDockState?.selectedBorderStyle ?? 'rounded'"
                          :disabled="!activeMindmapDockState?.selectedId"
                          @change="sendMindmapDockCommand('set-border-style', ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="square">{{ locale === 'en' ? 'Square' : '直角边' }}</option>
                          <option value="rounded">{{ locale === 'en' ? 'Rounded' : '圆边' }}</option>
                          <option value="bottom">{{ locale === 'en' ? 'Bottom only' : '只有下边' }}</option>
                        </select>
                      </label>
                      <div class="dock-grid2">
                        <label class="dock-field">
                          <span>{{ locale === 'en' ? 'Border width' : '边框粗细' }}</span>
                          <input
                            class="dock-input"
                            type="range"
                            min="0"
                            max="8"
                            step="0.2"
                            :value="activeMindmapDockState?.selectedBorderWidth ?? 1.4"
                            :disabled="!activeMindmapDockState?.selectedId"
                            @input="sendMindmapDockCommand('set-border-width', ($event.target as HTMLInputElement).value)"
                          />
                        </label>
                        <label class="dock-field">
                          <span>{{ locale === 'en' ? 'Border color' : '边框颜色' }}</span>
                          <input
                            class="dock-input"
                            type="color"
                            :value="activeMindmapDockState?.selectedBorderColor || '#94a3b8'"
                            :disabled="!activeMindmapDockState?.selectedId"
                            @input="sendMindmapDockCommand('set-border-color', ($event.target as HTMLInputElement).value)"
                          />
                        </label>
                      </div>
                      <label class="dock-field">
                        <span>Font size</span>
                        <input
                          class="dock-input"
                          type="range"
                          min="10"
                          max="28"
                          :value="activeMindmapDockState?.selectedFontSize ?? 13"
                          :disabled="!activeMindmapDockState?.selectedId"
                          @input="sendMindmapDockCommand('set-font-size', ($event.target as HTMLInputElement).value)"
                        />
                      </label>
                      <button type="button" class="dock-action" :disabled="!activeMindmapDockState?.selectedId" @click="sendMindmapDockCommand('set-text-color', '')">
                        {{ locale === 'en' ? 'Reset format' : '重置格式' }}
                      </button>
                    </template>
                  </section>

                  <section v-if="mindmapIconDockVisibleInView" class="dock-special-panel dock-special-panel--mindmap">
                    <div class="dock-special-head">
                      <h3 class="dock-subh dock-subh--special">{{ locale === 'en' ? 'Icon' : '图标' }}</h3>
                      <div class="dock-special-head-actions">
                        <button type="button" class="dock-special-toggle" :title="mindmapIconDockFolded ? (locale === 'en' ? 'Expand Icon' : '展开图标') : (locale === 'en' ? 'Fold Icon' : '折叠图标')" :aria-label="mindmapIconDockFolded ? (locale === 'en' ? 'Expand Icon' : '展开图标') : (locale === 'en' ? 'Fold Icon' : '折叠图标')" @click="mindmapIconDockFolded = !mindmapIconDockFolded">{{ mindmapIconDockFolded ? '▸' : '▾' }}</button>
                        <button type="button" class="dock-special-toggle" :title="rightDockMaximized === 'mindmap-icon' ? (locale === 'en' ? 'Restore panel size' : '还原面板尺寸') : (locale === 'en' ? 'Maximize this panel' : '最大化此面板')" :aria-label="rightDockMaximized === 'mindmap-icon' ? (locale === 'en' ? 'Restore panel size' : '还原面板尺寸') : (locale === 'en' ? 'Maximize this panel' : '最大化此面板')" @click="toggleRightDockMaximize('mindmap-icon')">{{ rightDockMaximized === 'mindmap-icon' ? '🗗' : '🗖' }}</button>
                        <button type="button" class="dock-special-toggle" :title="locale === 'en' ? 'Close Icon' : '关闭图标'" :aria-label="locale === 'en' ? 'Close Icon' : '关闭图标'" @click="mindmapIconDockCollapsed = true; if (rightDockMaximized === 'mindmap-icon') rightDockMaximized = null">×</button>
                      </div>
                    </div>
                    <template v-if="!mindmapIconDockFolded">
                      <p class="dock-muted dock-canvas-hint">{{ activeMindmapDockState?.selectedId ? `selected: ${activeMindmapDockState.selectedId}` : '请选择脑图节点' }}</p>
                      <label class="dock-field">
                        <span>Icon</span>
                        <select class="dock-input" :value="activeMindmapDockState?.selectedIcon ?? ''" :disabled="!activeMindmapDockState?.selectedId" @change="sendMindmapDockCommand('set-icon', ($event.target as HTMLSelectElement).value)">
                          <option value="">(none)</option>
                          <option value="⭐">⭐ Star</option>
                          <option value="🚩">🚩 Flag</option>
                          <option value="💡">💡 Bulb</option>
                          <option value="📘">📘 Book</option>
                          <option value="✅">✅ Check</option>
                          <option value="⚠️">⚠️ Warn</option>
                          <option value="❤️">❤️ Heart</option>
                          <option value="🚀">🚀 Rocket</option>
                          <option value="📌">📌 Pin</option>
                        </select>
                      </label>
                    </template>
                  </section>

                  <section v-if="mindmapThemeDockVisibleInView" class="dock-special-panel dock-special-panel--mindmap">
                    <div class="dock-special-head">
                      <h3 class="dock-subh dock-subh--special">{{ locale === 'en' ? 'Theme' : '主题' }}</h3>
                      <div class="dock-special-head-actions">
                        <button type="button" class="dock-special-toggle" :title="mindmapThemeDockFolded ? (locale === 'en' ? 'Expand Theme' : '展开主题') : (locale === 'en' ? 'Fold Theme' : '折叠主题')" :aria-label="mindmapThemeDockFolded ? (locale === 'en' ? 'Expand Theme' : '展开主题') : (locale === 'en' ? 'Fold Theme' : '折叠主题')" @click="mindmapThemeDockFolded = !mindmapThemeDockFolded">{{ mindmapThemeDockFolded ? '▸' : '▾' }}</button>
                        <button type="button" class="dock-special-toggle" :title="rightDockMaximized === 'mindmap-theme' ? (locale === 'en' ? 'Restore panel size' : '还原面板尺寸') : (locale === 'en' ? 'Maximize this panel' : '最大化此面板')" :aria-label="rightDockMaximized === 'mindmap-theme' ? (locale === 'en' ? 'Restore panel size' : '还原面板尺寸') : (locale === 'en' ? 'Maximize this panel' : '最大化此面板')" @click="toggleRightDockMaximize('mindmap-theme')">{{ rightDockMaximized === 'mindmap-theme' ? '🗗' : '🗖' }}</button>
                        <button type="button" class="dock-special-toggle" :title="locale === 'en' ? 'Close Theme' : '关闭主题'" :aria-label="locale === 'en' ? 'Close Theme' : '关闭主题'" @click="mindmapThemeDockCollapsed = true; if (rightDockMaximized === 'mindmap-theme') rightDockMaximized = null">×</button>
                      </div>
                    </div>
                    <template v-if="!mindmapThemeDockFolded">
                      <label class="dock-field">
                        <span>Theme</span>
                        <select class="dock-input" :value="activeMindmapDockState?.theme ?? 'classic'" @change="sendMindmapDockCommand('set-theme', ($event.target as HTMLSelectElement).value)">
                          <option value="classic">Classic</option>
                          <option value="night">Night</option>
                          <option value="forest">Forest</option>
                        </select>
                      </label>
                    </template>
                  </section>

                </div>
                <div class="dock-button-bar" aria-label="Dock Button Bar">
                  <button
                    type="button"
                    class="dock-button"
                    :class="{ 'dock-button--active': hasPropertiesDockPanel && !propertiesDockCollapsed }"
                    :disabled="!hasPropertiesDockPanel"
                    :title="locale === 'en' ? 'Toggle Properties — no global shortcut' : '切换属性 — 无全局快捷键'"
                    :aria-label="locale === 'en' ? 'Toggle Properties' : '切换属性'"
                    @click="propertiesDockCollapsed = !propertiesDockCollapsed; if (!propertiesDockCollapsed && (rightDockMaximized === 'mindmap-format' || rightDockMaximized === 'mindmap-icon' || rightDockMaximized === 'mindmap-theme')) rightDockMaximized = null"
                  >
                    {{ locale === 'en' ? 'Props' : '属性' }}
                  </button>
                  <button
                    v-if="hasMindmapFormatDockPanel"
                    type="button"
                    class="dock-button"
                    :class="{ 'dock-button--active': !mindmapSpecialDockCollapsed }"
                    :title="locale === 'en' ? 'Toggle Format — no global shortcut' : '切换格式 — 无全局快捷键'"
                    :aria-label="locale === 'en' ? 'Toggle Format' : '切换格式'"
                    @click="mindmapSpecialDockCollapsed = !mindmapSpecialDockCollapsed; if (!mindmapSpecialDockCollapsed && rightDockMaximized === 'properties') rightDockMaximized = null"
                  >
                    {{ locale === 'en' ? 'Fmt' : '格式' }}
                  </button>
                  <button
                    v-if="hasMindmapIconDockPanel"
                    type="button"
                    class="dock-button"
                    :class="{ 'dock-button--active': !mindmapIconDockCollapsed }"
                    :title="locale === 'en' ? 'Toggle Icon — no global shortcut' : '切换图标 — 无全局快捷键'"
                    :aria-label="locale === 'en' ? 'Toggle Icon' : '切换图标'"
                    @click="mindmapIconDockCollapsed = !mindmapIconDockCollapsed; if (!mindmapIconDockCollapsed && rightDockMaximized === 'properties') rightDockMaximized = null"
                  >
                    {{ locale === 'en' ? 'Icon' : '图标' }}
                  </button>
                  <button
                    v-if="hasMindmapThemeDockPanel"
                    type="button"
                    class="dock-button"
                    :class="{ 'dock-button--active': !mindmapThemeDockCollapsed }"
                    :title="locale === 'en' ? 'Toggle Theme — no global shortcut' : '切换主题 — 无全局快捷键'"
                    :aria-label="locale === 'en' ? 'Toggle Theme' : '切换主题'"
                    @click="mindmapThemeDockCollapsed = !mindmapThemeDockCollapsed; if (!mindmapThemeDockCollapsed && rightDockMaximized === 'properties') rightDockMaximized = null"
                  >
                    {{ locale === 'en' ? 'Theme' : '主题' }}
                  </button>
                  <button
                    v-if="hasUisvgDataDockPanel"
                    type="button"
                    class="dock-button"
                    :class="{ 'dock-button--active': !uisvgDataDockCollapsed }"
                    :title="locale === 'en' ? 'Toggle UISVG data panel' : '切换 UISVG 数据面板'"
                    :aria-label="locale === 'en' ? 'UISVG' : 'UISVG'"
                    @click="uisvgDataDockCollapsed = !uisvgDataDockCollapsed"
                  >
                    {{ locale === 'en' ? 'UISVG' : 'UISVG' }}
                  </button>
                </div>
          </aside>
        </div>
      </template>
    </main>
    <footer v-if="!blockOnly" class="statusbar" role="status" :title="ui.statusReady" @click="onStatusClick">
      <span class="status-left" :title="statusLeftText">{{ statusLeftText }}</span>
      <span class="status-right">
        <span :title="ui.statusShellTooltip">{{ ui.statusShellPrefix }} {{ shell }}</span>
        <span class="status-sep" aria-hidden="true">|</span>
        <span :title="ui.statusDocTooltip">{{ ui.statusDocPrefix }} {{ sortedPaths.length }}</span>
        <template v-if="selectedPath">
          <span class="status-sep" aria-hidden="true">|</span>
          <span class="status-path" :title="selectedPath">{{ selectedPath }}</span>
        </template>
      </span>
    </footer>
    <div v-if="editOpen" class="modal-back" @click.self="editOpen = false">
      <div class="modal">
        <h3>{{ trModalEditTitle(locale, editBlockId ?? '') }}</h3>
        <textarea v-model="editJson" class="json-area" spellcheck="false" />
        <div class="modal-actions">
          <button type="button" @click="editOpen = false">{{ ui.modalCancel }}</button>
          <button type="button" class="primary" @click="applyEdit">{{ ui.modalSaveMd }}</button>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-show="mdCtxOpen"
        ref="mdCtxMenuRef"
        class="md-ctx-menu"
        role="menu"
        :aria-label="ui.mdCtxAria"
        :style="{ left: mdCtxX + 'px', top: mdCtxY + 'px' }"
        @click.stop
        @contextmenu.prevent
      >
        <button
          type="button"
          class="ctx-item"
          role="menuitemradio"
          :aria-checked="mdPaneMode === 'preview'"
          :title="ui.ctxPreviewTitle"
          @click="setMdPaneMode('preview')"
        >
          {{ ui.ctxPreview }}
        </button>
        <button
          type="button"
          class="ctx-item"
          role="menuitemradio"
          :aria-checked="mdPaneMode === 'rich'"
          :title="ui.ctxRichTitle"
          @click="setMdPaneMode('rich')"
        >
          {{ ui.ctxRich }}
        </button>
        <button
          type="button"
          class="ctx-item"
          role="menuitemradio"
          :aria-checked="mdPaneMode === 'source'"
          :title="ui.ctxSourceTitle"
          @click="setMdPaneMode('source')"
        >
          {{ ui.ctxSource }}
        </button>
        <div class="ctx-sep" role="separator" aria-hidden="true" />
        <button
          type="button"
          class="ctx-item"
          role="menuitem"
          :disabled="!selectedPath || mdPaneMode === 'preview'"
          :title="
            !selectedPath
              ? ui.ctxInsertNoDocTitle
              : mdPaneMode === 'preview'
                ? ui.ctxInsertPreviewTitle
                : ui.ctxInsertTitle
          "
          @click="openInsertCodeBlockModal"
        >
          {{ ui.ctxInsert }}
        </button>
      </div>
    </Teleport>
    <InsertCodeBlockModal
      :open="insertCodeBlockOpen"
      @close="insertCodeBlockOpen = false"
      @select="onInsertCodeBlockSelect"
    />
    <div v-if="logOpen" class="modal-back log-modal-back" @click.self="logOpen = false">
      <div class="modal log-modal">
        <h3>{{ ui.logTitle }}</h3>
        <p class="log-hint">{{ ui.logHint }}</p>
        <pre class="log-body" tabindex="0">{{ logTextPlain }}</pre>
        <div class="modal-actions">
          <button type="button" @click="logOpen = false">{{ ui.logClose }}</button>
          <button type="button" class="primary" :title="`${ui.logCopyAll} — ${ui.hintNoShortcut}`" @click="copyLogToClipboard">{{ ui.logCopyAll }}</button>
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
.layout:fullscreen,
.layout:-webkit-full-screen {
  min-height: 100vh;
  height: 100%;
  box-sizing: border-box;
  background: #e8ecf4;
}
.layout.blockOnly .main {
  max-width: 100%;
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
.toolbar-start {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}
.toolbar-fill {
  flex: 1 1 12px;
  min-width: 4px;
  height: 1px;
}
.tb-btn-fullscreen {
  flex-shrink: 0;
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
.tb-btn.tb-btn-dirty:not(:disabled) {
  border-color: #c2410c;
  background: linear-gradient(to bottom, #fb923c, #ea580c);
  color: #fff;
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
.workspace-row {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-height: 0;
  min-width: 0;
}
/** 左右 Dock 之间的中间列：顶为文档标签，下为 Markdown（及画布子标签时的嵌入画布） */
.editor-column {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.editor-column > .doc-tabs {
  flex-shrink: 0;
}
.editor-subtabs {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0;
  padding: 4px 8px 0;
  background: #e2e8f0;
  border-bottom: 1px solid #94a3b8;
}
.subtab {
  margin: 0 2px 4px 0;
  padding: 5px 12px;
  font: inherit;
  font-size: 0.82rem;
  border: 1px solid #94a3b8;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #f1f5f9;
  color: #334155;
  cursor: pointer;
}
.subtab[aria-selected='true'] {
  background: #fff;
  border-color: #64748b #64748b #fff;
  margin-bottom: -1px;
  padding-bottom: 6px;
  font-weight: 600;
  color: #0f172a;
}
.subtab-wrap {
  display: inline-flex;
  align-items: stretch;
  margin: 0 2px 4px 0;
  border: 1px solid #94a3b8;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #f1f5f9;
}
.subtab-wrap.active {
  background: #fff;
  border-color: #64748b #64748b #fff;
  margin-bottom: -1px;
}
.subtab-wrap .subtab-main {
  margin: 0;
  border: none;
  border-radius: 6px 0 0 0;
  background: transparent;
  padding: 5px 8px 5px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
}
.subtab-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  line-height: 1.2;
}
.subtab-kind {
  font-weight: 700;
  color: #4338ca;
}
.subtab-sub {
  font-weight: 600;
  color: #475569;
}
.subtab-sep {
  color: #94a3b8;
  font-weight: 400;
}
.subtab-wrap.active .subtab-main {
  font-weight: 600;
  color: #0f172a;
}
.subtab-code {
  font-size: 0.76rem;
}
.subtab-close {
  margin: 0;
  padding: 0 8px;
  border: none;
  border-left: 1px solid #cbd5e1;
  background: transparent;
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
  border-radius: 0 6px 0 0;
}
.subtab-close:hover {
  color: #b91c1c;
  background: rgba(185, 28, 28, 0.08);
}
.subtab-wrap.active .subtab-close {
  border-left-color: #e2e8f0;
}
.canvas-embed-shell {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.split-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.dock {
  width: 244px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #eef1f7;
  border: 1px solid #c5c9d4;
}
.dock-left {
  border-right: none;
}
.dock-right {
  border-left: none;
}
.dock.dock--collapsed {
  width: 36px;
  min-width: 36px;
}
.dock-left.dock--collapsed .dock-titlebar {
  flex-direction: column;
  align-items: stretch;
  padding: 8px 4px;
  gap: 0;
}
.dock-right.dock--collapsed .dock-titlebar--right {
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  gap: 0;
}
.dock-titlebar--right {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.dock-title--trailing {
  margin-left: auto;
}
.dock-collapse-toggle {
  margin: 0;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  padding: 2px 8px;
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.2;
  cursor: pointer;
  color: #1e293b;
  background: #fff;
  flex-shrink: 0;
}
.dock-left .dock-collapse-toggle:not(.dock-collapse-toggle--fill) {
  margin-left: auto;
}
.dock-right .dock-collapse-toggle:not(.dock-collapse-toggle--fill) {
  margin-left: 0;
  margin-right: 0;
}
.dock-collapse-toggle:hover {
  border-color: #64748b;
  background: #f8fafc;
}
.dock-collapse-toggle--fill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 8px 4px;
  border: none;
  background: transparent;
  border-radius: 6px;
}
.dock-collapse-toggle--fill:hover {
  background: rgba(37, 99, 235, 0.08);
}
.dock-vlabel {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #1e293b;
}
.dock-titlebar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #1e293b;
  background: linear-gradient(to bottom, #e2e8f0, #d8dee9);
  border-bottom: 1px solid #c5c9d4;
  border-radius: 6px 6px 0 0;
}
.dock-title {
  letter-spacing: 0.02em;
}
.dock-left:not(.dock--collapsed) .dock-titlebar {
  justify-content: flex-start;
}
.dock.dock--collapsed .dock-titlebar {
  flex: 1 1 auto;
  min-height: 0;
  border-bottom: none;
  flex-shrink: 1;
}
.dock-ghost {
  margin: 0;
  padding: 2px 8px;
  font-size: 0.72rem;
  cursor: pointer;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  background: #fff;
  color: #475569;
}
.dock-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 10px 12px;
}
.dock-section {
  margin-bottom: 14px;
}
.dock-section:last-child {
  margin-bottom: 0;
}
.dock-subh {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: none;
  color: #64748b;
  letter-spacing: 0.02em;
}
.dock-subh-inline {
  margin-bottom: 8px;
}
.dock-outline-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.dock-outline-list--dense .dock-outline-item {
  font-size: 0.75rem;
}
.dock-outline-li {
  margin: 0 0 4px;
  list-style: none;
}
.dock-outline-row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 2px;
  box-sizing: border-box;
}
.dock-outline-chev,
.dock-outline-chev-spacer {
  flex-shrink: 0;
  width: 1.25em;
  min-height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  line-height: 1;
  color: #64748b;
  user-select: none;
  align-self: stretch;
}
.dock-outline-chev {
  border-radius: 3px;
  cursor: pointer;
}
.dock-outline-chev:hover {
  background: rgba(148, 163, 184, 0.35);
  color: #0f172a;
}
.dock-outline-item {
  padding: 4px 6px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: #0f172a;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid transparent;
}
.dock-outline-item--btn {
  flex: 1;
  min-width: 0;
  margin: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  text-align: left;
  font: inherit;
  cursor: pointer;
  box-sizing: border-box;
}
.dock-outline-item--btn:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: #cbd5e1;
}
.dock-outline-level {
  flex-shrink: 0;
  min-width: 1.75em;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}
.dock-outline-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dock-outline-ln {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 0.68rem;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}
.dock-muted {
  margin: 0;
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.4;
}
.dock-hint {
  margin-top: 8px;
}
.dock-canvas-hint {
  margin: 0 0 10px;
}
.dock-dl {
  margin: 0;
  font-size: 0.78rem;
}
.dock-dl dt {
  margin: 8px 0 2px;
  font-weight: 600;
  color: #64748b;
  font-size: 0.7rem;
}
.dock-dl dd {
  margin: 0;
  word-break: break-all;
  color: #0f172a;
}
.dock-props-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.dock-action {
  font-size: 0.76rem;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
}
.dock-action:hover {
  border-color: #64748b;
  background: #f8fafc;
}
.dock-action--primary {
  font-weight: 600;
  border-color: #2563eb;
  color: #1d4ed8;
  background: #eff6ff;
}
.dock-action--primary:hover {
  background: #dbeafe;
  border-color: #1d4ed8;
}
/** 实心蓝底 + 橘黄字（插入代码块主行动点） */
.dock-action--blue-amber {
  font-weight: 600;
  border: 1px solid #1d4ed8;
  background: #2563eb;
  color: #fbbf24;
}
.dock-action--blue-amber:hover {
  background: #1d4ed8;
  border-color: #1e40af;
  color: #fcd34d;
}
.dock-action--blue-amber:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}
.dock-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 10px;
}
.dock-field span {
  font-size: 0.72rem;
  color: #64748b;
}
.dock-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.78rem;
}
.dock-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.dock-dl--props dt:first-child {
  margin-top: 0;
}
.dock-special-panel {
  margin-top: 10px;
  border: 1px solid #c5c9d4;
  border-radius: 6px;
  background: #f8fafc;
  overflow: hidden;
}
.dock-special-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: linear-gradient(to bottom, #e2e8f0, #d8dee9);
  border-bottom: 1px solid #c5c9d4;
  border-radius: 6px 6px 0 0;
}
.dock-special-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dock-special-toggle {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  border-radius: 6px;
  min-width: 28px;
  width: auto;
  height: 22px;
  line-height: 1;
  font-size: 11px;
  font-weight: 600;
  padding: 0 4px;
  cursor: pointer;
}
.dock-style-preview {
  min-height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  line-height: 1.3;
}
.dock-special-panel > :not(.dock-special-head) {
  padding: 8px 10px 10px;
}
.dock-area-right {
  display: flex;
  flex-direction: row;
  min-height: 0;
  gap: 0;
}
.dock-area-left {
  display: flex;
  flex-direction: row;
  min-height: 0;
  gap: 0;
}
.dock-area-left--buttons-only {
  width: 48px;
  min-width: 48px;
}
.dock-area-left--buttons-only .dock-button-bar--left {
  border-right: none;
  padding-right: 0;
  margin-right: 0;
}
.dock-area-right--buttons-only {
  width: 48px;
  min-width: 48px;
}
.dock-area-right--buttons-only .dock-button-bar {
  border-left: none;
  padding-left: 0;
  margin-left: 0;
}
.dock-view {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
}
.dock-button-bar {
  display: flex;
  flex: 0 0 36px;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
  border-left: 1px solid #e2e8f0;
  padding-left: 6px;
  margin-left: 2px;
}
.dock-button-bar--left {
  border-left: none;
  border-right: 1px solid #e2e8f0;
  padding-left: 0;
  padding-right: 6px;
  margin-left: 0;
  margin-right: 2px;
}
.dock-button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  border-radius: 6px;
  min-height: 60px;
  width: 30px;
  cursor: pointer;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding: 4px 0;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.dock-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dock-button--active {
  border-color: #2563eb;
  color: #1d4ed8;
  background: #eff6ff;
}
.dock-subh--special {
  margin: 0;
  color: #1e293b;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.dock-json-details {
  margin-top: 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  overflow: hidden;
}
.dock-json-summary {
  padding: 6px 10px;
  font-size: 0.74rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.dock-json-summary::-webkit-details-marker {
  display: none;
}
.dock-json-details[open] .dock-json-summary {
  border-bottom: 1px solid #e2e8f0;
}
.dock-ref-details {
  margin-bottom: 8px;
}
.dock-ref-doc {
  margin: 0;
  padding: 8px 10px 10px;
  font-size: 0.74rem;
  line-height: 1.45;
}
.dock-json {
  margin: 0;
  padding: 8px;
  max-height: min(60vh, 520px);
  overflow: auto;
  font-size: 0.72rem;
  line-height: 1.35;
  font-family: ui-monospace, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
.dock-json--nested {
  border: none;
  border-radius: 0;
  max-height: min(50vh, 420px);
}
.split {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
}
.md-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}
.md-pane-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin: 0 0 4px;
  font-size: 1rem;
}
.md-mode-switch {
  display: inline-flex;
  align-items: stretch;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  overflow: hidden;
  flex-shrink: 0;
}
.md-mode-btn {
  margin: 0;
  padding: 3px 10px;
  font-size: 0.68rem;
  font-weight: 600;
  border: none;
  border-right: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  line-height: 1.35;
}
.md-mode-btn:last-child {
  border-right: none;
}
.md-mode-btn:hover:not(.md-mode-btn--active) {
  background: #f1f5f9;
  color: #334155;
}
.md-mode-btn--active {
  background: #e2e8f0;
  color: #0f172a;
}
.md-mode-btn--active:nth-child(1) {
  background: #eff6ff;
  color: #1d4ed8;
}
.md-mode-btn--active:nth-child(2) {
  background: #ecfdf5;
  color: #166534;
}
.md-mode-btn--active:nth-child(3) {
  background: #fff7ed;
  color: #9a3412;
}
.md-preview-outer {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.md-parse-errors {
  flex-shrink: 0;
  margin: 0 0 8px;
  padding-left: 1.1rem;
}
.dock-hint--tight {
  margin-top: 0;
  margin-bottom: 8px;
}
.dock-fence-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.dock-fence-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-bottom: 6px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.dock-fence-row--active {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.dock-fence-select {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 6px 8px;
  margin: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.72rem;
  text-align: left;
  cursor: pointer;
  color: #0f172a;
}
.dock-fence-type-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.dock-fence-sub {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 600;
  color: #475569;
}
.dock-fence-select:hover {
  background: #f1f5f9;
}
.dock-fence-kind {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  background: #eef2ff;
  color: #3730a3;
}
.dock-fence-id {
  font-size: 0.7rem;
  word-break: break-all;
}
.dock-fence-canvas {
  flex-shrink: 0;
  margin: 0;
  padding: 4px 10px;
  border: none;
  border-left: 1px solid #e2e8f0;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(to bottom, #4f46e5, #4338ca);
}
.dock-fence-canvas:hover {
  background: linear-gradient(to bottom, #6366f1, #4f46e5);
}
.md-wysiwyg-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.md-source {
  flex: 1;
  min-height: 160px;
  width: 100%;
  margin: 0;
  resize: none;
  box-sizing: border-box;
  padding: 10px 12px;
  font-family: ui-monospace, Consolas, 'Cascadia Code', monospace;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #0f172a;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
.md-ctx-menu {
  position: fixed;
  z-index: 200;
  min-width: 208px;
  padding: 4px 0;
  background: #fff;
  border: 1px solid #a8b0c4;
  border-radius: 4px;
  box-shadow: 2px 4px 12px rgba(15, 23, 42, 0.15);
}
.md-ctx-menu .ctx-item {
  display: block;
  width: 100%;
  margin: 0;
  border: none;
  padding: 8px 14px;
  font: inherit;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  color: #0f172a;
  background: transparent;
}
.md-ctx-menu .ctx-item:hover:not(:disabled) {
  background: #2563eb;
  color: #fff;
}
.md-ctx-menu .ctx-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.md-ctx-menu .ctx-sep {
  height: 1px;
  margin: 4px 8px;
  background: #e2e8f0;
  border: none;
}
.md-ctx-menu .ctx-note {
  padding: 8px 14px 6px;
  font-size: 0.76rem;
  line-height: 1.35;
  color: #475569;
}
.muted {
  color: #888;
  font-size: 0.8rem;
}
.empty {
  padding: 24px;
  color: #888;
}
.empty--in-column {
  flex: 1;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
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

<style>
/* 预览 / 所见即所得：大纲跳转后标题闪烁（类名由脚本挂在 h1–h6 上，须非 scoped） */
@keyframes mvwb-heading-flash-keyframes {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.55);
    background-color: rgba(191, 219, 254, 0.45);
  }
  40% {
    box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.12);
    background-color: rgba(191, 219, 254, 0.28);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
    background-color: transparent;
  }
}
.mvwb-heading-flash {
  border-radius: 4px;
  animation: mvwb-heading-flash-keyframes 1.1s ease-out 1;
}

.dock-uisvg-embed {
  min-height: 180px;
  max-height: min(56vh, 520px);
  overflow: auto;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.dock-uisvg-embed--left .left-dock-panel {
  min-height: 200px;
}

.dock-uisvg-embed--right .data-panel {
  min-height: 220px;
}
</style>
