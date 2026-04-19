import type {
  MvFenceKind,
  MvMapPayload,
  MvModelCodespacePayload,
  MvModelInterfacePayload,
  MvModelKvPayload,
  MvModelSqlPayload,
  MvModelSqlTable,
  MvModelStructPayload,
  MvViewKind,
  MvViewPayload,
  ParseMdResult,
  ParsedFenceBlock,
  ParsedMermaidMirrorFence,
} from '../types.js';
import { MV_VIEW_KINDS, isMermaidViewKind } from '../types.js';

const FENCE =
  /^```(mv-model-sql|mv-model-kv|mv-model-struct|mv-model-codespace|mv-model-interface|mv-view|mv-map)\s*$/m;

function lineNumberAt(source: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') n++;
  }
  return n;
}

/**
 * 从 `mv-view` 围栏结束偏移起，跳过空白后尝试识别标准 `` ```mermaid ... ``` ``（与 GitHub 等兼容）。
 */
function tryParseTrailingMermaidFence(
  source: string,
  fromOffset: number,
): ParsedMermaidMirrorFence | null {
  let i = fromOffset;
  while (i < source.length) {
    const c = source[i];
    if (c === '\n' || c === '\r' || c === ' ' || c === '\t') i++;
    else break;
  }
  if (!source.startsWith('```mermaid', i)) return null;
  let j = i + '```mermaid'.length;
  while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;
  if (j < source.length && source[j] === '\r') j++;
  if (j >= source.length || source[j] !== '\n') return null;
  j++;
  const innerStartOffset = j;
  const closeIdx = source.indexOf('\n```', innerStartOffset);
  if (closeIdx === -1) return null;
  const innerEndOffset = closeIdx;
  let closeFenceEnd = closeIdx + '\n```'.length;
  if (closeFenceEnd < source.length && source[closeFenceEnd] === '\n') closeFenceEnd++;
  return {
    fenceStartOffset: i,
    innerStartOffset,
    innerEndOffset,
    endOffset: closeFenceEnd,
  };
}

function parseJsonPayload<T extends object>(inner: string, kind: MvFenceKind): { ok: true; value: T } | { ok: false; error: string } {
  const trimmed = inner.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return { ok: false, error: 'empty block body' };
  try {
    const value = JSON.parse(trimmed) as T;
    if (!value || typeof value !== 'object') return { ok: false, error: 'JSON must be an object' };
    return { ok: true, value };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `invalid JSON: ${msg}` };
  }
}

/**
 * 校验 ``mv-model-sql`` 内单张表：非空 columns + rows 与列声明一致。
 */
