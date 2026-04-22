import type {
  MvCodespaceClassifier,
  MvCodespaceNamespaceNode,
  MvModelCodespaceModule,
  MvModelCodespacePayload,
} from '@mvwb/core';

/** 画布可命中节点（与 CodespaceCanvasEditor 内 CsSelection 不含 meta 部分对齐） */
export type CodespaceSvgPick =
  | { t: 'module'; mi: number }
  | { t: 'ns'; mi: number; path: number[] }
  | { t: 'class'; mi: number; path: number[]; ci: number; classPath?: number[] }
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

/** 树状连线（SVG `path`；三次贝塞尔；权柄纯横向、与竖边正交切线；廊道 `busX`；**实线**） */
export interface CodespaceLayoutEdge {
  d: string;
}

export interface CodespaceLayoutResult {
  nodes: CodespaceLayoutNode[];
  edges: CodespaceLayoutEdge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** 画布节点框前缀（由 `makeCodespaceLayoutLabels` 从 i18n 注入） */
export interface CodespaceLayoutLabelFns {
  moduleBar: (name: string) => string;
  nsHeader: (name: string) => string;
  classRow: (name: string) => string;
  varRow: (name: string) => string;
  fnRow: (name: string) => string;
  macroRow: (name: string) => string;
  moduleNode: (name: string) => string;
  moduleFallback: (mi: number) => string;
}

const PAD = 10;
const ROW_H = 20;
/** 行与行之间留白，供连线水平母线在矩形外通过 */
const ROW_GAP = 8;
const CELL_GAP = 3;
const MODULE_GAP = 12;
/** 根 NS 竖向堆叠之间的间距（px） */
const NS_COL_GAP = 5;
/**
 * 模块竖条右缘到内容区起点（首列根 NS 左缘）的水平距（px）。
 * 须明显大于 `EDGE_INSET`，否则 `busXsInCorridor(sxMod, …)` 廊道过窄、多根连线堆叠。
 */
const LR_MODULE_TO_INNER = 30;
/** NS 右缘到同级列左缘：走线廊道（容纳多条母线 x，避免贝塞尔臂差异过小） */
const LR_NS_TO_SIBLING = 42;
const MIN_NS_COL_W = 72;
/** 连线端点与矩形边的间隙（px） */
const EDGE_INSET = 2;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

function extendPoint(b: CodespaceLayoutResult['bounds'], x: number, y: number): void {
  extendBounds(b, x, y, 0, 0);
}

/** 节点框宽度：按完整 `label` 估算（含「类 ·」等前缀），略放宽以适配中文等宽字体 */
function labelCellW(label: string): number {
  let w = 0;
  for (let i = 0; i < label.length; i++) {
    w += label.charCodeAt(i) > 255 ? 7.2 : 5.4;
  }
  return Math.min(240, Math.max(52, 14 + w));
}

function nsBlockW(nsName: string, lbl: CodespaceLayoutLabelFns): number {
  const label = lbl.nsHeader(nsName);
  return Math.max(MIN_NS_COL_W, Math.min(240, 36 + Math.min(label.length, 36) * 6.5));
}

function moduleLeftBarW(m: MvModelCodespaceModule, lbl: CodespaceLayoutLabelFns): number {
  const label = lbl.moduleBar(m.name);
  return Math.min(220, Math.max(80, labelCellW(label) + 12));
}

/** 在 `sx` 与 `x1` 之间均匀分配竖向母线 x（每条子边一根，避免共线重叠） */
function busXsInCorridor(sx: number, x1: number, n: number): number[] {
  const left = sx + 2.5;
  const right = Math.max(left + 2, x1 - 3);
  if (n <= 0) return [];
  if (n === 1) return [(left + right) / 2];
  const span = right - left;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    out.push(left + ((t0 + t1) / 2) * span);
  }
  return out;
}

/**
 * LR 三次贝塞尔：**仅横向**权柄——P1=(sx+armOut,sy)、P2=(tx−armIn,ty)，
 * 使在竖直边界上的切线为水平方向（与框边垂直）；`busX` 相对弦中点的偏移微调 armOut/armIn 以分开平行边。
 */
