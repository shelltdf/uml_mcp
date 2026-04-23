import {
  UISVG_NS,
  isUisvgObjectRootG,
  readUisvgBundleFromObjectRoot,
  uisvgSemanticElementIdForObjectRoot,
} from './uisvgMetaNode'
import { LAYER_SIBLING_DOM_ID, migrateLegacyUisvgMetadata } from './uisvgDocument'

/** 当前视口在画布用户坐标系下可见的矩形（与 CanvasView 中换算一致） */
export interface VisibleUserRect {
  x: number
  y: number
  width: number
  height: number
}

export const BASIC_PLACEMENT_SIZE = {
  rect: { w: 160, h: 48 },
  text: { w: 120, h: 28 },
  frame: { w: 240, h: 160 },
} as const

/** Form 标题栏高度（SVG 用户单位，不随外框竖向拉伸） */
export const FORM_TITLE_BAR_HEIGHT = 26
/** 标题栏文字字号（与 `windowsUiControls` Form 标题一致；重排时用于抵消误缩放） */
export const FORM_TITLE_TEXT_FONT_SIZE = '11'

/** MenuStrip / StatusStrip 横向条：标签距左、基线距条顶（与 builders 默认一致） */
export const WIN_FLAT_BAR_CAPTION_PAD_X = 6
export const WIN_FLAT_BAR_CAPTION_BASELINE_Y = 16
export const WIN_FLAT_BAR_CAPTION_FONT_SIZE = '11'

/** ToolStrip：条内占位按钮相对条左上、固定尺寸与水平间距（与 builders 默认一致） */
export const TOOLSTRIP_ITEM_INSET_X = 6
export const TOOLSTRIP_ITEM_INSET_Y = 4
export const TOOLSTRIP_ITEM_WIDTH = 22
export const TOOLSTRIP_ITEM_HEIGHT = 18
export const TOOLSTRIP_ITEM_GAP = 4

/** ContextMenuStrip：菜单项文字左内边距、首行基线、行距与字号（与 builders 默认 8,16 / 8,32 / 11 一致） */
export const CONTEXT_MENU_TEXT_PAD_X = 8
export const CONTEXT_MENU_FIRST_BASELINE_Y = 16
export const CONTEXT_MENU_ROW_STEP = 16
export const CONTEXT_MENU_TEXT_FONT_SIZE = '11'

/** GroupBox：标题留白条与标题文字相对对象根（与 builders 默认一致） */
export const GROUPBOX_TITLE_CHIP_X = 8
export const GROUPBOX_TITLE_CHIP_Y = 2
export const GROUPBOX_TITLE_CHIP_W = 56
export const GROUPBOX_TITLE_CHIP_H = 12
export const GROUPBOX_TITLE_TEXT_X = 12
export const GROUPBOX_TITLE_TEXT_Y = 12
export const GROUPBOX_TITLE_TEXT_FONT_SIZE = '11'

/** TabControl：页签条高度与两枚页签、标签位置（与 builders 默认一致） */
export const TABCONTROL_TAB1_HEAD_X = 0
export const TABCONTROL_TAB1_HEAD_Y = 0
export const TABCONTROL_TAB1_HEAD_W = 44
export const TABCONTROL_TAB1_HEAD_H = 18
export const TABCONTROL_TAB2_HEAD_X = 44
export const TABCONTROL_TAB2_HEAD_Y = 2
export const TABCONTROL_TAB2_HEAD_W = 44
export const TABCONTROL_TAB2_HEAD_H = 16
export const TABCONTROL_TAB1_TEXT_X = 6
export const TABCONTROL_TAB1_TEXT_Y = 13
export const TABCONTROL_TAB2_TEXT_X = 50
export const TABCONTROL_TAB2_TEXT_Y = 13
export const TABCONTROL_TAB_LABEL_FONT_SIZE = '10'

/** SplitContainer：横向分割条尺寸与相对左窗格的几何（与 builders 默认 56|54–60|60+56 一致） */
export const SPLITCONTAINER_SPLITTER_WIDTH = 6
export const SPLITCONTAINER_SPLITTER_HEIGHT = 18
/** 分割条左缘 = 左窗格右缘 − 此值（默认 56−2=54） */
export const SPLITCONTAINER_SPLITTER_LEFT_INSET_FROM_LEFT_END = 2
/** 右窗格左缘 = 左窗格右缘 + 此值（默认 56+4=60） */
export const SPLITCONTAINER_RIGHT_PANE_X_OFFSET_FROM_LEFT_END = 4

/** FlowLayoutPanel：虚线框内占位按钮（与 builders 默认 6,8 / 28×16 / 间距 6 一致） */
export const FLOW_LAYOUT_ITEM_INSET_X = 6
export const FLOW_LAYOUT_ITEM_INSET_Y = 8
export const FLOW_LAYOUT_ITEM_WIDTH = 28
export const FLOW_LAYOUT_ITEM_HEIGHT = 16
export const FLOW_LAYOUT_ITEM_GAP = 6

/** Button：标签相对外框左上偏移与字号（与 builders 默认 88×26、文字 18,18 / 11 一致） */
export const BUTTON_TEXT_OFFSET_X = 18
export const BUTTON_TEXT_OFFSET_Y = 18
export const BUTTON_TEXT_FONT_SIZE = '11'

/** MaskedTextBox：占位文字相对白底框左上（与 builders 默认 128×22、4,16 / 11 一致） */
export const MASKED_TEXTBOX_TEXT_OFFSET_X = 4
export const MASKED_TEXTBOX_TEXT_OFFSET_Y = 16
export const MASKED_TEXTBOX_TEXT_FONT_SIZE = '11'