function validateMvModelSqlTable(
  obj: Record<string, unknown>,
  path: string,
): { ok: true; table: MvModelSqlTable } | { ok: false; message: string } {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { ok: false, message: `${path}.id must be a non-empty string` };
  }
  if ('title' in obj && obj.title !== undefined && typeof obj.title !== 'string') {
    return { ok: false, message: `${path}.title must be a string when present` };
  }

  const colsRaw = obj.columns;
  if (!Array.isArray(colsRaw) || colsRaw.length === 0) {
    return { ok: false, message: `${path}.columns must be a non-empty array` };
  }

  const names = new Set<string>();
  for (let i = 0; i < colsRaw.length; i++) {
    const c = colsRaw[i];
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      return { ok: false, message: `${path}.columns[${i}] must be an object` };
    }
    const o = c as Record<string, unknown>;
    if (typeof o.name !== 'string' || !o.name.trim()) {
      return { ok: false, message: `${path}.columns[${i}].name must be a non-empty string` };
    }
    if (names.has(o.name)) {
      return { ok: false, message: `${path}: duplicate column name "${o.name}"` };
    }
    names.add(o.name);

    if ('primaryKey' in o && o.primaryKey !== undefined && typeof o.primaryKey !== 'boolean') {
      return { ok: false, message: `${path}.columns[${i}].primaryKey must be boolean when present` };
    }
    if ('unique' in o && o.unique !== undefined && typeof o.unique !== 'boolean') {
      return { ok: false, message: `${path}.columns[${i}].unique must be boolean when present` };
    }
    if ('defaultValue' in o && o.defaultValue !== undefined) {
      const dv = o.defaultValue;
      const dvOk =
        dv === null || typeof dv === 'string' || typeof dv === 'number' || typeof dv === 'boolean';
      if (!dvOk) {
        return {
          ok: false,
          message: `${path}.columns[${i}].defaultValue must be string, number, boolean, or null`,
        };
      }
    }
    if ('comment' in o && o.comment !== undefined && typeof o.comment !== 'string') {
      return { ok: false, message: `${path}.columns[${i}].comment must be a string when present` };
    }
  }

  const rowsRaw = obj.rows;
  if (!Array.isArray(rowsRaw)) {
    return { ok: false, message: `${path}.rows must be an array` };
  }

  for (let ri = 0; ri < rowsRaw.length; ri++) {
    const row = rowsRaw[ri];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, message: `${path}.rows[${ri}] must be an object (one table row)` };
    }
    const r = row as Record<string, unknown>;
    for (const key of Object.keys(r)) {
      if (!names.has(key)) {
        return {
          ok: false,
          message: `${path}.rows[${ri}] has unknown property "${key}" (not among declared columns)`,
        };
      }
    }
    for (const c of colsRaw as Array<Record<string, unknown>>) {
      const colName = c.name as string;
      const nullable = c.nullable === true;
      if (!(colName in r) && !nullable) {
        return { ok: false, message: `${path}.rows[${ri}] missing required column "${colName}"` };
      }
    }
  }

  const pkCols = (colsRaw as Array<Record<string, unknown>>).filter(
    (c) => c.primaryKey === true && typeof (c as { name?: unknown }).name === 'string',
  ) as Array<{ name: string }>;
  if (pkCols.length > 0) {
    const seenPk = new Set<string>();
    for (let ri = 0; ri < rowsRaw.length; ri++) {
      const r = rowsRaw[ri] as Record<string, unknown>;
      const parts = pkCols.map((c) => {
        const cn = c.name;
        if (!Object.prototype.hasOwnProperty.call(r, cn)) return '__missing__';
        return JSON.stringify(r[cn]);
      });
      const sig = parts.join('\u0001');
      if (seenPk.has(sig)) {
        return {
          ok: false,
          message: `${path}.rows: duplicate primary key (PK columns: ${pkCols.map((c) => c.name).join(', ')})`,
        };
      }
      seenPk.add(sig);
    }
  }

  return { ok: true, table: obj as unknown as MvModelSqlTable };
}

function validateMvModelSql(obj: Record<string, unknown>): { ok: true; data: MvModelSqlPayload } | { ok: false; message: string } {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { ok: false, message: 'mv-model-sql: id must be a non-empty string' };
  }
  if ('title' in obj && obj.title !== undefined && typeof obj.title !== 'string') {
    return { ok: false, message: 'mv-model-sql: title must be a string when present' };
  }
  const tabs = obj.tables;
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return { ok: false, message: 'mv-model-sql: tables must be a non-empty array' };
  }
  const seen = new Set<string>();
  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i];
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      return { ok: false, message: `mv-model-sql.tables[${i}] must be an object` };
    }
    const path = `mv-model-sql.tables[${i}]`;
    const vt = validateMvModelSqlTable(t as Record<string, unknown>, path);
    if (!vt.ok) return vt;
    if (seen.has(vt.table.id)) {
      return { ok: false, message: `mv-model-sql: duplicate table id "${vt.table.id}"` };
    }
    seen.add(vt.table.id);
  }
  return { ok: true, data: obj as unknown as MvModelSqlPayload };
}

