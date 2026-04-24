/**
 * 画布拖拽松手：用视口坐标 (clientX/Y) 判断落在哪个 `g[id]` 上。
 * 主判据：`g.getScreenCTM().inverse()` 将点变到对象根局部坐标，与 `getBBox()` 比较（含外层 CSS transform、兄弟叠放）。
 * 后备：`getBoundingClientRect` / bbox 四角屏幕盒。候选取相对 `#layer-root` 最深，同深度取屏幕面积大者。
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
import { getInnerClientBoundsForContainer, getWindowsControlPlacementSize } from './libraryPlacement'
import { relayoutMenuHierarchy, relayoutToolStripChildren } from './windowsUiControls'

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

/** 允许作为父级的对象：通用容器 + 菜单层级容器。 */
const WIN_PARENT_CONTROL_IDS = new Set([
  ...WIN_CONTAINER_CONTROL_IDS,
  'MenuBar',
  'MenuStrip',
  'Menu',
  'ContextMenu',
  'ContextMenuStrip',
  'ToolBar',
  'ToolStrip',
])

function localNameFromObjectRoot(g: Element): string {
  const b = readUisvgBundleFromObjectRoot(g)
  return b.uisvgLocalName.replace(/^win\./, '')
}

/**
 * WinForms 语义父子约束：
 * - MenuStrip(MenuBar) -> Menu*
 * - Menu -> Menu* / MenuItem*
 * - 其余容器保持现状（可接收通用子控件）
 */
function countChildObjectRootsByLocalName(parent: Element, childLocalName: string, ignoreChildId = ''): number {
  let n = 0
  for (let i = 0; i < parent.children.length; i++) {
    const ch = parent.children[i] as Element
    if (ch.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(ch)) continue
    const id = ch.getAttribute('id')?.trim() || ''
    if (ignoreChildId && id === ignoreChildId) continue
    if (localNameFromObjectRoot(ch) === childLocalName) n++
  }
  return n
}

function canParentAcceptChild(parentId: string, childId: string, parentEl?: Element, movingChildId = ''): boolean {
  if (childId === 'ToolButton') return parentId === 'ToolBar' || parentId === 'ToolStrip'
  if (parentId === 'MenuBar' || parentId === 'MenuStrip') return childId === 'Menu'
  if (parentId === 'Menu') return childId === 'Menu' || childId === 'MenuItem'
  if (parentId === 'ContextMenu' || parentId === 'ContextMenuStrip') {
    if (childId !== 'Menu') return false
    if (!parentEl) return true
    return countChildObjectRootsByLocalName(parentEl, 'Menu', movingChildId) < 1
  }
  return WIN_CONTAINER_CONTROL_IDS.has(parentId)
}

function isMenuHierarchyChild(controlId: string): boolean {
  return controlId === 'Menu' || controlId === 'MenuItem'
}

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
 * 将 `clientX/Y` 映到对象根 `g` 的局部用户空间（与 `getBBox()` 同一坐标系），判断是否落在 bbox 内。
 * 使用 `g.getScreenCTM()`，与编辑器画布外层 CSS `transform` 一致；兄弟叠放时不必依赖 `elementsFromPoint`。
 */
function clientPointInObjectRootLocalBBox(g: SVGGraphicsElement, clientX: number, clientY: number): boolean {
  try {
    if (!g.ownerSVGElement) return false
    const m = g.getScreenCTM()
    if (!m) return false
    let inv: DOMMatrix
    try {
      inv = m.inverse()
    } catch {
      return false
    }
    /** `DOMPoint` + `DOMMatrix`：避免 `createSVGPoint` 在部分宿主下与 client 坐标系对齐不稳 */
    const lp = new DOMPoint(clientX, clientY).matrixTransform(inv)
    const bb = g.getBBox()
    if (!Number.isFinite(bb.x) || !Number.isFinite(bb.y)) return false
    if (!Number.isFinite(bb.width) || !Number.isFinite(bb.height)) return false
    if (bb.width <= 0 || bb.height <= 0) return false
    const e = 0.5
    return (
      lp.x >= bb.x - e &&
      lp.x <= bb.x + bb.width + e &&
      lp.y >= bb.y - e &&
      lp.y <= bb.y + bb.height + e
    )
  } catch {
    return false
  }
}

