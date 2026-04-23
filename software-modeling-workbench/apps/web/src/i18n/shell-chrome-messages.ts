import type { AppLocale } from './app-locale';

/** 主壳层（菜单已合并进 `menu-bar`）：工具栏、Dock、标签、Markdown 区、属性、状态栏、弹窗、右键菜单等 */
export type ShellChromeMessages = {
  workspaceHintDefault: string;
  errCanvasRead: string;
  errBlockRead: string;
  statusReady: string;
  logCopied: string;
  alertCopyFail: string;
  alertNoWorkspace: string;
  alertOutsideWorkspaceSave: string;
  alertNoWorkspaceOpenFile: string;
  alertOutsideWorkspacePick: string;
  tbAria: string;
  tbNew: string;
  tbNewTitle: string;
  tbOpen: string;
  tbOpenTitle: string;
  tbOpenFolder: string;
  tbOpenFolderTitle: string;
  tbSave: string;
  tbSaveTitle: string;
  tbSaveAs: string;
  tbSaveAsTitle: string;
  tbClose: string;
  tbCloseTitle: string;
  tbDiskWorkspace: string;
  tbDiskWorkspaceTitle: string;
  tbFullscreen: string;
  tbFullscreenExit: string;
  tbFullscreenTitle: string;
  tbFullscreenExitTitle: string;
  dockOutlineAria: string;
  dockOutlineTitle: string;
  /** 左侧竖条：文档/围栏/次要 合并面板（全名，非缩写） */
  dockLeftStripDocPanel: string;
  /** 左侧竖条：UI 设计对象树（全名） */
  dockLeftStripUiOutline: string;
  /** 左侧竖条：UI 控件库（全名） */
  dockLeftStripUiLibrary: string;
  /** 右侧竖条（ui-design）：UI 属性 / SVG 结构 / SVG 对象属性 — 各为独立 dock */
  dockRightStripDesignUiProps: string;
  dockRightStripDesignUiPropsTitle: string;
  dockRightStripDesignSvgTree: string;
  dockRightStripDesignSvgTreeTitle: string;
  dockRightStripDesignSvgObject: string;
  dockRightStripDesignSvgObjectTitle: string;
  /** 右侧竖条：脑图「格式」面板（完整词，非 Fmt 缩写） */
  dockRightStripMindmapFormat: string;
  dockClearSelection: string;
  dockClearSelectionTitle: string;
  dockInsertFenceAtEnd: string;
  dockInsertFenceAtEndTitle: string;
  dockExpandOutline: string;
  dockCollapseOutline: string;
  /** 左侧 DockPanel 标题栏 ‹：隐藏当前面板（非收起整栏） */
  dockClosePanelTitle: string;
  dockSectionDoc: string;
  dockNoHeadings: string;
  dockFenceOutline: string;
  dockFenceOutlineHint: string;
  dockNoFenceKinds: string;
  dockFenceOpenCanvas: string;
  /** 大纲列表每行右侧：打开/编辑画布（左侧 Dock） */
  dockFenceEditBlock: string;
  dockSecondaryPlaceholder: string;
  outlineExpandChild: string;
  outlineCollapseChild: string;
  outlineJumpTitle: string;
  outlineLineTitle: string;
  docTabsAria: string;
  closeTabTitle: string;
  closeTabAria: string;
  subtabsAria: string;
  subtabDoc: string;
  subtabDocTitle: string;
  closeCanvasTabTitle: string;
  closeCanvasTabAria: string;
  mdHeadingMarkdown: string;
  mdModeAria: string;
  mdPreview: string;
  mdPreviewTitle: string;
  mdRich: string;
  mdRichTitle: string;
  mdSource: string;
  mdSourceTitle: string;
  mdSourceAreaAria: string;
  mdSourceAreaTitle: string;
  emptyPickTab: string;
  propsAria: string;
  propsExpand: string;
  propsCollapse: string;
  propsTitle: string;
  dockOpenCanvasLabelDefault: string;
  dockOpenCanvasTitleDefault: string;
  editJson: string;
  editJsonTitle: string;
  shellEdit: string;
  shellEditTitle: string;
  basicProps: string;
  codespaceCanvasSelectionTitle: string;
  codespaceClickCanvas: string;
  modelRefsSummaryTitle: string;
  modelRefsSummaryHover: string;
  fullJsonSummary: string;
  fullJsonSummaryHover: string;
  propsPath: string;
  propsChars: string;
  propsFenceCount: string;
  propsParseWarns: string;
  propsPickBlockHint: string;
  codespaceDockSelectionHeading: string;
  /** 状态栏「壳」前缀文案（不含实际 shell 名） */
  statusShellPrefix: string;
  statusShellTooltip: string;
  statusDocPrefix: string;
  statusDocTooltip: string;
  modalEditBlockPrefix: string;
  modalCancel: string;
  modalSaveMd: string;
  logTitle: string;
  logHint: string;
  logClose: string;
  logCopyAll: string;
  mdCtxAria: string;
  ctxPreview: string;
  ctxPreviewTitle: string;
  ctxRich: string;
  ctxRichTitle: string;
  ctxSource: string;
  ctxSourceTitle: string;
  ctxInsert: string;
  ctxInsertNoDocTitle: string;
  ctxInsertPreviewTitle: string;
  ctxPreviewReadonlyHint: string;
  ctxInsertTitle: string;
  logNeedDoc: string;
  logNeedRichOrSource: string;
  labelKind: string;
  labelSubtype: string;
  labelBlockId: string;
  labelFenceLines: string;
  labelBodyChars: string;
  labelCharsUnit: string;
  labelCanvas: string;
  /** 独立块画布窗口「关闭」 */
  blockCanvasClosePopupTitle: string;
  blockCanvasNotFound: string;
  blockCanvasBodyAria: string;
  /** ``mv-model-codespace`` 块画布顶栏 `<strong>` 标题：固定 ASCII，与 `@mvwb/core` 常量一致且不依赖 core 包预构建缓存 */
  canvasTitleMvModelCodespace: string;
  labelGroupTitle: string;
  labelTableCount: string;
  labelSubtableIds: string;
  labelTitle: string;
  labelDocCount: string;
  labelRootGroupName: string;
  labelWorkspaceRoot: string;
  labelModuleCount: string;
  labelModuleIds: string;
  labelNsNodeCount: string;
  labelClassifierCount: string;
  labelEndpointCount: string;
  labelEndpointIds: string;
  labelModelRefs: string;
  labelModelRefsEmpty: string;
  labelPayloadSummary: string;
  labelMapRules: string;
  canvasOpenPrefix: string;
  canvasOpenInTabHint: string;
  canvasHintSql: string;
  canvasHintKv: string;
  canvasHintStruct: string;
  canvasHintCodespace: string;
  canvasHintInterface: string;
  canvasHintMap: string;
  /** mv-view 中 uml-* payload 输入框下方提示：默认结构来自 core 映射 */
  viewUmlPayloadMappingHint: string;
  dockSqlHeading: string;
  dockSqlNoTables: string;
  dockKvHeading: string;
  dockKvNoDocs: string;
  dockStructHeading: string;
  dockStructEmptyRoot: string;
  dockCodespaceHeading: string;
  dockCodespaceNoModules: string;
  dockIfHeading: string;
  dockIfNoEndpoints: string;
  dockMapHeading: string;
  dockMermaidClassHeading: string;
  dockMermaidNoClass: string;
  dockPayloadEmpty: string;
  dockMindmapHeading: string;
  dockUmlClassHeading: string;
  dockUmlGenericHeading: string;
  dockUmlNoEntities: string;
  dockSeqHeading: string;
  dockSeqNoParticipants: string;
  dockActHeading: string;
  dockUiHeading: string;
  dockPayloadBadJson: string;
  dockActNoSteps: string;
  dockKvDocLabel: string;
  dockKvDocEmpty: string;
  mindmapPayloadBad: string;
  activityNoSteps: string;
  payloadEmptyShort: string;
  emptyObjectShort: string;
  dockBlockActionsAria: string;
  /** 菜单/按钮 title 末尾「无全局快捷键」类短句 */
  hintNoShortcut: string;
  /** 二级大纲：SQL 子表行内「列 / 行」标签 */
  dockSqlColsInLine: string;
  dockSqlRowsInLine: string;
  /** 二级大纲：struct 层次行前缀 */
  dockStructWordGroup: string;
  dockStructWordDataset: string;
  /** mv-view 非 mermaid 分支 modelRefs 行在「无引用」时的占位 */
  dockViewModelRefsNone: string;
  /** 块画布：modelRefs 相对路径输入框标签 */
  modelRefsPickerPathLabel: string;
  /** 块画布：modelRefs 相对路径 placeholder */
  modelRefsPickerPathPlaceholder: string;
  /** 块画布：modelRefs 可选模型列表说明 */
  modelRefsPickerListHint: string;
  /** 块画布：目标 .md 未在工作区打开时的提示 */
  modelRefsPickerFileMissing: string;
  /** 块画布：相对路径旁「从工作区选 .md」按钮 */
  modelRefsPickerOpenFileButton: string;
  /** 块画布：清空相对路径输入 */
  modelRefsPickerClearPathButton: string;
  /** 块画布：单选绑定列表下的说明（含未上表引用位置） */
  modelRefsPickerBindListHintSingle: string;
  /** 块画布：modelRefs 分区 Tab — 绑定列表文件与勾选 */
  modelRefsPickerTabBind: string;
  /** ui-design mv-view：「绑定模型」Tab 顶部说明（SVG 在并列「画布」Tab） */
  modelRefsPickerBindNoSvgCanvas: string;
  /** ui-design：与「绑定模型」并列的 SVG 画布 Tab 标签 */
  modelRefsPickerCanvasTab: string;
  /** 块画布：modelRefs 分区 Tab — 未出现在候选表中的已保存 ref（非画布预览） */
  modelRefsPickerTabOrphans: string;
  /** 块画布：孤儿 ref 列表前的说明（与 ref: 示例同一语境） */
  modelRefsPickerOrphansHint: string;
  /** 块画布：modelRefs 子 Tab 容器 aria-label */
  modelRefsPickerTablistAria: string;
  /** 块画布：modelRefs 高级手写展开 */
  modelRefsAdvancedToggle: string;
  /** 菜单「新建」生成的 Markdown 一级标题文本（不含 `#`） */
  newDocHeading: string;
};

