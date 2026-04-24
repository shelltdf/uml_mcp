/**
 * Form 内 MenuStrip / ToolStrip / StatusStrip 的条带布局、与预览同参的落位计算。
 */
import { getInnerClientBoundsForContainer, getWindowsControlPlacementSize } from './libraryPlacement'
import {
  TOOLSTRIP_ITEM_GAP,
  TOOLSTRIP_ITEM_HEIGHT,
  TOOLSTRIP_ITEM_INSET_X,
  TOOLSTRIP_ITEM_INSET_Y,
  TOOLSTRIP_ITEM_WIDTH,
} from './libraryPlacement'
import { ensureToolStripResizeSynced, ensureWinFlatBarResizeSynced } from './svgElementResize'
import { isUisvgObjectRootG, readUisvgBundleFromObjectRoot, writeUisvgBundleToObjectRoot } from './uisvgMetaNode'
import { migrateLegacyUisvgMetadata } from './uisvgDocument'
import type { UisvgObjectBundleV1 } from './uisvgMetaNode'

const MENU_H = 22
const STATUS_H = 22
const TOOL_H = 26
const TOOL_VW = 26

export const FORM_BAR_CONTROL_IDS = new Set(['MenuBar', 'ToolBar', 'StatusBar', 'MenuStrip', 'ToolStrip', 'StatusStrip'])

export type ToolStripDockKind = 'Top' | 'Bottom' | 'Left' | 'Right' | 'None'

export function isFormBarControlId(id: string): boolean {
  return FORM_BAR_CONTROL_IDS.has(id.replace(/^win\./, ''))
}

export function isFormObjectRootG(g: Element): boolean {
  if (g.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(g)) return false
  const b = readUisvgBundleFromObjectRoot(g)
  return b.uisvgLocalName.replace(/^win\./, '') === 'Form'
}

function defaultWForBar(localName: string): number {
  return getWindowsControlPlacementSize(localName).w
}

function parseToolStripDock(uiProps: Record<string, string>): ToolStripDockKind {
  const raw = (uiProps['Dock'] ?? 'Top').trim()
  if (raw === 'Bottom' || raw === 'Left' || raw === 'Right' || raw === 'None') return raw
  return 'Top'
}

function setToolStripDock(bundle: UisvgObjectBundleV1, dock: ToolStripDockKind): void {
  bundle.uiProps = { ...bundle.uiProps, Dock: dock }
}

/**
 * 根据指针在 Form 客户区内的位置，为 ToolStrip 选 Dock（与 `relayoutFormBars` 写入值一致）。
 */
export function computeNearestToolStripDock(
  inner: { x: number; y: number; width: number; height: number },
  px: number,
  py: number,
): ToolStripDockKind {
  const cx = inner.x + inner.width / 2
  const cy = inner.y + inner.height / 2
  const dTop = Math.abs(py - inner.y) + Math.abs(px - cx) * 0.01
  const dBot = Math.abs(py - (inner.y + inner.height)) + Math.abs(px - cx) * 0.01
  const dLeft = Math.abs(px - inner.x) + Math.abs(py - cy) * 0.01
  const dRight = Math.abs(px - (inner.x + inner.width)) + Math.abs(py - cy) * 0.01
  const dMinEdge = Math.min(dTop, dBot, dLeft, dRight)
  const dCenter = Math.hypot(px - cx, py - cy)
  if (dCenter < dMinEdge * 0.9 && dCenter < Math.min(inner.width, inner.height) * 0.32) {
    return 'None'
  }
  if (dTop <= dBot && dTop <= dLeft && dTop <= dRight) return 'Top'
  if (dBot <= dLeft && dBot <= dRight) return 'Bottom'
  if (dLeft <= dRight) return 'Left'
  return 'Right'
}

type BarItem = { g: SVGGElement | null; id: string; local: string; w: number; h: number }

function collectFormBarItems(formG: Element, virtual?: { id: string; local: string } | null): BarItem[] {
  const out: BarItem[] = []
  for (let i = 0; i < formG.children.length; i++) {
    const c = formG.children[i] as Element
    if (c.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(c)) continue
    const b = readUisvgBundleFromObjectRoot(c)
    const local = b.uisvgLocalName.replace(/^win\./, '') || 'Panel'
    if (!isFormBarControlId(local)) continue
    if (virtual && c.getAttribute('id') === virtual.id) continue
    const sz = getWindowsControlPlacementSize(local)
    out.push({ g: c as SVGGElement, id: c.getAttribute('id') || '', local, w: sz.w, h: sz.h })
  }
  if (virtual && isFormBarControlId(virtual.local)) {
    const sz = getWindowsControlPlacementSize(virtual.local)
    out.push({ g: null, id: virtual.id, local: virtual.local, w: sz.w, h: sz.h })
  }
  return out
}

