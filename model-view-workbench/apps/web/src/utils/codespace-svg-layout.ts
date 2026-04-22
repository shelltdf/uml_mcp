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
  | { t: 'enum'; mi: number; path: number[]; eni: number; ci?: number; classPath?: number[] }
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
  kind?: 'tree' | 'inheritance' | 'containment';
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
  enumRow: (name: string) => string;
  varRow: (name: string) => string;
  fnRow: (name: string) => string;
  macroRow: (name: string) => string;
  moduleNode: (name: string) => string;
  moduleFallback: (mi: number) => string;
}

const PAD = 10;
const ROW_H = 20;
/**
 * 同级节点竖向间距（成员行之间、子命名空间栈之间、模块内根 NS 栈、`enforceSiblingNamespaceSeparation` 等统一使用）。
 */
const ROW_GAP = 8;
const CELL_GAP = 3;
/** 模块与模块之间的竖向间距（大块分区，可略大于同级 ROW_GAP） */
const MODULE_GAP = 12;
/** 命名空间块右侧与子命名空间递归列之间的水平空隙（仅参与宽度测量，非竖向兄弟距） */
const LR_NS_CHILDSubtree_PAD = 5;
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
  edges.push({ d, kind: 'tree' });
}

function pushOrthContainmentEdge(
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): void {
  const midX = tx - 10;
  extendPoint(bounds, sx, sy);
  extendPoint(bounds, midX, sy);
  extendPoint(bounds, midX, ty);
  extendPoint(bounds, tx, ty);
  edges.push({ d: `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`, kind: 'containment' });
}

function pushCurvedContainmentEdge(
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): void {
  if (Math.hypot(tx - sx, ty - sy) < 0.25) return;
  const dir = tx >= sx ? 1 : -1;
  const dx = Math.max(8, Math.abs(tx - sx));
  const armOut = Math.max(10, Math.min(34, dx * 0.33));
  const armIn = Math.max(10, Math.min(34, dx * 0.33));
  const c1x = sx + dir * armOut;
  const c2x = tx - dir * armIn;
  const c1y = sy;
  const c2y = ty;
  extendPoint(bounds, sx, sy);
  extendPoint(bounds, c1x, c1y);
  extendPoint(bounds, c2x, c2y);
  extendPoint(bounds, tx, ty);
  edges.push({ d: `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}`, kind: 'containment' });
}

function pushTreeEdgeSimple(
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): void {
  if (Math.hypot(tx - sx, ty - sy) < 0.25) return;
  const dir = tx >= sx ? 1 : -1;
  const dx = Math.max(8, Math.abs(tx - sx));
  // 脑图式平滑曲线：水平出线 + 柔和收束到目标。
  const armOut = Math.max(10, Math.min(40, dx * 0.35));
  const armIn = Math.max(10, Math.min(40, dx * 0.35));
  const c1x = sx + dir * armOut;
  const c2x = tx - dir * armIn;
  const c1y = sy;
  const c2y = ty;
  extendPoint(bounds, sx, sy);
  extendPoint(bounds, c1x, c1y);
  extendPoint(bounds, c2x, c2y);
  extendPoint(bounds, tx, ty);
  edges.push({ d: `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}`, kind: 'tree' });
}

