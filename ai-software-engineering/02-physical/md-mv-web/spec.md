# md-mv-web 物理规格

## 技术栈

- Vue 3 + Vite 6 + TypeScript
- 依赖 `@mvwb/core`（`file:../../packages/core`）

## 行为

- **多文档切换**：已打开文件在 **主区顶部 `header.doc-tabs`** 以 **标签页** 横向排列（短名为路径末段，主按钮 `title` 为完整相对路径）；点击主区切换文档；每个标签右侧有 **关闭（×）**，从内存工作区移除该文件，若关闭当前文档则选中右侧相邻，否则选中左侧。
- **顶栏（Win 风格壳层）**：`header.win-chrome` — **标题条**（应用名 + 版本）、**菜单栏**（文件 / 视图 / 帮助，下拉项与「无全局快捷键」类提示以 `title` 为准）、**工具栏**（打开文件夹、新建 MD、导出当前、可选 Electron 磁盘工作区）；不列出文件列表。
- **底栏**：`footer.statusbar` — 左侧摘要（最近一条程序日志或就绪提示），右侧壳类型、已打开文档数、当前路径；**点击状态栏**打开 **日志窗口**（纯文本历史、`复制全文`）。
- **`blockOnly` 模式**（Electron 块编辑 URL）：隐藏顶栏与底栏，主区全宽。
- **Markdown 主编辑区**（`section.md-pane`）：默认 **预览模式**（`marked` 渲染 + `DOMPurify` 消毒后 `v-html`）；**原始文本模式**为全宽 `textarea`，与内存 `files` 同步（右侧块区随解析更新）。在区域内 **右键** 弹出菜单切换「预览 / 原始文本」；切回预览前将文本区内容写回当前文件。`Esc` 关闭右键菜单。Electron 下对 `writeWorkspaceFile` 做 **约 400ms 防抖**。
- **浏览器**：`<input webkitdirectory>` 加载 `.md` 到内存 Map；「导出当前」下载单文件。
- **壳检测**：`src/platform.ts` — VS Code 通过扩展注入的 `<meta name="mvwb-shell" content="vscode">`；Electron 通过 `window.electronAPI`。
- **Electron**：`electronAPI.pickWorkspace` / `readWorkspaceFile` / `writeWorkspaceFile` / `openBlockEditor`；块独立窗口通过 `?mvwb_block=1&path=&blockId=` 打开同一 SPA。

## 端口

- 开发服务器默认 `5174`（与 `uml-vue-sdi` 的 `5173` 错开）。
