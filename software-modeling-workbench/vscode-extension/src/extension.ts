/// <reference types="vscode" />
/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const openPanel = (): void => {
    const panel = vscode.window.createWebviewPanel(
      'mvwbWorkbench',
      'Software Modeling Workbench',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media', 'app')],
      },
    );

    const appRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'app');
    const htmlPath = path.join(context.extensionPath, 'media', 'app', 'index.html');
    if (!fs.existsSync(htmlPath)) {
      panel.webview.html =
        '<p>未找到打包资源。请在 <code>software-modeling-workbench</code> 根目录执行 <code>npm run build</code> 与 <code>npm run copy:vscode-media</code>。</p>';
      return;
    }
    let html = fs.readFileSync(htmlPath, 'utf8');
    if (html.includes('</head>')) {
      html = html.replace('</head>', '<meta name="mvwb-shell" content="vscode" /></head>');
    }
    html = html.replace(/(href|src)="(\.\/[^"]+)"/g, (_m: string, attr: string, rel: string) => {
      const clean = rel.replace(/^\.\//, '');
      const parts = clean.split('/').filter((p) => p.length > 0);
      let uri = appRoot;
      for (let i = 0; i < parts.length; i++) {
        uri = vscode.Uri.joinPath(uri, parts[i] as string);
      }
      return `${attr}="${panel.webview.asWebviewUri(uri)}"`;
    });
    panel.webview.html = html;
  };

  const setupMcp = async (): Promise<void> => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showErrorMessage('请先打开一个工作区文件夹，再配置 MCP。');
      return;
    }
    const vscodeDir = vscode.Uri.joinPath(folder.uri, '.vscode');
    await vscode.workspace.fs.createDirectory(vscodeDir);
    const mcpJsonUri = vscode.Uri.joinPath(vscodeDir, 'mcp.json');
    const template = {
      servers: {
        'mvwb-local': {
          command: 'node',
          args: ['packages/mcp-server/dist/server.js'],
          cwd: '${workspaceFolder}/software-modeling-workbench',
        },
      },
    };
    const content = `${JSON.stringify(template, null, 2)}\n`;
    await vscode.workspace.fs.writeFile(mcpJsonUri, Buffer.from(content, 'utf8'));
    vscode.window.showInformationMessage('已写入 .vscode/mcp.json（mvwb-local）。请先执行 npm run build:mcp。');
  };

  context.subscriptions.push(vscode.commands.registerCommand('mvwb.open', openPanel));
  context.subscriptions.push(vscode.commands.registerCommand('mvwb.setupMcp', setupMcp));
}

export function deactivate(): void {}
