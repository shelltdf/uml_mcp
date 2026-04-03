/** 界面文案：zh / en；默认「语言」菜单仅此两项（扩展更多语言时在 LOCALE_OPTIONS 与 getMessages 同步增补）。 */

export type LocaleId = 'zh' | 'en';

/** 与菜单「语言」子项一致；默认至少中文、英文。 */
export const LOCALE_OPTIONS: { id: LocaleId; label: string }[] = [
  { id: 'zh', label: '中文（简体）' },
  { id: 'en', label: 'English' },
];

export interface UiMessages {
  docTitle: string;
  titleStrip: string;
  file: string;
  resetDemo: string;
  themeMenu: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  langMenu: string;
  helpMenu: string;
  helpInfo: string;
  helpInfoF1Hint: string;
  fileFormats: string;
  about: string;
  aboutTitle: string;
  aboutBody: string;
  formatsTitle: string;
  formatsBody: string;
  helpPanelTitle: string;
  helpBody: string;
  logTitle: string;
  logCopy: string;
  logClose: string;
  logEmptyPlaceholder: string;
  statusReady: string;
  statusDirty: string;
  syncSummary: string;
  umlRoot: string;
  codeRoots: string;
  namespaces: string;
  confirmCloseTab: string;
  confirmReset: string;
  modalClose: string;
}

const zh: UiMessages = {
  docTitle: 'UML Markdown 工作台',
  titleStrip: 'UML Markdown 工作台',
  file: '文件',
  resetDemo: '重置示例',
  themeMenu: '主题',
  themeSystem: '跟随系统',
  themeLight: '浅色',
  themeDark: '深色',
  langMenu: '语言',
  helpMenu: '帮助',
  helpInfo: '帮助信息',
  helpInfoF1Hint: 'F1',
  fileFormats: '文件格式说明',
  about: '关于',
  aboutTitle: '关于 UML Markdown 工作台',
  aboutBody: '本页为浏览器内单窗口多标签（SDI）编辑器，用于维护 uml.sync 与各类 Markdown 契约。',
  formatsTitle: '工作区文件格式',
  formatsBody:
    '• uml.sync.md：YAML 前置块 + 同步规则正文；声明 namespace_dirs、uml_root、code_roots。\n' +
    '• *.uml.md：多张 UML 图，默认使用 ```mermaid 代码块。\n' +
    '• *.class.md：类定义（建议 ### 类名 + 表格）。\n' +
    '• *.code.md：类以外的函数、宏、全局片段等。',
  helpPanelTitle: '帮助',
  helpBody:
    '使用「菜单 → 帮助」打开本面板；亦可用 F1。\n' +
    '顶层菜单顺序：文件 → 语言 → 主题 → 帮助。「语言」下可选中文 / 英文（非循环）。\n' +
    '「主题」下分项选择跟随系统 / 浅色 / 深色（非循环）。\n' +
    '未保存编辑时标签与窗口标题会显示标记，关闭或刷新页面前会提示。',
  logTitle: 'Log',
  logCopy: '复制',
  logClose: '关闭',
  logEmptyPlaceholder: '（尚无日志条目。执行「文件 → 重置示例」等操作后，信息将出现在此区域。）',
  statusReady: '就绪',
  statusDirty: '有未保存的更改',
  syncSummary: '同步配置',
  umlRoot: 'UML 根',
  codeRoots: '代码根',
  namespaces: '命名空间目录',
  confirmCloseTab: '此标签有未保存更改，确定关闭？',
  confirmReset: '存在未保存更改，确定重置示例？未保存内容将丢失。',
  modalClose: '关闭',
};

const en: UiMessages = {
  docTitle: 'UML Markdown Workbench',
  titleStrip: 'UML Markdown Workbench',
  file: 'File',
  resetDemo: 'Reset demo',
  themeMenu: 'Theme',
  themeSystem: 'Match system',
  themeLight: 'Light',
  themeDark: 'Dark',
  langMenu: 'Language',
  helpMenu: 'Help',
  helpInfo: 'Help topics',
  helpInfoF1Hint: 'F1',
  fileFormats: 'File formats',
  about: 'About',
  aboutTitle: 'About UML Markdown Workbench',
  aboutBody:
    'Single-window multi-tab (SDI) editor for uml.sync and Markdown contracts in the browser.',
  formatsTitle: 'Workspace file formats',
  formatsBody:
    '• uml.sync.md: YAML front matter + rules; namespace_dirs, uml_root, code_roots.\n' +
    '• *.uml.md: UML diagrams; fenced ```mermaid blocks.\n' +
    '• *.class.md: class definitions (### Name + table).\n' +
    '• *.code.md: non-class code snippets.',
  helpPanelTitle: 'Help',
  helpBody:
    'Open from Help menu or press F1.\n' +
    'Menu order: File → Language → Theme → Help. Language: 中文 / English (not cycling).\n' +
    'Theme: system / light / dark (not cycling).\n' +
    'Unsaved edits show on tabs and title; leaving the page may prompt.',
  logTitle: 'Log',
  logCopy: 'Copy',
  logClose: 'Close',
  logEmptyPlaceholder:
    '(No log lines yet. Actions such as File → Reset demo will append here.)',
  statusReady: 'Ready',
  statusDirty: 'Unsaved changes',
  syncSummary: 'Sync config',
  umlRoot: 'UML root',
  codeRoots: 'Code roots',
  namespaces: 'Namespace dirs',
  confirmCloseTab: 'This tab has unsaved changes. Close anyway?',
  confirmReset: 'You have unsaved changes. Reset demo and discard edits?',
  modalClose: 'Close',
};

export function getMessages(locale: LocaleId): UiMessages {
  if (locale === 'zh') return zh;
  return en;
}
