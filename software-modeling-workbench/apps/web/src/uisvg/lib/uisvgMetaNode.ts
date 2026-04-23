/**
 * UISVG 语义节点：抽象 UI 类型在 SVG 中的实例（命名空间 `http://uisvg.org/ns/1`）。
 * 每个对象根 `<g id>` 下优先用 **具体 UI 类型** 的 uisvg 元素（如 `Form`、`Button`、`Frame`）承载语义；
 * 其兄弟 **纯 SVG 几何**可不设 `id`（由 `ensureObjectRootDirectChildIds` 去掉冗余 id）。
 * 与 WinForms / 基础图元类型一致，便于按类型扩展属性与维护。
 * 属性：`label`、`data-uisvg-ui-props`（JSON）、`data-winforms` / `data-win32` / `data-qt`、`from` 等。
 * 读入仍兼容旧版 `uisvg:bundle` / `uisvg:meta`（CDATA JSON）及 `g` 上分散的 `data-*`。
 * **类型字段**：持久化以子元素 **localName** 为准；内存 bundle 为 **`UisvgObjectBundleV1.uisvgLocalName`**（旧 JSON 字段 `kind` 在读入时迁移）。
 */

const UISVG_NS = 'http://uisvg.org/ns/1'
/** 通过 HTML `innerHTML` 嵌入的 SVG 中，语义子元素常落在 SVG 命名空间（而非 UISVG_NS） */
const SVG_NS = 'http://www.w3.org/2000/svg'
const KIND_ATTR = 'data-uisvg-kind'
const LABEL_ATTR = 'data-uisvg-label'
const UI_PROPS_ATTR = 'data-uisvg-ui-props'

export { UISVG_NS }

/**
 * 与根 SVG 上 `xmlns:uisvg="http://uisvg.org/ns/1"` 一致的前缀，用于界面展示 **QName**（如 `uisvg:Form`）。
 */
export const UISVG_XML_PREFIX = 'uisvg'

/**
 * 对象根 `<g id>` 下 **唯一** uisvg 语义节点（`Frame` / `Form` 等）的 id：`{gId}-ui`（表示本 g 的 UI 定义）。
 */
export const UISVG_SEMANTIC_ID_SUFFIX = '-ui'

export function uisvgSemanticElementIdForObjectRoot(objectRootId: string): string {
  return `${objectRootId.trim()}${UISVG_SEMANTIC_ID_SUFFIX}`
}

/** 直接子节点在父 `g` 内的用途名（用于拼全局唯一 id：`{gId}-{purpose}`） */
function purposeSuffixForDirectChild(el: Element): string {
  if (el.namespaceURI === UISVG_NS) return 'ui'
  const t = el.tagName.toLowerCase()
  if (t === 'rect') return 'shape'
  if (t === 'text') return 'text'
  if (t === 'image') return 'bitmap'
  if (t === 'path') return 'path'
  if (t === 'line') return 'line'
  if (t === 'circle') return 'circle'
  if (t === 'ellipse') return 'ellipse'
  if (t === 'polygon' || t === 'polyline') return 'shape'
  if (t === 'g') return 'group'
  if (t === 'use') return 'use'
  if (t === 'tspan') return 'tspan'
  return 'part'
}

/** 纯 SVG 几何/文本：可不设 `id`（编辑与命中以对象根 `<g id>` 为准） */
const PLAIN_SVG_SHAPE_TAGS = new Set([
  'circle',
  'ellipse',
  'image',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'text',
  'tspan',
  'use',
])

function isPlainSvgGeometryOrText(el: Element): boolean {
  if (el.namespaceURI === UISVG_NS) return false
  return PLAIN_SVG_SHAPE_TAGS.has(el.tagName.toLowerCase())
}

/**
 * 为仍需全局寻址的直接子节点补 `id`（uisvg 语义节点、嵌套 `g` 等）。
 * 纯几何子节点不强制 `id`，并会移除历史 `{gId}-shape` 等冗余 id。
 * 旧版 `*__uisvg` 会规范为 `*-ui`；同名用途冲突时加 `-2`、`-3`…
 */
