<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import type { CanvasViewCommand } from './canvasViewCommands'
import CanvasView from './CanvasView.vue'
import LeftDockPanel from './LeftDockPanel.vue'
import DataPanel from './DataPanel.vue'
import ToolbarIcon from './ToolbarIcon.vue'
import {
  alignUisvgObjectRoots,
  pasteUisvgClipboard,
  removeUisvgObjectRootsByLogicalIds,
  serializeUisvgClipboard,
  type AlignUisvgObjectRootsDebugOut,
  type CanvasAlignMode,
} from '../lib/canvasClipboardAlign'
import {
  appendFrame,
  appendRect,
  appendText,
  createEmptyDocument,
  getCanvasSettingsFromMarkup,
  outlineLogicalIdFromDomId,
  parseUisvgOutline,
  formatSvgXmlForSave,
  stripEditorCanvasChromeFromMarkup,
  UISVG_OUTLINE_ROOT_LOGICAL_ID,
  updateCanvasSettings,
  type CanvasSettings,
} from '../lib/uisvgDocument'
import { appendRasterUISemantic } from '../lib/rasterUiAppend'
import { detectUiImportFromRasterFile } from '../lib/rasterUiDetect'
import {
  detectUiImportFromHtmlFile,
  detectUiImportFromSvgFile,
  detectUiImportFromUrl,
} from '../lib/domUiImport'
import CanvasSettingsDialog from './CanvasSettingsDialog.vue'
import UisvgSpecDialog from './UisvgSpecDialog.vue'
import {
  BASIC_PLACEMENT_SIZE,
  findPlacementForNewItemWithDebug,
  getWindowsControlPlacementSize,
  type NewItemPlacementDebug,
} from '../lib/libraryPlacement'
import { getDefaultUiPropsRecordForWinControl } from '../lib/uiObjectProperties'
import { reparentUisvgObjectInSvgString } from '../lib/svgReparent'
import { appendWindowsControl, appendWindowsControlUnderParent } from '../lib/windowsUiControls'
import { openUisvgPreviewWindow } from '../lib/previewWindow'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'

const { t, locale, setLocale } = useI18n()
const { themePreference, effectiveTheme, setThemePreference } = useTheme()

const svgMarkup = ref(createEmptyDocument())
/** 画布/大纲多选（逻辑 id） */
const selectedIds = ref<string[]>([])
const selectedId = computed(() => selectedIds.value[0] ?? null)
/** 复制失败时仍可用于粘贴的内部 JSON */
const internalClipboard = ref('')
/** 最近一次对齐命令的调试文本（每次执行对齐都会更新，与是否打开调试面板无关） */
const alignDebugInfo = ref('')
/** 对齐后递增，传入 CanvasView 以强制刷新左下角（见 CanvasView alignDebugNonce） */
const alignDebugNonce = ref(0)
const statusLeft = ref('')
const statusRight = ref('')
const lastViewScale = ref(1)

function setStatusView(scale: number) {
  lastViewScale.value = scale
  const pct = Math.round(scale * 100)
  statusRight.value = t('status.viewScale', { pct })
}

watch(locale, () => {
  setStatusView(lastViewScale.value)
})

statusLeft.value = t('status.ready')
setStatusView(1)

const outlineNodes = computed(() => parseUisvgOutline(svgMarkup.value))

/** 与画布右键「对齐」相同条件：至少 2 个非大纲根的可选对象 */
const canAlignSelection = computed(
  () => selectedIds.value.filter((id) => id !== UISVG_OUTLINE_ROOT_LOGICAL_ID).length >= 2,
)

const canvasSettingsSnapshot = computed(() => getCanvasSettingsFromMarkup(svgMarkup.value))

const showCanvasSettings = ref(false)
const showUisvgSpecDialog = ref(false)

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput')
const rasterInputRef = useTemplateRef<HTMLInputElement>('rasterInput')
const vectorInputRef = useTemplateRef<HTMLInputElement>('vectorInput')
const htmlInputRef = useTemplateRef<HTMLInputElement>('htmlInput')
/** 从 URL 识别 UI：输入框与对话框 */
const showUrlImportDialog = ref(false)
const urlImportDraft = ref('')
const urlImportInputRef = useTemplateRef<HTMLInputElement>('urlImportInput')

watch(showUrlImportDialog, (open) => {
  if (open) {
    nextTick(() => {
      urlImportInputRef.value?.focus()
      urlImportInputRef.value?.select()
    })
  }
})
const canvasRef = useTemplateRef<InstanceType<typeof CanvasView>>('canvasRef')
/** 保存 / 另存为使用的建议文件名 */
const lastSaveFileName = ref('untitled.ui.svg')
/** 左侧栏宽度；三 dock 全部收到边条时与右侧同为窄条 */
const LEFT_DOCK_RAIL_STRIP_PX = 22
const leftDockWidthPx = ref(280)
const savedLeftDockWidthPx = ref(280)
const allLeftRailsCollapsed = ref(false)

function onAllLeftRailsCollapsed(v: boolean) {
  allLeftRailsCollapsed.value = v
}

watch(allLeftRailsCollapsed, (v, prev) => {
  if (v && prev === false) {
    savedLeftDockWidthPx.value = leftDockWidthPx.value
  }
  if (!v && prev === true) {
    leftDockWidthPx.value = savedLeftDockWidthPx.value
  }
})

const leftAsideStyle = computed(() => {
  if (allLeftRailsCollapsed.value) {
    return {
      width: `${LEFT_DOCK_RAIL_STRIP_PX}px`,
      minWidth: `${LEFT_DOCK_RAIL_STRIP_PX}px`,
      maxWidth: `${LEFT_DOCK_RAIL_STRIP_PX}px`,
    }
  }
  return {
    width: `${leftDockWidthPx.value}px`,
    minWidth: '200px',
  }
})

