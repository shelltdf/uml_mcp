<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  MV_MAP_CANVAS_TITLE,
  MV_MODEL_CANVAS_TITLE,
  MV_MODEL_REFS_SCHEME_DOC,
  MV_VIEW_KIND_METADATA,
  isMermaidViewKind,
  parseMarkdownBlocks,
  replaceBlockInnerById,
  type MvFenceKind,
  type MvMapPayload,
  type MvModelPayload,
  type MvViewPayload,
  type ParsedFenceBlock,
} from '@mvwb/core';
import { detectShell } from './platform';
import MdMarkdownPreview from './components/MdMarkdownPreview.vue';
import MdWysiwygEditor from './components/MdWysiwygEditor.vue';
import BlockCanvasPage from './components/BlockCanvasPage.vue';
import InsertCodeBlockModal from './components/InsertCodeBlockModal.vue';
import { buildFenceMarkdownForInsert, type InsertCodeBlockKind } from './utils/code-block-insert';

const shell = computed(() => detectShell());
const files = ref<Map<string, string>>(new Map());
const selectedPath = ref<string | null>(null);
const parseErrors = ref<string[]>([]);
const editOpen = ref(false);
const editJson = ref('');
const editBlockId = ref<string | null>(null);
const workspaceHint = ref('请用「打开文件夹」选择含 .md 的目录（浏览器）或使用 Electron / VS Code 扩展。');
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
}
const canvasTabs = ref<CanvasTabSpec[]>([]);
/** `'markdown'` = 中间列仅 Markdown 编辑；否则为 `canvasTabs` 中某条 `id` */
const activeEditorTab = ref<'markdown' | string>('markdown');
const electronApi = computed(() => (typeof window !== 'undefined' ? window.electronAPI : undefined));
const openMenu = ref<null | 'file' | 'view' | 'help'>(null);
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
const mdSourceTextareaRef = ref<HTMLTextAreaElement | null>(null);
const insertCodeBlockOpen = ref(false);
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
  const menu = mdCtxMenuRef.value;
  if (mdCtxOpen.value && menu && !menu.contains(t)) closeMdContextMenu();
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
  if (!selectedPath.value) {
    logLine('请先打开或新建一个 Markdown 文档', 'warn');
    return;
  }
  if (mdPaneMode.value === 'preview') {
    logLine('插入代码块请先将 Markdown 区切换到「富文本」或「原始文本」', 'warn');
    return;
  }
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