function pushCurvedLREdge(
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  busX: number,
): void {
  if (Math.hypot(tx - sx, ty - sy) < 0.25) return;
  const gap = tx - sx;
  if (gap < 0.25) return;

  const midX = sx + gap / 2;
  const lane = busX - midX;
  const cap = Math.min(44, Math.max(10, gap * 0.44));
  const minArm = EDGE_INSET + 3;
  let armOut = cap + lane * 0.42;
  let armIn = cap - lane * 0.42;
  armOut = Math.max(minArm, Math.min(armOut, gap * 0.52));
  armIn = Math.max(minArm, Math.min(armIn, gap * 0.52));
  const maxSum = gap - 8;
  if (armOut + armIn > maxSum && maxSum > minArm * 2) {
    const s = maxSum / (armOut + armIn);
    armOut *= s;
    armIn *= s;
  }
  let c1x = sx + armOut;
  let c2x = tx - armIn;
  if (c2x <= c1x + 4) {
    const half = Math.max(minArm, (gap - 8) / 2);
    c1x = sx + half;
    c2x = tx - half;
  }
  const c1y = sy;
  const c2y = ty;

  extendPoint(bounds, sx, sy);
  extendPoint(bounds, c1x, c1y);
  extendPoint(bounds, c2x, c2y);
  extendPoint(bounds, tx, ty);
  const d = `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}`;
  edges.push({ d });
}

function pushCurvedAnyDirEdge(
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): void {
  if (Math.hypot(tx - sx, ty - sy) < 0.25) return;
  const dir = tx >= sx ? 1 : -1;
  const gap = Math.max(8, Math.abs(tx - sx));
  const arm = Math.max(8, Math.min(42, gap * 0.44));
  const c1x = sx + dir * arm;
  const c2x = tx - dir * arm;
  const c1y = sy;
  const c2y = ty;
  extendPoint(bounds, sx, sy);
  extendPoint(bounds, c1x, c1y);
  extendPoint(bounds, c2x, c2y);
  extendPoint(bounds, tx, ty);
  edges.push({ d: `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}` });
}

/** 从左到右树：子树外包宽高（与 `layoutNsTreeLR` 一致；同级叶与子 NS 头共一列宽 `col1w`） */
function measureLrSubtree(ns: MvCodespaceNamespaceNode, lbl: CodespaceLayoutLabelFns): { w: number; h: number } {
  const nsW = nsBlockW(ns.name, lbl);
  const children = ns.namespaces ?? [];

  const leafLabels: string[] = [];
  (ns.classes ?? []).forEach((c) => leafLabels.push(lbl.classRow(c.name)));
  (ns.variables ?? []).forEach((v) => leafLabels.push(lbl.varRow(v.name)));
  (ns.functions ?? []).forEach((f) => leafLabels.push(lbl.fnRow(f.name)));
  (ns.macros ?? []).forEach((m) => leafLabels.push(lbl.macroRow(m.name)));

  const nL = leafLabels.length;
  let col1w = 0;
  let leafColH = 0;
  if (nL) {
    for (const lb of leafLabels) col1w = Math.max(col1w, labelCellW(lb));
    leafColH = nL * ROW_H + (nL - 1) * ROW_GAP;
  }
  for (const ch of children) {
    col1w = Math.max(col1w, nsBlockW(ch.name, lbl));
  }
  if (nL === 0 && children.length === 0) {
    return { w: nsW, h: ROW_H };
  }
  col1w = Math.max(MIN_NS_COL_W, col1w);

  let maxChildW = 0;
  let sumChildH = 0;
  children.forEach((ch, i) => {
    const s = measureLrSubtree(ch, lbl);
    maxChildW = Math.max(maxChildW, s.w);
    sumChildH += s.h + (i > 0 ? ROW_GAP : 0);
  });

  let stackH = leafColH;
  if (nL && children.length) stackH += ROW_GAP;
  stackH += sumChildH;

  const rightExtra = children.length > 0 ? NS_COL_GAP + maxChildW : 0;
  const W = nsW + LR_NS_TO_SIBLING + col1w + rightExtra;
  const H = Math.max(ROW_H, stackH);

  return { w: W, h: H };
}

function midY(r: Rect): number {
  return r.y + r.h / 2;
}

function midX(r: Rect): number {
  return r.x + r.w / 2;
}

function leftMid(r: Rect): { x: number; y: number } {
  return { x: r.x, y: midY(r) };
}

function rightMid(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w, y: midY(r) };
}

/**
 * 从左到右树：NS 在左；**同级**叶（类/变量/函数/宏）与子 NS 根在 **同一竖列**（等宽 `col1w`）自上而下；
 * 各子命名空间整棵子树在该列右侧接续向右递归。
 */
