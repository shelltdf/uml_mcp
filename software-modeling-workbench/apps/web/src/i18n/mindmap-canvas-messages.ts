import type { AppLocale } from './app-locale';

export interface MindmapCanvasMessages {
  shortcutsPanel: string;
  shortcutsBody: string;
  toolRelayout: string;
  toolFit: string;
  toolOrigin: string;
  toolReset: string;
  toolCopyDebug: string;
  toolFullscreen: string;
  toolExitFullscreen: string;
  copyDebugSuccess: string;
  copyDebugFailed: string;
  ctxAddChild: string;
  ctxAddSibling: string;
  ctxRename: string;
  ctxToggleCollapse: string;
  ctxDelete: string;
  ctxFitView: string;
  dockSummaryNode: (label: string) => string;
  dockSummaryMulti: (n: number) => string;
  dockSummaryEmpty: string;
  dockLineId: string;
  dockLineLabel: string;
  dockLineParent: string;
  dockLineChildren: string;
  dockLineNodes: string;
  dockRootLabel: string;
  newChild: string;
  newSibling: string;
  newNode: string;
  untitled: string;
}

const zh: MindmapCanvasMessages = {
  shortcutsPanel: '快捷键',
  shortcutsBody: 'Enter 新建同级\nTab 新建子节点\nSpace 折叠/展开\nDelete 删除节点\nAlt+方向键 调整结构\nCtrl/Cmd + +/- 缩放\nCtrl/Cmd + 0 复位缩放',
  toolRelayout: '排版',
  toolFit: '适配',
  toolOrigin: '原点',
  toolReset: '复位',
  toolCopyDebug: '复制调试SVG',
  toolFullscreen: '全屏画布',
  toolExitFullscreen: '退出全屏',
  copyDebugSuccess: '已复制当前画布 SVG 调试信息。',
  copyDebugFailed: '复制失败：当前环境不支持剪贴板写入。',
  ctxAddChild: '添加子节点',
  ctxAddSibling: '添加兄弟',
  ctxRename: '重命名',
  ctxToggleCollapse: '折叠/展开',
  ctxDelete: '删除',
  ctxFitView: '适配视图',
  dockSummaryNode: (label) => `脑图节点：${label}`,
  dockSummaryMulti: (n) => `脑图多选（${n}）`,
  dockSummaryEmpty: '脑图',
  dockLineId: 'id',
  dockLineLabel: '标题',
  dockLineParent: '父节点',
  dockLineChildren: '子节点数',
  dockLineNodes: '节点数',
  dockRootLabel: '（根）',
  newChild: '新子节点',
  newSibling: '新兄弟',
  newNode: '新节点',
  untitled: '未命名',
};

const en: MindmapCanvasMessages = {
  shortcutsPanel: 'Shortcuts',
  shortcutsBody: 'Enter add sibling\nTab add child\nSpace collapse/expand\nDelete remove node\nAlt+Arrows adjust hierarchy\nCtrl/Cmd + +/- zoom\nCtrl/Cmd + 0 reset zoom',
  toolRelayout: 'Layout',
  toolFit: 'Fit',
  toolOrigin: 'Origin',
  toolReset: 'Reset',
  toolCopyDebug: 'Copy debug SVG',
  toolFullscreen: 'Fullscreen',
  toolExitFullscreen: 'Exit fullscreen',
  copyDebugSuccess: 'Copied current canvas SVG debug content.',
  copyDebugFailed: 'Copy failed: clipboard write is not available.',
  ctxAddChild: 'Add child',
  ctxAddSibling: 'Add sibling',
  ctxRename: 'Rename',
  ctxToggleCollapse: 'Collapse / expand',
  ctxDelete: 'Delete',
  ctxFitView: 'Fit view',
  dockSummaryNode: (label) => `Mindmap node: ${label}`,
  dockSummaryMulti: (n) => `Mindmap selection (${n})`,
  dockSummaryEmpty: 'Mindmap',
  dockLineId: 'id',
  dockLineLabel: 'label',
  dockLineParent: 'parent',
  dockLineChildren: 'children',
  dockLineNodes: 'nodes',
  dockRootLabel: '(root)',
  newChild: 'New child',
  newSibling: 'New sibling',
  newNode: 'New node',
  untitled: 'Untitled',
};

const table: Record<AppLocale, MindmapCanvasMessages> = { zh, en };

export function mindmapCanvasMessagesFor(loc: AppLocale): MindmapCanvasMessages {
  return table[loc] ?? en;
}
