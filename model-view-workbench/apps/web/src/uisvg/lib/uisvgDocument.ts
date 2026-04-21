/**
 * UISVG 文档模型（*.ui.svg）：UISVG 是对 UI 结构的抽象，本实现为其 **SVG 扩展方案** 的编辑器侧逻辑。
 * 规范与四阶段文档见 `ai-software-engineering/00-concept/uisvg-format-spec.md`、`02-physical/uisvg-editor-web/`。
 */
import {
  ensureAllObjectRootChildrenHaveIds,
  isUisvgObjectRootG,
  migrateLegacyUisvgAttrsToMetaChild,
  readUisvgBundleFromObjectRoot,
  uisvgSemanticElementIdForObjectRoot,
  writeUisvgBundleToObjectRoot,
} from './uisvgMetaNode'

export const UISVG_NS = 'http://uisvg.org/ns/1'
const SVG_NS = 'http://www.w3.org/2000/svg'

/** 根 `<svg>` 上的命名空间声明属性名，对应 URI 为 `UISVG_NS`（与旧版 `uisvg:*` 元数据兼容） */
export const UISVG_XMLNS_ATTR = 'xmlns:uisvg'

export function ensureUisvgXmlnsOnRootSvg(doc: Document): void {
  const svg = doc.documentElement
  if (!svg || svg.tagName.toLowerCase() !== 'svg') return
  if (!svg.getAttribute(UISVG_XMLNS_ATTR)) {
    svg.setAttribute(UISVG_XMLNS_ATTR, UISVG_NS)
  }
}

/**
 * 每个可编辑「对象」的根节点为 `<g id="…">`（主键）。其下 **uisvg 语义子节点**等仍会分配 `{gId}-ui` 等 id；
 * **纯几何**（`rect`/`text`/…）不再要求子级 `id`（命中与编辑以对象根 `g` 为准）。旧版 `bundle`/`meta` 仍可读并会迁移。
 */
/** 旧版对象根上的类型提示；读入时参与迁移，保存后由类型化子节点替代（见 `uisvgMetaNode`） */
export const UISVG_KIND_ATTR = 'data-uisvg-kind'

/** 对象在属性面板中的显示名称（与大纲 label 同步；持久化在元素上） */
export const UISVG_LABEL_ATTR = 'data-uisvg-label'

/** 逻辑画布网格与 DPI（旧版在 `uisvg:canvas`；现写在根 `svg` 上） */
export const UISVG_CANVAS_GRID_ATTR = 'data-uisvg-grid'
export const UISVG_CANVAS_DPI_ATTR = 'data-uisvg-dpi'

/** 「UI 属性」面板中语义键值对（JSON 对象） */
export const UISVG_UI_PROPS_ATTR = 'data-uisvg-ui-props'

/** 由「UI 属性」面板独占编辑，不出现在「XML 属性」表中 */
export const UISVG_UI_MANAGED_ATTRS = [
  UISVG_UI_PROPS_ATTR,
  'data-winforms',
  'data-win32',
  'data-qt',
] as const

function isUiManagedAttr(name: string): boolean {
  return (UISVG_UI_MANAGED_ATTRS as readonly string[]).includes(name)
}

export interface ElementAttrRow {
  name: string
  value: string
}

export interface SelectedElementSnapshot {
  /** 解析后的 DOM `id`（用于 getElementById） */
  domId: string
  tagName: string
  /** 只读：该元素的序列化片段 */
  outerXml: string
  /** 显示名称（优先 `data-uisvg-label`，否则 @id） */
  displayLabel: string
  /** 可编辑属性行（不含 `data-uisvg-label`） */
  attrRows: ElementAttrRow[]
}

export interface OutlineNode {
  id: string
  /** 与 `uisvg:` 语义子元素 localName 一致（如 `Form`、`Frame`）；虚拟大纲节点为 `svg` / `uisvg.root` */
  uisvgLocalName: string
  label: string
  ref: string
  /** 嵌套大纲（与 DOM 父子一致） */
  children?: OutlineNode[]
}

/** 全局 SVG 文档元素树（用于属性栏 DOM 树视图） */
export interface SvgDomTreeNode {
  tag: string
  id: string | null
  children: SvgDomTreeNode[]
}

export function parseSvgDomTree(svgXml: string): SvgDomTreeNode | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.nodeType !== 1) return null
  return walkSvgDomElement(root as Element)
}

function walkSvgDomElement(el: Element): SvgDomTreeNode {
  const raw = el.localName || el.tagName || 'element'
  const tag = el.prefix ? `${el.prefix}:${raw}` : raw
  const id = el.getAttribute('id')
  const children: SvgDomTreeNode[] = []
  for (let i = 0; i < el.children.length; i++) {
    children.push(walkSvgDomElement(el.children[i]))
  }
  return { tag, id, children }
}