function layoutNsTreeLR(
  ns: MvCodespaceNamespaceNode,
  mi: number,
  path: number[],
  x0: number,
  y0: number,
  out: CodespaceLayoutNode[],
  bounds: CodespaceLayoutResult['bounds'],
  edges: CodespaceLayoutEdge[],
  lbl: CodespaceLayoutLabelFns,
): { w: number; h: number; nsHeader: Rect } {
  const { w: W, h: H } = measureLrSubtree(ns, lbl);
  const nsW = nsBlockW(ns.name, lbl);
  const ny = y0 + (H - ROW_H) / 2;
  const nsHeader: Rect = { x: x0, y: ny, w: nsW, h: ROW_H };
  out.push({
    pick: { t: 'ns', mi, path },
    label: lbl.nsHeader(ns.name),
    x: nsHeader.x,
    y: nsHeader.y,
    w: nsHeader.w,
    h: nsHeader.h,
  });
  extendBounds(bounds, nsHeader.x, nsHeader.y, nsHeader.w, nsHeader.h);

  const pr = rightMid(nsHeader);
  const sx0 = pr.x - EDGE_INSET;
  const sy0 = pr.y;

  type RowPick = CodespaceSvgPick;
  const rowItems: {
    pick: RowPick;
    label: string;
    skipNsEdge?: boolean;
    indent?: number;
    classKey?: string;
    classParentKey?: string;
  }[] = [];
  const collectClasses = (
    classes: MvCodespaceClassifier[] | undefined,
    rootCi: number,
    ci: number,
    classPath: number[],
    indent: number,
    parentKey?: string,
  ) => {
    const c = classes?.[ci];
    if (!c) return;
    const k = `class:${c.id || `${path.join('.')}:${ci}:${indent}`}`;
    rowItems.push({
      pick: {
        t: 'class',
        mi,
        path,
        ci: rootCi,
        classPath: classPath.length ? classPath : undefined,
      },
      label: lbl.classRow(c.name),
      skipNsEdge: indent > 0 || (c.bases?.length ?? 0) > 0,
      indent,
      classKey: k,
      classParentKey: parentKey,
    });
    for (let i = 0; i < (c.classes?.length ?? 0); i++) {
      collectClasses(c.classes, rootCi, i, [...classPath, i], indent + 1, k);
    }
  };
  for (let ci = 0; ci < (ns.classes?.length ?? 0); ci++) {
    collectClasses(ns.classes, ci, ci, [], 0);
  }
  (ns.variables ?? []).forEach((v, vi) => {
    rowItems.push({ pick: { t: 'var', mi, path, vi }, label: lbl.varRow(v.name) });
  });
  (ns.functions ?? []).forEach((f, fi) => {
    rowItems.push({ pick: { t: 'fn', mi, path, fi }, label: lbl.fnRow(f.name) });
  });
  (ns.macros ?? []).forEach((m, maci) => {
    rowItems.push({ pick: { t: 'macro', mi, path, maci }, label: lbl.macroRow(m.name) });
  });

  const children = ns.namespaces ?? [];
  let col1w = 0;
  for (const it of rowItems) col1w = Math.max(col1w, labelCellW(it.label) + (it.indent ?? 0) * 18);
  for (const ch of children) col1w = Math.max(col1w, nsBlockW(ch.name, lbl));
  if (rowItems.length || children.length) col1w = Math.max(MIN_NS_COL_W, col1w);

  const nL = rowItems.length;
  let leafColH = 0;
  if (nL) leafColH = nL * ROW_H + (nL - 1) * ROW_GAP;

  let sumChildH = 0;
  children.forEach((ch, i) => {
    sumChildH += measureLrSubtree(ch, lbl).h + (i > 0 ? ROW_GAP : 0);
  });
  let stackH = leafColH;
  if (nL && children.length) stackH += ROW_GAP;
  stackH += sumChildH;

  const x1 = x0 + nsW + LR_NS_TO_SIBLING;
  let yc = y0 + (H - stackH) / 2;

  const childOrder = children
    .map((child, origI) => ({ child, origI, span: measureLrSubtree(child, lbl).w }))
    .sort((a, b) => b.span - a.span || a.origI - b.origI);

  const nEdges = rowItems.length + childOrder.length;
  const busXs = busXsInCorridor(sx0, x1, Math.max(1, nEdges));
  let edgeIx = 0;

  const classRectByKey = new Map<string, Rect>();
  for (let i = 0; i < rowItems.length; i++) {
    const it = rowItems[i]!;
    const ind = it.indent ?? 0;
    const r: Rect = { x: x1 + ind * 18, y: yc, w: col1w - ind * 18, h: ROW_H };
    out.push({
      pick: it.pick,
      label: it.label,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
    });
    if (it.classKey) classRectByKey.set(it.classKey, r);
    extendBounds(bounds, r.x, r.y, r.w, r.h);
    if (!it.skipNsEdge) {
      const pl = leftMid(r);
      pushCurvedLREdge(
        edges,
        bounds,
        sx0,
        sy0,
        pl.x + EDGE_INSET,
        pl.y,
        busXs[edgeIx] ?? busXs[0]!,
      );
    }
    edgeIx += 1;
    yc += ROW_H;
    if (i < rowItems.length - 1) yc += ROW_GAP;
  }
  for (const it of rowItems) {
    if (!it.classKey || !it.classParentKey) continue;
    const child = classRectByKey.get(it.classKey);
    const parent = classRectByKey.get(it.classParentKey);
    if (!child || !parent) continue;
    const pr = rightMid(parent);
    const cl = leftMid(child);
    pushCurvedLREdge(
      edges,
      bounds,
      pr.x - EDGE_INSET,
      pr.y,
      cl.x + EDGE_INSET,
      cl.y,
      (pr.x + cl.x) / 2,
    );
  }
  if (nL && children.length) yc += ROW_GAP;

  childOrder.forEach(({ child, origI }, idx) => {
    const pth = [...path, origI];
    const subH = measureLrSubtree(child, lbl).h;
    const { nsHeader: chHead } = layoutNsTreeLR(child, mi, pth, x1, yc, out, bounds, edges, lbl);
    const pl = leftMid(chHead);
    pushCurvedLREdge(
      edges,
      bounds,
      sx0,
      sy0,
      pl.x + EDGE_INSET,
      pl.y,
      busXs[edgeIx] ?? busXs[busXs.length - 1]!,
    );
    edgeIx += 1;
    yc += subH + (idx < childOrder.length - 1 ? ROW_GAP : 0);
  });

  return { w: W, h: H, nsHeader };
}

