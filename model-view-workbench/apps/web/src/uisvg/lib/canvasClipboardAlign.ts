/**
 * 画布多选：删除、剪贴板序列化/粘贴、对齐（对 SVG 字符串操作）。
 */
import { applyTranslateToSVGElement, canMoveSvgElement } from './svgElementMove'
import {
  appendToDrawingLayer,
  getGraphicsElementByDomId,
  migrateLegacyUisvgMetadata,
  resolveDomElementId,
} from './uisvgDocument'
import { ensureAllObjectRootChildrenHaveIds } from './uisvgMetaNode'

const CLIPBOARD_V = 1
const SVG_NS = 'http://www.w3.org/2000/svg'

function remapSubtreeIdsFromOldRoot(root: SVGElement, oldRootId: string, newRootId: string): void {
  const walk = (el: Element) => {
    const id = el.getAttribute('id')
    if (id) {
      if (id === oldRootId) {
        el.setAttribute('id', newRootId)
      } else if (id.startsWith(`${oldRootId}-`)) {
        el.setAttribute('id', newRootId + id.slice(oldRootId.length))
      }
    }
    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i] as Element)
    }
  }
  walk(root)
}

/** 删除多个 uisvg 对象根（不含 `#layer-root`） */
export function removeUisvgObjectRootsByLogicalIds(
  svgXml: string,
  logicalIds: readonly string[],
): string | null {
  if (!logicalIds.length) return svgXml
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const seen = new Set<string>()
  for (const lid of logicalIds) {
    const domId = resolveDomElementId(svgXml, lid)
    if (!domId || domId === 'layer-root') continue
    if (seen.has(domId)) continue
    seen.add(domId)
    const el = getGraphicsElementByDomId(doc, domId)
    if (el?.parentNode) el.remove()
  }
  return new XMLSerializer().serializeToString(doc.documentElement)
}

/** 序列化为内部剪贴板 JSON（含完整 `<g>...</g>` 字符串） */
export function serializeUisvgClipboard(svgXml: string, logicalIds: readonly string[]): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const roots: string[] = []
  for (const lid of logicalIds) {
    const domId = resolveDomElementId(svgXml, lid)
    if (!domId || domId === 'layer-root') continue
    const el = getGraphicsElementByDomId(doc, domId)
    if (el) roots.push(new XMLSerializer().serializeToString(el))
  }
  return JSON.stringify({ v: CLIPBOARD_V, roots })
}

/** 从内部剪贴板 JSON 粘贴到内容层末尾（新建在上层） */
export function pasteUisvgClipboard(svgXml: string, json: string): string | null {
  let data: { v: number; roots: string[] }
  try {
    data = JSON.parse(json) as { v: number; roots: string[] }
  } catch {
    return null
  }
  if (!data || data.v !== CLIPBOARD_V || !Array.isArray(data.roots) || !data.roots.length) return null

  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const t = Date.now()
  let i = 0
  for (const xml of data.roots) {
    const wrap = `<svg xmlns="${SVG_NS}">${xml}</svg>`
    const fragDoc = parser.parseFromString(wrap, 'image/svg+xml')
    const svgEl = fragDoc.documentElement
    const g = svgEl?.querySelector(':scope > g') as SVGElement | null
    if (!g) continue
    const oldId = g.getAttribute('id')?.trim() || `old-${i}`
    const newId = `paste-${t}-${i}`
    i++
    remapSubtreeIdsFromOldRoot(g, oldId, newId)
    const imported = doc.importNode(g, true) as SVGElement
    appendToDrawingLayer(doc, imported)
  }
  ensureAllObjectRootChildrenHaveIds(doc)
  return new XMLSerializer().serializeToString(doc.documentElement)
}

export type CanvasAlignMode = 'left' | 'right' | 'hcenter' | 'top' | 'bottom' | 'vcenter'

type SvgMatrixLike = { a: number; b: number; c: number; d: number; e: number; f: number }

/** `consolidate().matrix` 为 SVGMatrix，不能直接 `new DOMMatrix(svgMatrix)`（会报 Failed to parse '[object SVGMatrix]'） */
function domMatrixFromSvgMatrix(sm: { a: number; b: number; c: number; d: number; e: number; f: number }): DOMMatrix {
  return new DOMMatrix([sm.a, sm.b, sm.c, sm.d, sm.e, sm.f])
}

/** 从 `transform` 属性解析的局部矩阵（不依赖布局/CTM，供 DOMParser 文档使用） */
function getLocalTransformMatrixFromAttribute(el: SVGGraphicsElement): DOMMatrix {
  if (!el.transform?.baseVal?.numberOfItems) {
    return new DOMMatrix([1, 0, 0, 1, 0, 0])
  }
  const c = el.transform.baseVal.consolidate()
  if (!c) return new DOMMatrix([1, 0, 0, 1, 0, 0])
  return domMatrixFromSvgMatrix(c.matrix)
}

/**
 * 将点从 `el` 的局部坐标变到 `svgRoot` 的内联用户坐标（与 `getTransformToElement(svgRoot)` 同向）。
 * DOMParser 生成的文档里 `getCTM()` / `getTransformToElement` 常为 null，故用父链 `transform` 累积。
 */
