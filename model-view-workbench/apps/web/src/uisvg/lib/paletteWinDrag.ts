import { WINDOWS_BUILDER_CONTROL_IDS } from './windowsUiControls'

/** 与左侧 Windows 组件库拖拽一致，画布侧用其识别拖入 */
export const PALETTE_WIN_DRAG_MIME = 'application/x-uisvg-win-control'

const PALETTE_WIN_TEXT_PREFIX = 'uisvg-palette-win:'

const WIN_CONTROL_ID_SET = new Set<string>(WINDOWS_BUILDER_CONTROL_IDS)

function isPaletteWinControlId(id: string): boolean {
  return id.length > 0 && WIN_CONTROL_ID_SET.has(id)
}

/** 在 dragstart 中写入（自定义 MIME + text/plain 后备，兼容部分 UA 对 types/getData 的差异） */
export function setPaletteWinDragData(dt: DataTransfer, controlId: string): void {
  dt.setData(PALETTE_WIN_DRAG_MIME, controlId)
  dt.setData('text/plain', `${PALETTE_WIN_TEXT_PREFIX}${controlId}`)
}

/**
 * dragover 阶段是否可能为本编辑器发起的库拖入（仅看 types，不作值解析：部分浏览器 dragover 下 getData 为空）。
 */
export function dataTransferAllowsCanvasPaletteWinDrop(dt: DataTransfer | null): boolean {
  if (!dt?.types) return false
  const types = Array.from(dt.types)
  return types.includes(PALETTE_WIN_DRAG_MIME) || types.includes('text/plain')
}

/** drop 阶段解析控件 id；若不是本库拖入则返回空串 */
export function readPaletteWinControlIdFromDataTransfer(dt: DataTransfer | null): string {
  if (!dt) return ''
  const a = dt.getData(PALETTE_WIN_DRAG_MIME).trim()
  if (a && isPaletteWinControlId(a)) return a
  const plain = dt.getData('text/plain').trim()
  if (!plain.startsWith(PALETTE_WIN_TEXT_PREFIX)) return ''
  const id = plain.slice(PALETTE_WIN_TEXT_PREFIX.length).trim()
  return isPaletteWinControlId(id) ? id : ''
}

export function isUisvgPaletteDropDebugEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('uisvgDebugPaletteDrop') === '1'
  } catch {
    return false
  }
}