export const shellChromeMessages: Record<AppLocale, ShellChromeMessages> = {
  zh: {
    workspaceHintDefault: '请用「打开文件夹」选择含 .md 的目录（浏览器）或使用 Electron / VS Code 扩展。',
    errCanvasRead: '无法读取文件（代码块画布）。',
    errBlockRead: '无法读取块文件（请先在工作区主窗口选择磁盘目录）。',
    statusReady: '就绪 — 点击查看日志',
    logCopied: '已复制日志全文到剪贴板',
    alertCopyFail: '复制失败：浏览器未授予剪贴板权限或不可用。',
    alertNoWorkspace: '请先用菜单「文件 → 打开磁盘工作区」选择工作区目录。',
    alertOutsideWorkspaceSave: '只能保存到当前工作区目录内。',
    alertNoWorkspaceOpenFile: '请先用「文件 → 打开磁盘工作区」选择工作区，再打开其中的 .md 文件。',
    alertOutsideWorkspacePick: '只能选择当前工作区目录内的文件。',
    tbAria: '工具栏',
    tbNew: '新建',
    tbNewTitle: '新建 Markdown — 无全局快捷键',
    tbOpen: '打开',
    tbOpenTitle: '打开单个 .md（Chrome/Edge 可获写盘句柄）— 无全局快捷键',
    tbOpenFolder: '打开文件夹',
    tbOpenFolderTitle: '打开文件夹（批量 .md）— 无全局快捷键',
    tbSave: '保存',
    tbSaveTitle: '保存 Ctrl+S — 无全局快捷键',
    tbSaveAs: '另存为',
    tbSaveAsTitle: '另存为 Ctrl+Shift+S — 无全局快捷键',
    tbClose: '关闭',
    tbCloseTitle: '关闭当前文档 Ctrl+W — 无全局快捷键',
    tbDiskWorkspace: '磁盘工作区',
    tbDiskWorkspaceTitle: '打开磁盘工作区（Web 目录选择）— 无全局快捷键',
    tbFullscreen: '全屏',
    tbFullscreenExit: '退出全屏',
    tbFullscreenTitle: '全屏显示工作台 — 无全局快捷键',
    tbFullscreenExitTitle: '退出全屏 — 无全局快捷键（也可按 Esc 视浏览器而定）',
    dockOutlineAria: '大纲视图',
    dockOutlineTitle: '大纲',
    dockLeftStripDocPanel: '文档与代码块大纲',
    dockLeftStripUiOutline: 'UI 大纲',
    dockLeftStripUiLibrary: 'UI 控件库',
    dockRightStripDesignUiProps: 'UI 属性',
    dockRightStripDesignUiPropsTitle: '切换 UI 属性面板 — 无全局快捷键',
    dockRightStripDesignSvgTree: 'SVG 结构',
    dockRightStripDesignSvgTreeTitle: '切换 SVG 结构面板 — 无全局快捷键',
    dockRightStripDesignSvgObject: 'SVG 对象属性',
    dockRightStripDesignSvgObjectTitle: '切换 SVG 对象属性面板 — 无全局快捷键',
    dockRightStripMindmapFormat: '格式',
    dockClearSelection: '清除选择',
    dockClearSelectionTitle: '清除当前围栏块选择 — 无全局快捷键',
    dockInsertFenceAtEnd: '添加代码段',
    dockInsertFenceAtEndTitle: '在当前文档末尾追加代码段 — 无全局快捷键',
    dockExpandOutline: '展开大纲 Dock — 无全局快捷键',
    dockCollapseOutline: '折叠大纲 Dock — 无全局快捷键',
    dockClosePanelTitle: '隐藏此面板',
    dockSectionDoc: '文档章节',
    dockNoHeadings: '（当前文档无 ATX 标题）',
    dockFenceOutline: '代码块大纲',
    dockFenceOutlineHint:
      '中间列仅 Markdown；光标在围栏内时右侧属性会随动；亦可在此选中下列块，行末「代码块」打开代码块画布子标签。',
    dockNoFenceKinds:
      '（当前文档无 mv-model-sql / mv-model-kv / mv-model-struct / mv-model-codespace / mv-model-interface / mv-view / mv-map 围栏）',
    dockFenceOpenCanvas: '代码块',
    dockFenceEditBlock: '编辑',
    dockSecondaryPlaceholder: '在上方「代码块大纲」中选中块后，此处将显示该块相关结构（如 class 列表、表字段等）。',
    outlineExpandChild: '展开子章节',
    outlineCollapseChild: '折叠子章节',
    outlineJumpTitle: '跳转到第 {n} 行 — 无全局快捷键',
    outlineLineTitle: '第 {n} 行',
    docTabsAria: '已打开文档',
    closeTabTitle: '关闭 {path}',
    closeTabAria: '关闭 {label}',
    subtabsAria: '文档与代码块画布',
    subtabDoc: '文档',
    subtabDocTitle: '文档编辑（仅 Markdown）— 无全局快捷键',
    closeCanvasTabTitle: '关闭代码块画布标签 — 无全局快捷键',
    closeCanvasTabAria: '关闭代码块画布 {id}',
    mdHeadingMarkdown: 'Markdown',
    mdModeAria: 'Markdown 显示模式',
    mdPreview: '预览',
    mdPreviewTitle: '预览（只读）— 无全局快捷键',
    mdRich: '富文本',
    mdRichTitle: '富文本（Vditor）— 无全局快捷键',
    mdSource: '原始文本',
    mdSourceTitle: '原始文本 — 无全局快捷键',
    mdSourceAreaAria: 'Markdown 原始文本',
    mdSourceAreaTitle: '原始文本编辑 — 无全局快捷键',
    emptyPickTab: '请选择标签',
    propsAria: '属性',
    propsExpand: '展开属性 Dock — 无全局快捷键',
    propsCollapse: '折叠属性 Dock — 无全局快捷键',
    propsTitle: '属性',
    dockOpenCanvasLabelDefault: '打开代码块画布',
    dockOpenCanvasTitleDefault: '打开代码块画布 — 无全局快捷键',
    editJson: '编辑 JSON',
    editJsonTitle: '在对话框中编辑该块 JSON — 无全局快捷键',
    shellEdit: '弹窗编辑',
    shellEditTitle: '在应用内 JSON 对话框中编辑 — 无全局快捷键',
    basicProps: '基本属性',
    codespaceCanvasSelectionTitle: '代码空间画布当前单击选中 — 无全局快捷键',
    codespaceClickCanvas: '（在画布上单击节点）',
    modelRefsSummaryTitle: 'modelRefs 地址说明',
    modelRefsSummaryHover: 'modelRefs 书写约定 — 无全局快捷键',
    fullJsonSummary: '完整 JSON',
    fullJsonSummaryHover: '展开或折叠完整 JSON — 无全局快捷键',
    propsPath: '路径',
    propsChars: '字符数',
    propsFenceCount: '围栏块数',
    propsParseWarns: '解析警告',
    propsPickBlockHint: '在左侧「代码块大纲」中选中块后，此处显示基本属性、操作按钮与可展开的完整 JSON。',
    codespaceDockSelectionHeading: '画布选中',
    statusShellPrefix: '壳',
    statusShellTooltip: '运行壳',
    statusDocPrefix: '文档',
    statusDocTooltip: '已打开文档数',
    modalEditBlockPrefix: '编辑块',
    modalCancel: '取消',
    modalSaveMd: '保存到 MD',
    logTitle: '日志',
    logHint: '纯文本历史记录；「复制」写入当前全文（与下方文本一致）。',
    logClose: '关闭',
    logCopyAll: '复制全文',
    mdCtxAria: 'Markdown 区域',
    ctxPreview: '预览（只读）',
    ctxPreviewTitle: '切换到只读预览 — 无全局快捷键',
    ctxRich: '富文本（Vditor）',
    ctxRichTitle: '切换到富文本（Vditor）— 无全局快捷键',
    ctxSource: '原始文本',
    ctxSourceTitle: '切换到原始文本 — 无全局快捷键',
    ctxInsert: '插入代码块…',
    ctxInsertNoDocTitle: '请先打开或新建文档 — 无全局快捷键',
    ctxInsertPreviewTitle: '预览模式下不可用：请先切换到富文本或原始文本 — 无全局快捷键',
    ctxPreviewReadonlyHint: '当前是只读预览；交互编辑请切换到「富文本 / 原始文本」或使用右侧代码块画布。',
    ctxInsertTitle: '选择代码块类型并插入 mv-view / mv-model* 围栏 — 无全局快捷键',
    logNeedDoc: '请先打开或新建一个 Markdown 文档',
    logNeedRichOrSource: '插入代码块请先将 Markdown 区切换到「富文本」或「原始文本」',
    labelKind: '类型',
    labelSubtype: '子类型',
    labelBlockId: '块 ID',
    labelFenceLines: '围栏行',
    labelBodyChars: '正文长度',
    labelCharsUnit: '字符',
    labelCanvas: '代码块画布',
    blockCanvasClosePopupTitle: '关闭窗口 — 无全局快捷键',
    blockCanvasNotFound: '未找到块',
    blockCanvasBodyAria: 'Markdown 围栏代码块编辑画布',
    canvasTitleMvModelCodespace: '代码空间模型画布',
    labelGroupTitle: '组标题',
    labelTableCount: '子表数',
    labelSubtableIds: '子表 id',
    labelTitle: '标题',
    labelDocCount: '文档条数',
    labelRootGroupName: '根组名',
    labelWorkspaceRoot: 'workspaceRoot',
    labelModuleCount: '模块数',
    labelModuleIds: '模块 id',
    labelNsNodeCount: '命名空间节点数',
    labelClassifierCount: 'Classifier 数',
    labelEndpointCount: '端点数',
    labelEndpointIds: '端点 id',
    labelModelRefs: 'Model 地址 (modelRefs)',
    labelModelRefsEmpty: '（未绑定，须填写）',
    labelPayloadSummary: 'payload 概要',
    labelMapRules: '映射规则',
    canvasOpenPrefix: '打开',
    canvasOpenInTabHint: '在中间列以标签打开 — 无全局快捷键',
    canvasHintSql:
      'Model：文档内 ``mv-model-sql`` 围栏，一块内多张 SQL 风格子表；在画布中对子表增删改查并编辑列/行。',
    canvasHintKv: 'mv-model-kv：文档型集合（类比 MongoDB）；在 KV 数据表画布中按条编辑 JSON 对象。',
    canvasHintStruct: 'mv-model-struct：根下递归组与数据集（类比 HDF5）；在结构化层次画布中编辑整段 JSON。',
    canvasHintCodespace:
      'mv-model-codespace：工作区根与 modules[]（可选递归 namespaces、Classifier、bases、associations、变量/函数/宏）；在块画布的代码空间模型画布视图中编辑 JSON。',
    canvasHintInterface: 'mv-model-interface：endpoints[]（接口/端点示意）；在接口图模型画布中编辑 JSON。',
    canvasHintMap: 'Map 以 mv-map 围栏代码块存储：在映射规则代码块画布中编辑 JSON。',
    viewUmlPayloadMappingHint: '此类型默认 payload 由 core 的 UML 映射自动生成（`mvwb-uml/v1` + 对应 `diagramType`）。',
    dockSqlHeading: '当前块 · SQL Model 组',
    dockSqlNoTables: '（无子表）',
    dockKvHeading: '当前块 · KV 文档集',
    dockKvNoDocs: '（无文档）',
    dockStructHeading: '当前块 · 层次结构',
    dockStructEmptyRoot: '（空根）',
    dockCodespaceHeading: '当前块 · 代码空间',
    dockCodespaceNoModules: '（无模块）',
    dockIfHeading: '当前块 · 接口图',
    dockIfNoEndpoints: '（无端点）',
    dockMapHeading: '当前块 · 映射',
    dockMermaidClassHeading: '当前块 · classDiagram',
    dockMermaidNoClass: '（未匹配到 class 关键字）',
    dockPayloadEmpty: '（payload 为空）',
    dockMindmapHeading: '当前块 · 脑图节点',
    dockUmlClassHeading: '当前块 · Class (UML)',
    dockUmlGenericHeading: '当前块 · UML (独立格式)',
    dockUmlNoEntities: '（未匹配 entity/class/interface/enum）',
    dockSeqHeading: '当前块 · 序列图',
    dockSeqNoParticipants: '（未匹配 participant/actor）',
    dockActHeading: '当前块 · 活动图',
    dockUiHeading: '当前块 · UI 设计',
    dockPayloadBadJson: '（payload 非 JSON 或无法解析节点）',
    dockActNoSteps: '（未从 payload 识别活动步骤，可在代码块画布中编辑）',
    dockKvDocLabel: '文档',
    dockKvDocEmpty: '（空对象）',
    mindmapPayloadBad: '（payload 非 JSON 或无法解析节点）',
    activityNoSteps: '（未从 payload 识别活动步骤，可在代码块画布中编辑）',
    payloadEmptyShort: '（payload 为空）',
    emptyObjectShort: '（空对象）',
    dockBlockActionsAria: '块操作',
    hintNoShortcut: '无全局快捷键',
    dockSqlColsInLine: '列',
    dockSqlRowsInLine: '行',
    dockStructWordGroup: '组',
    dockStructWordDataset: '数据集',
    dockViewModelRefsNone: '（无）',
    modelRefsPickerPathLabel: 'Model 所在文件（相对路径，空=当前文档）',
    modelRefsPickerPathPlaceholder: '例如 models/data.md；留空表示当前 .md',
    modelRefsPickerListHint: '勾选要绑定的模型（可多选）；未列出的引用见下方高级区。',
    modelRefsPickerFileMissing: '该路径下的 Markdown 未载入工作区，无法列出模型；请在工作区打开对应 .md 或用手写地址。',
    modelRefsPickerOpenFileButton: '打开文件',
    modelRefsPickerClearPathButton: '清空',
    modelRefsPickerBindListHintSingle: '勾选要绑定的模型（单选）；未出现在上表的引用列于下方。',
    modelRefsPickerTabBind: '通用设置',
    modelRefsPickerBindNoSvgCanvas:
      '在此绑定模型引用；编辑 SVG 请切换到「画布」标签。',
    modelRefsPickerCanvasTab: '设计区',
    modelRefsPickerTabOrphans: '未上表引用',
    modelRefsPickerOrphansHint: '其它已保存引用（未出现在上表）：',
    modelRefsPickerTablistAria: '模型引用分区',
    modelRefsAdvancedToggle: '高级：手写 modelRefs（逗号分隔）',
    newDocHeading: '新文档',
  },
  en: {
    workspaceHintDefault:
      'Use **Open Folder** to pick a directory of .md files (browser), or use Electron / the VS Code extension.',
    errCanvasRead: 'Could not read file (block canvas).',
    errBlockRead: 'Could not read block file (pick a disk workspace in the main window first).',
    statusReady: 'Ready — click to view log',
    logCopied: 'Full log copied to clipboard',
    alertCopyFail: 'Copy failed: clipboard permission denied or unavailable.',
    alertNoWorkspace: 'Use **File → Open Disk Workspace** to choose a workspace folder first.',
    alertOutsideWorkspaceSave: 'Save path must be inside the current workspace.',
    alertNoWorkspaceOpenFile: 'Choose a workspace with **Open Disk Workspace**, then open an .md file from it.',
    alertOutsideWorkspacePick: 'You can only pick files inside the current workspace.',
    tbAria: 'Toolbar',
    tbNew: 'New',
    tbNewTitle: 'New Markdown — no global shortcut',
    tbOpen: 'Open',
    tbOpenTitle: 'Open a single .md (Chrome/Edge may grant write handle) — no global shortcut',
    tbOpenFolder: 'Open Folder',
    tbOpenFolderTitle: 'Open folder (batch .md) — no global shortcut',
    tbSave: 'Save',
    tbSaveTitle: 'Save Ctrl+S — no global shortcut',
    tbSaveAs: 'Save As',
    tbSaveAsTitle: 'Save As Ctrl+Shift+S — no global shortcut',
    tbClose: 'Close',
    tbCloseTitle: 'Close current document Ctrl+W — no global shortcut',
    tbDiskWorkspace: 'Disk workspace',
    tbDiskWorkspaceTitle: 'Open disk workspace (web folder picker) — no global shortcut',
    tbFullscreen: 'Fullscreen',
    tbFullscreenExit: 'Exit fullscreen',
    tbFullscreenTitle: 'Fullscreen workbench — no global shortcut',
    tbFullscreenExitTitle: 'Exit fullscreen — no global shortcut (Esc may work depending on browser)',
    dockOutlineAria: 'Outline',
    dockOutlineTitle: 'Outline',
    dockLeftStripDocPanel: 'Document & fences',
    dockLeftStripUiOutline: 'UI outline',
    dockLeftStripUiLibrary: 'UI library',
    dockRightStripDesignUiProps: 'UI properties',
    dockRightStripDesignUiPropsTitle: 'Toggle UI properties panel — no global shortcut',
    dockRightStripDesignSvgTree: 'SVG structure',
    dockRightStripDesignSvgTreeTitle: 'Toggle SVG structure panel — no global shortcut',
    dockRightStripDesignSvgObject: 'SVG object properties',
    dockRightStripDesignSvgObjectTitle: 'Toggle SVG object properties panel — no global shortcut',
    dockRightStripMindmapFormat: 'Format',
    dockClearSelection: 'Clear selection',
    dockClearSelectionTitle: 'Clear current fence-block selection — no global shortcut',
    dockInsertFenceAtEnd: 'Add code block',
    dockInsertFenceAtEndTitle: 'Append a code block to the end of current markdown — no global shortcut',
    dockExpandOutline: 'Expand outline Dock — no global shortcut',
    dockCollapseOutline: 'Collapse outline Dock — no global shortcut',
    dockClosePanelTitle: 'Hide this panel',
    dockSectionDoc: 'Document headings',
    dockNoHeadings: '(No ATX headings in this document)',
    dockFenceOutline: 'Fence outline',
    dockFenceOutlineHint:
      'Center column is Markdown only; the right properties panel follows the caret inside fences. Select a block below and use **Block** at the end of the row to open a block canvas tab.',
    dockNoFenceKinds:
      '(No mv-model-sql / mv-model-kv / mv-model-struct / mv-model-codespace / mv-model-interface / mv-view / mv-map fences)',
    dockFenceOpenCanvas: 'Block',
    dockFenceEditBlock: 'Edit',
    dockSecondaryPlaceholder:
      'Select a block in **Fence outline** above to show structure here (e.g. classes, table columns).',
    outlineExpandChild: 'Expand subsection',
    outlineCollapseChild: 'Collapse subsection',
    outlineJumpTitle: 'Go to line {n} — no global shortcut',
    outlineLineTitle: 'Line {n}',
    docTabsAria: 'Open documents',
    closeTabTitle: 'Close {path}',
    closeTabAria: 'Close {label}',
    subtabsAria: 'Document and block canvas',
    subtabDoc: 'Document',
    subtabDocTitle: 'Edit document (Markdown only) — no global shortcut',
    closeCanvasTabTitle: 'Close block canvas tab — no global shortcut',
    closeCanvasTabAria: 'Close block canvas {id}',
    mdHeadingMarkdown: 'Markdown',
    mdModeAria: 'Markdown display mode',
    mdPreview: 'Preview',
    mdPreviewTitle: 'Preview (read-only) — no global shortcut',
    mdRich: 'Rich',
    mdRichTitle: 'Rich text (Vditor) — no global shortcut',
    mdSource: 'Source',
    mdSourceTitle: 'Source — no global shortcut',
    mdSourceAreaAria: 'Markdown source',
    mdSourceAreaTitle: 'Edit source — no global shortcut',
    emptyPickTab: 'Pick a tab',
    propsAria: 'Properties',
    propsExpand: 'Expand properties Dock — no global shortcut',
    propsCollapse: 'Collapse properties Dock — no global shortcut',
    propsTitle: 'Properties',
    dockOpenCanvasLabelDefault: 'Open block canvas',
    dockOpenCanvasTitleDefault: 'Open block canvas — no global shortcut',
    editJson: 'Edit JSON',
    editJsonTitle: 'Edit this block’s JSON in a dialog — no global shortcut',
    shellEdit: 'Dialog edit',
    shellEditTitle: 'Edit in the in-app JSON dialog — no global shortcut',
    basicProps: 'Properties',
    codespaceCanvasSelectionTitle: 'Codespace canvas selection — no global shortcut',
    codespaceClickCanvas: '(Click a node on the canvas)',
    modelRefsSummaryTitle: 'modelRefs reference',
    modelRefsSummaryHover: 'modelRefs scheme — no global shortcut',
    fullJsonSummary: 'Full JSON',
    fullJsonSummaryHover: 'Expand or collapse full JSON — no global shortcut',
    propsPath: 'Path',
    propsChars: 'Characters',
    propsFenceCount: 'Fence blocks',
    propsParseWarns: 'Parse warnings',
    propsPickBlockHint:
      'Select a block in the left **Fence outline** to show fields, actions, and expandable full JSON here.',
    codespaceDockSelectionHeading: 'Canvas selection',
    statusShellPrefix: 'Shell',
    statusShellTooltip: 'Runtime shell',
    statusDocPrefix: 'Docs',
    statusDocTooltip: 'Open document count',
    modalEditBlockPrefix: 'Edit block',
    modalCancel: 'Cancel',
    modalSaveMd: 'Save to MD',
    logTitle: 'Log',
    logHint: 'Plain-text history; **Copy** writes the full text below.',
    logClose: 'Close',
    logCopyAll: 'Copy all',
    mdCtxAria: 'Markdown area',
    ctxPreview: 'Preview (read-only)',
    ctxPreviewTitle: 'Switch to read-only preview — no global shortcut',
    ctxRich: 'Rich (Vditor)',
    ctxRichTitle: 'Switch to rich text (Vditor) — no global shortcut',
    ctxSource: 'Source',
    ctxSourceTitle: 'Switch to source — no global shortcut',
    ctxInsert: 'Insert fence block…',
    ctxInsertNoDocTitle: 'Open or create a document first — no global shortcut',
    ctxInsertPreviewTitle: 'Not in preview: switch to Rich or Source — no global shortcut',
    ctxPreviewReadonlyHint: 'Preview is read-only; switch to Rich/Source or use the block canvas for interactive editing.',
    ctxInsertTitle: 'Pick a fence type (mv-view / mv-model*) — no global shortcut',
    logNeedDoc: 'Open or create a Markdown document first',
    logNeedRichOrSource: 'Switch Markdown to Rich or Source to insert a fence block',
    labelKind: 'Kind',
    labelSubtype: 'Subtype',
    labelBlockId: 'Block ID',
    labelFenceLines: 'Fence lines',
    labelBodyChars: 'Body length',
    labelCharsUnit: 'chars',
    labelCanvas: 'Block canvas',
    blockCanvasClosePopupTitle: 'Close window — no global shortcut',
    blockCanvasNotFound: 'Block not found',
    blockCanvasBodyAria: 'Fence block editing canvas',
    canvasTitleMvModelCodespace: 'Codespace model canvas',
    labelGroupTitle: 'Group title',
    labelTableCount: 'Tables',
    labelSubtableIds: 'Table ids',
    labelTitle: 'Title',
    labelDocCount: 'Documents',
    labelRootGroupName: 'Root group',
    labelWorkspaceRoot: 'workspaceRoot',
    labelModuleCount: 'Modules',
    labelModuleIds: 'Module ids',
    labelNsNodeCount: 'Namespace nodes',
    labelClassifierCount: 'Classifiers',
    labelEndpointCount: 'Endpoints',
    labelEndpointIds: 'Endpoint ids',
    labelModelRefs: 'Model refs (modelRefs)',
    labelModelRefsEmpty: '(not bound — required)',
    labelPayloadSummary: 'Payload summary',
    labelMapRules: 'Mapping rules',
    canvasOpenPrefix: 'Open',
    canvasOpenInTabHint: 'Open as a tab in the center — no global shortcut',
    canvasHintSql:
      '**mv-model-sql**: multiple SQL-style tables in one fence; edit tables, columns, and rows in the canvas.',
    canvasHintKv: '**mv-model-kv**: document collection (Mongo-like); edit JSON objects per row in the KV canvas.',
    canvasHintStruct: '**mv-model-struct**: recursive groups/datasets (HDF5-like); edit JSON in the struct canvas.',
    canvasHintCodespace:
      '**mv-model-codespace**: workspace root and **modules[]** (optional namespaces, classifiers, vars/functions/macros); edit in the codespace canvas.',
    canvasHintInterface: '**mv-model-interface**: **endpoints[]** for API sketch; edit in the interface canvas.',
    canvasHintMap: '**mv-map**: mapping rules; edit JSON in the map canvas.',
    viewUmlPayloadMappingHint:
      'Default payload for this kind is generated from core UML mapping (`mvwb-uml/v1` + mapped `diagramType`).',
    dockSqlHeading: 'Block · SQL model group',
    dockSqlNoTables: '(No tables)',
    dockKvHeading: 'Block · KV documents',
    dockKvNoDocs: '(No documents)',
    dockStructHeading: 'Block · Hierarchy',
    dockStructEmptyRoot: '(Empty root)',
    dockCodespaceHeading: 'Block · Codespace',
    dockCodespaceNoModules: '(No modules)',
    dockIfHeading: 'Block · Interface',
    dockIfNoEndpoints: '(No endpoints)',
    dockMapHeading: 'Block · Map',
    dockMermaidClassHeading: 'Block · classDiagram',
    dockMermaidNoClass: '(No `class` keyword matches)',
    dockPayloadEmpty: '(Empty payload)',
    dockMindmapHeading: 'Block · Mindmap nodes',
    dockUmlClassHeading: 'Block · Class (UML)',
    dockUmlGenericHeading: 'Block · UML (independent format)',
    dockUmlNoEntities: '(No entity/class/interface/enum matches)',
    dockSeqHeading: 'Block · Sequence',
    dockSeqNoParticipants: '(No participant/actor matches)',
    dockActHeading: 'Block · Activity',
    dockUiHeading: 'Block · UI design',
    dockPayloadBadJson: '(Payload is not JSON or nodes could not be parsed)',
    dockActNoSteps: '(No activity steps detected — edit in block canvas)',
    dockKvDocLabel: 'Doc',
    dockKvDocEmpty: '(empty object)',
    mindmapPayloadBad: '(Payload is not JSON or nodes could not be parsed)',
    activityNoSteps: '(No activity steps detected — edit in block canvas)',
    payloadEmptyShort: '(Empty payload)',
    emptyObjectShort: '(empty object)',
    dockBlockActionsAria: 'Block actions',
    hintNoShortcut: 'no global shortcut',
    dockSqlColsInLine: 'cols',
    dockSqlRowsInLine: 'rows',
    dockStructWordGroup: 'Group',
    dockStructWordDataset: 'Dataset',
    dockViewModelRefsNone: '(none)',
    modelRefsPickerPathLabel: 'Model file (relative path, empty = this document)',
    modelRefsPickerPathPlaceholder: 'e.g. models/data.md; leave empty for current .md',
    modelRefsPickerListHint: 'Check models to bind (multi-select). Unlisted refs appear in Advanced.',
    modelRefsPickerFileMissing: 'That Markdown file is not loaded in the workspace; open the .md or edit refs manually.',
    modelRefsPickerOpenFileButton: 'Pick file',
    modelRefsPickerClearPathButton: 'Clear',
    modelRefsPickerBindListHintSingle:
      'Pick one model to bind (single selection). Off-table refs are listed below.',
    modelRefsPickerTabBind: 'General settings',
    modelRefsPickerBindNoSvgCanvas:
      'Bind model refs here. Switch to the Canvas tab to edit SVG.',
    modelRefsPickerCanvasTab: 'Design area',
    modelRefsPickerTabOrphans: 'Not in table',
    modelRefsPickerOrphansHint: 'Other saved refs (not listed above):',
    modelRefsPickerTablistAria: 'Model references sections',
    modelRefsAdvancedToggle: 'Advanced: raw modelRefs (comma-separated)',
    newDocHeading: 'New document',
  },
};

