/**
 * 矢量 SVG / HTML DOM → 与像素导入相同的 `RasterImportPart` 列表，供 `appendRasterUISemantic` 写入。
 */

import { WINDOWS_BUILDER_CONTROL_IDS } from './windowsUiControls'
import {
  classifySemanticControl,
  type RasterDetectedRect,
  type RasterImportPart,
} from './rasterUiDetect'

function hasBuilder(controlId: string): boolean {
  return WINDOWS_BUILDER_CONTROL_IDS.includes(controlId)
}

function parseSvgRootSize(svg: SVGSVGElement): { w: number; h: number } {
  const vb = svg.viewBox?.baseVal
  if (vb && vb.width > 0 && vb.height > 0) {
    return { w: vb.width, h: vb.height }
  }
  const w = parseFloat(String(svg.getAttribute('width') || '').replace(/px$/i, '')) || 0
  const h = parseFloat(String(svg.getAttribute('height') || '').replace(/px$/i, '')) || 0
  if (w > 0 && h > 0) return { w, h }
  return { w: 800, h: 600 }
}

/** 轴对齐矩形重叠占 a 面积比例 */
function overlapAreaRatio(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): number {
  const ix0 = Math.max(ax, bx)
  const iy0 = Math.max(ay, by)
  const ix1 = Math.min(ax + aw, bx + bw)
  const iy1 = Math.min(ay + ah, by + bh)
  if (ix1 <= ix0 || iy1 <= iy0) return 0
  const inter = (ix1 - ix0) * (iy1 - iy0)
  const sa = aw * ah
  return sa > 0 ? inter / sa : 0
}

const SVG_LEAF_TAGS = new Set([
  'rect',
  'circle',
  'ellipse',
  'path',
  'line',
  'polyline',
  'polygon',
  'image',
  'text',
  'use',
])

function walkSvgGraphics(clone: SVGSVGElement, iw: number, ih: number, out: RasterDetectedRect[]) {
  function walk(el: Element) {
    const tag = el.tagName.toLowerCase()
    if (
      tag === 'defs' ||
      tag === 'clippath' ||
      tag === 'mask' ||
      tag === 'pattern' ||
      tag === 'marker' ||
      tag === 'lineargradient' ||
      tag === 'radialgradient'
    ) {
      return
    }
    if (SVG_LEAF_TAGS.has(tag) && el instanceof SVGGraphicsElement) {
      try {
        const b = el.getBBox()
        if (b.width >= 2 && b.height >= 2) {
          const areaRatio = (b.width * b.height) / (iw * ih)
          if (areaRatio < 0.96) {
            out.push({ x: b.x, y: b.y, w: b.width, h: b.height, fill: '#a0a0a0' })
          }
        }
      } catch {
        /* getBBox 在未渲染等情况下可能抛错 */
      }
    }
    for (const c of el.children) walk(c)
  }
  walk(clone)
}

function rectsToParts(raw: RasterDetectedRect[], iw: number, ih: number): RasterImportPart[] {
  raw.sort((a, b) => b.w * b.h - a.w * a.h)
  const parts: RasterImportPart[] = []
  const maxParts = 80
  for (const r of raw) {
    if (parts.length >= maxParts) break
    const areaRatio = (r.w * r.h) / (iw * ih)
    let controlId = classifySemanticControl(r, iw, ih, areaRatio)
    if (!hasBuilder(controlId)) controlId = 'Panel'
    parts.push({
      kind: 'semantic',
      controlId,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
    })
  }
  return parts
}

export async function detectUiImportFromSvgText(svgText: string): Promise<{
  parts: RasterImportPart[]
  imageWidth: number
  imageHeight: number
}> {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('SVG parse error')
  }
  const root = doc.documentElement as unknown as SVGSVGElement
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    throw new Error('root not svg')
  }

  const host = document.createElement('div')
  host.setAttribute(
    'style',
    'position:fixed;left:-9999px;top:0;width:10px;height:10px;overflow:hidden;visibility:hidden;pointer-events:none',
  )
  const clone = root.cloneNode(true) as SVGSVGElement
  document.body.appendChild(host)
  host.appendChild(clone)

  const { w: iw, h: ih } = parseSvgRootSize(clone)
  const raw: RasterDetectedRect[] = []
  walkSvgGraphics(clone, iw, ih, raw)

  host.remove()

  const parts = rectsToParts(raw, iw, ih)
  return { parts, imageWidth: iw, imageHeight: ih }
}

