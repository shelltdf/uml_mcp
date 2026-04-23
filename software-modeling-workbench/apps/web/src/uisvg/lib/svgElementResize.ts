import { isTopLevelLayerDomId } from './uisvgDocument'
import {
  FORM_BOTTOM_RESERVE,
  FORM_CAPTION_ICON_TOP_LOCAL,
  FORM_CAPTION_MIN_LINE_LOCAL_Y,
  FORM_HORIZONTAL_INSET,
  FORM_TITLE_BAR_HEIGHT,
  FORM_TITLE_TEXT_FONT_SIZE,
  layoutFormCaptionSlots,
  WIN_FLAT_BAR_CAPTION_BASELINE_Y,
  WIN_FLAT_BAR_CAPTION_FONT_SIZE,
  WIN_FLAT_BAR_CAPTION_PAD_X,
  TOOLSTRIP_ITEM_GAP,
  TOOLSTRIP_ITEM_HEIGHT,
  TOOLSTRIP_ITEM_INSET_X,
  TOOLSTRIP_ITEM_INSET_Y,
  TOOLSTRIP_ITEM_WIDTH,
  CONTEXT_MENU_FIRST_BASELINE_Y,
  CONTEXT_MENU_ROW_STEP,
  CONTEXT_MENU_TEXT_FONT_SIZE,
  CONTEXT_MENU_TEXT_PAD_X,
  GROUPBOX_TITLE_CHIP_H,
  GROUPBOX_TITLE_CHIP_W,
  GROUPBOX_TITLE_CHIP_X,
  GROUPBOX_TITLE_CHIP_Y,
  GROUPBOX_TITLE_TEXT_FONT_SIZE,
  GROUPBOX_TITLE_TEXT_X,
  GROUPBOX_TITLE_TEXT_Y,
  TABCONTROL_TAB1_HEAD_H,
  TABCONTROL_TAB1_HEAD_W,
  TABCONTROL_TAB1_HEAD_X,
  TABCONTROL_TAB1_HEAD_Y,
  TABCONTROL_TAB1_TEXT_X,
  TABCONTROL_TAB1_TEXT_Y,
  TABCONTROL_TAB2_HEAD_H,
  TABCONTROL_TAB2_HEAD_W,
  TABCONTROL_TAB2_HEAD_X,
  TABCONTROL_TAB2_HEAD_Y,
  TABCONTROL_TAB2_TEXT_X,
  TABCONTROL_TAB2_TEXT_Y,
  TABCONTROL_TAB_LABEL_FONT_SIZE,
  SPLITCONTAINER_RIGHT_PANE_X_OFFSET_FROM_LEFT_END,
  SPLITCONTAINER_SPLITTER_HEIGHT,
  SPLITCONTAINER_SPLITTER_LEFT_INSET_FROM_LEFT_END,
  SPLITCONTAINER_SPLITTER_WIDTH,
  FLOW_LAYOUT_ITEM_GAP,
  FLOW_LAYOUT_ITEM_HEIGHT,
  FLOW_LAYOUT_ITEM_INSET_X,
  FLOW_LAYOUT_ITEM_INSET_Y,
  FLOW_LAYOUT_ITEM_WIDTH,
  BUTTON_TEXT_FONT_SIZE,
  BUTTON_TEXT_OFFSET_X,
  BUTTON_TEXT_OFFSET_Y,
  MASKED_TEXTBOX_TEXT_FONT_SIZE,
  MASKED_TEXTBOX_TEXT_OFFSET_X,
  MASKED_TEXTBOX_TEXT_OFFSET_Y,
  RICH_TEXTBOX_TEXT_FONT_SIZE,
  RICH_TEXTBOX_TEXT_OFFSET_X,
  RICH_TEXTBOX_TEXT_OFFSET_Y,
  CHECKBOX_BOX_H,
  CHECKBOX_BOX_W,
  CHECKBOX_BOX_X,
  CHECKBOX_BOX_Y,
  CHECKBOX_CHECK_PATH_D,
  CHECKBOX_CHECK_STROKE_WIDTH,
  CHECKBOX_LABEL_FONT_SIZE,
  CHECKBOX_LABEL_X,
  CHECKBOX_LABEL_Y,
  RADIO_INNER_CX,
  RADIO_INNER_CY,
  RADIO_INNER_R,
  RADIO_LABEL_FONT_SIZE,
  RADIO_LABEL_X,
  RADIO_LABEL_Y,
  RADIO_OUTER_CX,
  RADIO_OUTER_CY,
  RADIO_OUTER_R,
  LISTBOX_FIRST_BASELINE_Y,
  LISTBOX_ITEM_FONT_SIZE,
  LISTBOX_ROW_STEP,
  LISTBOX_TEXT_PAD_X,
  LISTVIEW_COL_A_X,
  LISTVIEW_COL_B_HALF_WIDTH_OFFSET,
  LISTVIEW_HEADER_LINE_STROKE,
  LISTVIEW_HEADER_SEPARATOR_Y,
  LISTVIEW_HEADER_TEXT_BASELINE_Y,
  LISTVIEW_HEADER_TEXT_FONT_SIZE,
  LISTVIEW_LINE_MARGIN_LEFT,
  LISTVIEW_LINE_MARGIN_RIGHT,
  DATAGRIDVIEW_COL_FIRST_X,
  DATAGRIDVIEW_COL_STEP,
  DATAGRIDVIEW_DEFAULT_H,
  DATAGRIDVIEW_DEFAULT_W,
  DATAGRIDVIEW_GRID_STROKE,
  DATAGRIDVIEW_H_LINE_COUNT,
  DATAGRIDVIEW_H_LINE_STEP,
  DATAGRIDVIEW_HEADER_BOTTOM,
  DATAGRIDVIEW_V_LINE_COUNT,
  TREEVIEW_CHILD_BASELINE_Y,
  TREEVIEW_CHILD_TEXT_X,
  TREEVIEW_ROOT_BASELINE_Y,
  TREEVIEW_ROOT_TEXT_X,
  TREEVIEW_TEXT_FONT_SIZE,
  MONTH_CAL_LINE_MARGIN_LEFT,
  MONTH_CAL_LINE_MARGIN_RIGHT,
  MONTH_CAL_LINE_STROKE,
  MONTH_CAL_TITLE_BASELINE_Y,
  MONTH_CAL_TITLE_FONT_SIZE,
  MONTH_CAL_TITLE_PAD_X,
  MONTH_CAL_UNDERLINE_Y,
  TRACKBAR_DEFAULT_SLIDE_RANGE,
  TRACKBAR_DEFAULT_THUMB_LEFT,
  TRACKBAR_DEFAULT_FACE_H,
  TRACKBAR_FACE_FILL,
  TRACKBAR_GROOVE_H,
  TRACKBAR_GROOVE_Y_OFFSET,
  TRACKBAR_THUMB_FILL,
  TRACKBAR_THUMB_H,
  TRACKBAR_THUMB_W,
  TRACKBAR_TRACK_FILL,
  PROGRESS_BAR_DEFAULT_FILL_W,
  PROGRESS_BAR_DEFAULT_OUTER_W,
  PROGRESS_BAR_FILL_COLOR,
  PROGRESS_BAR_FILL_OPACITY,
  PROGRESS_BAR_INSET,
  HSCROLL_DEFAULT_FACE_H,
  HSCROLL_DEFAULT_SLIDE_RANGE,
  HSCROLL_DEFAULT_TRACK_W,
  HSCROLL_FACE_FILL,
  HSCROLL_THUMB_DEFAULT_H,
  HSCROLL_THUMB_DEFAULT_LEFT,
  HSCROLL_THUMB_DEFAULT_W,
  HSCROLL_THUMB_FILL,
  HSCROLL_TRACK_FILL,
  VSCROLL_DEFAULT_FACE_W,
  VSCROLL_DEFAULT_SLIDE_RANGE,
  VSCROLL_DEFAULT_TRACK_H,
  VSCROLL_DEFAULT_TRACK_W,
  VSCROLL_FACE_FILL,
  VSCROLL_THUMB_DEFAULT_H,
  VSCROLL_THUMB_DEFAULT_TOP,
  VSCROLL_THUMB_DEFAULT_W,
  VSCROLL_THUMB_FILL,
  VSCROLL_TRACK_FILL,
  CHECKED_LISTBOX_CHECK_H,
  CHECKED_LISTBOX_CHECK_ROW_STEP,
  CHECKED_LISTBOX_CHECK_W,
  CHECKED_LISTBOX_CHECK_X,
  CHECKED_LISTBOX_CHECK_Y0,
  CHECKED_LISTBOX_FIRST_BASELINE_Y,
  CHECKED_LISTBOX_LABEL_FONT_SIZE,
  CHECKED_LISTBOX_LABEL_ROW_STEP,
  CHECKED_LISTBOX_LABEL_X,
  COMBO_ARROW_CENTER_X_OFFSET_FROM_BTN_LEFT,
  COMBO_ARROW_HALF_HEIGHT_BOTTOM,
  COMBO_ARROW_HALF_HEIGHT_TOP,
  COMBO_ARROW_HALF_WIDTH,
  COMBO_DROPDOWN_HEIGHT,
  COMBO_DROPDOWN_MARGIN_RIGHT,
  COMBO_DROPDOWN_MARGIN_Y,
  COMBO_DROPDOWN_WIDTH,
  COMBO_TEXT_BASELINE_SMALL_H,
  COMBO_TEXT_FONT_SIZE,
  COMBO_TEXT_OFFSET_X,
  PROPERTY_GRID_FIRST_ROW_GAP_BELOW_TOOLBAR,
  PROPERTY_GRID_TEXT_FONT_SIZE,
  PROPERTY_GRID_TEXT_PAD_X,
  PROPERTY_GRID_TOOLBAR_HEIGHT,
  PROPERTY_GRID_TOOLBAR_TEXT_BASELINE_Y,
  PICTURE_BOX_TEXT_BASELINE_OFFSET_FROM_MID_Y,
  PICTURE_BOX_TEXT_FILL,
  PICTURE_BOX_TEXT_FONT_SIZE,
  NUMERIC_UPDOWN_SPIN_INNER_HEIGHT,
  NUMERIC_UPDOWN_SPIN_INSET_FROM_FACE_END,
  NUMERIC_UPDOWN_SPIN_MARGIN_Y,
  NUMERIC_UPDOWN_SPIN_WIDTH,
  NUMERIC_UPDOWN_TEXT_BASELINE_SMALL_H,
  NUMERIC_UPDOWN_TEXT_FONT_SIZE,
  NUMERIC_UPDOWN_TEXT_OFFSET_X,
} from './libraryPlacement'
import {
  findFirstUisvgSemanticChild,
  isUisvgObjectRootG,
  readUisvgBundleFromObjectRoot,
} from './uisvgMetaNode'

/** 八个缩放控制点：四边 + 四角 */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const MIN_SIZE = 4

function readElementBounds(el: SVGElement): { ox: number; oy: number; ow: number; oh: number } {
  const tag = el.tagName.toLowerCase()
  if (tag === 'rect') {
    return {
      ox: parseFloat(el.getAttribute('x') || '0'),
      oy: parseFloat(el.getAttribute('y') || '0'),
      ow: parseFloat(el.getAttribute('width') || '0'),
      oh: parseFloat(el.getAttribute('height') || '0'),
    }
  }
  if (tag === 'circle') {
    const cx = parseFloat(el.getAttribute('cx') || '0')
    const cy = parseFloat(el.getAttribute('cy') || '0')
    const r = parseFloat(el.getAttribute('r') || '0')
    return { ox: cx - r, oy: cy - r, ow: 2 * r, oh: 2 * r }
  }
  if (tag === 'ellipse') {
    const cx = parseFloat(el.getAttribute('cx') || '0')
    const cy = parseFloat(el.getAttribute('cy') || '0')
    const rx = parseFloat(el.getAttribute('rx') || '0')
    const ry = parseFloat(el.getAttribute('ry') || '0')
    return { ox: cx - rx, oy: cy - ry, ow: 2 * rx, oh: 2 * ry }
  }
  return { ox: 0, oy: 0, ow: 0, oh: 0 }
}

/**
 * 主边界从 oldB 变为 newB 时，按比例更新容器 `group` 内除 `primary` 外的所有子树几何，
 * 使标题栏、嵌套控件等与外框一起变化（与主边界同一坐标系的一层用线性映射；更深一层用 sx/sy 缩放局部坐标）。
 */