export function trOutlineJumpTitle(locale: AppLocale, line: number): string {
  const pat = shellChromeMessages[locale].outlineJumpTitle;
  return pat.replace('{n}', String(line));
}

export function trOutlineLineTitle(locale: AppLocale, line: number): string {
  return shellChromeMessages[locale].outlineLineTitle.replace('{n}', String(line));
}

export function trCloseTabTitle(locale: AppLocale, path: string): string {
  return shellChromeMessages[locale].closeTabTitle.replace('{path}', path);
}

export function trCloseTabAria(locale: AppLocale, label: string): string {
  return shellChromeMessages[locale].closeTabAria.replace('{label}', label);
}

export function trCloseCanvasTabAria(locale: AppLocale, id: string): string {
  return shellChromeMessages[locale].closeCanvasTabAria.replace('{id}', id);
}

export function trModalEditTitle(locale: AppLocale, blockId: string): string {
  return `${shellChromeMessages[locale].modalEditBlockPrefix} ${blockId}`;
}

export function trCloseTabDirty(locale: AppLocale, pathLabel: string): string {
  return locale === 'en'
    ? `${pathLabel} has unsaved changes. Close anyway?`
    : `「${pathLabel}」有未保存的更改，确定关闭？`;
}

export function trSelectFenceTitle(locale: AppLocale, kind: string, subtype: string, id: string): string {
  const suf = locale === 'en' ? ' — no global shortcut' : ' — 无全局快捷键';
  return locale === 'en' ? `Select ${kind} · ${subtype} · ${id}${suf}` : `选中 ${kind} · ${subtype} · ${id}${suf}`;
}