export function ensureObjectRootDirectChildIds(objectRootG: Element): void {
  const gid = objectRootG.getAttribute('id')?.trim()
  if (!gid) return
  const doc = objectRootG.ownerDocument
  if (!doc) return

  for (let i = 0; i < objectRootG.children.length; i++) {
    const c = objectRootG.children[i] as Element
    if (isPlainSvgGeometryOrText(c)) {
      c.removeAttribute('id')
    }
  }

  const legacy = '__uisvg'
  for (let i = 0; i < objectRootG.children.length; i++) {
    const c = objectRootG.children[i] as Element
    const oid = c.getAttribute('id')?.trim()
    if (oid?.endsWith(legacy)) {
      const base = oid.slice(0, -legacy.length)
      const nid = `${base}-ui`
      const hit = doc.getElementById(nid)
      if (!hit || hit === c) {
        c.setAttribute('id', nid)
      }
    }
  }

  const used = new Set<string>()
  for (let i = 0; i < objectRootG.children.length; i++) {
    const c = objectRootG.children[i] as Element
    const existing = c.getAttribute('id')?.trim()
    if (existing) {
      used.add(existing)
    }
  }

  for (let i = 0; i < objectRootG.children.length; i++) {
    const c = objectRootG.children[i] as Element
    if (c.getAttribute('id')?.trim()) continue
    if (isPlainSvgGeometryOrText(c)) continue

    const base = purposeSuffixForDirectChild(c)
    let candidate = `${gid}-${base}`
    let n = 2
    while (used.has(candidate) || doc.getElementById(candidate)) {
      candidate = `${gid}-${base}-${n}`
      n++
    }
    used.add(candidate)
    c.setAttribute('id', candidate)
  }
}

/** 在 `#layer-root` 子树内，规范化各对象根 `g` 的直接子节点 id（去掉多余几何 id、补 uisvg/嵌套 g 等） */
export function ensureAllObjectRootChildrenHaveIds(doc: Document): void {
  const lr = doc.getElementById('layer-root')
  if (!lr) return
  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'g' && el.getAttribute('id')?.trim()) {
      ensureObjectRootDirectChildIds(el)
    }
    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i] as Element)
    }
  }
  walk(lr)
}

/** 旧版通用容器（CDATA JSON），仅读入与迁移时移除 */
export const UISVG_BUNDLE_LOCAL = 'bundle'
/** 旧版，仅读入与迁移时移除 */
export const UISVG_LEGACY_META_LOCAL = 'meta'

export interface UisvgObjectBundleV1 {
  v: 1
  /**
   * 与对象根下 uisvg 语义子元素 localName 一致（如 `Form`、`Frame`、`Rect`）。
   * 旧版文档中的 `kind`（`frame` / `win.Form`）在 `normalizeBundle` 读入时迁移为此字段。
   */
  uisvgLocalName: string
  label: string
  uiProps: Record<string, string>
  platform?: { winforms: string; win32: string; qt: string }
  /** 来源标记，如像素导入 */
  from?: string
}

/**
 * 将旧版「逻辑 kind」或任意遗留字符串规范为 **uisvg 元素 localName**（`Form`、`Frame`、`Rect`…）。
 * 已为新格式的 PascalCase 名称则原样返回。
 */
export function legacyLogicalKindToUisvgLocalName(s: string): string {
  const k = s.trim()
  if (!k) return 'Frame'
  if (k === 'uisvg.root') return 'Root'
  if (k === 'frame' || k === 'g') return 'Frame'
  if (k === 'rect') return 'Rect'
  if (k === 'text') return 'Text'
  if (k === 'image') return 'Image'
  if (k.startsWith('win.')) {
    const id = k.slice(4).trim()
    return id || 'Panel'
  }
  if (/^[A-Z][A-Za-z0-9]*$/.test(k)) return k
  return 'Frame'
}

/**
 * 界面展示的 UISVG QName：`uisvg:LocalName`（如 `uisvg:Form`）。
 * 可传入 **localName**（`Form`）或旧版 **kind**（`win.Form` / `frame`），均会先规范化。
 */
export function uisvgLocalNameToQName(localNameOrLegacy: string): string {
  const local = legacyLogicalKindToUisvgLocalName(localNameOrLegacy)
  return `${UISVG_XML_PREFIX}:${local}`
}

