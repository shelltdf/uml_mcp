import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseMarkdownBlocks, replaceBlockInnerById, type MvFenceKind } from '@smw/core';

const server = new McpServer({
  name: 'software-modeling-workbench-mcp-server',
  version: '0.1.0',
});

type ToolTextResult = {
  content: Array<{ type: 'text'; text: string }>;
};

function asTextResult(payload: unknown): ToolTextResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function ensureWorkspaceRoot(workspaceRoot: string): string {
  const abs = path.resolve(workspaceRoot);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    throw new Error(`workspace_root not found or not a directory: ${workspaceRoot}`);
  }
  return abs;
}

function resolveInsideWorkspace(workspaceRoot: string, relPath: string): string {
  const root = ensureWorkspaceRoot(workspaceRoot);
  const abs = path.resolve(root, relPath);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (abs !== root && !abs.startsWith(rootWithSep)) {
    throw new Error(`path escapes workspace_root: ${relPath}`);
  }
  return abs;
}

function toRelWorkspacePath(workspaceRoot: string, absPath: string): string {
  return path.relative(workspaceRoot, absPath).split(path.sep).join('/');
}

function listMarkdownFiles(root: string, under: string): string[] {
  const base = resolveInsideWorkspace(root, under);
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) return [];
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
        out.push(toRelWorkspacePath(root, abs));
      }
    }
  };
  walk(base);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function normalizePayloadJson(payloadJson: string | Record<string, unknown>): string {
  if (typeof payloadJson === 'string') {
    const parsed = JSON.parse(payloadJson) as unknown;
    return `${JSON.stringify(parsed, null, 2)}\n`;
  }
  return `${JSON.stringify(payloadJson, null, 2)}\n`;
}

function buildFence(kind: string, payloadJsonPretty: string): string {
  const body = payloadJsonPretty.endsWith('\n') ? payloadJsonPretty : `${payloadJsonPretty}\n`;
  return `\`\`\`${kind}\n${body}\`\`\`\n`;
}

const SMW_KIND_TO_MV_KIND: Record<string, string> = {
  'smw-model-sql': 'smw-model-sql',
  'smw-model-kv': 'smw-model-kv',
  'smw-model-struct': 'smw-model-struct',
  'smw-model-codespace': 'smw-model-codespace',
  'smw-model-interface': 'smw-model-interface',
  'smw-view': 'smw-view',
  'smw-map': 'smw-map',
};

function normalizeFenceKind(kind: string): string {
  const trimmed = kind.trim();
  return SMW_KIND_TO_MV_KIND[trimmed] ?? trimmed;
}

function readParsedMarkdownFile(workspaceRoot: string, relPath: string): {
  abs: string;
  source: string;
  parsed: ReturnType<typeof parseMarkdownBlocks>;
} {
  const abs = resolveInsideWorkspace(workspaceRoot, relPath);
  const source = fs.readFileSync(abs, 'utf8');
  return { abs, source, parsed: parseMarkdownBlocks(source) };
}

function saveBlockPayloadById(source: string, blockId: string, payloadObj: unknown): string {
  const pretty = `${JSON.stringify(payloadObj, null, 2)}\n`;
  const next = replaceBlockInnerById(source, blockId, pretty);
  if (!next) throw new Error(`block not found: ${blockId}`);
  return next;
}

function parseJsonPath(pathExpr: string): Array<string | number> {
  const src = pathExpr.trim();
  if (!src) throw new Error('json_path is empty');
  const raw = src.startsWith('/') ? src.slice(1).split('/') : src.split('.');
  return raw.filter((x) => x.length > 0).map((seg) => {
    const n = Number(seg);
    return Number.isInteger(n) && String(n) === seg ? n : seg;
  });
}