export function trDockSqlTableLine(
  locale: AppLocale,
  tbl: { id: string; columns: Array<{ name: string }>; rows: unknown[] },
): string {
  const L = shellChromeMessages[locale];
  const colHead = tbl.columns.map((c) => c.name).join(', ');
  return `· ${tbl.id}: ${L.dockSqlColsInLine} [${colHead}] · ${L.dockSqlRowsInLine} ${tbl.rows.length}`;
}

export function trDockKvDocumentLine(
  locale: AppLocale,
  index: number,
  keyHead: string,
  keysTruncated: boolean,
): string {
  const L = shellChromeMessages[locale];
  const head = keyHead || L.dockKvDocEmpty;
  return `${L.dockKvDocLabel} ${index + 1}: ${head}${keysTruncated ? '…' : ''}`;
}

export function trDockStructGroupLine(locale: AppLocale, pad: string, name: string): string {
  const L = shellChromeMessages[locale];
  return `${pad}${L.dockStructWordGroup} ${name}`;
}

export function trDockStructDatasetLine(locale: AppLocale, pad: string, name: string, dtype?: string): string {
  const L = shellChromeMessages[locale];
  const extra = dtype ? ` · ${dtype}` : '';
  return `${pad}  ${L.dockStructWordDataset} ${name}${extra}`;
}