/** 右侧 dock：侧栏宽度；三 dock 全部收到边条时显示为窄条宽度 */
const RIGHT_DOCK_RAIL_STRIP_PX = 22
const rightDockWidthPx = ref(320)
const savedRightDockWidthPx = ref(320)
const allRightRailsCollapsed = ref(false)
const dataPanelRef = useTemplateRef<InstanceType<typeof DataPanel>>('dataPanelRef')

function onAllRightRailsCollapsed(v: boolean) {
  allRightRailsCollapsed.value = v
}

watch(allRightRailsCollapsed, (v, prev) => {
  if (v && prev === false) {
    savedRightDockWidthPx.value = rightDockWidthPx.value
  }
  if (!v && prev === true) {
    rightDockWidthPx.value = savedRightDockWidthPx.value
  }
})

const rightAsideStyle = computed(() => {
  if (allRightRailsCollapsed.value) {
    return {
      width: `${RIGHT_DOCK_RAIL_STRIP_PX}px`,
      minWidth: `${RIGHT_DOCK_RAIL_STRIP_PX}px`,
      maxWidth: `${RIGHT_DOCK_RAIL_STRIP_PX}px`,
    }
  }
  return {
    width: `${rightDockWidthPx.value}px`,
    minWidth: '200px',
  }
})

/** 仅显示画布：隐藏菜单/工具栏/dock/状态栏；可选浏览器全屏 */
const immersiveCanvas = ref(false)
/** 画布左下角对齐调试面板（仅显示对齐摘要） */
const showCanvasSelectionDebug = ref(false)
/** 状态栏上方：新建占位算法调试（xy/宽高、已有对象、空位） */
const showPlacementDebug = ref(false)
const placementDebugInfo = ref('')
const canvasHostRef = useTemplateRef<HTMLElement>('canvasHostRef')

async function exitImmersiveCanvas() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
  } catch {
    /* ignore */
  }
  immersiveCanvas.value = false
}

async function enterImmersiveCanvas() {
  immersiveCanvas.value = true
  await nextTick()
  const el = canvasHostRef.value
  if (el?.requestFullscreen) {
    try {
      await el.requestFullscreen()
    } catch {
      /* 拒绝或不可用：仍保留仅画布布局 */
    }
  }
}

async function toggleImmersiveCanvas() {
  if (immersiveCanvas.value) {
    await exitImmersiveCanvas()
  } else {
    await enterImmersiveCanvas()
  }
}

function onFullscreenChange() {
  if (!document.fullscreenElement && immersiveCanvas.value) {
    immersiveCanvas.value = false
  }
}

function isEditableKeyTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable) return true
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && immersiveCanvas.value) {
    e.preventDefault()
    void exitImmersiveCanvas()
    return
  }
  if (isEditableKeyTarget(e.target)) return

  const mod = e.ctrlKey || e.metaKey
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    onCanvasCommand('delete')
    return
  }
  if (mod && e.key.toLowerCase() === 'c') {
    e.preventDefault()
    onCanvasCommand('copy')
    return
  }
  if (mod && e.key.toLowerCase() === 'v') {
    e.preventDefault()
    void doPasteFromClipboard()
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('keydown', onDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('keydown', onDocumentKeydown)
})

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