function validateMvModelKv(obj: Record<string, unknown>): { ok: true; data: MvModelKvPayload } | { ok: false; message: string } {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { ok: false, message: 'mv-model-kv: id must be a non-empty string' };
  }
  if ('title' in obj && obj.title !== undefined && typeof obj.title !== 'string') {
    return { ok: false, message: 'mv-model-kv: title must be a string when present' };
  }
  const docs = obj.documents;
  if (!Array.isArray(docs)) {
    return { ok: false, message: 'mv-model-kv: documents must be an array' };
  }
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (!d || typeof d !== 'object' || Array.isArray(d)) {
      return { ok: false, message: `mv-model-kv: documents[${i}] must be a JSON object (not array or null)` };
    }
  }
  return { ok: true, data: obj as unknown as MvModelKvPayload };
}

function validateStructGroup(
  g: unknown,
  path: string,
): { ok: true } | { ok: false; message: string } {
  if (!g || typeof g !== 'object' || Array.isArray(g)) {
    return { ok: false, message: `${path} must be an object` };
  }
  const o = g as Record<string, unknown>;
  if (typeof o.name !== 'string' || !o.name.trim()) {
    return { ok: false, message: `${path}.name must be a non-empty string` };
  }
  if ('attributes' in o && o.attributes !== undefined) {
    if (!o.attributes || typeof o.attributes !== 'object' || Array.isArray(o.attributes)) {
      return { ok: false, message: `${path}.attributes must be an object when present` };
    }
  }
  if ('groups' in o && o.groups !== undefined) {
    if (!Array.isArray(o.groups)) {
      return { ok: false, message: `${path}.groups must be an array when present` };
    }
    for (let i = 0; i < o.groups.length; i++) {
      const r = validateStructGroup(o.groups[i], `${path}.groups[${i}]`);
      if (!r.ok) return r;
    }
  }
  if ('datasets' in o && o.datasets !== undefined) {
    if (!Array.isArray(o.datasets)) {
      return { ok: false, message: `${path}.datasets must be an array when present` };
    }
    for (let i = 0; i < o.datasets.length; i++) {
      const d = o.datasets[i];
      if (!d || typeof d !== 'object' || Array.isArray(d)) {
        return { ok: false, message: `${path}.datasets[${i}] must be an object` };
      }
      const dd = d as Record<string, unknown>;
      if (typeof dd.name !== 'string' || !dd.name.trim()) {
        return { ok: false, message: `${path}.datasets[${i}].name must be a non-empty string` };
      }
      if ('dtype' in dd && dd.dtype !== undefined && typeof dd.dtype !== 'string') {
        return { ok: false, message: `${path}.datasets[${i}].dtype must be a string when present` };
      }
    }
  }
  return { ok: true };
}

function validateMvModelStruct(
  obj: Record<string, unknown>,
): { ok: true; data: MvModelStructPayload } | { ok: false; message: string } {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { ok: false, message: 'mv-model-struct: id must be a non-empty string' };
  }
  if ('title' in obj && obj.title !== undefined && typeof obj.title !== 'string') {
    return { ok: false, message: 'mv-model-struct: title must be a string when present' };
  }
  const vg = validateStructGroup(obj.root, 'root');
  if (!vg.ok) {
    return { ok: false, message: `mv-model-struct: ${vg.message}` };
  }
  return { ok: true, data: obj as unknown as MvModelStructPayload };
}

