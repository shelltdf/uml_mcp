<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import {
  collectMarqueeCandidateDomIds,
  getGraphicsElementByDomId,
  getOutlineNodeForSelection,
  isTopLevelLayerDomId,
  LAYER_SIBLING_DOM_ID,
  findLayerRoot,
  outlineLogicalIdFromDomId,
  parseCanvasMeta,
  resolveCanvasPickToUisvgObjectDomId,
  resolveDomElementId,
  syncOutlineTreeToMatchDom,
  UISVG_OUTLINE_ROOT_LOGICAL_ID,
  uisvgMarkupSafeForHtmlEmbedding,
} from '../lib/uisvgDocument'
import { outlineNodeUisvgDisplayLine } from '../lib/uisvgMetaNode'
import {
  buildSnapTargets,
  snapBoxToTargets,
  snapThresholdUser,
  type SnapBBox,
} from '../lib/canvasSnap'
import { applyTranslateToSVGElement, canMoveSvgElement } from '../lib/svgElementMove'
import {
  applyResizeDelta,
  canResizeSvgElement,
  ensureResizeChromeLayoutSynced,
  type ResizeHandle,
} from '../lib/svgElementResize'
import {
  canvasClientToSvgUser,
  findWinContainerParentForPaletteDrop,
  reparentCanvasObjectAfterDrag,
} from '../lib/svgReparent'
import {
  clampLocalPlacementToInner,
  getWindowsControlPlacementSize,
  globalXYToParentLocal,
} from '../lib/libraryPlacement'
import { readUisvgBundleFromObjectRoot } from '../lib/uisvgMetaNode'
import {
  dataTransferAllowsCanvasPaletteWinDrop,
  isUisvgPaletteDropDebugEnabled,
  readPaletteWinControlIdFromDataTransfer,
} from '../lib/paletteWinDrag'

const { t } = useI18n()

/** 模板 v-for：四边 + 四角控制点 */
const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const props = withDefaults(
  defineProps<{
    svgMarkup: string
    /** 大纲逻辑 id 多选（含 `uisvg-root` 映射 layer-root） */
    selectedIds: string[]
    /** 是否显示左下角对齐调试面板（由工具栏切换；内容仅为对齐摘要） */
    showSelectionDebug?: boolean
    /** 最近一次对齐命令的调试摘要（由 AppShell 在每次对齐后写入；空则左下角仍显示占位说明） */
    alignDebugInfo?: string
    /** 每次对齐尝试后递增，用于强制刷新左下角文本（避免仅字符串 prop 时子组件未重算） */
    alignDebugNonce?: number
  }>(),
  { selectedIds: () => [], showSelectionDebug: false, alignDebugInfo: '', alignDebugNonce: 0 },
)

const emit = defineEmits<{
  viewChange: [payload: { scale: number; panX: number; panY: number }]
  /** 更新画布选中（空数组表示清空） */
  pick: [ids: string[]]
  updateSvg: [markup: string]
  /** 从左侧组件库拖入 Windows 控件（可落在 Form 等容器内） */
  'palette-drop-win': [
    payload: { controlId: string; parentDomId: string; placement: { x: number; y: number } },
  ],
  /** 右键菜单命令（由 AppShell 执行删除/复制/粘贴/对齐） */
  canvasCommand: [
    cmd:
      | 'delete'
      | 'copy'
      | 'paste'
      | 'align-left'
      | 'align-right'
      | 'align-hcenter'
      | 'align-top'
      | 'align-bottom'
      | 'align-vcenter',
  ]
}>()

const viewportRef = ref<HTMLElement | null>(null)
/** 与网格/SVG 同尺寸的栈，用于把选中框放在画布 transform 内并换算局部坐标 */
const canvasStackRef = ref<HTMLElement | null>(null)

const panX = ref(0)
const panY = ref(0)
const scale = ref(1)

const displaySvg = computed(() =>
  uisvgMarkupSafeForHtmlEmbedding(props.svgMarkup.replace(/<\?xml[^?]*\?>\s*/gi, '').trim()),
)

const meta = computed(() => parseCanvasMeta(props.svgMarkup))

const transformStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
}))

const gridStyle = computed(() => {
  const g = meta.value.grid
  const w = meta.value.width
  const h = meta.value.height
  return {
    width: `${w}px`,
    height: `${h}px`,
    flexShrink: 0,
    backgroundColor: '#ffffff',
    backgroundImage: [
      `linear-gradient(to right, #d8d8d8 1px, transparent 1px)`,
      `linear-gradient(to bottom, #d8d8d8 1px, transparent 1px)`,
    ].join(','),
    backgroundSize: `${g}px ${g}px`,
    border: '1px solid #c8c8c8',
  }
})

const chromeBoxStyle = computed(() => ({
  width: `${meta.value.width}px`,
  height: `${meta.value.height}px`,
}))

const overlayViewBox = computed(() => `0 0 ${meta.value.width} ${meta.value.height}`)

/** 选中框：画布栈局部坐标（与 SVG 用户单位一致，随平移/缩放移动），并裁剪在逻辑画布矩形内 */
const selectionCanvasRect = ref<{ left: number; top: number; width: number; height: number } | null>(null)

/** 当前选中图元是否支持缩放控制点（rect / circle / ellipse / 含单个子图元的 g） */
const selectionCanResize = ref(false)

/** 选中框计算过程的详细诊断（便于排查 rect 为 null） */
const selectionDiagnostics = ref('')

const selectionDebugCopyHint = ref('')

/** 左下角调试 `<pre>`，用于内容更新后滚到底部 */
const selectionDebugPreRef = ref<HTMLElement | null>(null)

function scrollSelectionDebugToBottom(): void {
  const el = selectionDebugPreRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

/** 仅当开启画布调试时写入：框选 mousedown 解析（mouseup 后清空） */
const marqueeDebugPending = ref<{
  rawPick: string | null
  pickedDomId: string | null
  logicalId: string | null
  additive: boolean
  clientX: number
  clientY: number
} | null>(null)
/** 最近一次框选结束后的完整说明（随 showSelectionDebug 显示） */
const marqueeDebugInfo = ref('')

/** 左下角仅显示「对齐调试」（与选中框/框选等其它诊断解耦） */
const selectionDebugLines = computed(() => {
  void props.alignDebugNonce
  const allSelected = props.selectedIds
  const movableN = allSelected.filter((id) => id !== UISVG_OUTLINE_ROOT_LOGICAL_ID).length
  const alignText = props.alignDebugInfo?.trim()
  if (alignText) {
    return alignText
  }
  if (movableN >= 2) {
    return [
      t('canvas.alignDebug.header'),
      t('canvas.alignDebug.hintNoSummary'),
      t('canvas.alignDebug.hintAfterMulti'),
    ].join('\n')
  }
  return [t('canvas.alignDebug.header'), t('canvas.alignDebug.needTwoMovable', { n: movableN })].join(
    '\n',
  )
})

watch(selectionDebugLines, async () => {
  await nextTick()
  scrollSelectionDebugToBottom()
})

async function copySelectionDebug() {
  const text = selectionDebugLines.value
  try {
    await navigator.clipboard.writeText(text)
    selectionDebugCopyHint.value = t('canvas.alignDebug.copied')
  } catch {
    try {
      await fallbackCopyTextToClipboard(text)
      selectionDebugCopyHint.value = t('canvas.alignDebug.copied')
    } catch {
      selectionDebugCopyHint.value = t('canvas.alignDebug.copyFailed')
    }
  }
  window.setTimeout(() => {
    selectionDebugCopyHint.value = ''
  }, 2000)
}

function fallbackCopyTextToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    try {
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) resolve()
      else reject(new Error('execCommand'))
    } catch (e) {
      document.body.removeChild(ta)
      reject(e)
    }
  })
}

