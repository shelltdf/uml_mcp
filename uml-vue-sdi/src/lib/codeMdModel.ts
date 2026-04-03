/**
 * *.code.md：## 函数 / ## 全局变量 / ## 宏 等章节与表格；画布布局存于 HTML 注释。
 */

export interface CodeFunctionRow {
  kind: string;
  name: string;
  signature: string;
  effect: string;
  note: string;
}

export interface CodeVariableRow {
  kind: string;
  name: string;
  typeAbs: string;
  note: string;
}

export interface CodeMacroRow {
  kind: string;
  name: string;
  expandSemantics: string;
  note: string;
}

export type CodeItemCategory = 'function' | 'variable' | 'macro';

export interface CodeMdLayout {
  v: number;
  functionPositions: { x: number; y: number }[];
  variablePositions: { x: number; y: number }[];
  macroPositions: { x: number; y: number }[];
}

export interface CodeMdState {
  introMarkdown: string;
  functions: CodeFunctionRow[];
  variables: CodeVariableRow[];
  macros: CodeMacroRow[];
}

const LAYOUT_PREFIX = '<!-- code-md-layout:';
const LAYOUT_SUFFIX = ' -->';

const DEFAULT_POS = (i: number, col: number): { x: number; y: number } => ({
  x: 80 + col * 340,
  y: 80 + (i % 6) * 120,
});

function parseTableRows(block: string): string[][] {
  const rows: string[][] = [];
  for (const line of block.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = t
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length === 0) continue;
    if (/^[-:\s|]+$/.test(cells.join(''))) continue;
    rows.push(cells);
  }
  if (rows.length <= 1) return [];
  return rows.slice(1);
}

function classifySectionTitle(title: string): CodeItemCategory | null {
  const t = title.trim();
  if (t.includes('宏') && !t.includes('函数')) return 'macro';
  if (/变量|常量/.test(t)) return 'variable';
  if (t.includes('函数')) return 'function';
  return null;
}

/** 按 ## 分段 */
function splitByH2(markdown: string): { intro: string; sections: { title: string; body: string }[] } {
  const lines = markdown.split(/\r?\n/);
  let introLines: string[] = [];
  const sections: { title: string; body: string }[] = [];
  let mode: 'intro' | 'body' = 'intro';
  let currentTitle = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      if (mode === 'body' && currentTitle) {
        sections.push({ title: currentTitle, body: currentBody.join('\n') });
        currentBody = [];
      }
      currentTitle = h2[1].trim();
      mode = 'body';
      continue;
    }
    if (mode === 'intro') {
      introLines.push(line);
    } else {
      currentBody.push(line);
    }
  }
  if (mode === 'body' && currentTitle) {
    sections.push({ title: currentTitle, body: currentBody.join('\n') });
  }
  return { intro: introLines.join('\n').trimEnd(), sections };
}

export function parseLayoutComment(markdown: string): CodeMdLayout {
  const empty = (): CodeMdLayout => ({
    v: 1,
    functionPositions: [],
    variablePositions: [],
    macroPositions: [],
  });
  const idx = markdown.indexOf(LAYOUT_PREFIX);
  if (idx === -1) return empty();
  const rest = markdown.slice(idx + LAYOUT_PREFIX.length);
  const end = rest.indexOf(LAYOUT_SUFFIX);
  if (end === -1) return empty();
  try {
    const raw = rest.slice(0, end).trim();
    const data = JSON.parse(raw) as Partial<CodeMdLayout>;
    const pos = (arr: unknown): { x: number; y: number }[] =>
      Array.isArray(arr)
        ? arr
            .filter((p): p is { x: number; y: number } => p && typeof p.x === 'number' && typeof p.y === 'number')
            .map((p) => ({ x: p.x, y: p.y }))
        : [];
    return {
      v: typeof data.v === 'number' ? data.v : 1,
      functionPositions: pos(data.functionPositions),
      variablePositions: pos(data.variablePositions),
      macroPositions: pos(data.macroPositions),
    };
  } catch {
    return empty();
  }
}

