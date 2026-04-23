# md-mv-vscode-ext 物理规格

## 命令

- `mvwb.open`：创建 `WebviewPanel`，加载 `media/app/index.html`，并将 `./assets/*` 转为 `asWebviewUri`。

## HTML 注入

- 在 `</head>` 前插入 `<meta name="mvwb-shell" content="vscode" />`，供 Web 端 `detectShell()` 识别。

## 构建前提

- 先执行仓库根 `software-modeling-workbench` 下 `npm run build` 与 `npm run copy:vscode-media`，再 `npm run compile --workspace=software-modeling-workbench`。