/**
 * WinForms 对象根 `<g>` 常无自有几何，`getBoundingClientRect` 为 0×0，导致松手落点永远判不中 Form。
 * 此时用 `getBBox`（含后代几何）经 `getScreenCTM` 映射到屏幕像素再参与命中。
 */
function objectRootGScreenRectForHitTest(g: SVGGraphicsElement): DOMRect | null {
  try {
    const r = g.getBoundingClientRect()
    if (r.width >= 1 && r.height >= 1) return r

    const b = g.getBBox()
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.width) || !Number.isFinite(b.height)) {
      return r.width >= 0.5 || r.height >= 0.5 ? r : null
    }

    const svg = g.ownerSVGElement
    const m = g.getScreenCTM()
    if (!svg || !m) return r.width >= 0.5 || r.height >= 0.5 ? r : null

    const pt = svg.createSVGPoint()
    const xs: number[] = []
    const ys: number[] = []
    for (const [x, y] of [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height],
    ] as const) {
      pt.x = x
      pt.y = y
      const sp = pt.matrixTransform(m)
      xs.push(sp.x)
      ys.push(sp.y)
    }
    const left = Math.min(...xs)
    const top = Math.min(...ys)
    const right = Math.max(...xs)
    const bottom = Math.max(...ys)
    const w = right - left
    const h = bottom - top
    if (w < 0.25 && h < 0.25) return r.width >= 0.5 || r.height >= 0.5 ? r : null
    return new DOMRect(left, top, Math.max(1, w), Math.max(1, h))
  } catch {
    return null
  }
}

function considerDropTargetCandidate(
  layerRoot: Element,
  g: SVGGraphicsElement,
  dragged: SVGGraphicsElement | null,
  best: { el: Element; depth: number; area: number } | null,
): { el: Element; depth: number; area: number } | null {
  const id = g.getAttribute('id')
  if (!id || isTopLevelLayerDomId(id) || id === LAYER_SIBLING_DOM_ID) return best
  if (dragged) {
    if (g === dragged) return best
    if (dragged.contains(g) && g !== dragged) return best
  }
  const depth = depthUnderLayerRoot(layerRoot, g)
  if (depth < 0) return best
  const r = objectRootGScreenRectForHitTest(g)
  const area = r ? Math.max(1, r.width * r.height) : 1
  if (!best || depth > best.depth || (depth === best.depth && area > best.area)) {
    return { el: g, depth, area }
  }
  return best
}

/**
 * 用 `elementsFromPoint` 沿堆叠顺序收集指针下的 `g[id]`，再取相对 `#layer-root` 最深者。
 * **仅适用于无 `dragged` 的场景（如组件库拖入）**：拖动已有控件时，栈顶几乎总是拖动对象本身，
 * 其祖先链上不会出现「被遮挡的兄弟容器」（如 Form 在 Panel 下面），会误判或漏判。
 */
function findDropTargetContainerByElementsFromPoint(
  layerRoot: Element,
  clientX: number,
  clientY: number,
  dragged: SVGGraphicsElement | null,
): Element | null {
  const doc = layerRoot.ownerDocument
  if (!doc || typeof doc.elementsFromPoint !== 'function') return null

  let best: { el: Element; depth: number; area: number } | null = null
  const stack = doc.elementsFromPoint(clientX, clientY)
  for (let s = 0; s < stack.length; s++) {
    const raw = stack[s]
    if (!(raw instanceof Element)) continue
    let n: Element | null = raw
    while (n && n !== layerRoot) {
      if (layerRoot.contains(n) && n.tagName.toLowerCase() === 'g' && n.getAttribute('id')) {
        best = considerDropTargetCandidate(layerRoot, n as SVGGraphicsElement, dragged, best)
      }
      n = n.parentElement
    }
  }
  return best?.el ?? null
}

/**
 * 后备：用屏幕矩形扫描所有 `g[id]`（含 getBBox 回退盒）。
 * @param dragged 库拖入新控件时传 `null`，不做「自身/后代」排除。
 */
function findDropTargetContainerByRectScan(
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

    let inside = clientPointInObjectRootLocalBBox(g, clientX, clientY)
    if (!inside) {
      const r = objectRootGScreenRectForHitTest(g)
      inside = !!(r && pointInClientRect(clientX, clientY, r))
    }
    if (!inside) continue

    best = considerDropTargetCandidate(layerRoot, g, dragged, best)
  }

  return best?.el ?? null
}

