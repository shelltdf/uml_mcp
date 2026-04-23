import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const coreDist = path.join(root, 'packages', 'core', 'dist');
const mcpEntry = path.join(root, 'packages', 'mcp-server', 'src', 'server.ts');
const destDir = path.join(root, 'vscode-extension', 'media', 'mcp-server');
const destFile = path.join(destDir, 'server.cjs');

if (!fs.existsSync(coreDist)) {
  console.error('Missing packages/core/dist. Run: npm run build:mcp');
  process.exit(1);
}
if (!fs.existsSync(mcpEntry)) {
  console.error('Missing packages/mcp-server/src/server.ts');
  process.exit(1);
}

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(destDir, { recursive: true });

await build({
  entryPoints: [mcpEntry],
  outfile: destFile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: false,
});

console.log('Bundled MCP server to vscode-extension/media/mcp-server/server.cjs');
