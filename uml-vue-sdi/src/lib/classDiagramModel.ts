/**
 * 可编辑 classDiagram：与首个 ```mermaid 块互转，布局存于 HTML 注释。
 */

export interface ClassDef {
  id: string;
  name: string;
  attributes: string[];
  methods: string[];
}

export interface ClassLink {
  id: string;
  from: string;
  /** 继承：子类 id；关联：源类 id */
  to: string;
  /** 继承：父类 id；关联：目标类 id */
  kind: 'inherit' | 'association';
}

export interface ClassDiagramState {
  classes: ClassDef[];
  links: ClassLink[];
}

export interface ClassPositions {
  [classId: string]: { x: number; y: number };
}

export interface ClassDiagramEdgeVisibility {
  inherit: boolean;
  association: boolean;
}

export interface ParsedClassLayout {
  positions: ClassPositions;
  folded: Record<string, boolean>;
  edgeVisibility: ClassDiagramEdgeVisibility;
}

const LAYOUT_PREFIX = '<!-- uml-class-diagram-layout:';
const LAYOUT_SUFFIX = ' -->';

function slug(name: string): string {
  return name.replace(/[^\w\u4e00-\u9fff]/g, '_') || 'Class';
}

/**
 * 去掉行首 Mermaid 成员可见性/静态标记（可重复），便于判断方法形态。
 * + public, - private, # protected, ~ package；$ 表示 static，常与 +-$ 等组合（如 `+$`、`-$`）。
 */