export function trLogInsertedFence(locale: AppLocale, kind: string): string {
  return locale === 'en' ? `Inserted fence block: ${kind}` : `已插入围栏代码块：${kind}`;
}

export function trLogOpenedFolder(locale: AppLocale, n: number): string {
  return locale === 'en' ? `Opened folder: ${n} .md file(s)` : `已打开文件夹：${n} 个 .md 文件`;
}

export function trLogNewMarkdown(locale: AppLocale, name: string): string {
  return locale === 'en' ? `New document: ${name}` : `新建文档：${name}`;
}

export function trLogSavedPath(locale: AppLocale, path: string): string {
  return locale === 'en' ? `Saved: ${path}` : `已保存：${path}`;
}

export function trLogSaveFailed(locale: AppLocale, err: string): string {
  return locale === 'en' ? `Save failed: ${err}` : `保存失败：${err}`;
}

export function trLogSaveAsFallback(locale: AppLocale, err: string): string {
  return locale === 'en' ? `Save As failed, downloading instead: ${err}` : `另存为失败，改为下载：${err}`;
}

export function trLogSaveAsDownloaded(locale: AppLocale, fromSave: boolean, label: string): string {
  if (locale === 'en') {
    return fromSave
      ? `Triggered download save (no File System Access): ${label}`
      : `Triggered download (Save As): ${label}`;
  }
  return fromSave
    ? `已触发下载保存（浏览器不支持 File System Access 时无法写回原路径）：${label}`
    : `已触发下载（另存为）：${label}`;
}