/** 从左到右树：子树外包宽高（与 `layoutNsTreeLR` 一致；同级叶与子 NS 头共一列宽 `col1w`） */
function measureLrSubtree(ns: MvCodespaceNamespaceNode, lbl: CodespaceLayoutLabelFns): { w: number; h: number } {
  const nsW = nsBlockW(ns.name, lbl);
  const children = ns.namespaces ?? [];

  const leafLabels: string[] = [];
  (ns.classes ?? []).forEach((c) => leafLabels.push(lbl.classRow(c.name)));
  (ns.enums ?? []).forEach((e) => leafLabels.push(lbl.enumRow(e.name)));
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

  const rightExtra = children.length > 0 ? LR_NS_CHILDSubtree_PAD + maxChildW : 0;
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
 * 从左到右树：NS 在左；同级叶与子 NS 根在 **同一竖列**（等宽 `col1w`）。
 * 占行高的成员（`!floating`）按序 **半数在 NS 标题之上、半数在之下**，标题大致处于同级内容的垂直中部（floating 行仍贴附其前一条占行记录，如类内枚举）。
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

  type RowPick = CodespaceSvgPick;
  const rowItems: {
    pick: RowPick;
    label: string;
    skipNsEdge?: boolean;
    indent?: number;
    floating?: boolean;
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
    rowItems.push({
      pick: {
        t: 'class',
        mi,
        path,
        ci: rootCi,
        classPath: classPath.length ? classPath : undefined,
      },
      label: lbl.classRow(c.name),
      // 顶层 class 始终保留 namespace 树线；内部类仅用 containment 线。
      skipNsEdge: indent > 0,
      indent,
      // 内部类不占用主树行高，后续由内部簇布局统一摆位。
      floating: indent > 0,
    });
    (c.enums ?? [])
      .map((x, i) => ({ x, i }))
      .sort((a, b) => (a.x.name ?? '').localeCompare(b.x.name ?? '', undefined, { sensitivity: 'base' }))
      .forEach(({ x, i }) => {
        rowItems.push({
          pick: {
            t: 'enum',
            mi,
            path,
            ci: rootCi,
            classPath: classPath.length ? classPath : undefined,
            eni: i,
          },
          label: lbl.enumRow(x.name),
          skipNsEdge: true,
          indent: indent + 1,
          // 内部枚举不占用主树行高，后续由内部簇布局统一摆位。
          floating: true,
        });
      });
    const nestedIndexed = (c.classes ?? [])
      .map((x, i) => ({ x, i }))
      .sort((a, b) => (a.x.name ?? '').localeCompare(b.x.name ?? '', undefined, { sensitivity: 'base' }));
    for (const it of nestedIndexed) {
      collectClasses(c.classes, rootCi, it.i, [...classPath, it.i], indent + 1);
    }
  };
  const rootClassesIndexed = (ns.classes ?? [])
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (a.x.name ?? '').localeCompare(b.x.name ?? '', undefined, { sensitivity: 'base' }));
  for (const it of rootClassesIndexed) {
    collectClasses(ns.classes, it.i, it.i, [], 0);
  }
  (ns.variables ?? [])
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (a.x.name ?? '').localeCompare(b.x.name ?? '', undefined, { sensitivity: 'base' }))
    .forEach(({ x, i }) => {
      rowItems.push({ pick: { t: 'var', mi, path, vi: i }, label: lbl.varRow(x.name) });
    });
  (ns.enums ?? [])
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (a.x.name ?? '').localeCompare(b.x.name ?? '', undefined, { sensitivity: 'base' }))
    .forEach(({ x, i }) => {
      rowItems.push({ pick: { t: 'enum', mi, path, eni: i }, label: lbl.enumRow(x.name) });
    });
  (ns.functions ?? [])
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (a.x.name ?? '').localeCompare(b.x.name ?? '', undefined, { sensitivity: 'base' }))
    .forEach(({ x, i }) => {
      rowItems.push({ pick: { t: 'fn', mi, path, fi: i }, label: lbl.fnRow(x.name) });
    });
  (ns.macros ?? [])
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (a.x.name ?? '').localeCompare(b.x.name ?? '', undefined, { sensitivity: 'base' }))
    .forEach(({ x, i }) => {
      rowItems.push({ pick: { t: 'macro', mi, path, maci: i }, label: lbl.macroRow(x.name) });
    });

  const children = ns.namespaces ?? [];
  let col1w = 0;
  for (const it of rowItems) col1w = Math.max(col1w, labelCellW(it.label) + (it.indent ?? 0) * 18);
  for (const ch of children) col1w = Math.max(col1w, nsBlockW(ch.name, lbl));
  if (rowItems.length || children.length) col1w = Math.max(MIN_NS_COL_W, col1w);

  const nL = rowItems.length;
  /** 占垂直槽位的行（floating 仅占其锚点同行的几何位置） */
  const nfIndices = rowItems.map((it, i) => (!it.floating ? i : -1)).filter((v): v is number => v >= 0);
  const nAbove = Math.floor(nfIndices.length / 2);
  const aboveH =
    nAbove > 0 ? nAbove * ROW_H + (nAbove - 1) * ROW_GAP : 0;
  let ny: number;
  if (nfIndices.length === 0) {
    ny = y0;
  } else if (nAbove === 0) {
    ny = y0;
  } else {
    ny = y0 + aboveH + ROW_GAP;
  }

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

  const yForIndex: number[] = new Array(rowItems.length).fill(NaN);
  for (let k = 0; k < nfIndices.length; k++) {
    const i = nfIndices[k]!;
    if (k < nAbove) {
      yForIndex[i] = y0 + k * (ROW_H + ROW_GAP);
    } else {
      const bi = k - nAbove;
      yForIndex[i] = ny + ROW_H + ROW_GAP + bi * (ROW_H + ROW_GAP);
    }
  }

  const childOrder = children
    .map((child, origI) => ({ child, origI, span: measureLrSubtree(child, lbl).w }))
    .sort((a, b) => (a.child.name ?? '').localeCompare(b.child.name ?? '', undefined, { sensitivity: 'base' }));

  const nEdges = rowItems.length + childOrder.length;
  const busXs = busXsInCorridor(sx0, x1, Math.max(1, nEdges));
  let edgeIx = 0;

  let lastNf = -1;
  let maxRowBottom = ny + ROW_H;
  const fallbackY = ny + ROW_H + ROW_GAP;

  for (let i = 0; i < rowItems.length; i++) {
    const it = rowItems[i]!;
    const ind = it.indent ?? 0;
    let rowY: number;
    if (!it.floating) {
      rowY = yForIndex[i]!;
      lastNf = i;
    } else {
      rowY = lastNf >= 0 ? yForIndex[lastNf]! : fallbackY;
    }
    const r: Rect = { x: x1 + ind * 18, y: rowY, w: col1w - ind * 18, h: ROW_H };
    out.push({
      pick: it.pick,
      label: it.label,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
    });
    extendBounds(bounds, r.x, r.y, r.w, r.h);
    maxRowBottom = Math.max(maxRowBottom, rowY + ROW_H);
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
  }

  let yc = maxRowBottom;
  if (nL && children.length) yc += ROW_GAP;

  childOrder.forEach(({ child, origI }, idx) => {
    const pth = [...path, origI];
    const subH = measureLrSubtree(child, lbl).h;
    const startIdx = out.length;
    const { nsHeader: chHead } = layoutNsTreeLR(child, mi, pth, x1, yc, out, bounds, edges, lbl);
    // 约束：子命名空间整棵子树不得越过其分配带起点（避免“跑到上一个空间里”）。
    let minSubY = Number.POSITIVE_INFINITY;
    for (let i = startIdx; i < out.length; i++) {
      minSubY = Math.min(minSubY, out[i]!.y);
    }
    if (Number.isFinite(minSubY) && minSubY < yc) {
      const dy = yc - minSubY;
      for (let i = startIdx; i < out.length; i++) out[i]!.y += dy;
      chHead.y += dy;
    }
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
    .sort((a, b) => (a.ns.name ?? '').localeCompare(b.ns.name ?? '', undefined, { sensitivity: 'base' }));
  rootOrder.forEach(({ ns, origI }) => {
    const { w: cw, h: ch, nsHeader } = layoutNsTreeLR(ns, mi, [origI], innerX, yCur, segment, bounds, edges, lbl);
    rootHeaders.push(nsHeader);
    innerMaxW = Math.max(innerMaxW, cw);
    yCur += ch + ROW_GAP;
  });
  yCur -= ROW_GAP;

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

function resolveClassNodeOverlaps(nodes: CodespaceLayoutNode[]): void {
  const classNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'class' }> } => n.pick.t === 'class');
  const groups = new Map<string, CodespaceLayoutNode[]>();
  for (const n of classNodes) {
    const k = `${n.pick.mi}|${n.pick.path.join('.')}`;
    const arr = groups.get(k) ?? [];
    arr.push(n);
    groups.set(k, arr);
  }
  const pad = 8;
  for (const groupNodes of groups.values()) {
    for (let iter = 0; iter < 6; iter++) {
      let moved = false;
      for (let i = 0; i < groupNodes.length; i++) {
        for (let j = i + 1; j < groupNodes.length; j++) {
          const a = groupNodes[i]!;
          const b = groupNodes[j]!;
          const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (overlapX > 0 && overlapY > 0) {
            if (a.y <= b.y) b.y += overlapY + pad;
            else a.y += overlapY + pad;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }
}

function classPickKey(p: Extract<CodespaceSvgPick, { t: 'class' }>): string {
  return `${p.mi}|${p.path.join('.')}|${p.ci}|${(p.classPath ?? []).join('.')}`;
}

function enforceNestedClassClusterLayout(nodes: CodespaceLayoutNode[]): void {
  const classNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'class' }> } => n.pick.t === 'class');
  const classEnumNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'enum' }> } => n.pick.t === 'enum' && n.pick.ci !== undefined);
  const byKey = new Map<string, CodespaceLayoutNode>();
  for (const n of classNodes) byKey.set(classPickKey(n.pick), n);
  const childMap = new Map<string, CodespaceLayoutNode[]>();
  const enumMap = new Map<string, CodespaceLayoutNode[]>();
  for (const n of classNodes) {
    const cp = n.pick.classPath ?? [];
    if (!cp.length) continue;
    const parentKey = classPickKey({
      t: 'class',
      mi: n.pick.mi,
      path: n.pick.path,
      ci: n.pick.ci,
      classPath: cp.slice(0, -1),
    });
    const arr = childMap.get(parentKey) ?? [];
    arr.push(n);
    childMap.set(parentKey, arr);
  }
  for (const en of classEnumNodes) {
    const parentKey = classPickKey({
      t: 'class',
      mi: en.pick.mi,
      path: en.pick.path,
      ci: en.pick.ci as number,
      classPath: en.pick.classPath,
    });
    const arr = enumMap.get(parentKey) ?? [];
    arr.push(en);
    enumMap.set(parentKey, arr);
  }
  const shiftX = 22;
  const rowGap = 8;
  const clusterGap = 10;
  /** 类簇底边：须含右侧嵌套类与「类上枚举」（enumMap），否则低估高度，下一顶层类不会被 minTop 顶开，后面 resolveNodeOverlaps 再硬推会产生大块竖向空白。 */
  const measureClusterBottom = (root: CodespaceLayoutNode): number => {
    let bottom = root.y + root.h;
    const walk = (parent: CodespaceLayoutNode) => {
      const pKey = classPickKey(parent.pick as Extract<CodespaceSvgPick, { t: 'class' }>);
      const kids = childMap.get(pKey) ?? [];
      const enumKids = enumMap.get(pKey) ?? [];
      for (const k of kids) {
        bottom = Math.max(bottom, k.y + k.h);
        walk(k);
      }
      for (const e of enumKids) {
        bottom = Math.max(bottom, e.y + e.h);
      }
    };
    walk(root);
    return bottom;
  };
  const stackChildren = (parent: CodespaceLayoutNode) => {
    const pKey = classPickKey(parent.pick as Extract<CodespaceSvgPick, { t: 'class' }>);
    const classKids = childMap.get(pKey) ?? [];
    const enumKids = enumMap.get(pKey) ?? [];
    const classSorted = [...classKids].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    const enumSorted = [...enumKids].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    const kids = [...classSorted, ...enumSorted];
    if (!kids.length) return;
    const totalH = kids.reduce((acc, k, i) => acc + k.h + (i > 0 ? rowGap : 0), 0);
    let y = parent.y + (parent.h - totalH) / 2;
    for (const k of kids) {
      k.x = Math.max(parent.x + parent.w + shiftX, parent.x + shiftX);
      k.y = y;
      y = k.y + k.h + rowGap;
      if (k.pick.t === 'class') stackChildren(k);
    }
  };
  const roots = classNodes
    .filter((n) => (n.pick.classPath?.length ?? 0) === 0)
    .sort((a, b) => a.y - b.y);
  for (let i = 0; i < roots.length; i++) {
    const r = roots[i]!;
    stackChildren(r);
    if (i >= roots.length - 1) continue;
    const bottom = measureClusterBottom(r);
    const next = roots[i + 1]!;
    const minTop = bottom + clusterGap;
    if (next.y < minTop) next.y = minTop;
  }
}