function validateMvModelCodespace(
  obj: Record<string, unknown>,
): { ok: true; data: MvModelCodespacePayload } | { ok: false; message: string } {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { ok: false, message: 'mv-model-codespace: id must be a non-empty string' };
  }
  if ('title' in obj && obj.title !== undefined && typeof obj.title !== 'string') {
    return { ok: false, message: 'mv-model-codespace: title must be a string when present' };
  }
  if (
    'workspaceRoot' in obj &&
    obj.workspaceRoot !== undefined &&
    typeof obj.workspaceRoot !== 'string'
  ) {
    return { ok: false, message: 'mv-model-codespace: workspaceRoot must be a string when present' };
  }
  const mods = obj.modules;
  if (!Array.isArray(mods) || mods.length === 0) {
    return { ok: false, message: 'mv-model-codespace: modules must be a non-empty array' };
  }
  const seen = new Set<string>();
  for (let i = 0; i < mods.length; i++) {
    const m = mods[i];
    const path = `mv-model-codespace.modules[${i}]`;
    if (!m || typeof m !== 'object' || Array.isArray(m)) {
      return { ok: false, message: `${path} must be an object` };
    }
    const o = m as Record<string, unknown>;
    if (typeof o.id !== 'string' || !o.id.trim()) {
      return { ok: false, message: `${path}.id must be a non-empty string` };
    }
    if (typeof o.name !== 'string' || !o.name.trim()) {
      return { ok: false, message: `${path}.name must be a non-empty string` };
    }
    if (seen.has(o.id)) {
      return { ok: false, message: `mv-model-codespace: duplicate module id "${o.id}"` };
    }
    seen.add(o.id);
    for (const key of ['path', 'role', 'notes'] as const) {
      if (key in o && o[key] !== undefined && typeof o[key] !== 'string') {
        return { ok: false, message: `${path}.${key} must be a string when present` };
      }
    }
  }
  return { ok: true, data: obj as unknown as MvModelCodespacePayload };
}

function validateMvModelInterface(
  obj: Record<string, unknown>,
): { ok: true; data: MvModelInterfacePayload } | { ok: false; message: string } {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { ok: false, message: 'mv-model-interface: id must be a non-empty string' };
  }
  if ('title' in obj && obj.title !== undefined && typeof obj.title !== 'string') {
    return { ok: false, message: 'mv-model-interface: title must be a string when present' };
  }
  const eps = obj.endpoints;
  if (!Array.isArray(eps) || eps.length === 0) {
    return { ok: false, message: 'mv-model-interface: endpoints must be a non-empty array' };
  }
  const seen = new Set<string>();
  for (let i = 0; i < eps.length; i++) {
    const m = eps[i];
    const path = `mv-model-interface.endpoints[${i}]`;
    if (!m || typeof m !== 'object' || Array.isArray(m)) {
      return { ok: false, message: `${path} must be an object` };
    }
    const o = m as Record<string, unknown>;
    if (typeof o.id !== 'string' || !o.id.trim()) {
      return { ok: false, message: `${path}.id must be a non-empty string` };
    }
    if (typeof o.name !== 'string' || !o.name.trim()) {
      return { ok: false, message: `${path}.name must be a non-empty string` };
    }
    if (seen.has(o.id)) {
      return { ok: false, message: `mv-model-interface: duplicate endpoint id "${o.id}"` };
    }
    seen.add(o.id);
    for (const key of ['method', 'path', 'notes'] as const) {
      if (key in o && o[key] !== undefined && typeof o[key] !== 'string') {
        return { ok: false, message: `${path}.${key} must be a string when present` };
      }
    }
  }
  return { ok: true, data: obj as unknown as MvModelInterfacePayload };
}

function isMvViewKind(k: unknown): k is MvViewKind {
  return typeof k === 'string' && (MV_VIEW_KINDS as readonly string[]).includes(k);
}

function validateMvView(obj: Record<string, unknown>): { ok: true; view: MvViewPayload } | { ok: false; message: string } {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { ok: false, message: 'mv-view: id must be a non-empty string' };
  }
  if ('title' in obj && obj.title !== undefined && typeof obj.title !== 'string') {
    return { ok: false, message: 'mv-view: title must be a string when present' };
  }
  if (!isMvViewKind(obj.kind)) {
    return {
      ok: false,
      message: `mv-view: unknown kind "${String(obj.kind)}" (expected one of: ${MV_VIEW_KINDS.join(', ')})`,
    };
  }
  if (!Array.isArray(obj.modelRefs) || !obj.modelRefs.every((x) => typeof x === 'string')) {
    return { ok: false, message: 'mv-view: modelRefs must be an array of strings' };
  }
  if ('payload' in obj && obj.payload !== undefined && typeof obj.payload !== 'string') {
    return { ok: false, message: 'mv-view: payload must be a string when present' };
  }
  return { ok: true, view: obj as unknown as MvViewPayload };
}

