import type { Locale } from '../composables/useI18n'
import {
  getGraphicsElementByDomId,
  getOutlineNodeForSelection,
  migrateLegacyUisvgMetadata,
  resolveDomElementId,
  type OutlineNode,
} from './uisvgDocument'
import { readUisvgBundleFromObjectRoot, uisvgLocalNameToQName } from './uisvgMetaNode'
import { getWindowsPaletteItem } from './windowsUiControls'

/** 语义行值编辑方式 */
export type UiSemanticEditorKind = 'text' | 'number' | 'enum' | 'mask' | 'switch'

/** 单条「应具有的 UI 语义」说明（面向设计/实现，非 XML 属性表） */
export interface UiSemanticRow {
  /** 持久化键名（`data-uisvg-ui-props` 内 JSON 键），保持与既有文档一致 */
  name: string
  /** 英文界面下展示用；中文界面用 `name` */
  nameEn?: string
  /** 悬停在「名称」上时通过 title 展示 */
  meaning: string
  editor: UiSemanticEditorKind
  /** 新建对象或文档中缺省该键时的默认值（与 `getDefaultUiPropsRecordForWinControl` 一致） */
  defaultValue: string
  /** `editor === 'enum'` 时下拉选项 */
  enumOptions?: string[]
  /** `editor === 'mask'` 时占位/提示用掩码示例 */
  maskHint?: string
}

function inferDefaultValue(
  editor: UiSemanticEditorKind,
  extra?: { enumOptions?: string[] },
): string {
  if (editor === 'enum' && extra?.enumOptions?.length) return extra.enumOptions[0]
  if (editor === 'number') return '0'
  if (editor === 'switch') return 'false'
  return ''
}

function sem(
  name: string,
  meaning: string,
  editor: UiSemanticEditorKind,
  extra?: { enumOptions?: string[]; maskHint?: string; nameEn?: string; defaultValue?: string },
): UiSemanticRow {
  const defaultValue = extra?.defaultValue ?? inferDefaultValue(editor, extra)
  const { defaultValue: _ignore, ...rest } = extra ?? {}
  return { name, meaning, editor, defaultValue, ...rest }
}

/** 表格中「名称」列：随界面语言只显示中文或英文 */
export function formatSemanticRowLabel(row: UiSemanticRow, locale: Locale): string {
  if (locale === 'en' && row.nameEn) return row.nameEn
  return row.name
}

/** 基础几何/容器（非 WinForms 控件名） */
const BASIC_UISVG_LOCAL = new Set(['Frame', 'Rect', 'Text', 'Image'])

export interface UiPropertiesPanelModel {
  /** 面板标题行，如「容器 · Frame」 */
  headline: string
  /** 与 `uisvg:` 语义子元素 localName 一致（如 `Form`、`Frame`） */
  uisvgLocalName: string
  /** 解析后的 DOM `id`（SVG 元素） */
  domId: string
  /** UISVG 类型全名（QName，如 `uisvg:Form`） */
  uisvgType: string
  /** 大纲 `label` / 对象名称 */
  outlineLabel: string
  /** 非 null 时：三平台字符串，**只读展示**（不写回） */
  platformValues: { winforms: string; win32: string; qt: string } | null
  /** 语义属性：名称 + 说明（tooltip）+ 编辑方式；值由 `data-uisvg-ui-props` JSON 承载 */
  semanticRows: UiSemanticRow[]
}

const FRAME_ROWS: UiSemanticRow[] = [
  sem('子图元组织', '子元素的绘制顺序与叠放次序（后绘在上层）。', 'text', { nameEn: 'Child ordering' }),
  sem('坐标与变换', '使用 transform 与父坐标系对齐；根层通常对应逻辑画布原点。', 'text', {
    nameEn: 'Coordinates & transform',
  }),
  sem('裁剪', '可用 clip-path 限制子内容可见区域。', 'text', { nameEn: 'Clipping' }),
]

