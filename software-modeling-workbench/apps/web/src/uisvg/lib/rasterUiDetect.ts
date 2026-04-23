/**
 * 像素图 → UISVG：先划分色块区域，再按几何/纹理判定
 * - 低纹理：映射为 WinForms 语义子树（与组件库一致）
 * - 高纹理或无法用矢量概括：局部 `<image>` 嵌入
 */

import { WINDOWS_BUILDER_CONTROL_IDS } from './windowsUiControls'

export interface RasterDetectedRect {
  x: number
  y: number
  w: number
  h: number
  fill: string
}

export type RasterImportPart =
  | {
      kind: 'semantic'
      /** 与 `windowsUiControls` builders 一致的控件 id */
      controlId: string
      x: number
      y: number
      w: number
      h: number
    }
  | {
      kind: 'pixel'
      x: number
      y: number
      w: number
      h: number
      dataUrl: string
    }

const GRID_W = 56
const GRID_H = 42

/** 方差超过此值视为「纹理/渐变」→ 优先用像素块保留信息 */
const VARIANCE_PIXEL_THRESHOLD = 2100

function rgbToKey(r: number, g: number, b: number): number {
  return ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
}

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, n | 0))
}

async function imageFileToCanvas(file: File): Promise<{ canvas: HTMLCanvasElement; w: number; h: number }> {
  const bmp = await createImageBitmap(file)
  const maxDim = 960
  let w = bmp.width
  let h = bmp.height
  if (w > maxDim || h > maxDim) {
    const r = maxDim / Math.max(w, h)
    w = Math.round(w * r)
    h = Math.round(h * r)
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, w)
  canvas.height = Math.max(1, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2d')
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return { canvas, w, h }
}

function buildGrid(
  data: ImageData,
  iw: number,
  ih: number,
): { keys: Int32Array; samples: { r: number; g: number; b: number }[] } {
  const keys = new Int32Array(GRID_W * GRID_H)
  const samples: { r: number; g: number; b: number }[] = new Array(GRID_W * GRID_H)
  const pxPerCellX = iw / GRID_W
  const pxPerCellY = ih / GRID_H

  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const ix = Math.min(iw - 1, Math.floor((gx + 0.5) * pxPerCellX))
      const iy = Math.min(ih - 1, Math.floor((gy + 0.5) * pxPerCellY))
      const idx = (iy * iw + ix) * 4
      const r = data.data[idx]
      const g = data.data[idx + 1]
      const b = data.data[idx + 2]
      const i = gy * GRID_W + gx
      keys[i] = rgbToKey(r, g, b)
      samples[i] = { r, g, b }
    }
  }
  return { keys, samples }
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => clampByte(n).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

/** 区域灰度方差（采样），越大越可能是照片/渐变 */
function regionLumaVariance(data: ImageData, iw: number, ih: number, x0: number, y0: number, rw: number, rh: number): number {
  const x1 = Math.max(0, Math.floor(x0))
  const y1 = Math.max(0, Math.floor(y0))
  const x2 = Math.min(iw, Math.ceil(x0 + rw))
  const y2 = Math.min(ih, Math.ceil(y0 + rh))
  const step = Math.max(2, Math.floor(Math.sqrt((x2 - x1) * (y2 - y1)) / 36))
  const vals: number[] = []
  for (let y = y1; y < y2; y += step) {
    for (let x = x1; x < x2; x += step) {
      const i = (y * iw + x) * 4
      const r = data.data[i]
      const g = data.data[i + 1]
      const b = data.data[i + 2]
      vals.push(0.299 * r + 0.587 * g + 0.114 * b)
    }
  }
  if (vals.length < 4) return 0
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  let v = 0
  for (const v0 of vals) {
    const d = v0 - mean
    v += d * d
  }
  return v / vals.length
}

function cropRegionToDataUrl(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  rw: number,
  rh: number,
): string {
  const sw = source.width
  const sh = source.height
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const w = Math.min(sw - x0, Math.ceil(rw))
  const h = Math.min(sh - y0, Math.ceil(rh))
  if (w < 1 || h < 1) return ''
  const maxSide = 640
  let dw = w
  let dh = h
  if (dw > maxSide || dh > maxSide) {
    const r = maxSide / Math.max(dw, dh)
    dw = Math.round(dw * r)
    dh = Math.round(dh * r)
  }
  const c = document.createElement('canvas')
  c.width = Math.max(1, dw)
  c.height = Math.max(1, dh)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, x0, y0, w, h, 0, 0, dw, dh)
  return c.toDataURL('image/png')
}

/**
 * 根据外接矩形与在整图中的位置，猜测 WinForms 类型（与组件库 id 一致）。
 * 导出供矢量 / HTML DOM 导入复用。
 */