/** 逻辑画布设置（与 uisvg:canvas 一致；原点默认 (0,0) 为左上角） */
export interface CanvasSettings {
  width: number
  height: number
  grid: number
  dpi: number
}

/** 与 `layer-root` 同级的顶层内容组（大纲中可选中，用于分层叠放） */
export const LAYER_SIBLING_DOM_ID = 'layer-sibling'

/** 顶层内容组：选中框按整张逻辑画布显示（避免紧贴子图元） */
export function isTopLevelLayerDomId(domId: string | null): boolean {
  if (!domId) return false
  return domId === 'layer-root' || domId === LAYER_SIBLING_DOM_ID
}

/**
 * 按 id 查找画布上的「图元」元素（rect/g/text 等）。
 * 历史上 `metadata` 内 `uisvg:node` 曾与图元 id 冲突；现大纲信息在图元自身 `data-uisvg-*` 上。
 * 仍优先在 `#layer-root` / `#layer-sibling` 内查找，并排除 `metadata`。
 */
export function getGraphicsElementByDomId(root: Document | SVGSVGElement, id: string): Element | null {
  if (!id) return null

  const svg: SVGSVGElement | null =
    root instanceof SVGSVGElement
      ? root
      : root.nodeType === 9 && (root as Document).documentElement instanceof SVGSVGElement
        ? ((root as Document).documentElement as SVGSVGElement)
        : null

  if (!svg) return null

  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const sel = `[id="${esc(id)}"]`

  if (id === 'layer-root') {
    return svg.querySelector('#layer-root')
  }
  if (id === LAYER_SIBLING_DOM_ID) {
    return svg.querySelector(`#${LAYER_SIBLING_DOM_ID}`)
  }

  const layer = svg.querySelector('#layer-root')
  if (layer) {
    const hit = layer.querySelector(sel)
    if (hit) return hit
  }
  const sib = svg.querySelector(`#${LAYER_SIBLING_DOM_ID}`)
  if (sib) {
    const hit = sib.querySelector(sel)
    if (hit) return hit
  }

  const all = svg.querySelectorAll(sel)
  for (let i = 0; i < all.length; i++) {
    const n = all[i]
    if (n.closest('metadata')) continue
    return n
  }
  return null
}

