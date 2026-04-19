/// <reference types="vscode" />
/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const openPanel = (): void => {
    const panel = vscode.window.createWebviewPanel(
      'mvwbWorkbench',
      'Model-View Workbench',
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
        '<p>未找到打包资源。请在 <code>model-view-workbench</code> 根目录执行 <code>npm run build</code> 与 <code>npm run copy:vscode-media</code>。</p>';
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

  context.subscriptions.push(vscode.commands.registerCommand('mvwb.open', openPanel));
}

export function deactivate(): void {}