function findDropTargetContainer(
  layerRoot: Element,
  clientX: number,
  clientY: number,
  dragged: SVGGraphicsElement | null,
): Element | null {
  if (!dragged) {
    return (
      findDropTargetContainerByElementsFromPoint(layerRoot, clientX, clientY, null) ??
      findDropTargetContainerByRectScan(layerRoot, clientX, clientY, null)
    )
  }
  /**
   * 拖动物体时几何盒扫描在「外层 div 带 CSS transform」等环境下仍可能漏检；
   * 临时让被拖对象根 `pointer-events: none`，使 `elementsFromPoint` 能穿透到下面的 Form 等兄弟容器，
   * 与常见设计器做法一致；最后再回退矩形扫描。
   */
  const prevPe = dragged.style.pointerEvents
  dragged.style.pointerEvents = 'none'
  try {
    void dragged.getBoundingClientRect()
    const hit = findDropTargetContainerByElementsFromPoint(layerRoot, clientX, clientY, null)
    if (hit && hit !== dragged && !dragged.contains(hit)) return hit
  } finally {
    if (prevPe) dragged.style.pointerEvents = prevPe
    else dragged.style.removeProperty('pointer-events')
  }
  return findDropTargetContainerByRectScan(layerRoot, clientX, clientY, dragged)
}

function winContainerIdFromBundle(b: { uisvgLocalName: string }): string {
  return b.uisvgLocalName.replace(/^win\./, '')
}

/** 容器对象根 `<g>` 下「客户区」在屏幕像素中的外包矩形（与 `getInnerClientBoundsForContainer` 一致） */
function screenBoundingRectForInnerClientOfContainer(
  containerG: SVGGraphicsElement,
  controlId: string,
): DOMRect | null {
  try {
    const inner = getInnerClientBoundsForContainer(controlId, containerG)
    const m = containerG.getScreenCTM()
    if (!m) return null
    const xs: number[] = []
    const ys: number[] = []
    for (const [x, y] of [
      [inner.x, inner.y],
      [inner.x + inner.width, inner.y],
      [inner.x + inner.width, inner.y + inner.height],
      [inner.x, inner.y + inner.height],
    ] as const) {
      const sp = new DOMPoint(x, y).matrixTransform(m)
      xs.push(sp.x)
      ys.push(sp.y)
    }
    const left = Math.min(...xs)
    const top = Math.min(...ys)
    const right = Math.max(...xs)
    const bottom = Math.max(...ys)
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null
    return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top))
  } catch {
    return null
  }
}

function clientPointInsideScreenRect(clientX: number, clientY: number, r: DOMRect, inset = 2): boolean {
  return (
    clientX >= r.left - inset &&
    clientX <= r.right + inset &&
    clientY >= r.top - inset &&
    clientY <= r.bottom + inset
  )
}