/** RichTextBox：占位文字相对白底框左上（与 builders 默认 160×72、6,18 / 11 一致） */
export const RICH_TEXTBOX_TEXT_OFFSET_X = 6
export const RICH_TEXTBOX_TEXT_OFFSET_Y = 18
export const RICH_TEXTBOX_TEXT_FONT_SIZE = '11'

/** CheckBox：方框、对勾 path、标签（与 builders 默认一致；缩放后恢复固定几何） */
export const CHECKBOX_BOX_X = 0
export const CHECKBOX_BOX_Y = 2
export const CHECKBOX_BOX_W = 12
export const CHECKBOX_BOX_H = 12
export const CHECKBOX_CHECK_PATH_D = 'M2 7 L5 10 L11 3'
export const CHECKBOX_CHECK_STROKE_WIDTH = '1.2'
export const CHECKBOX_LABEL_X = 18
export const CHECKBOX_LABEL_Y = 14
export const CHECKBOX_LABEL_FONT_SIZE = '12'

/** ListBox：列表项文字相对白底框左上（与 builders 默认 120×72、三行 4,16 / 4,30 / 4,44 / 11 一致） */
export const LISTBOX_TEXT_PAD_X = 4
export const LISTBOX_FIRST_BASELINE_Y = 16
export const LISTBOX_ROW_STEP = 14
export const LISTBOX_ITEM_FONT_SIZE = '11'

/** ListView：表头两列 + 分隔横线（与 builders 默认 140×80、线 4,22–134,22、Col A/B 6,16 / 72,16 / 10 一致；B 列 x = floor(w/2)+2） */
export const LISTVIEW_HEADER_TEXT_BASELINE_Y = 16
export const LISTVIEW_HEADER_SEPARATOR_Y = 22
export const LISTVIEW_LINE_MARGIN_LEFT = 4
export const LISTVIEW_LINE_MARGIN_RIGHT = 6
export const LISTVIEW_COL_A_X = 6
export const LISTVIEW_COL_B_HALF_WIDTH_OFFSET = 2
export const LISTVIEW_HEADER_TEXT_FONT_SIZE = '10'
export const LISTVIEW_HEADER_LINE_STROKE = '#e8e8e8'

/** TreeView：根节点 + 缩进子行（与 builders 默认 120×88、▾ Node 6,16 / Child 18,30 / 11 一致） */
export const TREEVIEW_ROOT_TEXT_X = 6
export const TREEVIEW_ROOT_BASELINE_Y = 16
export const TREEVIEW_CHILD_TEXT_X = 18
export const TREEVIEW_CHILD_BASELINE_Y = 30
export const TREEVIEW_TEXT_FONT_SIZE = '11'

/** MonthCalendar：标题月年 + 下划线（与 builders 默认 160×120、文案 6,18/11、线 8,28–150,28 / #e0e0e0 一致） */
export const MONTH_CAL_TITLE_PAD_X = 6
export const MONTH_CAL_TITLE_BASELINE_Y = 18
export const MONTH_CAL_UNDERLINE_Y = 28
export const MONTH_CAL_LINE_MARGIN_LEFT = 8
export const MONTH_CAL_LINE_MARGIN_RIGHT = 10
export const MONTH_CAL_TITLE_FONT_SIZE = '11'
export const MONTH_CAL_LINE_STROKE = '#e0e0e0'

/** TrackBar：横向槽 + 固定尺寸滑块（与 builders 默认槽 0,8 120×4、滑块 52,4 8×14 一致；滑块水平位置按默认行程比例） */
export const TRACKBAR_THUMB_W = 8
export const TRACKBAR_THUMB_H = 14
export const TRACKBAR_DEFAULT_TRACK_W = 120
export const TRACKBAR_DEFAULT_THUMB_LEFT = 52
export const TRACKBAR_DEFAULT_SLIDE_RANGE = TRACKBAR_DEFAULT_TRACK_W - TRACKBAR_THUMB_W
/** 横向槽视觉高度（与 builders 一致） */
export const TRACKBAR_GROOVE_H = 4
/** 槽相对控件面上缘的 Y 偏移（默认 18 高控件内槽从 y=8 开始） */
export const TRACKBAR_GROOVE_Y_OFFSET = 8
/** 与 placement TrackBar.h 一致：整控件外框默认高度 */
export const TRACKBAR_DEFAULT_FACE_H = 18
export const TRACKBAR_FACE_FILL = '#ffffff'
export const TRACKBAR_TRACK_FILL = '#e0e0e0'
export const TRACKBAR_THUMB_FILL = '#e1e1e1'

/** ProgressBar：白底外框 + 内嵌进度块（与 builders 默认 120×16、进度 1,1 72×14 / #06b opacity 0.35 一致；进度宽 = 内宽 × 72/118） */
export const PROGRESS_BAR_INSET = 1
export const PROGRESS_BAR_DEFAULT_OUTER_W = 120
export const PROGRESS_BAR_DEFAULT_FILL_W = 72
export const PROGRESS_BAR_FILL_COLOR = '#06b'
export const PROGRESS_BAR_FILL_OPACITY = '0.35'

