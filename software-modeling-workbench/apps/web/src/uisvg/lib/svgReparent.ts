/**
 * 画布拖拽结束后：用鼠标**视口坐标**检测落在哪些 `g[id]` 的 `getBoundingClientRect` 内（与 CSS 变换一致）；
 * 候选中取 **DOM 相对 layer-root 最深**者；**同深度**时取 **屏幕盒面积更大**的（兄弟重叠时 Form 通常大于 Button，避免判成小控件）。
 */
import { applyTranslateToSVGElement } from './svgElementMove'
import { readUisvgBundleFromObjectRoot, isUisvgObjectRootG } from './uisvgMetaNode'
import {
  ensureUisvgXmlnsOnRootSvg,
  findLayerRoot,
  getGraphicsElementByDomId,
  isTopLevelLayerDomId,
  LAYER_SIBLING_DOM_ID,
  migrateLegacyUisvgMetadata,
  removeEditorCanvasChrome,
} from './uisvgDocument'
import { ensureAllObjectRootChildrenHaveIds } from './uisvgMetaNode'

/** 可接受子控件的 WinForms 类（与 `libraryPlacement.innerClientBoundsForContainerKind` 一致） */
const WIN_CONTAINER_CONTROL_IDS = new Set([
  'Form',
  'Panel',
  'GroupBox',
  'TabControl',
  'SplitContainer',
  'FlowLayoutPanel',
  'TableLayoutPanel',
])

function clientToSvgUser(svg: SVGSVGElement, clientX: number, clientY: number): DOMPoint {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const m = svg.getScreenCTM()
  if (!m) return new DOMPoint(clientX, clientY)
  return pt.matrixTransform(m.inverse())
}

/** 画布根 SVG 上：屏幕坐标 → 根 SVG 用户坐标（与选中框/拖拽一致） */
export function canvasClientToSvgUser(svg: SVGSVGElement, clientX: number, clientY: number): DOMPoint {
  return clientToSvgUser(svg, clientX, clientY)
}

/** 拖拽改父级后保持屏幕位置（迭代修正，兼容带 transform 的父级） */
function preserveVisualAfterReparent(svg: SVGSVGElement, el: SVGGraphicsElement, newParent: Element): void {
  const target = el.getBoundingClientRect()
  newParent.appendChild(el)
  for (let i = 0; i < 14; i++) {
    const now = el.getBoundingClientRect()
    const dcx = target.left - now.left
    const dcy = target.top - now.top
    if (Math.abs(dcx) < 0.45 && Math.abs(dcy) < 0.45) break
    const a = clientToSvgUser(svg, now.left, now.top)
    const b = clientToSvgUser(svg, now.left + dcx, now.top + dcy)
    applyTranslateToSVGElement(el as SVGElement, b.x - a.x, b.y - a.y)
  }
}

function depthUnderLayerRoot(layerRoot: Element, el: Element): number {
  let d = 0
  let n: Element | null = el
  while (n && n !== layerRoot) {
    d++
    n = n.parentElement
  }
  return n === layerRoot ? d : -1
}

function pointInClientRect(clientX: number, clientY: number, r: DOMRect, inset = 2): boolean {
  return (
    clientX >= r.left - inset &&
    clientX <= r.right + inset &&
    clientY >= r.top - inset &&
    clientY <= r.bottom + inset
  )
}

/**
 * 用屏幕矩形判断落点；同深度多选时取面积更大者（解决 Form/Button 兄弟叠放）。
 * @param dragged 库拖入新控件时传 `null`，不做「自身/后代」排除。
 */
function findDropTargetContainer(
  layerRoot: Element,
  clientX: number,
  clientY: number,
  dragged: SVGGraphicsElement | null,
): Element | null {
  const groups = layerRoot.querySelectorAll('g[id]')
  let best: { el: Element; depth: number; area: number } | null = null

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i] as SVGGraphicsElement
    const id = g.getAttribute('id')
    if (!id || isTopLevelLayerDomId(id) || id === LAYER_SIBLING_DOM_ID) continue
    if (dragged) {
      if (g === dragged) continue
      if (dragged.contains(g) && g !== dragged) continue
    }

    let r: DOMRect
    try {
      r = g.getBoundingClientRect()
    } catch {
      continue
    }
    if (r.width < 1 && r.height < 1) continue
    if (!pointInClientRect(clientX, clientY, r)) continue

    const depth = depthUnderLayerRoot(layerRoot, g)
    if (depth < 0) continue

    const area = Math.max(1, r.width * r.height)

    if (!best) {
      best = { el: g, depth, area }
      continue
    }
    if (depth > best.depth) {
      best = { el: g, depth, area }
    } else if (depth === best.depth && area > best.area) {
      best = { el: g, depth, area }
    }
  }

  return best?.el ?? null
}

function winContainerIdFromBundle(b: { uisvgLocalName: string }): string {
  return b.uisvgLocalName.replace(/^win\./, '')
}

