# 详细设计：工作区与 SDI 标签

## 用例

1. 用户打开示例工程（内置 demo 或未来选择目录）。
2. 每个打开文件对应一个 **Tab**；**活动 Tab** 决定编辑器内容与预览输入。
3. `*.uml.md`：主区画布渲染 Mermaid；源码在右侧「文本内容」停靠中编辑（与属性停靠可并排，中间可调分割条）。
4. 脏状态：文本变更 → `isDirty`；保存（MVP 可导出为下载或仅内存）→ 清除脏标记。

## 状态（逻辑）

- 实现侧（`stores/workspace.ts`）：`tabs: Tab[]`（`id, path, content, kind, isDirty, fileHandle?, lastPersistedContent`），`activeTabId`；无单独 `workspaceRoot` 字段（浏览器演示以已打开标签路径集合代表「工作区」）。
- 应用壳（`App.vue`）：主题、语言、菜单、**Dock 列宽度**、**属性/文本区高度比**、各停靠窗口展开/关闭等 UI 状态。

## 非目标

- 多窗口 MDI：不在 MVP 范围。