/** HScrollBar：横向槽 + 滑块（与 builders 默认 120×16、滑块 40,2 40×12 一致；滑块宽 ≈ ow×40/120，左缘行程比例 40/80） */
export const HSCROLL_DEFAULT_TRACK_W = 120
export const HSCROLL_THUMB_DEFAULT_W = 40
export const HSCROLL_THUMB_DEFAULT_H = 12
export const HSCROLL_THUMB_DEFAULT_LEFT = 40
export const HSCROLL_DEFAULT_SLIDE_RANGE = HSCROLL_DEFAULT_TRACK_W - HSCROLL_THUMB_DEFAULT_W
/** 横向滚动条轨道可视高度（与 placement HScrollBar.h、builders 一致）；外框拉高时槽保持此高度贴在面上缘 */
export const HSCROLL_DEFAULT_FACE_H = 16
export const HSCROLL_FACE_FILL = '#ffffff'
export const HSCROLL_TRACK_FILL = '#f0f0f0'
export const HSCROLL_THUMB_FILL = '#e1e1e1'

/** VScrollBar：竖向槽 + 滑块（与 builders 默认 16×80、滑块 2,28 12×24 一致；滑块高 ≈ 槽高×24/80，宽取 min(12, 槽宽−4) 并在槽内水平居中；竖向行程比例 28/56） */
export const VSCROLL_DEFAULT_TRACK_W = 16
export const VSCROLL_DEFAULT_TRACK_H = 80
/** 竖向滚动条轨道可视宽度（与 placement VScrollBar.w 一致）；外框拉宽时槽保持此宽度贴在面左缘 */
export const VSCROLL_DEFAULT_FACE_W = 16
export const VSCROLL_THUMB_DEFAULT_W = 12
export const VSCROLL_THUMB_DEFAULT_H = 24
export const VSCROLL_THUMB_DEFAULT_TOP = 28
export const VSCROLL_DEFAULT_SLIDE_RANGE = VSCROLL_DEFAULT_TRACK_H - VSCROLL_THUMB_DEFAULT_H
export const VSCROLL_FACE_FILL = '#ffffff'
export const VSCROLL_TRACK_FILL = '#f0f0f0'
export const VSCROLL_THUMB_FILL = '#e1e1e1'

/** DataGridView：默认 160×88；横线 y=20+i×18（i=0..3）；竖线 x=40+j×40（j=0..2），与 builders 一致 */
export const DATAGRIDVIEW_DEFAULT_W = 160
export const DATAGRIDVIEW_DEFAULT_H = 88
export const DATAGRIDVIEW_HEADER_BOTTOM = 20
export const DATAGRIDVIEW_H_LINE_STEP = 18
export const DATAGRIDVIEW_H_LINE_COUNT = 4
export const DATAGRIDVIEW_COL_FIRST_X = 40
export const DATAGRIDVIEW_COL_STEP = 40
export const DATAGRIDVIEW_V_LINE_COUNT = 3
export const DATAGRIDVIEW_GRID_STROKE = '#e0e0e0'

/** CheckedListBox：白底框内小方框 + 行文字（与 builders 默认 120×72、两行 4,6/4,22 与 18,16/18,32 / 11 一致） */
export const CHECKED_LISTBOX_CHECK_X = 4
export const CHECKED_LISTBOX_CHECK_Y0 = 6
export const CHECKED_LISTBOX_CHECK_W = 10
export const CHECKED_LISTBOX_CHECK_H = 10
export const CHECKED_LISTBOX_CHECK_ROW_STEP = 16
export const CHECKED_LISTBOX_LABEL_X = 18
export const CHECKED_LISTBOX_FIRST_BASELINE_Y = 16
export const CHECKED_LISTBOX_LABEL_ROW_STEP = 16
export const CHECKED_LISTBOX_LABEL_FONT_SIZE = '11'

/** ComboBox：全宽白底 + 右侧下拉钮 + 三角 + 文案（与 builders 默认 120×22、钮 96,1 22×20、三角 M104 8… 与 4,16/11 一致） */
export const COMBO_DROPDOWN_WIDTH = 22
export const COMBO_DROPDOWN_MARGIN_RIGHT = 2
export const COMBO_DROPDOWN_MARGIN_Y = 1
/** 下拉钮高度（与 builders 默认 h=20 一致；单行 ComboBox，不因外框拉高而铺满） */
export const COMBO_DROPDOWN_HEIGHT = 20
/** 三角相对定位点（cx,cy）：默认 M104 8 L112 8 L108 13，即半宽 4、上 3、下 2 */
export const COMBO_ARROW_HALF_WIDTH = 4
export const COMBO_ARROW_HALF_HEIGHT_TOP = 3
export const COMBO_ARROW_HALF_HEIGHT_BOTTOM = 2
/** 三角水平中心相对下拉钮左缘偏移（默认 96+12=108，与 22px 宽钮内视觉一致） */
export const COMBO_ARROW_CENTER_X_OFFSET_FROM_BTN_LEFT = 12
export const COMBO_TEXT_OFFSET_X = 4
export const COMBO_TEXT_BASELINE_SMALL_H = 16
export const COMBO_TEXT_FONT_SIZE = '11'

/** PropertyGrid：白底 + 顶栏灰条 +「Property」/ 首行占位（与 builders 默认 120×88、顶栏 20、4,14 / 4,34 / 10 一致） */
export const PROPERTY_GRID_TOOLBAR_HEIGHT = 20
export const PROPERTY_GRID_TEXT_PAD_X = 4
export const PROPERTY_GRID_TOOLBAR_TEXT_BASELINE_Y = 14
/** 首行属性基线距顶栏底（默认 20+14=34 距控件顶） */
export const PROPERTY_GRID_FIRST_ROW_GAP_BELOW_TOOLBAR = 14
export const PROPERTY_GRID_TEXT_FONT_SIZE = '10'