/**
 * 从指针下命中对象根起向上找第一个可接受子控件的 WinForms 容器；否则返回 `layerRoot`。
 * @param dragged 画布上拖拽已有对象时传入，用于命中检测排除自身与后代。
 */
function resolveWinContainerDropTarget(
  layerRoot: Element,
  clientX: number,
  clientY: number,
  dragged: SVGGraphicsElement | null,
): Element {
  const inner = findDropTargetContainer(layerRoot, clientX, clientY, dragged)
  if (!inner) return layerRoot
  let n: Element | null = inner
  while (n && n !== layerRoot) {
    if (n.tagName.toLowerCase() === 'g') {
      const gid = n.getAttribute('id')?.trim()
      if (gid && isUisvgObjectRootG(n)) {
        const b = readUisvgBundleFromObjectRoot(n)
        const cid = winContainerIdFromBundle(b)
        if (WIN_CONTAINER_CONTROL_IDS.has(cid)) {
          return n
        }
      }
    }
    n = n.parentElement
  }
  return layerRoot
}

/**
 * 从指针下最深命中 `g` 向上找第一个「可放子控件」的 WinForms 容器对象根；否则返回 `layerRoot`。
 * 用于组件库拖入：点在 Button 上会挂到其父 Form。
 */
export function findWinContainerParentForPaletteDrop(
  layerRoot: Element,
  clientX: number,
  clientY: number,
): Element {
  return resolveWinContainerDropTarget(layerRoot, clientX, clientY, null)
}

function canReparentElement(el: SVGGraphicsElement): boolean {
  const tag = el.tagName.toLowerCase()
  if (tag === 'svg' || tag === 'defs') return false
  const id = el.getAttribute('id')
  if (id && isTopLevelLayerDomId(id)) return false
  return true
}

/**
 * 在画布 SVG 根上，根据拖拽后的几何关系更新父子节点；并同步 `uisvg:tree`。
 * @param dropClientX/Y 鼠标释放时的屏幕坐标（用于判断「拖进」哪个容器，如 Form）
 * @returns 是否发生了重挂接
 */
export function reparentCanvasObjectAfterDrag(
  svg: SVGSVGElement,
  childDomId: string,
  dropClientX: number,
  dropClientY: number,
): boolean {
  const doc = svg.ownerDocument
  if (!doc) return false

  const el = getGraphicsElementByDomId(doc, childDomId) as SVGGraphicsElement | null
  if (!el || !canReparentElement(el)) return false

  const layerRoot = findLayerRoot(doc)
  if (!layerRoot.contains(el)) return false

  const parent = el.parentElement
  if (!parent) return false

  const layerRootEl = getGraphicsElementByDomId(doc, 'layer-root')
  if (!layerRootEl) return false

  const targetParent = resolveWinContainerDropTarget(layerRoot, dropClientX, dropClientY, el)

  if (parent === targetParent) {
    return false
  }

  if (targetParent === el) return false

  if (el.contains(targetParent)) {
    return false
  }

  preserveVisualAfterReparent(svg, el, targetParent)

  return true
}

const OUTLINE_REPARENT_MIME = 'application/x-uisvg-outline-reparent'
export { OUTLINE_REPARENT_MIME }

/**
 * 将对象根 `childDomId` 挂到 `newParentDomId`（`layer-root` 或 WinForms 容器对象根）下；非法则返回 `null`。
 */
export function reparentUisvgObjectInSvgString(
  svgXml: string,
  childDomId: string,
  newParentDomId: string,
): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  removeEditorCanvasChrome(doc)
  migrateLegacyUisvgMetadata(doc)
  ensureUisvgXmlnsOnRootSvg(doc)

  const child = getGraphicsElementByDomId(doc, childDomId)
  const newParent = getGraphicsElementByDomId(doc, newParentDomId)
  if (!child || !newParent) return null
  if (child.tagName.toLowerCase() !== 'g' || newParent.tagName.toLowerCase() !== 'g') return null
  if (!isUisvgObjectRootG(child)) return null

  const cid = child.getAttribute('id')?.trim()
  if (!cid || isTopLevelLayerDomId(cid) || cid === LAYER_SIBLING_DOM_ID) return null
  if (childDomId === newParentDomId) return null
  if (child.parentElement === newParent) return null

  const layerRoot = findLayerRoot(doc)
  if (!layerRoot.contains(child) || !layerRoot.contains(newParent)) return null
  if (child.contains(newParent)) return null

  if (newParentDomId !== 'layer-root') {
    if (!isUisvgObjectRootG(newParent)) return null
    const b = readUisvgBundleFromObjectRoot(newParent)
    const contId = winContainerIdFromBundle(b)
    if (!WIN_CONTAINER_CONTROL_IDS.has(contId)) return null
  }

  newParent.appendChild(child)
  ensureAllObjectRootChildrenHaveIds(doc)
  removeEditorCanvasChrome(doc)
  return new XMLSerializer().serializeToString(doc)
}
