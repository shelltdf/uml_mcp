export type ClassLinkKind = 'inherit' | 'association' | 'dependency';

export interface ClassDef {
  id: string;
  name: string;
  attrs?: string[];
  meth?: string[];
  properties?: string[];
  enumLiterals?: string[];
  abstract?: boolean;
  kind?: 'class' | 'interface' | 'struct';
}

export interface ClassLink {
  id: string;
  from: string;
  to: string;
  kind: ClassLinkKind;
  fromMult?: string;
  toMult?: string;
  /** 关联边来源槽位（仅 association：members/properties），用于同步到 codespace 明确成员/属性。 */
  fromSlotSection?: 'members' | 'properties';
  fromSlotName?: string;
}

export interface ClassDiagramState {
  classes: ClassDef[];
  links: ClassLink[];
}

export type ClassPositions = Record<string, { x: number; y: number }>;

export interface ClassDiagramEdgeVisibility {
  inherit: boolean;
  association: boolean;
}

interface UmlClassPayloadV1 {
  schema?: string;
  diagramType?: string;
  classes?: ClassDef[];
  relations?: ClassLink[];
  layout?: { positions?: ClassPositions; folded?: Record<string, boolean> };
  edgeVisibility?: Partial<ClassDiagramEdgeVisibility>;
}

export function slug(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'class';
}

export function classDiagramHeaderHeight(c: ClassDef): number {
  const kindLine = c.abstract === true || c.kind === 'interface' || c.kind === 'struct' ? 18 : 0;
  return 26 + kindLine;
}

/** 与画布 `classBoxSize` 一致：四段预览区 + 固定宽 248，供 autoLayout / fitAll / diagramBounds 共用 */
const PREVIEW_LINE_HEIGHT = 12;
const PREVIEW_TOP_PAD = 8;
const PREVIEW_BOTTOM_PAD = 8;
const PREVIEW_LABEL_TO_LINES_GAP = 2;
const PREVIEW_SECTION_GAP = 4;
const CLASS_BOX_WIDTH = 248;
const EMPTY_MEMBER_LINE = '-';

type ClassDefCompat = ClassDef & {
  stereotype?: string | null;
  attributes?: string[];
  methods?: string[];
};

function effectiveAttrsForBox(c: ClassDefCompat): string[] {
  const fromAttrs = c.attrs?.length ? c.attrs : undefined;
  if (fromAttrs) return fromAttrs;
  const a = c.attributes;
  return a?.length ? a : [];
}

function effectivePropsForBox(c: ClassDefCompat): string[] {
  return c.properties?.length ? c.properties : [];
}

function effectiveEnumsForBox(c: ClassDefCompat): string[] {
  return c.enumLiterals?.length ? c.enumLiterals : [];
}

function effectiveMethsForBox(c: ClassDefCompat): string[] {
  const fromMeth = c.meth?.length ? c.meth : undefined;
  if (fromMeth) return fromMeth;
  const m = c.methods;
  return m?.length ? m : [];
}

function displayLines(lines: string[]): string[] {
  return lines.length ? lines : [EMPTY_MEMBER_LINE];
}

function previewSectionHeightForBox(lineCount: number): number {
  return PREVIEW_LINE_HEIGHT + PREVIEW_LABEL_TO_LINES_GAP + lineCount * PREVIEW_LINE_HEIGHT + PREVIEW_SECTION_GAP;
}

/** 类图节点外接矩形（世界坐标系），与 UML 画布 SVG 布局一致 */
export function classDiagramClassBoxSize(c: ClassDef): { w: number; h: number } {
  const cc = c as ClassDefCompat;
  const sections = [
    displayLines(effectiveAttrsForBox(cc)),
    displayLines(effectivePropsForBox(cc)),
    displayLines(effectiveEnumsForBox(cc)),
    displayLines(effectiveMethsForBox(cc)),
  ];
  const h =
    classDiagramHeaderHeight(c) +
    PREVIEW_TOP_PAD +
    sections.reduce((sum, lines) => sum + previewSectionHeightForBox(lines.length), 0) +
    PREVIEW_BOTTOM_PAD;
  return { w: CLASS_BOX_WIDTH, h };
}

