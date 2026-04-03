# 详细设计：工作区与 SDI 标签

## 用例

1. 用户打开示例工程（内置 demo 或未来选择目录）。
2. 每个打开文件对应一个 **Tab**；**活动 Tab** 决定编辑器内容与预览输入。
3. `*.uml.md`：左侧/主区为 Markdown 文本，预览区渲染所有 `mermaid` 块（可折叠逐图）。
4. 脏状态：文本变更 → `isDirty`；保存（MVP 可导出为下载或仅内存）→ 清除脏标记。

## 状态（逻辑）

- `workspaceRoot: string | null`
- `tabs: { id, path, content, kind, isDirty }[]`
- `activeTabId: string`

## 非目标

- 多窗口 MDI：不在 MVP 范围。