function getMatrixElToSvgRootFromTransformChain(el: SVGGraphicsElement, svgRoot: SVGSVGElement): SvgMatrixLike | null {
  let m = new DOMMatrix([1, 0, 0, 1, 0, 0])
  let node: Element | null = el
  while (node && node !== svgRoot) {
    if (node instanceof SVGGraphicsElement) {
      const T = getLocalTransformMatrixFromAttribute(node)
      m = T.multiply(m)
    }
    node = node.parentElement
  }
  if (node !== svgRoot) return null
  return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }
}

/**
 * DOMParser / 非当前 window 的 Document：`getCTM()`、`getTransformToElement` 常仍返回对象，
 * 但与挂屏渲染不一致，会把 bbox 映射成退化结果（并集全 0）。对齐/剪贴板字符串操作必须优先用 transform 链。
 */
function svgLayoutMatrixUnreliable(el: SVGGraphicsElement): boolean {
  const doc = el.ownerDocument
  if (!doc) return true
  if (doc.defaultView == null) return true
  if (typeof document !== 'undefined' && doc !== document) return true
  return false
}

function getMatrixElToSvgRoot(el: SVGGraphicsElement, svgRoot: SVGSVGElement): SvgMatrixLike | null {
  if (svgLayoutMatrixUnreliable(el)) {
    const chain = getMatrixElToSvgRootFromTransformChain(el, svgRoot)
    if (chain) return chain
  }

  const withTf = el as SVGGraphicsElement & { getTransformToElement?: (e: SVGSVGElement) => SvgMatrixLike }
  if (typeof withTf.getTransformToElement === 'function') {
    try {
      const M = withTf.getTransformToElement(svgRoot) as SvgMatrixLike
      if (M) return M
    } catch {
      /* 跨文档等 */
    }
  }
  const ctm = el.getCTM()
  if (ctm) return ctm as unknown as SvgMatrixLike
  return getMatrixElToSvgRootFromTransformChain(el, svgRoot)
}

function bboxCornersToRootSpace(
  bb: { x: number; y: number; width: number; height: number },
  M: SvgMatrixLike,
): { x: number; y: number; width: number; height: number } | null {
  const { x, y, width: bw, height: bh } = bb
  const xf = (px: number, py: number) => ({
    x: M.a * px + M.c * py + M.e,
    y: M.b * px + M.d * py + M.f,
  })
  const corners: [number, number][] = [
    [x, y],
    [x + bw, y],
    [x, y + bh],
    [x + bw, y + bh],
  ]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [px, py] of corners) {
    const t = xf(px, py)
    minX = Math.min(minX, t.x)
    maxX = Math.max(maxX, t.x)
    minY = Math.min(minY, t.y)
    maxY = Math.max(maxY, t.y)
  }
  if (!Number.isFinite(minX)) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * 未挂到布局树时 `<g>` 的 getBBox 常为 0×0：对子树内可 getBBox 的图元求并，再变到根 svg 用户坐标。
 *（与 CanvasView 用子几何 union 做选中框的思路一致。）
 */
function unionDescendantGraphicsBBoxesInSvgRootSpace(
  root: SVGGraphicsElement,
  svgRoot: SVGSVGElement,
): { x: number; y: number; width: number; height: number } | null {
  const tags = ['rect', 'circle', 'ellipse', 'line', 'path', 'polyline', 'polygon', 'text', 'image', 'use']
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let any = false
  for (const tag of tags) {
    let nodes: NodeListOf<Element>
    try {
      nodes = root.querySelectorAll(tag)
    } catch {
      continue
    }
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as SVGGraphicsElement
      if (typeof node.getBBox !== 'function') continue
      let bb: DOMRect
      try {
        bb = node.getBBox()
      } catch {
        continue
      }
      if (bb.width <= 0 && bb.height <= 0) continue
      const M = getMatrixElToSvgRoot(node, svgRoot)
      if (!M) continue
      const r = bboxCornersToRootSpace(bb, M)
      if (!r) continue
      if (r.width <= 0 && r.height <= 0) continue
      minX = Math.min(minX, r.x)
      minY = Math.min(minY, r.y)
      maxX = Math.max(maxX, r.x + r.width)
      maxY = Math.max(maxY, r.y + r.height)
      any = true
    }
  }
  if (!any || !Number.isFinite(minX)) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** 将 getBBox 四角变到根 `<svg>` 用户坐标系；`DOMParser` 文档内 `<g>` 常为 0 面积，故带子树回退。 */
