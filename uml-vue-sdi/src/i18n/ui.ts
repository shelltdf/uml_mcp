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
  fileNew: string;
  fileOpen: string;
  fileSave: string;
  fileSaveAs: string;
  newDiagramTitle: string;
  newDiagramHint: string;
  newDiagramSectionSync: string;
  newDiagramSectionDiagrams: string;
  canvasMultiMermaidHint: string;
  canvasResetView: string;
  canvasViewportTitle: string;
  fileSaveAll: string;
  fileRevert: string;
  confirmRevert: string;
  saveAllDone: string;
  saveAllSkipped: string;
  saveAllNone: string;
  syncMissingYamlHint: string;
  syncProfile: string;
  dockTextContent: string;
  dockNoActiveFile: string;
  mdiWorkspaceLabel: string;
  mdiTabStripLabel: string;
  dirtyTabHint: string;
  closeTabHint: string;
  canvasAriaLabel: string;
  canvasEmptyHint: string;
  canvasKindClassTitle: string;
  canvasKindClassHint: string;
  canvasKindCodeTitle: string;
  canvasKindCodeHint: string;
  canvasKindUnknownTitle: string;
  canvasKindUnknownHint: string;
  dockCollapse: string;
  dockExpand: string;
  toolbarAriaLabel: string;
  toolbarNew: string;
  toolbarOpen: string;
  toolbarSave: string;
  toolbarSaveAll: string;
  toolbarSaveAs: string;
  toolbarRevert: string;
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
  aboutBody:
    '浏览器内 MDI（多文档界面）：中央画布按文件类型可视化，右侧「文本内容」停靠区编辑纯文本；可同时打开多文件并以标签切换。',
  formatsTitle: '工作区文件格式',
  formatsBody:
    '• uml.sync.md：YAML 前置块 + 同步规则正文；声明 namespace_dirs、uml_root、code_roots。\n' +
    '• *.uml.md：建议「一文件一图」；中央画布仅渲染第一个 ```mermaid 块。\n' +
    '• *.class.md：类定义（建议 ### 类名 + 表格）。\n' +
    '• *.code.md：类以外的函数、宏、全局片段等。',
  helpPanelTitle: '帮助',
  helpBody:
    '使用「菜单 → 帮助」打开本面板；亦可用 F1。\n' +
    '布局：中央为 MDI 工作区（上方标签切换文档，下方为各文件类型的画布）；右侧为「文本内容」停靠区编辑纯文本。\n' +
    '顶层菜单顺序：文件 → 语言 → 主题 → 帮助。「语言」下可选中文 / 英文（非循环）。\n' +
    '「主题」下分项选择跟随系统 / 浅色 / 深色（非循环）。\n' +
    '未保存时标签上显示脏标记，窗口标题会显示「·」，关闭或刷新页面前会提示。',
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
  fileNew: '新建…',
  fileOpen: '打开…',
  fileSave: '保存',
  fileSaveAs: '另存为…',
  newDiagramTitle: '选择图类型',
  newDiagramHint: '顶部为同步契约；下方为 UML 图。每个 *.uml.md 建议只包含一个 Mermaid 图；新建将插入对应模板。',
  newDiagramSectionSync: '同步配置',
  newDiagramSectionDiagrams: 'UML 图（Mermaid）',
  canvasMultiMermaidHint: '检测到多个 mermaid 块：画布仅显示第一个，其余仍在源码中保留。',
  canvasResetView: '还原视口',
  canvasViewportTitle: '中键拖拽平移 · 滚轮缩放（以指针为锚点）',
  fileSaveAll: '全部保存',
  fileRevert: '还原',
  confirmRevert: '放弃未保存修改，并将当前文件还原到上次成功打开或保存的内容？',
  saveAllDone: '已写入 {n} 个已关联磁盘的文件。',
  saveAllSkipped: '另有 {m} 个文件尚未关联保存路径，请用「保存」或「另存为」逐个处理。',
  saveAllNone: '没有可直接写入的已关联文件（或无未保存更改）。',
  syncMissingYamlHint:
    '未检测到 YAML 前置块（---）。可在右侧「文本内容」停靠区添加 --- 包围的字段，保存后将按同步契约解析。',
  syncProfile: '同步策略',
  dockTextContent: '文本内容',
  dockNoActiveFile: '无活动文件',
  mdiWorkspaceLabel: 'MDI 文档工作区',
  mdiTabStripLabel: '已打开文档',
  dirtyTabHint: '未保存',
  closeTabHint: '关闭标签',
  canvasAriaLabel: '画布',
  canvasEmptyHint: '请从「文件」菜单打开或新建文档。',
  canvasKindClassTitle: '类定义（*.class.md）',
  canvasKindClassHint: '此类文件以标题与表格为主，中央不提供图形预览；请在右侧停靠区编辑源文。',
  canvasKindCodeTitle: '代码片段（*.code.md）',
  canvasKindCodeHint: '非类代码与宏等说明；请在右侧停靠区编辑，中央仅作占位说明。',
  canvasKindUnknownTitle: '其它文本',
  canvasKindUnknownHint: '未识别的扩展名；可在右侧停靠区编辑纯文本。',
  dockCollapse: '折叠文本停靠区',
  dockExpand: '展开文本停靠区',
  toolbarAriaLabel: '主工具栏',
  toolbarNew: '新建',
  toolbarOpen: '打开',
  toolbarSave: '保存',
  toolbarSaveAll: '全部保存',
  toolbarSaveAs: '另存',
  toolbarRevert: '还原',
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
    'MDI in the browser: center canvas visualizes by file type; the right “Text content” dock edits plain text. Open multiple files and switch by tabs.',
  formatsTitle: 'Workspace file formats',
  formatsBody:
    '• uml.sync.md: YAML front matter + rules; namespace_dirs, uml_root, code_roots.\n' +
    '• *.uml.md: one diagram per file recommended; canvas renders the first ```mermaid block.\n' +
    '• *.class.md: class definitions (### Name + table).\n' +
    '• *.code.md: non-class code snippets.',
  helpPanelTitle: 'Help',
  helpBody:
    'Open from Help menu or press F1.\n' +
    'Layout: center MDI workspace (tabs above, canvas below by file type); right dock is plain-text editing.\n' +
    'Menu order: File → Language → Theme → Help. Language: 中文 / English (not cycling).\n' +
    'Theme: system / light / dark (not cycling).\n' +
    'Unsaved changes show a marker on tabs and a dot in the title; leaving the page may prompt.',
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
  fileNew: 'New…',
  fileOpen: 'Open…',
  fileSave: 'Save',
  fileSaveAs: 'Save As…',
  newDiagramTitle: 'Choose diagram type',
  newDiagramHint: 'Sync contract at the top; UML diagrams below. Each *.uml.md should contain one Mermaid diagram; a template will be inserted.',
  newDiagramSectionSync: 'Sync configuration',
  newDiagramSectionDiagrams: 'UML diagrams (Mermaid)',
  canvasMultiMermaidHint: 'Multiple mermaid blocks found: only the first is shown on the canvas.',
  canvasResetView: 'Reset view',
  canvasViewportTitle: 'Middle-drag to pan · Wheel to zoom (pointer as anchor)',
  fileSaveAll: 'Save all',
  fileRevert: 'Revert',
  confirmRevert:
    'Discard unsaved edits and restore this file to the last successfully opened or saved content?',
  saveAllDone: 'Wrote {n} file(s) already linked to disk.',
  saveAllSkipped:
    '{m} file(s) are not linked to a save path yet—use Save or Save As for each.',
  saveAllNone: 'Nothing to write (no linked dirty files).',
  syncMissingYamlHint:
    'No YAML front matter (---) found. Add a --- fenced block in the right “Text content” dock; it will be parsed after save.',
  syncProfile: 'Sync profile',
  dockTextContent: 'Text content',
  dockNoActiveFile: 'No active file',
  mdiWorkspaceLabel: 'MDI document workspace',
  mdiTabStripLabel: 'Open documents',
  dirtyTabHint: 'Unsaved',
  closeTabHint: 'Close tab',
  canvasAriaLabel: 'Canvas',
  canvasEmptyHint: 'Open or create a document from the File menu.',
  canvasKindClassTitle: 'Class definitions (*.class.md)',
  canvasKindClassHint: 'Structured headings and tables; no diagram preview here—edit source in the right dock.',
  canvasKindCodeTitle: 'Code snippets (*.code.md)',
  canvasKindCodeHint: 'Non-class code and macros; edit in the right dock.',
  canvasKindUnknownTitle: 'Plain text',
  canvasKindUnknownHint: 'Unknown extension; edit as plain text in the right dock.',
  dockCollapse: 'Collapse text dock',
  dockExpand: 'Expand text dock',
  toolbarAriaLabel: 'Main toolbar',
  toolbarNew: 'New',
  toolbarOpen: 'Open',
  toolbarSave: 'Save',
  toolbarSaveAll: 'Save all',
  toolbarSaveAs: 'Save as',
  toolbarRevert: 'Revert',
};

export function getMessages(locale: LocaleId): UiMessages {
  if (locale === 'zh') return zh;
  return en;
}