function onInsertCodeBlockSelect(kind: InsertCodeBlockKind) {
  const p = selectedPath.value;
  if (!p) return;
  if (mdPaneMode.value === 'preview') {
    insertCodeBlockOpen.value = false;
    return;
  }
  const fence = buildFenceMarkdownForInsert(kind, {
    currentFileRel: p,
    currentMarkdown: files.value.get(p) ?? '',
  });
  insertCodeBlockOpen.value = false;
  if (mdPaneMode.value === 'rich') {
    mdWysiwygRef.value?.insertMarkdown(fence);
  } else {
    insertIntoSourceAtCursor(fence);
  }
  logLine(`已插入围栏代码块：${kind}`, 'info');
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
        logLine(`自动写盘失败：${String(err)}`, 'error');
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
    logLine('全屏切换失败（浏览器可能不允许或需用户手势）', 'warn');
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

/** 索引行 / 子标签：围栏语言（mv-model 等）之外的子类型（如 mv-view 的 kind、表标题） */
function fenceBlockSubtypeLabel(b: ParsedFenceBlock): string {
  if (b.kind === 'mv-model') {
    const p = b.payload as MvModelPayload;
    const t = p.title?.trim();
    return t || '数据表';
  }
  if (b.kind === 'mv-view') {
    return (b.payload as MvViewPayload).kind;
  }
  if (b.kind === 'mv-map') {
    const p = b.payload as MvMapPayload;
    const n = p.rules?.length ?? 0;
    return n > 0 ? `映射 · ${n} 条` : '映射';
  }
  return '—';
}

function refreshCanvasTabSubtypesForPath(relPath: string, markdown: string) {
  const { blocks: bl } = parseMarkdownBlocks(markdown);
  canvasTabs.value = canvasTabs.value.map((t) => {
    if (t.relPath !== relPath) return t;
    const hit = bl.find((b) => b.payload.id === t.blockId);
    if (!hit) return t;
    return { ...t, fenceKind: hit.kind, subtypeLabel: fenceBlockSubtypeLabel(hit) };
  });
}

/** 左侧 Dock：当前选中的围栏块（用于大纲第二段与右侧属性） */
const selectedBlockId = ref<string | null>(null);
const showOutlineDock = ref(true);
const showPropsDock = ref(true);
/** 大纲 Dock 在「已显示」前提下可折叠为窄条，不占 244px 全宽 */
const outlineDockCollapsed = ref(false);
/** 属性 Dock 同上 */
const propsDockCollapsed = ref(false);

function toggleShowOutlineDockMenu() {
  showOutlineDock.value = !showOutlineDock.value;
  if (showOutlineDock.value) outlineDockCollapsed.value = false;
  closeMenus();
}

function toggleShowPropsDockMenu() {
  showPropsDock.value = !showPropsDock.value;
  if (showPropsDock.value) propsDockCollapsed.value = false;
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
  const lines: DockPropLine[] = [
    { label: '类型', value: b.kind },
    { label: '子类型', value: fenceBlockSubtypeLabel(b) },
    { label: '块 ID', value: b.payload.id },
    { label: '围栏行', value: `L${b.startLine}–L${b.endLine}` },
    { label: '正文长度', value: `${b.rawInner.length} 字符` },
  ];
  if (b.kind === 'mv-model') {
    lines.push({ label: '代码块画布', value: MV_MODEL_CANVAS_TITLE });
    const p = b.payload as MvModelPayload;
    if (p.title) lines.push({ label: '标题', value: p.title });
    lines.push({ label: '列数', value: String(p.columns.length) });
    lines.push({ label: '行数', value: String(p.rows.length) });
  } else if (b.kind === 'mv-view') {
    const p = b.payload as MvViewPayload;
    lines.push({ label: '代码块画布', value: MV_VIEW_KIND_METADATA[p.kind].canvasTitle });
    if (p.title) lines.push({ label: '标题', value: p.title });
    lines.push({
      label: 'Model 地址 (modelRefs)',
      value: p.modelRefs.length ? p.modelRefs.join('；') : '（未绑定，须填写）',
    });
    if (p.payload != null && String(p.payload).length) {
      const s = String(p.payload);
      lines.push({ label: 'payload 概要', value: s.length > 140 ? `${s.slice(0, 137)}…` : s });
    }
  } else if (b.kind === 'mv-map') {
    const p = b.payload as MvMapPayload;
    lines.push({ label: '代码块画布', value: MV_MAP_CANVAS_TITLE });
    lines.push({ label: '映射规则', value: `${p.rules.length} 条` });
  }
  return lines;
});

const canvasPrimaryActionLabelForSelected = computed(() => {
  const b = selectedBlock.value;
  return b ? canvasPrimaryActionLabel(b) : '打开代码块画布';
});

const canvasPrimaryActionTitleForSelected = computed(() => {
  const b = selectedBlock.value;
  return b ? canvasPrimaryActionTitle(b) : '打开代码块画布 — 无全局快捷键';
});

