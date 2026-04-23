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
