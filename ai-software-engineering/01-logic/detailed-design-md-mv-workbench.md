# 详细设计：Model-View MD Workbench

## 目标

- **单一存储**：Markdown 文件承载多个 `mv-*` 围栏块；块体为 JSON，便于 diff 与工具处理。
- **Model / View 分离**：model 描述表与行；view 描述观察角度（表格只读、Mermaid 类等）；`mv-map` 描述与代码路径的映射规则（生成器后续实现）。
- **三壳一致**：`@mvwb/core` 为共享解析与回写；`apps/web` 为 UI；Electron / VS Code 仅提供文件与窗口能力。

## 数据流

1. 用户选择工作区（浏览器目录选择 / Electron 对话框 / VS Code 未来可接 `workspace.fs`）。
2. 读入 `.md` → `parseMarkdownBlocks` → 块列表与校验错误。
3. 编辑块 JSON → `replaceBlockInnerById` → 更新内存；Electron 写回 `writeWorkspaceFile`。

## 跨文件引用（核心已备）

- `refs/resolve.ts`：`ref:path.md#id` 解析与 `detectRefCycle`；UI 层尚未接多文件工作区联动，后续在 `apps/web` 扩展。

## 与 uml-vue-sdi 边界

- **不修改** `uml-vue-sdi`；本工作台为独立子项目 `model-view-workbench/`。

## `mv-model-codespace` 与 UML 同步契约（`uml.sync.md`）分工

- **`mv-model-codespace`**：落在 **单个 Markdown 围栏** 内的 **JSON 示意模型**（`workspaceRoot`、`modules[]`，及可选的递归 `namespaces`、Classifier、`associations` 等），由 `@mvwb/core` 的 `parseMarkdownBlocks` / `validateMvModelCodespace` 校验；适合在 Model-View Workbench 中与 `mv-view` 同文件编排、单块 diff。
- **`uml.sync.md` + `namespace_root` + `*.class.md` / `*.code.md` + `*.uml.md`**：仓库约定的 **文件树 + 多文件契约** 同步流（见 `.cursor/rules/uml-code-sync.mdc` 与 `02-physical/uml-vue-sdi/spec.md`），面向「目录即命名空间、一文件一类/一文件一图」的编辑习惯。
- 二者 **不互相替代**：codespace 块可摘要多模块结构；UML 同步流可承载细粒度类契约与多图拆分。若需对齐，由作者或后续 **映射工具**（如 `mv-map`、导出脚本）人工或半自动维护，本阶段工作台 **不对** `mv-model-codespace` 与 `*.class.md` 做自动双向同步。