function scaleGroupInteriorAfterPrimaryBoundsChange(
  group: SVGElement,
  primary: SVGElement,
  oldB: { ox: number; oy: number; ow: number; oh: number },
  newB: { nx: number; ny: number; nw: number; nh: number },
): void {
  const { ox, oy, ow, oh } = oldB
  const { nx, ny, nw, nh } = newB
  if (ow <= 0 || oh <= 0) return
  const sx = nw / ow
  const sy = nh / oh
  const mapX = (x: number) => nx + (x - ox) * sx
  const mapY = (y: number) => ny + (y - oy) * sy
  const fsScale = Math.sqrt(Math.max(1e-6, sx * sy))

  function scaleGroupTransformTopLevel(g: SVGElement): void {
    const t = (g.getAttribute('transform') || '').trim()
    const re = /translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/
    const m = t.match(re)
    if (!m) return
    const tx = parseFloat(m[1])
    const ty = parseFloat(m[2])
    const ntx = mapX(tx)
    const nty = mapY(ty)
    const next = t.replace(re, `translate(${ntx} ${nty})`)
    g.setAttribute('transform', next)
  }

  function scaleGroupTransformNested(g: SVGElement): void {
    const t = (g.getAttribute('transform') || '').trim()
    const re = /translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/
    const m = t.match(re)
    if (!m) return
    const tx = parseFloat(m[1]) * sx
    const ty = parseFloat(m[2]) * sy
    const next = t.replace(re, `translate(${tx} ${ty})`)
    g.setAttribute('transform', next)
  }

  function scaleLeafTopLevel(node: SVGElement): void {
    const tag = node.tagName.toLowerCase()
    if (tag === 'rect') {
      const x = parseFloat(node.getAttribute('x') || '0')
      const y = parseFloat(node.getAttribute('y') || '0')
      const w = parseFloat(node.getAttribute('width') || '0')
      const h = parseFloat(node.getAttribute('height') || '0')
      node.setAttribute('x', String(mapX(x)))
      node.setAttribute('y', String(mapY(y)))
      node.setAttribute('width', String(Math.max(MIN_SIZE, w * sx)))
      node.setAttribute('height', String(Math.max(MIN_SIZE, h * sy)))
      return
    }
    if (tag === 'circle') {
      const cx = parseFloat(node.getAttribute('cx') || '0')
      const cy = parseFloat(node.getAttribute('cy') || '0')
      const r = parseFloat(node.getAttribute('r') || '0')
      const nr = Math.max(MIN_SIZE / 2, r * Math.min(sx, sy))
      node.setAttribute('cx', String(mapX(cx)))
      node.setAttribute('cy', String(mapY(cy)))
      node.setAttribute('r', String(nr))
      return
    }
    if (tag === 'ellipse') {
      const cx = parseFloat(node.getAttribute('cx') || '0')
      const cy = parseFloat(node.getAttribute('cy') || '0')
      const rx = parseFloat(node.getAttribute('rx') || '0')
      const ry = parseFloat(node.getAttribute('ry') || '0')
      node.setAttribute('cx', String(mapX(cx)))
      node.setAttribute('cy', String(mapY(cy)))
      node.setAttribute('rx', String(Math.max(MIN_SIZE / 2, rx * sx)))
      node.setAttribute('ry', String(Math.max(MIN_SIZE / 2, ry * sy)))
      return
    }
    if (tag === 'line') {
      const x1 = parseFloat(node.getAttribute('x1') || '0')
      const y1 = parseFloat(node.getAttribute('y1') || '0')
      const x2 = parseFloat(node.getAttribute('x2') || '0')
      const y2 = parseFloat(node.getAttribute('y2') || '0')
      node.setAttribute('x1', String(mapX(x1)))
      node.setAttribute('y1', String(mapY(y1)))
      node.setAttribute('x2', String(mapX(x2)))
      node.setAttribute('y2', String(mapY(y2)))
      return
    }
    if (tag === 'text') {
      const x = parseFloat(node.getAttribute('x') || '0')
      const y = parseFloat(node.getAttribute('y') || '0')
      node.setAttribute('x', String(mapX(x)))
      node.setAttribute('y', String(mapY(y)))
      const fs = node.getAttribute('font-size')
      if (fs) {
        const n = parseFloat(fs)
        if (Number.isFinite(n)) node.setAttribute('font-size', String(n * fsScale))
      }
      return
    }
  }

  function scaleLeafNested(node: SVGElement): void {
    const tag = node.tagName.toLowerCase()
    if (tag === 'rect') {
      const x = parseFloat(node.getAttribute('x') || '0')
      const y = parseFloat(node.getAttribute('y') || '0')
      const w = parseFloat(node.getAttribute('width') || '0')
      const h = parseFloat(node.getAttribute('height') || '0')
      node.setAttribute('x', String(x * sx))
      node.setAttribute('y', String(y * sy))
      node.setAttribute('width', String(Math.max(MIN_SIZE, w * sx)))
      node.setAttribute('height', String(Math.max(MIN_SIZE, h * sy)))
      return
    }
    if (tag === 'circle') {
      const cx = parseFloat(node.getAttribute('cx') || '0')
      const cy = parseFloat(node.getAttribute('cy') || '0')
      const r = parseFloat(node.getAttribute('r') || '0')
      const nr = Math.max(MIN_SIZE / 2, r * Math.min(sx, sy))
      node.setAttribute('cx', String(cx * sx))
      node.setAttribute('cy', String(cy * sy))
      node.setAttribute('r', String(nr))
      return
    }
    if (tag === 'ellipse') {
      const cx = parseFloat(node.getAttribute('cx') || '0')
      const cy = parseFloat(node.getAttribute('cy') || '0')
      const rx = parseFloat(node.getAttribute('rx') || '0')
      const ry = parseFloat(node.getAttribute('ry') || '0')
      node.setAttribute('cx', String(cx * sx))
      node.setAttribute('cy', String(cy * sy))
      node.setAttribute('rx', String(Math.max(MIN_SIZE / 2, rx * sx)))
      node.setAttribute('ry', String(Math.max(MIN_SIZE / 2, ry * sy)))
      return
    }
    if (tag === 'line') {
      node.setAttribute('x1', String(parseFloat(node.getAttribute('x1') || '0') * sx))
      node.setAttribute('y1', String(parseFloat(node.getAttribute('y1') || '0') * sy))
      node.setAttribute('x2', String(parseFloat(node.getAttribute('x2') || '0') * sx))
      node.setAttribute('y2', String(parseFloat(node.getAttribute('y2') || '0') * sy))
      return
    }
    if (tag === 'text') {
      const x = parseFloat(node.getAttribute('x') || '0')
      const y = parseFloat(node.getAttribute('y') || '0')
      node.setAttribute('x', String(x * sx))
      node.setAttribute('y', String(y * sy))
      const fs = node.getAttribute('font-size')
      if (fs) {
        const n = parseFloat(fs)
        if (Number.isFinite(n)) node.setAttribute('font-size', String(n * fsScale))
      }
    }
  }

  function walk(node: Element, depth: number): void {
    if (node === primary) return
    const tag = node.tagName.toLowerCase()
    if (tag === 'g') {
      if (depth === 0) scaleGroupTransformTopLevel(node as SVGElement)
      else scaleGroupTransformNested(node as SVGElement)
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i] as Element, depth + 1)
      }
      return
    }
    if (depth === 0) scaleLeafTopLevel(node as SVGElement)
    else scaleLeafNested(node as SVGElement)
  }

  for (let i = 0; i < group.children.length; i++) {
    walk(group.children[i] as Element, 0)
  }
}

function clientRectFromOuterBox(outer: { ox: number; oy: number; ow: number; oh: number }): {
  x: number
  y: number
  w: number
  h: number
} {
  return {
    x: outer.ox + FORM_HORIZONTAL_INSET,
    y: outer.oy + FORM_TITLE_BAR_HEIGHT,
    w: Math.max(8, outer.ow - 2 * FORM_HORIZONTAL_INSET),
    h: Math.max(8, outer.oh - FORM_TITLE_BAR_HEIGHT - FORM_BOTTOM_RESERVE),
  }
}

function scaleGroupTransformNestedUniform(g: SVGElement, sx: number, sy: number): void {
  const t = (g.getAttribute('transform') || '').trim()
  const re = /translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/
  const m = t.match(re)
  if (!m) return
  const tx = parseFloat(m[1]) * sx
  const ty = parseFloat(m[2]) * sy
  const next = t.replace(re, `translate(${tx} ${ty})`)
  g.setAttribute('transform', next)
}

function scaleLeafNestedUniform(node: SVGElement, sx: number, sy: number, fsScale: number): void {
  const tag = node.tagName.toLowerCase()
  if (tag === 'rect') {
    const x = parseFloat(node.getAttribute('x') || '0')
    const y = parseFloat(node.getAttribute('y') || '0')
    const w = parseFloat(node.getAttribute('width') || '0')
    const h = parseFloat(node.getAttribute('height') || '0')
    node.setAttribute('x', String(x * sx))
    node.setAttribute('y', String(y * sy))
    node.setAttribute('width', String(Math.max(MIN_SIZE, w * sx)))
    node.setAttribute('height', String(Math.max(MIN_SIZE, h * sy)))
    return
  }
  if (tag === 'circle') {
    const cx = parseFloat(node.getAttribute('cx') || '0')
    const cy = parseFloat(node.getAttribute('cy') || '0')
    const r = parseFloat(node.getAttribute('r') || '0')
    const nr = Math.max(MIN_SIZE / 2, r * Math.min(sx, sy))
    node.setAttribute('cx', String(cx * sx))
    node.setAttribute('cy', String(cy * sy))
    node.setAttribute('r', String(nr))
    return
  }
  if (tag === 'ellipse') {
    const cx = parseFloat(node.getAttribute('cx') || '0')
    const cy = parseFloat(node.getAttribute('cy') || '0')
    const rx = parseFloat(node.getAttribute('rx') || '0')
    const ry = parseFloat(node.getAttribute('ry') || '0')
    node.setAttribute('cx', String(cx * sx))
    node.setAttribute('cy', String(cy * sy))
    node.setAttribute('rx', String(Math.max(MIN_SIZE / 2, rx * sx)))
    node.setAttribute('ry', String(Math.max(MIN_SIZE / 2, ry * sy)))
    return
  }
  if (tag === 'line') {
    node.setAttribute('x1', String(parseFloat(node.getAttribute('x1') || '0') * sx))
    node.setAttribute('y1', String(parseFloat(node.getAttribute('y1') || '0') * sy))
    node.setAttribute('x2', String(parseFloat(node.getAttribute('x2') || '0') * sx))
    node.setAttribute('y2', String(parseFloat(node.getAttribute('y2') || '0') * sy))
    return
  }
  if (tag === 'text') {
    const x = parseFloat(node.getAttribute('x') || '0')
    const y = parseFloat(node.getAttribute('y') || '0')
    node.setAttribute('x', String(x * sx))
    node.setAttribute('y', String(y * sy))
    const fs = node.getAttribute('font-size')
    if (fs) {
      const n = parseFloat(fs)
      if (Number.isFinite(n)) node.setAttribute('font-size', String(n * fsScale))
    }
  }
}

function scaleUisvgObjectRootInteriorUniform(rootG: SVGElement, sx: number, sy: number): void {
  const fsScale = Math.sqrt(Math.max(1e-6, sx * sy))
  function walk(node: Element, depth: number): void {
    const tag = node.tagName.toLowerCase()
    if (tag === 'g') {
      if (depth > 0) scaleGroupTransformNestedUniform(node as SVGElement, sx, sy)
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i] as Element, depth + 1)
      }
      return
    }
    scaleLeafNestedUniform(node as SVGElement, sx, sy, fsScale)
  }
  for (let i = 0; i < rootG.children.length; i++) {
    walk(rootG.children[i] as Element, 1)
  }
}

function scaleFormNestedObjectRootsByClientBoundsChange(
  group: SVGElement,
  oldOuter: { ox: number; oy: number; ow: number; oh: number },
  newOuter: { ox: number; oy: number; ow: number; oh: number },
): void {
  const oc = clientRectFromOuterBox(oldOuter)
  const nc = clientRectFromOuterBox(newOuter)
  if (oc.w <= 0 || oc.h <= 0) return
  const sx = nc.w / oc.w
  const sy = nc.h / oc.h

  for (let i = 0; i < group.children.length; i++) {
    const node = group.children[i] as Element
    if (node.tagName.toLowerCase() !== 'g') continue
    if (!node.getAttribute('id')?.trim()) continue
    if (!isUisvgObjectRootG(node)) continue

    const t = (node.getAttribute('transform') || '').trim()
    const re = /translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/
    const m = t.match(re)
    if (m) {
      const tx = parseFloat(m[1])
      const ty = parseFloat(m[2])
      const ntx = nc.x + (tx - oc.x) * sx
      const nty = nc.y + (ty - oc.y) * sy
      const next = t.replace(re, `translate(${ntx} ${nty})`)
      node.setAttribute('transform', next)
    }
    scaleUisvgObjectRootInteriorUniform(node as SVGElement, sx, sy)
  }
}

/**
 * 是否应按「WinForm 窗体」做标题栏/客户区专用重排（不依赖 bundle：内联 SVG 等环境下
 * `uisvg:form` 子节点可能无法被识别，误读成 `Frame` 时会错误地走整组几何缩放）。
 */
function isFormObjectRootWithResizeChrome(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  return !!(
    group.querySelector(':scope > rect[data-uisvg-part="form-frame"]') &&
    group.querySelector(':scope > rect[data-uisvg-part="form-titlebar"]')
  )
}

/**
 * 按当前 `form-frame` 外接矩形重排标题栏与三键等（可修复先前误缩放造成的 chrome 损坏）。
 * 在开始拖拽缩放柄时调用一次即可。
 */
export function ensureFormResizeChromeSynced(group: SVGElement): void {
  if (!isFormObjectRootWithResizeChrome(group)) return
  const frame = group.querySelector(':scope > rect[data-uisvg-part="form-frame"]') as SVGRectElement | null
  if (!frame) return
  relayoutFormResizeChrome(group, readElementBounds(frame))
}

function winFlatBarKindLower(group: SVGElement): string {
  return readUisvgBundleFromObjectRoot(group).uisvgLocalName.replace(/^win\./, '').trim().toLowerCase()
}

/**
 * MenuStrip / StatusStrip：底图 rect 随缩放变化，标签文字保持固定字号与顶行基线（不跟整组非线性缩放）。
 */
function isWinFlatBarResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="win-bar-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  const isStrip =
    kind === 'menustrip' ||
    kind === 'statusstrip' ||
    sem === 'menustrip' ||
    sem === 'statusstrip'
  if (!isStrip) return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && texts.length === 1
}

function getWinBarFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="win-bar-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getWinBarCaptionText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="win-bar-caption"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutWinFlatBarChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const cap = getWinBarCaptionText(group)
  if (!cap) return
  const { ox, oy } = b
  cap.setAttribute('x', String(ox + WIN_FLAT_BAR_CAPTION_PAD_X))
  cap.setAttribute('y', String(oy + WIN_FLAT_BAR_CAPTION_BASELINE_Y))
  cap.setAttribute('font-size', WIN_FLAT_BAR_CAPTION_FONT_SIZE)
}

/** 修复 MenuStrip / StatusStrip 标签被误缩放后的几何 */
export function ensureWinFlatBarResizeSynced(group: SVGElement): void {
  if (!isWinFlatBarResizeGroup(group)) return
  const face = getWinBarFaceRect(group)
  if (!face) return
  relayoutWinFlatBarChrome(group, readElementBounds(face))
}

function isToolStripResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="toolstrip-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  const isTs = kind === 'toolstrip' || sem === 'toolstrip'
  if (!isTs) return false
  const rects = group.querySelectorAll(':scope > rect')
  return rects.length >= 2
}

function getToolStripFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="toolstrip-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getToolStripItemRects(group: SVGElement): SVGRectElement[] {
  const marked = [...group.querySelectorAll(':scope > rect[data-uisvg-part="toolstrip-item"]')]
  if (marked.length) return marked as SVGRectElement[]
  const all = [...group.querySelectorAll(':scope > rect')] as SVGRectElement[]
  if (all.length < 2) return []
  return all.slice(1)
}

function relayoutToolStripChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getToolStripFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  let x = ox + TOOLSTRIP_ITEM_INSET_X
  const iy = oy + TOOLSTRIP_ITEM_INSET_Y
  const items = getToolStripItemRects(group)
  for (const r of items) {
    r.setAttribute('x', String(x))
    r.setAttribute('y', String(iy))
    r.setAttribute('width', String(TOOLSTRIP_ITEM_WIDTH))
    r.setAttribute('height', String(TOOLSTRIP_ITEM_HEIGHT))
    x += TOOLSTRIP_ITEM_WIDTH + TOOLSTRIP_ITEM_GAP
  }
}

export function ensureToolStripResizeSynced(group: SVGElement): void {
  if (!isToolStripResizeGroup(group)) return
  const face = getToolStripFaceRect(group)
  if (!face) return
  relayoutToolStripChrome(group, readElementBounds(face))
}

function isContextMenuStripResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="contextmenu-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  const isCtx = kind === 'contextmenustrip' || sem === 'contextmenustrip'
  if (!isCtx) return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && texts.length >= 1
}

function getContextMenuFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="contextmenu-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getContextMenuItemTexts(group: SVGElement): SVGTextElement[] {
  const marked = [...group.querySelectorAll(':scope > text[data-uisvg-part="contextmenu-item"]')]
  if (marked.length) return marked as SVGTextElement[]
  return [...group.querySelectorAll(':scope > text')] as SVGTextElement[]
}

function relayoutContextMenuStripChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getContextMenuFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const texts = getContextMenuItemTexts(group)
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i]
    t.setAttribute('x', String(ox + CONTEXT_MENU_TEXT_PAD_X))
    t.setAttribute(
      'y',
      String(oy + CONTEXT_MENU_FIRST_BASELINE_Y + i * CONTEXT_MENU_ROW_STEP),
    )
    t.setAttribute('font-size', CONTEXT_MENU_TEXT_FONT_SIZE)
  }
}

export function ensureContextMenuStripResizeSynced(group: SVGElement): void {
  if (!isContextMenuStripResizeGroup(group)) return
  const face = getContextMenuFaceRect(group)
  if (!face) return
  relayoutContextMenuStripChrome(group, readElementBounds(face))
}

function isGroupBoxResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="groupbox-border"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  const isGb = kind === 'groupbox' || sem === 'groupbox'
  if (!isGb) return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 2 && texts.length === 1
}

function getGroupBoxBorderRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="groupbox-border"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getGroupBoxTitleChipRect(group: SVGElement): SVGRectElement | null {
  const marked = group.querySelector(':scope > rect[data-uisvg-part="groupbox-title-chip"]')
  if (marked) return marked as SVGRectElement
  const rects = [...group.querySelectorAll(':scope > rect')] as SVGRectElement[]
  return rects.length >= 2 ? rects[1] : null
}

function getGroupBoxTitleTextEl(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="groupbox-title-text"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutGroupBoxChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const border = getGroupBoxBorderRect(group)
  if (border) {
    border.setAttribute('x', String(ox))
    border.setAttribute('y', String(oy))
    border.setAttribute('width', String(ow))
    border.setAttribute('height', String(oh))
  }
  const chip = getGroupBoxTitleChipRect(group)
  if (chip) {
    chip.setAttribute('x', String(GROUPBOX_TITLE_CHIP_X))
    chip.setAttribute('y', String(GROUPBOX_TITLE_CHIP_Y))
    chip.setAttribute('width', String(GROUPBOX_TITLE_CHIP_W))
    chip.setAttribute('height', String(GROUPBOX_TITLE_CHIP_H))
  }
  const te = getGroupBoxTitleTextEl(group)
  if (te) {
    te.setAttribute('x', String(GROUPBOX_TITLE_TEXT_X))
    te.setAttribute('y', String(GROUPBOX_TITLE_TEXT_Y))
    te.setAttribute('font-size', GROUPBOX_TITLE_TEXT_FONT_SIZE)
  }
}

export function ensureGroupBoxResizeSynced(group: SVGElement): void {
  if (!isGroupBoxResizeGroup(group)) return
  const border = getGroupBoxBorderRect(group)
  if (!border) return
  relayoutGroupBoxChrome(group, readElementBounds(border))
}

function isTabControlResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="tabcontrol-client"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  const isTc = kind === 'tabcontrol' || sem === 'tabcontrol'
  if (!isTc) return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 3 && texts.length === 2
}

function getTabControlClientRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="tabcontrol-client"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function relayoutTabControlChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const client = getTabControlClientRect(group)
  if (client) {
    client.setAttribute('x', String(ox))
    client.setAttribute('y', String(oy))
    client.setAttribute('width', String(ow))
    client.setAttribute('height', String(oh))
  }

  const t1h =
    (group.querySelector(':scope > rect[data-uisvg-part="tabcontrol-tab1-head"]') as SVGRectElement | null) ??
    ([...group.querySelectorAll(':scope > rect')][1] as SVGRectElement | undefined) ??
    null
  if (t1h) {
    t1h.setAttribute('x', String(TABCONTROL_TAB1_HEAD_X))
    t1h.setAttribute('y', String(TABCONTROL_TAB1_HEAD_Y))
    t1h.setAttribute('width', String(TABCONTROL_TAB1_HEAD_W))
    t1h.setAttribute('height', String(TABCONTROL_TAB1_HEAD_H))
  }

  const t1t =
    (group.querySelector(':scope > text[data-uisvg-part="tabcontrol-tab1-text"]') as SVGTextElement | null) ??
    ([...group.querySelectorAll(':scope > text')][0] as SVGTextElement | undefined) ??
    null
  if (t1t) {
    t1t.setAttribute('x', String(TABCONTROL_TAB1_TEXT_X))
    t1t.setAttribute('y', String(TABCONTROL_TAB1_TEXT_Y))
    t1t.setAttribute('font-size', TABCONTROL_TAB_LABEL_FONT_SIZE)
  }

  const t2h =
    (group.querySelector(':scope > rect[data-uisvg-part="tabcontrol-tab2-head"]') as SVGRectElement | null) ??
    ([...group.querySelectorAll(':scope > rect')][2] as SVGRectElement | undefined) ??
    null
  if (t2h) {
    t2h.setAttribute('x', String(TABCONTROL_TAB2_HEAD_X))
    t2h.setAttribute('y', String(TABCONTROL_TAB2_HEAD_Y))
    t2h.setAttribute('width', String(TABCONTROL_TAB2_HEAD_W))
    t2h.setAttribute('height', String(TABCONTROL_TAB2_HEAD_H))
  }

  const t2t =
    (group.querySelector(':scope > text[data-uisvg-part="tabcontrol-tab2-text"]') as SVGTextElement | null) ??
    ([...group.querySelectorAll(':scope > text')][1] as SVGTextElement | undefined) ??
    null
  if (t2t) {
    t2t.setAttribute('x', String(TABCONTROL_TAB2_TEXT_X))
    t2t.setAttribute('y', String(TABCONTROL_TAB2_TEXT_Y))
    t2t.setAttribute('font-size', TABCONTROL_TAB_LABEL_FONT_SIZE)
  }
}

export function ensureTabControlResizeSynced(group: SVGElement): void {
  if (!isTabControlResizeGroup(group)) return
  const client = getTabControlClientRect(group)
  if (!client) return
  relayoutTabControlChrome(group, readElementBounds(client))
}

/** 首 rect 是否带虚线描边（FlowLayout 外框；部分序列化会写成 strokedasharray） */
function rectHasFlowPanelDashStroke(el: SVGRectElement): boolean {
  return !!(
    el.getAttribute('stroke-dasharray')?.trim() || el.getAttribute('strokedasharray')?.trim()
  )
}

function isSplitContainerResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="splitcontainer-left-pane"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'splitcontainer' && sem !== 'splitcontainer') return false
  const rects = group.querySelectorAll(':scope > rect')
  if (rects.length !== 3) return false
  if (group.querySelectorAll(':scope > text').length !== 0) return false
  const first = rects[0] as SVGRectElement
  if (rectHasFlowPanelDashStroke(first)) return false
  return true
}

function getSplitContainerLeftPane(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="splitcontainer-left-pane"]') ??
    ([...group.querySelectorAll(':scope > rect')][0] as SVGRectElement | undefined) ??
    null) as SVGRectElement | null
}

function getSplitContainerRightPane(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="splitcontainer-right-pane"]') as SVGRectElement | null) ??
    (([...group.querySelectorAll(':scope > rect')][1] as SVGRectElement | undefined) ?? null)
}

function getSplitContainerSplitter(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="splitcontainer-splitter"]') as SVGRectElement | null) ??
    (([...group.querySelectorAll(':scope > rect')][2] as SVGRectElement | undefined) ?? null)
}

/**
 * 左窗格为缩放主目标；右窗格与默认模板同宽（对称）；分割条宽度固定并垂直居中。
 */
function relayoutSplitContainerChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const left = getSplitContainerLeftPane(group)
  if (left) {
    left.setAttribute('x', String(ox))
    left.setAttribute('y', String(oy))
    left.setAttribute('width', String(ow))
    left.setAttribute('height', String(oh))
  }
  const leftEnd = ox + ow
  const splitX = leftEnd - SPLITCONTAINER_SPLITTER_LEFT_INSET_FROM_LEFT_END
  const splitY = oy + Math.max(0, (oh - SPLITCONTAINER_SPLITTER_HEIGHT) / 2)
  const spl = getSplitContainerSplitter(group)
  if (spl) {
    spl.setAttribute('x', String(splitX))
    spl.setAttribute('y', String(splitY))
    spl.setAttribute('width', String(SPLITCONTAINER_SPLITTER_WIDTH))
    spl.setAttribute('height', String(SPLITCONTAINER_SPLITTER_HEIGHT))
  }
  const right = getSplitContainerRightPane(group)
  if (right) {
    const rx = ox + ow + SPLITCONTAINER_RIGHT_PANE_X_OFFSET_FROM_LEFT_END
    right.setAttribute('x', String(rx))
    right.setAttribute('y', String(oy))
    right.setAttribute('width', String(Math.max(4, ow)))
    right.setAttribute('height', String(oh))
  }
}

export function ensureSplitContainerResizeSynced(group: SVGElement): void {
  if (!isSplitContainerResizeGroup(group)) return
  const left = getSplitContainerLeftPane(group)
  if (!left) return
  relayoutSplitContainerChrome(group, readElementBounds(left))
}

function isFlowLayoutPanelResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="flowlayout-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'flowlayoutpanel' && sem !== 'flowlayoutpanel') return false
  const rects = group.querySelectorAll(':scope > rect')
  if (rects.length !== 3) return false
  if (group.querySelectorAll(':scope > text').length !== 0) return false
  return rectHasFlowPanelDashStroke(rects[0] as SVGRectElement)
}

function getFlowLayoutFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="flowlayout-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getFlowLayoutItemRects(group: SVGElement): SVGRectElement[] {
  const marked = [...group.querySelectorAll(':scope > rect[data-uisvg-part="flowlayout-item"]')]
  if (marked.length) return marked as SVGRectElement[]
  const all = [...group.querySelectorAll(':scope > rect')] as SVGRectElement[]
  return all.length >= 2 ? all.slice(1) : []
}

function relayoutFlowLayoutPanelChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getFlowLayoutFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  let x = ox + FLOW_LAYOUT_ITEM_INSET_X
  const iy = oy + FLOW_LAYOUT_ITEM_INSET_Y
  for (const r of getFlowLayoutItemRects(group)) {
    r.setAttribute('x', String(x))
    r.setAttribute('y', String(iy))
    r.setAttribute('width', String(FLOW_LAYOUT_ITEM_WIDTH))
    r.setAttribute('height', String(FLOW_LAYOUT_ITEM_HEIGHT))
    x += FLOW_LAYOUT_ITEM_WIDTH + FLOW_LAYOUT_ITEM_GAP
  }
}

export function ensureFlowLayoutPanelResizeSynced(group: SVGElement): void {
  if (!isFlowLayoutPanelResizeGroup(group)) return
  const face = getFlowLayoutFaceRect(group)
  if (!face) return
  relayoutFlowLayoutPanelChrome(group, readElementBounds(face))
}

function isButtonResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="button-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'button' && sem !== 'button') return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  if (rects.length !== 1 || texts.length !== 1) return false
  const rx = (rects[0] as SVGRectElement).getAttribute('rx')?.trim()
  return !!rx
}

function getButtonFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="button-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getButtonCaptionText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="button-caption"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutButtonChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getButtonFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const cap = getButtonCaptionText(group)
  if (cap) {
    cap.setAttribute('x', String(ox + BUTTON_TEXT_OFFSET_X))
    cap.setAttribute('y', String(oy + BUTTON_TEXT_OFFSET_Y))
    cap.setAttribute('font-size', BUTTON_TEXT_FONT_SIZE)
  }
}

export function ensureButtonResizeSynced(group: SVGElement): void {
  if (!isButtonResizeGroup(group)) return
  const face = getButtonFaceRect(group)
  if (!face) return
  relayoutButtonChrome(group, readElementBounds(face))
}

function isMaskedTextBoxResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="maskedtextbox-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'maskedtextbox' && sem !== 'maskedtextbox') return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && texts.length === 1
}

function getMaskedTextBoxFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="maskedtextbox-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getMaskedTextBoxFieldText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="maskedtextbox-text"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutMaskedTextBoxChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getMaskedTextBoxFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const te = getMaskedTextBoxFieldText(group)
  if (te) {
    te.setAttribute('x', String(ox + MASKED_TEXTBOX_TEXT_OFFSET_X))
    te.setAttribute('y', String(oy + MASKED_TEXTBOX_TEXT_OFFSET_Y))
    te.setAttribute('font-size', MASKED_TEXTBOX_TEXT_FONT_SIZE)
  }
}

export function ensureMaskedTextBoxResizeSynced(group: SVGElement): void {
  if (!isMaskedTextBoxResizeGroup(group)) return
  const face = getMaskedTextBoxFaceRect(group)
  if (!face) return
  relayoutMaskedTextBoxChrome(group, readElementBounds(face))
}

function isDateTimePickerResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="datetimepicker-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'datetimepicker' && sem !== 'datetimepicker') return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && texts.length === 1
}

function getDateTimePickerFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="datetimepicker-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getDateTimePickerFieldText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="datetimepicker-text"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutDateTimePickerChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getDateTimePickerFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const te = getDateTimePickerFieldText(group)
  if (te) {
    te.setAttribute('x', String(ox + MASKED_TEXTBOX_TEXT_OFFSET_X))
    const textRoom = Math.max(0, oh - 4)
    const textY = oy + Math.min(MASKED_TEXTBOX_TEXT_OFFSET_Y, textRoom)
    te.setAttribute('y', String(textY))
    te.setAttribute('font-size', MASKED_TEXTBOX_TEXT_FONT_SIZE)
  }
}

export function ensureDateTimePickerResizeSynced(group: SVGElement): void {
  if (!isDateTimePickerResizeGroup(group)) return
  const face = getDateTimePickerFaceRect(group)
  if (!face) return
  relayoutDateTimePickerChrome(group, readElementBounds(face))
}

function isRichTextBoxResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="richtextbox-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'richtextbox' && sem !== 'richtextbox') return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && texts.length === 1
}

function getRichTextBoxFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="richtextbox-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getRichTextBoxFieldText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="richtextbox-text"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutRichTextBoxChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getRichTextBoxFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const te = getRichTextBoxFieldText(group)
  if (te) {
    te.setAttribute('x', String(ox + RICH_TEXTBOX_TEXT_OFFSET_X))
    te.setAttribute('y', String(oy + RICH_TEXTBOX_TEXT_OFFSET_Y))
    te.setAttribute('font-size', RICH_TEXTBOX_TEXT_FONT_SIZE)
  }
}

export function ensureRichTextBoxResizeSynced(group: SVGElement): void {
  if (!isRichTextBoxResizeGroup(group)) return
  const face = getRichTextBoxFaceRect(group)
  if (!face) return
  relayoutRichTextBoxChrome(group, readElementBounds(face))
}

function isListBoxResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="listbox-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'listbox' && sem !== 'listbox') return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && texts.length >= 1
}

function getListBoxFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="listbox-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getListBoxItemTexts(group: SVGElement): SVGTextElement[] {
  const tagged = group.querySelectorAll(':scope > text[data-uisvg-part="listbox-item"]')
  if (tagged.length > 0) return [...tagged] as SVGTextElement[]
  return [...group.querySelectorAll(':scope > text')] as SVGTextElement[]
}

function relayoutListBoxChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getListBoxFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const items = getListBoxItemTexts(group)
  for (let i = 0; i < items.length; i++) {
    const te = items[i]
    te.setAttribute('x', String(ox + LISTBOX_TEXT_PAD_X))
    te.setAttribute('y', String(oy + LISTBOX_FIRST_BASELINE_Y + i * LISTBOX_ROW_STEP))
    te.setAttribute('font-size', LISTBOX_ITEM_FONT_SIZE)
  }
}

export function ensureListBoxResizeSynced(group: SVGElement): void {
  if (!isListBoxResizeGroup(group)) return
  const face = getListBoxFaceRect(group)
  if (!face) return
  relayoutListBoxChrome(group, readElementBounds(face))
}

function isListViewResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="listview-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'listview' && sem !== 'listview') return false
  const rects = group.querySelectorAll(':scope > rect')
  const lines = group.querySelectorAll(':scope > line')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && lines.length === 1 && texts.length === 2
}

function getListViewFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="listview-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getListViewHeaderLine(group: SVGElement): SVGLineElement | null {
  return (group.querySelector(':scope > line[data-uisvg-part="listview-header-line"]') ??
    group.querySelector(':scope > line')) as SVGLineElement | null
}

function getListViewColAText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="listview-col-a"]') ??
    ([...group.querySelectorAll(':scope > text')][0] as SVGTextElement | undefined) ??
    null) as SVGTextElement | null
}

function getListViewColBText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="listview-col-b"]') ??
    ([...group.querySelectorAll(':scope > text')][1] as SVGTextElement | undefined) ??
    null) as SVGTextElement | null
}

function relayoutListViewChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getListViewFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const sepY = oy + LISTVIEW_HEADER_SEPARATOR_Y
  const x1 = ox + LISTVIEW_LINE_MARGIN_LEFT
  const x2Raw = ox + ow - LISTVIEW_LINE_MARGIN_RIGHT
  const x2 = Math.max(x1 + 1, x2Raw)
  const ln = getListViewHeaderLine(group)
  if (ln) {
    ln.setAttribute('x1', String(x1))
    ln.setAttribute('y1', String(sepY))
    ln.setAttribute('x2', String(x2))
    ln.setAttribute('y2', String(sepY))
    ln.setAttribute('stroke', LISTVIEW_HEADER_LINE_STROKE)
  }
  const baseY = oy + LISTVIEW_HEADER_TEXT_BASELINE_Y
  const colBx = ox + Math.floor(ow / 2) + LISTVIEW_COL_B_HALF_WIDTH_OFFSET
  const ta = getListViewColAText(group)
  if (ta) {
    ta.setAttribute('x', String(ox + LISTVIEW_COL_A_X))
    ta.setAttribute('y', String(baseY))
    ta.setAttribute('font-size', LISTVIEW_HEADER_TEXT_FONT_SIZE)
  }
  const tb = getListViewColBText(group)
  if (tb) {
    tb.setAttribute('x', String(colBx))
    tb.setAttribute('y', String(baseY))
    tb.setAttribute('font-size', LISTVIEW_HEADER_TEXT_FONT_SIZE)
  }
}

export function ensureListViewResizeSynced(group: SVGElement): void {
  if (!isListViewResizeGroup(group)) return
  const face = getListViewFaceRect(group)
  if (!face) return
  relayoutListViewChrome(group, readElementBounds(face))
}

function isDataGridViewResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="datagridview-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'datagridview' && sem !== 'datagridview') return false
  const rects = group.querySelectorAll(':scope > rect')
  const lines = group.querySelectorAll(':scope > line')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return (
    rects.length === 1 &&
    lines.length === DATAGRIDVIEW_H_LINE_COUNT + DATAGRIDVIEW_V_LINE_COUNT &&
    paths.length === 0 &&
    texts.length === 0
  )
}

function getDataGridViewFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="datagridview-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function collectDataGridViewGridLines(group: SVGElement): {
  h: SVGLineElement[]
  v: SVGLineElement[]
} {
  const hTagged: SVGLineElement[] = []
  const vTagged: SVGLineElement[] = []
  let allHTagged = true
  let allVTagged = true
  for (let i = 0; i < DATAGRIDVIEW_H_LINE_COUNT; i++) {
    const el = group.querySelector(`:scope > line[data-uisvg-part="datagridview-hline-${i}"]`)
    if (el) hTagged.push(el as SVGLineElement)
    else allHTagged = false
  }
  for (let j = 0; j < DATAGRIDVIEW_V_LINE_COUNT; j++) {
    const el = group.querySelector(`:scope > line[data-uisvg-part="datagridview-vline-${j}"]`)
    if (el) vTagged.push(el as SVGLineElement)
    else allVTagged = false
  }
  if (allHTagged && allVTagged) return { h: hTagged, v: vTagged }

  const lines = [...group.querySelectorAll(':scope > line')] as SVGLineElement[]
  const h: SVGLineElement[] = []
  const v: SVGLineElement[] = []
  for (const l of lines) {
    const y1 = parseFloat(l.getAttribute('y1') || '0')
    const y2 = parseFloat(l.getAttribute('y2') || '0')
    const x1 = parseFloat(l.getAttribute('x1') || '0')
    const x2 = parseFloat(l.getAttribute('x2') || '0')
    if (Math.abs(y1 - y2) < 1) h.push(l)
    else if (Math.abs(x1 - x2) < 1) v.push(l)
  }
  h.sort((a, b) => parseFloat(a.getAttribute('y1') || '0') - parseFloat(b.getAttribute('y1') || '0'))
  v.sort((a, b) => parseFloat(a.getAttribute('x1') || '0') - parseFloat(b.getAttribute('x1') || '0'))
  return {
    h: h.slice(0, DATAGRIDVIEW_H_LINE_COUNT),
    v: v.slice(0, DATAGRIDVIEW_V_LINE_COUNT),
  }
}

function relayoutDataGridViewChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getDataGridViewFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const sx = ow / DATAGRIDVIEW_DEFAULT_W
  const sy = oh / DATAGRIDVIEW_DEFAULT_H
  const { h: hLines, v: vLines } = collectDataGridViewGridLines(group)

  let prevY = oy - 1
  for (let i = 0; i < DATAGRIDVIEW_H_LINE_COUNT; i++) {
    const ln = hLines[i]
    if (!ln) continue
    let y = oy + Math.round((DATAGRIDVIEW_HEADER_BOTTOM + i * DATAGRIDVIEW_H_LINE_STEP) * sy)
    y = Math.min(oy + oh - 1, Math.max(y, prevY + 1))
    prevY = y
    ln.setAttribute('x1', String(ox))
    ln.setAttribute('y1', String(y))
    ln.setAttribute('x2', String(ox + ow))
    ln.setAttribute('y2', String(y))
    ln.setAttribute('stroke', DATAGRIDVIEW_GRID_STROKE)
  }

  let prevX = ox - 1
  for (let j = 0; j < DATAGRIDVIEW_V_LINE_COUNT; j++) {
    const ln = vLines[j]
    if (!ln) continue
    let x = ox + Math.round((DATAGRIDVIEW_COL_FIRST_X + j * DATAGRIDVIEW_COL_STEP) * sx)
    x = Math.min(ox + ow - 1, Math.max(x, prevX + 1))
    prevX = x
    ln.setAttribute('x1', String(x))
    ln.setAttribute('y1', String(oy))
    ln.setAttribute('x2', String(x))
    ln.setAttribute('y2', String(oy + oh))
    ln.setAttribute('stroke', DATAGRIDVIEW_GRID_STROKE)
  }
}

export function ensureDataGridViewResizeSynced(group: SVGElement): void {
  if (!isDataGridViewResizeGroup(group)) return
  const face = getDataGridViewFaceRect(group)
  if (!face) return
  relayoutDataGridViewChrome(group, readElementBounds(face))
}

function isTreeViewResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="treeview-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'treeview' && sem !== 'treeview') return false
  const rects = group.querySelectorAll(':scope > rect')
  const lines = group.querySelectorAll(':scope > line')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && lines.length === 0 && paths.length === 0 && texts.length === 2
}

function getTreeViewFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="treeview-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getTreeViewRootLabel(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="treeview-root-label"]') ??
    ([...group.querySelectorAll(':scope > text')][0] as SVGTextElement | undefined) ??
    null) as SVGTextElement | null
}

function getTreeViewChildLabel(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="treeview-child-label"]') ??
    ([...group.querySelectorAll(':scope > text')][1] as SVGTextElement | undefined) ??
    null) as SVGTextElement | null
}

function relayoutTreeViewChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getTreeViewFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const root = getTreeViewRootLabel(group)
  if (root) {
    root.setAttribute('x', String(ox + TREEVIEW_ROOT_TEXT_X))
    root.setAttribute('y', String(oy + TREEVIEW_ROOT_BASELINE_Y))
    root.setAttribute('font-size', TREEVIEW_TEXT_FONT_SIZE)
  }
  const child = getTreeViewChildLabel(group)
  if (child) {
    child.setAttribute('x', String(ox + TREEVIEW_CHILD_TEXT_X))
    child.setAttribute('y', String(oy + TREEVIEW_CHILD_BASELINE_Y))
    child.setAttribute('font-size', TREEVIEW_TEXT_FONT_SIZE)
  }
}

export function ensureTreeViewResizeSynced(group: SVGElement): void {
  if (!isTreeViewResizeGroup(group)) return
  const face = getTreeViewFaceRect(group)
  if (!face) return
  relayoutTreeViewChrome(group, readElementBounds(face))
}

function isMonthCalendarResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="monthcalendar-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'monthcalendar' && sem !== 'monthcalendar') return false
  const rects = group.querySelectorAll(':scope > rect')
  const lines = group.querySelectorAll(':scope > line')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && lines.length === 1 && paths.length === 0 && texts.length === 1
}

function getMonthCalendarFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="monthcalendar-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getMonthCalendarTitleText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="monthcalendar-title"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function getMonthCalendarUnderline(group: SVGElement): SVGLineElement | null {
  return (group.querySelector(':scope > line[data-uisvg-part="monthcalendar-underline"]') ??
    group.querySelector(':scope > line')) as SVGLineElement | null
}

function relayoutMonthCalendarChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getMonthCalendarFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const title = getMonthCalendarTitleText(group)
  if (title) {
    title.setAttribute('x', String(ox + MONTH_CAL_TITLE_PAD_X))
    title.setAttribute('y', String(oy + MONTH_CAL_TITLE_BASELINE_Y))
    title.setAttribute('font-size', MONTH_CAL_TITLE_FONT_SIZE)
  }
  const sepY = oy + MONTH_CAL_UNDERLINE_Y
  const x1 = ox + MONTH_CAL_LINE_MARGIN_LEFT
  const x2Raw = ox + ow - MONTH_CAL_LINE_MARGIN_RIGHT
  const x2 = Math.max(x1 + 1, x2Raw)
  const ln = getMonthCalendarUnderline(group)
  if (ln) {
    ln.setAttribute('x1', String(x1))
    ln.setAttribute('y1', String(sepY))
    ln.setAttribute('x2', String(x2))
    ln.setAttribute('y2', String(sepY))
    ln.setAttribute('stroke', MONTH_CAL_LINE_STROKE)
  }
}

export function ensureMonthCalendarResizeSynced(group: SVGElement): void {
  if (!isMonthCalendarResizeGroup(group)) return
  const face = getMonthCalendarFaceRect(group)
  if (!face) return
  relayoutMonthCalendarChrome(group, readElementBounds(face))
}

function isTrackBarResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="trackbar-face"]')) return true
  if (group.querySelector(':scope > rect[data-uisvg-part="trackbar-track"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'trackbar' && sem !== 'trackbar') return false
  const rects = group.querySelectorAll(':scope > rect')
  const lines = group.querySelectorAll(':scope > line')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return (
    rects.length >= 2 &&
    rects.length <= 3 &&
    lines.length === 0 &&
    paths.length === 0 &&
    texts.length === 0
  )
}

const SVG_NS = 'http://www.w3.org/2000/svg'

function getTrackBarFaceRect(group: SVGElement): SVGRectElement | null {
  return group.querySelector(':scope > rect[data-uisvg-part="trackbar-face"]') as SVGRectElement | null
}

function getTrackBarTrackRect(group: SVGElement): SVGRectElement | null {
  const byPart = group.querySelector(':scope > rect[data-uisvg-part="trackbar-track"]')
  if (byPart) return byPart as SVGRectElement
  const rects = [...group.querySelectorAll(':scope > rect')]
  if (!rects.length) return null
  if (rects.length >= 3 && group.querySelector(':scope > rect[data-uisvg-part="trackbar-face"]')) {
    return rects[1] as SVGRectElement
  }
  return rects[0] as SVGRectElement
}

function getTrackBarThumbRect(group: SVGElement): SVGRectElement | null {
  const byPart = group.querySelector(':scope > rect[data-uisvg-part="trackbar-thumb"]')
  if (byPart) return byPart as SVGRectElement
  const rects = [...group.querySelectorAll(':scope > rect')]
  return (rects[rects.length - 1] as SVGRectElement | undefined) ?? null
}

/** 旧稿仅有槽+滑块、无 face 时插入 face，使缩放目标为整控件外框而槽保持横向细条 */
function ensureTrackBarFaceIfMissing(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  if (group.querySelector(':scope > rect[data-uisvg-part="trackbar-face"]')) return
  const track = getTrackBarTrackRect(group)
  if (!track) return
  const doc = track.ownerDocument
  if (!doc) return
  const face = doc.createElementNS(SVG_NS, 'rect')
  face.setAttribute('data-uisvg-part', 'trackbar-face')
  /** 旧稿只有薄槽+滑块时，b 来自槽（约 4px 高）；外框应还原为默认控件高度，避免缩放框塌成一条线 */
  const thinGroove = b.oh <= TRACKBAR_GROOVE_H + TRACKBAR_GROOVE_Y_OFFSET
  let fx = b.ox
  let fy = b.oy
  let fw = b.ow
  let fh = b.oh
  if (thinGroove) {
    fy = Math.max(0, b.oy - TRACKBAR_GROOVE_Y_OFFSET)
    fh = TRACKBAR_DEFAULT_FACE_H
    const thumb = getTrackBarThumbRect(group)
    if (thumb) {
      const tY = parseFloat(thumb.getAttribute('y') || '0')
      const tH = parseFloat(thumb.getAttribute('height') || String(TRACKBAR_THUMB_H))
      fh = Math.max(fh, Math.ceil(tY + tH - fy))
    }
  }
  face.setAttribute('x', String(fx))
  face.setAttribute('y', String(fy))
  face.setAttribute('width', String(fw))
  face.setAttribute('height', String(fh))
  face.setAttribute('fill', TRACKBAR_FACE_FILL)
  face.setAttribute('stroke', '#adadad')
  group.insertBefore(face, track)
}

function relayoutTrackBarChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  ensureTrackBarFaceIfMissing(group, b)
  const face = getTrackBarFaceRect(group)
  const { ox, oy, ow, oh } = face ? readElementBounds(face) : b

  const track = getTrackBarTrackRect(group)
  const thumb = getTrackBarThumbRect(group)

  let slideRatio =
    TRACKBAR_DEFAULT_SLIDE_RANGE > 0 ? TRACKBAR_DEFAULT_THUMB_LEFT / TRACKBAR_DEFAULT_SLIDE_RANGE : 0
  if (thumb && track) {
    const tox = parseFloat(track.getAttribute('x') || '0')
    const tw = parseFloat(track.getAttribute('width') || '0')
    const sr = Math.max(0, tw - TRACKBAR_THUMB_W)
    const tcx = parseFloat(thumb.getAttribute('x') || '0')
    if (sr > 0) slideRatio = Math.min(1, Math.max(0, (tcx - tox) / sr))
  }

  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
    face.setAttribute('fill', TRACKBAR_FACE_FILL)
    face.setAttribute('stroke', '#adadad')
  }

  const gh = Math.min(TRACKBAR_GROOVE_H, Math.max(2, oh - 2))
  /** 默认矮控件：槽在面顶下 8px；用户拉得很高的面：槽贴面上缘（避免迁移时面顶已是旧槽顶却又下移 8px） */
  const useClassicGrooveOffset = oh <= TRACKBAR_DEFAULT_FACE_H + TRACKBAR_GROOVE_Y_OFFSET
  let gy: number
  if (useClassicGrooveOffset) {
    gy =
      oh >= TRACKBAR_GROOVE_Y_OFFSET + gh
        ? oy + TRACKBAR_GROOVE_Y_OFFSET
        : oy + Math.max(0, Math.floor((oh - gh) / 2))
  } else {
    gy = oy
  }

  if (track) {
    track.setAttribute('x', String(ox))
    track.setAttribute('y', String(gy))
    track.setAttribute('width', String(ow))
    track.setAttribute('height', String(gh))
    track.setAttribute('fill', TRACKBAR_TRACK_FILL)
  }
  if (thumb) {
    const slideRange = Math.max(0, ow - TRACKBAR_THUMB_W)
    const thumbX = ox + Math.min(slideRange, Math.max(0, slideRatio * slideRange))
    const thumbY = Math.round(gy + (gh - TRACKBAR_THUMB_H) / 2)
    thumb.setAttribute('x', String(thumbX))
    thumb.setAttribute('y', String(thumbY))
    thumb.setAttribute('width', String(TRACKBAR_THUMB_W))
    thumb.setAttribute('height', String(TRACKBAR_THUMB_H))
    thumb.setAttribute('fill', TRACKBAR_THUMB_FILL)
  }
}

export function ensureTrackBarResizeSynced(group: SVGElement): void {
  if (!isTrackBarResizeGroup(group)) return
  const anchor = getTrackBarFaceRect(group) ?? getTrackBarTrackRect(group)
  if (!anchor) return
  relayoutTrackBarChrome(group, readElementBounds(anchor))
}

function isProgressBarResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="progressbar-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'progressbar' && sem !== 'progressbar') return false
  const rects = group.querySelectorAll(':scope > rect')
  const lines = group.querySelectorAll(':scope > line')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 2 && lines.length === 0 && paths.length === 0 && texts.length === 0
}

function getProgressBarFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="progressbar-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getProgressBarFillRect(group: SVGElement): SVGRectElement | null {
  return (
    (group.querySelector(':scope > rect[data-uisvg-part="progressbar-fill"]') as SVGRectElement | null) ??
    (([...group.querySelectorAll(':scope > rect')][1] as SVGRectElement | undefined) ?? null)
  )
}

function relayoutProgressBarChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getProgressBarFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
    face.setAttribute('fill', '#ffffff')
  }
  const inset = PROGRESS_BAR_INSET
  const innerW = Math.max(0, ow - 2 * inset)
  const innerH = Math.max(0, oh - 2 * inset)
  const defaultInnerW = Math.max(1, PROGRESS_BAR_DEFAULT_OUTER_W - 2 * inset)
  const fillRatio = PROGRESS_BAR_DEFAULT_FILL_W / defaultInnerW
  const fillW = Math.max(1, Math.round(innerW * fillRatio))
  const fillH = Math.max(1, innerH)
  const fill = getProgressBarFillRect(group)
  if (fill) {
    fill.setAttribute('x', String(ox + inset))
    fill.setAttribute('y', String(oy + inset))
    fill.setAttribute('width', String(Math.min(fillW, innerW)))
    fill.setAttribute('height', String(fillH))
    fill.setAttribute('fill', PROGRESS_BAR_FILL_COLOR)
    fill.setAttribute('opacity', PROGRESS_BAR_FILL_OPACITY)
  }
}

export function ensureProgressBarResizeSynced(group: SVGElement): void {
  if (!isProgressBarResizeGroup(group)) return
  const face = getProgressBarFaceRect(group)
  if (!face) return
  relayoutProgressBarChrome(group, readElementBounds(face))
}

function isHScrollBarResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="hscrollbar-face"]')) return true
  if (group.querySelector(':scope > rect[data-uisvg-part="hscrollbar-track"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'hscrollbar' && sem !== 'hscrollbar') return false
  const rects = group.querySelectorAll(':scope > rect')
  const lines = group.querySelectorAll(':scope > line')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return (
    rects.length >= 2 &&
    rects.length <= 3 &&
    lines.length === 0 &&
    paths.length === 0 &&
    texts.length === 0
  )
}

function getHScrollBarFaceRect(group: SVGElement): SVGRectElement | null {
  return group.querySelector(':scope > rect[data-uisvg-part="hscrollbar-face"]') as SVGRectElement | null
}

function getHScrollBarTrackRect(group: SVGElement): SVGRectElement | null {
  const byPart = group.querySelector(':scope > rect[data-uisvg-part="hscrollbar-track"]')
  if (byPart) return byPart as SVGRectElement
  const rects = [...group.querySelectorAll(':scope > rect')]
  if (!rects.length) return null
  if (rects.length >= 3 && group.querySelector(':scope > rect[data-uisvg-part="hscrollbar-face"]')) {
    return rects[1] as SVGRectElement
  }
  return rects[0] as SVGRectElement
}

function getHScrollBarThumbRect(group: SVGElement): SVGRectElement | null {
  const byPart = group.querySelector(':scope > rect[data-uisvg-part="hscrollbar-thumb"]')
  if (byPart) return byPart as SVGRectElement
  const rects = [...group.querySelectorAll(':scope > rect')]
  return (rects[rects.length - 1] as SVGRectElement | undefined) ?? null
}

/** 旧稿仅有槽+滑块时插入 face，缩放目标为整控件外框；槽高≈默认时还原默认外框高度 */
function ensureHScrollBarFaceIfMissing(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  if (group.querySelector(':scope > rect[data-uisvg-part="hscrollbar-face"]')) return
  const track = getHScrollBarTrackRect(group)
  if (!track) return
  const doc = track.ownerDocument
  if (!doc) return
  const face = doc.createElementNS(SVG_NS, 'rect')
  face.setAttribute('data-uisvg-part', 'hscrollbar-face')
  const thinChrome = b.oh <= HSCROLL_DEFAULT_FACE_H + 4
  let fx = b.ox
  let fy = b.oy
  let fw = b.ow
  let fh = b.oh
  if (thinChrome) {
    fy = Math.max(0, b.oy)
    fh = HSCROLL_DEFAULT_FACE_H
    const thumb = getHScrollBarThumbRect(group)
    if (thumb) {
      const tY = parseFloat(thumb.getAttribute('y') || '0')
      const tH = parseFloat(thumb.getAttribute('height') || String(HSCROLL_THUMB_DEFAULT_H))
      fh = Math.max(fh, Math.ceil(tY + tH - fy))
    }
  }
  face.setAttribute('x', String(fx))
  face.setAttribute('y', String(fy))
  face.setAttribute('width', String(fw))
  face.setAttribute('height', String(fh))
  face.setAttribute('fill', HSCROLL_FACE_FILL)
  face.setAttribute('stroke', '#adadad')
  group.insertBefore(face, track)
}

function relayoutHScrollBarChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  ensureHScrollBarFaceIfMissing(group, b)
  const face = getHScrollBarFaceRect(group)
  const { ox, oy, ow, oh } = face ? readElementBounds(face) : b

  const track = getHScrollBarTrackRect(group)
  const thumb = getHScrollBarThumbRect(group)

  const trackH = Math.min(HSCROLL_DEFAULT_FACE_H, Math.max(1, oh))
  const trackY = oy

  let slideRatio =
    HSCROLL_DEFAULT_SLIDE_RANGE > 0 ? HSCROLL_THUMB_DEFAULT_LEFT / HSCROLL_DEFAULT_SLIDE_RANGE : 0
  if (thumb && track) {
    const tox = parseFloat(track.getAttribute('x') || '0')
    const tw = parseFloat(track.getAttribute('width') || '0')
    const prevThumbW = parseFloat(thumb.getAttribute('width') || String(HSCROLL_THUMB_DEFAULT_W))
    const sr = Math.max(0, tw - prevThumbW)
    const tcx = parseFloat(thumb.getAttribute('x') || '0')
    if (sr > 0) slideRatio = Math.min(1, Math.max(0, (tcx - tox) / sr))
  }

  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
    face.setAttribute('fill', HSCROLL_FACE_FILL)
    face.setAttribute('stroke', '#adadad')
  }

  if (track) {
    track.setAttribute('x', String(ox))
    track.setAttribute('y', String(trackY))
    track.setAttribute('width', String(ow))
    track.setAttribute('height', String(trackH))
    track.setAttribute('fill', HSCROLL_TRACK_FILL)
  }

  const thumbW = Math.max(8, Math.round((ow * HSCROLL_THUMB_DEFAULT_W) / HSCROLL_DEFAULT_TRACK_W))
  const thumbH = Math.min(HSCROLL_THUMB_DEFAULT_H, Math.max(4, trackH - 4))
  const slideRange = Math.max(0, ow - thumbW)
  const thumbX = ox + Math.min(slideRange, Math.max(0, slideRatio * slideRange))
  const thumbY = Math.round(trackY + (trackH - thumbH) / 2)
  if (thumb) {
    thumb.setAttribute('x', String(thumbX))
    thumb.setAttribute('y', String(thumbY))
    thumb.setAttribute('width', String(thumbW))
    thumb.setAttribute('height', String(thumbH))
    thumb.setAttribute('fill', HSCROLL_THUMB_FILL)
  }
}

export function ensureHScrollBarResizeSynced(group: SVGElement): void {
  if (!isHScrollBarResizeGroup(group)) return
  const anchor = getHScrollBarFaceRect(group) ?? getHScrollBarTrackRect(group)
  if (!anchor) return
  relayoutHScrollBarChrome(group, readElementBounds(anchor))
}

function isVScrollBarResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="vscrollbar-face"]')) return true
  if (group.querySelector(':scope > rect[data-uisvg-part="vscrollbar-track"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'vscrollbar' && sem !== 'vscrollbar') return false
  const rects = group.querySelectorAll(':scope > rect')
  const lines = group.querySelectorAll(':scope > line')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return (
    rects.length >= 2 &&
    rects.length <= 3 &&
    lines.length === 0 &&
    paths.length === 0 &&
    texts.length === 0
  )
}

function getVScrollBarFaceRect(group: SVGElement): SVGRectElement | null {
  return group.querySelector(':scope > rect[data-uisvg-part="vscrollbar-face"]') as SVGRectElement | null
}

function getVScrollBarTrackRect(group: SVGElement): SVGRectElement | null {
  const byPart = group.querySelector(':scope > rect[data-uisvg-part="vscrollbar-track"]')
  if (byPart) return byPart as SVGRectElement
  const rects = [...group.querySelectorAll(':scope > rect')]
  if (!rects.length) return null
  if (rects.length >= 3 && group.querySelector(':scope > rect[data-uisvg-part="vscrollbar-face"]')) {
    return rects[1] as SVGRectElement
  }
  return rects[0] as SVGRectElement
}

function getVScrollBarThumbRect(group: SVGElement): SVGRectElement | null {
  const byPart = group.querySelector(':scope > rect[data-uisvg-part="vscrollbar-thumb"]')
  if (byPart) return byPart as SVGRectElement
  const rects = [...group.querySelectorAll(':scope > rect')]
  return (rects[rects.length - 1] as SVGRectElement | undefined) ?? null
}

/** 旧稿仅有槽+滑块时插入 face；槽宽约默认时还原默认外框宽度 */
function ensureVScrollBarFaceIfMissing(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  if (group.querySelector(':scope > rect[data-uisvg-part="vscrollbar-face"]')) return
  const track = getVScrollBarTrackRect(group)
  if (!track) return
  const doc = track.ownerDocument
  if (!doc) return
  const face = doc.createElementNS(SVG_NS, 'rect')
  face.setAttribute('data-uisvg-part', 'vscrollbar-face')
  const thinChrome = b.ow <= VSCROLL_DEFAULT_FACE_W + 4
  let fx = b.ox
  let fy = b.oy
  let fw = b.ow
  let fh = b.oh
  if (thinChrome) {
    fx = Math.max(0, b.ox)
    fw = VSCROLL_DEFAULT_FACE_W
    fh = VSCROLL_DEFAULT_TRACK_H
    const thumb = getVScrollBarThumbRect(group)
    if (thumb) {
      const tY = parseFloat(thumb.getAttribute('y') || '0')
      const tH = parseFloat(thumb.getAttribute('height') || String(VSCROLL_THUMB_DEFAULT_H))
      fh = Math.max(fh, Math.ceil(tY + tH - fy))
    }
  }
  face.setAttribute('x', String(fx))
  face.setAttribute('y', String(fy))
  face.setAttribute('width', String(fw))
  face.setAttribute('height', String(fh))
  face.setAttribute('fill', VSCROLL_FACE_FILL)
  face.setAttribute('stroke', '#adadad')
  group.insertBefore(face, track)
}

function relayoutVScrollBarChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  ensureVScrollBarFaceIfMissing(group, b)
  const face = getVScrollBarFaceRect(group)
  const { ox, oy, ow, oh } = face ? readElementBounds(face) : b

  const track = getVScrollBarTrackRect(group)
  const thumb = getVScrollBarThumbRect(group)

  const trackW = Math.min(VSCROLL_DEFAULT_TRACK_W, Math.max(1, ow))
  const trackX = ox
  const trackY = oy
  const trackH = oh

  let slideRatio =
    VSCROLL_DEFAULT_SLIDE_RANGE > 0 ? VSCROLL_THUMB_DEFAULT_TOP / VSCROLL_DEFAULT_SLIDE_RANGE : 0
  if (thumb && track) {
    const toy = parseFloat(track.getAttribute('y') || '0')
    const th = parseFloat(track.getAttribute('height') || '0')
    const prevThumbH = parseFloat(thumb.getAttribute('height') || String(VSCROLL_THUMB_DEFAULT_H))
    const sr = Math.max(0, th - prevThumbH)
    const tsy = parseFloat(thumb.getAttribute('y') || '0')
    if (sr > 0) slideRatio = Math.min(1, Math.max(0, (tsy - toy) / sr))
  }

  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
    face.setAttribute('fill', VSCROLL_FACE_FILL)
    face.setAttribute('stroke', '#adadad')
  }

  if (track) {
    track.setAttribute('x', String(trackX))
    track.setAttribute('y', String(trackY))
    track.setAttribute('width', String(trackW))
    track.setAttribute('height', String(trackH))
    track.setAttribute('fill', VSCROLL_TRACK_FILL)
  }

  const thumbHRaw = Math.max(8, Math.round((trackH * VSCROLL_THUMB_DEFAULT_H) / VSCROLL_DEFAULT_TRACK_H))
  const thumbH = Math.min(thumbHRaw, Math.max(4, trackH - 4))
  const thumbW = Math.min(VSCROLL_THUMB_DEFAULT_W, Math.max(4, trackW - 4))
  const slideRange = Math.max(0, trackH - thumbH)
  const thumbY = trackY + Math.min(slideRange, Math.max(0, slideRatio * slideRange))
  const thumbX = Math.round(trackX + (trackW - thumbW) / 2)
  if (thumb) {
    thumb.setAttribute('x', String(thumbX))
    thumb.setAttribute('y', String(thumbY))
    thumb.setAttribute('width', String(thumbW))
    thumb.setAttribute('height', String(thumbH))
    thumb.setAttribute('fill', VSCROLL_THUMB_FILL)
  }
}

export function ensureVScrollBarResizeSynced(group: SVGElement): void {
  if (!isVScrollBarResizeGroup(group)) return
  const anchor = getVScrollBarFaceRect(group) ?? getVScrollBarTrackRect(group)
  if (!anchor) return
  relayoutVScrollBarChrome(group, readElementBounds(anchor))
}

function isCheckedListBoxResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="checkedlistbox-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'checkedlistbox' && sem !== 'checkedlistbox') return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length >= 2 && texts.length >= 1 && rects.length - 1 === texts.length
}

function getCheckedListBoxFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="checkedlistbox-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getCheckedListBoxCheckRects(group: SVGElement): SVGRectElement[] {
  const tagged = group.querySelectorAll(':scope > rect[data-uisvg-part="checkedlistbox-check"]')
  if (tagged.length > 0) return [...tagged] as SVGRectElement[]
  const all = [...group.querySelectorAll(':scope > rect')] as SVGRectElement[]
  return all.slice(1)
}

function getCheckedListBoxItemTexts(group: SVGElement): SVGTextElement[] {
  const tagged = group.querySelectorAll(':scope > text[data-uisvg-part="checkedlistbox-item"]')
  if (tagged.length > 0) return [...tagged] as SVGTextElement[]
  return [...group.querySelectorAll(':scope > text')] as SVGTextElement[]
}

function relayoutCheckedListBoxChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getCheckedListBoxFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const checks = getCheckedListBoxCheckRects(group)
  const labels = getCheckedListBoxItemTexts(group)
  const n = Math.min(checks.length, labels.length)
  for (let i = 0; i < n; i++) {
    const cr = checks[i]
    cr.setAttribute('x', String(ox + CHECKED_LISTBOX_CHECK_X))
    cr.setAttribute('y', String(oy + CHECKED_LISTBOX_CHECK_Y0 + i * CHECKED_LISTBOX_CHECK_ROW_STEP))
    cr.setAttribute('width', String(CHECKED_LISTBOX_CHECK_W))
    cr.setAttribute('height', String(CHECKED_LISTBOX_CHECK_H))
    const te = labels[i]
    te.setAttribute('x', String(ox + CHECKED_LISTBOX_LABEL_X))
    te.setAttribute('y', String(oy + CHECKED_LISTBOX_FIRST_BASELINE_Y + i * CHECKED_LISTBOX_LABEL_ROW_STEP))
    te.setAttribute('font-size', CHECKED_LISTBOX_LABEL_FONT_SIZE)
  }
}

export function ensureCheckedListBoxResizeSynced(group: SVGElement): void {
  if (!isCheckedListBoxResizeGroup(group)) return
  const face = getCheckedListBoxFaceRect(group)
  if (!face) return
  relayoutCheckedListBoxChrome(group, readElementBounds(face))
}

function isComboBoxResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="combobox-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'combobox' && sem !== 'combobox') return false
  const rects = group.querySelectorAll(':scope > rect')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 2 && paths.length === 1 && texts.length === 1
}

function getComboBoxFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="combobox-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getComboBoxDropdownRect(group: SVGElement): SVGRectElement | null {
  return (
    (group.querySelector(':scope > rect[data-uisvg-part="combobox-dropdown"]') as SVGRectElement | null) ??
    (([...group.querySelectorAll(':scope > rect')][1] as SVGRectElement | undefined) ?? null)
  )
}

function getComboBoxArrowPath(group: SVGElement): SVGPathElement | null {
  return (group.querySelector(':scope > path[data-uisvg-part="combobox-arrow"]') ??
    group.querySelector(':scope > path')) as SVGPathElement | null
}

function getComboBoxFieldText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="combobox-text"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutComboBoxChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getComboBoxFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const btnLeft = ox + ow - COMBO_DROPDOWN_WIDTH - COMBO_DROPDOWN_MARGIN_RIGHT
  const btnTop = oy + COMBO_DROPDOWN_MARGIN_Y
  const btnH = Math.max(
    4,
    Math.min(COMBO_DROPDOWN_HEIGHT, oh - 2 * COMBO_DROPDOWN_MARGIN_Y),
  )
  const drop = getComboBoxDropdownRect(group)
  if (drop) {
    drop.setAttribute('x', String(btnLeft))
    drop.setAttribute('y', String(btnTop))
    drop.setAttribute('width', String(COMBO_DROPDOWN_WIDTH))
    drop.setAttribute('height', String(btnH))
  }
  const cx = btnLeft + COMBO_ARROW_CENTER_X_OFFSET_FROM_BTN_LEFT
  const cy = btnTop + btnH / 2
  const aw = COMBO_ARROW_HALF_WIDTH
  const ath = COMBO_ARROW_HALF_HEIGHT_TOP
  const abb = COMBO_ARROW_HALF_HEIGHT_BOTTOM
  const arrow = getComboBoxArrowPath(group)
  if (arrow) {
    arrow.setAttribute(
      'd',
      `M${cx - aw} ${cy - ath} L${cx + aw} ${cy - ath} L${cx} ${cy + abb} Z`,
    )
    arrow.setAttribute('fill', '#505050')
  }
  const te = getComboBoxFieldText(group)
  if (te) {
    te.setAttribute('x', String(ox + COMBO_TEXT_OFFSET_X))
    const textRoom = Math.max(0, oh - 4)
    const textY = oy + Math.min(COMBO_TEXT_BASELINE_SMALL_H, textRoom)
    te.setAttribute('y', String(textY))
    te.setAttribute('font-size', COMBO_TEXT_FONT_SIZE)
  }
}

export function ensureComboBoxResizeSynced(group: SVGElement): void {
  if (!isComboBoxResizeGroup(group)) return
  const face = getComboBoxFaceRect(group)
  if (!face) return
  relayoutComboBoxChrome(group, readElementBounds(face))
}

function isPropertyGridResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="propertygrid-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'propertygrid' && sem !== 'propertygrid') return false
  const rects = group.querySelectorAll(':scope > rect')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 2 && paths.length === 0 && texts.length === 2
}

function getPropertyGridFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="propertygrid-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getPropertyGridToolbarRect(group: SVGElement): SVGRectElement | null {
  return (
    (group.querySelector(':scope > rect[data-uisvg-part="propertygrid-toolbar"]') as SVGRectElement | null) ??
    (([...group.querySelectorAll(':scope > rect')][1] as SVGRectElement | undefined) ?? null)
  )
}

function getPropertyGridToolbarCaption(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="propertygrid-toolbar-caption"]') ??
    ([...group.querySelectorAll(':scope > text')][0] as SVGTextElement | undefined) ??
    null) as SVGTextElement | null
}

function getPropertyGridFirstRowLabel(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="propertygrid-first-row-label"]') ??
    ([...group.querySelectorAll(':scope > text')][1] as SVGTextElement | undefined) ??
    null) as SVGTextElement | null
}

function relayoutPropertyGridChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getPropertyGridFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const toolbarH = Math.min(PROPERTY_GRID_TOOLBAR_HEIGHT, Math.max(0, oh))
  const tb = getPropertyGridToolbarRect(group)
  if (tb) {
    tb.setAttribute('x', String(ox))
    tb.setAttribute('y', String(oy))
    tb.setAttribute('width', String(ow))
    tb.setAttribute('height', String(toolbarH))
  }
  const cap = getPropertyGridToolbarCaption(group)
  if (cap) {
    cap.setAttribute('x', String(ox + PROPERTY_GRID_TEXT_PAD_X))
    const capY = oy + Math.min(PROPERTY_GRID_TOOLBAR_TEXT_BASELINE_Y, Math.max(0, toolbarH - 2))
    cap.setAttribute('y', String(capY))
    cap.setAttribute('font-size', PROPERTY_GRID_TEXT_FONT_SIZE)
  }
  const row = getPropertyGridFirstRowLabel(group)
  if (row) {
    row.setAttribute('x', String(ox + PROPERTY_GRID_TEXT_PAD_X))
    const rowY = oy + toolbarH + PROPERTY_GRID_FIRST_ROW_GAP_BELOW_TOOLBAR
    row.setAttribute('y', String(Math.min(rowY, oy + Math.max(0, oh - 2))))
    row.setAttribute('font-size', PROPERTY_GRID_TEXT_FONT_SIZE)
  }
}

export function ensurePropertyGridResizeSynced(group: SVGElement): void {
  if (!isPropertyGridResizeGroup(group)) return
  const face = getPropertyGridFaceRect(group)
  if (!face) return
  relayoutPropertyGridChrome(group, readElementBounds(face))
}

function isPictureBoxResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="picturebox-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'picturebox' && sem !== 'picturebox') return false
  const rects = group.querySelectorAll(':scope > rect')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && paths.length === 0 && texts.length === 1
}

function getPictureBoxFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="picturebox-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getPictureBoxCaptionText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="picturebox-caption"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutPictureBoxChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getPictureBoxFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const te = getPictureBoxCaptionText(group)
  if (te) {
    te.setAttribute('text-anchor', 'middle')
    te.setAttribute('x', String(ox + ow / 2))
    te.setAttribute('y', String(oy + oh / 2 + PICTURE_BOX_TEXT_BASELINE_OFFSET_FROM_MID_Y))
    te.setAttribute('font-size', PICTURE_BOX_TEXT_FONT_SIZE)
    te.setAttribute('fill', PICTURE_BOX_TEXT_FILL)
  }
}