export function createEmptyDocument(): string {
  const frameTag = 'Frame'
  const frameId = uisvgSemanticElementIdForObjectRoot('layer-root')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" ${UISVG_XMLNS_ATTR}="${UISVG_NS}"
  width="1200" height="800" viewBox="0 0 1200 800" overflow="visible"
  data-uisvg-version="1.0" data-uisvg-editor="uisvg-editor-web"
  ${UISVG_CANVAS_GRID_ATTR}="16" ${UISVG_CANVAS_DPI_ATTR}="96">
  <g id="layer-root" overflow="visible">
    <${frameTag} xmlns="${UISVG_NS}" id="${frameId}" label="Root"/>
  </g>
</svg>`
}

/**
 * Vue `v-html` 使用 **HTML** 解析器嵌入 SVG。在 SVG 内出现 `<meta>`（即便带 xmlns）会触发
 * HTML5「foreign content」规则，破坏 SVG 子树，画布表现为整段不显示。
 * 将 uisvg 命名空间下的旧标签 `<meta>` 在字符串层改为 `<bundle>` 后再嵌入；新文档已直接生成 `bundle`。
 */
export function uisvgMarkupSafeForHtmlEmbedding(svgXml: string): string {
  let s = svgXml
  s = s.replace(
    /<meta([^>]*xmlns\s*=\s*["']http:\/\/uisvg\.org\/ns\/1["'][^>]*)>/gi,
    '<bundle$1>',
  )
  s = s.replace(/<\/meta>/gi, '</bundle>')
  return s
}

export function parseCanvasMeta(svgXml: string): CanvasSettings {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  return parseCanvasMetaFromDoc(doc)
}

function parseCanvasMetaFromDoc(doc: Document): CanvasSettings {
  const svg = doc.documentElement
  const def = { width: 1200, height: 800, grid: 16, dpi: 96 }
  if (!svg || svg.tagName.toLowerCase() !== 'svg') return def

  const fromSvg = {
    width: parseFloat(svg.getAttribute('width') || '') || def.width,
    height: parseFloat(svg.getAttribute('height') || '') || def.height,
    grid: parseFloat(svg.getAttribute(UISVG_CANVAS_GRID_ATTR) || '') || def.grid,
    dpi: parseFloat(svg.getAttribute(UISVG_CANVAS_DPI_ATTR) || '') || def.dpi,
  }

  const canvases = doc.getElementsByTagNameNS(UISVG_NS, 'canvas')
  const c = canvases[0]
  if (!c) return fromSvg
  return {
    width: parseFloat(c.getAttribute('width') || String(fromSvg.width)) || fromSvg.width,
    height: parseFloat(c.getAttribute('height') || String(fromSvg.height)) || fromSvg.height,
    grid: parseFloat(c.getAttribute('grid') || String(fromSvg.grid)) || fromSvg.grid,
    dpi: parseFloat(c.getAttribute('dpi') || String(fromSvg.dpi)) || fromSvg.dpi,
  }
}

export function getCanvasSettingsFromMarkup(svgXml: string): CanvasSettings {
  return parseCanvasMeta(svgXml)
}

/**
 * 移除历史遗留的编辑器画布装饰（不应写入交付物 SVG）。
 * 白底、网格与左上角说明由编辑器视口层绘制，见 `CanvasView.vue`。
 */
export function removeEditorCanvasChrome(doc: Document): void {
  doc.getElementById('uisvg-canvas-bg')?.remove()
  doc.getElementById('uisvg-canvas-overlay')?.remove()
}

/** 打开文档或保存前调用，保证磁盘上的 SVG 不含编辑器辅助节点 */
export function stripEditorCanvasChromeFromMarkup(svgXml: string): string {
  return appendSvgShape(svgXml, () => {})
}

/** 更新画布尺寸、网格、DPI 及根 `svg` 视图（写在根 `svg` 上，不依赖 metadata） */
export function updateCanvasSettings(svgXml: string, s: CanvasSettings): string {
  return appendSvgShape(svgXml, (doc) => {
    const w = Math.max(16, s.width)
    const h = Math.max(16, s.height)
    const g = Math.max(1, s.grid)
    const dpi = Math.max(1, s.dpi)

    const svg = doc.documentElement
    svg.setAttribute('width', String(w))
    svg.setAttribute('height', String(h))
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.setAttribute(UISVG_CANVAS_GRID_ATTR, String(g))
    svg.setAttribute(UISVG_CANVAS_DPI_ATTR, String(dpi))
    /** 根文档默认不裁剪到 viewBox（与常见「Root 不 clip」约定一致；子容器可单独设 clip-path） */
    svg.setAttribute('overflow', 'visible')

    const layerRoot = doc.getElementById('layer-root')
    if (layerRoot) layerRoot.setAttribute('overflow', 'visible')
  })
}

/** 新图元插入到内容根组末尾（不含编辑器辅助层）；后者后绘，新建在最上层。 */
export function appendToDrawingLayer(doc: Document, node: Node): void {
  const layer = findLayerRoot(doc)
  layer.appendChild(node)
}

export function findLayerRoot(doc: Document): Element {
  return doc.getElementById('layer-root') || doc.documentElement
}

/**
 * 定位旧版 `uisvg:tree`（仅用于迁移 legacy 元数据）。
 */
export function getUisvgTreeElement(doc: Document): Element | null {
  const byNs = doc.getElementsByTagNameNS(UISVG_NS, 'tree')
  if (byNs.length > 0) return byNs[0]

  const dfsTree = (root: Element): Element | null => {
    if (root.localName === 'tree') return root
    for (let i = 0; i < root.children.length; i++) {
      const f = dfsTree(root.children[i] as Element)
      if (f) return f
    }
    return null
  }

  const metas = doc.getElementsByTagName('metadata')
  for (let m = 0; m < metas.length; m++) {
    const found = dfsTree(metas[m] as Element)
    if (found) return found
  }
  return null
}

/** 大纲中虚拟根「uisvg::root」的逻辑 id（对应 DOM `#layer-root`） */
export const UISVG_OUTLINE_ROOT_LOGICAL_ID = 'uisvg-root'

/** 仅列出 uisvg 对象根 `<g id>`；不列出 uisvg 命名空间语义子节点（`Frame`/`Form` 等），由父 `g` 代表。 */
function buildUisvgOutlineChildren(container: Element): OutlineNode[] {
  const out: OutlineNode[] = []
  for (let i = 0; i < container.children.length; i++) {
    const c = container.children[i] as Element
    if (c.tagName.toLowerCase() === 'g' && c.getAttribute('id')?.trim() && isUisvgObjectRootG(c)) {
      out.push(buildUisvgObjectGroupOutlineNode(c))
    }
  }
  return out
}

/**
 * 与 `buildUisvgOutlineChildren` 同规则递归收集对象根 DOM id。
 * 用于框选等：须基于 **XML 解析 + migrate** 后的文档，与大纲一致；
 * 勿仅用 `v-html` 后的 live DOM 列举，否则 HTML 嵌入 SVG 时命名空间差异可导致 `isUisvgObjectRootG` 全假、候选为 0。
 */
function collectUisvgObjectRootDomIdsUnderContainer(container: Element): string[] {
  const out: string[] = []
  for (let i = 0; i < container.children.length; i++) {
    const c = container.children[i] as Element
    if (c.tagName.toLowerCase() === 'g' && c.getAttribute('id')?.trim() && isUisvgObjectRootG(c)) {
      out.push(c.getAttribute('id')!.trim())
      out.push(...collectUisvgObjectRootDomIdsUnderContainer(c))
    }
  }
  return out
}

/** 框选候选：与左侧大纲可见的对象根一致（含 `#layer-sibling` 下） */
export function collectMarqueeCandidateDomIds(svgXml: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const out: string[] = []
  const lr = doc.getElementById('layer-root')
  const sib = doc.getElementById(LAYER_SIBLING_DOM_ID)
  if (lr) out.push(...collectUisvgObjectRootDomIdsUnderContainer(lr))
  if (sib) out.push(...collectUisvgObjectRootDomIdsUnderContainer(sib))
  return out
}

function buildUisvgObjectGroupOutlineNode(g: Element): OutlineNode {
  const id = g.getAttribute('id') || ''
  const bundle = readUisvgBundleFromObjectRoot(g)
  const uisvgLocalName = bundle.uisvgLocalName
  const label = bundle.label || id
  const children = buildUisvgOutlineChildren(g)
  return {
    id,
    uisvgLocalName,
    label,
    ref: `#${id}`,
    children: children.length ? children : undefined,
  }
}

/**
 * 将旧版 `<metadata><uisvg:root>…` 中的画布与大纲迁入图元 DOM 与根 `svg`，并移除 `uisvg:root`。
 * 可重复调用（已迁移文档无副作用）。
 */
export function migrateLegacyUisvgMetadata(doc: Document): void {
  const svg = doc.documentElement
  if (!svg || svg.tagName.toLowerCase() !== 'svg') return

  const tree = getUisvgTreeElement(doc)
  if (tree) {
    const canvases = doc.getElementsByTagNameNS(UISVG_NS, 'canvas')
    const c = canvases[0]
    if (c) {
      const w = parseFloat(c.getAttribute('width') || '1200') || 1200
      const h = parseFloat(c.getAttribute('height') || '800') || 800
      const g = parseFloat(c.getAttribute('grid') || '16') || 16
      const dpi = parseFloat(c.getAttribute('dpi') || '96') || 96
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      svg.setAttribute(UISVG_CANVAS_GRID_ATTR, String(g))
      svg.setAttribute(UISVG_CANVAS_DPI_ATTR, String(dpi))
    }

    const walkUisvgNodes = (el: Element) => {
      if (el.localName === 'node') {
        const ref = (el.getAttribute('ref') || '').trim()
        const m = ref.match(/^#(.+)$/)
        if (m?.[1]) {
          const target = getGraphicsElementByDomId(doc, m[1])
          if (target) {
            const kind = el.getAttribute('kind') || 'frame'
            const label = el.getAttribute('label') || m[1]
            target.setAttribute(UISVG_KIND_ATTR, kind)
            if (!target.getAttribute(UISVG_LABEL_ATTR)?.trim()) {
              target.setAttribute(UISVG_LABEL_ATTR, label)
            }
          }
        }
      }
      for (let i = 0; i < el.children.length; i++) {
        walkUisvgNodes(el.children[i] as Element)
      }
    }
    walkUisvgNodes(tree)

    const roots = doc.getElementsByTagNameNS(UISVG_NS, 'root')
    for (let i = roots.length - 1; i >= 0; i--) {
      roots[i].remove()
    }
    const metas = doc.getElementsByTagName('metadata')
    for (let i = metas.length - 1; i >= 0; i--) {
      const meta = metas[i]
      if (meta.childNodes.length === 0) meta.remove()
    }
  }

  const lr = doc.getElementById('layer-root')
  if (lr) {
    const hasSemantic = lr.getElementsByTagNameNS(UISVG_NS, '*').length > 0
    if (!hasSemantic) {
      writeUisvgBundleToObjectRoot(lr, {
        v: 1,
        uisvgLocalName: 'Frame',
        label: lr.getAttribute(UISVG_LABEL_ATTR)?.trim() || 'Root',
        uiProps: {},
      })
    }
  }

  migrateBareRectTextToObjectGroup(doc)
  migrateLegacyUisvgAttrsToMetaChild(doc)
  ensureAllObjectRootChildrenHaveIds(doc)
}

/** 将 `#layer-root` 下仍挂在根上的裸 `<rect id>` / `<text id>` 包进对象根 `<g id>`，并把 uisvg 属性迁到 `g` 上 */
function migrateBareRectTextToObjectGroup(doc: Document): void {
  const layer = doc.getElementById('layer-root')
  if (!layer) return
  const copyNames: readonly string[] = [
    UISVG_KIND_ATTR,
    UISVG_LABEL_ATTR,
    UISVG_UI_PROPS_ATTR,
    'data-winforms',
    'data-win32',
    'data-qt',
    'data-uisvg-from',
  ]
  const children = Array.from(layer.children)
  for (const el of children) {
    const tag = el.tagName.toLowerCase()
    if ((tag !== 'rect' && tag !== 'text') || !el.getAttribute('id')) continue
    const id = el.getAttribute('id')!
    const g = doc.createElementNS(SVG_NS, 'g')
    g.setAttribute('id', id)
    for (const name of copyNames) {
      const v = el.getAttribute(name)
      if (v != null && v !== '') {
        g.setAttribute(name, v)
        el.removeAttribute(name)
      }
    }
    el.removeAttribute('id')
    g.appendChild(el)
    layer.replaceChild(g, el)
  }
}

export function parseUisvgOutline(svgXml: string): OutlineNode[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const layerRoot = doc.getElementById('layer-root')
  if (!layerRoot) {
    return [{ id: 'svg', uisvgLocalName: 'svg', label: 'Document', ref: '' }]
  }
  const children = buildUisvgOutlineChildren(layerRoot)
  return [
    {
      id: UISVG_OUTLINE_ROOT_LOGICAL_ID,
      uisvgLocalName: 'uisvg.root',
      label: 'uisvg::root',
      ref: '#layer-root',
      children: children.length ? children : undefined,
    },
  ]
}

/** 大纲选中态：逻辑 id 与 ref 指向的 DOM id 任一匹配即高亮 */
export function outlineNodeMatchesSelection(node: OutlineNode, selectedId: string | null): boolean {
  if (!selectedId) return false
  if (node.id === selectedId) return true
  const ref = node.ref.trim()
  if (ref.startsWith('#') && ref.slice(1) === selectedId) return true
  /** 旧版 metadata 大纲根 id 为 `root`，DOM 为 `#layer-root` */
  if (selectedId === 'root' && node.id === 'layer-root') return true
  if (selectedId === 'layer-root' && node.id === 'root') return true
  /** 画布选中 `#layer-root` 时，高亮虚拟根 `uisvg::root` */
  if (selectedId === 'layer-root' && node.id === UISVG_OUTLINE_ROOT_LOGICAL_ID) return true
  if (selectedId === UISVG_OUTLINE_ROOT_LOGICAL_ID && node.id === UISVG_OUTLINE_ROOT_LOGICAL_ID) return true
  return false
}

/** 多选：任一选中 id 与大纲节点匹配即高亮 */
export function outlineNodeMatchesAnySelection(
  node: OutlineNode,
  selectedIds: string[] | null | undefined,
): boolean {
  if (!selectedIds?.length) return false
  return selectedIds.some((sid) => outlineNodeMatchesSelection(node, sid))
}

function findOutlineInForest(nodes: OutlineNode[], selectedId: string | null): OutlineNode | null {
  if (!selectedId) return null
  for (const n of nodes) {
    if (outlineNodeMatchesSelection(n, selectedId)) return n
    if (n.children?.length) {
      const r = findOutlineInForest(n.children, selectedId)
      if (r) return r
    }
  }
  return null
}

/** 当前选中项在大纲树中对应的节点（无匹配则 `null`） */
export function getOutlineNodeForSelection(svgXml: string, selectedId: string | null): OutlineNode | null {
  if (!selectedId) return null
  const nodes = parseUisvgOutline(svgXml)
  return findOutlineInForest(nodes, selectedId)
}

/**
 * 将大纲中的节点 id（如 `root`）或 DOM id（如 `layer-root`）解析为文档中真实元素的 `id`。
 */
export function resolveDomElementId(svgXml: string, outlineOrDomId: string | null): string | null {
  if (!outlineOrDomId) return null
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  /** 大纲虚拟根 `uisvg::root` → 画布 `#layer-root` */
  if (outlineOrDomId === UISVG_OUTLINE_ROOT_LOGICAL_ID && getGraphicsElementByDomId(doc, 'layer-root')) {
    return 'layer-root'
  }
  if (getGraphicsElementByDomId(doc, outlineOrDomId)) return outlineOrDomId
  /** 旧版大纲根节点 id 为 `root`，对应 DOM `#layer-root` */
  if (outlineOrDomId === 'root' && getGraphicsElementByDomId(doc, 'layer-root')) return 'layer-root'
  return null
}

/**
 * 画布命中得到的 DOM id → 大纲侧逻辑 id（`#layer-root` 映射为 `uisvg::root`）。
 */
export function outlineLogicalIdFromDomId(_svgXml: string, domId: string): string {
  if (domId === 'layer-root') return UISVG_OUTLINE_ROOT_LOGICAL_ID
  return domId
}

/**
 * 将点击到的任意子图元 id 解析为可选中的 **uisvg 对象根**（`#layer-root` 或带 uisvg 语义的 `<g id>`）。
 * 命中非 uisvg 子树则返回 `null`。
 */
export function resolveCanvasPickToUisvgObjectDomId(svgXml: string, pickedDomId: string): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  let el: Element | null = doc.getElementById(pickedDomId)
  if (!el) {
    el = getGraphicsElementByDomId(doc, pickedDomId)
  }
  if (!el) return null

  const svg = doc.documentElement
  let cur: Element | null = el
  while (cur && cur !== svg) {
    const tag = cur.tagName.toLowerCase()
    const id = cur.getAttribute('id')?.trim()
    if (tag === 'g' && id) {
      if (id === 'layer-root') return 'layer-root'
      if (isUisvgObjectRootG(cur)) return id
    }
    cur = cur.parentElement
  }
  return null
}

function readDisplayLabelForDom(doc: Document, domId: string): string {
  const el = getGraphicsElementByDomId(doc, domId)
  if (!el) return ''
  const lab = readUisvgBundleFromObjectRoot(el).label.trim()
  if (lab) return lab
  return el.id || ''
}

export function getSelectedElementSnapshot(svgXml: string, selectedId: string | null): SelectedElementSnapshot | null {
  const domId = resolveDomElementId(svgXml, selectedId)
  if (!domId) return null
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const el = getGraphicsElementByDomId(doc, domId)
  if (!el) return null

  const attrRows: ElementAttrRow[] = []
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i]
    if (a.name === UISVG_LABEL_ATTR) continue
    if (isUiManagedAttr(a.name)) continue
    attrRows.push({ name: a.name, value: a.value })
  }
  attrRows.sort((a, b) => a.name.localeCompare(b.name))

  const outerXml = new XMLSerializer().serializeToString(el)
  const displayLabel = readDisplayLabelForDom(doc, domId)

  return {
    domId,
    tagName: el.tagName,
    outerXml,
    displayLabel,
    attrRows,
  }
}

