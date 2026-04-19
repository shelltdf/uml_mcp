import type {
  MvFenceKind,
  MvMapPayload,
  MvModelPayload,
  MvViewKind,
  MvViewPayload,
  ParseMdResult,
  ParsedFenceBlock,
} from '../types.js';
import { MV_VIEW_KINDS } from '../types.js';

const FENCE = /^```(mv-model|mv-view|mv-map)\s*$/m;

function lineNumberAt(source: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') n++;
  }
  return n;
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
 * 校验 mv-model：一张表 = 非空 columns + rows 中每行仅允许声明列，且非 nullable 列必须出现。
 */
function validateMvModel(obj: Record<string, unknown>): { ok: true; model: MvModelPayload } | { ok: false; message: string } {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { ok: false, message: 'mv-model: id must be a non-empty string' };
  }
  if ('title' in obj && obj.title !== undefined && typeof obj.title !== 'string') {
    return { ok: false, message: 'mv-model: title must be a string when present' };
  }

  const colsRaw = obj.columns;
  if (!Array.isArray(colsRaw) || colsRaw.length === 0) {
    return { ok: false, message: 'mv-model: columns must be a non-empty array (fixed table schema)' };
  }

  const names = new Set<string>();
  for (let i = 0; i < colsRaw.length; i++) {
    const c = colsRaw[i];
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      return { ok: false, message: `mv-model: columns[${i}] must be an object` };
    }
    const o = c as Record<string, unknown>;
    if (typeof o.name !== 'string' || !o.name.trim()) {
      return { ok: false, message: `mv-model: columns[${i}].name must be a non-empty string` };
    }
    if (names.has(o.name)) {
      return { ok: false, message: `mv-model: duplicate column name "${o.name}"` };
    }
    names.add(o.name);
  }

  const rowsRaw = obj.rows;
  if (!Array.isArray(rowsRaw)) {
    return { ok: false, message: 'mv-model: rows must be an array' };
  }

  for (let ri = 0; ri < rowsRaw.length; ri++) {
    const row = rowsRaw[ri];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, message: `mv-model: rows[${ri}] must be an object (one table row)` };
    }
    const r = row as Record<string, unknown>;
    for (const key of Object.keys(r)) {
      if (!names.has(key)) {
        return {
          ok: false,
          message: `mv-model: rows[${ri}] has unknown property "${key}" (not among declared columns)`,
        };
      }
    }
    for (const c of colsRaw as Array<Record<string, unknown>>) {
      const colName = c.name as string;
      const nullable = c.nullable === true;
      if (!(colName in r) && !nullable) {
        return { ok: false, message: `mv-model: rows[${ri}] missing required column "${colName}"` };
      }
    }
  }

  return { ok: true, model: obj as unknown as MvModelPayload };
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
    if (kind === 'mv-model') {
      const mv = validateMvModel(obj);
      if (!mv.ok) {
        errors.push({
          message: mv.message,
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = mv.model;
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

    if (payload) {
      blocks.push({
        kind,
        startLine: lineNumberAt(source, openStart),
        endLine: lineNumberAt(source, closeIdx),
        startOffset: openStart,
        innerStartOffset,
        innerEndOffset,
        endOffset,
        rawInner,
        payload,
      });
    }

    pos = endOffset;
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
  return source.slice(0, block.innerStartOffset) + formatted + source.slice(block.innerEndOffset);
}

export function getBlockFenceSlice(source: string, block: ParsedFenceBlock): string {
  return source.slice(block.startOffset, block.endOffset);
}
