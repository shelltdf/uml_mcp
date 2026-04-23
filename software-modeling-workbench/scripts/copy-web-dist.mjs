import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = path.join(root, 'apps', 'web', 'dist');
const dest = path.join(root, 'vscode-extension', 'media', 'app');

if (!fs.existsSync(src)) {
  console.error('Missing apps/web/dist. Run: npm run build');
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Copied web dist to vscode-extension/media/app');