/** PictureBox：浅蓝底 + 居中占位「IMG」（默认 88×64 时基线 y=40 ≈ 竖直中线 + 8；重排时 text-anchor 居中） */
export const PICTURE_BOX_TEXT_FONT_SIZE = '10'
export const PICTURE_BOX_TEXT_BASELINE_OFFSET_FROM_MID_Y = 8
export const PICTURE_BOX_TEXT_FILL = '#7090c0'

/** NumericUpDown：白底输入区 + 右侧上下微调块（与 builders 默认 72×22、微调 x=70 宽16、上下各 10、文案 4,16/11 一致） */
export const NUMERIC_UPDOWN_SPIN_WIDTH = 16
/** 微调列在上下边距之间的总高度（默认 22−2=20，即 10+10；单行控件，外框拉高时不拉长按钮） */
export const NUMERIC_UPDOWN_SPIN_INNER_HEIGHT = 20
/** 微调条左缘 = 白底 rect 右缘 − 此值（默认 72−2=70） */
export const NUMERIC_UPDOWN_SPIN_INSET_FROM_FACE_END = 2
export const NUMERIC_UPDOWN_SPIN_MARGIN_Y = 1
export const NUMERIC_UPDOWN_TEXT_OFFSET_X = 4
/** 高度较小时（约单行）文字基线距白底顶，与默认 h=22 时 y=16 一致 */
export const NUMERIC_UPDOWN_TEXT_BASELINE_SMALL_H = 16
export const NUMERIC_UPDOWN_TEXT_FONT_SIZE = '11'

/** RadioButton：外圆、内点、标签（与 builders 默认一致；缩放后恢复固定几何） */
export const RADIO_OUTER_CX = 6
export const RADIO_OUTER_CY = 8
export const RADIO_OUTER_R = 6
export const RADIO_INNER_CX = 6
export const RADIO_INNER_CY = 8
export const RADIO_INNER_R = 3
export const RADIO_LABEL_X = 18
export const RADIO_LABEL_Y = 14
export const RADIO_LABEL_FONT_SIZE = '12'

/** 客户区相对窗体外框左右内边距（固定用户单位） */
export const FORM_HORIZONTAL_INSET = 6
/** 窗体底部非客户区高度 */
export const FORM_BOTTOM_RESERVE = 8

/** 关闭键槽位右缘距窗体外框右缘（三键整体靠右） */
export const FORM_CAPTION_RIGHT_INSET = 4
/** 最小化 / 最大化 / 关闭 各占用的水平槽宽（用户单位） */
export const FORM_CAPTION_BUTTON_SLOT = 18
/** 相邻标题栏按钮槽之间的间距 */
export const FORM_CAPTION_BUTTON_GAP = 2
/** 最小化横线在标题栏内的 Y（相对标题栏顶） */
export const FORM_CAPTION_MIN_LINE_LOCAL_Y = 14
/** 最大化框与关闭叉图形的顶边相对标题栏顶的偏移 */
export const FORM_CAPTION_ICON_TOP_LOCAL = 7

/**
 * 根据窗体外框左缘与宽度，计算标题栏右侧三键的槽位左缘。
 * 顺序为自左向右：最小化、最大化、关闭；关闭紧贴外框右缘（扣 `FORM_CAPTION_RIGHT_INSET`）。
 */
export function layoutFormCaptionSlots(outerX: number, outerWidth: number): {
  minSlotLeft: number
  maxSlotLeft: number
  closeSlotLeft: number
} {
  const closeSlotLeft =
    outerX + outerWidth - FORM_CAPTION_RIGHT_INSET - FORM_CAPTION_BUTTON_SLOT
  const maxSlotLeft = closeSlotLeft - FORM_CAPTION_BUTTON_GAP - FORM_CAPTION_BUTTON_SLOT
  const minSlotLeft = maxSlotLeft - FORM_CAPTION_BUTTON_GAP - FORM_CAPTION_BUTTON_SLOT
  return { minSlotLeft, maxSlotLeft, closeSlotLeft }
}

/** 与 builders 外接盒大致一致，用于占位与碰撞（略放宽） */
export const WINDOWS_CONTROL_PLACEMENT_SIZE: Record<string, { w: number; h: number }> = {
  Form: { w: 160, h: 122 },
  Button: { w: 88, h: 26 },
  Label: { w: 80, h: 18 },
  LinkLabel: { w: 88, h: 18 },
  TextBox: { w: 128, h: 22 },
  MaskedTextBox: { w: 128, h: 22 },
  RichTextBox: { w: 160, h: 72 },
  CheckBox: { w: 88, h: 18 },
  RadioButton: { w: 100, h: 18 },
  ComboBox: { w: 120, h: 22 },
  ListBox: { w: 120, h: 72 },
  CheckedListBox: { w: 120, h: 72 },
  NumericUpDown: { w: 88, h: 22 },
  DateTimePicker: { w: 120, h: 22 },
  MonthCalendar: { w: 160, h: 120 },
  TrackBar: { w: 120, h: 18 },
  ProgressBar: { w: 120, h: 16 },
  HScrollBar: { w: 120, h: 16 },
  VScrollBar: { w: 16, h: 80 },
  TreeView: { w: 120, h: 88 },
  ListView: { w: 140, h: 80 },
  DataGridView: { w: 160, h: 88 },
  GroupBox: { w: 140, h: 80 },
  Panel: { w: 120, h: 64 },
  TabControl: { w: 140, h: 82 },
  SplitContainer: { w: 116, h: 72 },
  FlowLayoutPanel: { w: 120, h: 56 },
  TableLayoutPanel: { w: 120, h: 56 },
  MenuStrip: { w: 160, h: 22 },
  ToolStrip: { w: 160, h: 26 },
  StatusStrip: { w: 160, h: 22 },
  ContextMenuStrip: { w: 100, h: 56 },
  PictureBox: { w: 88, h: 64 },
  PropertyGrid: { w: 120, h: 88 },
}