const RECT_ROWS: UiSemanticRow[] = [
  sem('几何', 'x、y、width、height；rx/ry 圆角。', 'text', { nameEn: 'Geometry' }),
  sem('外观', 'fill、stroke、stroke-width、opacity。', 'text', { nameEn: 'Appearance' }),
  sem('命中', '作为可点区域时需保证可接收指针事件（必要时 pointer-events）。', 'text', {
    nameEn: 'Hit testing',
  }),
]

const TEXT_ROWS: UiSemanticRow[] = [
  sem('文本内容', '元素文本节点或 tspan 内容。', 'text', { nameEn: 'Text content' }),
  sem('字体', 'font-family、font-size、font-weight、font-style。', 'text', { nameEn: 'Font' }),
  sem('排版', 'text-anchor、dominant-baseline、fill。', 'text', { nameEn: 'Typography' }),
]

const WIN_FORM_ROWS: UiSemanticRow[] = [
  sem('Text', '窗口标题栏文字（WinForms）。', 'text', { defaultValue: 'Form' }),
  sem('ClientSize / Size', '客户区或整体尺寸；与画布上占位矩形一致。', 'text'),
  sem(
    'WindowState',
    'Normal / Minimized / Maximized。',
    'enum',
    { enumOptions: ['Normal', 'Minimized', 'Maximized'] },
  ),
  sem(
    'StartPosition',
    '初始位置（如 CenterScreen）。',
    'enum',
    {
      enumOptions: [
        'Manual',
        'CenterScreen',
        'CenterParent',
        'WindowsDefaultBounds',
        'WindowsDefaultLocation',
      ],
    },
  ),
  sem('TopMost / ShowInTaskbar', '置顶与任务栏显示。', 'text'),
]

const WIN_BUTTON_ROWS: UiSemanticRow[] = [
  sem('Text', '按钮表面文字。', 'text'),
  sem('Enabled / Visible', '是否可用、是否显示。', 'text'),
  sem(
    'DialogResult',
    '在对话框上作为接受/取消时绑定结果（可选）。',
    'enum',
    { enumOptions: ['None', 'OK', 'Cancel', 'Abort', 'Retry', 'Ignore', 'Yes', 'No'] },
  ),
  sem('FlatStyle / Image', '平面样式或图标（可选）。', 'text'),
]

const WIN_LABEL_ROWS: UiSemanticRow[] = [
  sem('Text', '静态说明文字。', 'text', { defaultValue: 'Label' }),
  sem('AutoSize / TextAlign', '自动尺寸与对齐（布局由容器约束）。', 'text'),
]

const WIN_TEXTBOX_ROWS: UiSemanticRow[] = [
  sem('Text', '当前文本内容。', 'text'),
  sem('ReadOnly / Multiline', '只读与多行。', 'text'),
  sem('MaxLength', '最大长度（可选）。', 'number'),
]

const WIN_MASKED_TEXTBOX_ROWS: UiSemanticRow[] = [
  ...WIN_TEXTBOX_ROWS,
  sem('Mask', '掩码字符串（如日期、电话）。', 'mask', { maskHint: '00/00/0000' }),
]

const WIN_CHECK_ROWS: UiSemanticRow[] = [
  sem('Checked', '勾选状态。', 'switch'),
  sem('Text', '标签文字。', 'text'),
  sem('AutoCheck / ThreeState', '自动切换与三态（若适用）。', 'text'),
]

const WIN_LIST_ROWS: UiSemanticRow[] = [
  sem('Items', '列表项集合。', 'text'),
  sem('SelectedIndex / SelectedItem', '当前选中项。', 'text'),
  sem('MultiSelect', '是否可多选（ListBox/ListView 等）。', 'switch'),
]

const WIN_COMBO_ROWS: UiSemanticRow[] = [
  sem('Items', '下拉项集合。', 'text'),
  sem('Text / SelectedItem', '显示文本或选中项。', 'text'),
  sem(
    'DropDownStyle',
    '下拉样式（可编辑/仅选）。',
    'enum',
    { enumOptions: ['DropDown', 'DropDownList', 'Simple'] },
  ),
]

const WIN_SLIDER_ROWS: UiSemanticRow[] = [
  sem('Minimum / Maximum / Value', '范围与当前值。', 'text'),
  sem('TickStyle / Orientation', '刻度与水平/垂直。', 'text'),
]