/** 控件自身外框（不含子对象）在屏幕中的矩形，用于判定“是否已拖出当前父级自身区域”。 */
function screenBoundingRectForControlOwnBox(
  parentG: SVGGraphicsElement,
  controlId: string,
): DOMRect | null {
  try {
    const m = parentG.getScreenCTM()
    if (!m) return null
    const sz = getWindowsControlPlacementSize(controlId)
    const xs: number[] = []
    const ys: number[] = []
    for (const [x, y] of [
      [0, 0],
      [sz.w, 0],
      [sz.w, sz.h],
      [0, sz.h],
    ] as const) {
      const sp = new DOMPoint(x, y).matrixTransform(m)
      xs.push(sp.x)
      ys.push(sp.y)
    }
    const left = Math.min(...xs)
    const top = Math.min(...ys)
    const right = Math.max(...xs)
    const bottom = Math.max(...ys)
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
      return null
    }
    return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top))
  } catch {
    return null
  }
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
  childControlId?: string,
): Element {
  const draggedLocal =
    childControlId ??
    (dragged && isUisvgObjectRootG(dragged) ? localNameFromObjectRoot(dragged) : '')
  const inner = findDropTargetContainer(layerRoot, clientX, clientY, dragged)
  /**
   * 命中对象根 `g` 的 bbox 含全部子控件，拖子控件「出容器」时松手点常仍落在父容器盒内，
   * `inner` 即父级 → 会误判为留在父级。若当前父即命中根且指针不在其 **Win 客户区**（如 Form 标题栏/外框），
   * 则视为挂到 `#layer-root`。
   */
  if (inner && dragged) {
    const dragParent = dragged.parentElement
    if (
      dragParent &&
      dragParent === inner &&
      dragParent.tagName.toLowerCase() === 'g' &&
      isUisvgObjectRootG(dragParent)
    ) {
      const b = readUisvgBundleFromObjectRoot(dragParent)
      const cid = winContainerIdFromBundle(b)
      /**
       * `g` 命中框会包含子对象；对子菜单层级（MenuStrip/Menu/ContextMenuStrip）会造成“已拖出仍粘住父级”。
       * 这里改为按“父级自身区域”判定：Form 用客户区，菜单类用控件自身外框。
       */
      if (cid === 'Form') {
        const innerClientScreen = screenBoundingRectForInnerClientOfContainer(
          dragParent as SVGGraphicsElement,
          cid,
        )
        if (innerClientScreen && !clientPointInsideScreenRect(clientX, clientY, innerClientScreen)) {
          return layerRoot
        }
      } else if ((cid === 'ToolBar' || cid === 'ToolStrip') && draggedLocal === 'ToolButton') {
        const ownScreen = screenBoundingRectForControlOwnBox(dragParent as SVGGraphicsElement, cid)
        if (ownScreen && !clientPointInsideScreenRect(clientX, clientY, ownScreen)) {
          return layerRoot
        }
      } else if (cid === 'MenuBar' || cid === 'MenuStrip' || cid === 'Menu' || cid === 'ContextMenu' || cid === 'ContextMenuStrip') {
        const ownScreen = screenBoundingRectForControlOwnBox(dragParent as SVGGraphicsElement, cid)
        if (ownScreen && !clientPointInsideScreenRect(clientX, clientY, ownScreen)) {
          return layerRoot
        }
      }
    }
  }
  if (!inner) {
    return layerRoot
  }
  const menuChild = isMenuHierarchyChild(draggedLocal)
  let n: Element | null = inner
  while (n && n !== layerRoot) {
    if (n.tagName.toLowerCase() === 'g') {
      const gid = n.getAttribute('id')?.trim()
      if (gid && isUisvgObjectRootG(n)) {
        const cid = localNameFromObjectRoot(n)
        if (!WIN_PARENT_CONTROL_IDS.has(cid)) {
          n = n.parentElement
          continue
        }
        if (menuChild && cid !== 'MenuBar' && cid !== 'MenuStrip' && cid !== 'Menu' && cid !== 'ContextMenu' && cid !== 'ContextMenuStrip') {
          n = n.parentElement
          continue
        }
        const movingId = dragged?.getAttribute('id')?.trim() || ''
        if (!draggedLocal || canParentAcceptChild(cid, draggedLocal, n, movingId)) {
          return n
        }
      }
    }
    n = n.parentElement
  }
  return layerRoot
}

/**
 * 与松手改父级相同的落点解析，供拖拽中高亮当前指针下的目标父级。
 */
export function resolveCanvasReparentDropTarget(
  layerRoot: Element,
  clientX: number,
  clientY: number,
  dragged: SVGGraphicsElement | null,
): Element {
  return resolveWinContainerDropTarget(layerRoot, clientX, clientY, dragged)
}

/**
 * 单选拖拽时可作为「新父级」的 WinForms 容器对象根（不含 `#layer-root`；不含拖动对象自身及其后代）。
 */
export function collectReparentDropHighlightElements(
  layerRoot: Element,
  dragged: SVGGraphicsElement,
): Element[] {
  const out: Element[] = []
  if (!layerRoot.contains(dragged)) return out
  const draggedLocal = isUisvgObjectRootG(dragged) ? localNameFromObjectRoot(dragged) : ''

  const groups = layerRoot.querySelectorAll('g[id]')
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i] as Element
    const id = g.getAttribute('id')?.trim()
    if (!id || isTopLevelLayerDomId(id) || id === LAYER_SIBLING_DOM_ID) continue
    if (g === dragged) continue
    if (dragged.contains(g)) continue
    if (g.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(g)) continue
    const cid = localNameFromObjectRoot(g)
    if (!WIN_PARENT_CONTROL_IDS.has(cid)) continue
    const movingId = dragged.getAttribute('id')?.trim() || ''
    if (draggedLocal && !canParentAcceptChild(cid, draggedLocal, g, movingId)) continue
    out.push(g)
  }
  return out
}