export function getWindowsControlPlacementSize(controlId: string): { w: number; h: number } {
  return WINDOWS_CONTROL_PLACEMENT_SIZE[controlId] ?? { w: 120, h: 64 }
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  margin: number,
): boolean {
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  )
}

/**
 * 解析 `<g transform="...">` 中 translate / scale / matrix（仅取 matrix 的 e,f 平移，与 getBBox 局部盒组合成画布坐标）。
 */
export function parseGTransform(transform: string): { tx: number; ty: number; sx: number; sy: number } {
  let tx = 0
  let ty = 0
  let sx = 1
  let sy = 1
  const t = transform.trim()
  const tm = t.match(/translate\s*\(\s*([-\d.eE]+)\s*[, ]\s*([-\d.eE]+)\s*\)/)
  if (tm) {
    tx = parseFloat(tm[1])
    ty = parseFloat(tm[2])
  } else {
    const mm = t.match(
      /matrix\s*\(\s*([-\d.eE]+)\s*,\s*([-\d.eE]+)\s*,\s*([-\d.eE]+)\s*,\s*([-\d.eE]+)\s*,\s*([-\d.eE]+)\s*,\s*([-\d.eE]+)\s*\)/,
    )
    if (mm) {
      tx = parseFloat(mm[5])
      ty = parseFloat(mm[6])
    }
  }
  const sm = t.match(/scale\s*\(\s*([-\d.eE]+)(?:\s*[, ]\s*([-\d.eE]+))?\s*\)/)
  if (sm) {
    sx = parseFloat(sm[1])
    sy = sm[2] !== undefined ? parseFloat(sm[2]) : sx
  }
  return { tx, ty, sx, sy }
}

/** 文档根 Frame 的 DOM id（常与画布同大）；参与碰撞会误判「无处可放」，必须排除。 */
const DOC_ROOT_FRAME_SEMANTIC_ID = uisvgSemanticElementIdForObjectRoot('layer-root')

/** 编辑器常见对象根 id 前缀（与 `appendRect` / `appendWindowsControl` / 粘贴等一致），用于无完整 uisvg 元数据时仍参与占位 */
const EDITOR_OBJECT_ROOT_ID = /^(uisvg-|w-|rect-|frame-|text-|paste-)/

/** 参与碰撞的轴对齐矩形；`domId` 仅用于调试展示 */
export type OccupiedRect = { x: number; y: number; width: number; height: number; domId?: string }

type BBoxLocal = { x: number; y: number; width: number; height: number }

/**
 * 从子树内几何属性累加外接盒（`DOMParser` 文档里 `getBBox()` 偶发为 0 时的回退）。
 */
function unionBBoxFromDescendantShapes(root: Element): BBoxLocal | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    minX = Math.min(minX, x0, x1)
    minY = Math.min(minY, y0, y1)
    maxX = Math.max(maxX, x0, x1)
    maxY = Math.max(maxY, y0, y1)
  }
  const walk = (node: Element) => {
    const t = node.tagName.toLowerCase()
    if (t === 'rect') {
      const x = parseFloat(node.getAttribute('x') || '0') || 0
      const y = parseFloat(node.getAttribute('y') || '0') || 0
      const w = parseFloat(node.getAttribute('width') || '0') || 0
      const h = parseFloat(node.getAttribute('height') || '0') || 0
      add(x, y, x + w, y + h)
    } else if (t === 'circle') {
      const cx = parseFloat(node.getAttribute('cx') || '0') || 0
      const cy = parseFloat(node.getAttribute('cy') || '0') || 0
      const r = parseFloat(node.getAttribute('r') || '0') || 0
      add(cx - r, cy - r, cx + r, cy + r)
    } else if (t === 'text') {
      const x = parseFloat(node.getAttribute('x') || '0') || 0
      const y = parseFloat(node.getAttribute('y') || '0') || 0
      const fs = parseFloat(node.getAttribute('font-size') || '14') || 14
      add(x, y - fs, x + 80, y + 4)
    } else if (t === 'image' || t === 'foreignobject') {
      const x = parseFloat(node.getAttribute('x') || '0') || 0
      const y = parseFloat(node.getAttribute('y') || '0') || 0
      const w = parseFloat(node.getAttribute('width') || '0') || 0
      const h = parseFloat(node.getAttribute('height') || '0') || 0
      add(x, y, x + w, y + h)
    }
    for (let i = 0; i < node.children.length; i++) walk(node.children[i] as Element)
  }
  walk(root)
  if (!Number.isFinite(minX) || maxX - minX <= 0.01 || maxY - minY <= 0.01) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function resolveObjectRootLocalBBox(el: SVGGraphicsElement): BBoxLocal | null {
  if (typeof el.getBBox === 'function') {
    try {
      const bb = el.getBBox()
      if (bb.width > 0.25 && bb.height > 0.25) {
        return { x: bb.x, y: bb.y, width: bb.width, height: bb.height }
      }
    } catch {
      /* fall through */
    }
  }
  return unionBBoxFromDescendantShapes(el)
}