const WIN_PROGRESS_ROWS: UiSemanticRow[] = [
  sem('Minimum / Maximum / Value', '进度范围与当前进度。', 'text'),
  sem('Style', '连续 / 分块等。', 'text'),
]

const WIN_SCROLL_ROWS: UiSemanticRow[] = [
  sem('Minimum / Maximum / Value', '滚动范围与滑块位置。', 'text'),
  sem('LargeChange / SmallChange', '页滚动与行滚动步长。', 'text'),
]

const WIN_TAB_ROWS: UiSemanticRow[] = [
  sem('TabPages', '选项卡页集合。', 'text'),
  sem('SelectedIndex', '当前页索引。', 'number'),
]

const WIN_MENU_ROWS: UiSemanticRow[] = [
  sem('Items', '菜单项树（标题、快捷键、子菜单）。', 'text'),
  sem('Visible / Enabled', '可见与可用状态。', 'text'),
]

const WIN_GENERIC_ROWS: UiSemanticRow[] = [
  sem('Name', '设计器中的对象名（与 id 可对应）。', 'text'),
  sem('Text / 主文案', '控件主显示文本（若该控件具备）。', 'text', { nameEn: 'Text / primary caption' }),
  sem('Enabled / Visible', '是否可用、是否显示。', 'text'),
  sem('TabIndex / TabStop', 'Tab 顺序与是否参与 Tab。', 'text'),
  sem('Location / Size', '在父容器中的位置与尺寸（与 SVG 几何一致）。', 'text'),
  sem('Anchor / Dock', '相对布局或停靠（概念层；画布上由几何体现）。', 'mask', {
    maskHint: 'Top,Bottom,Left,Right',
  }),
]

/**
 * 规范对话框等：按 uisvg 语义 localName（`Frame` / `Rect` / `Form` / `Button` …）取与右栏「UI 属性」一致的语义行。
 */
export function semanticRowsForUisvgLocalName(localName: string): UiSemanticRow[] {
  const k = localName.trim()
  if (k === 'Frame') return FRAME_ROWS
  if (k === 'Rect') return RECT_ROWS
  if (k === 'Text') return TEXT_ROWS
  if (k === 'Image') return []
  return rowsForWinControl(k)
}

export function rowsForWinControl(controlId: string): UiSemanticRow[] {
  const id = controlId
  if (id === 'Form') return WIN_FORM_ROWS
  if (id === 'Button' || id === 'LinkLabel') return WIN_BUTTON_ROWS
  if (id === 'Label') return WIN_LABEL_ROWS
  if (id === 'TextBox' || id === 'RichTextBox') return WIN_TEXTBOX_ROWS
  if (id === 'MaskedTextBox') return WIN_MASKED_TEXTBOX_ROWS
  if (id === 'CheckBox' || id === 'RadioButton') return WIN_CHECK_ROWS
  if (id === 'ComboBox') return WIN_COMBO_ROWS
  if (id === 'ListBox' || id === 'CheckedListBox' || id === 'ListView' || id === 'TreeView' || id === 'DataGridView')
    return WIN_LIST_ROWS
  if (id === 'TrackBar') return WIN_SLIDER_ROWS
  if (id === 'ProgressBar') return WIN_PROGRESS_ROWS
  if (id === 'HScrollBar' || id === 'VScrollBar') return WIN_SCROLL_ROWS
  if (id === 'TabControl') return WIN_TAB_ROWS
  if (id === 'GroupBox' || id === 'Panel' || id === 'SplitContainer' || id === 'FlowLayoutPanel' || id === 'TableLayoutPanel')
    return FRAME_ROWS
  if (id === 'MenuStrip' || id === 'ToolStrip' || id === 'StatusStrip' || id === 'ContextMenuStrip') return WIN_MENU_ROWS
  if (id === 'PictureBox' || id === 'PropertyGrid' || id === 'DateTimePicker' || id === 'MonthCalendar' || id === 'NumericUpDown')
    return WIN_GENERIC_ROWS
  return WIN_GENERIC_ROWS
}