function resolveNodeOverlaps(nodes: CodespaceLayoutNode[]): void {
  const movable = nodes.filter((n) => n.pick.t !== 'module');
  const pad = 6;
  const minOverlapX = 24;
  const parentBandKey = (n: CodespaceLayoutNode): string => {
    const p = n.pick;
    if (p.t === 'module') return `m:${p.mi}`;
    if (p.t === 'ns') {
      const parent = p.path.slice(0, -1).join('.');
      return `ns:${p.mi}:${parent}`;
    }
    if (p.t === 'class') {
      const cp = p.classPath ?? [];
      // 顶层类按命名空间分带；内部类按其直接父类分带。
      if (!cp.length) return `leaf:${p.mi}:${p.path.join('.')}`;
      return `inner:${p.mi}:${p.path.join('.')}:${p.ci}:${cp.slice(0, -1).join('.')}`;
    }
    if (p.t === 'enum') {
      if (p.ci === undefined) return `leaf:${p.mi}:${p.path.join('.')}`;
      const cp = p.classPath ?? [];
      return `inner:${p.mi}:${p.path.join('.')}:${p.ci}:${cp.join('.')}`;
    }
    // var / fn / macro 均限制在所属 namespace 分带内
    return `leaf:${p.mi}:${p.path.join('.')}`;
  };
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < movable.length; i++) {
      for (let j = i + 1; j < movable.length; j++) {
        const a = movable[i]!;
        const b = movable[j]!;
        if (a.pick.mi !== b.pick.mi) continue;
        if (parentBandKey(a) !== parentBandKey(b)) continue;
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlapX > minOverlapX && overlapY > 0) {
          if (a.y <= b.y) b.y += overlapY + pad;
          else a.y += overlapY + pad;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

function repackModulesVertically(nodes: CodespaceLayoutNode[]): void {
  const moduleNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'module' }> } => n.pick.t === 'module');
  if (!moduleNodes.length) return;
  const groups = moduleNodes
    .map((m) => {
      const members = nodes.filter((n) => n.pick.t !== 'module' && 'mi' in n.pick && n.pick.mi === m.pick.mi);
      let minY = m.y;
      let maxY = m.y + m.h;
      for (const n of members) {
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y + n.h);
      }
      return { mi: m.pick.mi, module: m, members, minY, maxY };
    })
    .sort((a, b) => a.module.y - b.module.y);

  let prevBottom = Number.NEGATIVE_INFINITY;
  for (const g of groups) {
    const desiredTop = prevBottom === Number.NEGATIVE_INFINITY ? g.minY : prevBottom + MODULE_GAP;
    if (g.minY < desiredTop) {
      const dy = desiredTop - g.minY;
      g.module.y += dy;
      for (const n of g.members) n.y += dy;
      g.minY += dy;
      g.maxY += dy;
    }
    // 模块竖条始终包住其所有子节点，避免“子节点跑出模块框”。
    g.module.y = Math.min(g.module.y, g.minY);
    g.module.h = Math.max(ROW_H, g.maxY - g.module.y);
    prevBottom = g.module.y + g.module.h;
  }
}

