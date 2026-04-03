#!/usr/bin/env node
/**
 * MCP stdio 服务器：供 Cursor / VS Code MCP 配置调用。
 * 配置示例（用户 settings.json）：
 * "mcp": { "servers": { "uml-workbench": { "command": "node", "args": ["<extensionPath>/mcp-server.mjs"] } } }
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'uml-workbench',
  version: '0.1.0',
});

server.registerTool(
  'ping',
  { description: '健康检查，返回 pong' },
  async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