/** 与 `WIN_BUTTON_ROWS` 等共享行时，按控件覆盖主文案 `Text` 的默认值（行定义里 `Text` 多为空串） */
const WIN_PRIMARY_TEXT: Partial<Record<string, string>> = {
  Button: 'Button',
  LinkLabel: 'LinkLabel',
  CheckBox: 'CheckBox',
  RadioButton: 'RadioButton',
}

/**
 * 新建 Windows 控件时写入 `data-uisvg-ui-props` 的默认键值（与右栏语义行 `defaultValue` 一致）。
 */
export function getDefaultUiPropsRecordForWinControl(controlId: string): Record<string, string> {
  const rows = rowsForWinControl(controlId)
  const o: Record<string, string> = {}
  for (const r of rows) {
    o[r.name] = r.defaultValue
  }
  const primary = WIN_PRIMARY_TEXT[controlId]
  if (primary !== undefined && Object.prototype.hasOwnProperty.call(o, 'Text')) {
    o['Text'] = primary
  }
  return o
}

function platformTripleFromDom(
  el: Element | null,
  pal: { label: string; win32: string; qt: string } | null,
  fallbackWinforms: string,
): { winforms: string; win32: string; qt: string } {
  const b = el ? readUisvgBundleFromObjectRoot(el) : null
  const p = b?.platform
  return {
    winforms: p?.winforms ?? el?.getAttribute('data-winforms') ?? pal?.label ?? fallbackWinforms,
    win32: p?.win32 ?? el?.getAttribute('data-win32') ?? pal?.win32 ?? '',
    qt: p?.qt ?? el?.getAttribute('data-qt') ?? pal?.qt ?? '',
  }
}

function resolveUisvgLocalNameForPanel(outline: OutlineNode | null, el: Element | null, fallback: string): string {
  if (outline?.uisvgLocalName) return outline.uisvgLocalName
  const b = el ? readUisvgBundleFromObjectRoot(el) : null
  if (b?.uisvgLocalName) return b.uisvgLocalName
  return fallback
}