function pathStartsWith(path: number[], prefix: number[]): boolean {
  if (prefix.length > path.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) return false;
  }
  return true;
}

function pathsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * 某命名空间下「内容列」的竖向外包（不含该 NS 自身标题行；含成员行、子 NS 整棵子树、类内嵌套节点等）。
 * 用于将父 NS 标题在竖向上对齐到子内容整体中心。
 */
function boundsOfNamespaceContent(
  nodes: CodespaceLayoutNode[],
  mi: number,
  nsPath: number[],
): { minY: number; maxY: number } | null {
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let any = false;
  for (const n of nodes) {
    if (n.pick.t === 'module') continue;
    if (n.pick.mi !== mi) continue;
    const p = n.pick.path;
    if (p.length < nsPath.length) continue;
    if (!nsPath.every((v, i) => p[i] === v)) continue;
    if (n.pick.t === 'ns' && pathsEqual(p, nsPath)) continue;
    any = true;
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + n.h);
  }
  if (!any || !Number.isFinite(minY) || !Number.isFinite(maxY)) return null;
  return { minY, maxY };
}

function shiftSubtree(nodes: CodespaceLayoutNode[], mi: number, nsPath: number[], dy: number): void {
  if (Math.abs(dy) < 0.01) return;
  for (const n of nodes) {
    if (n.pick.t === 'module') continue;
    if (n.pick.mi !== mi) continue;
    if (pathStartsWith(n.pick.path, nsPath)) n.y += dy;
  }
}