/**
 * 是否应作为「已有对象」参与占位碰撞（与大纲/uuidg 尽量一致，并兼容仅带编辑器 id 前缀的 `<g>`）。
 */
function shouldCollectObjectRootG(el: Element): boolean {
  if (el.tagName.toLowerCase() !== 'g') return false
  const id = el.getAttribute('id')?.trim()
  if (!id || id === 'layer-root') return false
  if (id === DOC_ROOT_FRAME_SEMANTIC_ID) return false
  if (isUisvgObjectRootG(el)) return true
  return EDITOR_OBJECT_ROOT_ID.test(id)
}

/**
 * 将单个图元的外接盒（含 `transform` 中的 translate/scale/matrix 平移）并入 `out`。
 */
function pushOccupiedRectFromGraphics(el: SVGGraphicsElement, out: OccupiedRect[]): void {
  const domId = el.getAttribute('id')?.trim()
  if (domId === DOC_ROOT_FRAME_SEMANTIC_ID) return

  const tag = el.tagName?.toLowerCase()
  let tx = 0
  let ty = 0
  let sx = 1
  let sy = 1
  if (tag === 'g' || el.hasAttribute('transform')) {
    const { tx: txx, ty: tyy, sx: sxx, sy: syy } = parseGTransform(el.getAttribute('transform') || '')
    tx = txx
    ty = tyy
    sx = sxx
    sy = syy
  }
  const bb = resolveObjectRootLocalBBox(el)
  if (!bb) return
  out.push({
    x: tx + sx * bb.x,
    y: ty + sy * bb.y,
    width: Math.max(Math.abs(sx * bb.width), 1),
    height: Math.max(Math.abs(sy * bb.height), 1),
    domId: domId || undefined,
  })
}

/**
 * 深度优先遍历容器子树，对每个对象根 `<g>` 取外接矩形；
 * 覆盖嵌套在 Frame/容器内的对象，并包含 `#layer-sibling` 顶层组中的对象。
 */
function walkCollectObjectRootBBoxes(container: Element | null, out: OccupiedRect[]): void {
  if (!container) return
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i] as Element
    if (child.tagName.toLowerCase() === 'g' && shouldCollectObjectRootG(child)) {
      pushOccupiedRectFromGraphics(child as SVGGraphicsElement, out)
    }
    walkCollectObjectRootBBoxes(child, out)
  }
}

/** 当前文档中参与碰撞检测的已有图元外接矩形（画布坐标）。 */
export function collectOccupiedRectsFromDoc(doc: Document): OccupiedRect[] {
  const out: OccupiedRect[] = []
  walkCollectObjectRootBBoxes(doc.getElementById('layer-root'), out)
  walkCollectObjectRootBBoxes(doc.getElementById(LAYER_SIBLING_DOM_ID), out)
  return out
}

function collectOccupiedRects(doc: Document): OccupiedRect[] {
  return collectOccupiedRectsFromDoc(doc)
}

function layoutSlotFallback(doc: Document): { x: number; y: number } {
  const layer = doc.getElementById('layer-root')
  let n = 0
  if (layer) {
    n = layer.getElementsByTagNameNS(UISVG_NS, '*').length
  }
  const col = n % 7
  const row = Math.floor(n / 7) % 12
  return { x: 20 + col * 118, y: 20 + row * 58 }
}

const MARGIN = 10
const GRID = 20
/** 全画布穷举空位时的步进（像素）；越小越不易漏窄缝，略增计算量 */
const SCAN_STEP = 4

/**
 * 已知各已有图元在画布上的轴对齐外接矩形 `occupied`，求新图元（宽 w 高 h）的左上角 (x,y)，
 * 使其与任一已有矩形在间距 MARGIN 意义下不相交；若存在则返回，否则返回 null。
 */
function tryPlaceRectAt(
  occupied: OccupiedRect[],
  cw: number,
  ch: number,
  w: number,
  h: number,
  tx: number,
  ty: number,
): { x: number; y: number } | null {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const x = clamp(tx, 0, Math.max(0, cw - w))
  const y = clamp(ty, 0, Math.max(0, ch - h))
  const candidate = { x, y, width: w, height: h }
  for (const o of occupied) {
    if (rectsOverlap(candidate, o, MARGIN)) return null
  }
  return { x, y }
}

/**
 * 在 [0,cw]×[0,ch] 内按「新图元 wxh」搜索第一个不重叠的左上角：
 * 1）优先 `prefer`（通常为当前视口中心）及周围螺旋格点；
 * 2）再自左上向右、向下步进 `SCAN_STEP` 穷举，保证在分辨率内能发现的空位必被找到。
 */
function findFirstNonOverlappingTopLeft(
  occupied: OccupiedRect[],
  cw: number,
  ch: number,
  w: number,
  h: number,
  prefer: { x: number; y: number },
  coarseGrid: number,
): { x: number; y: number } | null {
  const tryAt = (tx: number, ty: number) => tryPlaceRectAt(occupied, cw, ch, w, h, tx, ty)

  const p0 = tryAt(prefer.x, prefer.y)
  if (p0) return p0

  for (let ring = 1; ring <= 64; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
        const p = tryAt(prefer.x + dx * coarseGrid, prefer.y + dy * coarseGrid)
        if (p) return p
      }
    }
  }

  for (let y = 0; y <= ch - h + 1e-9; y += SCAN_STEP) {
    for (let x = 0; x <= cw - w + 1e-9; x += SCAN_STEP) {
      const p = tryAt(x, y)
      if (p) return p
    }
  }

  return null
}