/**
 * 从指针下最深命中 `g` 向上找第一个「可放子控件」的 WinForms 容器对象根；否则返回 `layerRoot`。
 * 用于组件库拖入：点在 Button 上会挂到其父 Form。
 */
export function findWinContainerParentForPaletteDrop(
  layerRoot: Element,
  clientX: number,
  clientY: number,
  childControlId?: string,
): Element {
  return resolveWinContainerDropTarget(layerRoot, clientX, clientY, null, childControlId)
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
  if (!doc) {
    return false
  }

  /** 内联于 HTML 页时 `ownerDocument` 为 HTML，`getGraphicsElementByDomId` 必须用根 `svg` 作查找上下文 */
  const el = getGraphicsElementByDomId(svg, childDomId) as SVGGraphicsElement | null
  if (!el || !canReparentElement(el)) {
    return false
  }

  const layerRoot = findLayerRoot(doc)
  if (!layerRoot.contains(el)) {
    return false
  }

  const parent = el.parentElement
  if (!parent) return false

  const layerRootEl = getGraphicsElementByDomId(svg, 'layer-root')
  if (!layerRootEl) {
    return false
  }

  const targetParent = resolveWinContainerDropTarget(layerRoot, dropClientX, dropClientY, el)

  if (parent === targetParent) {
    return false
  }

  if (targetParent === el) return false

  if (el.contains(targetParent)) {
    return false
  }

  const oldParent = el.parentElement
  const movedLocal = localNameFromObjectRoot(el)
  preserveVisualAfterReparent(svg, el, targetParent)
  if (oldParent && isUisvgObjectRootG(oldParent)) relayoutMenuHierarchy(oldParent)
  if (isUisvgObjectRootG(targetParent)) relayoutMenuHierarchy(targetParent)
  if (oldParent && isUisvgObjectRootG(oldParent) && (localNameFromObjectRoot(oldParent) === 'ToolBar' || localNameFromObjectRoot(oldParent) === 'ToolStrip')) {
    relayoutToolStripChildren(oldParent)
  }
  if (isUisvgObjectRootG(targetParent) && (localNameFromObjectRoot(targetParent) === 'ToolBar' || localNameFromObjectRoot(targetParent) === 'ToolStrip')) {
    relayoutToolStripChildren(targetParent)
  }
  if (!isUisvgObjectRootG(targetParent) && (movedLocal === 'Menu' || movedLocal === 'ContextMenu' || movedLocal === 'ContextMenuStrip')) {
    relayoutMenuHierarchy(el)
  }

  return true
}

const OUTLINE_REPARENT_MIME = 'application/x-uisvg-outline-reparent'
export { OUTLINE_REPARENT_MIME }

/**
 * 校验「对象根 → 新父级」是否合法；合法则返回待移动的 `g` 与目标父节点（尚未 `appendChild`）。
 * @param lookupRoot 解析得到的仅 SVG 文档可传 `Document`；**挂载在 HTML 内时必须传根 `SVGSVGElement`**
 */
function resolveUisvgReparentPair(
  lookupRoot: Document | SVGSVGElement,
  childDomId: string,
  newParentDomId: string,
): { child: SVGGraphicsElement; newParent: Element } | null {
  const child = getGraphicsElementByDomId(lookupRoot, childDomId)
  const newParent = getGraphicsElementByDomId(lookupRoot, newParentDomId)
  if (!child || !newParent) return null
  if (child.tagName.toLowerCase() !== 'g' || newParent.tagName.toLowerCase() !== 'g') return null
  if (!isUisvgObjectRootG(child)) return null

  const cid = child.getAttribute('id')?.trim()
  if (!cid || isTopLevelLayerDomId(cid) || cid === LAYER_SIBLING_DOM_ID) return null
  if (childDomId === newParentDomId) return null
  if (child.parentElement === newParent) return null

  const doc =
    lookupRoot instanceof SVGSVGElement ? lookupRoot.ownerDocument! : lookupRoot
  const layerRoot = findLayerRoot(doc)
  if (!layerRoot.contains(child) || !layerRoot.contains(newParent)) return null
  if (child.contains(newParent)) return null

  if (newParentDomId !== 'layer-root') {
    if (!isUisvgObjectRootG(newParent)) return null
    const b = readUisvgBundleFromObjectRoot(newParent)
    const contId = winContainerIdFromBundle(b)
    if (!WIN_PARENT_CONTROL_IDS.has(contId)) return null
    const childId = localNameFromObjectRoot(child)
    const movingId = child.getAttribute('id')?.trim() || ''
    if (!canParentAcceptChild(contId, childId, newParent, movingId)) return null
  }

  return { child: child as SVGGraphicsElement, newParent }
}

