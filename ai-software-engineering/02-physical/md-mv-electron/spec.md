# md-mv-electron 物理规格

## 加载

- 主窗口 `loadFile`：`apps/web/dist/index.html`（相对 `main.cjs` 为 `../web/dist/index.html`）。

## IPC

| 通道 | 方向 | 载荷 | 说明 |
|------|------|------|------|
| mvwb:pickWorkspace | invoke | — | 打开目录对话框，递归读取 `.md`，返回 `{ root, files }` |
| mvwb:readFile | invoke | relPath | 相对工作区读 UTF-8 文本 |
| mvwb:writeFile | invoke | relPath, text | 写回磁盘（自动 `mkdir` 父目录） |
| mvwb:openBlock | send | relPath, blockId | 新开 `BrowserWindow`，`loadURL` 带 query |

## 安全

- `readFile` / `writeFile` 将路径 `join(workspaceRoot, rel)` 并校验前缀，防止 `..` 逃逸。