/**
 * 写回属性表与显示名称；`oldDomId` 为解析后的 DOM id。
 * 返回新 DOM id（若修改了 `id` 属性则变化）。
 */
export function applyElementEdits(
  svgXml: string,
  oldDomId: string,
  displayLabel: string,
  attrRows: ElementAttrRow[],
): { markup: string; newDomId: string } | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const el = getGraphicsElementByDomId(doc, oldDomId)
  if (!el) return null

  const bundle = readUisvgBundleFromObjectRoot(el)

  const map = new Map<string, string>()
  for (const row of attrRows) {
    const name = row.name.trim()
    if (!name || name === UISVG_LABEL_ATTR || isUiManagedAttr(name)) continue
    map.set(name, row.value)
  }

  let newDomId = (map.get('id') ?? '').trim() || oldDomId
  if (!newDomId) newDomId = oldDomId

  const namesToRemove: string[] = []
  for (let i = 0; i < el.attributes.length; i++) {
    namesToRemove.push(el.attributes[i].name)
  }
  for (const name of namesToRemove) {
    el.removeAttribute(name)
  }

  for (const name of Array.from(map.keys()).sort()) {
    const v = map.get(name)
    if (v === undefined || v === '') continue
    el.setAttribute(name, v)
  }

  if (!el.getAttribute('id')) {
    el.setAttribute('id', newDomId)
  }

  const lab = displayLabel.trim()
  bundle.label = lab || el.getAttribute('id') || bundle.label
  writeUisvgBundleToObjectRoot(el, bundle)

  return { markup: new XMLSerializer().serializeToString(doc), newDomId }
}