function selectionFrameTitle(): string {
  const r = selectionCanvasRect.value
  if (!r) return ''
  const geom = t('canvas.selectionFrameGeom', {
    left: r.left.toFixed(1),
    top: r.top.toFixed(1),
    width: r.width.toFixed(1),
    height: r.height.toFixed(1),
  })
  const ids = props.selectedIds
  if (ids.length === 1) {
    const node = getOutlineNodeForSelection(props.svgMarkup, ids[0])
    const uisvgFull = node ? outlineNodeUisvgDisplayLine(node.uisvgLocalName) : 'unknown'
    return `${uisvgFull}\n${geom}`
  }
  if (ids.length > 1) {
    return `${t('canvas.selection.multi', { n: ids.length })}\n${geom}`
  }
  return geom
}

let selectionResizeObserver: ResizeObserver | null = null
/** 吸附参考线（用户坐标） */
const guideLines = ref<{ vx?: number; hy?: number }>({})

let panDragging = false
let lastX = 0
let lastY = 0

let objectDragging = false
/** 同时平移的多对象 DOM id */
let objectDragIds: string[] = []
let lastClientX = 0
let lastClientY = 0

/** 拖拽缩放控制点（与 objectDragging 互斥） */
const resizeDragging = ref(false)
let resizeHandle: ResizeHandle | null = null
let resizeDomId: string | null = null
let snapVx: number[] = []
let snapHy: number[] = []

/** 按下时尚未判定为拖拽，超过阈值后才进入 objectDragging */
let pendingDrag: { domIds: string[]; startX: number; startY: number } | null = null
const DRAG_THRESHOLD_PX = 3

/** 框选：在空白处按下左键拖拽 */
const marqueeStart = ref<{ x: number; y: number; additive: boolean } | null>(null)
const marqueeCurrent = ref<{ x: number; y: number } | null>(null)

const ctxMenu = ref<{ x: number; y: number } | null>(null)

function rootSvgEl(): SVGSVGElement | null {
  const host = viewportRef.value?.querySelector('.canvas-svg-host')
  if (!host) return null
  const svg = host.querySelector('svg')
  if (svg) return svg as SVGSVGElement
  const first = host.firstElementChild
  if (first && first.tagName.toLowerCase() === 'svg') {
    return first as SVGSVGElement
  }
  return null
}

/** 视口坐标 → 与选中框一致的画布用户坐标（相对根 SVG 视口） */
function clientToCanvasUser(clientX: number, clientY: number): { x: number; y: number } | null {
  const root = rootSvgEl()
  if (!root) return null
  const ref = root.getBoundingClientRect()
  const s = scale.value
  if (s <= 0) return null
  return {
    x: (clientX - ref.left) / s,
    y: (clientY - ref.top) / s,
  }
}

