/** 与 zh / en 共有的键，便于类型提示 */
export type MessageKey =
  | 'menu.ariaLabel'
  | 'menu.settings'
  | 'menu.settings.language'
  | 'menu.settings.theme'
  | 'menu.settings.lang.zh'
  | 'menu.settings.lang.en'
  | 'menu.settings.theme.system'
  | 'menu.settings.theme.light'
  | 'menu.settings.theme.dark'
  | 'menu.file'
  | 'menu.file.new'
  | 'menu.file.open'
  | 'menu.file.save'
  | 'menu.file.saveAs'
  | 'menu.edit'
  | 'menu.edit.undo'
  | 'menu.edit.align'
  | 'menu.edit.alignHint'
  | 'menu.edit.alignLeft'
  | 'menu.edit.alignHCenter'
  | 'menu.edit.alignRight'
  | 'menu.edit.alignTop'
  | 'menu.edit.alignVCenter'
  | 'menu.edit.alignBottom'
  | 'menu.tools'
  | 'menu.tools.raster'
  | 'menu.tools.rasterHint'
  | 'menu.tools.vector'
  | 'menu.tools.vectorHint'
  | 'menu.tools.html'
  | 'menu.tools.htmlHint'
  | 'menu.tools.url'
  | 'menu.tools.urlHint'
  | 'urlImport.title'
  | 'urlImport.hint'
  | 'urlImport.placeholder'
  | 'urlImport.ok'
  | 'urlImport.cancel'
  | 'menu.view'
  | 'menu.view.reset'
  | 'menu.view.fit'
  | 'menu.view.preview'
  | 'menu.view.fullscreen'
  | 'menu.view.canvasSettings'
  | 'menu.view.alignDebugShow'
  | 'menu.view.alignDebugHide'
  | 'menu.view.placementDebugShow'
  | 'menu.view.placementDebugHide'
  | 'menu.help'
  | 'menu.help.about'
  | 'menu.help.uisvgSpec'
  | 'help.uisvgSpec.title'
  | 'help.uisvgSpec.intro'
  | 'help.uisvgSpec.nsLabel'
  | 'help.uisvgSpec.sectionTypes'
  | 'help.uisvgSpec.colQName'
  | 'help.uisvgSpec.colKind'
  | 'help.uisvgSpec.colCategory'
  | 'help.uisvgSpec.catBasic'
  | 'help.uisvgSpec.sectionRelations'
  | 'help.uisvgSpec.relStructureTitle'
  | 'help.uisvgSpec.relStructureBody'
  | 'help.uisvgSpec.relKindTitle'
  | 'help.uisvgSpec.relKindBody'
  | 'help.uisvgSpec.relHierarchyTitle'
  | 'help.uisvgSpec.relHierarchyBody'
  | 'help.uisvgSpec.close'
  | 'help.uisvgSpec.propsSection'
  | 'help.uisvgSpec.propName'
  | 'help.uisvgSpec.propDesc'
  | 'help.uisvgSpec.colAttrName'
  | 'help.uisvgSpec.colAttrDesc'
  | 'help.uisvgSpec.colEditor'
  | 'help.uisvgSpec.colDefault'
  | 'help.uisvgSpec.attrEnumOptions'
  | 'help.uisvgSpec.attrMaskHint'
  | 'help.uisvgSpec.editorText'
  | 'help.uisvgSpec.editorNumber'
  | 'help.uisvgSpec.editorEnum'
  | 'help.uisvgSpec.editorMask'
  | 'help.uisvgSpec.editorSwitch'
  | 'tb.new'
  | 'tb.open'
  | 'tb.save'
  | 'tb.resetView'
  | 'tb.fit'
  | 'tb.alignLeft'
  | 'tb.alignHCenter'
  | 'tb.alignRight'
  | 'tb.alignTop'
  | 'tb.alignVCenter'
  | 'tb.alignBottom'
  | 'tb.preview'
  | 'tb.fullscreen'
  | 'tb.alignDebugOn'
  | 'tb.alignDebugOff'
  | 'tb.placementDebugOn'
  | 'tb.placementDebugOff'
  | 'splitter.right'
  | 'placementDebug.emptyHint'
  | 'placementDebug.region'
  | 'immersive.exitTitle'
  | 'immersive.exit'
  | 'status.ready'
  | 'status.viewScale'
  | 'status.newDoc'
  | 'status.opened'
  | 'status.saved'
  | 'status.savedAs'
  | 'status.pickImage'
  | 'status.rasterWorking'
  | 'status.rasterEmpty'
  | 'status.rasterDone'
  | 'status.rasterFail'
  | 'status.vectorWorking'
  | 'status.vectorEmpty'
  | 'status.vectorDone'
  | 'status.vectorFail'
  | 'status.htmlWorking'
  | 'status.htmlEmpty'
  | 'status.htmlDone'
  | 'status.htmlFail'
  | 'status.urlWorking'
  | 'status.urlEmpty'
  | 'status.urlDone'
  | 'status.urlFail'
  | 'status.viewReset'
  | 'status.viewFit'
  | 'status.preview'
  | 'status.canvasSettingsApplied'
  | 'status.deleted'
  | 'status.copied'
  | 'status.pasted'
  | 'status.aligned'
  | 'status.alignSkipped'
  | 'status.alignFail'
  | 'status.reparented'
  | 'status.reparentFail'
  | 'status.addedRect'
  | 'status.addedText'
  | 'status.addedFrame'
  | 'status.addedWin'
  | 'saveAs.prompt'
  | 'canvasSettings.title'
  | 'canvasSettings.hint'
  | 'canvasSettings.width'
  | 'canvasSettings.height'
  | 'canvasSettings.grid'
  | 'canvasSettings.dpi'
  | 'canvasSettings.cancel'
  | 'canvasSettings.ok'
  | 'placementDebug.header'
  | 'placementDebug.canvasSize'
  | 'placementDebug.logicalSize'
  | 'placementDebug.placementSize'
  | 'placementDebug.slot'
  | 'placementDebug.fallback'
  | 'placementDebug.ok'
  | 'placementDebug.margin'
  | 'placementDebug.existingCount'
  | 'ctxMenu.delete'
  | 'ctxMenu.copy'
  | 'ctxMenu.paste'
  | 'ctxMenu.align'
  | 'canvas.selection.multi'
  | 'canvas.resizeHandleTitle'
  | 'canvas.chromeSize'
  | 'canvas.chromeDpi'
  | 'canvas.chromeOrigin'
  | 'canvas.selectionFrameGeom'
  | 'canvas.alignDebug.header'
  | 'canvas.alignDebug.hintNoSummary'
  | 'canvas.alignDebug.hintAfterMulti'
  | 'canvas.alignDebug.needTwoMovable'
  | 'canvas.alignDebug.copyButton'
  | 'canvas.alignDebug.copied'
  | 'canvas.alignDebug.copyFailed'
  | 'uiLib.title'
  | 'uiLib.basicSection'
  | 'uiLib.windowsSection'
  | 'uiLib.hint'
  | 'uiLib.basic.rect'
  | 'uiLib.basic.text'
  | 'uiLib.basic.frame'
  | 'uiLib.group.window'
  | 'uiLib.group.menusAndBars'
  | 'uiLib.group.containers'
  | 'uiLib.group.commands'
  | 'uiLib.group.textInput'
  | 'uiLib.group.selection'
  | 'uiLib.group.numericAndDate'
  | 'uiLib.group.rangeAndProgress'
  | 'uiLib.group.listAndTree'
  | 'uiLib.group.graphicsAndOther'
  | 'uiLib.win.Form'
  | 'uiLib.win.MenuStrip'
  | 'uiLib.win.ToolStrip'
  | 'uiLib.win.StatusStrip'
  | 'uiLib.win.ContextMenuStrip'
  | 'uiLib.win.GroupBox'
  | 'uiLib.win.Panel'
  | 'uiLib.win.TabControl'
  | 'uiLib.win.SplitContainer'
  | 'uiLib.win.FlowLayoutPanel'
  | 'uiLib.win.TableLayoutPanel'
  | 'uiLib.win.Button'
  | 'uiLib.win.Label'
  | 'uiLib.win.LinkLabel'
  | 'uiLib.win.TextBox'
  | 'uiLib.win.MaskedTextBox'
  | 'uiLib.win.RichTextBox'
  | 'uiLib.win.CheckBox'
  | 'uiLib.win.RadioButton'
  | 'uiLib.win.ComboBox'
  | 'uiLib.win.ListBox'
  | 'uiLib.win.CheckedListBox'
  | 'uiLib.win.NumericUpDown'
  | 'uiLib.win.DateTimePicker'
  | 'uiLib.win.MonthCalendar'
  | 'uiLib.win.TrackBar'
  | 'uiLib.win.ProgressBar'
  | 'uiLib.win.HScrollBar'
  | 'uiLib.win.VScrollBar'
  | 'uiLib.win.TreeView'
  | 'uiLib.win.ListView'
  | 'uiLib.win.DataGridView'
  | 'uiLib.win.PictureBox'
  | 'uiLib.win.PropertyGrid'
  | 'panel.colName'
  | 'panel.colValue'
  | 'panel.id'
  | 'panel.uisvgType'
  | 'panel.objectIdentityAria'
  | 'panel.platformMapping'
  | 'panel.uiSemantics'
  | 'panel.notSelectedObject'
  | 'panel.notEditableNode'
  | 'panel.enumUnset'
  | 'panel.maskPlaceholder'
  | 'panel.maskTitlePattern'
  | 'panel.maskExample'
  | 'panel.onOff'
  | 'panel.displayName'
  | 'panel.displayNameInputTitle'
  | 'panel.hintDataUisvgLabel'
  | 'panel.xmlAttributes'
  | 'panel.add'
  | 'panel.deleteAttr'
  | 'panel.svgFragmentReadonly'
  | 'panel.copy'
  | 'panel.copied'
  | 'panel.copyTitle'
  | 'panel.copiedTitle'
  | 'panel.autoWrap'
  | 'panel.autoWrapTitle'
  | 'panel.dockUiProps'
  | 'panel.dockSvgTree'
  | 'panel.dockSvgObjectProps'
  | 'dock.outline'
  | 'dock.uiLibrary'
  | 'outline.columnId'
  | 'outline.columnUisvgType'
  | 'outline.resizeColumns'
  | 'outline.foldExpand'
  | 'outline.foldCollapse'
  | 'outline.itemHint'
  | 'tooltip.semanticLocalName'
  | 'tooltip.idLine'
  | 'tooltip.nameLine'

