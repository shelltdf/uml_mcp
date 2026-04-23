/**
 * Electron shell: load Vite build from ../web/dist, optional workspace on disk.
 */
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

/** @type {string | null} */
let workspaceRoot = null;

function isPathInsideRoot(rootDir, absFile) {
  const root = path.resolve(rootDir);
  const abs = path.resolve(absFile);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  return abs === root || abs.startsWith(prefix);
}

function collectMarkdownFiles(rootDir) {
  /** @type {Record<string, string>} */
  const out = {};
  function walk(dir, relBase) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const rel = relBase ? `${relBase}/${ent.name}` : ent.name;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(abs, rel);
      else if (ent.isFile() && ent.name.endsWith('.md')) {
        try {
          out[rel] = fs.readFileSync(abs, 'utf8');
        } catch {
          /* skip */
        }
      }
    }
  }
  walk(rootDir, '');
  return out;
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const indexHtml = path.join(__dirname, '..', 'web', 'dist', 'index.html');
  win.loadFile(indexHtml);
  return win;
}

function createBlockWindow(relPath, blockId, mode) {
  const isCanvas = mode === 'canvas';
  const win = new BrowserWindow({
    width: isCanvas ? 1280 : 720,
    height: isCanvas ? 860 : 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const indexHtml = path.join(__dirname, '..', 'web', 'dist', 'index.html');
  const u = pathToFileURL(indexHtml);
  if (isCanvas) {
    u.searchParams.set('mvwb_canvas', '1');
  } else {
    u.searchParams.set('mvwb_block', '1');
  }
  u.searchParams.set('path', relPath);
  u.searchParams.set('blockId', blockId);
  win.loadURL(u.href);
  return win;
}

app.whenReady().then(() => {
  ipcMain.handle('mvwb:pickWorkspace', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    workspaceRoot = r.filePaths[0];
    return { root: workspaceRoot, files: collectMarkdownFiles(workspaceRoot) };
  });

  ipcMain.handle('mvwb:readFile', async (_e, relPath) => {
    if (!workspaceRoot) throw new Error('no_workspace');
    const abs = path.join(workspaceRoot, relPath);
    if (!isPathInsideRoot(workspaceRoot, abs)) throw new Error('path_escape');
    return fs.readFileSync(abs, 'utf8');
  });

  ipcMain.handle('mvwb:writeFile', async (_e, relPath, text) => {
    if (!workspaceRoot) throw new Error('no_workspace');
    const abs = path.join(workspaceRoot, relPath);
    if (!isPathInsideRoot(workspaceRoot, abs)) throw new Error('path_escape');
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, 'utf8');
    return true;
  });

  ipcMain.handle('mvwb:openMarkdownInWorkspace', async () => {
    if (!workspaceRoot) return { error: 'no_workspace' };
    const r = await dialog.showOpenDialog({
      title: '打开 Markdown',
      defaultPath: workspaceRoot,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const abs = r.filePaths[0];
    if (!isPathInsideRoot(workspaceRoot, abs)) return { error: 'outside_workspace' };
    const rel = path.relative(workspaceRoot, abs).split(path.sep).join('/');
    const text = fs.readFileSync(abs, 'utf8');
    return { relPath: rel, text };
  });

  ipcMain.handle('mvwb:saveFileAs', async (_e, curRelPath, text) => {
    if (!workspaceRoot) return { error: 'no_workspace' };
    const suggested = path.join(workspaceRoot, curRelPath || 'untitled.md');
    const r = await dialog.showSaveDialog({
      title: '另存为',
      defaultPath: suggested,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (r.canceled || !r.filePath) return null;
    const abs = r.filePath;
    if (!isPathInsideRoot(workspaceRoot, abs)) return { error: 'outside_workspace' };
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, 'utf8');
    const rel = path.relative(workspaceRoot, abs).split(path.sep).join('/');
    return { relPath: rel };
  });

  ipcMain.on('mvwb:openBlock', (_e, relPath, blockId) => {
    createBlockWindow(relPath, blockId, 'json');
  });

  ipcMain.on('mvwb:openBlockCanvas', (_e, relPath, blockId) => {
    createBlockWindow(relPath, blockId, 'canvas');
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
