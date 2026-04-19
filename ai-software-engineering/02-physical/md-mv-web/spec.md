# md-mv-web 物理规格

## 技术栈

- Vue 3 + Vite 6 + TypeScript
- 依赖 `@mvwb/core`（`file:../../packages/core`）

## 行为

- **多文档切换**：已打开文件在 **中间编辑列**（`div.editor-column` 内）顶部的 **`header.doc-tabs`** 以 **标签页** 横向排列（短名为路径末段，主按钮 `title` 为完整相对路径）；与 **左右 Dock** 同一行布局中，标签栏仅占 **Dock 之间的主编辑区** 宽度。点击标签切换文档；每个标签右侧有 **关闭（×）**，从内存工作区移除该文件，若关闭当前文档则选中右侧相邻，否则选中左侧。
- **顶栏（Win 风格壳层）**：`header.win-chrome` — **标题条**（应用名 + 版本）、**菜单栏**（文件 / 视图 / 帮助，下拉项与「无全局快捷键」类提示以 `title` 为准）、**工具栏**（左侧：**新建 / 打开 / 打开文件夹 / 保存 / 另存为 / 关闭**；Electron 另显 **磁盘工作区**；**右侧**：**全屏 / 退出全屏**，对根布局 `div.layout` 调用 Fullscreen API，监听 `fullscreenchange` 同步按钮文案）；不列出文件列表。**文件**菜单与工具栏对齐上述命令；**保存** `Ctrl+S`、**另存为** `Ctrl+Shift+S`、**关闭当前** `Ctrl+W`（焦点不在可编辑区时）；关闭标签前有**未保存**确认（与内存 `savedBaseline` 比对）。
- **底栏**：`footer.statusbar` — 左侧摘要（最近一条程序日志或就绪提示），右侧壳类型、已打开文档数、当前路径；**点击状态栏**打开 **日志窗口**（纯文本历史、`复制全文`）。
- **`blockOnly` 模式**（Electron 块编辑 URL）：隐藏顶栏与底栏，主区全宽。
- **mv-model 语义**（与 `@mvwb/core` 一致）：每个 `` ```mv-model `` 块为 **一张固定列表**；同一文档可有多个块。解析校验：列名唯一、非空 `columns`、每行仅允许声明列键，非 `nullable` 列在每行必须出现。
- **mv-view 语义**：**视图基类**，以 `kind` 派生具体类型（含 **全部 `mermaid-*`**、`uml-class` / `uml-sequence` / `uml-activity` / `ui-design` 等，以 `@mvwb/core` 的 `MV_VIEW_KINDS` 与 `MV_VIEW_KIND_METADATA` 为准）。**每个已注册 `kind` 在代码块画布子标签 / 整页代码块画布模式中有对应编辑面**（`BlockCanvasPage`）；中间列**不**展示块卡片预览区。
- **围栏代码块「代码块画布」**：Model / View / Map 在 `.md` 中以 **Markdown 围栏代码块**（语言标签 `mv-model` / `mv-view` / `mv-map`）存储，块内正文可为 JSON、XML 或纯文本等。**左侧大纲 Dock** 内 **「Model / View 围栏」** 索引列出当前文档的围栏块：**每行展示围栏语言（`mv-model` / `mv-view` / `mv-map`）与「子类型」**（如 `mv-view` 的 JSON `kind`、`mv-model` 的表标题或「数据表」、`mv-map` 的规则条数摘要），以及块 `id`；行可 **选中块**（联动右侧属性），行末 **「代码块」** 在主窗口 **中间列** 文档标签下方以 **子标签** 打开 **`BlockCanvasPage`**（`embedded`），子标签文案含类型+子类型+`id`），即可 **所见即所得 / 结构化** 编辑该代码块内容；同一 `relPath`+`blockId` 重复打开聚焦已有子标签。嵌入画布保存后刷新子标签上的子类型文案。右侧属性 Dock 在已选块时提供与索引等价的 **打开…画布** 主按钮。**保存** 调用 `replaceBlockInnerById` 写回围栏内 JSON/文本，并更新内存 `files`、`sourceEditorText`、Electron 时 `writeWorkspaceFile`。**兼容**：URL `?mvwb_canvas=1&path=&blockId=` 整页画布模式仍保留。主流程不另开 `window.open` / `openBlockCanvas` 窗口。
- **Dock（主工作区）**：**左侧大纲 Dock** 含 **文档章节**、**Model / View 围栏**索引、以及选中块后的 **第二段结构概要**（随 `kind` 变化）；**右侧属性 Dock** 含选中块的基本属性、打开画布、编辑 JSON、独立编辑、可折叠完整 JSON。两侧标题栏 **折叠** 与视图菜单 **整侧显示/隐藏** 同前。
- **Markdown 主编辑区**（`section.md-pane`）：**独占中间列「文档」子标签**（与右侧 Dock 并排，**无**「Model / View 块」双栏卡片区）。**三种显示状态**（`mdPaneMode`：`preview` | `rich` | `source`，`h2.md-pane-head` 旁 **预览 / 富文本 / 原始文本** 三钮或右键菜单切换）：**预览** — `MdMarkdownPreview.vue` 调用 **`Vditor.preview`** 只读渲染当前 `files` 中的 Markdown；**富文本** — `MdWysiwygEditor.vue`（Vditor `wysiwyg`）可编辑并与 `files` 同步；**原始文本** — 全宽 `textarea` 绑定 `sourceEditorText`，离开时 **`flushSourceToFiles`** 写回 `files`。默认 **`preview`**。**插入代码块** 仅在富文本或原始文本下可用（预览下禁用）。围栏解析仍驱动 **`blocks`**、左侧围栏索引与右侧属性，解析警告列表在标题下方。**光标联动属性**（仅富文本 / 原始文本）：偏移与 `ParsedFenceBlock.startOffset`/`endOffset` 对齐；富文本由 `MdWysiwygEditor` 的 **`VditorDOM2Md`** 前缀估算；原始文本用 `selectionStart` + **`selectionchange`**。**插入代码块**（`InsertCodeBlockModal.vue` + `code-block-insert.ts`：卡片分组——**数据模型**（`mv-model`）/ **UI 相关** / **Mermaid 相关** / **PlantUML**（`uml-class` / `uml-sequence` / `uml-activity`）/ **其它**（通用 `uml-diagram`））、`modelRefs` 默认策略、防抖写盘、Vditor CDN、富文本下 `pre.vditor-reset` 样式等同前。
- **浏览器**：`<input webkitdirectory>` 加载 `.md` 到内存 Map；「导出当前」下载单文件。
- **壳检测**：`src/platform.ts` — VS Code 通过扩展注入的 `<meta name="mvwb-shell" content="vscode">`；Electron 通过 `window.electronAPI`。
- **Electron**：`electronAPI.pickWorkspace` / `readWorkspaceFile` / `writeWorkspaceFile` / `openBlockEditor`；块独立窗口通过 `?mvwb_block=1&path=&blockId=` 打开同一 SPA。

## 端口

- 开发服务器默认 `5174`（与 `uml-vue-sdi` 的 `5173` 错开）。