function subtreeBounds(nodes: CodespaceLayoutNode[], mi: number, nsPath: number[]): { minY: number; maxY: number } {
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const n of nodes) {
    if (n.pick.t === 'module') continue;
    if (n.pick.mi !== mi) continue;
    if (!pathStartsWith(n.pick.path, nsPath)) continue;
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + n.h);
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return { minY: 0, maxY: 0 };
  return { minY, maxY };
}

function enforceSiblingNamespaceSeparation(nodes: CodespaceLayoutNode[]): void {
  const nsNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'ns' }> } => n.pick.t === 'ns');
  const group = new Map<string, Array<CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'ns' }> }>>();
  for (const n of nsNodes) {
    const parent = n.pick.path.slice(0, -1).join('.');
    const key = `${n.pick.mi}|${parent}`;
    const arr = group.get(key) ?? [];
    arr.push(n);
    group.set(key, arr);
  }
  for (const siblings of group.values()) {
    const ordered = [...siblings].sort((a, b) => a.y - b.y);
    let prevBottom = Number.NEGATIVE_INFINITY;
    for (const n of ordered) {
      const b = subtreeBounds(nodes, n.pick.mi, n.pick.path);
      const desiredTop = prevBottom === Number.NEGATIVE_INFINITY ? b.minY : prevBottom + ROW_GAP;
      if (b.minY < desiredTop) {
        const dy = desiredTop - b.minY;
        shiftSubtree(nodes, n.pick.mi, n.pick.path, dy);
        n.y += dy;
        prevBottom = b.maxY + dy;
      }
      else {
        prevBottom = b.maxY;
      }
    }
  }
}

