export interface SnapBBox {
  x: number
  y: number
  width: number
  height: number
}

export interface SnapGuides {
  vx?: number
  hy?: number
}

/** 屏幕像素级吸附阈值 → 用户空间（随缩放反比） */
export function snapThresholdUser(scale: number, screenPx = 7): number {
  return Math.max(0.5, screenPx / Math.max(scale, 0.01))
}

/** 画布边界与中心 + 其他图元的左/中/右、上/中/下 */
export function buildSnapTargets(
  rootSvg: SVGSVGElement,
  excludeId: string,
  canvasW: number,
  canvasH: number,
): { vx: number[]; hy: number[] } {
  const vx = new Set<number>([0, canvasW / 2, canvasW])
  const hy = new Set<number>([0, canvasH / 2, canvasH])

  const all = rootSvg.querySelectorAll('[id]')
  for (let i = 0; i < all.length; i++) {
    const n = all[i] as SVGGraphicsElement
    const id = n.getAttribute('id')
    if (!id || id === excludeId) continue
    if (typeof n.getBBox !== 'function') continue
    try {
      const b = n.getBBox()
      if (!b.width && !b.height) continue
      vx.add(b.x)
      vx.add(b.x + b.width / 2)
      vx.add(b.x + b.width)
      hy.add(b.y)
      hy.add(b.y + b.height / 2)
      hy.add(b.y + b.height)
    } catch {
      /* ignore */
    }
  }

  return {
    vx: Array.from(vx).sort((a, b) => a - b),
    hy: Array.from(hy).sort((a, b) => a - b),
  }
}

/**
 * 对矩形包络做一次轴对齐吸附，返回平移后的左上角与可选参考线位置。
 */
export function snapBoxToTargets(
  box: SnapBBox,
  vx: number[],
  hy: number[],
  threshold: number,
): { x: number; y: number; guides: SnapGuides } {
  const ax = snapOneAxis(box.x, box.width, vx, threshold)
  const ay = snapOneAxis(box.y, box.height, hy, threshold)
  return {
    x: ax.pos,
    y: ay.pos,
    guides: {
      ...(ax.guide !== undefined ? { vx: ax.guide } : {}),
      ...(ay.guide !== undefined ? { hy: ay.guide } : {}),
    },
  }
}

function snapOneAxis(
  pos: number,
  size: number,
  targets: number[],
  th: number,
): { pos: number; guide?: number } {
  const edges = [pos, pos + size / 2, pos + size]
  let bestDelta = 0
  let bestAbs = Infinity
  let guide: number | undefined

  for (const e of edges) {
    for (const t of targets) {
      const d = t - e
      if (Math.abs(d) <= th && Math.abs(d) < bestAbs) {
        bestDelta = d
        bestAbs = Math.abs(d)
        guide = t
      }
    }
  }

  return { pos: pos + bestDelta, guide }
}
