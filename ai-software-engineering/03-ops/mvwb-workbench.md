# Model-View Workbench 运维说明

## 用户侧

- **浏览器**：打开 `model-view-workbench`，执行 `npm run dev:web`。菜单与工具栏提供 **新建 / 打开（单文件或文件夹）/ 保存 / 另存为 / 关闭**（**新建** 生成仅含一级标题 `# 新文档` 的空正文，无预置围栏块）；从文件夹加载的 `.md` 仅驻内存，写盘依赖 **另存为**（Chrome/Edge 的 File System Access 可建立句柄后 **保存** 写回原文件），或使用 **Electron** 打开磁盘工作区后按相对路径写盘。顶栏工具栏**右侧**有 **全屏 / 退出全屏**（将整页工作台全屏显示）。**中间列**在「文档」子标签下**仅 Markdown**，可在 **预览（只读）/ 富文本（Vditor）/ 原始文本** 三种状态间切换（默认 **预览**；标题旁三钮或编辑区右键）；**左侧大纲 Dock** 内 **「Model / View 围栏」** 列出当前文档中的 **围栏代码块**（`mv-model-sql` / `mv-model-kv` / `mv-model-struct` / `mv-model-codespace` / `mv-model-interface` / `mv-view` / `mv-map` 等）：可选中块，或点行末 **「代码块」** 在中间列打开 **代码块画布子标签**，在该画布中 **所见即所得 / 结构化** 编辑块内 JSON、XML 或纯文本等；**右侧属性 Dock** 显示选中块的基本属性与 **「打开〈具体画布名〉」** 主按钮（与行末「代码块」一致）。完整 JSON 在「完整 JSON」折叠区内查看。在 **Markdown 编辑区右键** 可选 **「插入代码块…」**，在对话框中按左侧大纲与分组选类型后插入新的 `mv-view` / 各 `mv-model-*` 围栏；`mv-view` 会带上 **modelRefs**（同文件 **`块id#子表id`** 或跨文件 `ref:`，见 `MV_MODEL_REFS_SCHEME_DOC`），属性 Dock 与代码块画布中可继续编辑。左右 **Dock** 可在标题栏 **折叠为窄竖条**（再点竖条展开），与视图菜单中的整侧隐藏不同。
- **Electron**：`npm run dev:electron`（会先构建 web）；或仓库内执行 **`python run_exe.py`**（每次启动前自动 `npm run build` 再启动套壳）。菜单「打开磁盘工作区」加载目录；「独立编辑」打开新窗口编辑单块（需已选工作区）。
- **VS Code / Cursor**：在 `model-view-workbench` 执行 `npm run build:vscode`，用 **从 VSIX 文件夹安装扩展** 或 **开发宿主** 加载 `vscode-extension`；命令面板执行 **MVWB: Open workbench**。

## 块语法摘要

见 [`02-physical/md-mv-core/spec.md`](../02-physical/md-mv-core/spec.md)。

## 三壳差异

| 能力 | 浏览器 | Electron | VS Code Webview |
|------|--------|----------|-----------------|
| 读目录 | webkitdirectory | 原生对话框 + `fs` | 当前未接 `workspace`（仅内存/后续迭代） |
| 写磁盘 | 下载 / 未来 FS Access | `writeWorkspaceFile` | 未实现 |
| 块可视化画布 | 中间列子标签（同 SPA） | 同左（内嵌） | 与 SPA 相同（可后续加第二 Webview） |

## 开发者

- 根目录脚本：`build.py`、`test.py`、`run.py`、`dev.py`、`publish.py`。
- 端口：`5174`（避免与 `uml-vue-sdi` 的 `5173` 冲突）。
