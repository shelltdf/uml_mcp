# md-mv-web 物理规格

## 技术栈

- Vue 3 + Vite 6 + TypeScript
- 依赖 `@mvwb/core`（`file:../../packages/core`）

## 行为

- **多文档切换**：已打开文件在 **中间编辑列**（`div.editor-column` 内）顶部的 **`header.doc-tabs`** 以 **标签页** 横向排列（短名为路径末段，主按钮 `title` 为完整相对路径）；与 **左右 Dock** 同一行布局中，标签栏仅占 **Dock 之间的主编辑区** 宽度。点击标签切换文档；每个标签右侧有 **关闭（×）**，从内存工作区移除该文件，若关闭当前文档则选中右侧相邻，否则选中左侧。
- **顶栏（Win 风格壳层）**：`header.win-chrome` — **标题条**（应用名 + 版本）、**菜单栏**（文件 / 视图 / 帮助，下拉项与「无全局快捷键」类提示以 `title` 为准）、**工具栏**（左侧：打开文件夹、新建 MD、导出当前、可选 Electron 磁盘工作区；**右侧**：**全屏 / 退出全屏**，对根布局 `div.layout` 调用 Fullscreen API，监听 `fullscreenchange` 同步按钮文案）；不列出文件列表。
- **底栏**：`footer.statusbar` — 左侧摘要（最近一条程序日志或就绪提示），右侧壳类型、已打开文档数、当前路径；**点击状态栏**打开 **日志窗口**（纯文本历史、`复制全文`）。
- **`blockOnly` 模式**（Electron 块编辑 URL）：隐藏顶栏与底栏，主区全宽。
- **mv-model 语义**（与 `@mvwb/core` 一致）：每个 `` ```mv-model `` 块为 **一张固定列表**；同一文档可有多个块。解析校验：列名唯一、非空 `columns`、每行仅允许声明列键，非 `nullable` 列在每行必须出现。
- **mv-view 语义**：**视图基类**，以 `kind` 派生具体类型（含 `uml-class` / `uml-sequence` / `uml-activity` / `ui-design` 等，以 `@mvwb/core` 的 `MV_VIEW_KINDS` 与 `MV_VIEW_KIND_METADATA` 为准）。**每个已注册 `kind` 在画布子标签 / 整页画布模式中有对应编辑面**（`BlockCanvasPage`）；中间列**不**展示块卡片预览区。
- **围栏块「画布」**：**左侧大纲 Dock** 内 **「Model / View 围栏」** 索引列出当前文档的 `mv-model` / `mv-view` / `mv-map`：一行可 **选中块**（联动右侧属性），行末 **「画布」** 在主窗口 **中间列** 文档标签下方以 **子标签** 打开 **`BlockCanvasPage`**（`embedded`）；同一 `relPath`+`blockId` 重复打开聚焦已有子标签。右侧属性 Dock 在已选块时提供与索引等价的 **打开画布** 主按钮。**保存** 调用 `replaceBlockInnerById` 写回围栏 JSON，并更新内存 `files`、`sourceEditorText`、Electron 时 `writeWorkspaceFile`。**兼容**：URL `?mvwb_canvas=1&path=&blockId=` 整页画布模式仍保留。主流程不另开 `window.open` / `openBlockCanvas` 窗口。
- **Dock（主工作区）**：**左侧大纲 Dock** 含 **文档章节**、**Model / View 围栏**索引、以及选中块后的 **第二段结构概要**（随 `kind` 变化）；**右侧属性 Dock** 含选中块的基本属性、打开画布、编辑 JSON、独立编辑、可折叠完整 JSON。两侧标题栏 **折叠** 与视图菜单 **整侧显示/隐藏** 同前。
- **Markdown 主编辑区**（`section.md-pane`）：**独占中间列「文档」子标签**（与右侧 Dock 并排，**无**「Model / View 块」双栏卡片区）。默认 **富文本 / 所见即所得**（Vditor）；**原始文本** 为全宽 `textarea`，与内存 `files` 同步；围栏解析结果仍驱动 **`blocks`**、左侧围栏索引与右侧属性，解析警告列表显示在 **Markdown 区标题下方**。**光标联动属性**：当焦点在 MD 编辑区时，根据光标在**当前文档 Markdown 字符串**中的字符偏移（与 `ParsedFenceBlock.startOffset`/`endOffset` 一致）判定所在围栏块并更新 **`selectedBlockId`**（在围栏外则清空，属性 Dock 回退为文档摘要）；富文本下由 `MdWysiwygEditor` 用 Lute **`VditorDOM2Md`** 将光标前 WYSIWYG DOM 片段转为 MD 前缀以估算偏移；原始文本下用 `textarea.selectionStart` + `document` 的 **`selectionchange`**。右键菜单、插入图、`modelRefs` 默认策略、防抖写盘、Vditor CDN、`pre.vditor-reset` 样式等同前。
- **浏览器**：`<input webkitdirectory>` 加载 `.md` 到内存 Map；「导出当前」下载单文件。
- **壳检测**：`src/platform.ts` — VS Code 通过扩展注入的 `<meta name="mvwb-shell" content="vscode">`；Electron 通过 `window.electronAPI`。
- **Electron**：`electronAPI.pickWorkspace` / `readWorkspaceFile` / `writeWorkspaceFile` / `openBlockEditor`；块独立窗口通过 `?mvwb_block=1&path=&blockId=` 打开同一 SPA。

## 端口

- 开发服务器默认 `5174`（与 `uml-vue-sdi` 的 `5173` 错开）。
