import type { MindmapLayoutNode, MindmapNodeData } from './types';

const NODE_W = 168;
const NODE_H = 42;
const GAP_X = 84;
const GAP_Y = 22;

function childMap(nodes: MindmapNodeData[]): Map<string | null, MindmapNodeData[]> {
  const m = new Map<string | null, MindmapNodeData[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const arr = m.get(key) ?? [];
    arr.push(n);
    m.set(key, arr);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return m;
}

function subtreeHeight(id: string, byParent: Map<string | null, MindmapNodeData[]>, byId: Map<string, MindmapNodeData>): number {
  const n = byId.get(id);
  if (!n) return NODE_H;
  if (n.collapsed) return NODE_H;
  const kids = byParent.get(id) ?? [];
  if (!kids.length) return NODE_H;
  let total = 0;
  for (let i = 0; i < kids.length; i++) {
    total += subtreeHeight(kids[i]!.id, byParent, byId);
    if (i < kids.length - 1) total += GAP_Y;
  }
  return Math.max(NODE_H, total);
}

export function layoutMindmap(nodes: MindmapNodeData[]): MindmapLayoutNode[] {
  if (!nodes.length) return [];
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const byParent = childMap(nodes);
  const roots = byParent.get(null) ?? [nodes[0]!];
  const out = new Map<string, MindmapLayoutNode>();
  let cursorY = 0;

  const place = (id: string, depth: number, topY: number): number => {
    const n = byId.get(id);
    if (!n) return NODE_H;
    const h = subtreeHeight(id, byParent, byId);
    const centerY = topY + h / 2;
    out.set(id, { ...n, x: depth * (NODE_W + GAP_X), y: centerY - NODE_H / 2, w: NODE_W, h: NODE_H, depth });
    if (n.collapsed) return h;
    const kids = byParent.get(id) ?? [];
    if (!kids.length) return h;
    let cy = topY;
    for (let i = 0; i < kids.length; i++) {
      const kh = place(kids[i]!.id, depth + 1, cy);
      cy += kh + GAP_Y;
    }
    return h;
  };

  for (let i = 0; i < roots.length; i++) {
    const h = place(roots[i]!.id, 0, cursorY);
    cursorY += h + GAP_Y * 2;
  }
  return nodes.map((n) => out.get(n.id)!).filter(Boolean);
}