export function trLogSaveAsDone(locale: AppLocale, path: string, fromSaveOnly: boolean): string {
  return fromSaveOnly
    ? trLogSavedPath(locale, path)
    : locale === 'en'
      ? `Save As: ${path}`
      : `另存为：${path}`;
}

export function trLogOpenedFile(locale: AppLocale, path: string): string {
  return locale === 'en' ? `Opened: ${path}` : `已打开：${path}`;
}

export function trLogOpenFilePickerFailed(locale: AppLocale, err: string): string {
  return locale === 'en'
    ? `Open file failed: ${err}; using legacy file picker`
    : `打开文件失败：${err}，改用传统文件选择`;
}

export function trLogOpenedFileNoWriteHandle(locale: AppLocale, name: string): string {
  return locale === 'en'
    ? `Opened: ${name} (use Save As or Chrome/Edge for write access)`
    : `已打开：${name}（无写盘句柄时请用「另存为」或换用 Chrome/Edge）`;
}

export function trLogElectronWorkspaceLoaded(locale: AppLocale, n: number): string {
  return locale === 'en' ? `Electron workspace loaded: ${n} file(s)` : `Electron 工作区已加载：${n} 个文件`;
}

export function trLogSwitchedCanvasTab(locale: AppLocale, id: string): string {
  return locale === 'en' ? `Switched to block canvas tab: ${id}` : `已切换到代码块画布标签：${id}`;
}