const marqueeBox = computed(() => {
  const st = marqueeStart.value
  const cur = marqueeCurrent.value
  if (!st || !cur) return null
  const a = clientToCanvasUser(st.x, st.y)
  const b = clientToCanvasUser(cur.x, cur.y)
  if (!a || !b) return null
  const left = Math.min(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const width = Math.abs(b.x - a.x)
  const height = Math.abs(b.y - a.y)
  return { left, top, width, height }
})

watch(ctxMenu, (v) => {
  if (!v) return
  nextTick(() => {
    const close = () => {
      ctxMenu.value = null
      document.removeEventListener('click', close)
    }
    requestAnimationFrame(() => document.addEventListener('click', close, { once: true }))
  })
})

/** 命中内容根组/虚拟根时视为「空白」，允许框选；否则点空白永远无法进入框选分支 */
function isMarqueeBackgroundPick(pickedDomId: string | null, logicalId: string | null): boolean {
  if (!pickedDomId && !logicalId) return true
  if (pickedDomId === 'layer-root' || pickedDomId === LAYER_SIBLING_DOM_ID) return true
  if (logicalId === UISVG_OUTLINE_ROOT_LOGICAL_ID) return true
  return false
}

function formatMarqueeDebugResult(
  pending: {
    rawPick: string | null
    pickedDomId: string | null
    logicalId: string | null
    additive: boolean
    clientX: number
    clientY: number
  } | null,
  st: { additive: boolean },
  box: { left: number; top: number; width: number; height: number } | null,
  candidateDomIds: string[],
  pickedLogical: string[],
  mode: 'too_small' | 'ok' | 'no_root',
): string {
  const lines: string[] = []
  if (pending) {
    lines.push(`mousedown: (${pending.clientX}, ${pending.clientY}) raw=${pending.rawPick ?? 'null'} → dom=${pending.pickedDomId ?? 'null'} → logical=${pending.logicalId ?? 'null'}`)
    lines.push(
      `backgroundPick=${String(isMarqueeBackgroundPick(pending.pickedDomId, pending.logicalId))} shift(追加)=${pending.additive}`,
    )
  }
  if (mode === 'no_root') {
    lines.push('mouseup: rootSvg=null，未做相交')
    return lines.join('\n')
  }
  if (mode === 'too_small') {
    lines.push(
      `mouseup: box=${box ? `left=${box.left.toFixed(2)} top=${box.top.toFixed(2)} w=${box.width.toFixed(2)} h=${box.height.toFixed(2)}` : 'null'} → 宽/高<3 视为点空白`,
    )
    if (!st.additive) lines.push('emit: pick []')
    return lines.join('\n')
  }
  lines.push(
    `marquee 用户坐标: left=${box!.left.toFixed(2)} top=${box!.top.toFixed(2)} w=${box!.width.toFixed(2)} h=${box!.height.toFixed(2)}`,
  )
  const cj = candidateDomIds.slice(0, 16)
  lines.push(
    `候选对象根: ${candidateDomIds.length} [${cj.join(', ')}${candidateDomIds.length > 16 ? ' …' : ''}]`,
  )
  lines.push(`命中 ${pickedLogical.length} 个 logicalId: ${JSON.stringify(pickedLogical)}`)
  return lines.join('\n')
}

function rectsIntersect(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
): boolean {
  const ax2 = a.left + a.width
  const ay2 = a.top + a.height
  const bx2 = b.left + b.width
  const by2 = b.top + b.height
  return a.left < bx2 && ax2 > b.left && a.top < by2 && ay2 > b.top
}

function svgElById(root: SVGSVGElement, id: string): Element | null {
  return getGraphicsElementByDomId(root, id)
}

/** 子元素有像素包围盒时参与合并（含 tspan）；用于 `<g>` 自身 clientRect 为 0 时 */
const SVG_SHAPE_TAGS = new Set([
  'rect',
  'circle',
  'ellipse',
  'line',
  'path',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'image',
  'use',
  'foreignobject',
])

/**
 * 合并选中节点子树内图元的 getBoundingClientRect，再换算为与根 SVG viewBox 一致的「用户坐标」。
 * 参考点必须用根 document `<svg>` 的屏幕矩形（与 (0,0) 对齐）；用 canvas-stack 会与子 svg 错位。
 */
function selectionFromDescendantUnion(
  rootEl: Element,
  rootSvg: SVGSVGElement,
  scaleVal: number,
  cw: number,
  ch: number,
): { left: number; top: number; width: number; height: number } | null {
  const ref = rootSvg.getBoundingClientRect()
  let minL = Infinity
  let minT = Infinity
  let maxR = -Infinity
  let maxB = -Infinity
  let any = false

  function consider(r: DOMRect) {
    /** 细线/单维度为 0 的图元：仅当两维都接近 0 时跳过 */
    if (r.width < 0.25 && r.height < 0.25) return
    minL = Math.min(minL, r.left)
    minT = Math.min(minT, r.top)
    maxR = Math.max(maxR, r.right)
    maxB = Math.max(maxB, r.bottom)
    any = true
  }

  for (const tag of SVG_SHAPE_TAGS) {
    try {
      rootEl.querySelectorAll(tag).forEach((node) => {
        consider(node.getBoundingClientRect())
      })
    } catch {
      /* 个别 tag 名在极老环境可能无效 */
    }
  }

  if (!any || !Number.isFinite(minL)) return null

  const local = {
    left: (minL - ref.left) / scaleVal,
    top: (minT - ref.top) / scaleVal,
    width: (maxR - minL) / scaleVal,
    height: (maxB - minT) / scaleVal,
  }
  if (![local.left, local.top, local.width, local.height].every(Number.isFinite)) return null
  return intersectWithCanvasRect(local, cw, ch)
}

/** 与逻辑画布 [0,cw]×[0,ch] 求交，保证选中框只画在画布内 */
function intersectWithCanvasRect(
  box: { left: number; top: number; width: number; height: number },
  cw: number,
  ch: number,
): { left: number; top: number; width: number; height: number } | null {
  if (![box.left, box.top, box.width, box.height, cw, ch].every(Number.isFinite)) return null
  const x1 = Math.max(0, box.left)
  const y1 = Math.max(0, box.top)
  const x2 = Math.min(cw, box.left + box.width)
  const y2 = Math.min(ch, box.top + box.height)
  const w = x2 - x1
  const h = y2 - y1
  if (w <= 0.25 || h <= 0.25) return null
  return { left: x1, top: y1, width: w, height: h }
}

function fmtDomRect(r: DOMRect, label: string): string {
  return `${label}: l=${r.left.toFixed(2)} t=${r.top.toFixed(2)} r=${r.right.toFixed(2)} b=${r.bottom.toFixed(2)} w=${r.width.toFixed(2)} h=${r.height.toFixed(2)}`
}

/** 说明与画布 [0,cw]×[0,ch] 求交后的结果（用于调试 rect 为 null） */
function explainIntersectDebug(
  box: { left: number; top: number; width: number; height: number },
  cw: number,
  ch: number,
): string {
  if (![box.left, box.top, box.width, box.height, cw, ch].every(Number.isFinite)) {
    return `intersect: 非有限数 → 拒绝。box=${JSON.stringify(box)} cw,ch=${cw},${ch}`
  }
  const x1 = Math.max(0, box.left)
  const y1 = Math.max(0, box.top)
  const x2 = Math.min(cw, box.left + box.width)
  const y2 = Math.min(ch, box.top + box.height)
  const w = x2 - x1
  const h = y2 - y1
  const bad = w <= 0.25 || h <= 0.25
  return `intersect: 输入 ${JSON.stringify(box)} 画布[0..${cw}]×[0..${ch}] → (${x1.toFixed(2)},${y1.toFixed(2)})-(${x2.toFixed(2)},${y2.toFixed(2)}) w=${w.toFixed(2)} h=${h.toFixed(2)} ${bad ? '→ 拒绝' : '→ 可显示'}`
}

/**
 * 刷新选中框后写入，便于复制完整上下文（clientRect、子图元统计、求交原因等）。
 */
function buildSelectionDiagnosticsDetail(
  el: Element,
  rootSvg: SVGSVGElement,
  cw: number,
  ch: number,
  scaleVal: number,
  finalRect: { left: number; top: number; width: number; height: number } | null,
  opts?: { totalSelected: number; extraElements?: Element[] },
): string {
  const lines: string[] = []
  const total = opts?.totalSelected ?? 1
  if (total > 1) {
    lines.push(
      `说明: 多选 ${total} 个对象。「结果 rect」为各对象单独选中框的并集。首节为第 1 个节点的完整诊断；若有「第 2…个选中摘要」则为其余项的 path1/union 及参与并集的单框。`,
    )
  }
  lines.push(`结果 rect: ${finalRect ? JSON.stringify(finalRect) : 'null'}`)
  lines.push(
    `选中节点 tagName=${el.tagName} localName=${el.localName} id=${el.getAttribute('id') ?? ''} ns=${el.namespaceURI ?? 'null'}`,
  )
  lines.push(`children.length=${el.children.length} childElementCount=${el.childElementCount ?? '—'}`)

  lines.push(
    `rootSvg viewBox=${rootSvg.getAttribute('viewBox') ?? '—'} width=${rootSvg.getAttribute('width') ?? '—'} height=${rootSvg.getAttribute('height') ?? '—'}`,
  )

  const ref = rootSvg.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  lines.push(fmtDomRect(ref, 'rootSvg clientRect'))
  lines.push(fmtDomRect(er, '选中 el clientRect'))

  lines.push(`path1 尝试条件: el.w≥0.5 且 el.h≥0.5 → ${er.width >= 0.5 && er.height >= 0.5}`)
  if (er.width >= 0.5 && er.height >= 0.5) {
    const local = {
      left: (er.left - ref.left) / scaleVal,
      top: (er.top - ref.top) / scaleVal,
      width: er.width / scaleVal,
      height: er.height / scaleVal,
    }
    lines.push(`path1 local: ${JSON.stringify(local)}`)
    lines.push(explainIntersectDebug(local, cw, ch))
  }

  const tagCounts: string[] = []
  let unionTotal = 0
  for (const tag of SVG_SHAPE_TAGS) {
    try {
      const n = el.querySelectorAll(tag).length
      if (n) {
        tagCounts.push(`${tag}:${n}`)
        unionTotal += n
      }
    } catch (e) {
      tagCounts.push(`${tag}:err`)
    }
  }
  lines.push(`子树各 tag 匹配: ${tagCounts.length ? tagCounts.join(', ') : '无'}`)
  lines.push(`匹配节点总数: ${unionTotal}`)

  let minL = Infinity
  let minT = Infinity
  let maxR = -Infinity
  let maxB = -Infinity
  let any = false
  let skippedTiny = 0
  for (const tag of SVG_SHAPE_TAGS) {
    try {
      el.querySelectorAll(tag).forEach((node) => {
        const r = node.getBoundingClientRect()
        if (r.width < 0.25 && r.height < 0.25) {
          skippedTiny++
          return
        }
        any = true
        minL = Math.min(minL, r.left)
        minT = Math.min(minT, r.top)
        maxR = Math.max(maxR, r.right)
        maxB = Math.max(maxB, r.bottom)
      })
    } catch {
      /* ignore */
    }
  }
  lines.push(`union: any=${any} skippedTiny=${skippedTiny}`)
  if (any && Number.isFinite(minL)) {
    const local = {
      left: (minL - ref.left) / scaleVal,
      top: (minT - ref.top) / scaleVal,
      width: (maxR - minL) / scaleVal,
      height: (maxB - minT) / scaleVal,
    }
    lines.push(`union local: ${JSON.stringify(local)}`)
    lines.push(explainIntersectDebug(local, cw, ch))
  } else {
    lines.push('union: 未得到有效合并盒 (子图元 clientRect 可能全为 0 或过小)')
  }

  const gel = el as SVGGraphicsElement
  if (typeof gel.getBBox === 'function') {
    try {
      const bb = gel.getBBox()
      lines.push(
        `getBBox: x=${bb.x} y=${bb.y} w=${bb.width} h=${bb.height}`,
      )
    } catch (e) {
      lines.push(`getBBox 异常: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  if (typeof gel.getCTM === 'function') {
    lines.push(`getCTM: ${gel.getCTM() ? 'ok' : 'null'}`)
  }

  const extras = opts?.extraElements
  if (extras?.length) {
    const ref2 = rootSvg.getBoundingClientRect()
    for (let i = 0; i < extras.length; i++) {
      const ex = extras[i]
      const domId = ex.getAttribute('id') ?? ''
      lines.push(`--- 第 ${i + 2} 个选中摘要 (#${domId}) ---`)
      const er2 = ex.getBoundingClientRect()
      lines.push(fmtDomRect(er2, 'el clientRect'))
      if (er2.width >= 0.5 && er2.height >= 0.5) {
        const p1 = {
          left: (er2.left - ref2.left) / scaleVal,
          top: (er2.top - ref2.top) / scaleVal,
          width: er2.width / scaleVal,
          height: er2.height / scaleVal,
        }
        lines.push(`path1 local: ${JSON.stringify(p1)}`)
      }
      let minL = Infinity
      let minT = Infinity
      let maxR = -Infinity
      let maxB = -Infinity
      let anyU = false
      for (const tag of SVG_SHAPE_TAGS) {
        try {
          ex.querySelectorAll(tag).forEach((node) => {
            const r = node.getBoundingClientRect()
            if (r.width < 0.25 && r.height < 0.25) return
            anyU = true
            minL = Math.min(minL, r.left)
            minT = Math.min(minT, r.top)
            maxR = Math.max(maxR, r.right)
            maxB = Math.max(maxB, r.bottom)
          })
        } catch {
          /* ignore */
        }
      }
      if (anyU && Number.isFinite(minL)) {
        const ulocal = {
          left: (minL - ref2.left) / scaleVal,
          top: (minT - ref2.top) / scaleVal,
          width: (maxR - minL) / scaleVal,
          height: (maxB - minT) / scaleVal,
        }
        lines.push(`union local: ${JSON.stringify(ulocal)}`)
      } else {
        lines.push('union local: (无有效子图元盒)')
      }
      const rOne = selectionInCanvasStack(ex as Element, rootSvg, scaleVal, cw, ch)
      lines.push(`参与并集的单个框: ${rOne ? JSON.stringify(rOne) : 'null'}`)
    }
  }

  return lines.join('\n')
}

/**
 * 将选中框换算为画布局部坐标（与 viewBox 一致）并裁剪到画布。
 * 许多浏览器对 SVG `<g>` 的 getBoundingClientRect 宽高为 0，需 fallback：`getBBox` + `getCTM` 变到根 SVG 用户坐标。
 */
function selectionFromSvgUserSpace(
  el: SVGGraphicsElement,
  cw: number,
  ch: number,
): { left: number; top: number; width: number; height: number } | null {
  let bbox: DOMRect
  try {
    bbox = el.getBBox()
  } catch {
    return null
  }
  const ctm = el.getCTM()
  if (!ctm) return null
  const { x, y, width: bw, height: bh } = bbox
  if (bw <= 0 && bh <= 0) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'g') {
      return intersectWithCanvasRect({ left: 0, top: 0, width: cw, height: ch }, cw, ch)
    }
    return null
  }
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
  const matrix = ctm as DOMMatrix
  for (const [px, py] of corners) {
    const tp = new DOMPoint(px, py).matrixTransform(matrix)
    minX = Math.min(minX, tp.x)
    maxX = Math.max(maxX, tp.x)
    minY = Math.min(minY, tp.y)
    maxY = Math.max(maxY, tp.y)
  }
  return intersectWithCanvasRect(
    { left: minX, top: minY, width: maxX - minX, height: maxY - minY },
    cw,
    ch,
  )
}

function selectionInCanvasStack(
  el: Element,
  rootSvg: SVGSVGElement,
  scaleVal: number,
  cw: number,
  ch: number,
): { left: number; top: number; width: number; height: number } | null {
  if (scaleVal <= 0) return null
  const ref = rootSvg.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  if (er.width >= 0.5 && er.height >= 0.5) {
    const local = {
      left: (er.left - ref.left) / scaleVal,
      top: (er.top - ref.top) / scaleVal,
      width: er.width / scaleVal,
      height: er.height / scaleVal,
    }
    const hit = intersectWithCanvasRect(local, cw, ch)
    if (hit) return hit
  }
  const fromUnion = selectionFromDescendantUnion(el, rootSvg, scaleVal, cw, ch)
  if (fromUnion) return fromUnion
  const gel = el as SVGGraphicsElement
  if (typeof gel.getBBox === 'function' && typeof gel.getCTM === 'function') {
    return selectionFromSvgUserSpace(gel, cw, ch)
  }
  return null
}

/** template ref 偶发未就绪时用 querySelector 兜底 */
function getCanvasStackEl(): HTMLElement | null {
  return (
    canvasStackRef.value ??
    (viewportRef.value?.querySelector('.canvas-stack') as HTMLElement | null) ??
    null
  )
}

function refreshSelectionBox() {
  if (resizeDragging.value) return
  const root = rootSvgEl()
  const cw = meta.value.width
  const ch = meta.value.height
  const s = scale.value
  const ids = props.selectedIds
    .map((lid) => resolveDomElementId(props.svgMarkup, lid))
    .filter((x): x is string => !!x)

  if (!root || !ids.length) {
    selectionCanvasRect.value = null
    selectionCanResize.value = false
    selectionDiagnostics.value = !root ? '诊断: rootSvg 为 null' : '诊断: 无选中项'
    return
  }

  let minL = Infinity
  let minT = Infinity
  let maxR = -Infinity
  let maxB = -Infinity
  let any = false
  let resizeOk = false

  for (const domId of ids) {
    if (isTopLevelLayerDomId(domId)) {
      selectionCanvasRect.value = { left: 0, top: 0, width: cw, height: ch }
      selectionCanResize.value = false
      selectionDiagnostics.value = `顶层 layer 全画布 rect 0,0,${cw},${ch}`
      return
    }
    const el = svgElById(root, domId)
    if (!el) continue
    const r = selectionInCanvasStack(el as Element, root, s, cw, ch)
    if (!r) continue
    any = true
    minL = Math.min(minL, r.left)
    minT = Math.min(minT, r.top)
    maxR = Math.max(maxR, r.left + r.width)
    maxB = Math.max(maxB, r.top + r.height)
    if (ids.length === 1) resizeOk = canResizeSvgElement(el as SVGElement)
  }

  if (!any) {
    selectionCanvasRect.value = null
    selectionCanResize.value = false
    selectionDiagnostics.value = '诊断: 无有效几何框'
    return
  }

  selectionCanvasRect.value = { left: minL, top: minT, width: maxR - minL, height: maxB - minT }
  selectionCanResize.value = ids.length === 1 && resizeOk
  const firstEl = svgElById(root, ids[0])
  const extraEls =
    ids.length > 1
      ? (ids.slice(1).map((id) => svgElById(root, id)).filter((e): e is Element => !!e) as Element[])
      : []
  selectionDiagnostics.value = firstEl
    ? buildSelectionDiagnosticsDetail(firstEl, root, cw, ch, s, selectionCanvasRect.value, {
        totalSelected: ids.length,
        extraElements: extraEls,
      })
    : ''
}

function scheduleRefreshSelection() {
  /** 双 nextTick：确保 template ref（canvasStack / viewport）与 v-html SVG 已就绪 */
  nextTick(() => {
    nextTick(() => {
      requestAnimationFrame(() => refreshSelectionBox())
    })
  })
}

function onScrollResizeRefresh() {
  scheduleRefreshSelection()
}

watch(
  () => [props.svgMarkup, props.selectedIds, scale.value, panX.value, panY.value] as const,
  () => {
    scheduleRefreshSelection()
  },
  { immediate: true, flush: 'post', deep: true },
)

/** 首次 immediate 可能在挂载前 viewport 尚未就绪；挂载后再量一次 */
onMounted(() => {
  scheduleRefreshSelection()
  window.addEventListener('scroll', onScrollResizeRefresh, true)
  window.addEventListener('resize', onScrollResizeRefresh)
  nextTick(() => {
    const vp = viewportRef.value
    const st = canvasStackRef.value
    if (typeof ResizeObserver !== 'undefined') {
      selectionResizeObserver = new ResizeObserver(onScrollResizeRefresh)
      if (vp) selectionResizeObserver.observe(vp)
      if (st) selectionResizeObserver.observe(st)
    }
  })
})

watch(viewportRef, (el) => {
  if (el) scheduleRefreshSelection()
})

watch(canvasStackRef, (el) => {
  if (el) scheduleRefreshSelection()
})

function findPickedId(target: EventTarget | null): string | null {
  const root = rootSvgEl()
  if (!root || !target) return null
  let el = target as Element | null
  while (el && root.contains(el)) {
    const id = el.getAttribute('id')
    if (id) {
      /** `#layer-root` 为 uisvg 根对象，允许在画布内点选；`layer-sibling` 仍视为背景条 */
      if (isTopLevelLayerDomId(id)) {
        if (id === 'layer-root') return id
        el = el.parentElement
        continue
      }
      return id
    }
    if (el === root) {
      return null
    }
    el = el.parentElement
  }
  return null
}

function commitSvgFromDom() {
  const svg = rootSvgEl()
  if (!svg) return
  const doc = svg.ownerDocument
  if (doc) syncOutlineTreeToMatchDom(doc)
  emit('updateSvg', new XMLSerializer().serializeToString(svg))
}

function onResizeMove(e: MouseEvent) {
  if (!resizeDragging.value || !resizeHandle || !resizeDomId) return
  const root = rootSvgEl()
  if (!root) {
    endResizeDrag()
    return
  }
  const el = svgElById(root, resizeDomId) as SVGElement | null
  if (!el) {
    endResizeDrag()
    return
  }
  const dxUser = (e.clientX - lastClientX) / scale.value
  const dyUser = (e.clientY - lastClientY) / scale.value
  lastClientX = e.clientX
  lastClientY = e.clientY
  if (!dxUser && !dyUser) return
  applyResizeDelta(el, resizeHandle, dxUser, dyUser)

  const cw = meta.value.width
  const ch = meta.value.height
  const sc = scale.value
  selectionCanvasRect.value = selectionInCanvasStack(el as Element, root, sc, cw, ch)
}

function endResizeDrag() {
  if (!resizeDragging.value) return
  resizeDragging.value = false
  resizeHandle = null
  resizeDomId = null
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeUp)

  commitSvgFromDom()
  nextTick(() => refreshSelectionBox())
}