export function parseUiPropsJsonFromElement(el: Element): Record<string, string> {
  return { ...readUisvgBundleFromObjectRoot(el).uiProps }
}

/**
 * 写回「UI 属性」面板：合并到对象根下 uisvg 类型子节点（如 `Frame`）的 uiProps / platform。
 */
export function applyUiPanelEdits(
  svgXml: string,
  domId: string,
  opts: {
    semanticValues: Record<string, string>
    platform?: { winforms: string; win32: string; qt: string } | null
  },
): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  migrateLegacyUisvgMetadata(doc)
  const el = getGraphicsElementByDomId(doc, domId)
  if (!el) return null

  const b = readUisvgBundleFromObjectRoot(el)
  for (const [k, v] of Object.entries(opts.semanticValues)) {
    const t = v.trim()
    if (t) b.uiProps[k] = t
    else delete b.uiProps[k]
  }
  if (opts.platform) {
    b.platform = {
      winforms: opts.platform.winforms.trim(),
      win32: opts.platform.win32.trim(),
      qt: opts.platform.qt.trim(),
    }
  }
  writeUisvgBundleToObjectRoot(el, b)

  return new XMLSerializer().serializeToString(doc)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function maxNumericSuffixForIdPattern(doc: Document, re: RegExp): number {
  let max = 0
  const walk = (el: Element) => {
    const id = el.getAttribute('id')
    if (id) {
      const m = id.match(re)
      if (m) max = Math.max(max, parseInt(m[1], 10) || 0)
    }
    for (let i = 0; i < el.children.length; i++) walk(el.children[i] as Element)
  }
  if (doc.documentElement) walk(doc.documentElement)
  return max
}