async function onCenterRightSplitStart(e: MouseEvent) {
  e.preventDefault()
  if (allRightRailsCollapsed.value) {
    dataPanelRef.value?.expandAllRails()
    await nextTick()
  }
  const startX = e.clientX
  const startW = rightDockWidthPx.value

  function move(ev: MouseEvent) {
    const dx = startX - ev.clientX
    rightDockWidthPx.value = clamp(Math.round(startW + dx), 200, 560)
  }
  function up() {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

function onViewChange(payload: { scale: number; panX: number; panY: number }) {
  setStatusView(payload.scale)
}

async function newDoc() {
  svgMarkup.value = createEmptyDocument()
  selectedIds.value = []
  lastSaveFileName.value = 'untitled.ui.svg'
  statusLeft.value = t('status.newDoc')
  await nextTick()
  canvasRef.value?.resetView()
}

function triggerOpen() {
  fileInputRef.value?.click()
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    const text = String(reader.result || '')
    svgMarkup.value = stripEditorCanvasChromeFromMarkup(text)
    selectedIds.value = []
    if (/\.(svg|ui\.svg)$/i.test(file.name)) {
      lastSaveFileName.value = file.name
    }
    statusLeft.value = t('status.opened', { name: file.name })
    await nextTick()
    canvasRef.value?.resetView()
  }
  reader.readAsText(file)
}

function saveDoc() {
  const stripped = stripEditorCanvasChromeFromMarkup(svgMarkup.value)
  const clean = formatSvgXmlForSave(stripped)
  svgMarkup.value = clean
  const blob = new Blob([clean], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = lastSaveFileName.value
  a.click()
  URL.revokeObjectURL(url)
  statusLeft.value = t('status.saved', { name: lastSaveFileName.value })
}

async function saveDocAs() {
  const stripped = stripEditorCanvasChromeFromMarkup(svgMarkup.value)
  const clean = formatSvgXmlForSave(stripped)
  svgMarkup.value = clean

  const w = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<{ name: string; createWritable: () => Promise<FileSystemWritableFileStream> }>
  }

  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: lastSaveFileName.value,
        types: [
          {
            description: 'SVG',
            accept: { 'image/svg+xml': ['.svg', '.ui.svg'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(clean)
      await writable.close()
      lastSaveFileName.value = handle.name
      statusLeft.value = t('status.savedAs', { name: handle.name })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }

  const prompted = window.prompt(t('saveAs.prompt'), lastSaveFileName.value)
  if (prompted == null) return
  let name = prompted.trim()
  if (!name) return
  if (!/\.(svg|ui\.svg)$/i.test(name)) {
    name = `${name}.ui.svg`
  }
  lastSaveFileName.value = name
  const blob = new Blob([clean], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  statusLeft.value = t('status.savedAs', { name })
}

function triggerRasterImport() {
  rasterInputRef.value?.click()
}

function triggerVectorImport() {
  vectorInputRef.value?.click()
}

function triggerHtmlImport() {
  htmlInputRef.value?.click()
}

function openUrlImportDialog() {
  urlImportDraft.value = ''
  showUrlImportDialog.value = true
}

function closeUrlImportDialog() {
  showUrlImportDialog.value = false
}

async function submitUrlImport() {
  const raw = urlImportDraft.value.trim()
  if (!raw) return
  closeUrlImportDialog()
  statusLeft.value = t('status.urlWorking')
  try {
    const { parts, imageWidth, imageHeight, sourceLabel } = await detectUiImportFromUrl(raw)
    if (!parts.length) {
      statusLeft.value = t('status.urlEmpty')
      return
    }
    const canvas = canvasSettingsSnapshot.value
    svgMarkup.value = appendRasterUISemantic(
      svgMarkup.value,
      { w: imageWidth, h: imageHeight },
      parts,
      canvas,
      'url-detect',
    )
    statusLeft.value = t('status.urlDone', { host: sourceLabel, n: parts.length })
    await nextTick()
    canvasRef.value?.fitView()
  } catch (err) {
    statusLeft.value = t('status.urlFail', { msg: err instanceof Error ? err.message : String(err) })
  }
}

async function onVectorFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  statusLeft.value = t('status.vectorWorking')
  try {
    const { parts, imageWidth, imageHeight } = await detectUiImportFromSvgFile(file)
    if (!parts.length) {
      statusLeft.value = t('status.vectorEmpty')
      return
    }
    const canvas = canvasSettingsSnapshot.value
    svgMarkup.value = appendRasterUISemantic(
      svgMarkup.value,
      { w: imageWidth, h: imageHeight },
      parts,
      canvas,
      'vector-detect',
    )
    statusLeft.value = t('status.vectorDone', { name: file.name, n: parts.length })
    await nextTick()
    canvasRef.value?.fitView()
  } catch (err) {
    statusLeft.value = t('status.vectorFail', { msg: err instanceof Error ? err.message : String(err) })
  }
}

async function onHtmlFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  statusLeft.value = t('status.htmlWorking')
  try {
    const { parts, imageWidth, imageHeight } = await detectUiImportFromHtmlFile(file)
    if (!parts.length) {
      statusLeft.value = t('status.htmlEmpty')
      return
    }
    const canvas = canvasSettingsSnapshot.value
    svgMarkup.value = appendRasterUISemantic(
      svgMarkup.value,
      { w: imageWidth, h: imageHeight },
      parts,
      canvas,
      'html-detect',
    )
    statusLeft.value = t('status.htmlDone', { name: file.name, n: parts.length })
    await nextTick()
    canvasRef.value?.fitView()
  } catch (err) {
    statusLeft.value = t('status.htmlFail', { msg: err instanceof Error ? err.message : String(err) })
  }
}

async function onRasterFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    statusLeft.value = t('status.pickImage')
    return
  }
  statusLeft.value = t('status.rasterWorking')
  try {
    const { parts, imageWidth, imageHeight } = await detectUiImportFromRasterFile(file)
    if (!parts.length) {
      statusLeft.value = t('status.rasterEmpty')
      return
    }
    const canvas = canvasSettingsSnapshot.value
    svgMarkup.value = appendRasterUISemantic(
      svgMarkup.value,
      { w: imageWidth, h: imageHeight },
      parts,
      canvas,
    )
    statusLeft.value = t('status.rasterDone', { name: file.name, n: parts.length })
    await nextTick()
    canvasRef.value?.fitView()
  } catch (err) {
    statusLeft.value = t('status.rasterFail', { msg: err instanceof Error ? err.message : String(err) })
  }
}

function resetView() {
  canvasRef.value?.resetView()
  statusLeft.value = t('status.viewReset')
}

function fitCanvasView() {
  canvasRef.value?.fitView()
  statusLeft.value = t('status.viewFit')
}

function openPreviewWindow() {
  const clean = stripEditorCanvasChromeFromMarkup(svgMarkup.value)
  openUisvgPreviewWindow(clean)
  statusLeft.value = t('status.preview')
}

function formatPlacementDebug(d: NewItemPlacementDebug): string {
  const lines = [
    t('placementDebug.header'),
    t('placementDebug.canvasSize', { w: d.canvas.width, h: d.canvas.height }),
    t('placementDebug.logicalSize', { w: d.newItemLogicalSize.width, h: d.newItemLogicalSize.height }),
    t('placementDebug.placementSize', { w: d.placementSize.width, h: d.placementSize.height }),
    t('placementDebug.slot', {
      x: d.placedRect.x,
      y: d.placedRect.y,
      w: d.placedRect.width,
      h: d.placedRect.height,
    }),
    d.usedFallbackPosition ? t('placementDebug.fallback') : t('placementDebug.ok'),
    t('placementDebug.margin', { n: d.collisionMarginPx }),
    t('placementDebug.existingCount', { n: d.existingRects.length }),
  ]
  for (const r of d.existingRects) {
    lines.push(`  [${r.domId}] x=${r.x} y=${r.y} w=${r.width} h=${r.height}`)
  }
  return lines.join('\n')
}

/** 在「当前视口可见」区域优先、靠近中心处为新建图元找空位 */
function placementForNewItem(w: number, h: number) {
  const vis = canvasRef.value?.getVisibleUserRect?.() ?? null
  const cw = canvasSettingsSnapshot.value.width
  const ch = canvasSettingsSnapshot.value.height
  const { x, y, debug } = findPlacementForNewItemWithDebug(svgMarkup.value, cw, ch, vis, w, h)
  placementDebugInfo.value = formatPlacementDebug(debug)
  return { x, y }
}

/** 新建对象后选中对应大纲项（逻辑 id）；不改变当前画布缩放与平移（不调用 frameOutlineIdInView） */
function selectCreatedObject(createdDomId: string) {
  if (!createdDomId.trim()) return
  void nextTick(() => {
    const logical = outlineLogicalIdFromDomId(svgMarkup.value, createdDomId)
    selectedIds.value = [logical]
  })
}

function onAddRect() {
  const { w, h } = BASIC_PLACEMENT_SIZE.rect
  const { svg, createdDomId } = appendRect(svgMarkup.value, placementForNewItem(w, h))
  svgMarkup.value = svg
  selectCreatedObject(createdDomId)
  statusLeft.value = t('status.addedRect')
}

function onAddText() {
  const { w, h } = BASIC_PLACEMENT_SIZE.text
  const { svg, createdDomId } = appendText(svgMarkup.value, placementForNewItem(w, h))
  svgMarkup.value = svg
  selectCreatedObject(createdDomId)
  statusLeft.value = t('status.addedText')
}

function onAddFrame() {
  const { w, h } = BASIC_PLACEMENT_SIZE.frame
  const { svg, createdDomId } = appendFrame(svgMarkup.value, placementForNewItem(w, h))
  svgMarkup.value = svg
  selectCreatedObject(createdDomId)
  statusLeft.value = t('status.addedFrame')
}

function onAddBasic(id: 'rect' | 'text' | 'frame') {
  if (id === 'rect') onAddRect()
  else if (id === 'text') onAddText()
  else onAddFrame()
}

function onAddWindows(controlId: string) {
  const sz = getWindowsControlPlacementSize(controlId)
  const { svg, createdDomId } = appendWindowsControl(
    svgMarkup.value,
    controlId,
    placementForNewItem(sz.w, sz.h),
    getDefaultUiPropsRecordForWinControl(controlId),
  )
  svgMarkup.value = svg
  selectCreatedObject(createdDomId)
  statusLeft.value = t('status.addedWin', { id: controlId })
}

/** 从组件库拖入画布：落在 Form/Panel 等上时插入为子节点 */
function onPaletteDropWin(payload: {
  controlId: string
  parentDomId: string
  placement: { x: number; y: number }
}) {
  let { svg, createdDomId } = appendWindowsControlUnderParent(
    svgMarkup.value,
    payload.controlId,
    payload.parentDomId,
    payload.placement,
    getDefaultUiPropsRecordForWinControl(payload.controlId),
  )
  if (!createdDomId) {
    const sz = getWindowsControlPlacementSize(payload.controlId)
    const fallback = appendWindowsControl(
      svgMarkup.value,
      payload.controlId,
      placementForNewItem(sz.w, sz.h),
      getDefaultUiPropsRecordForWinControl(payload.controlId),
    )
    svg = fallback.svg
    createdDomId = fallback.createdDomId
  }
  svgMarkup.value = svg
  selectCreatedObject(createdDomId)
  statusLeft.value = t('status.addedWin', { id: payload.controlId })
}

const ALIGN_FROM_CMD: Partial<Record<CanvasViewCommand, CanvasAlignMode>> = {
  'align-left': 'left',
  'align-right': 'right',
  'align-hcenter': 'hcenter',
  'align-top': 'top',
  'align-bottom': 'bottom',
  'align-vcenter': 'vcenter',
}

function movableSelectedIds(): string[] {
  return selectedIds.value.filter((id) => id !== UISVG_OUTLINE_ROOT_LOGICAL_ID)
}

function onCanvasCommand(cmd: CanvasViewCommand) {
  const ids = movableSelectedIds()
  if (cmd === 'delete') {
    if (!ids.length) return
    const next = removeUisvgObjectRootsByLogicalIds(svgMarkup.value, ids)
    if (next !== null) {
      svgMarkup.value = next
      selectedIds.value = []
      statusLeft.value = t('status.deleted')
    }
    return
  }
  if (cmd === 'copy') {
    if (!ids.length) return
    const json = serializeUisvgClipboard(svgMarkup.value, ids)
    internalClipboard.value = json
    void navigator.clipboard.writeText(json).catch(() => {})
    statusLeft.value = t('status.copied')
    return
  }
  if (cmd === 'paste') {
    void doPasteFromClipboard()
    return
  }
  const mode = ALIGN_FROM_CMD[cmd]
  if (mode) {
    const dbg: AlignUisvgObjectRootsDebugOut = { text: '' }
    try {
      const next = alignUisvgObjectRoots(svgMarkup.value, ids, mode, dbg)
      if (next) {
        svgMarkup.value = next
        statusLeft.value = t('status.aligned')
      } else {
        statusLeft.value = t('status.alignSkipped')
      }
    } catch (e) {
      if (!dbg.text) {
        dbg.text = [
          '--- 对齐调试 ---',
          `异常: ${e instanceof Error ? e.message : String(e)}`,
        ].join('\n')
      }
      statusLeft.value = t('status.alignFail')
    } finally {
      alignDebugInfo.value = `${dbg.text}`
      alignDebugNonce.value += 1
    }
  }
}

async function doPasteFromClipboard() {
  let text = internalClipboard.value
  try {
    const c = await navigator.clipboard.readText()
    if (c && /^\s*\{/.test(c)) text = c
  } catch {
    /* 使用 internalClipboard */
  }
  const next = pasteUisvgClipboard(svgMarkup.value, text)
  if (next) {
    svgMarkup.value = next
    statusLeft.value = t('status.pasted')
  }
}

function onSelectOutline(id: string) {
  selectedIds.value = [id]
}

function onOutlineFrameInView(id: string) {
  selectedIds.value = [id]
  nextTick(() => {
    canvasRef.value?.frameOutlineIdInView(id)
  })
}

function onOutlineReparent(payload: { childId: string; parentId: string }) {
  const next = reparentUisvgObjectInSvgString(
    svgMarkup.value,
    payload.childId,
    payload.parentId,
  )
  if (next) {
    svgMarkup.value = next
    statusLeft.value = t('status.reparented')
  } else {
    statusLeft.value = t('status.reparentFail')
  }
}

function onCanvasPick(ids: string[]) {
  selectedIds.value = [...ids]
}

function onDataPanelSelectedId(id: string | null) {
  selectedIds.value = id ? [id] : []
}

function onCanvasUpdateSvg(s: string) {
  svgMarkup.value = stripEditorCanvasChromeFromMarkup(s)
}

function onApplyCanvasSettings(s: CanvasSettings) {
  svgMarkup.value = updateCanvasSettings(svgMarkup.value, s)
  statusLeft.value = t('status.canvasSettingsApplied', { w: s.width, h: s.height, dpi: s.dpi })
}
</script>

<template>
  <div
    class="shell"
    :class="{ 'shell--immersive': immersiveCanvas, 'shell--dark': effectiveTheme === 'dark' }"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".svg,.ui.svg,image/svg+xml"
      class="hidden-input"
      @change="onFile"
    />
    <input
      ref="rasterInput"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/bmp,image/webp,image/gif,.png,.jpg,.jpeg,.bmp,.webp,.gif"
      class="hidden-input"
      @change="onRasterFile"
    />
    <input
      ref="vectorInput"
      type="file"
      accept=".svg,image/svg+xml"
      class="hidden-input"
      @change="onVectorFile"
    />
    <input
      ref="htmlInput"
      type="file"
      accept=".html,.htm,text/html"
      class="hidden-input"
      @change="onHtmlFile"
    />

    <Teleport to="body">
      <div
        v-if="showUrlImportDialog"
        class="url-import-backdrop"
        role="presentation"
        @mousedown.self="closeUrlImportDialog"
        @keydown.escape="closeUrlImportDialog"
      >
        <div
          class="url-import-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="url-import-title"
          @click.stop
        >
          <div id="url-import-title" class="url-import-caption">{{ t('urlImport.title') }}</div>
          <p class="url-import-hint">{{ t('urlImport.hint') }}</p>
          <input
            ref="urlImportInput"
            v-model="urlImportDraft"
            type="url"
            class="win-input url-import-input"
            :placeholder="t('urlImport.placeholder')"
            autocomplete="url"
            @keydown.enter.prevent="submitUrlImport"
          />
          <div class="url-import-actions">
            <button type="button" class="win-button" @click="closeUrlImportDialog">
              {{ t('urlImport.cancel') }}
            </button>
            <button type="button" class="win-button url-import-ok" @click="submitUrlImport">
              {{ t('urlImport.ok') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 菜单栏 -->
    <nav v-if="!immersiveCanvas" class="menubar" :aria-label="t('menu.ariaLabel')">
      <div class="menu-dropdown">
        <span class="menu-item">{{ t('menu.file') }}</span>
        <div class="menu-content">
          <button type="button" class="menu-row" @click="newDoc">{{ t('menu.file.new') }}</button>
          <button type="button" class="menu-row" @click="triggerOpen">{{ t('menu.file.open') }}</button>
          <button type="button" class="menu-row" @click="saveDoc">{{ t('menu.file.save') }}</button>
          <button type="button" class="menu-row" @click="saveDocAs">{{ t('menu.file.saveAs') }}</button>
        </div>
      </div>
      <div class="menu-dropdown">
        <span class="menu-item">{{ t('menu.edit') }}</span>
        <div class="menu-content menu-content--edit-menu">
          <button type="button" class="menu-row" disabled>{{ t('menu.edit.undo') }}</button>
          <div class="menu-submenu-wrap" :class="{ 'menu-submenu-wrap--muted': !canAlignSelection }">
            <div
              class="menu-row menu-row--has-submenu"
              role="menuitem"
              aria-haspopup="menu"
              :title="t('menu.edit.alignHint')"
            >
              <span class="menu-row__label">{{ t('menu.edit.align') }}</span>
              <span class="menu-chevron" aria-hidden="true">▸</span>
            </div>
            <div class="menu-submenu" role="menu">
              <button
                type="button"
                class="menu-row"
                role="menuitem"
                :disabled="!canAlignSelection"
                @click="onCanvasCommand('align-left')"
              >
                {{ t('menu.edit.alignLeft') }}
              </button>
              <button
                type="button"
                class="menu-row"
                role="menuitem"
                :disabled="!canAlignSelection"
                @click="onCanvasCommand('align-hcenter')"
              >
                {{ t('menu.edit.alignHCenter') }}
              </button>
              <button
                type="button"
                class="menu-row"
                role="menuitem"
                :disabled="!canAlignSelection"
                @click="onCanvasCommand('align-right')"
              >
                {{ t('menu.edit.alignRight') }}
              </button>
              <button
                type="button"
                class="menu-row"
                role="menuitem"
                :disabled="!canAlignSelection"
                @click="onCanvasCommand('align-top')"
              >
                {{ t('menu.edit.alignTop') }}
              </button>
              <button
                type="button"
                class="menu-row"
                role="menuitem"
                :disabled="!canAlignSelection"
                @click="onCanvasCommand('align-vcenter')"
              >
                {{ t('menu.edit.alignVCenter') }}
              </button>
              <button
                type="button"
                class="menu-row"
                role="menuitem"
                :disabled="!canAlignSelection"
                @click="onCanvasCommand('align-bottom')"
              >
                {{ t('menu.edit.alignBottom') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="menu-dropdown">
        <span class="menu-item">{{ t('menu.tools') }}</span>
        <div class="menu-content menu-content--tools">
          <button
            type="button"
            class="menu-row"
            :title="t('menu.tools.rasterHint')"
            @click="triggerRasterImport"
          >
            {{ t('menu.tools.raster') }}
          </button>
          <button
            type="button"
            class="menu-row"
            :title="t('menu.tools.vectorHint')"
            @click="triggerVectorImport"
          >
            {{ t('menu.tools.vector') }}
          </button>
          <button
            type="button"
            class="menu-row"
            :title="t('menu.tools.htmlHint')"
            @click="triggerHtmlImport"
          >
            {{ t('menu.tools.html') }}
          </button>
          <button type="button" class="menu-row" :title="t('menu.tools.urlHint')" @click="openUrlImportDialog">
            {{ t('menu.tools.url') }}
          </button>
        </div>
      </div>
      <div class="menu-dropdown">
        <span class="menu-item">{{ t('menu.view') }}</span>
        <div class="menu-content">
          <button type="button" class="menu-row" @click="resetView">{{ t('menu.view.reset') }}</button>
          <button type="button" class="menu-row" @click="fitCanvasView">{{ t('menu.view.fit') }}</button>
          <button type="button" class="menu-row" @click="openPreviewWindow">{{ t('menu.view.preview') }}</button>
          <button type="button" class="menu-row" @click="enterImmersiveCanvas">{{ t('menu.view.fullscreen') }}</button>
          <button type="button" class="menu-row" @click="showCanvasSettings = true">{{ t('menu.view.canvasSettings') }}</button>
          <button type="button" class="menu-row" @click="showCanvasSelectionDebug = !showCanvasSelectionDebug">
            {{ showCanvasSelectionDebug ? t('menu.view.alignDebugHide') : t('menu.view.alignDebugShow') }}
          </button>
          <button type="button" class="menu-row" @click="showPlacementDebug = !showPlacementDebug">
            {{ showPlacementDebug ? t('menu.view.placementDebugHide') : t('menu.view.placementDebugShow') }}
          </button>
        </div>
      </div>
      <div class="menu-dropdown">
        <span class="menu-item">{{ t('menu.settings') }}</span>
        <div class="menu-content menu-content--settings">
          <div class="menu-submenu-wrap">
            <div class="menu-row menu-row--has-submenu" role="menuitem" aria-haspopup="menu">
              <span class="menu-row__label">{{ t('menu.settings.language') }}</span>
              <span class="menu-chevron" aria-hidden="true">▸</span>
            </div>
            <div class="menu-submenu" role="menu">
              <button type="button" class="menu-row" role="menuitem" @click="setLocale('zh')">
                {{ locale === 'zh' ? '✓ ' : '' }}{{ t('menu.settings.lang.zh') }}
              </button>
              <button type="button" class="menu-row" role="menuitem" @click="setLocale('en')">
                {{ locale === 'en' ? '✓ ' : '' }}{{ t('menu.settings.lang.en') }}
              </button>
            </div>
          </div>
          <div class="menu-submenu-wrap">
            <div class="menu-row menu-row--has-submenu" role="menuitem" aria-haspopup="menu">
              <span class="menu-row__label">{{ t('menu.settings.theme') }}</span>
              <span class="menu-chevron" aria-hidden="true">▸</span>
            </div>
            <div class="menu-submenu" role="menu">
              <button type="button" class="menu-row" role="menuitem" @click="setThemePreference('system')">
                {{ themePreference === 'system' ? '✓ ' : '' }}{{ t('menu.settings.theme.system') }}
              </button>
              <button type="button" class="menu-row" role="menuitem" @click="setThemePreference('light')">
                {{ themePreference === 'light' ? '✓ ' : '' }}{{ t('menu.settings.theme.light') }}
              </button>
              <button type="button" class="menu-row" role="menuitem" @click="setThemePreference('dark')">
                {{ themePreference === 'dark' ? '✓ ' : '' }}{{ t('menu.settings.theme.dark') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="menu-dropdown">
        <span class="menu-item">{{ t('menu.help') }}</span>
        <div class="menu-content">
          <div class="menu-row static">{{ t('menu.help.about') }}</div>
          <button type="button" class="menu-row" role="menuitem" @click="showUisvgSpecDialog = true">
            {{ t('menu.help.uisvgSpec') }}
          </button>
        </div>
      </div>
    </nav>

    <!-- 工具栏 -->
    <div v-if="!immersiveCanvas" class="toolbar">
      <button type="button" class="win-button tb-btn tb-btn--icon" :title="t('tb.new')" @click="newDoc">
        <ToolbarIcon name="new" />
      </button>
      <button type="button" class="win-button tb-btn tb-btn--icon" :title="t('tb.open')" @click="triggerOpen">
        <ToolbarIcon name="open" />
      </button>
      <button type="button" class="win-button tb-btn tb-btn--icon" :title="t('tb.save')" @click="saveDoc">
        <ToolbarIcon name="save" />
      </button>
      <span class="tb-sep" />
      <button type="button" class="win-button tb-btn tb-btn--icon" :title="t('tb.resetView')" @click="resetView">
        <ToolbarIcon name="reset" />
      </button>
      <button type="button" class="win-button tb-btn tb-btn--icon" :title="t('tb.fit')" @click="fitCanvasView">
        <ToolbarIcon name="fit" />
      </button>
      <span class="tb-sep" />
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :title="t('tb.alignLeft')"
        :disabled="!canAlignSelection"
        @click="onCanvasCommand('align-left')"
      >
        <ToolbarIcon name="alignLeft" />
      </button>
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :title="t('tb.alignHCenter')"
        :disabled="!canAlignSelection"
        @click="onCanvasCommand('align-hcenter')"
      >
        <ToolbarIcon name="alignHCenter" />
      </button>
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :title="t('tb.alignRight')"
        :disabled="!canAlignSelection"
        @click="onCanvasCommand('align-right')"
      >
        <ToolbarIcon name="alignRight" />
      </button>
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :title="t('tb.alignTop')"
        :disabled="!canAlignSelection"
        @click="onCanvasCommand('align-top')"
      >
        <ToolbarIcon name="alignTop" />
      </button>
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :title="t('tb.alignVCenter')"
        :disabled="!canAlignSelection"
        @click="onCanvasCommand('align-vcenter')"
      >
        <ToolbarIcon name="alignVCenter" />
      </button>
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :title="t('tb.alignBottom')"
        :disabled="!canAlignSelection"
        @click="onCanvasCommand('align-bottom')"
      >
        <ToolbarIcon name="alignBottom" />
      </button>
      <span class="tb-sep" />
      <span class="tb-spacer" />
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :title="t('tb.preview')"
        @click="openPreviewWindow"
      >
        <ToolbarIcon name="preview" />
      </button>
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon tb-btn--fullscreen"
        :title="t('tb.fullscreen')"
        @click="toggleImmersiveCanvas"
      >
        <ToolbarIcon name="fullscreen" />
      </button>
      <span class="tb-sep" />
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :class="{ 'tb-btn--toggle-on': showCanvasSelectionDebug }"
        :title="showCanvasSelectionDebug ? t('tb.alignDebugOn') : t('tb.alignDebugOff')"
        :aria-pressed="showCanvasSelectionDebug"
        @click="showCanvasSelectionDebug = !showCanvasSelectionDebug"
      >
        <ToolbarIcon name="debug" />
      </button>
      <button
        type="button"
        class="win-button tb-btn tb-btn--icon"
        :class="{ 'tb-btn--toggle-on': showPlacementDebug }"
        :title="showPlacementDebug ? t('tb.placementDebugOn') : t('tb.placementDebugOff')"
        :aria-pressed="showPlacementDebug"
        @click="showPlacementDebug = !showPlacementDebug"
      >
        <ToolbarIcon name="fit" />
      </button>
    </div>

    <!-- 主区：左/右 dock 可折叠、可拖拽分割；画布全屏时仅中间画布 -->
    <div class="main" :class="{ 'main--immersive': immersiveCanvas }">
      <template v-if="!immersiveCanvas">
      <!-- 左侧 dock：主列 + 收起窄条独立列（与右侧 DataPanel 规则一致） -->
      <aside class="left-col dock-host" :style="leftAsideStyle">
        <LeftDockPanel
          :nodes="outlineNodes"
          :selected-ids="selectedIds"
          @select="onSelectOutline"
          @frame-in-view="onOutlineFrameInView"
          @reparent="onOutlineReparent"
          @add-basic="onAddBasic"
          @add-windows="onAddWindows"
          @update:all-left-rails-collapsed="onAllLeftRailsCollapsed"
        />
      </aside>
      </template>

      <main
        ref="canvasHostRef"
        class="center-col"
        :class="{ 'center-col--immersive': immersiveCanvas }"
      >
        <CanvasView
          ref="canvasRef"
          :svg-markup="svgMarkup"
          :selected-ids="selectedIds"
          :show-selection-debug="showCanvasSelectionDebug"
          :align-debug-info="alignDebugInfo"
          :align-debug-nonce="alignDebugNonce"
          @view-change="onViewChange"
          @pick="onCanvasPick"
          @canvas-command="onCanvasCommand"
          @update-svg="onCanvasUpdateSvg"
          @palette-drop-win="onPaletteDropWin"
        />
        <button
          v-if="immersiveCanvas"
          type="button"
          class="immersive-exit win-button"
          :title="t('immersive.exitTitle')"
          @click="exitImmersiveCanvas"
        >
          <ToolbarIcon name="fullscreenExit" />
          <span class="immersive-exit-lbl">{{ t('immersive.exit') }}</span>
        </button>
      </main>

      <template v-if="!immersiveCanvas">
      <div
        class="dock-splitter dock-splitter--v"
        role="separator"
        aria-orientation="vertical"
        :aria-label="t('splitter.right')"
        tabindex="0"
        @mousedown="onCenterRightSplitStart"
      />

      <aside class="right-col dock-host" :style="rightAsideStyle">
        <DataPanel
          ref="dataPanelRef"
          :svg-markup="svgMarkup"
          :selected-id="selectedId"
          @update:svg="(s) => (svgMarkup = s)"
          @update:selected-id="onDataPanelSelectedId"
          @update:all-right-rails-collapsed="onAllRightRailsCollapsed"
        />
      </aside>
      </template>
    </div>

    <!-- 新建占位调试（每次从左栏新建图元后更新） -->
    <div
      v-if="!immersiveCanvas && showPlacementDebug"
      class="placement-debug-strip"
      role="region"
      :aria-label="t('placementDebug.region')"
    >
      <pre class="placement-debug-pre">{{
        placementDebugInfo || t('placementDebug.emptyHint')
      }}</pre>
    </div>

    <!-- 状态栏 -->
    <footer v-if="!immersiveCanvas" class="statusbar">
      <span class="status-left">{{ statusLeft }}</span>
      <span class="status-right">{{ statusRight }}</span>
    </footer>

    <CanvasSettingsDialog
      v-model="showCanvasSettings"
      :settings="canvasSettingsSnapshot"
      :title="t('canvasSettings.title')"
      @apply="onApplyCanvasSettings"
    />
    <UisvgSpecDialog v-model="showUisvgSpecDialog" />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  border: 1px solid var(--win-border-dark);
  background: var(--win-panel);
}

.shell--immersive {
  border-color: #1e1e1e;
}

.placement-debug-strip {
  flex-shrink: 0;
  max-height: 180px;
  overflow: auto;
  border-top: 1px solid var(--win-border);
  background: #f8f8f8;
  padding: 6px 10px;
}

.placement-debug-pre {
  margin: 0;
  font: 11px/1.45 ui-monospace, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: #222;
}

.hidden-input {
  display: none;
}

.url-import-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10001;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.url-import-dialog {
  min-width: 400px;
  max-width: 92vw;
  background: var(--win-panel, #f0f0f0);
  border: 1px solid var(--win-border-dark, #a0a0a0);
  border-radius: 2px;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.25);
  padding: 12px 14px 14px;
  font-size: 12px;
}

.url-import-caption {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--win-text, #1a1a1a);
}

.url-import-hint {
  margin: 0 0 10px;
  line-height: 1.45;
  color: #505050;
  font-size: 11px;
}

.url-import-input {
  display: block;
  width: 100%;
  padding: 6px 8px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.url-import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.url-import-ok {
  min-width: 88px;
}

.menubar {
  display: flex;
  align-items: stretch;
  gap: 0;
  height: 24px;
  background: var(--win-menubar);
  border-bottom: 1px solid var(--win-border);
  padding: 0 4px;
  user-select: none;
}

.menu-dropdown {
  position: relative;
  display: flex;
  align-items: center;
}

.menu-item {
  padding: 2px 10px;
  cursor: default;
  font-size: 12px;
}

.menu-dropdown:hover .menu-item {
  background: var(--win-hover);
  border: 1px solid var(--win-border);
  border-bottom: none;
}

.menu-content {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 160px;
  background: var(--win-panel);
  border: 1px solid var(--win-border);
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.12);
  z-index: 50;
  /** 与标题条无缝衔接，避免鼠标经过缝隙时 :hover 丢失、下拉瞬间收起无法点击 */
  margin-top: -2px;
  padding-top: 2px;
}

.menu-dropdown:hover .menu-content {
  display: block;
}

.menu-row {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.menu-row:hover:not(:disabled) {
  background: var(--win-hover);
}

.menu-row:disabled {
  color: #a0a0a0;
  cursor: default;
}

.menu-row.static {
  cursor: default;
  font-size: 11px;
  color: #505050;
}

.menu-row--hint {
  white-space: normal;
  line-height: 1.35;
  max-width: 280px;
  padding-top: 2px;
  padding-bottom: 8px;
}

.menu-content--wide {
  min-width: 220px;
}

.menu-content--tools {
  min-width: 220px;
}

/** 编辑：撤销 + 对齐子菜单 */
.menu-content--edit-menu {
  min-width: 180px;
}

.menu-submenu-wrap--muted .menu-row--has-submenu {
  color: #707070;
}

/** 设置：仅两行父项（语言 / 主题），子项在右侧子菜单 */
.menu-content--settings {
  min-width: 200px;
  padding: 4px 0;
}

.menu-submenu-wrap {
  position: relative;
}

.menu-row--has-submenu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: default;
  user-select: none;
}

.menu-row__label {
  flex: 1;
  min-width: 0;
}

.menu-chevron {
  flex-shrink: 0;
  font-size: 9px;
  line-height: 1;
  opacity: 0.85;
}

.menu-submenu-wrap:hover .menu-row--has-submenu {
  background: var(--win-hover);
}

.menu-submenu {
  display: none;
  position: absolute;
  left: 100%;
  top: -4px;
  margin-left: -4px;
  min-width: 180px;
  padding: 4px 0;
  z-index: 60;
  background: var(--win-panel);
  border: 1px solid var(--win-border);
  box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.15);
}

.menu-submenu-wrap:hover .menu-submenu {
  display: block;
}

.menu-submenu .menu-row:hover:not(:disabled) {
  background: var(--win-hover);
}

.menu-row--sep {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--win-border);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: var(--win-toolbar);
  border-bottom: 1px solid var(--win-border);
}

.tb-btn {
  min-height: 22px;
  padding: 1px 10px;
  font-size: 12px;
}

.tb-btn--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 3px 6px;
  min-width: 26px;
}

.tb-spacer {
  flex: 1;
  min-width: 4px;
}

.tb-sep {
  width: 1px;
  height: 20px;
  background: var(--win-border);
  margin: 0 4px;
}

.toolbar .tb-btn--icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tb-btn--toggle-on {
  background: linear-gradient(to bottom, #e5f3ff, #cce8ff);
  border-color: #7eb8e8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.shell--dark .menu-submenu-wrap--muted .menu-row--has-submenu {
  color: #888;
}

.shell--dark .placement-debug-strip {
  background: #2a2a2a;
  border-top-color: var(--win-border);
}

.shell--dark .placement-debug-pre {
  color: #ccc;
}

.shell--dark .tb-btn--toggle-on {
  background: linear-gradient(to bottom, #0e639c, #094771);
  border-color: #0078d4;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.main--immersive {
  min-height: 0;
}

.dock-host {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--win-panel);
}

.left-col {
  flex: none;
  border-right: 1px solid var(--win-border);
}

.dock-splitter {
  flex-shrink: 0;
  background: linear-gradient(to bottom, #e4e4e4, #d4d4d4);
  z-index: 2;
}

.dock-splitter--h {
  height: 5px;
  cursor: ns-resize;
  border-top: 1px solid #f8f8f8;
  border-bottom: 1px solid #a0a0a0;
}

.dock-splitter--h:hover,
.dock-splitter--h:focus-visible {
  background: linear-gradient(to bottom, #d4eaff, #b8d4f0);
  outline: none;
}

.dock-splitter--v {
  width: 5px;
  cursor: ew-resize;
  border-left: 1px solid #f0f0f0;
  border-right: 1px solid #a0a0a0;
  background: linear-gradient(to right, #e4e4e4, #d4d4d4);
}

.dock-splitter--v:hover,
.dock-splitter--v:focus-visible {
  background: linear-gradient(to right, #d4eaff, #b8d4f0);
  outline: none;
}

.center-col {
  position: relative;
  flex: 1;
  display: flex;
  min-width: 0;
  background: #e0e0e0;
}

.center-col--immersive {
  flex: 1;
  min-height: 0;
}

.immersive-exit {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.18);
}

.immersive-exit :deep(.tb-glyph) {
  width: 14px;
  height: 14px;
}

.immersive-exit-lbl {
  font-size: 12px;
}

.right-col {
  flex: none;
  min-width: 200px;
  border-left: 1px solid var(--win-border);
}

.statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  background: var(--win-status);
  border-top: 1px solid var(--win-border);
}

.status-right {
  color: #404040;
}
</style>