function layoutModuleStrip(
  m: MvModelCodespaceModule,
  mi: number,
  x0: number,
  y0: number,
  nodesOut: CodespaceLayoutNode[],
  bounds: CodespaceLayoutResult['bounds'],
  edges: CodespaceLayoutEdge[],
  lbl: CodespaceLayoutLabelFns,
): { w: number; h: number } {
  const barW = moduleLeftBarW(m, lbl);
  const innerX = x0 + barW + LR_MODULE_TO_INNER;
  const innerY = y0;
  const roots = m.namespaces ?? [];
  const segment: CodespaceLayoutNode[] = [];

  if (!roots.length) {
    const h = Math.max(ROW_H * 2, 36);
    nodesOut.push({
      pick: { t: 'module', mi },
      label: lbl.moduleNode(m.name),
      x: x0,
      y: y0,
      w: barW,
      h,
    });
    extendBounds(bounds, x0, y0, barW, h);
    return { w: barW, h };
  }

  let yCur = innerY;
  let innerMaxW = 0;
  const rootHeaders: Rect[] = [];
  const rootOrder = roots
    .map((ns, origI) => ({ ns, origI, span: measureLrSubtree(ns, lbl).w }))
    .sort((a, b) => b.span - a.span || a.origI - b.origI);
  rootOrder.forEach(({ ns, origI }) => {
    const { w: cw, h: ch, nsHeader } = layoutNsTreeLR(ns, mi, [origI], innerX, yCur, segment, bounds, edges, lbl);
    rootHeaders.push(nsHeader);
    innerMaxW = Math.max(innerMaxW, cw);
    yCur += ch + NS_COL_GAP;
  });
  yCur -= NS_COL_GAP;

  const innerW = innerMaxW;
  const totalH = yCur - innerY;
  const totalW = barW + LR_MODULE_TO_INNER + Math.max(innerW, 0);

  const modRect: Rect = { x: x0, y: y0, w: barW, h: totalH };
  const mrm = { x: modRect.x + modRect.w, y: midY(modRect) };
  const sxMod = mrm.x - EDGE_INSET;
  const xCorridorR = Math.max(sxMod + 8, innerX - 5);
  const nRoots = rootHeaders.length;
  const rootBuses = busXsInCorridor(sxMod, xCorridorR, Math.max(1, nRoots));
  rootHeaders.forEach((nh, ri) => {
    const t = leftMid(nh);
    pushCurvedLREdge(
      edges,
      bounds,
      sxMod,
      mrm.y,
      t.x + EDGE_INSET,
      t.y,
      rootBuses[ri] ?? rootBuses[0]!,
    );
  });

  nodesOut.push({
    pick: { t: 'module', mi },
    label: lbl.moduleNode(m.name),
    x: modRect.x,
    y: modRect.y,
    w: modRect.w,
    h: modRect.h,
  });
  extendBounds(bounds, modRect.x, modRect.y, modRect.w, modRect.h);
  nodesOut.push(...segment);

  return { w: totalW, h: totalH };
}