/**
 * 将各 NS 标题行的竖向位置对齐到「该命名空间内容列」外包矩形的垂直中心。
 * 只改 NS 节点自身的 `y`，不移动成员/子树（连线在后续按最终坐标重绘）。
 * 内容外包含子命名空间整棵子树与类簇，避免仅用直接子一行框导致标题偏上/偏下。
 */
function centerParentsOnChildren(nodes: CodespaceLayoutNode[]): void {
  const nsNodes = nodes.filter(
    (n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'ns' }> } => n.pick.t === 'ns',
  );
  for (const ns of nsNodes.sort((a, b) => b.pick.path.length - a.pick.path.length)) {
    const b = boundsOfNamespaceContent(nodes, ns.pick.mi, ns.pick.path);
    if (!b) continue;
    const span = b.maxY - b.minY;
    if (span < ns.h - 0.01) continue;
    const targetY = (b.minY + b.maxY - ns.h) / 2;
    if (Math.abs(targetY - ns.y) >= 0.01) ns.y = targetY;
  }
}

function nsPickKey(p: Extract<CodespaceSvgPick, { t: 'ns' }>): string {
  return `${p.mi}|${p.path.join('.')}`;
}

function modulePickKey(p: Extract<CodespaceSvgPick, { t: 'module' }>): string {
  return String(p.mi);
}

function appendTreeEdgesFromFinalNodes(
  nodes: CodespaceLayoutNode[],
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
): void {
  const moduleNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'module' }> } => n.pick.t === 'module');
  const nsNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'ns' }> } => n.pick.t === 'ns');
  const classTopNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'class' }> } => n.pick.t === 'class' && (n.pick.classPath?.length ?? 0) === 0);
  const varNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'var' }> } => n.pick.t === 'var');
  const enumNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'enum' }> } => n.pick.t === 'enum');
  const fnNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'fn' }> } => n.pick.t === 'fn');
  const macroNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'macro' }> } => n.pick.t === 'macro');

  const modByMi = new Map<string, CodespaceLayoutNode>();
  for (const m of moduleNodes) modByMi.set(modulePickKey(m.pick), m);
  const nsByKey = new Map<string, CodespaceLayoutNode>();
  for (const n of nsNodes) nsByKey.set(nsPickKey(n.pick), n);

  // module -> root namespaces
  for (const ns of nsNodes) {
    if (ns.pick.path.length !== 1) continue;
    const mod = modByMi.get(String(ns.pick.mi));
    if (!mod) continue;
    const s = rightMid({ x: mod.x, y: mod.y, w: mod.w, h: mod.h });
    const t = leftMid({ x: ns.x, y: ns.y, w: ns.w, h: ns.h });
    const sy = Math.max(mod.y + EDGE_INSET + 1, Math.min(mod.y + mod.h - EDGE_INSET - 1, t.y));
    pushTreeEdgeSimple(edges, bounds, s.x - EDGE_INSET, sy, t.x + EDGE_INSET, t.y);
  }

  // namespace -> direct children (ns/class/enum/var/fn/macro)
  for (const ns of nsNodes) {
    const p = ns.pick.path;
    const directNs = nsNodes.filter((x) => x.pick.mi === ns.pick.mi && x.pick.path.length === p.length + 1 && x.pick.path.slice(0, p.length).every((v, i) => v === p[i]));
    const directClass = classTopNodes.filter((x) => x.pick.mi === ns.pick.mi && x.pick.path.length === p.length && x.pick.path.every((v, i) => v === p[i]));
    const directEnums = enumNodes.filter((x) => x.pick.mi === ns.pick.mi && x.pick.ci === undefined && x.pick.path.length === p.length && x.pick.path.every((v, i) => v === p[i]));
    const directVars = varNodes.filter((x) => x.pick.mi === ns.pick.mi && x.pick.path.length === p.length && x.pick.path.every((v, i) => v === p[i]));
    const directFns = fnNodes.filter((x) => x.pick.mi === ns.pick.mi && x.pick.path.length === p.length && x.pick.path.every((v, i) => v === p[i]));
    const directMacros = macroNodes.filter((x) => x.pick.mi === ns.pick.mi && x.pick.path.length === p.length && x.pick.path.every((v, i) => v === p[i]));
    const targets = [...directNs, ...directClass, ...directEnums, ...directVars, ...directFns, ...directMacros].sort((a, b) => a.y - b.y);
    const s = rightMid({ x: ns.x, y: ns.y, w: ns.w, h: ns.h });
    for (const tNode of targets) {
      const t = leftMid({ x: tNode.x, y: tNode.y, w: tNode.w, h: tNode.h });
      pushTreeEdgeSimple(edges, bounds, s.x - EDGE_INSET, s.y, t.x + EDGE_INSET, t.y);
    }
  }
}

