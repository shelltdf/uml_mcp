/// <reference types="vscode" />
/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const openPanel = (): void => {
    const panel = vscode.window.createWebviewPanel(
      'softwareModelingWorkbench',
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
      html = html.replace('</head>', '<meta name="software-modeling-workbench-shell" content="vscode" /></head>');
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
        'software-modeling-workbench-local': {
          command: 'node',
          args: ['packages/mcp-server/dist/server.js'],
          cwd: '${workspaceFolder}/software-modeling-workbench',
        },
      },
    };
    const content = `${JSON.stringify(template, null, 2)}\n`;
    await vscode.workspace.fs.writeFile(mcpJsonUri, Buffer.from(content, 'utf8'));
    vscode.window.showInformationMessage('已写入 .vscode/mcp.json（software-modeling-workbench-local）。请先执行 npm run build:mcp。');
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
          label: '$(tools) 配置 MCP（写入 .vscode/mcp.json）',
          description: '生成本地 MCP 服务器模板',
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

  // Backward-compatible aliases for earlier command IDs.
  context.subscriptions.push(vscode.commands.registerCommand('mvwb.open', openPanel));
  context.subscriptions.push(vscode.commands.registerCommand('mvwb.setupMcp', setupMcp));

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(symbol-class) Modeling Workbench';
  statusBarItem.tooltip = 'Software Modeling Workbench';
  statusBarItem.command = menuCommandId;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate(): void {}