export function ensurePictureBoxResizeSynced(group: SVGElement): void {
  if (!isPictureBoxResizeGroup(group)) return
  const face = getPictureBoxFaceRect(group)
  if (!face) return
  relayoutPictureBoxChrome(group, readElementBounds(face))
}

function isNumericUpDownResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="numericupdown-face"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'numericupdown' && sem !== 'numericupdown') return false
  const rects = group.querySelectorAll(':scope > rect')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 3 && texts.length === 1
}

function getNumericUpDownFaceRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="numericupdown-face"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getNumericUpDownSpinTop(group: SVGElement): SVGRectElement | null {
  return (
    (group.querySelector(':scope > rect[data-uisvg-part="numericupdown-spin-top"]') as SVGRectElement | null) ??
    (([...group.querySelectorAll(':scope > rect')][1] as SVGRectElement | undefined) ?? null)
  )
}

function getNumericUpDownSpinBottom(group: SVGElement): SVGRectElement | null {
  return (
    (group.querySelector(':scope > rect[data-uisvg-part="numericupdown-spin-bottom"]') as SVGRectElement | null) ??
    (([...group.querySelectorAll(':scope > rect')][2] as SVGRectElement | undefined) ?? null)
  )
}

function getNumericUpDownValueText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="numericupdown-text"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutNumericUpDownChrome(
  group: SVGElement,
  b: { ox: number; oy: number; ow: number; oh: number },
): void {
  const { ox, oy, ow, oh } = b
  const face = getNumericUpDownFaceRect(group)
  if (face) {
    face.setAttribute('x', String(ox))
    face.setAttribute('y', String(oy))
    face.setAttribute('width', String(ow))
    face.setAttribute('height', String(oh))
  }
  const spinX = ox + ow - NUMERIC_UPDOWN_SPIN_INSET_FROM_FACE_END
  const innerTop = oy + NUMERIC_UPDOWN_SPIN_MARGIN_Y
  const maxSpinInner = Math.max(0, oh - 2 * NUMERIC_UPDOWN_SPIN_MARGIN_Y)
  const spinInnerH = Math.min(NUMERIC_UPDOWN_SPIN_INNER_HEIGHT, maxSpinInner)
  let hTop = 0
  let hBottom = 0
  if (spinInnerH > 0) {
    if (spinInnerH === 1) {
      hTop = 1
      hBottom = 0
    } else {
      hTop = Math.floor(spinInnerH / 2)
      hBottom = spinInnerH - hTop
    }
  }
  const topSpin = getNumericUpDownSpinTop(group)
  if (topSpin) {
    topSpin.setAttribute('x', String(spinX))
    topSpin.setAttribute('y', String(innerTop))
    topSpin.setAttribute('width', String(NUMERIC_UPDOWN_SPIN_WIDTH))
    topSpin.setAttribute('height', String(Math.max(0, hTop)))
  }
  const botSpin = getNumericUpDownSpinBottom(group)
  if (botSpin) {
    botSpin.setAttribute('x', String(spinX))
    botSpin.setAttribute('y', String(innerTop + hTop))
    botSpin.setAttribute('width', String(NUMERIC_UPDOWN_SPIN_WIDTH))
    botSpin.setAttribute('height', String(Math.max(0, hBottom)))
  }
  const te = getNumericUpDownValueText(group)
  if (te) {
    te.setAttribute('x', String(ox + NUMERIC_UPDOWN_TEXT_OFFSET_X))
    const textRoom = Math.max(0, oh - 4)
    const textY = oy + Math.min(NUMERIC_UPDOWN_TEXT_BASELINE_SMALL_H, textRoom)
    te.setAttribute('y', String(textY))
    te.setAttribute('font-size', NUMERIC_UPDOWN_TEXT_FONT_SIZE)
  }
}

export function ensureNumericUpDownResizeSynced(group: SVGElement): void {
  if (!isNumericUpDownResizeGroup(group)) return
  const face = getNumericUpDownFaceRect(group)
  if (!face) return
  relayoutNumericUpDownChrome(group, readElementBounds(face))
}

function isCheckBoxResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > rect[data-uisvg-part="checkbox-box"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'checkbox' && sem !== 'checkbox') return false
  const rects = group.querySelectorAll(':scope > rect')
  const paths = group.querySelectorAll(':scope > path')
  const texts = group.querySelectorAll(':scope > text')
  return rects.length === 1 && paths.length === 1 && texts.length === 1
}

function getCheckBoxBoxRect(group: SVGElement): SVGRectElement | null {
  return (group.querySelector(':scope > rect[data-uisvg-part="checkbox-box"]') ??
    group.querySelector(':scope > rect')) as SVGRectElement | null
}

function getCheckBoxCheckPath(group: SVGElement): SVGPathElement | null {
  return (group.querySelector(':scope > path[data-uisvg-part="checkbox-check"]') ??
    group.querySelector(':scope > path')) as SVGPathElement | null
}

function getCheckBoxLabelText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="checkbox-label"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

/** 复选框为小固定件：缩放柄拖动后仍恢复 12×12 + 对勾 + 标签（避免整组比例缩放） */
function relayoutCheckBoxChrome(group: SVGElement): void {
  const box = getCheckBoxBoxRect(group)
  if (box) {
    box.setAttribute('x', String(CHECKBOX_BOX_X))
    box.setAttribute('y', String(CHECKBOX_BOX_Y))
    box.setAttribute('width', String(CHECKBOX_BOX_W))
    box.setAttribute('height', String(CHECKBOX_BOX_H))
  }
  const p = getCheckBoxCheckPath(group)
  if (p) {
    p.setAttribute('d', CHECKBOX_CHECK_PATH_D)
    p.setAttribute('stroke-width', CHECKBOX_CHECK_STROKE_WIDTH)
  }
  const t = getCheckBoxLabelText(group)
  if (t) {
    t.setAttribute('x', String(CHECKBOX_LABEL_X))
    t.setAttribute('y', String(CHECKBOX_LABEL_Y))
    t.setAttribute('font-size', CHECKBOX_LABEL_FONT_SIZE)
  }
}

export function ensureCheckBoxResizeSynced(group: SVGElement): void {
  if (!isCheckBoxResizeGroup(group)) return
  relayoutCheckBoxChrome(group)
}

function isRadioButtonResizeGroup(group: SVGElement): boolean {
  if (group.tagName.toLowerCase() !== 'g') return false
  if (group.querySelector(':scope > circle[data-uisvg-part="radiobutton-outer"]')) return true
  const kind = winFlatBarKindLower(group)
  const sem = findFirstUisvgSemanticChild(group)?.localName.trim().toLowerCase() ?? ''
  if (kind !== 'radiobutton' && sem !== 'radiobutton') return false
  const circles = group.querySelectorAll(':scope > circle')
  const texts = group.querySelectorAll(':scope > text')
  return circles.length === 2 && texts.length === 1
}

function getRadioButtonOuterCircle(group: SVGElement): SVGCircleElement | null {
  return (group.querySelector(':scope > circle[data-uisvg-part="radiobutton-outer"]') ??
    ([...group.querySelectorAll(':scope > circle')][0] as SVGCircleElement | undefined) ??
    null) as SVGCircleElement | null
}

function getRadioButtonInnerCircle(group: SVGElement): SVGCircleElement | null {
  return (group.querySelector(':scope > circle[data-uisvg-part="radiobutton-inner"]') as SVGCircleElement | null) ??
    (([...group.querySelectorAll(':scope > circle')][1] as SVGCircleElement | undefined) ?? null)
}

function getRadioButtonLabelText(group: SVGElement): SVGTextElement | null {
  return (group.querySelector(':scope > text[data-uisvg-part="radiobutton-label"]') ??
    group.querySelector(':scope > text')) as SVGTextElement | null
}

function relayoutRadioButtonChrome(group: SVGElement): void {
  const outer = getRadioButtonOuterCircle(group)
  if (outer) {
    outer.setAttribute('cx', String(RADIO_OUTER_CX))
    outer.setAttribute('cy', String(RADIO_OUTER_CY))
    outer.setAttribute('r', String(RADIO_OUTER_R))
    outer.setAttribute('fill', '#ffffff')
    outer.setAttribute('stroke', '#adadad')
  }
  const inner = getRadioButtonInnerCircle(group)
  if (inner) {
    inner.setAttribute('cx', String(RADIO_INNER_CX))
    inner.setAttribute('cy', String(RADIO_INNER_CY))
    inner.setAttribute('r', String(RADIO_INNER_R))
    inner.setAttribute('fill', '#1a1a1a')
  }
  const t = getRadioButtonLabelText(group)
  if (t) {
    t.setAttribute('x', String(RADIO_LABEL_X))
    t.setAttribute('y', String(RADIO_LABEL_Y))
    t.setAttribute('font-size', RADIO_LABEL_FONT_SIZE)
  }
}

export function ensureRadioButtonResizeSynced(group: SVGElement): void {
  if (!isRadioButtonResizeGroup(group)) return
  relayoutRadioButtonChrome(group)
}

/** Form、ToolStrip、上下文菜单、GroupBox、TabControl、SplitContainer、FlowLayoutPanel、Button、MaskedTextBox、DateTimePicker、RichTextBox、ListBox、ListView、DataGridView、TreeView、MonthCalendar、TrackBar、ProgressBar、HScrollBar、VScrollBar、CheckedListBox、ComboBox、PropertyGrid、PictureBox、NumericUpDown、CheckBox、RadioButton、横向菜单/状态条等 */
export function ensureResizeChromeLayoutSynced(group: SVGElement): void {
  ensureFormResizeChromeSynced(group)
  ensureToolStripResizeSynced(group)
  ensureContextMenuStripResizeSynced(group)
  ensureGroupBoxResizeSynced(group)
  ensureTabControlResizeSynced(group)
  ensureSplitContainerResizeSynced(group)
  ensureFlowLayoutPanelResizeSynced(group)
  ensureButtonResizeSynced(group)
  ensureMaskedTextBoxResizeSynced(group)
  ensureDateTimePickerResizeSynced(group)
  ensureRichTextBoxResizeSynced(group)
  ensureListBoxResizeSynced(group)
  ensureListViewResizeSynced(group)
  ensureDataGridViewResizeSynced(group)
  ensureTreeViewResizeSynced(group)
  ensureMonthCalendarResizeSynced(group)
  ensureTrackBarResizeSynced(group)
  ensureProgressBarResizeSynced(group)
  ensureHScrollBarResizeSynced(group)
  ensureVScrollBarResizeSynced(group)
  ensureCheckedListBoxResizeSynced(group)
  ensureComboBoxResizeSynced(group)
  ensurePropertyGridResizeSynced(group)
  ensurePictureBoxResizeSynced(group)
  ensureNumericUpDownResizeSynced(group)
  ensureCheckBoxResizeSynced(group)
  ensureRadioButtonResizeSynced(group)
  ensureWinFlatBarResizeSynced(group)
}

/**
 * Form：`form-frame` 尺寸变化后，标题栏与外框同宽且高度固定；客户区边距固定；子控件按客户区比例映射。
 */
function relayoutFormResizeChrome(group: SVGElement, b: { ox: number; oy: number; ow: number; oh: number }): void {
  const { ox, oy, ow, oh } = b
  const nw = ow
  const nh = oh

  const titleBar = group.querySelector('[data-uisvg-part="form-titlebar"]') as SVGRectElement | null
  if (titleBar) {
    titleBar.setAttribute('x', String(ox))
    titleBar.setAttribute('y', String(oy))
    titleBar.setAttribute('width', String(nw))
    titleBar.setAttribute('height', String(FORM_TITLE_BAR_HEIGHT))
  }

  const titleText = group.querySelector('[data-uisvg-part="form-title-text"]') as SVGTextElement | null
  if (titleText) {
    titleText.setAttribute('x', String(ox + 8))
    titleText.setAttribute('y', String(oy + 18))
    titleText.setAttribute('font-size', FORM_TITLE_TEXT_FONT_SIZE)
  }

  const { minSlotLeft, maxSlotLeft, closeSlotLeft } = layoutFormCaptionSlots(ox, nw)

  const minLine = group.querySelector('[data-uisvg-part="form-caption-min"]') as SVGLineElement | null
  if (minLine) {
    const ly = oy + FORM_CAPTION_MIN_LINE_LOCAL_Y
    minLine.setAttribute('x1', String(minSlotLeft + 5))
    minLine.setAttribute('y1', String(ly))
    minLine.setAttribute('x2', String(minSlotLeft + 13))
    minLine.setAttribute('y2', String(ly))
  }

  const maxRect = group.querySelector('[data-uisvg-part="form-caption-max"]') as SVGRectElement | null
  if (maxRect) {
    maxRect.setAttribute('x', String(maxSlotLeft + 4))
    maxRect.setAttribute('y', String(oy + FORM_CAPTION_ICON_TOP_LOCAL))
    maxRect.setAttribute('width', '10')
    maxRect.setAttribute('height', '10')
  }

  const closePath = group.querySelector('[data-uisvg-part="form-caption-close"]') as SVGPathElement | null
  if (closePath) {
    const cl = closeSlotLeft
    const top = oy + FORM_CAPTION_ICON_TOP_LOCAL
    const bot = top + 12
    closePath.setAttribute(
      'd',
      `M ${cl + 3} ${top} L ${cl + 15} ${bot} M ${cl + 15} ${top} L ${cl + 3} ${bot}`,
    )
  }

  const client = group.querySelector('[data-uisvg-part="form-client"]') as SVGRectElement | null
  if (client) {
    client.setAttribute('x', String(ox + FORM_HORIZONTAL_INSET))
    client.setAttribute('y', String(oy + FORM_TITLE_BAR_HEIGHT))
    client.setAttribute('width', String(Math.max(8, nw - 2 * FORM_HORIZONTAL_INSET)))
    client.setAttribute(
      'height',
      String(Math.max(8, nh - FORM_TITLE_BAR_HEIGHT - FORM_BOTTOM_RESERVE)),
    )
  }
}

/**
 * 实际改写几何属性的目标元素（例如选中 `g` 时改其下的 `rect`）。
 */