function onResizeUp() {
  endResizeDrag()
}

function onResizeHandleDown(e: MouseEvent, handle: ResizeHandle) {
  const root = rootSvgEl()
  if (!root) return
  const domId = resolveDomElementId(props.svgMarkup, props.selectedIds[0] ?? null)
  if (!domId || isTopLevelLayerDomId(domId)) return
  const el = svgElById(root, domId) as SVGElement | null
  if (!el || !canResizeSvgElement(el)) return

  ensureResizeChromeLayoutSynced(el)

  clearPendingDrag()
  if (objectDragging) endObjectDrag()

  resizeDragging.value = true
  resizeHandle = handle
  resizeDomId = domId
  lastClientX = e.clientX
  lastClientY = e.clientY

  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeUp)
}

function clearPendingDrag() {
  pendingDrag = null
  window.removeEventListener('mousemove', onPendingDragMove)
  window.removeEventListener('mouseup', onPendingDragUp)
}

function onPendingDragMove(e: MouseEvent) {
  if (!pendingDrag) return
  const dx = e.clientX - pendingDrag.startX
  const dy = e.clientY - pendingDrag.startY
  if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return

  const domIds = pendingDrag.domIds
  const startX = pendingDrag.startX
  const startY = pendingDrag.startY
  clearPendingDrag()

  const root = rootSvgEl()
  if (!root) return
  const movable: string[] = []
  for (const id of domIds) {
    const el = svgElById(root, id) as SVGElement | null
    if (el && canMoveSvgElement(el)) movable.push(id)
  }
  if (!movable.length) return

  objectDragging = true
  objectDragIds = movable
  lastClientX = startX
  lastClientY = startY
  const cw = meta.value.width
  const ch = meta.value.height
  const t = buildSnapTargets(root, movable[0], cw, ch)
  snapVx = t.vx
  snapHy = t.hy
  guideLines.value = {}

  window.addEventListener('mousemove', onObjectMove)
  window.addEventListener('mouseup', onObjectUp)
  onObjectMove(e)
}