export function diagramBounds(
  state: ClassDiagramState,
  positions: ClassPositions,
  _folded: Record<string, boolean>,
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!state.classes.length) return { minX: -240, minY: -160, maxX: 240, maxY: 160 };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  /** 子类顶部继承三角略高出类框顶边，fit 时需计入否则纵向仍裁切 */
  const inheritHandleAbove = 16;
  for (const c of state.classes) {
    const p = positions[c.id] ?? { x: 0, y: 0 };
    const { w, h } = classDiagramClassBoxSize(c);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y - inheritHandleAbove);
    maxX = Math.max(maxX, p.x + w);
    maxY = Math.max(maxY, p.y + h);
  }
  return { minX, minY, maxX, maxY };
}

export function parseViewPayloadClassDiagram(payload: string): {
  state: ClassDiagramState;
  positions: ClassPositions;
  folded: Record<string, boolean>;
  edgeVisibility: ClassDiagramEdgeVisibility;
} {
  const empty = {
    state: { classes: [], links: [] } as ClassDiagramState,
    positions: {} as ClassPositions,
    folded: {} as Record<string, boolean>,
    edgeVisibility: { inherit: true, association: true } as ClassDiagramEdgeVisibility,
  };
  const s = (payload ?? '').trim();
  if (!s) return empty;
  try {
    const o = JSON.parse(s) as UmlClassPayloadV1;
    if (o?.schema !== 'mvwb-uml/v1' || o.diagramType !== 'class') return empty;
    return {
      state: {
        classes: Array.isArray(o.classes) ? o.classes : [],
        links: Array.isArray(o.relations) ? o.relations : [],
      },
      positions: o.layout?.positions ?? {},
      folded: o.layout?.folded ?? {},
      edgeVisibility: {
        inherit: o.edgeVisibility?.inherit !== false,
        association: o.edgeVisibility?.association !== false,
      },
    };
  } catch {
    return empty;
  }
}

export function buildClassDiagramViewPayload(
  _prev: string,
  state: ClassDiagramState,
  positions: ClassPositions,
  folded: Record<string, boolean>,
  edgeVisibility: ClassDiagramEdgeVisibility,
): string {
  const next: UmlClassPayloadV1 = {
    schema: 'mvwb-uml/v1',
    diagramType: 'class',
    classes: state.classes,
    relations: state.links,
    layout: { positions, folded },
    edgeVisibility: {
      inherit: edgeVisibility.inherit,
      association: edgeVisibility.association,
    },
  };
  return JSON.stringify(next, null, 2);
}

/** 从类图 JSON 中移除 inherit 边（继承以 mv-model-codespace 的 `bases` 为准落盘）。 */
export function stripInheritFromClassDiagramPayload(payload: string): string {
  const p = parseViewPayloadClassDiagram(payload);
  const links = p.state.links.filter((l) => l.kind !== 'inherit');
  return buildClassDiagramViewPayload(payload, { ...p.state, links }, p.positions, p.folded, p.edgeVisibility);
}

/**
 * 将 codespace 推导出的继承边写入类图 JSON（仅追加 `kind: inherit`，不保留 payload 里旧的 inherit）。
 * 边 id 固定为 `inh-${from}-${to}`，便于与画布 emit 对齐、减少无意义重载。
 */
export function mergeInheritIntoClassDiagramPayload(
  payload: string,
  inheritEdges: { from: string; to: string }[],
): string {
  const p = parseViewPayloadClassDiagram(payload);
  const nonInherit = p.state.links.filter((l) => l.kind !== 'inherit');
  const synthetic: ClassLink[] = [];
  const seen = new Set<string>();
  for (const e of inheritEdges) {
    const k = `${e.from}\t${e.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    synthetic.push({
      id: `inh-${e.from}-${e.to}`,
      from: e.from,
      to: e.to,
      kind: 'inherit',
    });
  }
  return buildClassDiagramViewPayload(
    payload,
    { ...p.state, links: [...nonInherit, ...synthetic] },
    p.positions,
    p.folded,
    p.edgeVisibility,
  );
}
