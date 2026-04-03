/**
 * 在已执行 `npm run build` 生成 dist 的前提下：
 * 同步 dist → vscode-extension/media/app，编译并打包 VSIX 到 ../out/
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const mediaApp = path.join(root, 'vscode-extension', 'media', 'app');
const extRoot = path.join(root, 'vscode-extension');
const outDir = path.join(root, 'out');

function run(cmd, args, cwd = root, opts = {}) {
  const useShell =
    opts.shell ??
    (process.platform === 'win32' && (cmd === 'npm' || cmd === 'npx'));
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: useShell });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  rmrf(dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

console.log('[build-all] syncing dist → vscode-extension/media/app ...');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html missing. Run: npm run build');
  process.exit(1);
}
copyDir(dist, mediaApp);

console.log('[build-all] vscode-extension: npm install');
run('npm', ['install'], extRoot);

console.log('[build-all] tsc');
run('npm', ['run', 'compile'], extRoot);

fs.mkdirSync(outDir, { recursive: true });
const vsixOut = path.join(outDir, 'uml-workbench.vsix');
console.log('[build-all] vsce package →', vsixOut);
// 使用仓库根 node_modules 的 vsce CLI，避免在 vscode-extension 内安装 vsce 引发依赖解析问题
const vsceCli = path.join(root, 'node_modules', '@vscode', 'vsce', 'vsce');
run(process.execPath, [vsceCli, 'package', '--out', vsixOut, '--allow-missing-repository', '--skip-license'], extRoot, { shell: false });

console.log('[build-all] done. Web: dist/  Electron: npm run electron  VSIX:', vsixOut);