/** 大纲虚拟节点等：一行展示用 UISVG 类型字符串 */
export function outlineNodeUisvgDisplayLine(uisvgLocalName: string): string {
  if (uisvgLocalName === 'svg') return 'svg'
  if (uisvgLocalName === 'uisvg.root') return 'uisvg::root'
  return uisvgLocalNameToQName(uisvgLocalName)
}

function inferKindFromTag(el: Element): string {
  const t = el.tagName.toLowerCase()
  if (t === 'rect') return 'rect'
  if (t === 'text') return 'text'
  if (t === 'image') return 'image'
  if (t === 'g') return 'frame'
  return t || 'node'
}

function parseUiPropsAttrOn(el: Element): Record<string, string> {
  const raw = el.getAttribute(UI_PROPS_ATTR)
  if (!raw?.trim()) return {}
  try {
    const o = JSON.parse(raw) as unknown
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        out[k] = String(v ?? '')
      }
      return out
    }
  } catch {
    /* ignore */
  }
  return {}
}

type LegacyBundleInput = Partial<UisvgObjectBundleV1> & { kind?: string }

function normalizeBundle(b: LegacyBundleInput): UisvgObjectBundleV1 {
  let uisvgLocalName = b.uisvgLocalName?.trim()
  if (!uisvgLocalName && typeof b.kind === 'string' && b.kind.trim()) {
    uisvgLocalName = legacyLogicalKindToUisvgLocalName(b.kind)
  }
  if (!uisvgLocalName) uisvgLocalName = 'Frame'
  return {
    v: 1,
    uisvgLocalName,
    label: b.label || '',
    uiProps: b.uiProps && typeof b.uiProps === 'object' ? { ...b.uiProps } : {},
    platform: b.platform
      ? {
          winforms: b.platform.winforms ?? '',
          win32: b.platform.win32 ?? '',
          qt: b.platform.qt ?? '',
        }
      : undefined,
    from: b.from?.trim() || undefined,
  }
}

function findBundleOrLegacyMeta(el: Element): Element | null {
  const b = el.getElementsByTagNameNS(UISVG_NS, UISVG_BUNDLE_LOCAL)[0]
  if (b) return b
  return el.getElementsByTagNameNS(UISVG_NS, UISVG_LEGACY_META_LOCAL)[0] ?? null
}

/**
 * HTML 嵌入的 SVG 内：`Form`/`Frame` 等常为 SVG 命名空间 + PascalCase localName（与标准小写 `rect`/`text` 区分）。
 */
function isSvgHostedUisvgSemanticEquivalent(el: Element): boolean {
  if (el.namespaceURI !== SVG_NS) return false
  const ln = el.localName
  if (ln === 'bundle' || ln === 'meta') return true
  return /^[A-Z][A-Za-z0-9]*$/.test(ln)
}

/** 对象根 `<g>` 下第一个语义子节点（uisvg 命名空间，或 HTML 嵌入时的 SVG 命名空间等价标签） */
export function findFirstUisvgSemanticChild(el: Element): Element | null {
  for (let i = 0; i < el.children.length; i++) {
    const c = el.children[i] as Element
    if (c.namespaceURI === UISVG_NS) return c
    if (isSvgHostedUisvgSemanticEquivalent(c)) return c
  }
  return null
}