function enumPickKey(p: Extract<CodespaceSvgPick, { t: 'enum' }>): string {
  return `${p.mi}|${p.path.join('.')}|${p.ci ?? -1}|${(p.classPath ?? []).join('.')}|${p.eni}`;
}

function appendClassEnumContainmentEdges(
  nodes: CodespaceLayoutNode[],
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
): void {
  const classNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'class' }> } => n.pick.t === 'class');
  const enumNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'enum' }> } => n.pick.t === 'enum' && n.pick.ci !== undefined);
  if (!enumNodes.length) return;
  const byClassKey = new Map<string, CodespaceLayoutNode>();
  for (const n of classNodes) byClassKey.set(classPickKey(n.pick), n);
  const handled = new Set<string>();
  for (const en of enumNodes) {
    const parentPick: Extract<CodespaceSvgPick, { t: 'class' }> = {
      t: 'class',
      mi: en.pick.mi,
      path: en.pick.path,
      ci: en.pick.ci as number,
      classPath: en.pick.classPath,
    };
    const parent = byClassKey.get(classPickKey(parentPick));
    if (!parent) continue;
    const k = `${classPickKey(parentPick)}=>${enumPickKey(en.pick)}`;
    if (handled.has(k)) continue;
    handled.add(k);
    const pr = rightMid({ x: parent.x, y: parent.y, w: parent.w, h: parent.h });
    const el = leftMid({ x: en.x, y: en.y, w: en.w, h: en.h });
    pushCurvedContainmentEdge(
      edges,
      bounds,
      pr.x - EDGE_INSET,
      pr.y,
      el.x + EDGE_INSET,
      el.y,
    );
  }
}

function appendNestedClassContainmentEdges(
  nodes: CodespaceLayoutNode[],
  edges: CodespaceLayoutEdge[],
  bounds: CodespaceLayoutResult['bounds'],
): void {
  const classNodes = nodes.filter((n): n is CodespaceLayoutNode & { pick: Extract<CodespaceSvgPick, { t: 'class' }> } => n.pick.t === 'class');
  const byKey = new Map<string, CodespaceLayoutNode>();
  for (const n of classNodes) byKey.set(classPickKey(n.pick), n);
  for (const child of classNodes) {
    const cp = child.pick.classPath ?? [];
    if (!cp.length) continue;
    const parentPick: Extract<CodespaceSvgPick, { t: 'class' }> = {
      t: 'class',
      mi: child.pick.mi,
      path: child.pick.path,
      ci: child.pick.ci,
      classPath: cp.slice(0, -1),
    };
    const parent = byKey.get(classPickKey(parentPick));
    if (!parent) continue;
    const pr = rightMid({ x: parent.x, y: parent.y, w: parent.w, h: parent.h });
    const cl = leftMid({ x: child.x, y: child.y, w: child.w, h: child.h });
    pushCurvedContainmentEdge(
      edges,
      bounds,
      pr.x - EDGE_INSET,
      pr.y,
      cl.x + EDGE_INSET,
      cl.y,
    );
  }
}