/**
 * 在文档内分配 `prefix-序号` 的 DOM id（序号为现有同模式最大 + 1，与旧版时间戳 id 可共存）。
 */
export function nextSequentialDomId(doc: Document, prefix: string): { id: string; index: number } {
  const re = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`)
  const index = maxNumericSuffixForIdPattern(doc, re) + 1
  return { id: `${prefix}-${index}`, index }
}

/**
 * Windows 控件 DOM id：`uisvg-{controlId}-序号`。
 * 序号扫描同时兼容旧版 `w-{controlId}-序号`，避免与已有文档冲突。
 */
export function nextWindowsControlDomId(doc: Document, controlId: string): { id: string; index: number } {
  const esc = escapeRegExp(controlId)
  const legacy = maxNumericSuffixForIdPattern(doc, new RegExp(`^w-${esc}-(\\d+)$`))
  const current = maxNumericSuffixForIdPattern(doc, new RegExp(`^uisvg-${esc}-(\\d+)$`))
  const index = Math.max(legacy, current) + 1
  return { id: `uisvg-${controlId}-${index}`, index }
}

/** `appendRect` / `appendText` 等创建对象后的返回，便于选中新建节点 */
export type AppendObjectResult = { svg: string; createdDomId: string }

export function appendRect(svgXml: string, placement?: { x: number; y: number }): AppendObjectResult {
  let createdDomId = ''
  const svg = appendSvgShape(svgXml, (doc) => {
    const { id, index } = nextSequentialDomId(doc, 'rect')
    createdDomId = id
    const g = doc.createElementNS(SVG_NS, 'g')
    g.setAttribute('id', id)
    const rect = doc.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('x', String(placement?.x ?? 80))
    rect.setAttribute('y', String(placement?.y ?? 80))
    rect.setAttribute('width', '160')
    rect.setAttribute('height', '48')
    rect.setAttribute('fill', '#e8f4fc')
    rect.setAttribute('stroke', '#0078d4')
    rect.setAttribute('stroke-width', '1')
    g.appendChild(rect)
    appendToDrawingLayer(doc, g)
    addOutlineNode(doc, id, 'Rect', `Rectangle ${index}`, `#${id}`)
  })
  return { svg, createdDomId }
}