function onPendingDragUp() {
  clearPendingDrag()
}

function endObjectDrag() {
  if (!objectDragging) return
  const finishedIds = objectDragIds.slice()
  objectDragging = false
  objectDragIds = []
  guideLines.value = {}
  window.removeEventListener('mousemove', onObjectMove)
  window.removeEventListener('mouseup', onObjectUp)

  const svg = rootSvgEl()
  if (svg && finishedIds.length === 1) {
    reparentCanvasObjectAfterDrag(svg, finishedIds[0], lastClientX, lastClientY)
  }

  commitSvgFromDom()
  nextTick(() => refreshSelectionBox())
}

function onObjectMove(e: MouseEvent) {
  if (!objectDragging || !objectDragIds.length) return
  const root = rootSvgEl()
  if (!root) return

  const dxUser = (e.clientX - lastClientX) / scale.value
  const dyUser = (e.clientY - lastClientY) / scale.value
  lastClientX = e.clientX
  lastClientY = e.clientY

  if (!dxUser && !dyUser) return

  for (const id of objectDragIds) {
    const el = svgElById(root, id) as SVGElement | null
    if (!el) continue
    applyTranslateToSVGElement(el, dxUser, dyUser)
  }

  const primary = objectDragIds[0]
  const el = primary ? (svgElById(root, primary) as SVGElement | null) : null
  if (!el) {
    guideLines.value = {}
    return
  }

  let b: DOMRect
  try {
    b = el.getBBox()
  } catch {
    guideLines.value = {}
    return
  }

  const box: SnapBBox = { x: b.x, y: b.y, width: b.width, height: b.height }
  const th = snapThresholdUser(scale.value)
  const snapped = snapBoxToTargets(box, snapVx, snapHy, th)
  const cx = snapped.x - b.x
  const cy = snapped.y - b.y
  if (cx || cy) {
    for (const id of objectDragIds) {
      const node = svgElById(root, id) as SVGElement | null
      if (node) applyTranslateToSVGElement(node, cx, cy)
    }
  }

  guideLines.value = snapped.guides.vx !== undefined || snapped.guides.hy !== undefined ? snapped.guides : {}

  scheduleRefreshSelection()
}

function onObjectUp(e: MouseEvent) {
  lastClientX = e.clientX
  lastClientY = e.clientY
  endObjectDrag()
}