function modelFromOutlineAndDom(
  outline: OutlineNode | null,
  domId: string,
  doc: Document,
): UiPropertiesPanelModel {
  const el = getGraphicsElementByDomId(doc, domId)

  const uisvgLocalName = outline?.uisvgLocalName ?? 'unknown'
  const outlineLabel = outline?.label ?? domId
  const resolved = resolveUisvgLocalNameForPanel(outline, el, uisvgLocalName)
  const uisvgType = uisvgLocalNameToQName(resolved)

  /** 大纲虚拟根「uisvg::root」选中时 DOM 为 `#layer-root`，以其中 bundle 为准 */
  if (outline?.uisvgLocalName === 'uisvg.root' && el) {
    const b = readUisvgBundleFromObjectRoot(el)
    const ln = b.uisvgLocalName || 'Frame'
    return {
      headline: `容器 · ${ln}`,
      uisvgLocalName: ln,
      domId,
      uisvgType: uisvgLocalNameToQName(ln),
      outlineLabel,
      platformValues: null,
      semanticRows: FRAME_ROWS,
    }
  }

  if (outline?.uisvgLocalName === 'svg') {
    return {
      headline: 'SVG 文档',
      uisvgLocalName: 'svg',
      domId,
      uisvgType: 'svg',
      outlineLabel,
      platformValues: null,
      semanticRows: [
        sem('标识', 'SVG id 与大纲 ref 应对齐。', 'text', { nameEn: 'Identity', defaultValue: '' }),
        sem('几何与样式', '按元素类型使用对应 SVG 属性。', 'text', { nameEn: 'Geometry & style', defaultValue: '' }),
      ],
    }
  }

  if (outline?.uisvgLocalName === 'Frame') {
    return {
      headline: `容器 · ${resolved}`,
      uisvgLocalName: resolved,
      domId,
      uisvgType,
      outlineLabel,
      platformValues: null,
      semanticRows: FRAME_ROWS,
    }
  }

  if (outline?.uisvgLocalName === 'Rect') {
    return {
      headline: `矩形 · ${resolved}`,
      uisvgLocalName: resolved,
      domId,
      uisvgType,
      outlineLabel,
      platformValues: null,
      semanticRows: RECT_ROWS,
    }
  }

  if (outline?.uisvgLocalName === 'Text') {
    return {
      headline: `文本 · ${resolved}`,
      uisvgLocalName: resolved,
      domId,
      uisvgType,
      outlineLabel,
      platformValues: null,
      semanticRows: TEXT_ROWS,
    }
  }

  if (outline?.uisvgLocalName === 'Image') {
    return {
      headline: `图像 · ${resolved}`,
      uisvgLocalName: resolved,
      domId,
      uisvgType,
      outlineLabel,
      platformValues: null,
      semanticRows: [],
    }
  }

  if (outline && outline.uisvgLocalName && !BASIC_UISVG_LOCAL.has(outline.uisvgLocalName)) {
    const winId = outline.uisvgLocalName
    const pal = getWindowsPaletteItem(winId)
    const semanticRows = rowsForWinControl(winId)
    return {
      headline: pal ? `WinForms · ${pal.label}` : `Windows 控件 · ${winId}`,
      uisvgLocalName: resolved,
      domId,
      uisvgType,
      outlineLabel,
      platformValues: platformTripleFromDom(el, pal, winId),
      semanticRows,
    }
  }

  /** 无大纲节点时：用 DOM 推断 */
  if (!outline && el) {
    const b = readUisvgBundleFromObjectRoot(el)
    const wf = (b.platform?.winforms || el.getAttribute('data-winforms'))?.trim()
    if (wf) {
      const pal = getWindowsPaletteItem(wf)
      const semanticRows = rowsForWinControl(wf)
      return {
        headline: pal ? `WinForms · ${pal.label}` : `Windows 控件 · ${wf}`,
        uisvgLocalName: wf,
        domId,
        uisvgType: uisvgLocalNameToQName(b.uisvgLocalName || wf),
        outlineLabel: b.label || el.getAttribute('data-uisvg-label') || wf,
        platformValues: platformTripleFromDom(el, pal, wf),
        semanticRows,
      }
    }
    const tag = (el.localName || el.tagName || '').toLowerCase()
    if (tag === 'rect') {
      return {
        headline: '矩形 · Rect',
        uisvgLocalName: 'Rect',
        domId,
        uisvgType: uisvgLocalNameToQName('Rect'),
        outlineLabel,
        platformValues: null,
        semanticRows: RECT_ROWS,
      }
    }
    if (tag === 'text') {
      return {
        headline: '文本 · Text',
        uisvgLocalName: 'Text',
        domId,
        uisvgType: uisvgLocalNameToQName('Text'),
        outlineLabel,
        platformValues: null,
        semanticRows: TEXT_ROWS,
      }
    }
    if (tag === 'g') {
      return {
        headline: '容器 · Frame',
        uisvgLocalName: b.uisvgLocalName || 'Frame',
        domId,
        uisvgType: uisvgLocalNameToQName(b.uisvgLocalName || 'Frame'),
        outlineLabel,
        platformValues: null,
        semanticRows: FRAME_ROWS,
      }
    }
  }

  return {
    headline: '通用图元',
    uisvgLocalName: resolved,
    domId,
    uisvgType,
    outlineLabel,
    platformValues: null,
    semanticRows: [
      sem('标识', 'SVG id 与大纲 ref 应对齐。', 'text', { nameEn: 'Identity', defaultValue: '' }),
      sem('几何与样式', '按元素类型使用对应 SVG 属性。', 'text', { nameEn: 'Geometry & style', defaultValue: '' }),
    ],
  }
}

/**
 * 构建右侧「UI 属性」面板结构（具体值在 DataPanel 中结合 `data-uisvg-ui-props` 绑定）。
 */
export function getUiPropertiesPanelModel(svgXml: string, selectedId: string | null): UiPropertiesPanelModel | null {
  if (!selectedId) return null
  const domId = resolveDomElementId(svgXml, selectedId)
  if (!domId) return null
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const outline = getOutlineNodeForSelection(svgXml, selectedId)
  return modelFromOutlineAndDom(outline, domId, doc)
}
