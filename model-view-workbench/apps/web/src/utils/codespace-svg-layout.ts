import type {
  MvCodespaceNamespaceNode,
  MvModelCodespaceModule,
  MvModelCodespacePayload,
} from '@mvwb/core';

/** 画布可命中节点（与 CodespaceCanvasEditor 内 CsSelection 不含 meta 部分对齐） */
export type CodespaceSvgPick =
  | { t: 'module'; mi: number }
  | { t: 'ns'; mi: number; path: number[] }
  | { t: 'class'; mi: number; path: number[]; ci: number }
  | { t: 'var'; mi: number; path: number[]; vi: number }
  | { t: 'fn'; mi: number; path: number[]; fi: number }
  | { t: 'macro'; mi: number; path: number[]; maci: number };

export interface CodespaceLayoutNode {
  pick: CodespaceSvgPick;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CodespaceLayoutResult {
  nodes: CodespaceLayoutNode[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const PAD = 20;
const MOD_HEAD_H = 34;
const ROW_H = 26;
const ROW_GAP = 6;
const CELL_GAP = 6;
const MODULE_GAP = 28;
const NS_COL_GAP = 10;
const MIN_MODULE_W = 200;
const MIN_NS_COL_W = 96;

function emptyBounds(): CodespaceLayoutResult['bounds'] {
  return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
}

function extendBounds(
  b: CodespaceLayoutResult['bounds'],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  b.minX = Math.min(b.minX, x);
  b.minY = Math.min(b.minY, y);
  b.maxX = Math.max(b.maxX, x + w);
  b.maxY = Math.max(b.maxY, y + h);
}

function cellW(name: string): number {
  return Math.min(200, Math.max(72, 52 + Math.min(name.length, 22) * 6));
}

function nsHeaderW(name: string): number {
  return Math.max(MIN_NS_COL_W, Math.min(280, 64 + name.length * 7));
}

/**
 * 命名空间一列：纵向「NS 标题 → 类（横向）→ 变量/函数/宏（横向）→ 子命名空间（横向多列）」
 */
function layoutNamespaceColumn(
  ns: MvCodespaceNamespaceNode,
  mi: number,
  path: number[],
  x0: number,
  y0: number,
  out: CodespaceLayoutNode[],
  bounds: CodespaceLayoutResult['bounds'],
): { w: number; h: number } {
  let y = y0;
  let colW = nsHeaderW(ns.name);

  out.push({
    pick: { t: 'ns', mi, path },
    label: `NS · ${ns.name}`,
    x: x0,
    y,
    w: colW,
    h: ROW_H,
  });
  extendBounds(bounds, x0, y, colW, ROW_H);
  y += ROW_H + ROW_GAP;

  if (ns.classes?.length) {
    let x = x0;
    (ns.classes ?? []).forEach((c, ci) => {
      const cw = cellW(c.name);
      out.push({
        pick: { t: 'class', mi, path, ci },
        label: `类 · ${c.name}`,
        x,
        y,
        w: cw,
        h: ROW_H,
      });
      extendBounds(bounds, x, y, cw, ROW_H);
      x += cw + CELL_GAP;
    });
    colW = Math.max(colW, x - x0 - CELL_GAP);
    y += ROW_H + ROW_GAP;
  }

  type RowPick = CodespaceSvgPick;
  const rowItems: { pick: RowPick; label: string; name: string }[] = [];
  (ns.variables ?? []).forEach((v, vi) => {
    rowItems.push({ pick: { t: 'var', mi, path, vi }, label: `变量 · ${v.name}`, name: v.name });
  });
  (ns.functions ?? []).forEach((f, fi) => {
    rowItems.push({ pick: { t: 'fn', mi, path, fi }, label: `函数 · ${f.name}`, name: f.name });
  });
  (ns.macros ?? []).forEach((m, maci) => {
    rowItems.push({ pick: { t: 'macro', mi, path, maci }, label: `宏 · ${m.name}`, name: m.name });
  });
  if (rowItems.length) {
    let x = x0;
    for (const it of rowItems) {
      const cw = cellW(it.name);
      out.push({
        pick: it.pick,
        label: it.label,
        x,
        y,
        w: cw,
        h: ROW_H,
      });
      extendBounds(bounds, x, y, cw, ROW_H);
      x += cw + CELL_GAP;
    }
    colW = Math.max(colW, x - x0 - CELL_GAP);
    y += ROW_H + ROW_GAP;
  }

  const children = ns.namespaces ?? [];
  if (!children.length) {
    return { w: colW, h: y - y0 };
  }

  let cx = x0;
  let childRowH = 0;
  children.forEach((child, i) => {
    const pth = [...path, i];
    const { w: cw, h: ch } = layoutNamespaceColumn(child, mi, pth, cx, y, out, bounds);
    colW = Math.max(colW, cx + cw - x0);
    childRowH = Math.max(childRowH, ch);
    cx += cw + NS_COL_GAP;
  });
  y += childRowH;

  return { w: colW, h: y - y0 };
}

function layoutModuleStrip(
  m: MvModelCodespaceModule,
  mi: number,
  x0: number,
  y0: number,
  nodesOut: CodespaceLayoutNode[],
  bounds: CodespaceLayoutResult['bounds'],
): { w: number; h: number } {
  const topY = y0;
  const innerY = y0 + MOD_HEAD_H + ROW_GAP;
  const roots = m.namespaces ?? [];
  const segment: CodespaceLayoutNode[] = [];

  if (!roots.length) {
    const w = MIN_MODULE_W;
    nodesOut.push({
      pick: { t: 'module', mi },
      label: `模块 · ${m.name}`,
      x: x0,
      y: topY,
      w,
      h: MOD_HEAD_H,
    });
    extendBounds(bounds, x0, topY, w, MOD_HEAD_H);
    return { w, h: MOD_HEAD_H };
  }

  let x = x0;
  let maxBottom = innerY;
  roots.forEach((ns, i) => {
    const { w: cw, h: ch } = layoutNamespaceColumn(ns, mi, [i], x, innerY, segment, bounds);
    maxBottom = Math.max(maxBottom, innerY + ch);
    x += cw + NS_COL_GAP;
  });

  const moduleW = Math.max(MIN_MODULE_W, x - x0 - NS_COL_GAP);

  nodesOut.push({
    pick: { t: 'module', mi },
    label: `模块 · ${m.name}`,
    x: x0,
    y: topY,
    w: moduleW,
    h: MOD_HEAD_H,
  });
  extendBounds(bounds, x0, topY, moduleW, MOD_HEAD_H);
  nodesOut.push(...segment);

  return { w: moduleW, h: maxBottom - topY };
}

/** 将 codespace payload 排版为平面节点列表（世界坐标），供 SVG 绘制与 hit-test */
export function layoutCodespaceSvg(payload: MvModelCodespacePayload): CodespaceLayoutResult {
  const modules = payload.modules ?? [];
  const nodesOut: CodespaceLayoutNode[] = [];
  const bounds = { minX: PAD, minY: PAD, maxX: PAD, maxY: PAD };

  if (!modules.length) {
    return { nodes: [], bounds: emptyBounds() };
  }

  let cursorX = PAD;
  let maxH = 0;
  modules.forEach((m, mi) => {
    const { w, h } = layoutModuleStrip(m, mi, cursorX, PAD, nodesOut, bounds);
    maxH = Math.max(maxH, h);
    cursorX += w + MODULE_GAP;
  });
  bounds.maxX = Math.max(bounds.maxX, cursorX - MODULE_GAP + PAD);
  bounds.maxY = Math.max(bounds.maxY, PAD + maxH + PAD);

  return { nodes: nodesOut, bounds };
}
