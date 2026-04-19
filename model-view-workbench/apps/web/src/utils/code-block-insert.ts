import type { MvViewKind, MvViewPayload } from '@mvwb/core';
import { MV_VIEW_KIND_METADATA, isMermaidViewKind, parseMarkdownBlocks, resolveRefPath } from '@mvwb/core';

/** 可通过「插入代码块」对话框插入的围栏类型（各 mv-model* 或各 mv-view kind） */
export type InsertCodeBlockKind = MvViewKind | 'mv-model' | 'mv-model-kv' | 'mv-model-struct';

export interface InsertFenceContext {
  /** 当前 view 将写入的 .md 工作区相对路径（用于生成 ref: 示例路径） */
  currentFileRel: string;
  /** 当前文档全文（用于探测同文件已有 mv-model） */
  currentMarkdown: string;
}

function newBlockId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 为新建 mv-view 推断默认 modelRefs：优先同文件首张表；否则给出 ref: 模板（相对当前文件目录） */
export function inferDefaultModelRefs(ctx: InsertFenceContext): string[] {
  const { blocks } = parseMarkdownBlocks(ctx.currentMarkdown);
  const ids = blocks.filter((b) => b.kind === 'mv-model').map((b) => (b.payload as { id: string }).id);
  if (ids.length) return [ids[0]!];
  const rel = ctx.currentFileRel.replace(/\\/g, '/');
  const targetRel = resolveRefPath(rel, 'models.md');
  return [`ref:${targetRel}#YOUR_MV_MODEL_ID`];
}

/** 在光标处插入的围栏 Markdown（前后各留空行，便于解析） */
export function buildFenceMarkdownForInsert(kind: InsertCodeBlockKind, ctx: InsertFenceContext): string {
  if (kind === 'mv-model') {
    const id = newBlockId('m');
    const body = {
      id,
      title: '新表',
      columns: [{ name: 'id', type: 'string' }],
      rows: [{ id: '1' }],
    };
    return `\n\n\`\`\`mv-model\n${JSON.stringify(body, null, 2)}\n\`\`\`\n\n`;
  }
  if (kind === 'mv-model-kv') {
    const id = newBlockId('kv');
    const body = {
      id,
      title: '新 KV 文档集',
      documents: [{ _id: '1', note: '示例文档，键可自由增删' }],
    };
    return `\n\n\`\`\`mv-model-kv\n${JSON.stringify(body, null, 2)}\n\`\`\`\n\n`;
  }
  if (kind === 'mv-model-struct') {
    const id = newBlockId('st');
    const body = {
      id,
      title: '新层次结构',
      root: {
        name: '/',
        attributes: { format: 'mv-model-struct v1' },
        groups: [{ name: 'run0', datasets: [{ name: 'values', dtype: 'float64', data: [1, 2, 3] }] }],
      },
    };
    return `\n\n\`\`\`mv-model-struct\n${JSON.stringify(body, null, 2)}\n\`\`\`\n\n`;
  }
  const id = newBlockId('v');
  const meta = MV_VIEW_KIND_METADATA[kind];
  const ph = meta.payloadPlaceholder;
  const skipPayload = ph.startsWith('（');
  const title =
    kind === 'table-readonly'
      ? '新只读表视图'
      : meta.canvasTitle.replace(/画布$/, '').trim() || meta.canvasTitle;

  const obj: MvViewPayload = {
    id,
    kind,
    modelRefs: inferDefaultModelRefs(ctx),
    title,
  };
  if (!skipPayload && ph && !ph.startsWith('（')) {
    obj.payload = ph;
  }
  const inner = JSON.stringify(obj, null, 2);
  const mvFence = `\n\n\`\`\`mv-view\n${inner}\n\`\`\`\n\n`;
  if (isMermaidViewKind(kind)) {
    const pl = typeof obj.payload === 'string' ? obj.payload : '';
    if (pl.trim()) {
      return `${mvFence}\`\`\`mermaid\n${pl}\n\`\`\`\n\n`;
    }
  }
  return mvFence;
}