export function trLogOpenedCanvasTab(locale: AppLocale, id: string): string {
  return locale === 'en' ? `Opened block canvas tab: ${id}` : `已打开代码块画布标签：${id}`;
}

export function trLogCanvasTabUpdated(locale: AppLocale, relPath: string): string {
  return locale === 'en' ? `Block canvas updated in memory: ${relPath}` : `代码块画布已更新到内存：${relPath}`;
}

export function trLogMergedFromCanvasWindow(locale: AppLocale, relPath: string): string {
  return locale === 'en'
    ? `Merged in-memory update from block canvas window: ${relPath}`
    : `已从代码块画布窗口合并内存更新：${relPath}`;
}

export function trLogStartup(locale: AppLocale): string {
  return locale === 'en' ? 'Software Modeling Workbench started' : 'Software Modeling Workbench 已启动';
}

export function trLogBlockCanvasElectronWindow(locale: AppLocale): string {
  return locale === 'en' ? 'Block canvas editor (Electron)' : '代码块画布编辑窗口（Electron）';
}

export function trLogBlockCanvasBrowserWindow(locale: AppLocale): string {
  return locale === 'en' ? 'Block canvas editor (browser)' : '代码块画布编辑窗口（浏览器）';
}

export function trLogCanvasLaunchMismatch(locale: AppLocale): string {
  return locale === 'en' ? 'Block canvas launch data does not match URL' : '代码块画布启动数据与 URL 不一致';
}

