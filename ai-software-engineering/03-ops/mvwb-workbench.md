# Model-View Workbench 运维说明

## 用户侧

- **浏览器**：打开 `model-view-workbench`，执行 `npm run dev:web`，用「打开文件夹」选择含 `.md` 的目录；支持「新建 MD」「导出当前」。
- **Electron**：`npm run dev:electron`（会先构建 web）；或仓库内执行 **`python run_exe.py`**（每次启动前自动 `npm run build` 再启动套壳）。菜单「打开磁盘工作区」加载目录；「独立编辑」打开新窗口编辑单块（需已选工作区）。
- **VS Code / Cursor**：在 `model-view-workbench` 执行 `npm run build:vscode`，用 **从 VSIX 文件夹安装扩展** 或 **开发宿主** 加载 `vscode-extension`；命令面板执行 **MVWB: Open workbench**。

## 块语法摘要

见 [`02-physical/md-mv-core/spec.md`](../02-physical/md-mv-core/spec.md)。

## 三壳差异

| 能力 | 浏览器 | Electron | VS Code Webview |
|------|--------|----------|-----------------|
| 读目录 | webkitdirectory | 原生对话框 + `fs` | 当前未接 `workspace`（仅内存/后续迭代） |
| 写磁盘 | 下载 / 未来 FS Access | `writeWorkspaceFile` | 未实现 |
| 块独立窗口 | 弹层编辑 | 新 `BrowserWindow` | 与 SPA 相同弹层（可后续加第二 Webview） |

## 开发者

- 根目录脚本：`build.py`、`test.py`、`run.py`、`dev.py`、`publish.py`。
- 端口：`5174`（避免与 `uml-vue-sdi` 的 `5173` 冲突）。
