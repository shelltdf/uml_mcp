import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  /** 状态栏最右侧（优先级最低 = 靠右缘） */
  const statusUml = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -1_000_000);
  statusUml.text = '$(symbol-class) UML';
  statusUml.tooltip = 'UML Markdown Workbench — 打开工作台';
  statusUml.command = 'umlWorkbench.open';
  /** 文字为黄色；背景不设置，沿用状态栏默认底色 */
  statusUml.color = '#e5b80c';
  statusUml.name = 'umlWorkbench.status';
  statusUml.show();
  context.subscriptions.push(statusUml);

  const openPanel = (): void => {
    const panel = vscode.window.createWebviewPanel(
      'umlWorkbench',
      'UML Markdown Workbench',
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
        '<p>未找到打包资源。请先在本仓库执行 <code>npm run build</code> 与 <code>npm run build:all</code>。</p>';
      return;
    }
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/(href|src)="(\.\/[^"]+)"/g, (_m, attr: string, rel: string) => {
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

  context.subscriptions.push(
    vscode.commands.registerCommand('umlWorkbench.open', openPanel),
    vscode.commands.registerCommand('umlWorkbench.copyMcpServerPath', () => {
      const mcp = path.join(context.extensionPath, 'mcp-server.mjs');
      const line = `node "${mcp}"`;
      void vscode.env.clipboard.writeText(line);
      void vscode.window.showInformationMessage('已复制 MCP 启动命令（可在 Cursor/VS Code MCP 配置中使用）');
    }),
  );
}

export function deactivate(): void {}