export function stripMermaidMemberModifiers(line: string): string {
  let t = line.trim();
  for (let i = 0; i < 12; i += 1) {
    const next = t
      .replace(/^[+#~$-]\s*/, '')
      .replace(/^\$\s*/, '');
    if (next === t) break;
    t = next;
  }
  return t.trim();
}

/** 去掉修饰后，末尾为 `... name ( ... )` 形态的视为方法（含私有/静态方法）。 */
export function isClassMemberMethodLine(line: string): boolean {
  const core = stripMermaidMemberModifiers(line);
  if (!core) return false;
  if (!/\([^)]*\)\s*$/.test(core)) return false;
  const lp = core.lastIndexOf('(');
  if (lp <= 0) return false;
  const beforeParen = core.slice(0, lp).trim();
  return /\w/.test(beforeParen);
}

let linkSeq = 0;

export function emptyDiagram(): ClassDiagramState {
  return {
    classes: [
      {
        id: 'NewClass',
        name: 'NewClass',
        attributes: ['+string id'],
        methods: ['+greet()'],
      },
    ],
    links: [],
  };
}

const defaultEdgeVisibility = (): ClassDiagramEdgeVisibility => ({
  inherit: true,
  association: true,
});

export function parseLayoutComment(markdown: string): ParsedClassLayout {
  const empty: ParsedClassLayout = {
    positions: {},
    folded: {},
    edgeVisibility: defaultEdgeVisibility(),
  };
  const idx = markdown.indexOf(LAYOUT_PREFIX);
  if (idx === -1) return empty;
  const rest = markdown.slice(idx + LAYOUT_PREFIX.length);
  const end = rest.indexOf(LAYOUT_SUFFIX);
  if (end === -1) return empty;
  try {
    const raw = rest.slice(0, end).trim();
    const data = JSON.parse(raw) as {
      v?: number;
      positions?: ClassPositions;
      folded?: Record<string, boolean>;
      edgeVisibility?: Partial<ClassDiagramEdgeVisibility>;
    };
    const positions = data.positions && typeof data.positions === 'object' ? data.positions : {};
    const folded = data.folded && typeof data.folded === 'object' ? data.folded : {};
    const ev = defaultEdgeVisibility();
    if (data.edgeVisibility) {
      if (typeof data.edgeVisibility.inherit === 'boolean') ev.inherit = data.edgeVisibility.inherit;
      if (typeof data.edgeVisibility.association === 'boolean')
        ev.association = data.edgeVisibility.association;
    }
    return { positions, folded, edgeVisibility: ev };
  } catch {
    return empty;
  }
}

function stripLayoutComment(markdown: string): string {
  const re = new RegExp(
    `${LAYOUT_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${LAYOUT_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g',
  );
  return markdown.replace(re, '').replace(/\n{3,}/g, '\n\n').trimEnd();
}

export function extractFirstMermaidBlock(markdown: string): string | null {
  const re = /```\s*mermaid\s*\n([\s\S]*?)```/i;
  const m = re.exec(markdown);
  return m ? m[1].trim() : null;
}

/** 从 mermaid 正文解析（不含围栏）；失败返回 null */
export function parseClassDiagramBody(code: string): ClassDiagramState | null {
  linkSeq = 0;
  const text = code.replace(/^\s*%%.*$/gm, '').trim();
  if (!/^\s*classDiagram\b/i.test(text)) return null;

  const classes: ClassDef[] = [];
  const seen = new Set<string>();

  const classBlockRe = /\bclass\s+(\w+)\s*\{([^}]*)\}/gs;
  let m: RegExpExecArray | null;
  while ((m = classBlockRe.exec(text)) !== null) {
    const name = m[1];
    const body = m[2];
    const attrs: string[] = [];
    const methods: string[] = [];
    for (const line of body.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      if (isClassMemberMethodLine(t)) {
        methods.push(t);
      } else {
        attrs.push(t);
      }
    }
    const id = slug(name);
    if (!seen.has(id)) {
      seen.add(id);
      classes.push({ id, name, attributes: attrs, methods });
    }
  }

  const classLineRe = /^\s*class\s+(\w+)\s*$/gm;
  while ((m = classLineRe.exec(text)) !== null) {
    const name = m[1];
    const id = slug(name);
    if (seen.has(id)) continue;
    seen.add(id);
    classes.push({ id, name, attributes: [], methods: [] });
  }

  const links: ClassLink[] = [];

  const inheritRe = /(\w+)\s*<\|--\s*(\w+)/g;
  while ((m = inheritRe.exec(text)) !== null) {
    linkSeq += 1;
    const parent = m[1];
    const child = m[2];
    links.push({
      id: `inh-${linkSeq}`,
      from: slug(child),
      to: slug(parent),
      kind: 'inherit',
    });
  }

  /** 支持 `A --> B`、`A ..> B` 与 `Order "1" --> "*" Item : label` 等带基数/标签的关联 */
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('%%')) continue;
    if (t.includes('<|--')) continue;
    const arrowIdx = t.indexOf('-->');
    const depIdx = t.indexOf('..>');
    let idx: number;
    let arrowLen: number;
    if (arrowIdx !== -1 && (depIdx === -1 || arrowIdx < depIdx)) {
      idx = arrowIdx;
      arrowLen = 3;
    } else if (depIdx !== -1) {
      idx = depIdx;
      arrowLen = 3;
    } else {
      continue;
    }
    const left = t.slice(0, idx).trim();
    let right = t.slice(idx + arrowLen).trim();
    const colon = right.indexOf(':');
    if (colon !== -1) right = right.slice(0, colon).trim();
    const leftFirst = left.match(/^(\w+)/);
    const rightLast = right.match(/(\w+)\s*$/);
    if (!leftFirst || !rightLast) continue;
    const from = leftFirst[1];
    const to = rightLast[1];
    if (from === to) continue;
    linkSeq += 1;
    links.push({
      id: `asc-${linkSeq}`,
      from: slug(from),
      to: slug(to),
      kind: 'association',
    });
  }

  return { classes, links };
}

export function serializeClassDiagramBody(state: ClassDiagramState): string {
  const lines: string[] = ['classDiagram'];
  for (const c of state.classes) {
    lines.push(`  class ${c.name} {`);
    for (const a of c.attributes) {
      lines.push(`    ${a}`);
    }
    for (const meth of c.methods) {
      lines.push(`    ${meth}`);
    }
    lines.push('  }');
  }
  for (const l of state.links) {
    const a = state.classes.find((x) => x.id === l.from)?.name ?? l.from;
    const b = state.classes.find((x) => x.id === l.to)?.name ?? l.to;
    if (l.kind === 'inherit') {
      lines.push(`  ${b} <|-- ${a}`);
    } else {
      lines.push(`  ${a} --> ${b}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function defaultPositions(state: ClassDiagramState): ClassPositions {
  const pos: ClassPositions = {};
  state.classes.forEach((c, i) => {
    pos[c.id] = { x: 80 + (i % 4) * 280, y: 80 + Math.floor(i / 4) * 220 };
  });
  return pos;
}

export function mergePositions(state: ClassDiagramState, saved: ClassPositions): ClassPositions {
  const base = defaultPositions(state);
  for (const c of state.classes) {
    const p = saved[c.id];
    if (p && typeof p.x === 'number' && typeof p.y === 'number') {
      base[c.id] = { x: p.x, y: p.y };
    }
  }
  return base;
}

export function buildClassDiagramMarkdown(
  previousMarkdown: string,
  state: ClassDiagramState,
  positions: ClassPositions,
  folded: Record<string, boolean> = {},
  edgeVisibility: ClassDiagramEdgeVisibility = defaultEdgeVisibility(),
): string {
  const body = serializeClassDiagramBody(state);
  const fence = '```mermaid\n' + body + '```';
  const layoutJson = JSON.stringify({
    v: 1,
    positions,
    folded,
    edgeVisibility,
  });
  const layoutLine = `${LAYOUT_PREFIX}${layoutJson}${LAYOUT_SUFFIX}`;

  const stripped = stripLayoutComment(previousMarkdown);
  const blockRe = /```\s*mermaid\s*\n[\s\S]*?```/i;
  if (blockRe.test(stripped)) {
    const replaced = stripped.replace(blockRe, fence);
    return `${replaced.trimEnd()}\n\n${layoutLine}\n`;
  }

  const title = stripped.trim() ? `${stripped.trim()}\n\n` : '';
  return `${title}${fence}\n\n${layoutLine}\n`;
}

export function parseOrDefault(markdown: string): {
  state: ClassDiagramState;
  positions: ClassPositions;
  folded: Record<string, boolean>;
  edgeVisibility: ClassDiagramEdgeVisibility;
} {
  const raw = extractFirstMermaidBlock(markdown);
  if (!raw) {
    const state = emptyDiagram();
    return {
      state,
      positions: defaultPositions(state),
      folded: {},
      edgeVisibility: defaultEdgeVisibility(),
    };
  }
  const parsed = parseClassDiagramBody(raw);
  if (!parsed || parsed.classes.length === 0) {
    const state = emptyDiagram();
    return {
      state,
      positions: defaultPositions(state),
      folded: {},
      edgeVisibility: defaultEdgeVisibility(),
    };
  }
  const layout = parseLayoutComment(markdown);
  const positions = mergePositions(parsed, layout.positions);
  return {
    state: parsed,
    positions,
    folded: { ...layout.folded },
    edgeVisibility: { ...layout.edgeVisibility },
  };
}

/** 估算类框尺寸（SVG 与旧 HTML 布局一致）；folded 时仅标题条高度 */
export function estimateClassSize(c: ClassDef, folded = false): { w: number; h: number } {
  const w = 248;
  if (folded) {
    return { w, h: 36 };
  }
  const header = 36;
  const row = 22;
  const pad = 8;
  const attrsH = Math.max(1, c.attributes.length) * row + pad;
  const methH = Math.max(1, c.methods.length) * row + pad;
  const h = header + attrsH + methH + 4;
  return { w, h };
}

export function diagramBounds(
  state: ClassDiagramState,
  positions: ClassPositions,
  folded: Record<string, boolean> = {},
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const c of state.classes) {
    const p = positions[c.id] ?? { x: 0, y: 0 };
    const { w, h } = estimateClassSize(c, !!folded[c.id]);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + w);
    maxY = Math.max(maxY, p.y + h);
  }
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
  }
  return { minX, minY, maxX, maxY };
}