export type FormBarPlacedBox = {
  id: string
  local: string
  x: number
  y: number
  w: number
  h: number
  dock: ToolStripDockKind | 'Menu' | 'Status'
}

/**
 * 计算全量条带位姿（不写 DOM），供 `relayoutFormBars` 与 `computeFormBarSnapPreview` 共用。
 */
export function computePlacedFormBarBoxes(
  formG: Element,
  dockById: Map<string, ToolStripDockKind>,
  virtualBar?: { id: string; local: string } | null,
): { inner: { x: number; y: number; width: number; height: number }; boxes: FormBarPlacedBox[] } | null {
  if (!isFormObjectRootG(formG)) return null
  const innerRaw = getInnerClientBoundsForContainer('Form', formG)
  const inner = { x: innerRaw.x, y: innerRaw.y, width: innerRaw.width, height: innerRaw.height }
  const items = collectFormBarItems(formG, virtualBar ?? null)
  if (!items.length) return { inner, boxes: [] }

  const statuses = items.filter((i) => i.local === 'StatusBar' || i.local === 'StatusStrip')
  const menus = items.filter((i) => i.local === 'MenuBar' || i.local === 'MenuStrip')
  const status = statuses[0] ?? null
  const tools = items.filter((i) => i.local === 'ToolBar' || i.local === 'ToolStrip')

  const getDock = (id: string): ToolStripDockKind => dockById.get(id) || 'Top'
  const topTools = tools.filter((t) => getDock(t.id) === 'Top')
  const bottomTools = tools.filter((t) => getDock(t.id) === 'Bottom')
  const leftTools = tools.filter((t) => getDock(t.id) === 'Left')
  const rightTools = tools.filter((t) => getDock(t.id) === 'Right')
  const floatTools = tools.filter((t) => getDock(t.id) === 'None')
  const floatingStatus = statuses.length > 1 ? statuses.slice(1) : []

  const boxes: FormBarPlacedBox[] = []

  let y = inner.y
  for (const m of menus) {
    boxes.push({ id: m.id, local: m.local, x: inner.x, y, w: inner.width, h: MENU_H, dock: 'Menu' })
    y += MENU_H
  }
  for (const t of topTools) {
    boxes.push({ id: t.id, local: t.local, x: inner.x, y, w: inner.width, h: TOOL_H, dock: 'Top' })
    y += TOOL_H
  }
  const yAfterTop = y

  const yBottom = inner.y + inner.height
  const yStatusTop = status ? yBottom - STATUS_H : yBottom
  const nBot = bottomTools.length
  for (let i = 0; i < nBot; i++) {
    const t = bottomTools[i]!
    const yy = yStatusTop - (nBot - i) * TOOL_H
    boxes.push({ id: t.id, local: t.local, x: inner.x, y: yy, w: inner.width, h: TOOL_H, dock: 'Bottom' })
  }
  if (status) {
    boxes.push({ id: status.id, local: status.local, x: inner.x, y: yStatusTop, w: inner.width, h: STATUS_H, dock: 'Status' })
  }

  const yTopOfBottomBand = yStatusTop - nBot * TOOL_H
  const yMid0 = yAfterTop
  const yMid1 = yTopOfBottomBand
  const midH = Math.max(8, yMid1 - yMid0)
  const leftW = leftTools.length * TOOL_VW
  const rightW = rightTools.length * TOOL_VW
  const baseFloatX = inner.x + leftW + 4
  const baseFloatW = Math.max(8, inner.width - leftW - rightW - 8)

  for (let i = 0; i < leftTools.length; i++) {
    const t = leftTools[i]!
    boxes.push({ id: t.id, local: t.local, x: inner.x + i * TOOL_VW, y: yMid0, w: TOOL_VW, h: midH, dock: 'Left' })
  }
  for (let i = 0; i < rightTools.length; i++) {
    const t = rightTools[i]!
    boxes.push({
      id: t.id,
      local: t.local,
      x: inner.x + inner.width - (i + 1) * TOOL_VW,
      y: yMid0,
      w: TOOL_VW,
      h: midH,
      dock: 'Right',
    })
  }
  for (let i = 0; i < floatTools.length; i++) {
    const t = floatTools[i]!
    const row = Math.floor(i / 3)
    const col = i % 3
    boxes.push({
      id: t.id,
      local: t.local,
      x: baseFloatX + col * 8,
      y: yMid0 + 4 + row * 32,
      w: defaultWForBar('ToolStrip'),
      h: TOOL_H,
      dock: 'None',
    })
  }
  for (let j = 0; j < floatingStatus.length; j++) {
    const s = floatingStatus[j]!
    boxes.push({
      id: s.id,
      local: s.local,
      x: baseFloatX + 12,
      y: yMid0 + 6 + (floatTools.length + j) * 10,
      w: Math.min(200, baseFloatW),
      h: STATUS_H,
      dock: 'Status',
    })
  }

  return { inner, boxes }
}