export const zh: Record<MessageKey, string> = {
  'menu.ariaLabel': '主菜单',
  'menu.settings': '设置(S)',
  'menu.settings.language': '界面语言',
  'menu.settings.theme': '主题',
  'menu.settings.lang.zh': '中文',
  'menu.settings.lang.en': 'English',
  'menu.settings.theme.system': '跟随系统',
  'menu.settings.theme.light': '浅色',
  'menu.settings.theme.dark': '深色',
  'menu.file': '文件(F)',
  'menu.file.new': '新建',
  'menu.file.open': '打开…',
  'menu.file.save': '保存',
  'menu.file.saveAs': '另存为…',
  'menu.edit': '编辑(E)',
  'menu.edit.undo': '撤销',
  'menu.edit.align': '对齐',
  'menu.edit.alignHint': '对齐（与画布右键菜单相同，至少 2 个对象）',
  'menu.edit.alignLeft': '左对齐',
  'menu.edit.alignHCenter': '水平居中',
  'menu.edit.alignRight': '右对齐',
  'menu.edit.alignTop': '顶对齐',
  'menu.edit.alignVCenter': '垂直居中',
  'menu.edit.alignBottom': '底对齐',
  'menu.tools': '工具(T)',
  'menu.tools.raster': '从像素图识别 UI…',
  'menu.tools.rasterHint': '支持 PNG / JPEG / BMP 等；按色块连通域生成矩形（扁平界面效果更好）',
  'menu.tools.vector': '从矢量图识别 UI…',
  'menu.tools.vectorHint': '选择 .svg 文件：根据 rect、path 等图形的几何外接矩形生成控件块',
  'menu.tools.html': '从网页识别 UI…',
  'menu.tools.htmlHint': '选择 .html 文件：在沙箱 iframe 中排版后按可见元素外接矩形生成块',
  'menu.tools.url': '从 URL 识别 UI…',
  'menu.tools.urlHint': '输入 http(s) 网页地址（需站点允许跨域）；按返回的 HTML 或 SVG 解析',
  'urlImport.title': '从 URL 识别 UI',
  'urlImport.hint': '请输入可访问的网页地址（需服务器允许浏览器跨域读取）。',
  'urlImport.placeholder': 'https://example.com/page.html',
  'urlImport.ok': '开始识别',
  'urlImport.cancel': '取消',
  'menu.view': '视图(V)',
  'menu.view.reset': '重置视图',
  'menu.view.fit': '全部显示画布',
  'menu.view.preview': '预览…',
  'menu.view.fullscreen': '画布全屏…',
  'menu.view.canvasSettings': '画布设置…',
  'menu.view.alignDebugShow': '显示对齐调试',
  'menu.view.alignDebugHide': '隐藏对齐调试',
  'menu.view.placementDebugShow': '显示新建占位调试',
  'menu.view.placementDebugHide': '隐藏新建占位调试',
  'menu.help': '帮助(H)',
  'menu.help.about': 'UISVG 编辑器 · *.ui.svg',
  'menu.help.uisvgSpec': 'UISVG 规范与类型…',
  'help.uisvgSpec.title': 'UISVG 扩展类型与关系',
  'help.uisvgSpec.intro':
    'UISVG 在标准 SVG 上增加命名空间语义，用对象根 <g> 与 uisvg 类型子节点描述 UI 结构。以下为编辑器支持的类型清单（与组件库一致）。',
  'help.uisvgSpec.nsLabel': '命名空间 URI',
  'help.uisvgSpec.sectionTypes': '扩展类型一览',
  'help.uisvgSpec.colQName': 'QName（展示名）',
  'help.uisvgSpec.colKind': '语义标签（localName）',
  'help.uisvgSpec.colCategory': '分类',
  'help.uisvgSpec.catBasic': '基础形状',
  'help.uisvgSpec.sectionRelations': '结构关系',
  'help.uisvgSpec.relStructureTitle': '文档与对象根',
  'help.uisvgSpec.relStructureBody':
    '根 <svg> 下为内容组 #layer-root（及可选 #layer-sibling）。每个可编辑 UI 对象对应一个带 id 的对象根 <g>；其下第一个 uisvg 命名空间子元素为语义类型（localName 与 WinForms 类名或 Frame/Rect/Text 等一致），其后兄弟为标准 SVG 几何（rect、text 等）。',
  'help.uisvgSpec.relKindTitle': '语义标签与 QName',
  'help.uisvgSpec.relKindBody':
    '类型以对象根下首个 uisvg 子元素的 **localName** 为准（如 Form、Frame、Rect）。展示 QName 为 uisvg:Form，与 xmlns:uisvg 前缀对应。旧版文档中的「逻辑 kind」读入时会迁移为同一 localName。',
  'help.uisvgSpec.relHierarchyTitle': '嵌套层级',
  'help.uisvgSpec.relHierarchyBody':
    '对象根 <g> 可嵌套：容器类（如 Form、Panel）的子节点仍是对象根 <g>，与 WinForms 父子控件对应；大纲树与 DOM 父子一致。',
  'help.uisvgSpec.close': '关闭',
  'help.uisvgSpec.colAttrName': '属性（data-uisvg-ui-props 键）',
  'help.uisvgSpec.colAttrDesc': '说明',
  'help.uisvgSpec.colDefault': '默认值',
  'help.uisvgSpec.attrEnumOptions': '可选值：{values}',
  'help.uisvgSpec.attrMaskHint': '掩码示例：{hint}',
  'help.uisvgSpec.editorText': '文本',
  'help.uisvgSpec.editorNumber': '数值',
  'help.uisvgSpec.editorEnum': '枚举',
  'help.uisvgSpec.editorMask': '掩码',
  'help.uisvgSpec.editorSwitch': '开关',
  'help.uisvgSpec.propsSection': 'UI 语义属性（与右栏「UI 属性」表一致）',
  'help.uisvgSpec.propName': '属性',
  'help.uisvgSpec.propDesc': '说明',
  'help.uisvgSpec.colEditor': '编辑方式',
  'tb.new': '新建',
  'tb.open': '打开',
  'tb.save': '保存',
  'tb.resetView': '重置视图（1:1 与原点）',
  'tb.fit': '全部显示画布（适配视口）',
  'tb.alignLeft': '左对齐（至少 2 个可选中对象）',
  'tb.alignHCenter': '水平居中',
  'tb.alignRight': '右对齐',
  'tb.alignTop': '顶对齐',
  'tb.alignVCenter': '垂直居中',
  'tb.alignBottom': '底对齐',
  'tb.preview': '预览（新窗口打开 SVG，类似 Qt 设计器）',
  'tb.fullscreen': '仅显示画布（Esc 退出）',
  'tb.alignDebugOn': '隐藏左下角对齐调试',
  'tb.alignDebugOff': '显示左下角对齐调试（仅对齐摘要）',
  'tb.placementDebugOn': '隐藏状态栏上方新建占位调试',
  'tb.placementDebugOff': '显示新建占位调试（xy/已有对象/空位）',
  'splitter.right': '调整右侧栏宽度',
  'placementDebug.emptyHint':
    '（尚未执行新建：从左栏添加矩形/文本/容器/Windows 控件后，此处显示最近一次占位的 x/y、宽高、已有对象与空位。）',
  'placementDebug.region': '新建占位调试',
  'immersive.exitTitle': '退出画布全屏（Esc）',
  'immersive.exit': '退出全屏',
  'status.ready': '就绪',
  'status.viewScale': '缩放 {pct}% · 滚轮缩放 · 中键平移 · 左键选择',
  'status.newDoc': '已新建文档',
  'status.opened': '已打开 {name}',
  'status.saved': '已保存 {name}',
  'status.savedAs': '已另存为 {name}',
  'status.pickImage': '请选择 PNG / JPEG / BMP 等图片',
  'status.rasterWorking': '正在从像素图识别 UI…',
  'status.rasterEmpty': '未识别到 UI 块（可换对比更强的界面截图重试）',
  'status.rasterDone': '已从「{name}」识别并添加 {n} 个块',
  'status.rasterFail': '识别失败：{msg}',
  'status.vectorWorking': '正在从矢量图识别 UI…',
  'status.vectorEmpty': '未识别到可用图形（请确认 SVG 含可见的 rect/path 等）',
  'status.vectorDone': '已从「{name}」识别并添加 {n} 个块',
  'status.vectorFail': '矢量识别失败：{msg}',
  'status.htmlWorking': '正在从网页识别 UI…',
  'status.htmlEmpty': '未识别到可见布局块（可检查 HTML 结构或换文件重试）',
  'status.htmlDone': '已从「{name}」识别并添加 {n} 个块',
  'status.htmlFail': '网页识别失败：{msg}',
  'status.urlWorking': '正在从 URL 拉取并识别 UI…',
  'status.urlEmpty': '未识别到可用块（页面可能无可见元素或内容被拦截）',
  'status.urlDone': '已从 {host} 识别并添加 {n} 个块',
  'status.urlFail': 'URL 识别失败：{msg}',
  'status.viewReset': '视图已重置',
  'status.viewFit': '已适配显示整块画布',
  'status.preview': '已在新窗口打开预览',
  'status.canvasSettingsApplied': '画布：{w}×{h} px · {dpi} DPI',
  'status.deleted': '已删除选中对象',
  'status.copied': '已复制',
  'status.pasted': '已粘贴',
  'status.aligned': '已对齐',
  'status.alignSkipped': '对齐未执行（需至少两个可选中对象，且包围盒有效）',
  'status.alignFail': '对齐失败（见左下角对齐调试）',
  'status.reparented': '已调整大纲父子关系',
  'status.reparentFail': '大纲拖放改父级失败（目标非法或会形成环）',
  'status.addedRect': '已添加矩形',
  'status.addedText': '已添加文本',
  'status.addedFrame': '已添加容器',
  'status.addedWin': '已添加 Windows 控件: {id}',
  'saveAs.prompt': '另存为文件名（含扩展名，例如 design.ui.svg）',
  'canvasSettings.title': '画布设置',
  'canvasSettings.hint':
    '白框为 SVG 逻辑画布区域（原点默认在左上角 (0, 0)）。左上角标注会显示宽高、DPI 等信息。',
  'canvasSettings.width': '宽度（px）',
  'canvasSettings.height': '高度（px）',
  'canvasSettings.grid': '网格步长',
  'canvasSettings.dpi': 'DPI',
  'canvasSettings.cancel': '取消',
  'canvasSettings.ok': '确定',
  'placementDebug.header': '--- 新建占位调试 ---',
  'placementDebug.canvasSize': '画布: {w}×{h}',
  'placementDebug.logicalSize': '新图元逻辑尺寸: {w}×{h}',
  'placementDebug.placementSize': '参与碰撞尺寸: {w}×{h}',
  'placementDebug.slot': '空位/放置矩形: x={x} y={y} w={w} h={h}',
  'placementDebug.fallback': '注意: 已使用裁切回退，可能与已有图元重叠',
  'placementDebug.ok': '位置: 已通过碰撞检测（无重叠）',
  'placementDebug.margin': '碰撞间距: {n}px',
  'placementDebug.existingCount': '已有对象 ({n}):',
  'ctxMenu.delete': '删除',
  'ctxMenu.copy': '复制',
  'ctxMenu.paste': '粘贴',
  'ctxMenu.align': '对齐',
  'canvas.selection.multi': '已选 {n} 个对象',
  'canvas.resizeHandleTitle': '缩放（{handle}）',
  'canvas.chromeSize': '{w} × {h} px',
  'canvas.chromeDpi': '{dpi} DPI',
  'canvas.chromeOrigin': '原点 (0, 0)',
  'canvas.selectionFrameGeom':
    '选择框位置（画布坐标）: left={left} top={top} width={width} height={height}',
  'canvas.alignDebug.header': '--- 对齐调试 ---',
  'canvas.alignDebug.hintNoSummary':
    '尚无摘要：请点工具栏「对齐」按钮，或菜单「编辑」→ 对齐，或画布右键→「对齐」。',
  'canvas.alignDebug.hintAfterMulti':
    '（多选后须执行一次对齐命令才会显示并集与 d。）',
  'canvas.alignDebug.needTwoMovable': '请先多选至少 2 个可移动对象（当前 {n} 个）。',
  'canvas.alignDebug.copyButton': '复制对齐调试',
  'canvas.alignDebug.copied': '已复制到剪贴板',
  'canvas.alignDebug.copyFailed': '复制失败（浏览器限制）',
  'uiLib.title': 'UI 库',
  'uiLib.basicSection': '基础形状',
  'uiLib.windowsSection': 'Windows 桌面控件',
  'uiLib.hint':
    '以 WinForms 为主键；主窗口即 Form。图标为象形示意；悬停可看 Win32 / Qt 对照。画布占位带 data-winforms 等属性。下方小字为 UISVG 语义标签名（与 XML 一致）。',
  'uiLib.basic.rect': '矩形',
  'uiLib.basic.text': '文本',
  'uiLib.basic.frame': '容器',
  'uiLib.group.window': '窗口',
  'uiLib.group.menusAndBars': '菜单与条',
  'uiLib.group.containers': '容器与布局',
  'uiLib.group.commands': '命令与显示',
  'uiLib.group.textInput': '文本输入',
  'uiLib.group.selection': '选择',
  'uiLib.group.numericAndDate': '数值与日期',
  'uiLib.group.rangeAndProgress': '范围与进度',
  'uiLib.group.listAndTree': '列表与树',
  'uiLib.group.graphicsAndOther': '图形与其他',
  'uiLib.win.Form': '主窗口',
  'uiLib.win.MenuStrip': '菜单栏',
  'uiLib.win.ToolStrip': '工具栏',
  'uiLib.win.StatusStrip': '状态栏',
  'uiLib.win.ContextMenuStrip': '快捷菜单',
  'uiLib.win.GroupBox': '分组框',
  'uiLib.win.Panel': '面板',
  'uiLib.win.TabControl': '选项卡',
  'uiLib.win.SplitContainer': '分割容器',
  'uiLib.win.FlowLayoutPanel': '流式布局',
  'uiLib.win.TableLayoutPanel': '表格布局',
  'uiLib.win.Button': '按钮',
  'uiLib.win.Label': '标签',
  'uiLib.win.LinkLabel': '链接标签',
  'uiLib.win.TextBox': '文本框',
  'uiLib.win.MaskedTextBox': '掩码文本框',
  'uiLib.win.RichTextBox': '富文本框',
  'uiLib.win.CheckBox': '复选框',
  'uiLib.win.RadioButton': '单选按钮',
  'uiLib.win.ComboBox': '组合框',
  'uiLib.win.ListBox': '列表框',
  'uiLib.win.CheckedListBox': '复选列表',
  'uiLib.win.NumericUpDown': '数值框',
  'uiLib.win.DateTimePicker': '日期时间',
  'uiLib.win.MonthCalendar': '月历',
  'uiLib.win.TrackBar': '滑动条',
  'uiLib.win.ProgressBar': '进度条',
  'uiLib.win.HScrollBar': '横向滚动条',
  'uiLib.win.VScrollBar': '纵向滚动条',
  'uiLib.win.TreeView': '树视图',
  'uiLib.win.ListView': '列表视图',
  'uiLib.win.DataGridView': '数据网格',
  'uiLib.win.PictureBox': '图片框',
  'uiLib.win.PropertyGrid': '属性网格',
  'panel.colName': '名称',
  'panel.colValue': '值',
  'panel.id': '标识',
  'panel.uisvgType': 'UISVG 类型',
  'panel.objectIdentityAria': '对象标识',
  'panel.platformMapping': '平台对照',
  'panel.uiSemantics': 'UI 语义',
  'panel.notSelectedObject': '未选中对象',
  'panel.notEditableNode': '未选中可编辑节点，或无法解析 id',
  'panel.enumUnset': '（未设置）',
  'panel.maskPlaceholder': '掩码',
  'panel.maskTitlePattern': '掩码组合',
  'panel.maskExample': '示例：{hint}',
  'panel.onOff': '开 / 关',
  'panel.displayName': '显示名称',
  'panel.displayNameInputTitle': '写入 data-uisvg-label，并同步大纲标签',
  'panel.hintDataUisvgLabel': '与大纲显示同步；对应元素属性 data-uisvg-label',
  'panel.xmlAttributes': 'XML 属性',
  'panel.add': '添加',
  'panel.deleteAttr': '删除属性',
  'panel.svgFragmentReadonly': 'SVG 内容（只读）',
  'panel.copy': '复制',
  'panel.copied': '已复制',
  'panel.copyTitle': '复制完整 SVG 片段到剪贴板',
  'panel.copiedTitle': '已复制到剪贴板',
  'panel.autoWrap': '自动换行',
  'panel.autoWrapTitle':
    '开启时在面板宽度内折行；关闭时每行保持原样并可横向滚动',
  'panel.dockUiProps': 'UI 属性',
  'panel.dockSvgTree': 'SVG 结构',
  'panel.dockSvgObjectProps': 'SVG 对象属性',
  'dock.outline': 'UI 大纲',
  'dock.uiLibrary': 'UI 库',
  'outline.columnId': '标识',
  'outline.columnUisvgType': 'UISVG 类型',
  'outline.resizeColumns': '拖动调整标识与 UISVG 类型列宽',
  'outline.foldExpand': '展开子项',
  'outline.foldCollapse': '折叠子项',
  'outline.itemHint': '单击选中；双击在画布中居中',
  'tooltip.semanticLocalName': '语义标签：{name}',
  'tooltip.idLine': '标识：{id}',
  'tooltip.nameLine': '名称：{name}',
}