/**
 * 在**已挂载**的根 SVG 上改父子 DOM，并用屏幕盒迭代修正 `transform`，避免大纲拖放后画布上控件跳位。
 * @returns 是否执行了重挂接（父级未变则 `false`）
 */
export function reparentUisvgObjectPreserveVisualOnSvg(
  svg: SVGSVGElement,
  childDomId: string,
  newParentDomId: string,
): boolean {
  const doc = svg.ownerDocument
  if (!doc) return false
  const pair = resolveUisvgReparentPair(svg, childDomId, newParentDomId)
  if (!pair) return false
  const oldParent = pair.child.parentElement
  const movedLocal = localNameFromObjectRoot(pair.child)
  preserveVisualAfterReparent(svg, pair.child, pair.newParent)
  if (oldParent && isUisvgObjectRootG(oldParent)) relayoutMenuHierarchy(oldParent)
  if (isUisvgObjectRootG(pair.newParent)) relayoutMenuHierarchy(pair.newParent)
  if (oldParent && isUisvgObjectRootG(oldParent) && (localNameFromObjectRoot(oldParent) === 'ToolBar' || localNameFromObjectRoot(oldParent) === 'ToolStrip')) {
    relayoutToolStripChildren(oldParent)
  }
  if (isUisvgObjectRootG(pair.newParent) && (localNameFromObjectRoot(pair.newParent) === 'ToolBar' || localNameFromObjectRoot(pair.newParent) === 'ToolStrip')) {
    relayoutToolStripChildren(pair.newParent)
  }
  if (!isUisvgObjectRootG(pair.newParent) && (movedLocal === 'Menu' || movedLocal === 'ContextMenu' || movedLocal === 'ContextMenuStrip')) {
    relayoutMenuHierarchy(pair.child)
  }
  ensureAllObjectRootChildrenHaveIds(doc)
  return true
}

/**
 * 将对象根 `childDomId` 挂到 `newParentDomId`（`layer-root` 或 WinForms 容器对象根）下；非法则返回 `null`。
 * 纯字符串管线无法做屏幕坐标修正，故无「保持视觉位置」语义（用于画布未挂载等回退路径）。
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

  const pair = resolveUisvgReparentPair(doc, childDomId, newParentDomId)
  if (!pair) return null

  const oldParent = pair.child.parentElement
  const movedLocal = localNameFromObjectRoot(pair.child)
  pair.newParent.appendChild(pair.child)
  if (oldParent && isUisvgObjectRootG(oldParent)) relayoutMenuHierarchy(oldParent)
  if (isUisvgObjectRootG(pair.newParent)) relayoutMenuHierarchy(pair.newParent)
  if (oldParent && isUisvgObjectRootG(oldParent) && (localNameFromObjectRoot(oldParent) === 'ToolBar' || localNameFromObjectRoot(oldParent) === 'ToolStrip')) {
    relayoutToolStripChildren(oldParent)
  }
  if (isUisvgObjectRootG(pair.newParent) && (localNameFromObjectRoot(pair.newParent) === 'ToolBar' || localNameFromObjectRoot(pair.newParent) === 'ToolStrip')) {
    relayoutToolStripChildren(pair.newParent)
  }
  if (!isUisvgObjectRootG(pair.newParent) && (movedLocal === 'Menu' || movedLocal === 'ContextMenu' || movedLocal === 'ContextMenuStrip')) {
    relayoutMenuHierarchy(pair.child)
  }
  ensureAllObjectRootChildrenHaveIds(doc)
  removeEditorCanvasChrome(doc)
  return new XMLSerializer().serializeToString(doc)
}
