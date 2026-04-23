import { getGraphicsElementByDomId, isTopLevelLayerDomId } from './uisvgDocument'

/** 解析 transform 中 translate 的参数片段（兼容 Unicode 减号、多余逗号）。 */
function parseTranslateArgNumber(raw: string): number {
  const t = raw.trim().replace(/\u2212/g, '-').replace(/,/g, ' ').split(/\s+/)[0] ?? ''
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

/** 是否允许拖拽移动（根 svg、顶层内容组 `layer-root` / `layer-sibling` 不移动） */
export function canMoveSvgElement(el: SVGElement | null): boolean {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'svg') return false
  if (tag === 'defs' || tag === 'metadata' || tag === 'title' || tag === 'desc') return false
  const id = el.getAttribute('id')
  if (id && isTopLevelLayerDomId(id)) return false
  return true
}

/**
 * 多选拖拽时：若同时选中了嵌套的带 id 祖先与后代，只对「最外层被选中的根」施加平移，
 * 避免子树被平移两次导致图元「狂飙」。
 */
export function filterRootMostMovableDomIds(root: SVGSVGElement, domIds: string[]): string[] {
  const uniqueIds = [...new Set(domIds)]
  const resolved = uniqueIds
    .map((id) => ({ id, el: getGraphicsElementByDomId(root, id) as SVGElement | null }))
    .filter((x): x is { id: string; el: SVGElement } => !!x.el && canMoveSvgElement(x.el))
  const idSet = new Set(resolved.map((x) => x.id))
  return resolved
    .filter(({ el }) => {
      let p: Element | null = el.parentElement
      while (p && p !== root) {
        const pid = p.getAttribute('id')?.trim()
        if (pid && idSet.has(pid)) return false
        p = p.parentElement
      }
      return true
    })
    .map((x) => x.id)
}

/** 点击命中的对象根是否由当前拖拽根集合覆盖（含：命中子控件而实际只拖祖先的情况）。 */
export function isDomIdCoveredByDragRoots(
  root: SVGSVGElement,
  pickedDomId: string,
  dragRootDomIds: string[],
): boolean {
  if (!dragRootDomIds.length) return false
  if (dragRootDomIds.includes(pickedDomId)) return true
  const pickedEl = getGraphicsElementByDomId(root, pickedDomId) as Element | null
  if (!pickedEl) return false
  for (const rid of dragRootDomIds) {
    const r = getGraphicsElementByDomId(root, rid) as Element | null
    if (r && r.contains(pickedEl)) return true
  }
  return false
}

/**
 * 在 SVG 用户坐标系内平移图元（直接改 DOM 属性，用于拖拽中实时预览；mouseup 再序列化）。
 */
export function applyTranslateToSVGElement(el: SVGElement, dx: number, dy: number): void {
  if (!dx && !dy) return
  const tag = el.tagName.toLowerCase()

  if (tag === 'rect' || tag === 'text' || tag === 'tspan') {
    const x = parseFloat(el.getAttribute('x') || '0')
    const y = parseFloat(el.getAttribute('y') || '0')
    el.setAttribute('x', String(x + dx))
    el.setAttribute('y', String(y + dy))
    return
  }

  if (tag === 'circle') {
    el.setAttribute('cx', String(parseFloat(el.getAttribute('cx') || '0') + dx))
    el.setAttribute('cy', String(parseFloat(el.getAttribute('cy') || '0') + dy))
    return
  }

  if (tag === 'ellipse') {
    el.setAttribute('cx', String(parseFloat(el.getAttribute('cx') || '0') + dx))
    el.setAttribute('cy', String(parseFloat(el.getAttribute('cy') || '0') + dy))
    return
  }

  if (tag === 'line') {
    el.setAttribute('x1', String(parseFloat(el.getAttribute('x1') || '0') + dx))
    el.setAttribute('y1', String(parseFloat(el.getAttribute('y1') || '0') + dy))
    el.setAttribute('x2', String(parseFloat(el.getAttribute('x2') || '0') + dx))
    el.setAttribute('y2', String(parseFloat(el.getAttribute('y2') || '0') + dy))
    return
  }

  if (tag === 'polyline' || tag === 'polygon') {
    const pts = el.getAttribute('points')
    if (!pts) return
    const next = pts.replace(
      /([-\d.]+)\s*,\s*([-\d.]+)/g,
      (_, a: string, b: string) => `${parseFloat(a) + dx},${parseFloat(b) + dy}`,
    )
    el.setAttribute('points', next)
    return
  }

  if (tag === 'g' || tag === 'svg') {
    mergeTranslateOnGroup(el, dx, dy)
    return
  }

  mergeTranslateOnGroup(el, dx, dy)
}

function mergeTranslateOnGroup(el: SVGElement, dx: number, dy: number): void {
  const t = (el.getAttribute('transform') || '').trim()

  /**
   * 仅含一个或多个 translate（常见对象根 g）：合并为单个 translate，
   * 避免链式 `translate(a b) translate(c d)` 只更新第一段导致数值与几何不一致、拖拽「狂飙」。
   */
  const translateOnly = /^(\s*translate\s*\([^)]*\)\s*)+$/i.test(t)
  if (translateOnly) {
    const translateRe = /translate\s*\(\s*([^)]+)\s*\)/gi
    let sx = 0
    let sy = 0
    let m: RegExpExecArray | null
    while ((m = translateRe.exec(t))) {
      const parts = m[1]
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
      sx += parseTranslateArgNumber(parts[0] || '0')
      sy += parseTranslateArgNumber(parts[1] || '0')
    }
    sx += dx
    sy += dy
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return
    el.setAttribute('transform', `translate(${sx} ${sy})`)
    return
  }

  const re = /translate\s*\(\s*([-\d.\u2212]+)\s*[, ]\s*([-\d.\u2212]+)\s*\)/
  const m = t.match(re)
  if (m) {
    const tx = parseTranslateArgNumber(m[1]) + dx
    const ty = parseTranslateArgNumber(m[2]) + dy
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return
    const next = t.replace(re, `translate(${tx} ${ty})`)
    el.setAttribute('transform', next)
    return
  }
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return
  if (t) {
    el.setAttribute('transform', `${t} translate(${dx} ${dy})`)
  } else {
    el.setAttribute('transform', `translate(${dx} ${dy})`)
  }
}