export const en: Record<MessageKey, string> = {
  'menu.ariaLabel': 'Main menu',
  'menu.settings': 'Settings(S)',
  'menu.settings.language': 'Language',
  'menu.settings.theme': 'Theme',
  'menu.settings.lang.zh': '中文',
  'menu.settings.lang.en': 'English',
  'menu.settings.theme.system': 'Match system',
  'menu.settings.theme.light': 'Light',
  'menu.settings.theme.dark': 'Dark',
  'menu.file': 'File(F)',
  'menu.file.new': 'New',
  'menu.file.open': 'Open…',
  'menu.file.save': 'Save',
  'menu.file.saveAs': 'Save As…',
  'menu.edit': 'Edit(E)',
  'menu.edit.undo': 'Undo',
  'menu.edit.align': 'Align',
  'menu.edit.alignHint': 'Align (same as canvas context menu; need ≥2 items)',
  'menu.edit.alignLeft': 'Align left',
  'menu.edit.alignHCenter': 'Align horizontal center',
  'menu.edit.alignRight': 'Align right',
  'menu.edit.alignTop': 'Align top',
  'menu.edit.alignVCenter': 'Align vertical center',
  'menu.edit.alignBottom': 'Align bottom',
  'menu.tools': 'Tools(T)',
  'menu.tools.raster': 'Import UI from raster…',
  'menu.tools.rasterHint': 'PNG / JPEG / BMP, etc.; connected regions as rects (flat UIs work best)',
  'menu.tools.vector': 'Import UI from vector (SVG)…',
  'menu.tools.vectorHint': 'Pick an .svg file: bounding boxes of rects, paths, etc. become control blocks',
  'menu.tools.html': 'Import UI from web page (HTML)…',
  'menu.tools.htmlHint': 'Pick an .html file: layout in a sandboxed iframe, then boxes from visible elements',
  'menu.tools.url': 'Import UI from URL…',
  'menu.tools.urlHint': 'Enter an http(s) URL (CORS must allow fetch); parses returned HTML or SVG',
  'urlImport.title': 'Import UI from URL',
  'urlImport.hint': 'Enter a URL you can fetch (the server must allow cross-origin browser access).',
  'urlImport.placeholder': 'https://example.com/page.html',
  'urlImport.ok': 'Import',
  'urlImport.cancel': 'Cancel',
  'menu.view': 'View(V)',
  'menu.view.reset': 'Reset view',
  'menu.view.fit': 'Fit canvas to view',
  'menu.view.preview': 'Preview…',
  'menu.view.fullscreen': 'Canvas fullscreen…',
  'menu.view.canvasSettings': 'Canvas settings…',
  'menu.view.alignDebugShow': 'Show align debug',
  'menu.view.alignDebugHide': 'Hide align debug',
  'menu.view.placementDebugShow': 'Show placement debug',
  'menu.view.placementDebugHide': 'Hide placement debug',
  'menu.help': 'Help(H)',
  'menu.help.about': 'UISVG Editor · *.ui.svg',
  'menu.help.uisvgSpec': 'UISVG specification & types…',
  'help.uisvgSpec.title': 'UISVG extension types and relationships',
  'help.uisvgSpec.intro':
    'UISVG extends standard SVG with namespace semantics: each UI object is an id’d root <g> with a uisvg-typed child. Below is the type list supported by this editor (aligned with the library).',
  'help.uisvgSpec.nsLabel': 'Namespace URI',
  'help.uisvgSpec.sectionTypes': 'Extension types',
  'help.uisvgSpec.colQName': 'QName (display)',
  'help.uisvgSpec.colKind': 'Semantic tag (localName)',
  'help.uisvgSpec.colCategory': 'Category',
  'help.uisvgSpec.catBasic': 'Basic shapes',
  'help.uisvgSpec.sectionRelations': 'Structure',
  'help.uisvgSpec.relStructureTitle': 'Document and object roots',
  'help.uisvgSpec.relStructureBody':
    'Under the root <svg> is #layer-root (and optional #layer-sibling). Each editable UI object is an id’d root <g>; the first child in the uisvg namespace is the semantic type (localName matches WinForms class names or Frame/Rect/Text). Following siblings are standard SVG geometry (rect, text, …).',
  'help.uisvgSpec.relKindTitle': 'Semantic tag and QName',
  'help.uisvgSpec.relKindBody':
    'The type is defined by the **localName** of the first uisvg child under the object root (e.g. Form, Frame, Rect). The QName shown is uisvg:Form, matching the xmlns:uisvg prefix. Legacy “logical kind” strings are migrated to the same localName on load.',
  'help.uisvgSpec.relHierarchyTitle': 'Nesting',
  'help.uisvgSpec.relHierarchyBody':
    'Object root <g> elements may nest: containers (e.g. Form, Panel) contain child object roots <g>, mirroring WinForms parent/child controls; the outline tree follows DOM parenthood.',
  'help.uisvgSpec.close': 'Close',
  'help.uisvgSpec.colAttrName': 'Property (data-uisvg-ui-props key)',
  'help.uisvgSpec.colAttrDesc': 'Description',
  'help.uisvgSpec.colDefault': 'Default',
  'help.uisvgSpec.attrEnumOptions': 'Options: {values}',
  'help.uisvgSpec.attrMaskHint': 'Mask example: {hint}',
  'help.uisvgSpec.editorText': 'Text',
  'help.uisvgSpec.editorNumber': 'Number',
  'help.uisvgSpec.editorEnum': 'Enum',
  'help.uisvgSpec.editorMask': 'Mask',
  'help.uisvgSpec.editorSwitch': 'Switch',
  'help.uisvgSpec.propsSection': 'UI semantics (same as the UI properties panel)',
  'help.uisvgSpec.propName': 'Property',
  'help.uisvgSpec.propDesc': 'Description',
  'help.uisvgSpec.colEditor': 'Editor',
  'tb.new': 'New',
  'tb.open': 'Open',
  'tb.save': 'Save',
  'tb.resetView': 'Reset view (1:1 & origin)',
  'tb.fit': 'Fit entire canvas to viewport',
  'tb.alignLeft': 'Align left (need ≥2 items)',
  'tb.alignHCenter': 'Align horizontal center',
  'tb.alignRight': 'Align right',
  'tb.alignTop': 'Align top',
  'tb.alignVCenter': 'Align vertical center',
  'tb.alignBottom': 'Align bottom',
  'tb.preview': 'Preview (new window, Qt Designer–like)',
  'tb.fullscreen': 'Canvas only (Esc to exit)',
  'tb.alignDebugOn': 'Hide align debug (bottom-left)',
  'tb.alignDebugOff': 'Show align debug (summary only)',
  'tb.placementDebugOn': 'Hide placement debug (above status bar)',
  'tb.placementDebugOff': 'Show placement debug (xy / existing / slot)',
  'splitter.right': 'Resize right sidebar',
  'placementDebug.emptyHint':
    '(No new object yet: add rect/text/frame/Windows control from the left; last placement debug appears here.)',
  'placementDebug.region': 'New object placement debug',
  'immersive.exitTitle': 'Exit canvas fullscreen (Esc)',
  'immersive.exit': 'Exit fullscreen',
  'status.ready': 'Ready',
  'status.viewScale': 'Zoom {pct}% · wheel · middle-drag pan · left-click select',
  'status.newDoc': 'New document',
  'status.opened': 'Opened {name}',
  'status.saved': 'Saved {name}',
  'status.savedAs': 'Saved as {name}',
  'status.pickImage': 'Choose PNG / JPEG / BMP, etc.',
  'status.rasterWorking': 'Detecting UI from image…',
  'status.rasterEmpty': 'No UI blocks found (try a higher-contrast screenshot)',
  'status.rasterDone': 'Imported {n} block(s) from “{name}”',
  'status.rasterFail': 'Import failed: {msg}',
  'status.vectorWorking': 'Detecting UI from SVG…',
  'status.vectorEmpty': 'No shapes found (ensure the SVG has visible rect/path elements)',
  'status.vectorDone': 'Imported {n} block(s) from “{name}”',
  'status.vectorFail': 'Vector import failed: {msg}',
  'status.htmlWorking': 'Detecting UI from HTML…',
  'status.htmlEmpty': 'No layout blocks found (try another file or structure)',
  'status.htmlDone': 'Imported {n} block(s) from “{name}”',
  'status.htmlFail': 'HTML import failed: {msg}',
  'status.urlWorking': 'Fetching URL and detecting UI…',
  'status.urlEmpty': 'No blocks found (empty page or blocked content)',
  'status.urlDone': 'Imported {n} block(s) from {host}',
  'status.urlFail': 'URL import failed: {msg}',
  'status.viewReset': 'View reset',
  'status.viewFit': 'Canvas fitted to view',
  'status.preview': 'Preview opened in new window',
  'status.canvasSettingsApplied': 'Canvas: {w}×{h} px · {dpi} DPI',
  'status.deleted': 'Selection deleted',
  'status.copied': 'Copied',
  'status.pasted': 'Pasted',
  'status.aligned': 'Aligned',
  'status.alignSkipped': 'Align skipped (need ≥2 items with valid bounds)',
  'status.alignFail': 'Align failed (see align debug)',
  'status.reparented': 'Outline parent updated',
  'status.reparentFail': 'Outline reparent failed (invalid target or cycle)',
  'status.addedRect': 'Rectangle added',
  'status.addedText': 'Text added',
  'status.addedFrame': 'Frame added',
  'status.addedWin': 'Windows control added: {id}',
  'saveAs.prompt': 'File name (with extension, e.g. design.ui.svg)',
  'canvasSettings.title': 'Canvas settings',
  'canvasSettings.hint':
    'The white frame is the SVG logical canvas (origin at top-left (0, 0)). The corner label shows size and DPI.',
  'canvasSettings.width': 'Width (px)',
  'canvasSettings.height': 'Height (px)',
  'canvasSettings.grid': 'Grid step',
  'canvasSettings.dpi': 'DPI',
  'canvasSettings.cancel': 'Cancel',
  'canvasSettings.ok': 'OK',
  'placementDebug.header': '--- Placement debug ---',
  'placementDebug.canvasSize': 'Canvas: {w}×{h}',
  'placementDebug.logicalSize': 'New item logical size: {w}×{h}',
  'placementDebug.placementSize': 'Collision size: {w}×{h}',
  'placementDebug.slot': 'Free slot / placed: x={x} y={y} w={w} h={h}',
  'placementDebug.fallback': 'Note: fallback clamp may overlap existing items',
  'placementDebug.ok': 'Position: no overlap (collision OK)',
  'placementDebug.margin': 'Collision margin: {n}px',
  'placementDebug.existingCount': 'Existing ({n}):',
  'ctxMenu.delete': 'Delete',
  'ctxMenu.copy': 'Copy',
  'ctxMenu.paste': 'Paste',
  'ctxMenu.align': 'Align',
  'canvas.selection.multi': 'Selected {n} objects',
  'canvas.resizeHandleTitle': 'Resize ({handle})',
  'canvas.chromeSize': '{w} × {h} px',
  'canvas.chromeDpi': '{dpi} DPI',
  'canvas.chromeOrigin': 'Origin (0, 0)',
  'canvas.selectionFrameGeom':
    'Selection box (canvas coords): left={left} top={top} width={width} height={height}',
  'canvas.alignDebug.header': '--- Align debug ---',
  'canvas.alignDebug.hintNoSummary':
    'No summary yet: use toolbar Align, menu Edit → Align, or canvas menu → Align.',
  'canvas.alignDebug.hintAfterMulti':
    '(After multi-select, run an align command once to show union and d.)',
  'canvas.alignDebug.needTwoMovable':
    'Select at least 2 movable objects (currently {n}).',
  'canvas.alignDebug.copyButton': 'Copy align debug',
  'canvas.alignDebug.copied': 'Copied to clipboard',
  'canvas.alignDebug.copyFailed': 'Copy failed (browser restriction)',
  'uiLib.title': 'UI library',
  'uiLib.basicSection': 'Basic shapes',
  'uiLib.windowsSection': 'Windows desktop controls',
  'uiLib.hint':
    'WinForms is the primary key; the main window is Form. Icons are schematic; hover for Win32 / Qt mapping. Canvas placeholders carry data-winforms, etc. The small caption below is the UISVG semantic tag (same as in XML).',
  'uiLib.basic.rect': 'Rectangle',
  'uiLib.basic.text': 'Text',
  'uiLib.basic.frame': 'Frame',
  'uiLib.group.window': 'Window',
  'uiLib.group.menusAndBars': 'Menus & bars',
  'uiLib.group.containers': 'Containers & layout',
  'uiLib.group.commands': 'Commands & display',
  'uiLib.group.textInput': 'Text input',
  'uiLib.group.selection': 'Selection',
  'uiLib.group.numericAndDate': 'Numeric & date',
  'uiLib.group.rangeAndProgress': 'Range & progress',
  'uiLib.group.listAndTree': 'List & tree',
  'uiLib.group.graphicsAndOther': 'Graphics & other',
  'uiLib.win.Form': 'Main window',
  'uiLib.win.MenuStrip': 'Menu bar',
  'uiLib.win.ToolStrip': 'Tool bar',
  'uiLib.win.StatusStrip': 'Status bar',
  'uiLib.win.ContextMenuStrip': 'Context menu',
  'uiLib.win.GroupBox': 'Group box',
  'uiLib.win.Panel': 'Panel',
  'uiLib.win.TabControl': 'Tab control',
  'uiLib.win.SplitContainer': 'Split container',
  'uiLib.win.FlowLayoutPanel': 'Flow layout',
  'uiLib.win.TableLayoutPanel': 'Table layout',
  'uiLib.win.Button': 'Button',
  'uiLib.win.Label': 'Label',
  'uiLib.win.LinkLabel': 'Link label',
  'uiLib.win.TextBox': 'Text box',
  'uiLib.win.MaskedTextBox': 'Masked text box',
  'uiLib.win.RichTextBox': 'Rich text box',
  'uiLib.win.CheckBox': 'Check box',
  'uiLib.win.RadioButton': 'Radio button',
  'uiLib.win.ComboBox': 'Combo box',
  'uiLib.win.ListBox': 'List box',
  'uiLib.win.CheckedListBox': 'Checked list box',
  'uiLib.win.NumericUpDown': 'Numeric up-down',
  'uiLib.win.DateTimePicker': 'Date/time picker',
  'uiLib.win.MonthCalendar': 'Month calendar',
  'uiLib.win.TrackBar': 'Track bar',
  'uiLib.win.ProgressBar': 'Progress bar',
  'uiLib.win.HScrollBar': 'Horizontal scroll bar',
  'uiLib.win.VScrollBar': 'Vertical scroll bar',
  'uiLib.win.TreeView': 'Tree view',
  'uiLib.win.ListView': 'List view',
  'uiLib.win.DataGridView': 'Data grid',
  'uiLib.win.PictureBox': 'Picture box',
  'uiLib.win.PropertyGrid': 'Property grid',
  'panel.colName': 'Name',
  'panel.colValue': 'Value',
  'panel.id': 'ID',
  'panel.uisvgType': 'UISVG type',
  'panel.objectIdentityAria': 'Object identity',
  'panel.platformMapping': 'Platform mapping',
  'panel.uiSemantics': 'UI semantics',
  'panel.notSelectedObject': 'No object selected',
  'panel.notEditableNode':
    'No editable node selected, or id could not be parsed',
  'panel.enumUnset': '(unset)',
  'panel.maskPlaceholder': 'Mask',
  'panel.maskTitlePattern': 'Mask composition',
  'panel.maskExample': 'Example: {hint}',
  'panel.onOff': 'On / Off',
  'panel.displayName': 'Display name',
  'panel.displayNameInputTitle':
    'Writes data-uisvg-label and syncs outline label',
  'panel.hintDataUisvgLabel':
    'Synced with outline; maps to element attribute data-uisvg-label',
  'panel.xmlAttributes': 'XML attributes',
  'panel.add': 'Add',
  'panel.deleteAttr': 'Remove attribute',
  'panel.svgFragmentReadonly': 'SVG fragment (read-only)',
  'panel.copy': 'Copy',
  'panel.copied': 'Copied',
  'panel.copyTitle': 'Copy full SVG fragment to clipboard',
  'panel.copiedTitle': 'Copied to clipboard',
  'panel.autoWrap': 'Wrap lines',
  'panel.autoWrapTitle':
    'When on, wrap within panel width; when off, keep each line as-is and scroll horizontally',
  'panel.dockUiProps': 'UI properties',
  'panel.dockSvgTree': 'SVG structure',
  'panel.dockSvgObjectProps': 'SVG object properties',
  'dock.outline': 'UI outline',
  'dock.uiLibrary': 'UI library',
  'outline.columnId': 'ID',
  'outline.columnUisvgType': 'UISVG type',
  'outline.resizeColumns': 'Drag to resize ID and UISVG type columns',
  'outline.foldExpand': 'Expand children',
  'outline.foldCollapse': 'Collapse children',
  'outline.itemHint': 'Click to select; double-click to center on canvas',
  'tooltip.semanticLocalName': 'Semantic tag: {name}',
  'tooltip.idLine': 'ID: {id}',
  'tooltip.nameLine': 'Name: {name}',
}
