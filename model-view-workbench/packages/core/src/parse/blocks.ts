import type { MvFenceKind, MvMapPayload, MvModelPayload, MvViewPayload, ParseMdResult, ParsedFenceBlock } from '../types.js';

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

function validateModel(v: Record<string, unknown>): boolean {
  return typeof v.id === 'string' && Array.isArray(v.columns) && Array.isArray(v.rows);
}

function validateView(v: Record<string, unknown>): boolean {
  return (
    typeof v.id === 'string' &&
    Array.isArray(v.modelRefs) &&
    v.modelRefs.every((x) => typeof x === 'string') &&
    (v.kind === 'table-readonly' || v.kind === 'mermaid-class')
  );
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
      if (!validateModel(obj)) {
        errors.push({
          message: 'mv-model: require id (string), columns (array), rows (array)',
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = obj as unknown as MvModelPayload;
      }
    } else if (kind === 'mv-view') {
      if (!validateView(obj)) {
        errors.push({
          message: 'mv-view: require id, kind (table-readonly|mermaid-class), modelRefs (string[])',
          line: lineNumberAt(source, innerStartOffset),
        });
      } else {
        payload = obj as unknown as MvViewPayload;
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