function stripLayoutComment(markdown: string): string {
  const re = new RegExp(
    `${LAYOUT_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${LAYOUT_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g',
  );
  return markdown.replace(re, '').replace(/\n{3,}/g, '\n\n').trimEnd();
}

function alignPositions(
  rows: number,
  saved: { x: number; y: number }[],
  col: number,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < rows; i += 1) {
    const p = saved[i];
    if (p && typeof p.x === 'number' && typeof p.y === 'number') {
      out.push({ x: p.x, y: p.y });
    } else {
      out.push(DEFAULT_POS(i, col));
    }
  }
  return out;
}

export function parseCodeMdMarkdown(markdown: string): { state: CodeMdState; layout: CodeMdLayout } {
  const layoutRaw = parseLayoutComment(markdown);
  const stripped = stripLayoutComment(markdown);
  const { intro, sections } = splitByH2(stripped);

  const functions: CodeFunctionRow[] = [];
  const variables: CodeVariableRow[] = [];
  const macros: CodeMacroRow[] = [];

  for (const sec of sections) {
    const cat = classifySectionTitle(sec.title);
    if (!cat) continue;
    const cells = parseTableRows(sec.body);
    if (cat === 'function') {
      for (const r of cells) {
        if (r.length < 2) continue;
        functions.push({
          kind: r[0] ?? 'function',
          name: r[1] ?? 'unnamed',
          signature: r[2] ?? '',
          effect: r[3] ?? '',
          note: r[4] ?? '',
        });
      }
    } else if (cat === 'variable') {
      for (const r of cells) {
        if (r.length < 2) continue;
        variables.push({
          kind: r[0] ?? 'constant',
          name: r[1] ?? 'unnamed',
          typeAbs: r[2] ?? '',
          note: r[3] ?? '',
        });
      }
    } else {
      for (const r of cells) {
        if (r.length < 2) continue;
        macros.push({
          kind: r[0] ?? 'macro',
          name: r[1] ?? 'unnamed',
          expandSemantics: r[2] ?? '',
          note: r[3] ?? '',
        });
      }
    }
  }

  const layout: CodeMdLayout = {
    v: 1,
    functionPositions: alignPositions(functions.length, layoutRaw.functionPositions, 0),
    variablePositions: alignPositions(variables.length, layoutRaw.variablePositions, 1),
    macroPositions: alignPositions(macros.length, layoutRaw.macroPositions, 2),
  };

  return {
    state: {
      introMarkdown: intro,
      functions,
      variables,
      macros,
    },
    layout,
  };
}

export function buildCodeMdMarkdown(
  state: CodeMdState,
  layout: CodeMdLayout,
): string {
  const lines: string[] = [];
  if (state.introMarkdown.trim()) {
    lines.push(state.introMarkdown.trimEnd());
    lines.push('');
  }

  lines.push('## 函数');
  lines.push('');
  lines.push('| Kind | Name | 签名（抽象） | 效果 / 返回值（抽象） | Note |');
  lines.push('|------|------|--------------|----------------------|------|');
  for (const f of state.functions) {
    lines.push(`| ${f.kind} | ${f.name} | ${f.signature} | ${f.effect} | ${f.note} |`);
  }
  lines.push('');
  lines.push('## 全局变量 / 常量');
  lines.push('');
  lines.push('| Kind | Name | 类型（抽象） | Note |');
  lines.push('|------|------|--------------|------|');
  for (const v of state.variables) {
    lines.push(`| ${v.kind} | ${v.name} | ${v.typeAbs} | ${v.note} |`);
  }
  lines.push('');
  lines.push('## 宏');
  lines.push('');
  lines.push('| Kind | Name | 展开语义（抽象） | Note |');
  lines.push('|------|------|------------------|------|');
  for (const m of state.macros) {
    lines.push(`| ${m.kind} | ${m.name} | ${m.expandSemantics} | ${m.note} |`);
  }

  const layoutJson = JSON.stringify({
    v: 1,
    functionPositions: layout.functionPositions,
    variablePositions: layout.variablePositions,
    macroPositions: layout.macroPositions,
  });
  lines.push('');
  lines.push(`${LAYOUT_PREFIX}${layoutJson}${LAYOUT_SUFFIX}`);
  lines.push('');
  return lines.join('\n');
}