export function getResizeTargetElement(el: SVGElement | null): SVGElement | null {
  if (!el) return null
  const tag = el.tagName.toLowerCase()
  if (tag === 'rect' || tag === 'circle' || tag === 'ellipse') return el
  if (tag === 'g') {
    const frame = el.querySelector(':scope > rect[data-uisvg-part="form-frame"]') as SVGRectElement | null
    if (frame) return frame
    const barFace = el.querySelector(':scope > rect[data-uisvg-part="win-bar-face"]') as SVGRectElement | null
    if (barFace) return barFace
    const toolFace = el.querySelector(':scope > rect[data-uisvg-part="toolstrip-face"]') as SVGRectElement | null
    if (toolFace) return toolFace
    const ctxFace = el.querySelector(':scope > rect[data-uisvg-part="contextmenu-face"]') as SVGRectElement | null
    if (ctxFace) return ctxFace
    const gbBorder = el.querySelector(':scope > rect[data-uisvg-part="groupbox-border"]') as SVGRectElement | null
    if (gbBorder) return gbBorder
    const tcClient = el.querySelector(':scope > rect[data-uisvg-part="tabcontrol-client"]') as SVGRectElement | null
    if (tcClient) return tcClient
    const scLeft = el.querySelector(':scope > rect[data-uisvg-part="splitcontainer-left-pane"]') as SVGRectElement | null
    if (scLeft) return scLeft
    const flFace = el.querySelector(':scope > rect[data-uisvg-part="flowlayout-face"]') as SVGRectElement | null
    if (flFace) return flFace
    const btnFace = el.querySelector(':scope > rect[data-uisvg-part="button-face"]') as SVGRectElement | null
    if (btnFace) return btnFace
    const mtbFace = el.querySelector(':scope > rect[data-uisvg-part="maskedtextbox-face"]') as SVGRectElement | null
    if (mtbFace) return mtbFace
    const dtpFace = el.querySelector(':scope > rect[data-uisvg-part="datetimepicker-face"]') as SVGRectElement | null
    if (dtpFace) return dtpFace
    const rtbFace = el.querySelector(':scope > rect[data-uisvg-part="richtextbox-face"]') as SVGRectElement | null
    if (rtbFace) return rtbFace
    const lbFace = el.querySelector(':scope > rect[data-uisvg-part="listbox-face"]') as SVGRectElement | null
    if (lbFace) return lbFace
    const lvFace = el.querySelector(':scope > rect[data-uisvg-part="listview-face"]') as SVGRectElement | null
    if (lvFace) return lvFace
    const dgvFace = el.querySelector(':scope > rect[data-uisvg-part="datagridview-face"]') as SVGRectElement | null
    if (dgvFace) return dgvFace
    const tvFace = el.querySelector(':scope > rect[data-uisvg-part="treeview-face"]') as SVGRectElement | null
    if (tvFace) return tvFace
    const mcFace = el.querySelector(':scope > rect[data-uisvg-part="monthcalendar-face"]') as SVGRectElement | null
    if (mcFace) return mcFace
    const tbFace = el.querySelector(':scope > rect[data-uisvg-part="trackbar-face"]') as SVGRectElement | null
    if (tbFace) return tbFace
    const tbTrack = el.querySelector(':scope > rect[data-uisvg-part="trackbar-track"]') as SVGRectElement | null
    if (tbTrack) return tbTrack
    const progBarFace = el.querySelector(':scope > rect[data-uisvg-part="progressbar-face"]') as SVGRectElement | null
    if (progBarFace) return progBarFace
    const hScrollFace = el.querySelector(':scope > rect[data-uisvg-part="hscrollbar-face"]') as SVGRectElement | null
    if (hScrollFace) return hScrollFace
    const hScrollTrack = el.querySelector(':scope > rect[data-uisvg-part="hscrollbar-track"]') as SVGRectElement | null
    if (hScrollTrack) return hScrollTrack
    const vScrollFace = el.querySelector(':scope > rect[data-uisvg-part="vscrollbar-face"]') as SVGRectElement | null
    if (vScrollFace) return vScrollFace
    const vScrollTrack = el.querySelector(':scope > rect[data-uisvg-part="vscrollbar-track"]') as SVGRectElement | null
    if (vScrollTrack) return vScrollTrack
    const clbFace = el.querySelector(':scope > rect[data-uisvg-part="checkedlistbox-face"]') as SVGRectElement | null
    if (clbFace) return clbFace
    const comboFace = el.querySelector(':scope > rect[data-uisvg-part="combobox-face"]') as SVGRectElement | null
    if (comboFace) return comboFace
    const pgFace = el.querySelector(':scope > rect[data-uisvg-part="propertygrid-face"]') as SVGRectElement | null
    if (pgFace) return pgFace
    const pbFace = el.querySelector(':scope > rect[data-uisvg-part="picturebox-face"]') as SVGRectElement | null
    if (pbFace) return pbFace
    const nudFace = el.querySelector(':scope > rect[data-uisvg-part="numericupdown-face"]') as SVGRectElement | null
    if (nudFace) return nudFace
    const cbBox = el.querySelector(':scope > rect[data-uisvg-part="checkbox-box"]') as SVGRectElement | null
    if (cbBox) return cbBox
    const r = el.querySelector(':scope > rect')
    if (r) return r as SVGRectElement
    const rbOuter = el.querySelector(':scope > circle[data-uisvg-part="radiobutton-outer"]') as SVGCircleElement | null
    if (rbOuter) return rbOuter
    const c = el.querySelector(':scope > circle')
    if (c) return c as SVGCircleElement
    const e = el.querySelector(':scope > ellipse')
    if (e) return e as SVGEllipseElement
  }
  return null
}

export function canResizeSvgElement(el: SVGElement | null): boolean {
  if (!el) return false
  const id = el.getAttribute('id')
  if (id && isTopLevelLayerDomId(id)) return false
  return !!getResizeTargetElement(el)
}

function clampMin(v: number, min: number): number {
  return Math.max(min, v)
}

function applyResizeRect(el: SVGElement, handle: ResizeHandle, dx: number, dy: number): void {
  const box = {
    x: parseFloat(el.getAttribute('x') || '0'),
    y: parseFloat(el.getAttribute('y') || '0'),
    w: parseFloat(el.getAttribute('width') || '0'),
    h: parseFloat(el.getAttribute('height') || '0'),
  }
  applyResizeToBox(box, handle, dx, dy)
  el.setAttribute('x', String(box.x))
  el.setAttribute('y', String(box.y))
  el.setAttribute('width', String(box.w))
  el.setAttribute('height', String(box.h))
}

/** 将圆/椭圆的 bbox 视为矩形，缩放后再写回 cx,cy,r / rx,ry */
function applyResizeCircle(el: SVGElement, handle: ResizeHandle, dx: number, dy: number): void {
  const cx = parseFloat(el.getAttribute('cx') || '0')
  const cy = parseFloat(el.getAttribute('cy') || '0')
  const r = parseFloat(el.getAttribute('r') || '0')
  let x = cx - r
  let y = cy - r
  let w = 2 * r
  let h = 2 * r

  const rect = { x, y, w, h }
  applyResizeToBox(rect, handle, dx, dy)
  x = rect.x
  y = rect.y
  w = rect.w
  h = rect.h

  const nr = Math.max(MIN_SIZE / 2, Math.min(w, h) / 2)
  const ncx = x + w / 2
  const ncy = y + h / 2
  el.setAttribute('cx', String(ncx))
  el.setAttribute('cy', String(ncy))
  el.setAttribute('r', String(nr))
}

function applyResizeEllipse(el: SVGElement, handle: ResizeHandle, dx: number, dy: number): void {
  const cx = parseFloat(el.getAttribute('cx') || '0')
  const cy = parseFloat(el.getAttribute('cy') || '0')
  const rx = parseFloat(el.getAttribute('rx') || '0')
  const ry = parseFloat(el.getAttribute('ry') || '0')
  let x = cx - rx
  let y = cy - ry
  let w = 2 * rx
  let h = 2 * ry

  const rect = { x, y, w, h }
  applyResizeToBox(rect, handle, dx, dy)
  x = rect.x
  y = rect.y
  w = rect.w
  h = rect.h

  el.setAttribute('cx', String(x + w / 2))
  el.setAttribute('cy', String(y + h / 2))
  el.setAttribute('rx', String(Math.max(MIN_SIZE / 2, w / 2)))
  el.setAttribute('ry', String(Math.max(MIN_SIZE / 2, h / 2)))
}

function applyResizeToBox(
  box: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
): void {
  let { x, y, w, h } = box
  switch (handle) {
    case 'e':
      w = clampMin(w + dx, MIN_SIZE)
      break
    case 'w': {
      const nw = clampMin(w - dx, MIN_SIZE)
      x += w - nw
      w = nw
      break
    }
    case 's':
      h = clampMin(h + dy, MIN_SIZE)
      break
    case 'n': {
      const nh = clampMin(h - dy, MIN_SIZE)
      y += h - nh
      h = nh
      break
    }
    case 'se':
      w = clampMin(w + dx, MIN_SIZE)
      h = clampMin(h + dy, MIN_SIZE)
      break
    case 'sw': {
      const nw = clampMin(w - dx, MIN_SIZE)
      x += w - nw
      w = nw
      h = clampMin(h + dy, MIN_SIZE)
      break
    }
    case 'ne': {
      const nh = clampMin(h - dy, MIN_SIZE)
      y += h - nh
      h = nh
      w = clampMin(w + dx, MIN_SIZE)
      break
    }
    case 'nw': {
      const nw = clampMin(w - dx, MIN_SIZE)
      const nh = clampMin(h - dy, MIN_SIZE)
      x += w - nw
      y += h - nh
      w = nw
      h = nh
      break
    }
    default:
      break
  }
  box.x = x
  box.y = y
  box.w = w
  box.h = h
}

/**
 * 在 SVG 用户坐标系内按控制点增量缩放（与平移拖拽共用同一套坐标：client 差值 / scale）。
 * 若选中的是容器 `g` 且主边界为其子图元，则同步缩放组内其余内容（标题栏、嵌套控件等）。
 */
export function applyResizeDelta(el: SVGElement, handle: ResizeHandle, dx: number, dy: number): void {
  const target = getResizeTargetElement(el) ?? el
  const tag = target.tagName.toLowerCase()
  const containerIsGroup = el.tagName.toLowerCase() === 'g'
  const shouldPropagate =
    containerIsGroup && target !== el && (tag === 'rect' || tag === 'circle' || tag === 'ellipse')

  const oldB = shouldPropagate ? readElementBounds(target) : null

  if (tag === 'rect') {
    applyResizeRect(target, handle, dx, dy)
  } else if (tag === 'circle') {
    applyResizeCircle(target, handle, dx, dy)
  } else if (tag === 'ellipse') {
    applyResizeEllipse(target, handle, dx, dy)
  } else {
    return
  }

  if (shouldPropagate && oldB) {
    const nb = readElementBounds(target)
    const group = el as SVGElement
    if (isFormObjectRootWithResizeChrome(group)) {
      relayoutFormResizeChrome(group, nb)
      scaleFormNestedObjectRootsByClientBoundsChange(group, oldB, nb)
    } else if (isToolStripResizeGroup(group)) {
      relayoutToolStripChrome(group, nb)
    } else if (isContextMenuStripResizeGroup(group)) {
      relayoutContextMenuStripChrome(group, nb)
    } else if (isGroupBoxResizeGroup(group)) {
      relayoutGroupBoxChrome(group, nb)
    } else if (isTabControlResizeGroup(group)) {
      relayoutTabControlChrome(group, nb)
    } else if (isSplitContainerResizeGroup(group)) {
      relayoutSplitContainerChrome(group, nb)
    } else if (isFlowLayoutPanelResizeGroup(group)) {
      relayoutFlowLayoutPanelChrome(group, nb)
    } else if (isButtonResizeGroup(group)) {
      relayoutButtonChrome(group, nb)
    } else if (isMaskedTextBoxResizeGroup(group)) {
      relayoutMaskedTextBoxChrome(group, nb)
    } else if (isDateTimePickerResizeGroup(group)) {
      relayoutDateTimePickerChrome(group, nb)
    } else if (isRichTextBoxResizeGroup(group)) {
      relayoutRichTextBoxChrome(group, nb)
    } else if (isListBoxResizeGroup(group)) {
      relayoutListBoxChrome(group, nb)
    } else if (isListViewResizeGroup(group)) {
      relayoutListViewChrome(group, nb)
    } else if (isDataGridViewResizeGroup(group)) {
      relayoutDataGridViewChrome(group, nb)
    } else if (isTreeViewResizeGroup(group)) {
      relayoutTreeViewChrome(group, nb)
    } else if (isMonthCalendarResizeGroup(group)) {
      relayoutMonthCalendarChrome(group, nb)
    } else if (isTrackBarResizeGroup(group)) {
      relayoutTrackBarChrome(group, nb)
    } else if (isProgressBarResizeGroup(group)) {
      relayoutProgressBarChrome(group, nb)
    } else if (isHScrollBarResizeGroup(group)) {
      relayoutHScrollBarChrome(group, nb)
    } else if (isVScrollBarResizeGroup(group)) {
      relayoutVScrollBarChrome(group, nb)
    } else if (isCheckedListBoxResizeGroup(group)) {
      relayoutCheckedListBoxChrome(group, nb)
    } else if (isComboBoxResizeGroup(group)) {
      relayoutComboBoxChrome(group, nb)
    } else if (isPropertyGridResizeGroup(group)) {
      relayoutPropertyGridChrome(group, nb)
    } else if (isPictureBoxResizeGroup(group)) {
      relayoutPictureBoxChrome(group, nb)
    } else if (isNumericUpDownResizeGroup(group)) {
      relayoutNumericUpDownChrome(group, nb)
    } else if (isCheckBoxResizeGroup(group)) {
      relayoutCheckBoxChrome(group)
    } else if (isRadioButtonResizeGroup(group)) {
      relayoutRadioButtonChrome(group)
    } else if (isWinFlatBarResizeGroup(group)) {
      relayoutWinFlatBarChrome(group, nb)
    } else {
      scaleGroupInteriorAfterPrimaryBoundsChange(group, target, oldB, {
        nx: nb.ox,
        ny: nb.oy,
        nw: nb.ow,
        nh: nb.oh,
      })
    }
  }
}