function validateMap(v: Record<string, unknown>): boolean {
  if (typeof v.id !== 'string' || !Array.isArray(v.rules)) return false;
  return v.rules.every(
    (r) =>
      r &&
      typeof r === 'object' &&
      typeof (r as MvMapPayload['rules'][0]).modelId === 'string' &&
      typeof (r as MvMapPayload['rules'][0]).targetPath === 'string',
  );
}

/**
 * Parse markdown for mv-* fenced blocks. Does not validate cross-file refs.
 */
export function parseMarkdownBlocks(source: string): ParseMdResult {
  const blocks: ParsedFenceBlock[] = [];
  const errors: ParseMdResult['errors'] = [];
  let pos = 0;

  while (pos < source.length) {
    const slice = source.slice(pos);
    const m = FENCE.exec(slice);
    if (!m || m.index === undefined) break;
    const openStart = pos + m.index;
    const openEnd = openStart + m[0].length;
    const kind = m[1] as MvFenceKind;
    let innerStartOffset = openEnd;
    if (source[innerStartOffset] === '\r') innerStartOffset++;
    if (source[innerStartOffset] === '\n') innerStartOffset++;
    const closeIdx = source.indexOf('\n```', innerStartOffset);
    if (closeIdx === -1) {
      errors.push({
        message: `unclosed fence for ${kind}`,
        line: lineNumberAt(source, openStart),
      });
      break;
    }
    const innerEnd = closeIdx;
    const innerEndOffset = innerEnd;
    const rawInner = source.slice(innerStartOffset, innerEndOffset);
    const closeFenceEnd = closeIdx + '\n```'.length;
    const endOffset = closeFenceEnd <= source.length && source[closeFenceEnd] === '\n' ? closeFenceEnd + 1 : closeFenceEnd;

    const parsed = parseJsonPayload<Record<string, unknown>>(rawInner, kind);
    if (!parsed.ok) {
      errors.push({
        message: `${kind}: ${parsed.error}`,
        line: lineNumberAt(source, innerStartOffset),
      });
      pos = endOffset;
      continue;
    }
    const obj = parsed.value;
    let payload: ParsedFenceBlock['payload'] | null = null;
    if (kind === 'mv-model-sql') {
      const mv = validateMvModelSql(obj);
      if (!mv.ok) {
        errors.push({
          message: mv.message,
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = mv.data;
      }
    } else if (kind === 'mv-model-kv') {
      const kv = validateMvModelKv(obj);
      if (!kv.ok) {
        errors.push({
          message: kv.message,
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = kv.data;
      }
    } else if (kind === 'mv-model-struct') {
      const st = validateMvModelStruct(obj);
      if (!st.ok) {
        errors.push({
          message: st.message,
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = st.data;
      }
    } else if (kind === 'mv-model-codespace') {
      const cs = validateMvModelCodespace(obj);
      if (!cs.ok) {
        errors.push({
          message: cs.message,
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = cs.data;
      }
    } else if (kind === 'mv-model-interface') {
      const iface = validateMvModelInterface(obj);
      if (!iface.ok) {
        errors.push({
          message: iface.message,
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = iface.data;
      }
    } else if (kind === 'mv-view') {
      const vv = validateMvView(obj);
      if (!vv.ok) {
        errors.push({
          message: vv.message,
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = vv.view;
      }
    } else {
      if (!validateMap(obj)) {
        errors.push({
          message: 'mv-map: require id (string) and rules [{ modelId, targetPath, ... }]',
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = obj as unknown as MvMapPayload;
      }
    }

    let nextPos = endOffset;
    if (payload) {
      let blockEndOffset = endOffset;
      let endLine = lineNumberAt(source, closeIdx);
      let mermaidMirror: ParsedMermaidMirrorFence | undefined;

      if (kind === 'mv-view') {
        const view = payload as MvViewPayload;
        const mirror = tryParseTrailingMermaidFence(source, endOffset);
        if (mirror && isMermaidViewKind(view.kind)) {
          mermaidMirror = mirror;
          const mBody = source.slice(mirror.innerStartOffset, mirror.innerEndOffset);
          const jp = typeof view.payload === 'string' ? view.payload : '';
          if (!jp.trim() && mBody.trim()) {
            (payload as MvViewPayload).payload = mBody;
          }
          blockEndOffset = mirror.endOffset;
          endLine = lineNumberAt(source, mirror.endOffset - 1);
        }
      }

      blocks.push({
        kind,
        startLine: lineNumberAt(source, openStart),
        endLine,
        startOffset: openStart,
        innerStartOffset,
        innerEndOffset,
        endOffset: blockEndOffset,
        rawInner,
        payload,
        ...(mermaidMirror ? { mermaidMirror } : {}),
      });
      nextPos = blockEndOffset;
    }

    pos = nextPos;
  }

  const seen = new Set<string>();
  const unique: ParsedFenceBlock[] = [];
  for (const b of blocks) {
    const id = b.payload.id;
    if (seen.has(id)) {
      errors.push({ message: `duplicate block id in file (skipped): ${id}`, line: b.startLine });
      continue;
    }
    seen.add(id);
    unique.push(b);
  }

  return { blocks: unique, errors };
}

/**
 * Replace the inner content (between fences) of the block with given id. Returns new source or null if not found.
 */
export function replaceBlockInnerById(source: string, blockId: string, newInnerJson: string): string | null {
  const { blocks } = parseMarkdownBlocks(source);
  const block = blocks.find((b) => b.payload.id === blockId);
  if (!block) return null;
  const formatted = newInnerJson.endsWith('\n') ? newInnerJson : `${newInnerJson}\n`;
  let s = source.slice(0, block.innerStartOffset) + formatted + source.slice(block.innerEndOffset);

  if (block.kind === 'mv-view' && block.mermaidMirror) {
    try {
      const view = JSON.parse(formatted.replace(/^\uFEFF/, '').trim()) as MvViewPayload;
      if (isMermaidViewKind(view.kind) && typeof view.payload === 'string') {
        const r2 = parseMarkdownBlocks(s);
        const b2 = r2.blocks.find((b) => b.payload.id === blockId);
        if (b2?.kind === 'mv-view' && b2.mermaidMirror) {
          const body = view.payload;
          s =
            s.slice(0, b2.mermaidMirror.innerStartOffset) +
            body +
            s.slice(b2.mermaidMirror.innerEndOffset);
        }
      }
    } catch {
      /* 仅写 mv-view 内层，不强制改镜像 */
    }
  }

  return s;
}

export function getBlockFenceSlice(source: string, block: ParsedFenceBlock): string {
  return source.slice(block.startOffset, block.endOffset);
}

/**
 * 在已解析块列表中定位 ``mv-model-sql`` 围栏内的一张表。
 * `tableId` 省略时仅当该块仅含一张表时返回该表，否则返回 null。
 */
export function findMvModelSqlTable(
  blocks: ParsedFenceBlock[],
  blockId: string,
  tableId?: string,
): MvModelSqlTable | null {
  const b = blocks.find((x) => x.kind === 'mv-model-sql' && x.payload.id === blockId);
  if (!b || b.kind !== 'mv-model-sql') return null;
  const p = b.payload as MvModelSqlPayload;
  const tid = tableId?.trim();
  if (tid) {
    return p.tables.find((t) => t.id === tid) ?? null;
  }
  if (p.tables.length === 1) return p.tables[0]!;
  return null;
}
