---
namespace_root: namespace
uml_root: diagrams
code_impls:
  - root: impl_cpp_project
    code_type: cpp
sync_profile: strict
---

# 同步规则（供 AI 阅读）

> ⚠️ 该示例属于 `uml-vue-sdi` 一代开发原型（已废弃）。  
> 二代原型请使用 **Software Modeling Workbench（软件建模工作台）**：`software-modeling-workbench/`。

> **读者说明**：本节正文面向 **AI / 自动化助手**；人类可参阅，但变更顺序与约束以本节为准。

正文按 `sync_profile` **分类**列出：仅适用与上方 YAML 中 `sync_profile` 字段**同名**的二级标题小节。当前仓库仅配置 **strict** 一种策略。

## strict

1. **类图变更**时，先更新同主题的 `*.uml.md`，再改 `namespace` 下 `*.class.md` 与 `*.code.md`（若涉及），最后改 **`impl_cpp_project`** 下真实源码与头文件。
2. **`*.uml.md` 一文件一图**：每个文件**只保存一张图**（通常一个 `mermaid` 块）。多图须在同一 `uml_root` 下用**多个** `*.uml.md` 拆分，禁止在同一文件内堆多张图。首个块为 `classDiagram` 时，工作区使用可编辑类图画布；类框位置、折叠与继承/关联边可见性见文件内 `<!-- uml-class-diagram-layout:` 注释。
3. **`*.class.md` 一文件一类**：描述**一个类**的全部契约成员；默认/脚手架示例类名 **`helloworld`**（见 `namespace/helloworld.class.md`）。可选 `<!-- class-md-meta:{"inherits":"…","associations":[…]} -->` 供画布只读展示继承/关联名；成员以表格为准。
4. **`*.code.md` 抽象契约**：推荐 **`## 函数` / `## 全局变量 / 常量` / `## 宏`** 三节与表格（见 `namespace/globals.code.md`）；**不写**具体语言源码；实现映射到各 `code_impls`。画布卡片坐标与表格行顺序对齐，存于 `<!-- code-md-layout:` 注释。
5. **`*.code.md` 路径**：放在各 **`namespace_root`** 下（与 `*.class.md` 同树），**不**放在 `code_impls` 代码根内。
6. **命名空间与代码实现**：`namespace_root` 含 **`namespace`**；`code_impls` 默认一项为根 **`impl_cpp_project`**、类型 **`cpp`**；UML 图稿在 `uml_root`（`diagrams`）下。
7. PR 前检查：各 `diagrams/*.uml.md` 中 Mermaid 可被渲染且**单文件单图**；`uml.sync.md` 中路径仍存在于仓库。