function setByPath(root: unknown, pathExpr: string, value: unknown): unknown {
  const toks = parseJsonPath(pathExpr);
  if (toks.length === 0) return value;
  const cloned = structuredClone(root) as Record<string, unknown>;
  let cur: unknown = cloned;
  for (let i = 0; i < toks.length - 1; i++) {
    const key = toks[i]!;
    const nextKey = toks[i + 1]!;
    if (typeof key === 'number') {
      if (!Array.isArray(cur)) throw new Error(`json_path expects array at segment ${i}`);
      if (cur[key] === undefined) cur[key] = typeof nextKey === 'number' ? [] : {};
      cur = cur[key];
    } else {
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) throw new Error(`json_path expects object at segment ${i}`);
      const obj = cur as Record<string, unknown>;
      if (obj[key] === undefined) obj[key] = typeof nextKey === 'number' ? [] : {};
      cur = obj[key];
    }
  }
  const last = toks[toks.length - 1]!;
  if (typeof last === 'number') {
    if (!Array.isArray(cur)) throw new Error('json_path final segment expects array');
    cur[last] = value;
  } else {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) throw new Error('json_path final segment expects object');
    (cur as Record<string, unknown>)[last] = value;
  }
  return cloned;
}

type BlockOpResult = {
  op_index: number;
  rel_path: string;
  block_id?: string;
  action: string;
  ok: boolean;
  message?: string;
};

server.tool(
  'smw_parse_markdown_blocks',
  '解析 Markdown 中的 smw-* 围栏块，返回 blocks 与 errors。',
  {
    markdown: z.string().describe('完整 Markdown 文本'),
  },
  async ({ markdown }) => {
    const result = parseMarkdownBlocks(markdown);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.tool(
  'smw_ls_md',
  '递归列出工作区内 Markdown 文件相对路径。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    under: z.string().optional().describe('可选子目录（相对工作区根），默认 "."'),
  },
  async ({ workspace_root, under }) => {
    const root = ensureWorkspaceRoot(workspace_root);
    const files = listMarkdownFiles(root, under ?? '.');
    return asTextResult({ workspace_root: root, count: files.length, files });
  },
);

server.tool(
  'smw_read_text',
  '读取工作区内文本文件内容。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_path: z.string().describe('相对工作区根的文件路径'),
  },
  async ({ workspace_root, rel_path }) => {
    const abs = resolveInsideWorkspace(workspace_root, rel_path);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      throw new Error(`file not found: ${rel_path}`);
    }
    const text = fs.readFileSync(abs, 'utf8');
    return asTextResult({ rel_path, bytes: Buffer.byteLength(text, 'utf8'), text });
  },
);

server.tool(
  'smw_write_text',
  '写入工作区内文本文件（可创建父目录）。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_path: z.string().describe('相对工作区根的文件路径'),
    text: z.string().describe('完整文本内容'),
    create_dirs: z.boolean().optional().describe('是否自动创建父目录，默认 true'),
  },
  async ({ workspace_root, rel_path, text, create_dirs }) => {
    const abs = resolveInsideWorkspace(workspace_root, rel_path);
    if (create_dirs ?? true) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
    }
    fs.writeFileSync(abs, text, 'utf8');
    return asTextResult({
      rel_path,
      bytes: Buffer.byteLength(text, 'utf8'),
      ok: true,
    });
  },
);

server.tool(
  'smw_read_blocks',
  '解析工作区内 Markdown 文件中的 mv-* 围栏块。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_path: z.string().describe('相对工作区根的 Markdown 文件路径'),
  },
  async ({ workspace_root, rel_path }) => {
    const abs = resolveInsideWorkspace(workspace_root, rel_path);
    const source = fs.readFileSync(abs, 'utf8');
    const result = parseMarkdownBlocks(source);
    return asTextResult({
      rel_path,
      block_count: result.blocks.length,
      error_count: result.errors.length,
      result,
    });
  },
);