const selectedBlockCanvasHint = computed(() => {
  const b = selectedBlock.value;
  if (!b) return '';
  if (b.kind === 'mv-model') return 'Model 以文档内 mv-model 围栏代码块存储：在数据表代码块画布中编辑列与行。';
  if (b.kind === 'mv-map') return 'Map 以 mv-map 围栏代码块存储：在映射规则代码块画布中编辑 JSON。';
  if (b.kind === 'mv-view') {
    return MV_VIEW_KIND_METADATA[(b.payload as MvViewPayload).kind].description;
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

function extractMermaidClassNames(src: string): string[] {
  const names = new Set<string>();
  for (const m of (src || '').matchAll(/\bclass\s+(\w+)/g)) names.add(m[1]);
  return [...names].sort();
}

function extractMindmapNodeLabels(payload: string): string[] {
  const s = payload.trim();
  if (!s) return [];
  try {
    const o = JSON.parse(s) as { nodes?: Array<{ id?: string; label?: string }> };
    if (!o?.nodes || !Array.isArray(o.nodes)) return [];
    return o.nodes.map((n) => (n.label ?? n.id ?? '?').toString()).filter(Boolean);
  } catch {
    return ['（payload 非 JSON 或无法解析节点）'];
  }
}

function extractPlantumlNames(src: string): string[] {
  const names = new Set<string>();
  for (const pat of [/\bentity\s+(\w+)/gi, /\bclass\s+(\w+)/gi, /\binterface\s+(\w+)/gi, /\benum\s+(\w+)/gi]) {
    for (const m of src.matchAll(pat)) names.add(m[1]!);
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

function extractActivityOutline(src: string): string[] {
  const lines = (src || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  for (const l of lines) {
    if (/^(@startuml|@enduml|skinparam|title|legend)/i.test(l)) continue;
    if (l.startsWith(':') || /^if\s/i.test(l) || /^repeat\b/i.test(l) || /^while\b/i.test(l) || /^\|/.test(l)) {
      out.push(l.length > 52 ? `${l.slice(0, 49)}…` : l);
    }
    if (out.length >= 14) break;
  }
  return out.length ? out : ['（未从 payload 识别活动步骤，可在代码块画布中编辑）'];
}

function uiDesignOutlineLines(payload: string): string[] {
  const t = (payload || '').trim();
  if (!t) return ['（payload 为空）'];
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      const keys = Object.keys(o);
      return keys.length ? keys.slice(0, 18).map((k) => `· ${k}`) : ['（空对象）'];
    } catch {
      return [t.length > 96 ? `${t.slice(0, 93)}…` : t];
    }
  }
  return [t.length > 96 ? `${t.slice(0, 93)}…` : t];
}

function canvasPrimaryActionLabel(b: ParsedFenceBlock): string {
  if (b.kind === 'mv-model') return `打开${MV_MODEL_CANVAS_TITLE}`;
  if (b.kind === 'mv-map') return `打开${MV_MAP_CANVAS_TITLE}`;
  if (b.kind === 'mv-view') {
    const k = (b.payload as MvViewPayload).kind;
    return `打开${MV_VIEW_KIND_METADATA[k].canvasTitle}`;
  }
  return '打开代码块画布';
}

function canvasPrimaryActionTitle(b: ParsedFenceBlock): string {
  return `${canvasPrimaryActionLabel(b)} — 在中间列以标签打开 — 无全局快捷键`;
}

const dockSecondaryOutline = computed((): { heading: string; lines: string[] } | null => {
  const b = selectedBlock.value;
  if (!b) return null;
  if (b.kind === 'mv-model') {
    const p = b.payload as MvModelPayload;
    const lines = p.columns.map((c) => `${c.name}${c.type ? ` · ${c.type}` : ''}${c.nullable ? ' · 可空' : ''}`);
    lines.unshift(`行数: ${p.rows.length}`);
    return { heading: '当前块 · 表', lines };
  }
  if (b.kind === 'mv-view') {
    const p = b.payload as MvViewPayload;
    if (isMermaidViewKind(p.kind)) {
      if (p.kind === 'mermaid-class') {
        const cls = extractMermaidClassNames(p.payload ?? '');
        return {
          heading: '当前块 · classDiagram',
          lines: cls.length ? cls : ['（未匹配到 class 关键字）'],
        };
      }
      const excerpt = (p.payload ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 12);
      const shortTitle = MV_VIEW_KIND_METADATA[p.kind].canvasTitle.replace(/画布$/, '').trim();
      return {
        heading: `当前块 · ${shortTitle}`,
        lines: excerpt.length ? excerpt : ['（payload 为空）'],
      };
    }
    if (p.kind === 'mindmap-ui') {
      const nodes = extractMindmapNodeLabels(p.payload ?? '');
      return { heading: '当前块 · 脑图节点', lines: nodes };
    }
    if (p.kind === 'uml-diagram' || p.kind === 'uml-class') {
      const els = extractPlantumlNames(p.payload ?? '');
      return {
        heading: p.kind === 'uml-class' ? '当前块 · Class (PlantUML)' : '当前块 · UML (通用)',
        lines: els.length ? els : ['（未匹配 entity/class/interface/enum）'],
      };
    }
    if (p.kind === 'uml-sequence') {
      const parts = extractSequenceParticipants(p.payload ?? '');
      return {
        heading: '当前块 · 序列图',
        lines: parts.length ? parts : ['（未匹配 participant/actor）'],
      };
    }
    if (p.kind === 'uml-activity') {
      return { heading: '当前块 · 活动图', lines: extractActivityOutline(p.payload ?? '') };
    }
    if (p.kind === 'ui-design') {
      return { heading: '当前块 · UI 设计', lines: uiDesignOutlineLines(p.payload ?? '') };
    }
    return {
      heading: `当前块 · ${p.kind}`,
      lines: [`modelRefs: ${p.modelRefs.join(', ') || '（无）'}`],
    };
  }
  if (b.kind === 'mv-map') {
    const p = b.payload as MvMapPayload;
    return {
      heading: '当前块 · 映射',
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
    if (!window.confirm(`「${tabLabel(path)}」有未保存的更改，确定关闭？`)) return;
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
        title: '示例表',
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
  syncBaselineForPath(name, initial);
  logLine(`新建文档：${name}`, 'info');
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
    logLine('没有选中的文档', 'warn');
    return;
  }
  const text = currentContent.value;

  if (electronApi.value?.writeWorkspaceFile) {
    try {
      await flushPendingElectronWrite();
      logLine(`已保存：${p}`, 'info');
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
      logLine(`已保存：${tabLabel(p)}`, 'info');
    } catch (e) {
      logLine(`保存失败：${String(e)}`, 'error');
    }
    return;
  }

  await saveCurrentDocumentAs(true);
}

async function saveCurrentDocumentAs(fromSaveWithoutTarget = false): Promise<void> {
  const p = selectedPath.value;
  if (!p) {
    logLine('没有选中的文档', 'warn');
    return;
  }
  const text = currentContent.value;

  if (electronApi.value?.saveFileAs) {
    const r = await electronApi.value.saveFileAs(p, text);
    if (!r) return;
    if ('error' in r) {
      if (r.error === 'no_workspace') window.alert('请先用菜单「文件 → 打开磁盘工作区」选择工作区目录。');
      else if (r.error === 'outside_workspace') window.alert('只能保存到当前工作区目录内。');
      return;
    }
    const newPath = r.relPath;
    if (newPath !== p) {
      renameOpenDocumentKey(p, newPath, text);
    } else {
      files.value = new Map(files.value).set(p, text);
      syncBaselineForPath(p, text);
    }
    logLine(fromSaveWithoutTarget ? `已保存：${newPath}` : `另存为：${newPath}`, 'info');
    return;
  }

  if (fsaSupported()) {
    try {
      const handle = await window.showSaveFilePicker({
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
      logLine(fromSaveWithoutTarget ? `已保存：${selectedPath.value}` : `另存为：${selectedPath.value}`, 'info');
    } catch (e) {
      if (String(e).includes('abort')) return;
      logLine(`另存为失败，改为下载：${String(e)}`, 'warn');
      fallbackDownloadMarkdown(tabLabel(p), text);
      syncBaselineForPath(p, text);
    }
    return;
  }

  fallbackDownloadMarkdown(tabLabel(p), text);
  syncBaselineForPath(p, text);
  logLine(
    fromSaveWithoutTarget
      ? `已触发下载保存（浏览器不支持 File System Access 时无法写回原路径）：${tabLabel(p)}`
      : `已触发下载（另存为）：${tabLabel(p)}`,
    'info',
  );
}

async function openMarkdownFileUnified(): Promise<void> {
  if (electronApi.value?.openMarkdownInWorkspace) {
    const r = await electronApi.value.openMarkdownInWorkspace();
    if (!r) return;
    if ('error' in r) {
      if (r.error === 'no_workspace') window.alert('请先用「文件 → 打开磁盘工作区」选择工作区，再打开其中的 .md 文件。');
      else if (r.error === 'outside_workspace') window.alert('只能选择当前工作区目录内的文件。');
      return;
    }
    files.value = new Map(files.value).set(r.relPath, r.text);
    syncBaselineForPath(r.relPath, r.text);
    selectedPath.value = r.relPath;
    logLine(`已打开：${r.relPath}`, 'info');
    return;
  }

  if (fsaSupported()) {
    try {
      const [handle] = await window.showOpenFilePicker({
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
      logLine(`已打开：${name}`, 'info');
    } catch (e) {
      if (String(e).includes('abort')) return;
      logLine(`打开文件失败：${String(e)}，改用传统文件选择`, 'warn');
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
    logLine(`已打开：${name}（无写盘句柄时请用「另存为」或换用 Chrome/Edge）`, 'info');
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
  logLine(`Electron 工作区已加载：${keys.length} 个文件`, 'info');
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
    logLine(`已切换到代码块画布标签：${block.payload.id}`, 'info');
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
      subtypeLabel: fenceBlockSubtypeLabel(block),
    },
  ];
  activeEditorTab.value = id;
  logLine(`已打开代码块画布标签：${block.payload.id}`, 'info');
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
  syncBaselineForPath(payload.relPath, payload.markdown);
  refreshCanvasTabSubtypesForPath(payload.relPath, payload.markdown);
  logLine(`代码块画布已保存：${payload.relPath}`, 'info');
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
  syncBaselineForPath(relPath, markdown);
  refreshCanvasTabSubtypesForPath(relPath, markdown);
  logLine(`已从代码块画布窗口合并保存：${relPath}`, 'info');
}

watch(
  selectedPath,
  () => {
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
  logLine('MV Workbench 已启动', 'info');
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
        logLine('代码块画布编辑窗口（Electron）', 'info');
      } catch {
        workspaceHint.value = '无法读取文件（代码块画布）。';
        logLine(workspaceHint.value, 'error');
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
          logLine('代码块画布编辑窗口（浏览器）', 'info');
        } else {
          logLine('代码块画布启动数据与 URL 不一致', 'warn');
        }
      } catch {
        logLine('代码块画布启动数据无效', 'error');
      }
    } else {
      logLine('缺少代码块画布数据：请从主窗口属性区「打开…画布」按钮打开', 'error');
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
      workspaceHint.value = '无法读取块文件（请先在工作区主窗口选择磁盘目录）。';
      logLine(workspaceHint.value, 'error');
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
    @saved="onCanvasSavedInPopup"
    @close="onCanvasClosePopup"
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
      <nav class="menu-bar" aria-label="主菜单">
        <div class="menu-entry">
          <button type="button" class="menu-top" @click.stop="toggleMenu('file')">文件(F)</button>
          <ul v-show="openMenu === 'file'" class="menu-dropdown" role="menu" @click.stop>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="newFromMenu">新建</button>
            </li>
            <li class="menu-sep" role="separator" />
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="openMarkdownFileFromMenu">打开…</button>
            </li>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="openFolderDialog">打开文件夹…</button>
            </li>
            <li class="menu-sep" role="separator" />
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" :disabled="!selectedPath" @click="saveFromMenu">
                保存
              </button>
            </li>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" :disabled="!selectedPath" @click="saveAsFromMenu">
                另存为…
              </button>
            </li>
            <li class="menu-sep" role="separator" />
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" :disabled="!selectedPath" @click="closeCurrentDocumentFromMenu">
                关闭
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
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="toggleShowOutlineDockMenu">
                {{ showOutlineDock ? '隐藏' : '显示' }}大纲 Dock
              </button>
            </li>
            <li role="none">
              <button type="button" class="menu-item" role="menuitem" @click="toggleShowPropsDockMenu">
                {{ showPropsDock ? '隐藏' : '显示' }}属性 Dock
              </button>
            </li>
            <li class="menu-sep" role="separator" />
            <li class="menu-info" role="none">
              文档标签在**中间编辑区**顶部切换；同一文档下打开「代码块画布」后在文档标签下方出现**文档 / 代码块**子标签。关闭标签用 ×。中间列**仅 Markdown**；**Model / View 围栏**索引在**左侧大纲 Dock**。其左右为大纲 Dock 与属性 Dock（各自标题栏可**折叠/展开**为窄条；视图菜单可整侧隐藏）。Markdown 支持<strong>预览 / 富文本 / 原始文本</strong>（右键切换）；插入代码块仅在富文本或原始文本下可用。
            </li>
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
        <div class="toolbar-start">
          <button type="button" class="tb-btn" title="新建 Markdown — 无全局快捷键" @click="newMarkdownFile">新建</button>
          <span class="tb-sep" aria-hidden="true" />
          <button type="button" class="tb-btn" title="打开单个 .md（Chrome/Edge 可获写盘句柄）— 无全局快捷键" @click="openMarkdownFileUnified">
            打开
          </button>
          <button type="button" class="tb-btn" title="打开文件夹（批量 .md）— 无全局快捷键" @click="openFolderDialog">打开文件夹</button>
          <span class="tb-sep" aria-hidden="true" />
          <button
            type="button"
            class="tb-btn"
            :disabled="!selectedPath"
            title="保存 Ctrl+S — 无全局快捷键"
            @click="saveCurrentDocument"
          >
            保存
          </button>
          <button
            type="button"
            class="tb-btn"
            :disabled="!selectedPath"
            title="另存为 Ctrl+Shift+S — 无全局快捷键"
            @click="saveCurrentDocumentAs"
          >
            另存为
          </button>
          <button
            type="button"
            class="tb-btn"
            :disabled="!selectedPath"
            title="关闭当前文档 Ctrl+W — 无全局快捷键"
            @click="closeCurrentDocumentFromMenu"
          >
            关闭
          </button>
          <template v-if="electronApi?.pickWorkspace">
            <span class="tb-sep" aria-hidden="true" />
            <button type="button" class="tb-btn" title="Electron 工作区 — 无全局快捷键" @click="pickWorkspaceElectron">
              磁盘工作区
            </button>
          </template>
        </div>
        <span class="toolbar-fill" aria-hidden="true" />
        <button
          type="button"
          class="tb-btn tb-btn-fullscreen"
          :title="
            appIsFullscreen
              ? '退出全屏 — 无全局快捷键（也可按 Esc 视浏览器而定）'
              : '全屏显示工作台 — 无全局快捷键'
          "
          @click="toggleAppFullscreen"
        >
          {{ appIsFullscreen ? '退出全屏' : '全屏' }}
        </button>
      </div>
    </header>
    <main class="main">
      <template v-if="sortedPaths.length">
        <div class="workspace-row">
          <aside
            v-if="!blockOnly && showOutlineDock"
            class="dock dock-left"
            :class="{ 'dock--collapsed': outlineDockCollapsed }"
            aria-label="大纲视图"
          >
            <div class="dock-titlebar">
              <span v-show="!outlineDockCollapsed" class="dock-title">大纲</span>
              <button
                v-show="!outlineDockCollapsed"
                type="button"
                class="dock-ghost"
                title="取消围栏块选中 — 无全局快捷键"
                @click="clearFenceSelection"
              >
                清空块
              </button>
              <button
                type="button"
                class="dock-collapse-toggle"
                :class="{ 'dock-collapse-toggle--fill': outlineDockCollapsed }"
                :title="outlineDockCollapsed ? '展开大纲 Dock — 无全局快捷键' : '折叠大纲 Dock — 无全局快捷键'"
                :aria-expanded="!outlineDockCollapsed"
                @click="outlineDockCollapsed = !outlineDockCollapsed"
              >
                <span v-if="outlineDockCollapsed" class="dock-vlabel">大纲</span>
                <span v-else aria-hidden="true">‹</span>
              </button>
            </div>
            <div v-show="!outlineDockCollapsed" class="dock-scroll">
              <section class="dock-section">
                <h3 class="dock-subh">文档章节</h3>
                <ul v-if="mdOutlineHeadings.length" class="dock-outline-list">
                  <li
                    v-for="(h, i) in mdOutlineHeadings"
                    :key="i"
                    class="dock-outline-item"
                    :style="{ paddingLeft: `${(h.level - 1) * 10 + 4}px` }"
                  >
                    <span class="dock-outline-ln" :title="`第 ${h.line} 行`">L{{ h.line }}</span>
                    {{ h.text }}
                  </li>
                </ul>
                <p v-else class="dock-muted">（当前文档无 ATX 标题）</p>
              </section>
              <section class="dock-section">
                <h3 class="dock-subh">Model / View 围栏</h3>
                <p class="dock-muted dock-hint dock-hint--tight">
                  中间列仅 Markdown；光标在围栏内时右侧属性会随动；亦可在此选中下列块，行末「代码块」打开代码块画布子标签。
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
                      :title="`选中 ${b.kind} · ${fenceBlockSubtypeLabel(b)} · ${b.payload.id} — 无全局快捷键`"
                      @click="selectFenceBlock(b)"
                    >
                      <span class="dock-fence-type-line">
                        <span class="dock-fence-kind">{{ b.kind }}</span>
                        <span class="dock-fence-sub">{{ fenceBlockSubtypeLabel(b) }}</span>
                      </span>
                      <code class="dock-fence-id">{{ b.payload.id }}</code>
                    </button>
                    <button
                      type="button"
                      class="dock-fence-canvas"
                      :title="canvasPrimaryActionTitle(b)"
                      @click.stop="openVisualCanvas(b)"
                    >
                      代码块
                    </button>
                  </li>
                </ul>
                <p v-else class="dock-muted">（当前文档无 mv-model / mv-view / mv-map 围栏）</p>
              </section>
              <section v-if="dockSecondaryOutline" class="dock-section">
                <h3 class="dock-subh">{{ dockSecondaryOutline.heading }}</h3>
                <ul class="dock-outline-list dock-outline-list--dense">
                  <li v-for="(ln, i) in dockSecondaryOutline.lines" :key="i" class="dock-outline-item">{{ ln }}</li>
                </ul>
              </section>
              <p v-else class="dock-muted dock-hint">在上方「Model / View 围栏」中选中块后，此处将显示该块相关结构（如 class 列表、表字段等）。</p>
            </div>
          </aside>
          <div class="editor-column">
            <header class="doc-tabs">
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
            <nav
              v-if="selectedPath && canvasTabsForCurrentFile.length"
              class="editor-subtabs"
              role="tablist"
              aria-label="文档与代码块画布"
            >
              <button
                type="button"
                class="subtab"
                role="tab"
                :aria-selected="activeEditorTab === 'markdown'"
                title="文档编辑（仅 Markdown）— 无全局快捷键"
                @click="activeEditorTab = 'markdown'"
              >
                文档
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
                  :title="`${t.fenceKind} · ${t.subtypeLabel} · ${t.blockId} — 无全局快捷键`"
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
                  title="关闭代码块画布标签 — 无全局快捷键"
                  :aria-label="`关闭代码块画布 ${t.blockId}`"
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
          <section class="md-pane" @contextmenu.prevent="onMdPaneContextMenu">
            <h2 class="md-pane-head">
              Markdown
              <span class="md-mode-switch" role="radiogroup" aria-label="Markdown 显示模式">
                <button
                  type="button"
                  class="md-mode-btn"
                  :class="{ 'md-mode-btn--active': mdPaneMode === 'preview' }"
                  role="radio"
                  :aria-checked="mdPaneMode === 'preview'"
                  title="预览（只读）— 无全局快捷键"
                  @click="setMdPaneMode('preview')"
                >
                  预览
                </button>
                <button
                  type="button"
                  class="md-mode-btn"
                  :class="{ 'md-mode-btn--active': mdPaneMode === 'rich' }"
                  role="radio"
                  :aria-checked="mdPaneMode === 'rich'"
                  title="富文本（Vditor）— 无全局快捷键"
                  @click="setMdPaneMode('rich')"
                >
                  富文本
                </button>
                <button
                  type="button"
                  class="md-mode-btn"
                  :class="{ 'md-mode-btn--active': mdPaneMode === 'source' }"
                  role="radio"
                  :aria-checked="mdPaneMode === 'source'"
                  title="原始文本 — 无全局快捷键"
                  @click="setMdPaneMode('source')"
                >
                  原始文本
                </button>
              </span>
            </h2>
            <p class="md-pane-hint">
              <strong>预览</strong>为只读排版；<strong>富文本</strong>为 Vditor 所见即所得；<strong>原始文本</strong>为 Markdown 源码。标题旁三钮或编辑区<strong>右键</strong>可切换模式；<strong>插入代码块</strong>仅在富文本或原始文本下可用。Model / View 以文档内<strong>围栏代码块</strong>（<code>mv-model</code> / <code>mv-view</code>）存储，块内可为 JSON、XML 或纯文本等；左侧「Model / View 围栏」索引可选中块，在中间列打开<strong>代码块画布</strong>编辑。光标在某一围栏块<strong>内</strong>移动时，右侧<strong>属性</strong> Dock
              会随当前块切换（仅富文本 / 原始文本）；在围栏外则为文档摘要。
            </p>
            <ul v-if="parseErrors.length" class="errors md-parse-errors">
              <li v-for="(e, i) in parseErrors" :key="i">{{ e }}</li>
            </ul>
            <div v-if="mdPaneMode === 'preview'" class="md-preview-outer">
              <MdMarkdownPreview :key="selectedPath ?? ''" :markdown="currentContent" />
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
              aria-label="Markdown 原始文本"
              title="原始文本编辑 — 无全局快捷键"
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
                  :key="activeCanvasSession.id"
                  @saved="onEmbeddedCanvasSaved"
                  @close="closeCanvasTab(activeCanvasSession.id)"
                />
              </div>
            </template>
            <p v-else class="empty empty--in-column">请选择标签</p>
          </div>
          <aside
            v-if="!blockOnly && showPropsDock"
            class="dock dock-right"
            :class="{ 'dock--collapsed': propsDockCollapsed }"
            aria-label="属性"
          >
            <div class="dock-titlebar dock-titlebar--right">
              <button
                type="button"
                class="dock-collapse-toggle"
                :class="{ 'dock-collapse-toggle--fill': propsDockCollapsed }"
                :title="propsDockCollapsed ? '展开属性 Dock — 无全局快捷键' : '折叠属性 Dock — 无全局快捷键'"
                :aria-expanded="!propsDockCollapsed"
                @click="propsDockCollapsed = !propsDockCollapsed"
              >
                <span v-if="propsDockCollapsed" class="dock-vlabel">属性</span>
                <span v-else aria-hidden="true">›</span>
              </button>
              <span v-show="!propsDockCollapsed" class="dock-title dock-title--trailing">属性</span>
            </div>
            <div v-show="!propsDockCollapsed" class="dock-scroll">
              <template v-if="selectedBlock && selectedBlockDocLines">
                <div class="dock-props-actions" role="group" aria-label="块操作">
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
                    title="在对话框中编辑该块 JSON — 无全局快捷键"
                    @click="openJsonForSelected"
                  >
                    编辑 JSON
                  </button>
                  <button
                    type="button"
                    class="dock-action"
                    title="独立编辑（Electron 宿主或回退为 JSON 对话框）— 无全局快捷键"
                    @click="openShellForSelected"
                  >
                    独立编辑
                  </button>
                </div>
                <p v-if="selectedBlockCanvasHint" class="dock-muted dock-canvas-hint">{{ selectedBlockCanvasHint }}</p>
                <h3 class="dock-subh">基本属性</h3>
                <dl class="dock-dl dock-dl--props">
                  <template v-for="(row, i) in selectedBlockDocLines" :key="i">
                    <dt>{{ row.label }}</dt>
                    <dd>{{ row.value }}</dd>
                  </template>
                </dl>
                <details v-if="selectedBlock.kind === 'mv-view'" class="dock-json-details dock-ref-details">
                  <summary class="dock-json-summary" title="modelRefs 书写约定 — 无全局快捷键">modelRefs 地址说明</summary>
                  <p class="dock-muted dock-ref-doc">{{ MV_MODEL_REFS_SCHEME_DOC }}</p>
                </details>
                <details class="dock-json-details">
                  <summary class="dock-json-summary" title="展开或折叠完整 JSON — 无全局快捷键">完整 JSON</summary>
                  <pre class="dock-json dock-json--nested" tabindex="0">{{ JSON.stringify(selectedBlock.payload, null, 2) }}</pre>
                </details>
              </template>
              <template v-else>
                <dl class="dock-dl">
                  <dt>路径</dt>
                  <dd>{{ selectedPath }}</dd>
                  <dt>字符数</dt>
                  <dd>{{ currentContent.length }}</dd>
                  <dt>围栏块数</dt>
                  <dd>{{ blocks.length }}</dd>
                  <dt>解析警告</dt>
                  <dd>{{ parseErrors.length }}</dd>
                </dl>
                <p class="dock-muted">在左侧「Model / View 围栏」中选中块后，此处显示基本属性、操作按钮与可展开的完整 JSON。</p>
              </template>
            </div>
          </aside>
        </div>
      </template>
      <p v-else class="empty">未打开文档：请使用菜单「文件」或工具栏打开/新建</p>
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
    <Teleport to="body">
      <div
        v-show="mdCtxOpen"
        ref="mdCtxMenuRef"
        class="md-ctx-menu"
        role="menu"
        aria-label="Markdown 区域"
        :style="{ left: mdCtxX + 'px', top: mdCtxY + 'px' }"
        @click.stop
        @contextmenu.prevent
      >
        <button
          type="button"
          class="ctx-item"
          role="menuitemradio"
          :aria-checked="mdPaneMode === 'preview'"
          title="切换到只读预览 — 无全局快捷键"
          @click="setMdPaneMode('preview')"
        >
          预览（只读）
        </button>
        <button
          type="button"
          class="ctx-item"
          role="menuitemradio"
          :aria-checked="mdPaneMode === 'rich'"
          title="切换到富文本（Vditor）— 无全局快捷键"
          @click="setMdPaneMode('rich')"
        >
          富文本（Vditor）
        </button>
        <button
          type="button"
          class="ctx-item"
          role="menuitemradio"
          :aria-checked="mdPaneMode === 'source'"
          title="切换到原始文本 — 无全局快捷键"
          @click="setMdPaneMode('source')"
        >
          原始文本
        </button>
        <div class="ctx-sep" role="separator" aria-hidden="true" />
        <button
          type="button"
          class="ctx-item"
          role="menuitem"
          :disabled="!selectedPath || mdPaneMode === 'preview'"
          :title="
            !selectedPath
              ? '请先打开或新建文档 — 无全局快捷键'
              : mdPaneMode === 'preview'
                ? '预览模式下不可用：请先切换到富文本或原始文本 — 无全局快捷键'
                : '选择代码块类型并插入 mv-view / mv-model 围栏 — 无全局快捷键'
          "
          @click="openInsertCodeBlockModal"
        >
          插入代码块…
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
.dock-outline-item {
  margin: 0 0 4px;
  padding: 4px 6px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: #0f172a;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid transparent;
}
.dock-outline-ln {
  display: inline-block;
  min-width: 2.2em;
  margin-right: 6px;
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
.dock-dl--props dt:first-child {
  margin-top: 0;
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
.md-pane-hint {
  margin: 0 0 8px;
  font-size: 0.72rem;
  color: #64748b;
  flex-shrink: 0;
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