/** 新建占位算法对外调试信息（与 `findPlacementForNewItemWithDebug` 一并返回） */
export interface NewItemPlacementDebug {
  canvas: { width: number; height: number }
  /** 库表/调用方给出的逻辑尺寸 */
  newItemLogicalSize: { width: number; height: number }
  /** 参与碰撞检测的尺寸（已限制在画布范围内） */
  placementSize: { width: number; height: number }
  /** 最终放置矩形（画布坐标，与 `freeSlotRect` 相同） */
  placedRect: { x: number; y: number; width: number; height: number }
  /** 算法选中的、可放下新图元的空位矩形（与 placedRect 一致） */
  freeSlotRect: { x: number; y: number; width: number; height: number }
  /** 已有对象外接矩形（画布坐标） */
  existingRects: Array<{ domId: string; x: number; y: number; width: number; height: number }>
  /** 画布已无合法空位时仅裁切到画布内，可能与已有图元重叠 */
  usedFallbackPosition: boolean
  collisionMarginPx: number
}

/**
 * 根据当前文档中已有图元的几何外接盒 + 新建图元的宽高 (itemW×itemH)，计算画布用户坐标系下
 * **第一个不重叠**的放置左上角，并返回调试信息。
 */
export function findPlacementForNewItemWithDebug(
  svgXml: string,
  canvasW: number,
  canvasH: number,
  visible: VisibleUserRect | null,
  itemW: number,
  itemH: number,
): { x: number; y: number; debug: NewItemPlacementDebug } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const occupied = collectOccupiedRects(doc)

  const cw = Math.max(16, canvasW)
  const ch = Math.max(16, canvasH)
  const w = Math.min(itemW, cw)
  const h = Math.min(itemH, ch)

  let cx = cw / 2
  let cy = ch / 2
  if (visible && visible.width > 8 && visible.height > 8) {
    cx = visible.x + visible.width / 2
    cy = visible.y + visible.height / 2
  }

  const preferTopLeft = { x: cx - w / 2, y: cy - h / 2 }

  const found =
    findFirstNonOverlappingTopLeft(occupied, cw, ch, w, h, preferTopLeft, GRID) ??
    findFirstNonOverlappingTopLeft(occupied, cw, ch, w, h, layoutSlotFallback(doc), GRID)

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  let x: number
  let y: number
  let usedFallback = false
  if (found) {
    x = found.x
    y = found.y
  } else {
    usedFallback = true
    x = clamp(preferTopLeft.x, 0, Math.max(0, cw - w))
    y = clamp(preferTopLeft.y, 0, Math.max(0, ch - h))
  }

  const placedRect = { x, y, width: w, height: h }
  const existingRects = occupied.map((r) => ({
    domId: r.domId?.trim() || '(无 id)',
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
  }))

  const debug: NewItemPlacementDebug = {
    canvas: { width: cw, height: ch },
    newItemLogicalSize: { width: itemW, height: itemH },
    placementSize: { width: w, height: h },
    placedRect: { ...placedRect },
    freeSlotRect: { ...placedRect },
    existingRects,
    usedFallbackPosition: usedFallback,
    collisionMarginPx: MARGIN,
  }

  return { x, y, debug }
}

/**
 * 与 `findPlacementForNewItemWithDebug` 相同计算，仅返回左上角坐标。
 */
export function findPlacementForNewItem(
  svgXml: string,
  canvasW: number,
  canvasH: number,
  visible: VisibleUserRect | null,
  itemW: number,
  itemH: number,
): { x: number; y: number } {
  const { x, y } = findPlacementForNewItemWithDebug(svgXml, canvasW, canvasH, visible, itemW, itemH)
  return { x, y }
}

/**
 * 在画布内为 wx×h 的矩形找左上角，算法与 `findPlacementForNewItem` 相同（优先点 + 螺旋 + 全画布步进扫描）。
 * 用于像素导入等：同一批多次放置时，将每次结果并入 `occupied` 再调用下一次。
 */
export function findNonOverlappingTopLeft(
  occupied: OccupiedRect[],
  preferredX: number,
  preferredY: number,
  itemW: number,
  itemH: number,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  const cw = Math.max(16, canvasW)
  const ch = Math.max(16, canvasH)
  const w = Math.min(Math.max(1, itemW), cw)
  const h = Math.min(Math.max(1, itemH), ch)
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const found = findFirstNonOverlappingTopLeft(occupied, cw, ch, w, h, { x: preferredX, y: preferredY }, GRID)
  if (found) return found
  return {
    x: clamp(preferredX, 0, Math.max(0, cw - w)),
    y: clamp(preferredY, 0, Math.max(0, ch - h)),
  }
}

/** 由 Form 外框 `form-frame` 推导客户区（边距为固定用户单位）。 */
export function innerClientBoundsForFormOuterRect(outer: SVGRectElement): {
  x: number
  y: number
  width: number
  height: number
} {
  const ox = parseFloat(outer.getAttribute('x') || '0')
  const oy = parseFloat(outer.getAttribute('y') || '0')
  const ow = parseFloat(outer.getAttribute('width') || '0')
  const oh = parseFloat(outer.getAttribute('height') || '0')
  return {
    x: ox + FORM_HORIZONTAL_INSET,
    y: oy + FORM_TITLE_BAR_HEIGHT,
    width: Math.max(8, ow - 2 * FORM_HORIZONTAL_INSET),
    height: Math.max(8, oh - FORM_TITLE_BAR_HEIGHT - FORM_BOTTOM_RESERVE),
  }
}

