/**
 * mv-view「modelRefs」选取：枚举某份 Markdown 内全部 mv-model-* 围栏并生成约定地址串。
 */
import {
  normalizeRelPath,
  parseMarkdownBlocks,
  parseRefUri,
  resolveRefPath,
  type MvFenceKind,
  type MvModelSqlPayload,
} from '@mvwb/core';

export type ModelRefCandidate = {
  /** 展示用 */
  label: string;
  /** 写入 modelRefs[] 的串（同文件或完整 ref:） */
  value: string;
  blockId: string;
  fenceKind: MvFenceKind;
  /** 仅 mv-model-sql 多表时有值 */
  tableId?: string;
};

const MODEL_KINDS: ReadonlySet<MvFenceKind> = new Set([
  'mv-model-sql',
  'mv-model-kv',
  'mv-model-struct',
  'mv-model-codespace',
  'mv-model-interface',
]);

/** 从 ``fromFileRel`` 所在目录到 ``toFileRel`` 的相对路径（posix，不含前导 ./） */
export function relativePathFromFileToFile(fromFileRel: string, toFileRel: string): string {
  const norm = (p: string) => normalizeRelPath(p.replace(/\\/g, '/'));
  const a = norm(fromFileRel);
  const b = norm(toFileRel);
  if (a === b) return '';
  const fromParts = a.split('/').filter(Boolean);
  const toParts = b.split('/').filter(Boolean);
  fromParts.pop();
  let i = 0;
  const max = Math.min(fromParts.length, toParts.length);
  while (i < max && fromParts[i] === toParts[i]) i += 1;
  const ups = fromParts.length - i;
  const down = toParts.slice(i);
  const out = [...Array(ups).fill('..'), ...down].join('/');
  return norm(out);
}

/**
 * 枚举 markdown 中所有可绑定的 model 项（不含 mv-view / mv-map）。
 */
export function listModelRefCandidates(markdown: string): ModelRefCandidate[] {
  const { blocks } = parseMarkdownBlocks(markdown);
  const out: ModelRefCandidate[] = [];
  for (const b of blocks) {
    if (!MODEL_KINDS.has(b.kind)) continue;
    const id = b.payload.id;
    if (b.kind === 'mv-model-sql') {
      const p = b.payload as MvModelSqlPayload;
      const tables = p.tables ?? [];
      const isSingle = tables.length === 1;
      for (const t of tables) {
        out.push({
          label: `mv-model-sql · ${id} · 表 ${t.id}`,
          value: isSingle ? id : `${id}#${t.id}`,
          blockId: id,
          fenceKind: b.kind,
          tableId: isSingle ? undefined : t.id,
        });
      }
      continue;
    }
    const kindLabel = b.kind.replace('mv-model-', '');
    out.push({
      label: `${b.kind} · ${id}`,
      value: id,
      blockId: id,
      fenceKind: b.kind,
    });
  }
  return out;
}

/**
 * 生成一条 modelRef 串。
 * @param viewFileRel 当前 mv-view 所在 .md（工作区相对路径）
 * @param targetFileRel 目标 model 所在 .md（已解析的绝对相对路径）；与 view 相同时走同文件简写
 * @param blockId 围栏块 id
 * @param tableId sql 子表 id；其它 kind 忽略
 */
export function buildModelRefString(
  viewFileRel: string,
  targetFileRel: string,
  blockId: string,
  tableId?: string,
): string {
  const viewN = normalizeRelPath(viewFileRel.replace(/\\/g, '/'));
  const targetN = normalizeRelPath(targetFileRel.replace(/\\/g, '/'));
  if (viewN === targetN) {
    if (tableId?.trim()) return `${blockId}#${tableId.trim()}`;
    return blockId;
  }
  const rel = relativePathFromFileToFile(viewN, targetN);
  const pathSeg = rel || '.';
  if (tableId?.trim()) return `ref:${pathSeg}#${blockId}#${tableId.trim()}`;
  return `ref:${pathSeg}#${blockId}`;
}

/**
 * 将用户在「相对路径」框中输入的路径（相对于 view 所在目录）解析为目标 .md 在工作区中的相对路径。
 */
export function resolvePickerTargetFileRel(viewFileRel: string, pathRelativeToViewDir: string): string {
  const raw = pathRelativeToViewDir.trim();
  if (!raw) return normalizeRelPath(viewFileRel.replace(/\\/g, '/'));
  return resolveRefPath(normalizeRelPath(viewFileRel.replace(/\\/g, '/')), raw);
}

/**
 * 从已有 modelRefs 猜测路径框初始值：取首条 `ref:` 中文件段，转为相对 view 目录的路径；否则空串。
 */
export function inferPickerPathFromModelRefs(modelRefs: string[], viewFileRel: string): string {
  for (const r of modelRefs) {
    const p = parseRefUri(r);
    if (!p) continue;
    const viewN = normalizeRelPath(viewFileRel.replace(/\\/g, '/'));
    const absTarget = resolveRefPath(viewN, p.fileRel);
    const rel = relativePathFromFileToFile(viewN, absTarget);
    return rel;
  }
  return '';
}