function tryBeginObjectDrag(e: MouseEvent, pickedDomId: string | null, logicalIds: string[]): boolean {
  if (!pickedDomId) return false
  const root = rootSvgEl()
  if (!root) return false
  const dragIds: string[] = []
  for (const lid of logicalIds) {
    const rid = resolveDomElementId(props.svgMarkup, lid)
    if (!rid || isTopLevelLayerDomId(rid)) continue
    const node = svgElById(root, rid) as SVGElement | null
    if (node && canMoveSvgElement(node)) dragIds.push(rid)
  }
  if (!dragIds.includes(pickedDomId) || !dragIds.length) return false

  pendingDrag = { domIds: dragIds, startX: e.clientX, startY: e.clientY }
  window.addEventListener('mousemove', onPendingDragMove)
  window.addEventListener('mouseup', onPendingDragUp)
  return true
}

function onWindowMarqueeMove(e: MouseEvent) {
  if (!marqueeStart.value) return
  marqueeCurrent.value = { x: e.clientX, y: e.clientY }
}

function onWindowMarqueeUp() {
  window.removeEventListener('mousemove', onWindowMarqueeMove)
  const st = marqueeStart.value
  const box = marqueeBox.value
  const pending = props.showSelectionDebug ? marqueeDebugPending.value : null
  marqueeDebugPending.value = null
  marqueeStart.value = null
  marqueeCurrent.value = null
  if (!st) return
  if (!box || box.width < 3 || box.height < 3) {
    if (props.showSelectionDebug) {
      marqueeDebugInfo.value = formatMarqueeDebugResult(pending, st, box, [], [], 'too_small')
    }
    if (!st.additive) emit('pick', [])
    return
  }
  const root = rootSvgEl()
  if (!root) {
    if (props.showSelectionDebug) {
      marqueeDebugInfo.value = formatMarqueeDebugResult(pending, st, box, [], [], 'no_root')
    }
    return
  }
  const cw = meta.value.width
  const ch = meta.value.height
  const s = scale.value
  const domIds = collectMarqueeCandidateDomIds(props.svgMarkup)
  const picked: string[] = []
  for (const domId of domIds) {
    const el = svgElById(root, domId)
    if (!el) continue
    const r = selectionInCanvasStack(el as Element, root, s, cw, ch)
    if (r && rectsIntersect(box, r)) {
      picked.push(outlineLogicalIdFromDomId(props.svgMarkup, domId))
    }
  }
  if (props.showSelectionDebug) {
    marqueeDebugInfo.value = formatMarqueeDebugResult(pending, st, box, domIds, picked, 'ok')
  }
  if (st.additive) {
    const set = new Set([...props.selectedIds, ...picked])
    emit('pick', [...set])
  } else {
    emit('pick', picked)
  }
}

function onWheel(e: WheelEvent) {
  if (objectDragging || resizeDragging.value) return
  e.preventDefault()
  const el = viewportRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const delta = -e.deltaY * 0.0015
  const next = Math.min(8, Math.max(0.1, scale.value * (1 + delta)))
  const wx = (mx - panX.value) / scale.value
  const wy = (my - panY.value) / scale.value
  scale.value = next
  panX.value = mx - wx * next
  panY.value = my - wy * next
  emitView()
}

function onDown(e: MouseEvent) {
  ctxMenu.value = null
  if (e.button === 1) {
    e.preventDefault()
    clearPendingDrag()
    if (objectDragging) endObjectDrag()
    panDragging = true
    lastX = e.clientX
    lastY = e.clientY
    return
  }
  if (e.button === 0) {
    const rawPick = findPickedId(e.target)
    const pickedDomId = rawPick ? resolveCanvasPickToUisvgObjectDomId(props.svgMarkup, rawPick) : null
    const logicalId = pickedDomId ? outlineLogicalIdFromDomId(props.svgMarkup, pickedDomId) : null

    let nextIds = [...props.selectedIds]
    if (logicalId && !isMarqueeBackgroundPick(pickedDomId, logicalId)) {
      if (e.shiftKey) {
        if (nextIds.includes(logicalId)) nextIds = nextIds.filter((x) => x !== logicalId)
        else nextIds = [...nextIds, logicalId]
      } else {
        nextIds = [logicalId]
      }
      emit('pick', nextIds)
      if (tryBeginObjectDrag(e, pickedDomId, nextIds)) {
        e.preventDefault()
        return
      }
    } else {
      if (props.showSelectionDebug) {
        marqueeDebugPending.value = {
          rawPick,
          pickedDomId,
          logicalId,
          additive: e.shiftKey,
          clientX: e.clientX,
          clientY: e.clientY,
        }
      }
      marqueeStart.value = { x: e.clientX, y: e.clientY, additive: e.shiftKey }
      marqueeCurrent.value = { x: e.clientX, y: e.clientY }
      window.addEventListener('mousemove', onWindowMarqueeMove)
      window.addEventListener('mouseup', onWindowMarqueeUp, { once: true })
    }
    e.preventDefault()
  }
}