export function appendText(svgXml: string, placement?: { x: number; y: number }): AppendObjectResult {
  let createdDomId = ''
  const svg = appendSvgShape(svgXml, (doc) => {
    const { id, index } = nextSequentialDomId(doc, 'text')
    createdDomId = id
    const g = doc.createElementNS(SVG_NS, 'g')
    g.setAttribute('id', id)
    const text = doc.createElementNS(SVG_NS, 'text')
    const px = placement?.x ?? 80
    const py = placement?.y ?? 186
    text.setAttribute('x', String(px))
    text.setAttribute('y', String(py + 14))
    text.setAttribute('fill', '#1a1a1a')
    text.setAttribute('font-family', 'Segoe UI, sans-serif')
    text.setAttribute('font-size', '14')
    text.textContent = `Text ${index}`
    g.appendChild(text)
    appendToDrawingLayer(doc, g)
    addOutlineNode(doc, id, 'Text', `Text ${index}`, `#${id}`)
  })
  return { svg, createdDomId }
}

export function appendFrame(svgXml: string, placement?: { x: number; y: number }): AppendObjectResult {
  let createdDomId = ''
  const svg = appendSvgShape(svgXml, (doc) => {
    const { id, index } = nextSequentialDomId(doc, 'frame')
    createdDomId = id
    const g = doc.createElementNS(SVG_NS, 'g')
    g.setAttribute('id', id)
    const rect = doc.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('x', String(placement?.x ?? 320))
    rect.setAttribute('y', String(placement?.y ?? 80))
    rect.setAttribute('width', '240')
    rect.setAttribute('height', '160')
    rect.setAttribute('fill', '#f9f9f9')
    rect.setAttribute('stroke', '#a0a0a0')
    rect.setAttribute('stroke-width', '1')
    g.appendChild(rect)
    appendToDrawingLayer(doc, g)
    addOutlineNode(doc, id, 'Frame', `Frame ${index}`, `#${id}`)
  })
  return { svg, createdDomId }
}

