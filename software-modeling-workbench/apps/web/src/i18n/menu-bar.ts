import type { AppLocale } from './app-locale';

/** 主菜单栏（含下拉）文案：zh / en */
export type MenuBarMessages = {
  navAria: string;
  file: string;
  view: string;
  language: string;
  theme: string;
  help: string;
  new: string;
  open: string;
  openFolder: string;
  save: string;
  saveAs: string;
  exportMd: string;
  exportHtml: string;
  exportSvg: string;
  exportPng: string;
  close: string;
  pickWorkspace: string;
  exportMdTitle: string;
  exportHtmlTitle: string;
  exportSvgTitle: string;
  exportPngTitle: string;
  viewOutlineShow: string;
  viewOutlineHide: string;
  viewPropsShow: string;
  viewPropsHide: string;
  viewHintHtml: string;
  about: string;
  langZh: string;
  langEn: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  aboutLog: string;
};

export const menuBarMessages: Record<AppLocale, MenuBarMessages> = {
  zh: {
    navAria: '主菜单',
    file: '文件(F)',
    view: '视图(V)',
    language: '语言(L)',
    theme: '主题(T)',
    help: '帮助(H)',
    new: '新建',
    open: '打开…',
    openFolder: '打开文件夹…',
    save: '保存',
    saveAs: '另存为…',
    exportMd: '导出 Markdown…',
    exportHtml: '导出 HTML…',
    exportSvg: '导出 SVG…',
    exportPng: '导出 PNG…',
    close: '关闭',
    pickWorkspace: '打开磁盘工作区…',
    exportMdTitle: '导出当前文档为 .md 副本（浏览器下载）— 无全局快捷键',
    exportHtmlTitle:
      '导出独立 HTML（Vditor 样式外链）。预览模式用可见预览 DOM；富文本/原始文本为同参数离屏 Vditor.preview — 无全局快捷键',
    exportSvgTitle: '导出 SVG：预览模式截取可见预览；否则离屏 Vditor.preview — 无全局快捷键',
    exportPngTitle: '导出 PNG：预览模式截取可见预览；否则离屏 Vditor.preview — 无全局快捷键',
    viewOutlineShow: '显示大纲 Dock',
    viewOutlineHide: '隐藏大纲 Dock',
    viewPropsShow: '显示属性 Dock',
    viewPropsHide: '隐藏属性 Dock',
    viewHintHtml:
      '文档标签在<strong>中间编辑区</strong>顶部切换；同一文档下打开「代码块画布」后在文档标签下方出现<strong>文档 / 代码块</strong>子标签。关闭标签用 ×。中间列<strong>仅 Markdown</strong>；<strong>代码块大纲</strong>在<strong>左侧大纲 Dock</strong>。其左右为大纲 Dock 与属性 Dock（各自标题栏可<strong>折叠/展开</strong>为窄条；视图菜单可整侧隐藏）。Markdown 支持<strong>预览 / 富文本 / 原始文本</strong>（右键切换）；插入代码块仅在富文本或原始文本下可用。',
    about: '关于 Software Modeling Workbench…',
    langZh: '中文（简体）',
    langEn: 'English',
    themeSystem: '跟随系统',
    themeLight: '浅色',
    themeDark: '深色',
    aboutLog: '关于：已打开对话框',
  },
  en: {
    navAria: 'Main menu',
    file: 'File (F)',
    view: 'View (V)',
    language: 'Language (L)',
    theme: 'Theme (T)',
    help: 'Help (H)',
    new: 'New',
    open: 'Open…',
    openFolder: 'Open Folder…',
    save: 'Save',
    saveAs: 'Save As…',
    exportMd: 'Export Markdown…',
    exportHtml: 'Export HTML…',
    exportSvg: 'Export SVG…',
    exportPng: 'Export PNG…',
    close: 'Close',
    pickWorkspace: 'Open Disk Workspace…',
    exportMdTitle: 'Export current document as .md (browser download) — no global shortcut',
    exportHtmlTitle:
      'Export standalone HTML (Vditor CSS). Preview uses visible DOM; rich/source use off-screen Vditor.preview — no global shortcut',
    exportSvgTitle: 'Export SVG: from visible preview in preview mode; otherwise off-screen Vditor.preview — no global shortcut',
    exportPngTitle: 'Export PNG: from visible preview in preview mode; otherwise off-screen Vditor.preview — no global shortcut',
    viewOutlineShow: 'Show outline Dock',
    viewOutlineHide: 'Hide outline Dock',
    viewPropsShow: 'Show properties Dock',
    viewPropsHide: 'Hide properties Dock',
    viewHintHtml:
      'Document tabs switch at the top of the <strong>center editor</strong>. With a block canvas open, <strong>Document / Block</strong> sub-tabs appear below. Close a tab with ×. The center column is <strong>Markdown only</strong>; the <strong>fence outline</strong> is in the <strong>left outline Dock</strong>. Outline and properties Docks can be <strong>collapsed/expanded</strong> from their title bars (or hidden from View). Markdown supports <strong>Preview / Rich / Source</strong> (right-click to switch); insert fence blocks only in Rich or Source.',
    about: 'About Software Modeling Workbench…',
    langZh: '中文（简体）',
    langEn: 'English',
    themeSystem: 'Follow System',
    themeLight: 'Light',
    themeDark: 'Dark',
    aboutLog: 'About: dialog opened',
  },
};
