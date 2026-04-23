import type { MindmapLayoutNode, MindmapNodeData } from './types';

const NODE_W = 168;
const NODE_MIN_H = 42;
const NODE_PAD_X = 12;
const NODE_PAD_Y = 12;
const NODE_BASE_FONT_SIZE = 12;
const NODE_BASE_LINE_H = 16;
const GAP_X = 84;
const GAP_Y = 22;

function charWidthPx(ch: string, fontSize: number): number {
  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(ch)) return fontSize;
  if (/[\u{1F300}-\u{1FAFF}]/u.test(ch)) return fontSize * 1.1;
  if (/\s/.test(ch)) return fontSize * 0.36;
  if (/[A-Z0-9]/.test(ch)) return fontSize * 0.62;
  return fontSize * 0.56;
}

function wrapLabelLines(label: string, fontSize: number): string[] {
  const src = (label || '').trim();
  if (!src) return [''];
  const fs = Math.max(10, fontSize);
  const textMaxPx = Math.max(24, NODE_W - NODE_PAD_X * 2);
  const out: string[] = [];
  for (const rawLine of src.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      out.push('');
      continue;
    }
    let cur = '';
    let px = 0;
    for (const ch of line) {
      const w = charWidthPx(ch, fs);
      if (cur && px + w > textMaxPx) {
        out.push(cur);
        cur = ch;
        px = w;
      } else {
        cur += ch;
        px += w;
      }
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [''];
}

function nodeFontSize(n: MindmapNodeData): number {
  const fs = Number(n.fontSize ?? NODE_BASE_FONT_SIZE);
  return Number.isFinite(fs) ? Math.max(10, Math.min(28, fs)) : NODE_BASE_FONT_SIZE;
}

function nodeLineHeight(n: MindmapNodeData): number {
  const fs = nodeFontSize(n);
  return Math.max(14, Math.round(fs * (NODE_BASE_LINE_H / NODE_BASE_FONT_SIZE)));
}

function nodeBoxHeight(n: MindmapNodeData): number {
  const iconPrefix = n.icon ? `${n.icon} ` : '';
  const fs = nodeFontSize(n);
  const lines = wrapLabelLines(`${iconPrefix}${n.label ?? ''}`, fs);
  return Math.max(NODE_MIN_H, NODE_PAD_Y * 2 + lines.length * nodeLineHeight(n));
}

function childMap(nodes: MindmapNodeData[]): Map<string | null, MindmapNodeData[]> {
  const m = new Map<string | null, MindmapNodeData[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const arr = m.get(key) ?? [];
    arr.push(n);
    m.set(key, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  }
  return m;
}

function subtreeHeight(id: string, byParent: Map<string | null, MindmapNodeData[]>, byId: Map<string, MindmapNodeData>): number {
  const n = byId.get(id);
  if (!n) return NODE_MIN_H;
  const selfH = nodeBoxHeight(n);
  if (n.collapsed) return selfH;
  const kids = byParent.get(id) ?? [];
  if (!kids.length) return selfH;
  let total = 0;
  for (let i = 0; i < kids.length; i++) {
    total += subtreeHeight(kids[i]!.id, byParent, byId);
    if (i < kids.length - 1) total += GAP_Y;
  }
  return Math.max(selfH, total);
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
    if (!n) return NODE_MIN_H;
    const h = subtreeHeight(id, byParent, byId);
    const centerY = topY + h / 2;
    const boxH = nodeBoxHeight(n);
    const iconPrefix = n.icon ? `${n.icon} ` : '';
    const fs = nodeFontSize(n);
    out.set(id, {
      ...n,
      x: depth * (NODE_W + GAP_X),
      y: centerY - boxH / 2,
      w: NODE_W,
      h: boxH,
      depth,
      labelLines: wrapLabelLines(`${iconPrefix}${n.label ?? ''}`, fs),
    });
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
  // Manual positions (from free dragging) take precedence until auto-relayout clears them.
  for (const n of nodes) {
    const ln = out.get(n.id);
    if (!ln) continue;
    if (Number.isFinite(n.posX)) ln.x = Number(n.posX);
    if (Number.isFinite(n.posY)) ln.y = Number(n.posY);
  }
  return nodes.map((n) => out.get(n.id)!).filter(Boolean);
}