server.tool(
  'smw_read_blocks_batch',
  '批量解析多个 Markdown 文件中的 mv-* 围栏块，减少多次往返调用。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_paths: z.array(z.string()).min(1).max(100).describe('相对工作区根的 Markdown 文件路径数组'),
    include_payload: z
      .boolean()
      .optional()
      .describe('是否返回完整 payload（默认 true；仅要目录时可传 false 以减少响应体积）'),
  },
  async ({ workspace_root, rel_paths, include_payload }) => {
    const root = ensureWorkspaceRoot(workspace_root);
    const wantPayload = include_payload ?? true;
    const files = rel_paths.map((p) => {
      const abs = resolveInsideWorkspace(root, p);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        return { rel_path: p, error: 'file_not_found' as const };
      }
      const source = fs.readFileSync(abs, 'utf8');
      const parsed = parseMarkdownBlocks(source);
      const blocks = parsed.blocks.map((b) => ({
        kind: b.kind,
        id: b.payload.id,
        startLine: b.startLine,
        endLine: b.endLine,
        ...(wantPayload ? { payload: b.payload } : {}),
      }));
      return {
        rel_path: p,
        block_count: parsed.blocks.length,
        error_count: parsed.errors.length,
        blocks,
        errors: parsed.errors,
      };
    });
    return asTextResult({
      workspace_root: root,
      file_count: files.length,
      include_payload: wantPayload,
      files,
    });
  },
);

server.tool(
  'smw_set_block_json',
  '按 block id 更新围栏块 JSON 内文（自动格式化）。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_path: z.string().describe('相对工作区根的 Markdown 文件路径'),
    block_id: z.string().describe('目标 block id'),
    payload_json: z.union([z.string(), z.record(z.string(), z.unknown())]).describe('新 JSON（字符串或对象）'),
  },
  async ({ workspace_root, rel_path, block_id, payload_json }) => {
    const abs = resolveInsideWorkspace(workspace_root, rel_path);
    const source = fs.readFileSync(abs, 'utf8');
    const pretty = normalizePayloadJson(payload_json);
    const next = replaceBlockInnerById(source, block_id, pretty);
    if (!next) {
      throw new Error(`block not found: ${block_id}`);
    }
    fs.writeFileSync(abs, next, 'utf8');
    const parsed = parseMarkdownBlocks(next);
    const updated = parsed.blocks.find((b) => b.payload.id === block_id) ?? null;
    return asTextResult({ rel_path, block_id, ok: true, updated });
  },
);

server.tool(
  'smw_add_block_json',
  '新增一个 mv-* 围栏块（追加到文末）。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_path: z.string().describe('相对工作区根的 Markdown 文件路径'),
    kind: z.string().describe('围栏类型，如 smw-view / smw-model-sql'),
    payload_json: z.union([z.string(), z.record(z.string(), z.unknown())]).describe('JSON（字符串或对象）'),
  },
  async ({ workspace_root, rel_path, kind, payload_json }) => {
    const abs = resolveInsideWorkspace(workspace_root, rel_path);
    const source = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    const pretty = normalizePayloadJson(payload_json);
    const normalizedKind = normalizeFenceKind(kind);
    const trimmed = source.trimEnd();
    const sep = trimmed.length > 0 ? '\n\n' : '';
    const next = `${trimmed}${sep}${buildFence(normalizedKind as MvFenceKind, pretty)}`;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, next, 'utf8');
    const parsed = parseMarkdownBlocks(next);
    const id = (() => {
      try {
        return typeof payload_json === 'string'
          ? (JSON.parse(payload_json) as { id?: unknown }).id
          : payload_json.id;
      } catch {
        return undefined;
      }
    })();
    const block = id ? parsed.blocks.find((b) => b.payload.id === String(id)) : null;
    return asTextResult({
      rel_path,
      kind: normalizedKind,
      kind_input: kind,
      block_id: id ?? null,
      ok: true,
      block,
      block_count: parsed.blocks.length,
    });
  },
);

server.tool(
  'smw_del_block',
  '按 block id 删除围栏块。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_path: z.string().describe('相对工作区根的 Markdown 文件路径'),
    block_id: z.string().describe('目标 block id'),
  },
  async ({ workspace_root, rel_path, block_id }) => {
    const abs = resolveInsideWorkspace(workspace_root, rel_path);
    const source = fs.readFileSync(abs, 'utf8');
    const parsed = parseMarkdownBlocks(source);
    const hit = parsed.blocks.find((b) => b.payload.id === block_id);
    if (!hit) {
      throw new Error(`block not found: ${block_id}`);
    }
    let next = source.slice(0, hit.startOffset) + source.slice(hit.endOffset);
    next = next.replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(abs, next, 'utf8');
    const reparsed = parseMarkdownBlocks(next);
    return asTextResult({
      rel_path,
      block_id,
      ok: true,
      block_count: reparsed.blocks.length,
    });
  },
);

const blockOpSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_json'),
    rel_path: z.string(),
    block_id: z.string(),
    payload_json: z.union([z.string(), z.record(z.string(), z.unknown())]),
  }),
  z.object({
    action: z.literal('patch_path'),
    rel_path: z.string(),
    block_id: z.string(),
    json_path: z.string(),
    value: z.unknown(),
  }),
  z.object({
    action: z.literal('add_json'),
    rel_path: z.string(),
    kind: z.string(),
    payload_json: z.union([z.string(), z.record(z.string(), z.unknown())]),
  }),
  z.object({
    action: z.literal('delete_block'),
    rel_path: z.string(),
    block_id: z.string(),
  }),
]);

server.tool(
  'smw_apply_block_ops',
  '批量执行 block 操作（set_json / patch_path / add_json / delete_block），按文件合并读写以提高效率。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    ops: z.array(blockOpSchema).min(1).max(200).describe('操作数组，按给定顺序执行'),
  },
  async ({ workspace_root, ops }) => {
    const root = ensureWorkspaceRoot(workspace_root);
    const fileCache = new Map<string, { abs: string; source: string; touched: boolean }>();
    const getFile = (relPath: string) => {
      const key = relPath;
      const existing = fileCache.get(key);
      if (existing) return existing;
      const abs = resolveInsideWorkspace(root, relPath);
      const source = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
      const item = { abs, source, touched: false };
      fileCache.set(key, item);
      return item;
    };

    const results: BlockOpResult[] = [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i]!;
      try {
        const file = getFile(op.rel_path);
        if (op.action === 'set_json') {
          const pretty = normalizePayloadJson(op.payload_json);
          const next = replaceBlockInnerById(file.source, op.block_id, pretty);
          if (!next) throw new Error(`block not found: ${op.block_id}`);
          file.source = next;
          file.touched = true;
          results.push({ op_index: i, rel_path: op.rel_path, block_id: op.block_id, action: op.action, ok: true });
          continue;
        }
        if (op.action === 'patch_path') {
          const parsed = parseMarkdownBlocks(file.source);
          const hit = parsed.blocks.find((b) => b.payload.id === op.block_id);
          if (!hit) throw new Error(`block not found: ${op.block_id}`);
          const payloadObj = structuredClone(hit.payload) as unknown as Record<string, unknown>;
          const patched = setByPath(payloadObj, op.json_path, op.value);
          const next = saveBlockPayloadById(file.source, op.block_id, patched);
          file.source = next;
          file.touched = true;
          results.push({ op_index: i, rel_path: op.rel_path, block_id: op.block_id, action: op.action, ok: true });
          continue;
        }
        if (op.action === 'add_json') {
          const pretty = normalizePayloadJson(op.payload_json);
          const normalizedKind = normalizeFenceKind(op.kind);
          const trimmed = file.source.trimEnd();
          const sep = trimmed.length > 0 ? '\n\n' : '';
          file.source = `${trimmed}${sep}${buildFence(normalizedKind as MvFenceKind, pretty)}`;
          file.touched = true;
          results.push({
            op_index: i,
            rel_path: op.rel_path,
            action: `${op.action}:${normalizedKind}`,
            ok: true,
          });
          continue;
        }
        if (op.action === 'delete_block') {
          const parsed = parseMarkdownBlocks(file.source);
          const hit = parsed.blocks.find((b) => b.payload.id === op.block_id);
          if (!hit) throw new Error(`block not found: ${op.block_id}`);
          let next = file.source.slice(0, hit.startOffset) + file.source.slice(hit.endOffset);
          next = next.replace(/\n{3,}/g, '\n\n');
          file.source = next;
          file.touched = true;
          results.push({ op_index: i, rel_path: op.rel_path, block_id: op.block_id, action: op.action, ok: true });
          continue;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          op_index: i,
          rel_path: op.rel_path,
          block_id: 'block_id' in op ? op.block_id : undefined,
          action: op.action,
          ok: false,
          message,
        });
      }
    }

    let written_files = 0;
    for (const [relPath, item] of fileCache.entries()) {
      if (!item.touched) continue;
      fs.mkdirSync(path.dirname(item.abs), { recursive: true });
      fs.writeFileSync(item.abs, item.source, 'utf8');
      written_files += 1;
      const finalParsed = parseMarkdownBlocks(item.source);
      results.push({
        op_index: -1,
        rel_path: relPath,
        action: 'final_parse',
        ok: true,
        message: `block_count=${finalParsed.blocks.length}, error_count=${finalParsed.errors.length}`,
      });
    }

    const success = results.filter((r) => r.op_index >= 0 && r.ok).length;
    const failed = results.filter((r) => r.op_index >= 0 && !r.ok).length;
    return asTextResult({
      workspace_root: root,
      op_count: ops.length,
      success,
      failed,
      written_files,
      results,
    });
  },
);