function onCanvasDragOver(e: DragEvent) {
  if (!dataTransferAllowsCanvasPaletteWinDrop(e.dataTransfer)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

function onCanvasDrop(e: DragEvent) {
  const controlId = readPaletteWinControlIdFromDataTransfer(e.dataTransfer)
  if (!controlId) return
  e.preventDefault()
  const root = rootSvgEl()
  if (!root) return
  const doc = root.ownerDocument
  if (!doc) return
  const layerRoot = findLayerRoot(doc)
  const parentEl = findWinContainerParentForPaletteDrop(layerRoot, e.clientX, e.clientY)
  const pt = canvasClientToSvgUser(root, e.clientX, e.clientY)
  const gw = pt.x
  const gh = pt.y
  const cw = meta.value.width
  const ch = meta.value.height
  const sz = getWindowsControlPlacementSize(controlId)
  const parentDomId = parentEl.getAttribute('id')?.trim() || 'layer-root'

  if (isUisvgPaletteDropDebugEnabled()) {
    console.debug('[uisvg palette drop]', {
      controlId,
      parentDomId,
      layerRootId: layerRoot.getAttribute('id') ?? layerRoot.tagName,
      types: Array.from(e.dataTransfer?.types ?? []),
      clientX: e.clientX,
      clientY: e.clientY,
    })
  }

  if (parentDomId === 'layer-root') {
    const x = Math.min(Math.max(0, gw - sz.w / 2), Math.max(0, cw - sz.w))
    const y = Math.min(Math.max(0, gh - sz.h / 2), Math.max(0, ch - sz.h))
    emit('palette-drop-win', { controlId, parentDomId: 'layer-root', placement: { x, y } })
    return
  }

  const bundle = readUisvgBundleFromObjectRoot(parentEl)
  const containerId = bundle.uisvgLocalName || 'Panel'
  const { lx: lx0, ly: ly0 } = globalXYToParentLocal(parentEl, gw, gh)
  const lx = lx0 - sz.w / 2
  const ly = ly0 - sz.h / 2
  const c = clampLocalPlacementToInner(containerId, lx, ly, sz.w, sz.h, parentEl)
  emit('palette-drop-win', { controlId, parentDomId, placement: { x: c.x, y: c.y } })
}

function onCanvasContextMenu(e: MouseEvent) {
  e.preventDefault()
  ctxMenu.value = { x: e.clientX, y: e.clientY }
}

function closeCtxMenu() {
  ctxMenu.value = null
}

function emitCanvasCmd(
  cmd:
    | 'delete'
    | 'copy'
    | 'paste'
    | 'align-left'
    | 'align-right'
    | 'align-hcenter'
    | 'align-top'
    | 'align-bottom'
    | 'align-vcenter',
) {
  ctxMenu.value = null
  emit('canvasCommand', cmd)
}

function onMove(e: MouseEvent) {
  if (objectDragging) return
  if (!panDragging) return
  panX.value += e.clientX - lastX
  panY.value += e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  emitView()
}

function onUp() {
  panDragging = false
}

function onLeave() {
  panDragging = false
}

function emitView() {
  emit('viewChange', { scale: scale.value, panX: panX.value, panY: panY.value })
}

function resetView() {
  panX.value = 0
  panY.value = 0
  scale.value = 1
  emitView()
}

/**
 * 当前视口在画布用户坐标系下可见的矩形（用于库拖入时在「看得见」的区域就近落点）。
 */
function getVisibleUserRect(): { x: number; y: number; width: number; height: number } | null {
  const host = viewportRef.value
  if (!host) return null
  const vw = host.clientWidth
  const vh = host.clientHeight
  if (vw <= 0 || vh <= 0) return null
  const cw = meta.value.width
  const ch = meta.value.height
  const s = scale.value
  const px = panX.value
  const py = panY.value
  const x1 = Math.max(0, -px / s)
  const y1 = Math.max(0, -py / s)
  const x2 = Math.min(cw, (vw - px) / s)
  const y2 = Math.min(ch, (vh - py) / s)
  const w = x2 - x1
  const h = y2 - y1
  if (w < 4 || h < 4) return null
  return { x: x1, y: y1, width: w, height: h }
}

/** 缩放并平移，使整块逻辑画布落入视口（类似 Qt 设计器「全部显示」） */
function fitView() {
  const host = viewportRef.value
  if (!host) return
  const vw = host.clientWidth
  const vh = host.clientHeight
  const cw = meta.value.width
  const ch = meta.value.height
  if (vw <= 0 || vh <= 0 || cw <= 0 || ch <= 0) return
  const margin = 0.92
  let s = Math.min((vw * margin) / cw, (vh * margin) / ch)
  s = Math.min(8, Math.max(0.1, s))
  scale.value = s
  panX.value = (vw - cw * s) / 2
  panY.value = (vh - ch * s) / 2
  emitView()
  scheduleRefreshSelection()
}

/**
 * 根据大纲节点 id（或已有 DOM id）将对应图元居中并缩放适配视口，便于快速定位。
 */
function frameOutlineIdInView(outlineOrDomId: string) {
  const host = viewportRef.value
  const root = rootSvgEl()
  if (!host || !root) return
  const vw = host.clientWidth
  const vh = host.clientHeight
  if (vw <= 0 || vh <= 0) return
  const domId = resolveDomElementId(props.svgMarkup, outlineOrDomId)
  if (!domId) return
  const el = svgElById(root, domId)
  if (!el) return
  const cw = meta.value.width
  const ch = meta.value.height
  const sc = scale.value
  const rect = selectionInCanvasStack(el as Element, root, sc, cw, ch)
  if (!rect || rect.width < 0.25 || rect.height < 0.25) {
    fitView()
    return
  }
  const margin = 0.88
  let s = Math.min((vw * margin) / rect.width, (vh * margin) / rect.height)
  s = Math.min(8, Math.max(0.1, s))
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  panX.value = vw / 2 - cx * s
  panY.value = vh / 2 - cy * s
  scale.value = s
  emitView()
  scheduleRefreshSelection()
}

onUnmounted(() => {
  clearPendingDrag()
  window.removeEventListener('mousemove', onWindowMarqueeMove)
  window.removeEventListener('mousemove', onObjectMove)
  window.removeEventListener('mouseup', onObjectUp)
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeUp)
  window.removeEventListener('scroll', onScrollResizeRefresh, true)
  window.removeEventListener('resize', onScrollResizeRefresh)
  selectionResizeObserver?.disconnect()
  selectionResizeObserver = null
})

defineExpose({ resetView, fitView, frameOutlineIdInView, getVisibleUserRect })
</script>

<template>
  <div
    ref="viewportRef"
    class="canvas-viewport"
    tabindex="0"
    :class="{
      'canvas-viewport--drag-obj': objectDragging,
      'canvas-viewport--resize-obj': resizeDragging,
    }"
    @wheel="onWheel"
    @mousedown="onDown"
    @mousemove="onMove"
    @mouseup="onUp"
    @mouseleave="onLeave"
    @contextmenu="onCanvasContextMenu"
    @dragover="onCanvasDragOver"
    @drop="onCanvasDrop"
  >
    <div class="canvas-transform" :style="transformStyle">
      <div ref="canvasStackRef" class="canvas-stack">
        <div class="canvas-grid" :style="gridStyle" />
        <div class="canvas-chrome" :style="chromeBoxStyle" aria-hidden="true">
          <div class="canvas-chrome-inner">
            <span>{{ t('canvas.chromeSize', { w: Math.round(meta.width), h: Math.round(meta.height) }) }}</span>
            <span>{{ t('canvas.chromeDpi', { dpi: Math.round(meta.dpi) }) }}</span>
            <span>{{ t('canvas.chromeOrigin') }}</span>
          </div>
        </div>
        <div class="canvas-svg-host" v-html="displaySvg" />
        <svg
          class="canvas-interaction-overlay"
          :viewBox="overlayViewBox"
          :width="meta.width"
          :height="meta.height"
          pointer-events="none"
          aria-hidden="true"
        >
          <line
            v-if="guideLines.vx !== undefined"
            class="guide-line guide-v"
            :x1="guideLines.vx"
            :y1="0"
            :x2="guideLines.vx"
            :y2="meta.height"
          />
          <line
            v-if="guideLines.hy !== undefined"
            class="guide-line guide-h"
            :x1="0"
            :y1="guideLines.hy"
            :x2="meta.width"
            :y2="guideLines.hy"
          />
        </svg>
        <div
          v-if="marqueeBox"
          class="canvas-marquee"
          :style="{
            left: `${marqueeBox.left}px`,
            top: `${marqueeBox.top}px`,
            width: `${marqueeBox.width}px`,
            height: `${marqueeBox.height}px`,
          }"
          aria-hidden="true"
        />
        <div
          v-if="selectionCanvasRect"
          class="canvas-selection-frame"
          :title="selectionFrameTitle()"
          :style="{
            left: `${selectionCanvasRect.left}px`,
            top: `${selectionCanvasRect.top}px`,
            width: `${selectionCanvasRect.width}px`,
            height: `${selectionCanvasRect.height}px`,
          }"
          aria-hidden="true"
        >
          <div class="canvas-selection-frame__outline" />
          <template v-if="selectionCanResize && !objectDragging">
            <div
              v-for="h in RESIZE_HANDLES"
              :key="h"
              :class="['canvas-selection-handle', `canvas-selection-handle--${h}`]"
              :title="t('canvas.resizeHandleTitle', { handle: h })"
              @mousedown.stop.prevent="onResizeHandleDown($event, h)"
            />
          </template>
        </div>
      </div>
    </div>
    <div
      v-if="ctxMenu"
      class="canvas-ctx-menu"
      :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
      role="menu"
      @mousedown.stop
      @click.stop
    >
      <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('copy')">
        {{ t('ctxMenu.copy') }}
      </button>
      <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('paste')">
        {{ t('ctxMenu.paste') }}
      </button>
      <div class="canvas-ctx-sep" role="separator" />
      <div class="canvas-ctx-submenu-wrap">
        <div class="canvas-ctx-item canvas-ctx-item--has-submenu" role="menuitem" aria-haspopup="menu">
          <span class="canvas-ctx-item__label">{{ t('ctxMenu.align') }}</span>
          <span class="canvas-ctx-chevron" aria-hidden="true">▸</span>
        </div>
        <div class="canvas-ctx-submenu" role="menu">
          <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('align-left')">
            {{ t('menu.edit.alignLeft') }}
          </button>
          <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('align-hcenter')">
            {{ t('menu.edit.alignHCenter') }}
          </button>
          <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('align-right')">
            {{ t('menu.edit.alignRight') }}
          </button>
          <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('align-top')">
            {{ t('menu.edit.alignTop') }}
          </button>
          <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('align-vcenter')">
            {{ t('menu.edit.alignVCenter') }}
          </button>
          <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('align-bottom')">
            {{ t('menu.edit.alignBottom') }}
          </button>
        </div>
      </div>
      <div class="canvas-ctx-sep" role="separator" />
      <button type="button" class="canvas-ctx-item" role="menuitem" @click="emitCanvasCmd('delete')">
        {{ t('ctxMenu.delete') }}
      </button>
    </div>
    <div
      v-if="showSelectionDebug"
      class="canvas-selection-debug"
      aria-live="polite"
      @mousedown.stop
      @click.stop
      @wheel.stop
    >
      <pre
        :key="alignDebugNonce"
        ref="selectionDebugPreRef"
        class="canvas-selection-debug__pre"
        spellcheck="false"
        @wheel.stop
      >{{ selectionDebugLines }}</pre>
      <div class="canvas-selection-debug__row">
        <button type="button" class="win-button canvas-selection-debug__copy" @click.stop="copySelectionDebug">
          {{ t('canvas.alignDebug.copyButton') }}
        </button>
        <span v-if="selectionDebugCopyHint" class="canvas-selection-debug__hint">{{ selectionDebugCopyHint }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-viewport {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #e8e8e8;
  cursor: default;
  user-select: none;
}

.canvas-selection-debug {
  position: absolute;
  left: 6px;
  bottom: 6px;
  z-index: 20;
  max-width: min(520px, calc(100% - 12px));
  padding: 6px 8px;
  border-radius: 2px;
  font-size: 11px;
  line-height: 1.35;
  color: #1a1a1a;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #c0c0c0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
  cursor: default;
}

.canvas-selection-debug__pre {
  margin: 0 0 6px;
  padding: 0;
  max-height: 140px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, 'Cascadia Mono', 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.4;
  user-select: text;
  cursor: text;
}

.canvas-selection-debug__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.canvas-selection-debug__copy {
  font-size: 11px;
  padding: 2px 10px;
  min-height: 22px;
}

.canvas-selection-debug__hint {
  font-size: 11px;
  color: #107c10;
}

.canvas-viewport--drag-obj {
  cursor: move;
}

.canvas-viewport--resize-obj {
  cursor: default;
}

.canvas-transform {
  position: relative;
  display: inline-block;
}

.canvas-stack {
  position: relative;
  display: inline-block;
  overflow: hidden;
}

.canvas-grid {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  pointer-events: none;
}

.canvas-chrome {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
  box-sizing: border-box;
}

.canvas-chrome-inner {
  position: absolute;
  left: 4px;
  top: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  line-height: 1.25;
  color: #505050;
  font-family: 'Segoe UI', 'Microsoft YaHei UI', system-ui, sans-serif;
  text-shadow: 0 0 1px #ffffff, 0 0 2px #ffffff;
}

.canvas-svg-host {
  position: relative;
  z-index: 1;
  display: block;
  pointer-events: auto;
}

.canvas-svg-host :deep(svg) {
  display: block;
  vertical-align: top;
  /** 与文档根 `overflow="visible"` 一致，避免 UA 对嵌入 SVG 默认裁剪 viewBox 外内容 */
  overflow: visible;
}

.canvas-interaction-overlay {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 4;
  overflow: visible;
}

.canvas-marquee {
  position: absolute;
  z-index: 4;
  box-sizing: border-box;
  pointer-events: none;
  border: 1px dashed #0078d4;
  background: rgba(0, 120, 212, 0.08);
}

.canvas-selection-frame {
  position: absolute;
  z-index: 5;
  box-sizing: border-box;
  pointer-events: none;
}

.canvas-selection-frame__outline {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  outline: 2px dashed #0078d4;
  outline-offset: 0;
  background: rgba(0, 120, 212, 0.06);
}

.canvas-selection-handle {
  position: absolute;
  width: 7px;
  height: 7px;
  box-sizing: border-box;
  background: #ffffff;
  border: 1px solid #0078d4;
  pointer-events: auto;
  z-index: 1;
}

.canvas-selection-handle--nw {
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  cursor: nwse-resize;
}
.canvas-selection-handle--n {
  left: 50%;
  top: 0;
  transform: translate(-50%, -50%);
  cursor: ns-resize;
}
.canvas-selection-handle--ne {
  right: 0;
  top: 0;
  transform: translate(50%, -50%);
  cursor: nesw-resize;
}
.canvas-selection-handle--e {
  right: 0;
  top: 50%;
  transform: translate(50%, -50%);
  cursor: ew-resize;
}
.canvas-selection-handle--se {
  right: 0;
  bottom: 0;
  transform: translate(50%, 50%);
  cursor: nwse-resize;
}
.canvas-selection-handle--s {
  left: 50%;
  bottom: 0;
  transform: translate(-50%, 50%);
  cursor: ns-resize;
}
.canvas-selection-handle--sw {
  left: 0;
  bottom: 0;
  transform: translate(-50%, 50%);
  cursor: nesw-resize;
}
.canvas-selection-handle--w {
  left: 0;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: ew-resize;
}

.guide-line {
  pointer-events: none;
}
.canvas-ctx-menu {
  position: fixed;
  z-index: 200;
  min-width: 160px;
  padding: 4px 0;
  background: #f0f0f0;
  border: 1px solid #a0a0a0;
  border-radius: 2px;
  box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  font-family: 'Segoe UI', 'Microsoft YaHei UI', system-ui, sans-serif;
}

.canvas-ctx-submenu-wrap {
  position: relative;
}

.canvas-ctx-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 4px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.canvas-ctx-item:hover {
  background: #0078d4;
  color: #fff;
}

.canvas-ctx-item--has-submenu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: default;
  user-select: none;
}