function buildDockMapFromForm(
  formG: Element,
  overrides?: { id: string; dock: ToolStripDockKind } | null,
  virtualBar?: { id: string; local: string } | null,
): Map<string, ToolStripDockKind> {
  const m = new Map<string, ToolStripDockKind>()
  for (const it of collectFormBarItems(formG, virtualBar ?? null)) {
    if (it.local !== 'ToolBar' && it.local !== 'ToolStrip') continue
    if (it.g) {
      const b = readUisvgBundleFromObjectRoot(it.g)
      m.set(it.id, parseToolStripDock(b.uiProps))
    } else {
      m.set(it.id, parseToolStripDock({ Dock: 'Top' }))
    }
  }
  if (overrides) m.set(overrides.id, overrides.dock)
  return m
}

function applyPlacedToDom(formG: Element, boxes: FormBarPlacedBox[], dockById: Map<string, ToolStripDockKind>): void {
  for (const [id, d] of dockById) {
    const g = formG.ownerDocument?.getElementById(id) as SVGGElement | null
    if (!g) continue
    if (!collectFormBarItems(formG, null).some((x) => x.id === id && (x.local === 'ToolBar' || x.local === 'ToolStrip'))) continue
    const b = readUisvgBundleFromObjectRoot(g)
    setToolStripDock(b, d)
    writeUisvgBundleToObjectRoot(g, b)
  }
  for (const b of boxes) {
    const g = formG.ownerDocument?.getElementById(b.id) as SVGGElement | null
    if (!g) continue
    g.setAttribute('transform', `translate(${b.x},${b.y})`)
    if (b.local === 'MenuBar' || b.local === 'MenuStrip' || b.local === 'StatusBar' || b.local === 'StatusStrip') {
      const face = g.querySelector(':scope > rect[data-uisvg-part="win-bar-face"]') as SVGRectElement | null
      if (face) {
        face.setAttribute('x', '0')
        face.setAttribute('y', '0')
        face.setAttribute('width', String(b.w))
        face.setAttribute('height', String(b.h))
      }
      ensureWinFlatBarResizeSynced(g)
    } else if (b.local === 'ToolBar' || b.local === 'ToolStrip') {
      const face = g.querySelector(':scope > rect[data-uisvg-part="toolstrip-face"]') as SVGRectElement | null
      if (face) {
        face.setAttribute('x', '0')
        face.setAttribute('y', '0')
        face.setAttribute('width', String(b.w))
        face.setAttribute('height', String(b.h))
      }
      if (b.dock === 'Left' || b.dock === 'Right') {
        const items = [...g.querySelectorAll(':scope > rect[data-uisvg-part="toolstrip-item"]')]
        let yy = TOOLSTRIP_ITEM_INSET_Y
        const ix = TOOLSTRIP_ITEM_INSET_X
        for (const r of items) {
          r.setAttribute('x', String(ix))
          r.setAttribute('y', String(yy))
          r.setAttribute('width', String(TOOLSTRIP_ITEM_WIDTH))
          r.setAttribute('height', String(TOOLSTRIP_ITEM_HEIGHT))
          yy += TOOLSTRIP_ITEM_HEIGHT + TOOLSTRIP_ITEM_GAP
        }
      } else {
        ensureToolStripResizeSynced(g)
      }
    }
  }
}

/**
 * 全量重排并写回 DOM、ToolStrip 的 `Dock` uiProps。
 */
export function relayoutFormBars(formG: Element): void {
  const m = buildDockMapFromForm(formG, null)
  const plan = computePlacedFormBarBoxes(formG, m)
  if (!plan) return
  applyPlacedToDom(formG, plan.boxes, m)
}

export type FormBarSnapPreview = {
  x: number
  y: number
  width: number
  height: number
  illegal: boolean
  /** 预览 ToolStrip 时给出目标 Dock；Menu/Status 为 null */
  targetDock: ToolStripDockKind | null
}