/** 在已有对象根上登记语义标签与 label（写入 uisvg 类型子节点；`ref` 已忽略）。 */
export function addOutlineNode(doc: Document, id: string, uisvgLocalName: string, label: string, _ref: string): void {
  const el = getGraphicsElementByDomId(doc, id)
  if (!el) return
  const b = readUisvgBundleFromObjectRoot(el)
  b.uisvgLocalName = uisvgLocalName
  b.label = label
  writeUisvgBundleToObjectRoot(el, b)
}

/**
 * 大纲嵌套由 DOM 父子关系推导（`data-uisvg-*` 在图元上），重挂后无需再同步 metadata。
 */
export function syncOutlineTreeAfterReparent(_doc: Document, _childDomId: string, _newParentDomId: string): void {}

/** 保留调用点：由 `parseUisvgOutline` 按 DOM 生成树，无需对齐独立元数据层。 */
export function syncOutlineTreeToMatchDom(_doc: Document): void {}

export function appendSvgShape(svgXml: string, fn: (doc: Document) => void): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  removeEditorCanvasChrome(doc)
  migrateLegacyUisvgMetadata(doc)
  ensureUisvgXmlnsOnRootSvg(doc)
  fn(doc)
  ensureAllObjectRootChildrenHaveIds(doc)
  removeEditorCanvasChrome(doc)
  const ser = new XMLSerializer()
  return ser.serializeToString(doc)
}

function escapeXmlTextContent(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeXmlAttrValue(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/\r\n/g, '&#10;')
    .replace(/\r/g, '&#10;')
    .replace(/\n/g, '&#10;')
}

function formatElementOpenTag(el: Element): string {
  let s = `<${el.nodeName}`
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i]!
    s += ` ${a.name}="${escapeXmlAttrValue(a.value)}"`
  }
  return s
}

function sanitizeCommentBody(s: string): string {
  return s.replace(/--/g, '- -')
}

function serializeIndentedElement(el: Element, depth: number, indentUnit: string): string[] {
  const pad = indentUnit.repeat(depth)
  const lines: string[] = []

  const meaningfulChild = (n: ChildNode): boolean => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? '').trim() !== ''
    return (
      n.nodeType === Node.ELEMENT_NODE ||
      n.nodeType === Node.COMMENT_NODE ||
      n.nodeType === Node.CDATA_SECTION_NODE
    )
  }

  const kids = [...el.childNodes].filter(meaningfulChild)

  const open = formatElementOpenTag(el)

  if (kids.length === 0) {
    lines.push(`${pad}${open} />`)
    return lines
  }

  if (kids.length === 1 && kids[0]!.nodeType === Node.TEXT_NODE) {
    const tx = escapeXmlTextContent((kids[0]!.textContent ?? '').trim())
    lines.push(`${pad}${open}>${tx}</${el.nodeName}>`)
    return lines
  }

  lines.push(`${pad}${open}>`)
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = (child.textContent ?? '').trim()
      if (t) lines.push(`${indentUnit.repeat(depth + 1)}${escapeXmlTextContent(t)}`)
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      lines.push(...serializeIndentedElement(child as Element, depth + 1, indentUnit))
    } else if (child.nodeType === Node.COMMENT_NODE) {
      lines.push(
        `${indentUnit.repeat(depth + 1)}<!--${sanitizeCommentBody(child.textContent ?? '')}-->`,
      )
    } else if (child.nodeType === Node.CDATA_SECTION_NODE) {
      lines.push(`${indentUnit.repeat(depth + 1)}<![CDATA[${(child as CDATASection).data}]]>`)
    }
  }
  lines.push(`${pad}</${el.nodeName}>`)
  return lines
}

/**
 * 将 SVG/XML 格式化为带层级缩进的文本，供「保存 / 另存为」写入文件。
 * 解析失败时原样返回，避免破坏用户数据。
 */
export function formatSvgXmlForSave(xml: string, indentUnit = '  '): string {
  const trimmed = xml.trimStart()
  let decl = ''
  let body = trimmed
  const declMatch = trimmed.match(/^<\?xml[\s\S]*?\?>\s*/i)
  if (declMatch) {
    decl = `${declMatch[0].trim()}\n`
    body = trimmed.slice(declMatch[0].length)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(body, 'image/svg+xml')
  if (doc.querySelector('parsererror') || !doc.documentElement) {
    return xml
  }

  const serialized = serializeIndentedElement(doc.documentElement, 0, indentUnit).join('\n')
  return `${decl}${serialized}\n`
}