.canvas-ctx-item__label {
  flex: 1;
  min-width: 0;
}

.canvas-ctx-chevron {
  flex-shrink: 0;
  font-size: 9px;
  line-height: 1;
  opacity: 0.9;
}

.canvas-ctx-submenu-wrap:hover .canvas-ctx-item--has-submenu {
  background: #0078d4;
  color: #fff;
}

.canvas-ctx-submenu {
  display: none;
  position: absolute;
  left: 100%;
  top: -5px;
  margin-left: -4px;
  min-width: 156px;
  padding: 4px 0;
  z-index: 201;
  background: #f0f0f0;
  border: 1px solid #a0a0a0;
  border-radius: 2px;
  box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.15);
}

.canvas-ctx-submenu-wrap:hover .canvas-ctx-submenu {
  display: block;
}

.canvas-ctx-submenu .canvas-ctx-item:hover {
  background: #0078d4;
  color: #fff;
}

.canvas-ctx-sep {
  height: 1px;
  margin: 4px 0;
  background: #c0c0c0;
}

</style>

<style>
/* 叠层 SVG 与 v-html 内文档分离；参考线样式放在非 scoped */
.canvas-interaction-overlay {
  display: block;
}

.canvas-interaction-overlay .guide-line {
  stroke: #e81123;
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 4 4;
  opacity: 0.95;
  pointer-events: none;
}
</style>