export function classifySemanticControl(
  r: RasterDetectedRect,
  iw: number,
  ih: number,
  areaRatio: number,
): string {
  const ar = r.w / Math.max(1, r.h)
  const cy = (r.y + r.h / 2) / ih
  const cx = (r.x + r.w / 2) / iw

  if (areaRatio > 0.26 && r.w > iw * 0.38 && r.h > ih * 0.22) {
    return 'Form'
  }
  if (ar > 5 && r.h < ih * 0.14 && cy < 0.24) {
    return 'MenuStrip'
  }
  if (ar > 4 && r.h < ih * 0.12 && cy > 0.76) {
    return 'StatusStrip'
  }
  if (ar > 2.8 && r.h < ih * 0.13 && cy > 0.22 && cy < 0.72 && r.w > iw * 0.18) {
    return 'ToolStrip'
  }
  if (ar > 3.2 && r.h < ih * 0.12 && r.w > iw * 0.15) {
    return 'HScrollBar'
  }
  if (ar < 0.42 && r.w < iw * 0.12 && r.h > ih * 0.1) {
    return 'VScrollBar'
  }
  if (r.w >= 52 && r.w <= 240 && r.h >= 20 && r.h <= 48 && areaRatio < 0.055) {
    return 'Button'
  }
  if (r.h >= 12 && r.h <= 40 && r.w > 72 && ar > 2.2 && areaRatio < 0.035) {
    return 'Label'
  }
  if (areaRatio < 0.045 && ar > 1.5 && ar < 8 && r.h > 18 && r.h < 36) {
    return 'TextBox'
  }
  if (areaRatio > 0.045 && ar > 1.1 && ar < 2.8 && r.h > ih * 0.12) {
    return 'ListBox'
  }
  if (areaRatio > 0.05) {
    return 'Panel'
  }
  if (cx > 0.4 && cx < 0.6 && cy > 0.35 && cy < 0.65 && areaRatio < 0.12) {
    return 'GroupBox'
  }
  return 'Panel'
}

function hasBuilder(controlId: string): boolean {
  return WINDOWS_BUILDER_CONTROL_IDS.includes(controlId)
}

/**
 * 兼容旧 API：仅返回色块矩形（调试或简化流程用）。
 */
export async function detectUiRectsFromImageFile(file: File): Promise<{
  rects: RasterDetectedRect[]
  imageWidth: number
  imageHeight: number
}> {
  const r = await detectUiImportFromRasterFile(file)
  const rects: RasterDetectedRect[] = []
  for (const p of r.parts) {
    if (p.kind === 'semantic') {
      rects.push({ x: p.x, y: p.y, w: p.w, h: p.h, fill: '#cccccc' })
    } else {
      rects.push({ x: p.x, y: p.y, w: p.w, h: p.h, fill: '#dddddd' })
    }
  }
  return { rects, imageWidth: r.imageWidth, imageHeight: r.imageHeight }
}

/**
 * 识别结果：优先语义 UISVG；高纹理区域用 data URL 像素块。
 */
export async function detectUiImportFromRasterFile(file: File): Promise<{
  parts: RasterImportPart[]
  imageWidth: number
  imageHeight: number
}> {
  const { canvas, w: iw, h: ih } = await imageFileToCanvas(file)
  const ctx = canvas.getContext('2d')!
  const data = ctx.getImageData(0, 0, iw, ih)
  const { keys, samples } = buildGrid(data, iw, ih)

  const seen = new Uint8Array(GRID_W * GRID_H)
  const rawRects: RasterDetectedRect[] = []

  const pxPerCellX = iw / GRID_W
  const pxPerCellY = ih / GRID_H

  for (let i = 0; i < keys.length; i++) {
    if (seen[i]) continue
    const key = keys[i]
    const q: number[] = [i]
    seen[i] = 1
    let minGx = Infinity
    let minGy = Infinity
    let maxGx = -Infinity
    let maxGy = -Infinity
    let sr = 0
    let sg = 0
    let sb = 0
    let cnt = 0

    while (q.length) {
      const cur = q.pop()!
      const gx = cur % GRID_W
      const gy = (cur / GRID_W) | 0
      minGx = Math.min(minGx, gx)
      minGy = Math.min(minGy, gy)
      maxGx = Math.max(maxGx, gx)
      maxGy = Math.max(maxGy, gy)
      const s = samples[cur]
      sr += s.r
      sg += s.g
      sb += s.b
      cnt++

      const tryNb = (nb: number) => {
        if (nb < 0 || nb >= keys.length) return
        if (seen[nb]) return
        if (keys[nb] !== key) return
        seen[nb] = 1
        q.push(nb)
      }
      if (gx > 0) tryNb(cur - 1)
      if (gx < GRID_W - 1) tryNb(cur + 1)
      if (gy > 0) tryNb(cur - GRID_W)
      if (gy < GRID_H - 1) tryNb(cur + GRID_W)
    }

    const gw = maxGx - minGx + 1
    const gh = maxGy - minGy + 1
    if (cnt < 4) continue
    if (gw < 2 && gh < 2) continue

    const x = minGx * pxPerCellX
    const y = minGy * pxPerCellY
    const rw = (maxGx - minGx + 1) * pxPerCellX
    const rh = (maxGy - minGy + 1) * pxPerCellY

    const areaRatio = (rw * rh) / (iw * ih)
    if (areaRatio > 0.92) continue

    const fr = Math.round(sr / cnt)
    const fg = Math.round(sg / cnt)
    const fb = Math.round(sb / cnt)

    rawRects.push({
      x,
      y,
      w: rw,
      h: rh,
      fill: toHex(fr, fg, fb),
    })
  }

  rawRects.sort((a, b) => b.w * b.h - a.w * a.h)

  const parts: RasterImportPart[] = []
  const maxParts = 80

  for (const r of rawRects) {
    if (parts.length >= maxParts) break
    const areaRatio = (r.w * r.h) / (iw * ih)
    const varL = regionLumaVariance(data, iw, ih, r.x, r.y, r.w, r.h)

    if (varL > VARIANCE_PIXEL_THRESHOLD) {
      const url = cropRegionToDataUrl(canvas, r.x, r.y, r.w, r.h)
      if (url) {
        parts.push({ kind: 'pixel', x: r.x, y: r.y, w: r.w, h: r.h, dataUrl: url })
      }
      continue
    }

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

  return {
    parts,
    imageWidth: iw,
    imageHeight: ih,
  }
}
