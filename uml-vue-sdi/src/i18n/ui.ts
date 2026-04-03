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
  helpGlossaryTitle: string;
  helpGlossaryBody: string;
  logTitle: string;
  logCopy: string;
  logClose: string;
  logEmptyPlaceholder: string;
  statusReady: string;
  statusDirty: string;
  syncSummary: string;
  umlRoot: string;
  codeImpls: string;
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
  syncGuiHint: string;
  syncRulesBody: string;
  syncAddCodeImpl: string;
  syncPathRecordOnlyHint: string;
  syncNamespaceSingleHint: string;
  syncAddCodeImplTitle: string;
  syncModalConfirm: string;
  syncModalCancel: string;
  syncCodeImplActions: string;
  syncCodeImplEdit: string;
  syncCodeImplDelete: string;
  syncCodeImplImmutableBody: string;
  syncCodeImplDirNotFound: string;
  syncCodeImplDirAbsoluteHint: string;
  syncCodeImplDuplicate: string;
  syncCodeRootField: string;
  syncCodeTypeField: string;
  syncProfile: string;
  syncProfileNone: string;
  syncProfileStrict: string;
  dockTextContent: string;
  dockTextShort: string;
  dockProperties: string;
  dockPropsShort: string;
  dockAreaRightAria: string;
  dockPropsTitleBarAria: string;
  propsKindSync: string;
  propsKindUml: string;
  propsKindClass: string;
  propsKindCode: string;
  propsKindOther: string;
  propsPath: string;
  propsKind: string;
  /** *.uml.md：当前画布所依据的首个 Mermaid 块之图类型关键字 */
  propsDiagramType: string;
  propsDirty: string;
  propsDirtyYes: string;
  propsDirtyNo: string;
  propsLines: string;
  propsEncoding: string;
  propsContext: string;
  propsContextDocument: string;
  propsContextObject: string;
  propsMermaidElement: string;
  propsNodeId: string;
  propsNodeLabel: string;
  propsTextRange: string;
  propsSelRange: string;
  propsSelLength: string;
  propsSelPreview: string;
  dockPanelShow: string;
  dockPanelHide: string;
  dockNoActiveFile: string;
  mdiWorkspaceLabel: string;
  mdiTabStripLabel: string;
  dirtyTabHint: string;
  closeTabHint: string;
  canvasAriaLabel: string;
  canvasEmptyHint: string;
  canvasKindClassTitle: string;
  canvasKindClassHint: string;
  /** *.class.md 画布：父类占位框说明 */
  classMdReadonlyInherit: string;
  /** *.class.md 画布：关联占位框说明 */
  classMdReadonlyAssoc: string;
  /** *.class.md 成员表编辑提示 */
  classMdTableHint: string;
  classMdAddRow: string;
  canvasKindCodeTitle: string;
  canvasKindCodeHint: string;
  codeCanvasViewportTitle: string;
  codeCanvasToolbarAria: string;
  codeCanvasNewFunction: string;
  codeCanvasNewVariable: string;
  codeCanvasNewMacro: string;
  codeCanvasDelete: string;
  codeCanvasInspectorHint: string;
  codeCanvasFieldKind: string;
  codeCanvasFieldName: string;
  codeCanvasFieldSignature: string;
  codeCanvasFieldEffect: string;
  codeCanvasFieldType: string;
  codeCanvasFieldExpand: string;
  codeCanvasFieldNote: string;
  canvasKindUnknownTitle: string;
  canvasKindUnknownHint: string;
  dockCollapse: string;
  dockExpand: string;
  dockTitleBarAria: string;
  dockFoldBody: string;
  dockUnfoldBody: string;
  dockMaximize: string;
  dockRestoreSize: string;
  dockClose: string;
  dockButtonBarAria: string;
  /** 右侧列内属性/文本分割条 */
  dockInnerResize: string;
  menuWindow: string;
  menuShowTextDock: string;
  menuShowPropsDock: string;
  toolbarAriaLabel: string;
  toolbarNew: string;
  toolbarOpen: string;
  toolbarSave: string;
  toolbarSaveAll: string;
  toolbarSaveAs: string;
  toolbarRevert: string;
  /** 可编辑类图画布 */
  cdeNewClass: string;
  cdeFit: string;
  cdeOrigin: string;
  cdeResetZoom: string;
  cdeZoomIn: string;
  cdeZoomOut: string;
  cdeCtxMember: string;
  cdeCtxAttr: string;
  cdeCtxMethod: string;
  cdeCtxSubclass: string;
  cdeCtxManage: string;
  cdeManageTitle: string;
  cdeClassName: string;
  cdeAttrs: string;
  cdeMethods: string;
  cdeDelete: string;
  cdeAddAttr: string;
  cdeAddMethod: string;
  cdeDeleteClass: string;
  /** classDiagram：类定义编辑模态、面板 */
  cdsEditDefinition: string;
  cdsEditorHint: string;
  cdsPickClassToEdit: string;
  cdsInheritHandleHint: string;
  cdeShortcutsPanel: string;
  cdeShortcutsBody: string;
  cdeVisibilityPanel: string;
  cdeShowInherit: string;
  cdeShowAssoc: string;
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
    '• uml.sync.md：YAML 前置块 +「同步规则」正文；字段含 namespace_root（标量，唯一）、uml_root、code_impls、sync_profile（none | strict，默认 strict）。路径可为相对或绝对，仅写入契约。默认命名空间根 namespace、代码实现一项 impl_cpp_project（cpp）。旧键 namespace_dirs 与旧版 code_roots + 顶层 code_type 仍可解析。\n' +
    '• *.uml.md：建议「一文件一图」；中央画布仅渲染第一个 ```mermaid 块。\n' +
    '• *.class.md：类定义（建议 ### 类名 + 表格）。\n' +
    '• *.code.md：类以外的函数、宏、全局片段等；须放在各命名空间根（namespace_root）下，与 *.class.md 同树，不放在 code_impls 代码根内。',
  helpPanelTitle: '帮助',
  helpBody:
    '使用「菜单 → 帮助」打开本面板；亦可用 F1。\n' +
    '布局：中央为 MDI 工作区（上方标签切换文档，下方为各文件类型的画布）；右侧为「文本内容」停靠区编辑纯文本。\n' +
    '顶层菜单顺序：文件 → 语言 → 主题 → 窗口 → 帮助。「窗口」可重新显示已关闭的右侧「文本内容」「属性」停靠窗口。「语言」下可选中文 / 英文（非循环）。\n' +
    '「主题」下分项选择跟随系统 / 浅色 / 深色（非循环）。\n' +
    '未保存时标签上显示脏标记，窗口标题会显示「·」，关闭或刷新页面前会提示。',
  helpGlossaryTitle: '名词解释（uml.sync）',
  helpGlossaryBody:
    '【UML 根 uml_root】\n' +
    '被管理的全部 UML 相关文件（例如 *.uml.md）所在的根目录。\n' +
    '\n' +
    '【命名空间根 namespace_root】\n' +
    '类图、代码图等「UML 侧」产物的存放根目录（YAML 中为**单一标量路径**，非列表）；其下子目录表示子命名空间。\n' +
    '每个目录中的 *.class.md（类定义）、*.code.md（非类片段）与对应代码图等均视为处于该命名空间之下；*.code.md 不放在 code_impls 代码根内。未配置时默认为 namespace。\n' +
    '\n' +
    '【代码实现 code_impls】\n' +
    '可配置多套：每项为唯一代码根 root + 该套代码类型 code_type（如 cpp、csharp）。同一契约内 root 去重，先出现的保留。未配置时默认一项：根 impl_cpp_project，类型 cpp。\n' +
    '\n' +
    '【路径】\n' +
    'uml_root、namespace_root、各 code_impls.root 均可为相对路径（相对工作区根）或绝对路径。',
  logTitle: 'Log',
  logCopy: '复制',
  logClose: '关闭',
  logEmptyPlaceholder: '（尚无日志条目。执行「文件 → 重置示例」等操作后，信息将出现在此区域。）',
  statusReady: '就绪',
  statusDirty: '有未保存的更改',
  syncSummary: '同步配置',
  umlRoot: 'UML 根（uml_root）',
  codeImpls: '代码实现（code_impls）',
  namespaces: '命名空间根（namespace_root）',
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
  syncGuiHint:
    '在下方表单中编辑会写回当前文档（与右侧「文本内容」源码保持一致）；也可在右侧直接编辑 YAML。路径字段仅写入契约，不访问文件系统；命名空间根为单一值；代码实现添加后不可改目录与类型（可删除后重加）；同步策略为 none / strict。',
  syncRulesBody: '同步规则正文（Markdown）',
  syncAddCodeImpl: '添加代码实现',
  syncPathRecordOnlyHint: '仅写入契约，不访问文件系统。',
  syncNamespaceSingleHint: '单一根路径，不支持多条追加。',
  syncAddCodeImplTitle: '添加代码实现',
  syncModalConfirm: '确定',
  syncModalCancel: '取消',
  syncCodeImplActions: '代码实现操作',
  syncCodeImplEdit: '修改',
  syncCodeImplDelete: '删除',
  syncCodeImplImmutableBody: '创建后不可更改目录与实现类型。如需变更请删除此项后重新添加。',
  syncCodeImplDirNotFound: '当前工作区中不存在该目录：请先有位于此路径下的已打开文件，或改用已存在的目录。',
  syncCodeImplDirAbsoluteHint: '绝对路径无法在界面内校验是否存在；请自行确认。',
  syncCodeImplDuplicate: '该目录已在代码实现列表中。',
  syncCodeRootField: '目录',
  syncCodeTypeField: '代码类型',
  syncProfile: '同步策略',
  syncProfileNone: 'none',
  syncProfileStrict: 'strict',
  dockTextContent: '文本内容',
  dockTextShort: '文本',
  dockProperties: '属性',
  dockPropsShort: '属性',
  dockAreaRightAria: '右侧停靠区域',
  dockPropsTitleBarAria: '属性停靠窗口标题',
  propsKindSync: '同步配置 (uml.sync)',
  propsKindUml: 'UML 图 (*.uml.md)',
  propsKindClass: '类定义 (*.class.md)',
  propsKindCode: '代码片段 (*.code.md)',
  propsKindOther: '其它 / 未知',
  propsPath: '路径',
    propsKind: '类型',
    propsDiagramType: '图类型',
  propsDirty: '未保存',
  propsDirtyYes: '是',
  propsDirtyNo: '否',
  propsLines: '行数',
  propsEncoding: '编码',
  propsContext: '上下文',
  propsContextDocument: '当前文档',
  propsContextObject: '选中对象',
  propsMermaidElement: '图中元素（Mermaid）',
  propsNodeId: '元素 ID',
  propsNodeLabel: '显示名',
  propsTextRange: '文本选区',
  propsSelRange: '范围',
  propsSelLength: '长度',
  propsSelPreview: '预览',
  dockPanelShow: '在停靠区显示',
  dockPanelHide: '在停靠区隐藏',
  dockNoActiveFile: '无活动文件',
  mdiWorkspaceLabel: 'MDI 文档工作区',
  mdiTabStripLabel: '已打开文档',
  dirtyTabHint: '未保存',
  closeTabHint: '关闭标签',
  canvasAriaLabel: '画布',
  canvasEmptyHint: '请从「文件」菜单打开或新建文档。',
  canvasKindClassTitle: '类定义（*.class.md）',
  canvasKindClassHint:
    '上方为与类图风格一致的画布：继承与关联仅作只读展示（来自文件内 <!-- class-md-meta -->）。下方表格可编辑成员。',
  classMdReadonlyInherit: '继承（只读）',
  classMdReadonlyAssoc: '关联（只读）',
  classMdTableHint: '编辑成员（Kind / Name / Type / Note）；继承与关联请在对应 *.uml.md 中维护，并在本文件 meta 注释中同步展示名。',
  classMdAddRow: '添加行',
  canvasKindCodeTitle: '代码片段（*.code.md）',
  canvasKindCodeHint:
    '中央为 2D 画布：左侧工具栏可新建函数 / 变量或常量 / 宏；卡片可拖拽布局，点击下方表单编辑字段。右侧停靠区仍可编辑全文。',
  codeCanvasViewportTitle: '中键平移 · 滚轮缩放 · 拖卡片移动',
  codeCanvasToolbarAria: '代码画布工具栏',
  codeCanvasNewFunction: '新建函数',
  codeCanvasNewVariable: '新建变量',
  codeCanvasNewMacro: '新建宏',
  codeCanvasDelete: '删除',
  codeCanvasInspectorHint: '选中画布上的卡片后，在此编辑对应表格字段（已同步至文档）。',
  codeCanvasFieldKind: 'Kind',
  codeCanvasFieldName: 'Name',
  codeCanvasFieldSignature: '签名（抽象）',
  codeCanvasFieldEffect: '效果 / 返回值',
  codeCanvasFieldType: '类型（抽象）',
  codeCanvasFieldExpand: '展开语义（抽象）',
  codeCanvasFieldNote: 'Note',
  canvasKindUnknownTitle: '其它文本',
  canvasKindUnknownHint: '未识别的扩展名；可在右侧停靠区编辑纯文本。',
  dockCollapse: '折叠文本停靠区',
  dockExpand: '展开文本停靠区',
  dockTitleBarAria: '文本内容停靠窗口标题',
  dockFoldBody: '收起源码主体',
  dockUnfoldBody: '展开源码主体',
  dockMaximize: '最大化停靠区',
  dockRestoreSize: '还原停靠区大小',
  dockClose: '关闭停靠区',
  dockButtonBarAria: '停靠按钮条',
  dockInnerResize: '拖动调整属性与文本区域高度',
  menuWindow: '窗口',
  menuShowTextDock: '显示「文本内容」停靠区',
  menuShowPropsDock: '显示「属性」停靠区',
  toolbarAriaLabel: '主工具栏',
  toolbarNew: '新建',
  toolbarOpen: '打开',
  toolbarSave: '保存',
  toolbarSaveAll: '全部保存',
  toolbarSaveAs: '另存',
  toolbarRevert: '还原',
  cdeNewClass: '新建类',
  cdeFit: '适应',
  cdeOrigin: '原点',
  cdeResetZoom: '还原',
  cdeZoomIn: '放大',
  cdeZoomOut: '缩小',
  cdeCtxMember: '添加成员',
  cdeCtxAttr: '添加属性',
  cdeCtxMethod: '添加方法',
  cdeCtxSubclass: '插入子 class',
  cdeCtxManage: '管理成员…',
  cdeManageTitle: '类成员',
  cdeClassName: '类名',
  cdeAttrs: '属性',
  cdeMethods: '方法',
  cdeDelete: '删除',
  cdeAddAttr: '添加属性行',
  cdeAddMethod: '添加方法行',
  cdeDeleteClass: '删除此类',
  cdsEditDefinition: '类定义编辑',
  cdsEditorHint: '在此编辑类名、属性与方法；主画布为只读展示。关闭后更改已写入当前文档。',
  cdsPickClassToEdit: '选择要详细编辑的类：',
  cdsInheritHandleHint: '拖拽到父类框以设置继承（子类顶部圆点连向父类）',
  cdeShortcutsPanel: '快捷键',
  cdeShortcutsBody:
    '中键拖拽：平移画布\n滚轮：缩放（指针位置为锚点）\n左键拖拽类框：移动布局\n类框左上：折叠/展开\n类顶圆点：拖向父类建立继承',
  cdeVisibilityPanel: '显示',
  cdeShowInherit: '继承关系',
  cdeShowAssoc: '关联关系',
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
    '• uml.sync.md: YAML front matter + sync rules body; fields: namespace_root (scalar, single), uml_root, code_impls, sync_profile (none | strict, default strict). Paths are recorded only. Defaults: namespace root namespace, one cpp impl at impl_cpp_project. Legacy namespace_dirs and code_roots + top-level code_type still parse.\n' +
    '• *.uml.md: one diagram per file recommended; canvas renders the first ```mermaid block.\n' +
    '• *.class.md: class definitions (### Name + table).\n' +
    '• *.code.md: non-class snippets; must live under a namespace_root (same tree as *.class.md), not under code_impls roots.',
  helpPanelTitle: 'Help',
  helpBody:
    'Open from Help menu or press F1.\n' +
    'Layout: center MDI workspace (tabs above, canvas below by file type); right dock is plain-text editing.\n' +
    'Menu order: File → Language → Theme → Window → Help. Use Window to restore closed “Text content” or “Properties” docks. Language: 中文 / English (not cycling).\n' +
    'Theme: system / light / dark (not cycling).\n' +
    'Unsaved changes show a marker on tabs and a dot in the title; leaving the page may prompt.',
  helpGlossaryTitle: 'Glossary (uml.sync)',
  helpGlossaryBody:
    '[uml_root — UML root]\n' +
    'Root directory for all managed UML artifacts (e.g. *.uml.md).\n' +
    '\n' +
    '[namespace_root — Namespace root]\n' +
    'Single scalar path in YAML (not a list) for UML-side artifacts; subfolders are sub-namespaces.\n' +
    '*.class.md, *.code.md (non-class snippets), and diagram files under a folder belong to that namespace; *.code.md is not placed under code_impls roots. Default: namespace.\n' +
    '\n' +
    '[code_impls — Code implementations]\n' +
    'Multiple entries allowed: each has a unique code root and language/stack id (e.g. cpp, csharp). Duplicate roots: first wins. Default: one entry root impl_cpp_project, type cpp.\n' +
    '\n' +
    '[Paths]\n' +
    'uml_root, namespace_root, and each code_impls.root may be relative (to the workspace root) or absolute.',
  logTitle: 'Log',
  logCopy: 'Copy',
  logClose: 'Close',
  logEmptyPlaceholder:
    '(No log lines yet. Actions such as File → Reset demo will append here.)',
  statusReady: 'Ready',
  statusDirty: 'Unsaved changes',
  syncSummary: 'Sync config',
  umlRoot: 'UML root (uml_root)',
  codeImpls: 'Code implementations (code_impls)',
  namespaces: 'Namespace root (namespace_root)',
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
  syncGuiHint:
    'Edits below update the document (same as the “Text content” source on the right); you may also edit YAML there directly. Path fields are stored in the contract only (no file access). Namespace root is a single value. Code implementations cannot change root/type after creation (delete and re-add). Sync profile: none or strict.',
  syncRulesBody: 'Sync rules body (Markdown)',
  syncAddCodeImpl: 'Add code implementation',
  syncPathRecordOnlyHint: 'Stored in the contract only; no file system access.',
  syncNamespaceSingleHint: 'Single path; multiple roots are not supported.',
  syncAddCodeImplTitle: 'Add code implementation',
  syncModalConfirm: 'OK',
  syncModalCancel: 'Cancel',
  syncCodeImplActions: 'Code implementation actions',
  syncCodeImplEdit: 'Edit',
  syncCodeImplDelete: 'Delete',
  syncCodeImplImmutableBody:
    'Directory and implementation type cannot be changed after creation. Delete this entry and add a new one to change them.',
  syncCodeImplDirNotFound:
    'This directory is not in the workspace yet: open a file under this path first, or pick an existing folder.',
  syncCodeImplDirAbsoluteHint: 'Absolute paths cannot be validated here; confirm on your machine.',
  syncCodeImplDuplicate: 'This directory is already listed as a code implementation.',
  syncCodeRootField: 'Directory',
  syncCodeTypeField: 'Code type',
  syncProfile: 'Sync profile',
  syncProfileNone: 'none',
  syncProfileStrict: 'strict',
  dockTextContent: 'Text content',
  dockTextShort: 'Txt',
  dockProperties: 'Properties',
  dockPropsShort: 'Props',
  dockAreaRightAria: 'Right dock area',
  dockPropsTitleBarAria: 'Properties dock title',
  propsKindSync: 'Sync (uml.sync)',
  propsKindUml: 'UML (*.uml.md)',
  propsKindClass: 'Class (*.class.md)',
  propsKindCode: 'Code (*.code.md)',
  propsKindOther: 'Other / unknown',
  propsPath: 'Path',
    propsKind: 'Kind',
    propsDiagramType: 'Diagram type',
  propsDirty: 'Dirty',
  propsDirtyYes: 'Yes',
  propsDirtyNo: 'No',
  propsLines: 'Lines',
  propsEncoding: 'Encoding',
  propsContext: 'Context',
  propsContextDocument: 'Current document',
  propsContextObject: 'Selection',
  propsMermaidElement: 'Diagram element (Mermaid)',
  propsNodeId: 'Element ID',
  propsNodeLabel: 'Label',
  propsTextRange: 'Text selection',
  propsSelRange: 'Range',
  propsSelLength: 'Length',
  propsSelPreview: 'Preview',
  dockPanelShow: 'Show in dock',
  dockPanelHide: 'Hide from dock',
  dockNoActiveFile: 'No active file',
  mdiWorkspaceLabel: 'MDI document workspace',
  mdiTabStripLabel: 'Open documents',
  dirtyTabHint: 'Unsaved',
  closeTabHint: 'Close tab',
  canvasAriaLabel: 'Canvas',
  canvasEmptyHint: 'Open or create a document from the File menu.',
  canvasKindClassTitle: 'Class definitions (*.class.md)',
  canvasKindClassHint:
    'Diagram-style canvas above: inheritance/association are read-only (from <!-- class-md-meta --> in the file). Edit members in the table below.',
  classMdReadonlyInherit: 'Inherits (read-only)',
  classMdReadonlyAssoc: 'Association (read-only)',
  classMdTableHint:
    'Edit members (Kind / Name / Type / Note). Maintain relations in *.uml.md and mirror display names in this file’s meta comment.',
  classMdAddRow: 'Add row',
  canvasKindCodeTitle: 'Code snippets (*.code.md)',
  canvasKindCodeHint:
    '2D canvas: use the left toolbar to add a function, variable/constant, or macro; drag cards and edit fields in the form below. The text dock still edits the full file.',
  codeCanvasViewportTitle: 'Middle-drag pan · Wheel zoom · Drag cards',
  codeCanvasToolbarAria: 'Code canvas toolbar',
  codeCanvasNewFunction: 'New function',
  codeCanvasNewVariable: 'New variable',
  codeCanvasNewMacro: 'New macro',
  codeCanvasDelete: 'Delete',
  codeCanvasInspectorHint: 'Select a card on the canvas to edit its fields (synced to the document).',
  codeCanvasFieldKind: 'Kind',
  codeCanvasFieldName: 'Name',
  codeCanvasFieldSignature: 'Signature (abstract)',
  codeCanvasFieldEffect: 'Effect / return',
  codeCanvasFieldType: 'Type (abstract)',
  codeCanvasFieldExpand: 'Expansion (abstract)',
  codeCanvasFieldNote: 'Note',
  canvasKindUnknownTitle: 'Plain text',
  canvasKindUnknownHint: 'Unknown extension; edit as plain text in the right dock.',
  dockCollapse: 'Collapse text dock',
  dockExpand: 'Expand text dock',
  dockTitleBarAria: 'Text content dock title',
  dockFoldBody: 'Hide editor body',
  dockUnfoldBody: 'Show editor body',
  dockMaximize: 'Maximize dock',
  dockRestoreSize: 'Restore dock size',
  dockClose: 'Close dock',
  dockButtonBarAria: 'Dock button bar',
  dockInnerResize: 'Drag to resize properties vs text panel height',
  menuWindow: 'Window',
  menuShowTextDock: 'Show “Text content” dock',
  menuShowPropsDock: 'Show “Properties” dock',
  toolbarAriaLabel: 'Main toolbar',
  toolbarNew: 'New',
  toolbarOpen: 'Open',
  toolbarSave: 'Save',
  toolbarSaveAll: 'Save all',
  toolbarSaveAs: 'Save as',
  toolbarRevert: 'Revert',
  cdeNewClass: 'New class',
  cdeFit: 'Fit',
  cdeOrigin: 'Origin',
  cdeResetZoom: 'Reset zoom',
  cdeZoomIn: 'Zoom in',
  cdeZoomOut: 'Zoom out',
  cdeCtxMember: 'Add member',
  cdeCtxAttr: 'Add attribute',
  cdeCtxMethod: 'Add method',
  cdeCtxSubclass: 'Insert subclass',
  cdeCtxManage: 'Manage members…',
  cdeManageTitle: 'Class members',
  cdeClassName: 'Class name',
  cdeAttrs: 'Attributes',
  cdeMethods: 'Methods',
  cdeDelete: 'Delete',
  cdeAddAttr: 'Add attribute row',
  cdeAddMethod: 'Add method row',
  cdeDeleteClass: 'Delete class',
  cdsEditDefinition: 'Class definition editor',
  cdsEditorHint:
    'Edit class names, attributes, and methods here; the main canvas is read-only. Changes are written when you close.',
  cdsPickClassToEdit: 'Choose a class to edit:',
  cdsInheritHandleHint: 'Drag onto a parent class box to set inheritance (child top handle to parent)',
  cdeShortcutsPanel: 'Shortcuts',
  cdeShortcutsBody:
    'Middle-drag: pan\nWheel: zoom (pointer anchor)\nDrag class box: move layout\nTop-left fold: collapse/expand\nTop handle: drag to parent for inheritance',
  cdeVisibilityPanel: 'Visibility',
  cdeShowInherit: 'Inheritance',
  cdeShowAssoc: 'Associations',
};

export function getMessages(locale: LocaleId): UiMessages {
  if (locale === 'zh') return zh;
  return en;
}