function getNamespaceAtPath(
  payload: MvModelCodespacePayload,
  mi: number,
  path: number[],
): MvCodespaceNamespaceNode | null {
  const mod = payload.modules?.[mi];
  if (!mod) return null;
  let nodes = mod.namespaces ?? [];
  let cur: MvCodespaceNamespaceNode | undefined;
  for (const idx of path) {
    cur = nodes[idx];
    if (!cur) return null;
    nodes = cur.namespaces ?? [];
  }
  return cur ?? null;
}

function getClassAtPick(
  payload: MvModelCodespacePayload,
  pick: Extract<CodespaceSvgPick, { t: 'class' }>,
): MvCodespaceClassifier | null {
  const ns = getNamespaceAtPath(payload, pick.mi, pick.path);
  let cur = ns?.classes?.[pick.ci];
  for (const idx of pick.classPath ?? []) {
    cur = cur?.classes?.[idx];
  }
  return cur ?? null;
}

function appendClassInheritanceEdges(
  payload: MvModelCodespacePayload,
  nodes: CodespaceLayoutNode[],
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
): void {
  const classNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'class' }> } => n.pick.t === 'class');
  const nodeByClassId = new Map<string, CodespaceLayoutNode>();
  for (const n of classNodes) {
    const c = getClassAtPick(payload, n.pick);
    if (c?.id) nodeByClassId.set(c.id, n);
  }
  for (const childNode of classNodes) {
    const child = getClassAtPick(payload, childNode.pick);
    if (!child) continue;
    for (const b of child.bases ?? []) {
      const parentNode = nodeByClassId.get(b.targetId);
      if (!parentNode) continue;
      const p = rightMid({ x: parentNode.x, y: parentNode.y, w: parentNode.w, h: parentNode.h });
      const c = leftMid({ x: childNode.x, y: childNode.y, w: childNode.w, h: childNode.h });
      pushCurvedAnyDirEdge(
        edges,
        bounds,
        p.x - EDGE_INSET,
        p.y,
        c.x + EDGE_INSET,
        c.y,
      );
    }
  }
}

function enforceDerivedClassesOnRight(
  payload: MvModelCodespacePayload,
  nodes: CodespaceLayoutNode[],
): void {
  const classNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'class' }> } => n.pick.t === 'class');
  const nodeByClassId = new Map<string, CodespaceLayoutNode>();
  for (const n of classNodes) {
    const c = getClassAtPick(payload, n.pick);
    if (c?.id) nodeByClassId.set(c.id, n);
  }
  const gap = 34;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const childNode of classNodes) {
      const child = getClassAtPick(payload, childNode.pick);
      if (!child) continue;
      let minX = childNode.x;
      for (const b of child.bases ?? []) {
        const parentNode = nodeByClassId.get(b.targetId);
        if (!parentNode) continue;
        minX = Math.max(minX, parentNode.x + parentNode.w + gap);
      }
      if (minX > childNode.x) {
        childNode.x = minX;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/** 将 codespace payload 排版为平面节点 + 树状贝塞尔连线（世界坐标） */
export function layoutCodespaceSvg(
  payload: MvModelCodespacePayload,
  labels: CodespaceLayoutLabelFns,
): CodespaceLayoutResult {
  const modules = payload.modules ?? [];
  const nodesOut: CodespaceLayoutNode[] = [];
  const edgesOut: CodespaceLayoutEdge[] = [];
  const bounds = { minX: PAD, minY: PAD, maxX: PAD, maxY: PAD };

  if (!modules.length) {
    return { nodes: [], edges: [], bounds: emptyBounds() };
  }

  let cursorY = PAD;
  let maxW = 0;
  modules.forEach((m, mi) => {
    const { w, h } = layoutModuleStrip(m, mi, PAD, cursorY, nodesOut, bounds, edgesOut, labels);
    maxW = Math.max(maxW, w);
    cursorY += h + MODULE_GAP;
  });
  enforceDerivedClassesOnRight(payload, nodesOut);
  appendClassInheritanceEdges(payload, nodesOut, edgesOut, bounds);
  bounds.maxX = Math.max(bounds.maxX, PAD + maxW + PAD);
  bounds.maxY = Math.max(bounds.maxY, cursorY - MODULE_GAP + PAD);

  return { nodes: nodesOut, edges: edgesOut, bounds };
}