function recomputeBounds(
  nodes: CodespaceLayoutNode[],
  edges: CodespaceLayoutEdge[],
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!nodes.length && !edges.length) return emptyBounds();
  const b = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
  for (const n of nodes) {
    b.minX = Math.min(b.minX, n.x);
    b.minY = Math.min(b.minY, n.y);
    b.maxX = Math.max(b.maxX, n.x + n.w);
    b.maxY = Math.max(b.maxY, n.y + n.h);
  }
  for (const e of edges) {
    const nums = e.d.match(/-?\d+(?:\.\d+)?/g);
    if (!nums?.length) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Number(nums[i]);
      const y = Number(nums[i + 1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      b.minX = Math.min(b.minX, x);
      b.minY = Math.min(b.minY, y);
      b.maxX = Math.max(b.maxX, x);
      b.maxY = Math.max(b.maxY, y);
    }
  }
  if (!Number.isFinite(b.minX) || !Number.isFinite(b.minY) || !Number.isFinite(b.maxX) || !Number.isFinite(b.maxY)) {
    return emptyBounds();
  }
  return b;
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
  const modulesOrdered = modules
    .map((m, mi) => ({ m, mi }))
    .sort((a, b) => (a.m.name ?? '').localeCompare(b.m.name ?? '', undefined, { sensitivity: 'base' }));
  modulesOrdered.forEach(({ m, mi }) => {
    const { w, h } = layoutModuleStrip(m, mi, PAD, cursorY, nodesOut, bounds, edgesOut, labels);
    maxW = Math.max(maxW, w);
    cursorY += h + MODULE_GAP;
  });
  /** 不按 bases 把类推到右侧：模块树画布不表达继承，推远后会产生「单列成员 + 孤立类」与冗长连线 */
  enforceNestedClassClusterLayout(nodesOut);
  resolveClassNodeOverlaps(nodesOut);
  enforceNestedClassClusterLayout(nodesOut);
  resolveNodeOverlaps(nodesOut);
  enforceNestedClassClusterLayout(nodesOut);
  /** 类簇会改动类/枚举的 y，须在「同级 NS 竖向留白」之前重算兄弟子树边界 */
  enforceSiblingNamespaceSeparation(nodesOut);
  repackModulesVertically(nodesOut);
  /** repack / 类簇 之后同一命名空间下列可能再次重叠，最后再压一遍 */
  resolveClassNodeOverlaps(nodesOut);
  resolveNodeOverlaps(nodesOut);
  /** 在所有成员与模块条位置稳定后，再把各 NS 标题移到其内容列的竖直中心 */
  centerParentsOnChildren(nodesOut);
  resolveNodeOverlaps(nodesOut);
  /**
   * `centerParentsOnChildren` 只移动 NS 标题行的 y，会破坏先前按子树 bbox 对齐的同级间距；
   * 最后再跑一次兄弟分离，把同一父下的 NS 子树竖向压紧为「上一棵底 + ROW_GAP」。
   */
  enforceSiblingNamespaceSeparation(nodesOut);
  resolveNodeOverlaps(nodesOut);
  // 线在最终坐标上重建，避免后处理后节点与连线错位。
  const finalEdges: CodespaceLayoutEdge[] = [];
  // 仅树线 + 类/枚举嵌套包含；不绘制 UML 泛化/继承、也不表示类间关联（在 uml-class 等视图中表示）
  appendTreeEdgesFromFinalNodes(nodesOut, finalEdges, bounds);
  appendNestedClassContainmentEdges(nodesOut, finalEdges, bounds);
  appendClassEnumContainmentEdges(nodesOut, finalEdges, bounds);
  const finalBounds = recomputeBounds(nodesOut, finalEdges);
  finalBounds.maxX = Math.max(finalBounds.maxX, PAD + maxW + PAD);
  finalBounds.maxY = Math.max(finalBounds.maxY, cursorY - MODULE_GAP + PAD);
  finalBounds.minX = Math.min(finalBounds.minX, PAD);
  finalBounds.minY = Math.min(finalBounds.minY, PAD);
  return { nodes: nodesOut, edges: finalEdges, bounds: finalBounds };
}