/**
 * 单条「若此刻松手」的吸附外框，与 `relayoutFormBars` 的放置公式一致（`movingDomId` 的 dock 会按指针覆盖）。
 * 若被拖条尚不在 `formG` 下，仍可用 `virtualBar` 参与与 commit 同公式的全量布局（改父/组件库落点预览）。
 */
export function computeFormBarSnapPreview(
  formG: Element,
  options: { movingDomId: string; localName: string; pointerLocalX: number; pointerLocalY: number },
): FormBarSnapPreview | null {
  if (!isFormObjectRootG(formG)) return null
  if (!isFormBarControlId(options.localName)) return null
  const doc = formG.ownerDocument
  const domEl = doc?.getElementById(options.movingDomId) ?? null
  const inForm = !!(domEl && formG.contains(domEl))
  const virtualBar: { id: string; local: string } | null =
    !inForm && isFormBarControlId(options.localName) ? { id: options.movingDomId, local: options.localName } : null

  const innerR = getInnerClientBoundsForContainer('Form', formG)
  const inner = { x: innerR.x, y: innerR.y, width: innerR.width, height: innerR.height }

  const stCount = collectFormBarItems(formG, virtualBar).filter((i) => i.local === 'StatusBar' || i.local === 'StatusStrip').length
  if (stCount > 1) {
    return {
      x: inner.x + 4,
      y: inner.y + 4,
      width: Math.min(200, inner.width - 8),
      height: STATUS_H,
      illegal: true,
      targetDock: null,
    }
  }

  const dmap = buildDockMapForPreview(
    formG,
    options.movingDomId,
    options.localName,
    options.pointerLocalX,
    options.pointerLocalY,
    inner,
    virtualBar,
  )
  const plan = computePlacedFormBarBoxes(formG, dmap, virtualBar)
  if (!plan) return null
  const b = plan.boxes.find((x) => x.id === options.movingDomId)
  if (!b) return null
  return {
    x: b.x,
    y: b.y,
    width: b.w,
    height: b.h,
    illegal: false,
    targetDock: options.localName === 'ToolBar' || options.localName === 'ToolStrip' ? dmap.get(options.movingDomId) ?? 'Top' : null,
  }
}

function buildDockMapForPreview(
  formG: Element,
  movingId: string,
  local: string,
  plx: number,
  ply: number,
  inner: { x: number; y: number; width: number; height: number },
  virtualBar: { id: string; local: string } | null,
): Map<string, ToolStripDockKind> {
  const m = new Map<string, ToolStripDockKind>()
  for (const it of collectFormBarItems(formG, virtualBar)) {
    if (it.local !== 'ToolBar' && it.local !== 'ToolStrip') continue
    let d = it.g
      ? parseToolStripDock(readUisvgBundleFromObjectRoot(it.g).uiProps ?? {})
      : parseToolStripDock({ Dock: 'Top' })
    if (it.id === movingId && (local === 'ToolBar' || local === 'ToolStrip')) d = computeNearestToolStripDock(inner, plx, ply)
    m.set(it.id, d)
  }
  return m
}

export function relayoutFormBarsInSvgString(svgXml: string, formDomId: string): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const el = doc.getElementById(formDomId) as unknown as SVGGElement | null
  if (!el) return null
  relayoutFormBars(el)
  return new XMLSerializer().serializeToString(doc)
}

export function findEnclosingFormDomId(svgXml: string, childDomId: string): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  let n: Element | null = doc.getElementById(childDomId)
  for (let i = 0; i < 64 && n; i++) {
    if (n.tagName.toLowerCase() === 'g' && isFormObjectRootG(n)) {
      return n.getAttribute('id')?.trim() || null
    }
    n = n.parentElement
  }
  return null
}

/** 在提交条带拖拽/改父后：根据客户区为 ToolStrip 选 Dock 并全量重排。 */
export function updateToolStripDockByPointerAndRelayout(
  formG: Element,
  childDomId: string,
  pointerLocalX: number,
  pointerLocalY: number,
): void {
  if (!isFormObjectRootG(formG)) return
  const it = collectFormBarItems(formG, null).find((x) => x.id === childDomId)
  if (!it || (it.local !== 'ToolBar' && it.local !== 'ToolStrip') || !it.g) return
  const innerR = getInnerClientBoundsForContainer('Form', formG)
  const d = computeNearestToolStripDock(
    { x: innerR.x, y: innerR.y, width: innerR.width, height: innerR.height },
    pointerLocalX,
    pointerLocalY,
  )
  const b = readUisvgBundleFromObjectRoot(it.g)
  setToolStripDock(b, d)
  writeUisvgBundleToObjectRoot(it.g, b)
  relayoutFormBars(formG)
}
