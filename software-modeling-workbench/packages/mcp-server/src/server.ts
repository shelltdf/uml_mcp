import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { parseMarkdownBlocks } from '@mvwb/core';

const server = new McpServer({
  name: 'software-modeling-workbench-mcp-server',
  version: '0.1.0',
});

server.tool(
  'smw_parse_markdown_blocks',
  '解析 Markdown 中的 mv-* 围栏块，返回 blocks 与 errors。',
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
// Backward-compatible alias for existing clients.
server.tool(
  'parse_markdown_blocks',
  '解析 Markdown 中的 mv-* 围栏块，返回 blocks 与 errors。',
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
// Backward-compatible alias for existing clients.
server.tool(
  'health',
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