/** 容器控件类名（如 `Form`）对应的「客户区」在父 `<g>` 局部坐标系下的轴对齐范围（用于子控件占位与拖放夹紧）。 */
function innerClientBoundsForContainerControlId(controlId: string): {
  x: number
  y: number
  width: number
  height: number
} {
  const id = controlId.replace(/^win\./, '')
  const sz = getWindowsControlPlacementSize(id)
  const w = sz.w
  const h = sz.h
  if (id === 'Form') {
    return {
      x: FORM_HORIZONTAL_INSET,
      y: FORM_TITLE_BAR_HEIGHT,
      width: Math.max(8, w - 2 * FORM_HORIZONTAL_INSET),
      height: Math.max(8, h - FORM_TITLE_BAR_HEIGHT - FORM_BOTTOM_RESERVE),
    }
  }
  return { x: 6, y: 6, width: Math.max(8, w - 12), height: Math.max(8, h - 12) }
}

export function getInnerClientBoundsForContainer(
  containerControlId: string,
  parentObjectRootG: Element | null,
): { x: number; y: number; width: number; height: number } {
  const id = containerControlId.replace(/^win\./, '')
  if (id === 'Form' && parentObjectRootG) {
    const outer = parentObjectRootG.querySelector(
      ':scope > rect[data-uisvg-part="form-frame"]',
    ) as SVGRectElement | null
    if (outer) return innerClientBoundsForFormOuterRect(outer)
  }
  return innerClientBoundsForContainerControlId(containerControlId)
}

/**
 * 画布用户坐标 → 父对象根 `<g>` 的局部坐标（仅解析父自身 `transform` 的 translate/scale）。
 */
export function globalXYToParentLocal(parentG: Element, gx: number, gy: number): { lx: number; ly: number } {
  const { tx, ty, sx, sy } = parseGTransform(parentG.getAttribute('transform') || '')
  const sxx = sx === 0 ? 1 : sx
  const syy = sy === 0 ? 1 : sy
  return { lx: (gx - tx) / sxx, ly: (gy - ty) / syy }
}

/**
 * 将局部坐标夹紧到容器客户区内，使 wxh 的控件完全落在内部。
 */
export function clampLocalPlacementToInner(
  containerControlId: string,
  lx: number,
  ly: number,
  itemW: number,
  itemH: number,
  parentObjectRootG?: Element | null,
): { x: number; y: number } {
  const inner = getInnerClientBoundsForContainer(containerControlId, parentObjectRootG ?? null)
  const w = Math.max(1, itemW)
  const h = Math.max(1, itemH)
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  return {
    x: clamp(lx, inner.x, Math.max(inner.x, inner.x + inner.width - w)),
    y: clamp(ly, inner.y, Math.max(inner.y, inner.y + inner.height - h)),
  }
}

/**
 * 在指定容器对象根下，为 wxh 的新子对象根找一个不重叠的局部 `translate` 左上角（与顶层 `findPlacementForNewItem` 同思路，范围限于客户区）。
 */
export function findPlacementForNewChildUnderParent(
  svgXml: string,
  parentDomId: string,
  itemW: number,
  itemH: number,
): { x: number; y: number } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const parent = doc.getElementById(parentDomId)
  if (!parent || parent.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(parent)) {
    return { x: 8, y: 28 }
  }
  const bundle = readUisvgBundleFromObjectRoot(parent)
  const containerId = bundle.uisvgLocalName || 'Panel'
  const inner = getInnerClientBoundsForContainer(containerId, parent)

  const occupied: OccupiedRect[] = []
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i] as Element
    if (c.tagName.toLowerCase() !== 'g') continue
    if (!c.getAttribute('id')?.trim()) continue
    if (!isUisvgObjectRootG(c)) continue
    const { tx, ty, sx, sy } = parseGTransform(c.getAttribute('transform') || '')
    const cb = readUisvgBundleFromObjectRoot(c)
    const cid = cb.uisvgLocalName.replace(/^win\./, '') || 'Panel'
    const csz = getWindowsControlPlacementSize(cid)
    const ax = Math.abs(sx) || 1
    const ay = Math.abs(sy) || 1
    occupied.push({
      x: tx,
      y: ty,
      width: Math.max(1, csz.w * ax),
      height: Math.max(1, csz.h * ay),
      domId: c.getAttribute('id') || undefined,
    })
  }

  const cw = inner.width
  const ch = inner.height
  const w = Math.min(Math.max(1, itemW), cw)
  const h = Math.min(Math.max(1, itemH), ch)
  const prefer = { x: 6, y: 6 }

  const relOccupied: OccupiedRect[] = occupied.map((o) => ({
    x: o.x - inner.x,
    y: o.y - inner.y,
    width: o.width,
    height: o.height,
    domId: o.domId,
  }))

  const found =
    findFirstNonOverlappingTopLeft(relOccupied, cw, ch, w, h, prefer, GRID) ??
    findFirstNonOverlappingTopLeft(relOccupied, cw, ch, w, h, { x: 0, y: 0 }, GRID)

  if (found) {
    return { x: inner.x + found.x, y: inner.y + found.y }
  }
  return { x: inner.x + 6, y: inner.y + 6 }
}
