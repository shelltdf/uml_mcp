import { isTopLevelLayerDomId } from './uisvgDocument'

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
  const re = /translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/
  const m = t.match(re)
  if (m) {
    const tx = parseFloat(m[1]) + dx
    const ty = parseFloat(m[2]) + dy
    const next = t.replace(re, `translate(${tx} ${ty})`)
    el.setAttribute('transform', next)
    return
  }
  if (t) {
    el.setAttribute('transform', `${t} translate(${dx} ${dy})`)
  } else {
    el.setAttribute('transform', `translate(${dx} ${dy})`)
  }
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
