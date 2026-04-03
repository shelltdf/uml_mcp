/**
 * *.class.md：单类契约表 + 可选元数据（继承/关联仅展示，不在此编辑关系语义）。
 */

export interface ClassMdRow {
  kind: string;
  name: string;
  type: string;
  note: string;
}

export interface ClassMdMeta {
  /** 父类名（只读展示） */
  inherits: string | null;
  /** 关联目标类名（只读展示） */
  associations: string[];
}

export interface ClassMdState {
  /** ### 标题 */
  title: string;
  /** ### 之前的 Markdown（保留标题与约定段落） */
  introMarkdown: string;
  meta: ClassMdMeta;
  rows: ClassMdRow[];
}

const META_PREFIX = '<!-- class-md-meta:';
const META_SUFFIX = ' -->';

const defaultMeta = (): ClassMdMeta => ({ inherits: null, associations: [] });

export function parseClassMdMetaComment(markdown: string): ClassMdMeta {
  const idx = markdown.indexOf(META_PREFIX);
  if (idx === -1) return defaultMeta();
  const rest = markdown.slice(idx + META_PREFIX.length);
  const end = rest.indexOf(META_SUFFIX);
  if (end === -1) return defaultMeta();
  try {
    const raw = rest.slice(0, end).trim();
    const o = JSON.parse(raw) as { inherits?: unknown; associations?: unknown };
    const inherits = typeof o.inherits === 'string' && o.inherits.trim() ? o.inherits.trim() : null;
    const associations = Array.isArray(o.associations)
      ? o.associations
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((s) => s.trim())
      : [];
    return { inherits, associations };
  } catch {
    return defaultMeta();
  }
}

function stripMetaComment(md: string): string {
  const re = new RegExp(
    `${META_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${META_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g',
  );
  return md.replace(re, '').replace(/\n{3,}/g, '\n\n');
}

/** 解析 ### 标题（取第一个） */
export function parseClassMdTitle(markdown: string): string {
  const m = /^[\s\S]*?^###\s+(.+?)\s*$/m.exec(markdown);
  return m ? m[1].trim() : 'Class';
}

function parseTableRows(section: string): ClassMdRow[] {
  const rows: ClassMdRow[] = [];
  const lines = section.split(/\r?\n/);
  let seenHeader = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('|')) {
      if (seenHeader && rows.length > 0) break;
      continue;
    }
    const cells = t
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 2) continue;
    const joined = cells.join(' ').toLowerCase();
    if (joined.includes('kind') && joined.includes('name')) {
      seenHeader = true;
      continue;
    }
    if (seenHeader && /^[-:\s|]+$/.test(cells.join(''))) continue;
    if (!seenHeader) continue;
    const kind = cells[0] ?? '';
    const name = cells[1] ?? '';
    const typ = cells[2] ?? '';
    const note = cells[3] ?? '';
    rows.push({ kind, name, type: typ, note });
  }
  return rows;
}

export function parseClassMdMarkdown(markdown: string): ClassMdState {
  const meta = parseClassMdMetaComment(markdown);
  const title = parseClassMdTitle(markdown);
  const h3 = markdown.search(/^###\s+/m);
  const introMarkdown = h3 === -1 ? '' : markdown.slice(0, h3).trimEnd();
  const fromH3 = h3 === -1 ? markdown : markdown.slice(h3);
  const withoutMeta = stripMetaComment(fromH3);
  const rows = parseTableRows(withoutMeta);
  return { title, introMarkdown, meta, rows };
}

function rowToMarkdownLine(r: ClassMdRow): string {
  return `| ${r.kind} | ${r.name} | ${r.type} | ${r.note} |`;
}

export function serializeClassMdMarkdown(previous: string, state: ClassMdState): string {
  const metaLine = `${META_PREFIX}${JSON.stringify({
    inherits: state.meta.inherits,
    associations: state.meta.associations,
  })}${META_SUFFIX}`;
  const tableHeader = '| Kind | Name | Type | Note |\n|------|------|------|------|';
  const tableBody = state.rows.map(rowToMarkdownLine).join('\n');
  const table = `${tableHeader}\n${tableBody}`;

  const headPart = state.introMarkdown.trim() ? `${state.introMarkdown.trim()}\n\n` : '';
  const body = `${headPart}### ${state.title}\n\n${metaLine}\n\n${table}\n`;
  const stripped = stripMetaComment(previous);
  if (/^###\s+/m.test(stripped)) {
    return stripped.replace(/^[\s\S]*?(?=^###\s+)/m, '') === stripped
      ? body
      : stripped.replace(/^###\s+[\s\S]*$/m, body.trimEnd());
  }
  return body;
}

/** 将表格行映射为 classDiagram 风格的成员行（画布展示） */
export function rowToDiagramAttr(r: ClassMdRow): string {
  const k = r.kind.toLowerCase();
  if (k === 'method' || k === 'function') {
    const sig = r.type && r.type !== '—' && r.type !== '-' ? r.type : `${r.name}()`;
    return `+${sig}`;
  }
  const t = r.type || 'unknown';
  return `+${t} ${r.name}`;
}