function readFromJsonBundleElement(node: Element): UisvgObjectBundleV1 | null {
  const raw = (node.textContent || '').trim()
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as unknown
    if (o && typeof o === 'object' && !Array.isArray(o) && (o as UisvgObjectBundleV1).v === 1) {
      return normalizeBundle(o as UisvgObjectBundleV1)
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * 从 uisvg 语义子元素得到规范的 `uisvgLocalName`。
 * SVG/XML 序列化或解析后标签名常为全小写（如 `form`），与 WinForms 的 `Form` 不一致；
 * 优先使用 `data-winforms`（写入时即为 PascalCase），否则对已 PascalCase 的 localName 原样采用，否则首字母大写。
 */
function uisvgLocalNameFromTypedSemanticElement(typed: Element): string {
  const winforms = typed.getAttribute('data-winforms')?.trim() ?? ''
  if (winforms) return winforms
  const ln = typed.localName
  if (/^[A-Z][A-Za-z0-9]*$/.test(ln)) return ln
  if (!ln) return 'Frame'
  return ln.charAt(0).toUpperCase() + ln.slice(1)
}

function readFromTypedSemantic(typed: Element): UisvgObjectBundleV1 {
  const uisvgLocalName = uisvgLocalNameFromTypedSemanticElement(typed)
  const label =
    typed.getAttribute('label')?.trim() ||
    typed.getAttribute(LABEL_ATTR)?.trim() ||
    (typed.parentElement?.getAttribute('id') ?? '')
  const uiProps = parseUiPropsAttrOn(typed)
  const winforms = typed.getAttribute('data-winforms')?.trim() ?? ''
  const win32 = typed.getAttribute('data-win32') ?? ''
  const qt = typed.getAttribute('data-qt') ?? ''
  const basic = new Set(['Frame', 'Rect', 'Text', 'Image', 'Root'])
  let platform: { winforms: string; win32: string; qt: string } | undefined =
    winforms || win32 || qt ? { winforms, win32, qt } : undefined
  if (!platform && !basic.has(uisvgLocalName)) {
    platform = { winforms: uisvgLocalName, win32: '', qt: '' }
  }
  const from = typed.getAttribute('from')?.trim() || typed.getAttribute('data-uisvg-from')?.trim() || undefined
  return normalizeBundle({ v: 1, uisvgLocalName, label, uiProps, platform, from })
}

/** 从对象根读取：优先具体类型子节点 → 旧 bundle/meta JSON → legacy `g` 属性 */
export function readUisvgBundleFromObjectRoot(el: Element): UisvgObjectBundleV1 {
  const first = findFirstUisvgSemanticChild(el)
  if (first) {
    const ln = first.localName
    if (ln === UISVG_BUNDLE_LOCAL || ln === UISVG_LEGACY_META_LOCAL) {
      const parsed = readFromJsonBundleElement(first)
      if (parsed) return parsed
    } else {
      return readFromTypedSemantic(first)
    }
  }

  const legacy = findBundleOrLegacyMeta(el)
  if (legacy) {
    const parsed = readFromJsonBundleElement(legacy)
    if (parsed) return parsed
  }

  const winforms = el.getAttribute('data-winforms')?.trim() ?? ''
  const platform =
    winforms || el.getAttribute('data-win32') || el.getAttribute('data-qt')
      ? {
          winforms,
          win32: el.getAttribute('data-win32') ?? '',
          qt: el.getAttribute('data-qt') ?? '',
        }
      : undefined

  const legacyKind = el.getAttribute(KIND_ATTR)?.trim() || inferKindFromTag(el)
  return normalizeBundle({
    v: 1,
    uisvgLocalName: legacyLogicalKindToUisvgLocalName(legacyKind),
    label: el.getAttribute(LABEL_ATTR) || el.getAttribute('id') || '',
    uiProps: parseUiPropsAttrOn(el),
    platform,
    from: el.getAttribute('data-uisvg-from')?.trim() || undefined,
  })
}

function removeAllUisvgSemanticDirectChildren(el: Element): void {
  for (let i = el.children.length - 1; i >= 0; i--) {
    const c = el.children[i] as Element
    if (c.namespaceURI === UISVG_NS || isSvgHostedUisvgSemanticEquivalent(c)) c.remove()
  }
}

/** 写入对象根：创建与 `uisvgLocalName` 对应的 uisvg 类型元素 + 移除 legacy 与旧 bundle/meta */
export function writeUisvgBundleToObjectRoot(el: Element, bundle: UisvgObjectBundleV1): void {
  const doc = el.ownerDocument
  if (!doc) return
  const b = normalizeBundle(bundle)

  removeAllUisvgSemanticDirectChildren(el)

  const typed = doc.createElementNS(UISVG_NS, b.uisvgLocalName)
  typed.setAttribute('label', b.label)

  if (Object.keys(b.uiProps).length > 0) {
    typed.setAttribute(UI_PROPS_ATTR, JSON.stringify(b.uiProps))
  }
  if (b.platform) {
    typed.setAttribute('data-winforms', b.platform.winforms)
    typed.setAttribute('data-win32', b.platform.win32)
    typed.setAttribute('data-qt', b.platform.qt)
  }
  if (b.from) {
    typed.setAttribute('from', b.from)
  }

  el.insertBefore(typed, el.firstChild)

  ensureObjectRootDirectChildIds(el)

  el.removeAttribute(KIND_ATTR)
  el.removeAttribute(LABEL_ATTR)
  el.removeAttribute(UI_PROPS_ATTR)
  el.removeAttribute('data-winforms')
  el.removeAttribute('data-win32')
  el.removeAttribute('data-qt')
  el.removeAttribute('data-uisvg-from')
}

/** 在 `layer-root` 子树内，将仍带 legacy 属性或旧 bundle 的对象根迁成具体类型节点 */
export function migrateLegacyUisvgAttrsToMetaChild(doc: Document): void {
  const lr = doc.getElementById('layer-root')
  if (!lr) return

  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase()
    if (tag !== 'g' || !el.getAttribute('id')) {
      for (let i = 0; i < el.children.length; i++) {
        const c = el.children[i] as Element
        if (isUisvgSemanticElement(c)) continue
        walk(c)
      }
      return
    }

    const first = findFirstUisvgSemanticChild(el)
    const hasTyped =
      first &&
      first.localName !== UISVG_BUNDLE_LOCAL &&
      first.localName !== UISVG_LEGACY_META_LOCAL
    const hasLegacyBundle =
      el.getElementsByTagNameNS(UISVG_NS, UISVG_BUNDLE_LOCAL).length > 0 ||
      el.getElementsByTagNameNS(UISVG_NS, UISVG_LEGACY_META_LOCAL).length > 0
    const hasSemantic = !!first
    const hasLegacy =
      el.hasAttribute(KIND_ATTR) ||
      el.hasAttribute(LABEL_ATTR) ||
      el.hasAttribute(UI_PROPS_ATTR) ||
      el.hasAttribute('data-winforms') ||
      el.hasAttribute('data-uisvg-from')

    if (!hasTyped && (hasLegacyBundle || hasLegacy)) {
      const b = readUisvgBundleFromObjectRoot(el)
      writeUisvgBundleToObjectRoot(el, b)
    }

    for (let i = 0; i < el.children.length; i++) {
      const c = el.children[i] as Element
      if (isUisvgSemanticElement(c)) continue
      walk(c)
    }
  }

  walk(lr)
}

/** 是否为对象根下的 uisvg 语义子节点（uisvg 命名空间，或 HTML 嵌入时的 SVG 命名空间等价标签） */
export function isUisvgSemanticElement(el: Element): boolean {
  return el.namespaceURI === UISVG_NS || isSvgHostedUisvgSemanticEquivalent(el)
}

/**
 * 带 `id` 的对象根 `<g>` 是否承载 uisvg（含语义子节点或 legacy 属性）。
 * 用于大纲与画布命中：仅此类 `g` 视为可选中的 uisvg 对象。
 */
export function isUisvgObjectRootG(el: Element): boolean {
  if (el.tagName.toLowerCase() !== 'g') return false
  if (!el.getAttribute('id')?.trim()) return false
  if (findFirstUisvgSemanticChild(el)) return true
  if (
    el.hasAttribute(KIND_ATTR) ||
    el.hasAttribute(LABEL_ATTR) ||
    el.hasAttribute(UI_PROPS_ATTR) ||
    el.hasAttribute('data-winforms') ||
    el.hasAttribute('data-uisvg-from')
  ) {
    return true
  }
  if (el.getElementsByTagNameNS(UISVG_NS, UISVG_BUNDLE_LOCAL).length > 0) return true
  if (el.getElementsByTagNameNS(UISVG_NS, UISVG_LEGACY_META_LOCAL).length > 0) return true
  return false
}

/** @deprecated 使用 isUisvgSemanticElement */
export function isUisvgMetaElement(el: Element): boolean {
  return isUisvgSemanticElement(el)
}