function bboxInSvgRootUserSpace(el: SVGGraphicsElement, svgRoot: SVGSVGElement): {
  x: number
  y: number
  width: number
  height: number
} | null {
  let bb: DOMRect
  try {
    bb = el.getBBox()
  } catch {
    return unionDescendantGraphicsBBoxesInSvgRootSpace(el, svgRoot)
  }
  const { x, y, width: bw, height: bh } = bb
  const tag = el.tagName.toLowerCase()

  if (tag === 'g' && bw <= 1e-6 && bh <= 1e-6) {
    const u = unionDescendantGraphicsBBoxesInSvgRootSpace(el, svgRoot)
    if (u) return u
  }

  const M = getMatrixElToSvgRoot(el, svgRoot)
  if (!M) {
    if (bw <= 0 && bh <= 0) return unionDescendantGraphicsBBoxesInSvgRootSpace(el, svgRoot)
    return { x: bb.x, y: bb.y, width: bw, height: bh }
  }

  const r = bboxCornersToRootSpace({ x, y, width: bw, height: bh }, M)
  if (!r) return unionDescendantGraphicsBBoxesInSvgRootSpace(el, svgRoot)

  if (r.width > 1e-6 || r.height > 1e-6) return r

  const u = unionDescendantGraphicsBBoxesInSvgRootSpace(el, svgRoot)
  return u ?? r
}

/** 可选：写入人类可读的对齐过程（根 SVG 用户坐标、`dx/dy`），供画布调试面板展示 */
export type AlignUisvgObjectRootsDebugOut = { text: string }

/** 至少两个可移动对象时，按包围盒并集对齐（在根 SVG 用户坐标系下计算） */
export function alignUisvgObjectRoots(
  svgXml: string,
  logicalIds: readonly string[],
  mode: CanvasAlignMode,
  outDebug?: AlignUisvgObjectRootsDebugOut,
): string | null {
  const setDbg = (lines: string[]) => {
    if (outDebug) outDebug.text = lines.join('\n')
  }

  if (logicalIds.length < 2) {
    setDbg([`对齐未执行: 选中逻辑 id 不足 2 个（当前 ${logicalIds.length}）`])
    return null
  }
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const svgRoot = doc.documentElement as SVGSVGElement
  if (!svgRoot || svgRoot.tagName.toLowerCase() !== 'svg') {
    setDbg(['对齐未执行: 文档根不是 <svg>'])
    return null
  }

  const skipped: string[] = []
  const pairs: {
    el: SVGGraphicsElement
    box: { x: number; y: number; width: number; height: number }
    lid: string
    domId: string
  }[] = []
  for (const lid of logicalIds) {
    const domId = resolveDomElementId(svgXml, lid)
    if (!domId || domId === 'layer-root') {
      skipped.push(`${lid}→跳过(根层)`)
      continue
    }
    const el = getGraphicsElementByDomId(doc, domId) as SVGGraphicsElement | null
    if (!el) {
      skipped.push(`${lid}→未找到 DOM`)
      continue
    }
    if (!canMoveSvgElement(el)) {
      skipped.push(`${lid}→不可移动`)
      continue
    }
    const box = bboxInSvgRootUserSpace(el, svgRoot)
    if (!box) {
      skipped.push(`${lid}(${domId})→根坐标包围盒无效`)
      continue
    }
    pairs.push({ el, box, lid, domId })
  }
  if (pairs.length < 2) {
    setDbg([
      '--- 对齐调试 ---',
      `mode=${mode}`,
      `logicalIds: ${JSON.stringify([...logicalIds])}`,
      `有效对象不足 2：已解析 ${pairs.length} 个`,
      skipped.length ? `跳过: ${skipped.join('；')}` : '',
    ].filter(Boolean))
    return null
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { box: b } of pairs) {
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }
  if (!Number.isFinite(minX)) {
    setDbg(['对齐未执行: 并集坐标非有限数'])
    return null
  }

  const unionW = maxX - minX
  const unionH = maxY - minY
  const cx = minX + unionW / 2
  const cy = minY + unionH / 2

  const lines: string[] = [
    '--- 对齐调试 ---',
    `mode=${mode}（根 SVG 用户坐标）`,
    `logicalIds: ${JSON.stringify([...logicalIds])}`,
    `并集: minX=${minX.toFixed(2)} minY=${minY.toFixed(2)} maxX=${maxX.toFixed(2)} maxY=${maxY.toFixed(2)} cx=${cx.toFixed(2)} cy=${cy.toFixed(2)}`,
  ]
  if (skipped.length) lines.push(`跳过项: ${skipped.join('；')}`)

  for (const { el, box: b, lid, domId } of pairs) {
    let dx = 0
    let dy = 0
    if (mode === 'left') dx = minX - b.x
    else if (mode === 'right') dx = maxX - b.x - b.width
    else if (mode === 'hcenter') dx = cx - (b.x + b.width / 2)
    else if (mode === 'top') dy = minY - b.y
    else if (mode === 'bottom') dy = maxY - b.y - b.height
    else if (mode === 'vcenter') dy = cy - (b.y + b.height / 2)
    lines.push(
      `· logical=${lid} dom=#${domId} tag=${el.tagName} box=(${b.x.toFixed(2)},${b.y.toFixed(2)}) ${b.width.toFixed(2)}×${b.height.toFixed(2)} → d=(${dx.toFixed(2)},${dy.toFixed(2)})`,
    )
    applyTranslateToSVGElement(el, dx, dy)
  }
  lines.push('已应用 applyTranslateToSVGElement')

  setDbg(lines)
  return new XMLSerializer().serializeToString(doc.documentElement)
}
