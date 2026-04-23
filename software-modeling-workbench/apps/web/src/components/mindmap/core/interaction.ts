import type { MindmapLayoutNode } from './types';

export function pointToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  panX: number,
  panY: number,
  scale: number,
): { x: number; y: number } {
  return { x: (clientX - rect.left - panX) / scale, y: (clientY - rect.top - panY) / scale };
}

export function pickNodeAt(nodes: MindmapLayoutNode[], x: number, y: number): MindmapLayoutNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!;
    if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) return n;
  }
  return null;
}

export function zoomAt(
  currentScale: number,
  panX: number,
  panY: number,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  deltaY: number,
): { scale: number; panX: number; panY: number } {
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const next = Math.min(3, Math.max(0.3, currentScale + (deltaY > 0 ? -0.1 : 0.1)));
  const k = next / currentScale;
  return { scale: next, panX: cx - k * (cx - panX), panY: cy - k * (cy - panY) };
}

export function idsInMarquee(
  nodes: MindmapLayoutNode[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): string[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  return nodes
    .filter((n) => n.x + n.w >= minX && n.x <= maxX && n.y + n.h >= minY && n.y <= maxY)
    .map((n) => n.id);
}
