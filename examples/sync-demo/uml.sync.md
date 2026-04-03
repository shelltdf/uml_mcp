---
namespace_root: namespace
uml_root: diagrams
code_impls:
  - root: impl_cpp_project
    code_type: cpp
sync_profile: strict
---

# 同步规则（供 AI 阅读）

> **读者说明**：本节正文面向 **AI / 自动化助手**；人类可参阅，但变更顺序与约束以本节为准。

正文按 `sync_profile` **分类**列出：仅适用与上方 YAML 中 `sync_profile` 字段**同名**的二级标题小节。当前仓库仅配置 **strict** 一种策略。

## strict

1. **类图变更**时，先更新同主题的 `*.uml.md`，再改 `namespace` 下 `*.class.md` 与 `*.code.md`（若涉及），最后改 **`impl_cpp_project`** 下真实源码与头文件。
2. **`*.code.md` 路径**：放在各 **`namespace_root`** 下（与 `*.class.md` 同树），**不**放在 `code_impls` 代码根内。
3. **全局函数或宏**仅出现在上述 `*.code.md` 与对应翻译单元（`impl_cpp_project` 等）；不在 `*.class.md` 重复类成员。
4. **命名空间与代码实现**：`namespace_root` 含 **`namespace`**（类图 / 类表 / 非类片段契约根）；`code_impls` 默认一项为根 **`impl_cpp_project`**、类型 **`cpp`**（真实代码）；UML 图稿在 `uml_root`（`diagrams`）下。
5. PR 前检查：`diagrams/*.uml.md` 中 Mermaid 块可被渲染；`uml.sync.md` 中路径仍存在于仓库。
