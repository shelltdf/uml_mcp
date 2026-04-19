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
