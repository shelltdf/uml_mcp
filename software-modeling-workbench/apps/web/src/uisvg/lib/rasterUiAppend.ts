/**
 * 将像素识别结果写入 UISVG：语义块用 WinForms 子树 + 缩放；高纹理块用局部 `<image>`。
 */

import { appendSvgShape, appendToDrawingLayer, type CanvasSettings } from './uisvgDocument'
import { writeUisvgBundleToObjectRoot } from './uisvgMetaNode'
import { getDefaultUiPropsRecordForWinControl } from './uiObjectProperties'
import { collectOccupiedRectsFromDoc, findNonOverlappingTopLeft, getWindowsControlPlacementSize } from './libraryPlacement'
import type { RasterImportPart } from './rasterUiDetect'
import { buildWindowsControlSubtree, getWindowsPaletteItem, WINDOWS_BUILDER_CONTROL_IDS } from './windowsUiControls'

const SVG_NS = 'http://www.w3.org/2000/svg'

function computeRasterCanvasPlacement(
  canvas: CanvasSettings,
  iw: number,
  ih: number,
): { ox: number; oy: number; s: number } | null {
  const cw = canvas.width
  const ch = canvas.height
  if (iw <= 0 || ih <= 0) return null
  const margin = 28
  const s = Math.min((cw - 2 * margin) / iw, (ch - 2 * margin) / ih)
  const innerW = cw - 2 * margin
  const innerH = ch - 2 * margin
  const ox = margin + (innerW - iw * s) / 2
  const oy = margin + (innerH - ih * s) / 2
  return { ox, oy, s }
}

function resolveSemanticControlId(controlId: string): string {
  return WINDOWS_BUILDER_CONTROL_IDS.includes(controlId) ? controlId : 'Panel'
}

/**
 * 将 `detectUiImportFromRasterFile` 等检测器的结果写入文档（与旧 `appendRasterDetectedUi` 相同的画布居中缩放）。
 * @param bundleFrom 写入元数据的来源标记（如 raster-detect、vector-detect）
 */
export function appendRasterUISemantic(
  svgXml: string,
  imageSize: { w: number; h: number },
  parts: RasterImportPart[],
  canvas: CanvasSettings,
  bundleFrom = 'raster-detect',
): string {
  if (!parts.length) return svgXml
  return appendSvgShape(svgXml, (doc) => {
    const place = computeRasterCanvasPlacement(canvas, imageSize.w, imageSize.h)
    if (!place) return
    const { ox, oy, s } = place
    const cw = canvas.width
    const ch = canvas.height
    const occupied = collectOccupiedRectsFromDoc(doc)
    const ts = Date.now()
    let pixelOrdinal = 0

    parts.forEach((part, i) => {
      const id = `imgui-${ts}-${i}`
      const g = doc.createElementNS(SVG_NS, 'g')
      g.setAttribute('id', id)

      const tw = Math.max(1, part.w * s)
      const th = Math.max(1, part.h * s)
      const preferredX = ox + part.x * s
      const preferredY = oy + part.y * s
      const { x: tx, y: ty } = findNonOverlappingTopLeft(occupied, preferredX, preferredY, tw, th, cw, ch)
      occupied.push({ x: tx, y: ty, width: tw, height: th })

      if (part.kind === 'pixel') {
        g.setAttribute('transform', `translate(${tx},${ty})`)
        const img = doc.createElementNS(SVG_NS, 'image')
        img.setAttribute('href', part.dataUrl)
        img.setAttribute('width', String(Math.max(1, part.w * s)))
        img.setAttribute('height', String(Math.max(1, part.h * s)))
        img.setAttribute('preserveAspectRatio', 'none')
        g.appendChild(img)
        appendToDrawingLayer(doc, g)
        pixelOrdinal += 1
        writeUisvgBundleToObjectRoot(g, {
          v: 1,
          uisvgLocalName: 'Frame',
          label: `位图 ${pixelOrdinal}`,
          uiProps: {},
          from: bundleFrom,
        })
        return
      }

      const cid = resolveSemanticControlId(part.controlId)
      const { w: pw, h: ph } = getWindowsControlPlacementSize(cid)
      const sx = (part.w * s) / Math.max(1, pw)
      const sy = (part.h * s) / Math.max(1, ph)
      g.setAttribute('transform', `translate(${tx},${ty}) scale(${sx},${sy})`)
      const meta = getWindowsPaletteItem(cid)
      buildWindowsControlSubtree(doc, g, cid)
      writeUisvgBundleToObjectRoot(g, {
        v: 1,
        uisvgLocalName: cid,
        label: cid,
        uiProps: getDefaultUiPropsRecordForWinControl(cid),
        platform: {
          winforms: cid,
          win32: meta?.win32 ?? '',
          qt: meta?.qt ?? '',
        },
        from: bundleFrom,
      })
      appendToDrawingLayer(doc, g)
    })
  })
}