export async function detectUiImportFromSvgFile(file: File): Promise<{
  parts: RasterImportPart[]
  imageWidth: number
  imageHeight: number
}> {
  const text = await file.text()
  return detectUiImportFromSvgText(text)
}

const HTML_SELECTOR = [
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'img',
  'video',
  'canvas',
  'label',
  'a[href]',
  'table',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'section',
  'article',
  'header',
  'footer',
  'nav',
  'main',
  'aside',
  'form',
  'fieldset',
  'div',
  'span',
].join(',')

export function detectUiImportFromHtmlString(html: string): Promise<{
  parts: RasterImportPart[]
  imageWidth: number
  imageHeight: number
}> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-same-origin')
    iframe.setAttribute(
      'style',
      'position:fixed;left:-9999px;top:0;width:1600px;height:1200px;border:0;visibility:hidden;pointer-events:none',
    )

    const cleanup = () => {
      try {
        iframe.remove()
      } catch {
        /* ignore */
      }
    }

    iframe.onload = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            const doc = iframe.contentDocument
            const win = iframe.contentWindow
            if (!doc || !doc.body || !win) {
              cleanup()
              reject(new Error('no body'))
              return
            }
            const body = doc.body
            const w = Math.max(800, body.scrollWidth, doc.documentElement.scrollWidth)
            const h = Math.max(600, body.scrollHeight, doc.documentElement.scrollHeight)
            const br = body.getBoundingClientRect()

            const raw: RasterDetectedRect[] = []
            const candidates = body.querySelectorAll(HTML_SELECTOR)
            for (const el of candidates) {
              const st = win.getComputedStyle(el)
              if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) continue
              const r = el.getBoundingClientRect()
              const rw = r.width
              const rh = r.height
              if (rw < 8 || rh < 8) continue
              const x = r.left - br.left + body.scrollLeft
              const y = r.top - br.top + body.scrollTop
              const areaRatio = (rw * rh) / (w * h)
              if (areaRatio > 0.92) continue
              raw.push({ x, y, w: rw, h: rh, fill: '#909090' })
            }

            raw.sort((a, b) => b.w * b.h - a.w * a.h)
            const picked: RasterDetectedRect[] = []
            const parts: RasterImportPart[] = []
            outer: for (const r of raw) {
              if (parts.length >= 80) break
              for (const p of picked) {
                if (overlapAreaRatio(r.x, r.y, r.w, r.h, p.x, p.y, p.w, p.h) > 0.45) continue outer
              }
              picked.push(r)
              const areaRatio = (r.w * r.h) / (w * h)
              let controlId = classifySemanticControl(r, w, h, areaRatio)
              if (!hasBuilder(controlId)) controlId = 'Panel'
              parts.push({
                kind: 'semantic',
                controlId,
                x: r.x,
                y: r.y,
                w: r.w,
                h: r.h,
              })
            }

            cleanup()
            resolve({ parts, imageWidth: w, imageHeight: h })
          } catch (e) {
            cleanup()
            reject(e instanceof Error ? e : new Error(String(e)))
          }
        })
      })
    }

    iframe.onerror = () => {
      cleanup()
      reject(new Error('iframe load error'))
    }

    document.body.appendChild(iframe)
    iframe.srcdoc = html
  })
}

export async function detectUiImportFromHtmlFile(file: File): Promise<{
  parts: RasterImportPart[]
  imageWidth: number
  imageHeight: number
}> {
  const html = await file.text()
  return detectUiImportFromHtmlString(html)
}

/**
 * 拉取 URL 内容后按 SVG 或 HTML 解析（需目标站允许 CORS）。
 */
export async function detectUiImportFromUrl(urlStr: string): Promise<{
  parts: RasterImportPart[]
  imageWidth: number
  imageHeight: number
  sourceLabel: string
}> {
  let u: URL
  try {
    u = new URL(urlStr.trim())
  } catch {
    throw new Error('Invalid URL')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported')
  }

  const res = await fetch(u.toString(), { mode: 'cors', credentials: 'omit' })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  const text = await res.text()
  const trimmed = text.trimStart()
  const label = u.hostname || urlStr

  if (trimmed.startsWith('<svg') || ct.includes('image/svg')) {
    const r = await detectUiImportFromSvgText(text)
    return { ...r, sourceLabel: label }
  }
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html') || ct.includes('text/html')) {
    const r = await detectUiImportFromHtmlString(text)
    return { ...r, sourceLabel: label }
  }
  if (trimmed.includes('<svg')) {
    const r = await detectUiImportFromSvgText(text)
    return { ...r, sourceLabel: label }
  }
  throw new Error('Unsupported content (need SVG or HTML)')
}
