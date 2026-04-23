/// <reference types="vscode" />
/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  let panel: vscode.WebviewPanel | undefined;
  let lastDialogDir: vscode.Uri | undefined;

  const openPanel = (): void => {
    if (panel) {
      panel.reveal(vscode.ViewColumn.One);
      return;
    }

    panel = vscode.window.createWebviewPanel('softwareModelingWorkbench', 'Software Modeling Workbench', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media', 'app')],
    });
    panel.onDidDispose(() => {
      panel = undefined;
    });

    const currentPanel = panel;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!lastDialogDir && workspaceFolder) {
      lastDialogDir = workspaceFolder.uri;
    }
    const toWorkspaceRelPath = (u: vscode.Uri): string | null => {
      if (!workspaceFolder) return null;
      const ws = workspaceFolder.uri.fsPath.replace(/\\/g, '/').toLowerCase();
      const fp = u.fsPath.replace(/\\/g, '/').toLowerCase();
      if (!(fp === ws || fp.startsWith(`${ws}/`))) return null;
      return vscode.workspace.asRelativePath(u, false).replace(/\\/g, '/');
    };
    currentPanel.webview.onDidReceiveMessage(
      async (msg: unknown) => {
        const m = msg as { type?: string; reqId?: string; path?: string; text?: string };
        if (!m?.type) return;
        if (m.type === 'smw:vscode:pickOpenFile') {
          const reqId = m.reqId ?? '';
          if (!reqId) return;
          if (!workspaceFolder) {
            currentPanel.webview.postMessage({
              type: 'smw:vscode:pickOpenFile:result',
              reqId,
              ok: false,
              error: '未打开工作区文件夹。',
            });
            return;
          }
          try {
            const picked = await vscode.window.showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              canSelectMany: false,
              defaultUri: lastDialogDir ?? workspaceFolder.uri,
              filters: { Markdown: ['md'] },
              title: 'Open Markdown',
            });
            const file = picked?.[0];
            if (!file) {
              currentPanel.webview.postMessage({ type: 'smw:vscode:pickOpenFile:result', reqId, ok: false, aborted: true });
              return;
            }
            const relPath = toWorkspaceRelPath(file);
            if (!relPath) {
              currentPanel.webview.postMessage({
                type: 'smw:vscode:pickOpenFile:result',
                reqId,
                ok: false,
                error: '仅支持打开当前工作区内文件。',
              });
              return;
            }
            const bytes = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(bytes).toString('utf8');
            lastDialogDir = vscode.Uri.file(path.dirname(file.fsPath));
            currentPanel.webview.postMessage({
              type: 'smw:vscode:pickOpenFile:result',
              reqId,
              ok: true,
              path: relPath,
              text,
            });
          } catch (e) {
            currentPanel.webview.postMessage({
              type: 'smw:vscode:pickOpenFile:result',
              reqId,
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
          return;
        }
        if (m.type === 'smw:vscode:pickSavePath') {
          const reqId = m.reqId ?? '';
          if (!reqId) return;
          if (!workspaceFolder) {
            currentPanel.webview.postMessage({
              type: 'smw:vscode:pickSavePath:result',
              reqId,
              ok: false,
              error: '未打开工作区文件夹。',
            });
            return;
          }
          try {
            const suggested = (m.path ?? 'untitled.md').replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
            const defaultUri = vscode.Uri.joinPath(lastDialogDir ?? workspaceFolder.uri, suggested);
            const picked = await vscode.window.showSaveDialog({
              defaultUri,
              filters: { Markdown: ['md'] },
              title: 'Save Markdown As',
            });
            if (!picked) {
              currentPanel.webview.postMessage({ type: 'smw:vscode:pickSavePath:result', reqId, ok: false, aborted: true });
              return;
            }
            const relPath = toWorkspaceRelPath(picked);
            if (!relPath) {
              currentPanel.webview.postMessage({
                type: 'smw:vscode:pickSavePath:result',
                reqId,
                ok: false,
                error: '仅支持保存到当前工作区内。',
              });
              return;
            }
            lastDialogDir = vscode.Uri.file(path.dirname(picked.fsPath));
            currentPanel.webview.postMessage({
              type: 'smw:vscode:pickSavePath:result',
              reqId,
              ok: true,
              path: relPath,
            });
          } catch (e) {
            currentPanel.webview.postMessage({
              type: 'smw:vscode:pickSavePath:result',
              reqId,
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
          return;
        }
        if (m.type !== 'smw:vscode:writeFile') return;
        const reqId = m.reqId ?? '';
        if (!reqId) return;
        if (!workspaceFolder) {
          currentPanel.webview.postMessage({
            type: 'smw:vscode:writeFile:result',
            reqId,
            ok: false,
            error: '未打开工作区文件夹，无法保存。',
          });
          return;
        }
        const relPath = (m.path ?? '')
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/^\.\//, '')
          .replace(/\/{2,}/g, '/');
        if (!relPath) {
          currentPanel.webview.postMessage({
            type: 'smw:vscode:writeFile:result',
            reqId,
            ok: false,
            error: '保存路径为空。',
          });
          return;
        }
        if (relPath.split('/').some((seg) => seg === '..')) {
          currentPanel.webview.postMessage({
            type: 'smw:vscode:writeFile:result',
            reqId,
            ok: false,
            error: '保存路径非法。',
          });
          return;
        }
        const target = vscode.Uri.joinPath(workspaceFolder.uri, ...relPath.split('/').filter(Boolean));
        try {
          const parentDir = path.posix.dirname(relPath);
          if (parentDir && parentDir !== '.') {
            const parent = vscode.Uri.joinPath(workspaceFolder.uri, ...parentDir.split('/').filter(Boolean));
            await vscode.workspace.fs.createDirectory(parent);
          }
          await vscode.workspace.fs.writeFile(target, Buffer.from(m.text ?? '', 'utf8'));
          currentPanel.webview.postMessage({ type: 'smw:vscode:writeFile:result', reqId, ok: true });
        } catch (e) {
          currentPanel.webview.postMessage({
            type: 'smw:vscode:writeFile:result',
            reqId,
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      },
      undefined,
      context.subscriptions,
    );

    const appRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'app');
    const htmlPath = path.join(context.extensionPath, 'media', 'app', 'index.html');
    if (!fs.existsSync(htmlPath)) {
      currentPanel.webview.html =
        '<p>未找到打包资源。请在 <code>software-modeling-workbench</code> 根目录执行 <code>npm run build</code> 与 <code>npm run copy:vscode-media</code>。</p>';
      return;
    }
    let html = fs.readFileSync(htmlPath, 'utf8');
    if (html.includes('</head>')) {
      html = html.replace('</head>', '<meta name="software-modeling-workbench-shell" content="vscode" /></head>');
    }
    html = html.replace(/(href|src)="(\.\/[^"]+)"/g, (_m: string, attr: string, rel: string) => {
      const clean = rel.replace(/^\.\//, '');
      const parts = clean.split('/').filter((p) => p.length > 0);
      let uri = appRoot;
      for (let i = 0; i < parts.length; i++) {
        uri = vscode.Uri.joinPath(uri, parts[i] as string);
      }
      return `${attr}="${currentPanel.webview.asWebviewUri(uri)}"`;
    });
    currentPanel.webview.html = html;
  };

  const setupMcp = async (): Promise<void> => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showErrorMessage('请先打开一个工作区文件夹，再配置 MCP。');
      return;
    }
    const bundledDistAbs = path.join(context.extensionPath, 'media', 'mcp-server', 'server.cjs');
    if (!fs.existsSync(bundledDistAbs)) {
      vscode.window.showErrorMessage(
        '扩展内置 mcp-server 不存在。请在扩展工程执行 npm run build:mcp && npm run copy:vscode-mcp 后重试。',
      );
      return;
    }

    const isCursor = vscode.env.appName.toLowerCase().includes('cursor');
    const configDirName = isCursor ? '.cursor' : '.vscode';
    const configDirUri = vscode.Uri.joinPath(folder.uri, configDirName);
    await vscode.workspace.fs.createDirectory(configDirUri);
    const mcpJsonUri = vscode.Uri.joinPath(configDirUri, 'mcp.json');

    const serverConfig = {
      command: 'node',
      args: [bundledDistAbs],
    };
    const template = isCursor
      ? {
          mcpServers: {
            'software-modeling-workbench': serverConfig,
          },
        }
      : {
          servers: {
            'software-modeling-workbench': serverConfig,
          },
        };
    const content = `${JSON.stringify(template, null, 2)}\n`;
    await vscode.workspace.fs.writeFile(mcpJsonUri, Buffer.from(content, 'utf8'));
    vscode.window.showInformationMessage(
      `已写入 ${configDirName}/mcp.json（software-modeling-workbench，使用扩展内置 mcp-server）。`,
    );
  };

  const openCommandId = 'softwareModelingWorkbench.open';
  const setupMcpCommandId = 'softwareModelingWorkbench.setupMcp';
  const menuCommandId = 'softwareModelingWorkbench.menu';

  const showMenu = async (): Promise<void> => {
    const selection = await vscode.window.showQuickPick(
      [
        {
          label: '$(rocket) 打开 Software Modeling Workbench',
          description: '打开建模工作台 Webview',
          command: openCommandId,
        },
        {
          label: '$(tools) 配置 MCP',
          description: '根据 VSCode/Cursor 自动生成 MCP 配置',
          command: setupMcpCommandId,
        },
      ],
      {
        placeHolder: 'Software Modeling Workbench',
        title: 'Software Modeling Workbench',
      },
    );
    if (!selection) {
      return;
    }
    await vscode.commands.executeCommand(selection.command);
  };

  context.subscriptions.push(vscode.commands.registerCommand(openCommandId, openPanel));
  context.subscriptions.push(vscode.commands.registerCommand(setupMcpCommandId, setupMcp));
  context.subscriptions.push(vscode.commands.registerCommand(menuCommandId, showMenu));

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(symbol-class) Modeling Workbench';
  statusBarItem.tooltip = 'Software Modeling Workbench';
  statusBarItem.command = menuCommandId;
  statusBarItem.color = '#FFD54F';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate(): void {}