server.tool(
  'smw_patch_block_json_path',
  '按 json_path 更新某个 block payload 的局部字段。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_path: z.string().describe('相对工作区根的 Markdown 文件路径'),
    block_id: z.string().describe('目标 block id'),
    json_path: z.string().describe('路径，如 payload.kind / tables.0.columns.1.name / /tables/0/id'),
    value: z.unknown().describe('要写入的新值'),
  },
  async ({ workspace_root, rel_path, block_id, json_path, value }) => {
    const { abs, source, parsed } = readParsedMarkdownFile(workspace_root, rel_path);
    const hit = parsed.blocks.find((b) => b.payload.id === block_id);
    if (!hit) throw new Error(`block not found: ${block_id}`);
    const payloadObj = structuredClone(hit.payload) as unknown as Record<string, unknown>;
    const patched = setByPath(payloadObj, json_path, value);
    const next = saveBlockPayloadById(source, block_id, patched);
    fs.writeFileSync(abs, next, 'utf8');
    return asTextResult({ rel_path, block_id, json_path, ok: true });
  },
);

server.tool(
  'smw_sql_upsert_row',
  '针对 smw-model-sql：新增或替换指定子表的一行。',
  {
    workspace_root: z.string().describe('工作区根目录绝对路径'),
    rel_path: z.string().describe('相对工作区根的 Markdown 文件路径'),
    block_id: z.string().describe('smw-model-sql block id'),
    table_id: z.string().describe('子表 id'),
    row: z.record(z.string(), z.unknown()).describe('行对象'),
    row_index: z.number().int().min(0).optional().describe('可选：替换的行下标；不传则追加'),
  },
  async ({ workspace_root, rel_path, block_id, table_id, row, row_index }) => {
    const { abs, source, parsed } = readParsedMarkdownFile(workspace_root, rel_path);
    const hit = parsed.blocks.find((b) => b.payload.id === block_id);
    if (!hit || hit.kind !== 'smw-model-sql') throw new Error(`smw-model-sql block not found: ${block_id}`);
    const payloadObj = structuredClone(hit.payload) as {
      tables?: Array<{ id?: string; rows?: Array<Record<string, unknown>> }>;
    };
    const tables = payloadObj.tables;
    if (!Array.isArray(tables)) throw new Error('invalid smw-model-sql payload: tables missing');
    const table = tables.find((t) => t?.id === table_id);
    if (!table) throw new Error(`table not found: ${table_id}`);
    if (!Array.isArray(table.rows)) table.rows = [];
    if (row_index === undefined) {
      table.rows.push(row);
    } else {
      if (row_index >= table.rows.length) throw new Error(`row_index out of range: ${row_index}`);
      table.rows[row_index] = row;
    }
    const next = saveBlockPayloadById(source, block_id, payloadObj);
    fs.writeFileSync(abs, next, 'utf8');
    return asTextResult({
      rel_path,
      block_id,
      table_id,
      row_index: row_index ?? table.rows.length - 1,
      row_count: table.rows.length,
      ok: true,
    });
  },
);

server.tool(
  'smw_health',
  '健康检查，用于确认 MCP 服务已启动。',
  {},
  async () => ({
    content: [
      {
        type: 'text',
        text: 'ok',
      },
    ],
  }),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