export function trLogCanvasLaunchInvalid(locale: AppLocale): string {
  return locale === 'en' ? 'Block canvas launch data invalid' : '代码块画布启动数据无效';
}

export function trLogCanvasMissingData(locale: AppLocale): string {
  return locale === 'en'
    ? 'Missing block canvas data: open from the main window Properties panel'
    : '缺少代码块画布数据：请从主窗口属性区「打开…画布」按钮打开';
}

export function trLogOutlineJumpMissing(locale: AppLocale, title: string, index1: number): string {
  return locale === 'en'
    ? `Outline jump: no heading node for "${title}" (index ${index1})`
    : `大纲跳转：未在页面上找到与「${title}」对应的标题节点（索引 ${index1}）`;
}

export function trLogExportOk(locale: AppLocale, base: string, ext: string): string {
  return locale === 'en' ? `Exported: ${base}.${ext}` : `已导出：${base}.${ext}`;
}

export function trLogExportFailed(locale: AppLocale, kind: string, msg: string): string {
  return locale === 'en' ? `Export ${kind} failed: ${msg}` : `导出 ${kind} 失败：${msg}`;
}

export function trAlertExportFailed(locale: AppLocale, kind: string, msg: string): string {
  return locale === 'en' ? `Export ${kind} failed:\n${msg}` : `导出 ${kind} 失败：${msg}`;
}

export function trLogAutoSaveFailed(locale: AppLocale, err: string): string {
  return locale === 'en' ? `Auto-save failed: ${err}` : `自动写盘失败：${err}`;
}

export function trLogFullscreenFailed(locale: AppLocale): string {
  return locale === 'en'
    ? 'Fullscreen toggle failed (browser may disallow or require a user gesture)'
    : '全屏切换失败（浏览器可能不允许或需用户手势）';
}
