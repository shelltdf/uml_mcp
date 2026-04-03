import type { FileKind } from '../lib/formats';
import { detectKindFromPath } from '../lib/formats';

export interface SeedFile {
  path: string;
  content: string;
  kind: FileKind;
}

export const SEED_FILES: SeedFile[] = [
  {
    path: 'uml.sync.md',
    content: `---
namespace_root: namespace
uml_root: diagrams
code_impls:
  - root: impl_cpp_project
    code_type: cpp
sync_profile: strict
---

# 同步规则（供 AI 阅读）

> **读者说明**：本节正文面向 **AI / 自动化助手**；人类可参阅，但变更顺序与约束以本节为准。

正文按 \`sync_profile\` **分类**列出：仅适用与上方 YAML 中 \`sync_profile\` 字段**同名**的二级标题小节。当前仓库仅配置 **strict** 一种策略。

## strict

1. **类图变更**时，先更新同主题的 \`*.uml.md\`，再改 \`namespace\` 下 \`*.class.md\` 与 \`*.code.md\`（若涉及），最后改 **\`impl_cpp_project\`** 下真实源码与头文件。
2. **\`*.uml.md\` 一文件一图**：每个文件**只保存一张图**（通常一个 \`mermaid\` 块）。多图须在同一 \`uml_root\` 下用**多个** \`*.uml.md\` 拆分，禁止在同一文件内堆多张图。首个块为 \`classDiagram\` 时，工作区使用可编辑类图画布；类框位置、折叠与继承/关联边可见性见文件内 \`<!-- uml-class-diagram-layout:\` 注释。
3. **\`*.class.md\` 一文件一类**：描述**一个类**的全部契约成员；默认/脚手架示例类名 **\`helloworld\`**（见 \`namespace/helloworld.class.md\`）。可选 \`<!-- class-md-meta:{"inherits":"…","associations":[…]} -->\` 供画布只读展示继承/关联名；成员以表格为准。
4. **\`*.code.md\` 抽象契约**：推荐 **\`## 函数\` / \`## 全局变量 / 常量\` / \`## 宏\`** 三节与表格（见 \`namespace/globals.code.md\`）；**不写**具体语言源码；实现映射到各 \`code_impls\`。画布卡片坐标与表格行顺序对齐，存于 \`<!-- code-md-layout:\` 注释。
5. **\`*.code.md\` 路径**：放在各 **\`namespace_root\`** 下（与 \`*.class.md\` 同树），**不**放在 \`code_impls\` 代码根内。
6. **命名空间与代码实现**：\`namespace_root\` 含 **\`namespace\`**；\`code_impls\` 默认一项为根 **\`impl_cpp_project\`**、类型 **\`cpp\`**；UML 图稿在 \`uml_root\`（\`diagrams\`）下。
7. PR 前检查：各 \`diagrams/*.uml.md\` 中 Mermaid 可被渲染且**单文件单图**；\`uml.sync.md\` 中路径仍存在于仓库。
`,
  },
  {
    path: 'diagrams/order-domain-class.uml.md',
    content: `# 类图 · 订单域

> **约定**：每个 \`*.uml.md\` **只保存一张图**（通常一个 \`\`\`mermaid 块）。若需多张图，在 \`uml_root\` 目录下用**多个** \`*.uml.md\` 文件分别存放，而不是在同一文件里堆多张图。

本文件用于测试可编辑类图画布中的 **继承**（\`<|--\`）、**关联**（\`-->\`，含基数与标签）、**简单单向依赖**（\`..>\`，解析为与关联同类的连线语义）等关系的解析与绘制。

\`\`\`mermaid
classDiagram
  class BaseEntity {
    +string id
    +string createdAt
  }
  class Order {
    +string id
    +addItem(Item)
  }
  class Item {
    +string sku
    +decimal price
  }
  class DiscountRule {
    +bool appliesTo(Order)
  }
  class Customer {
    +string name
  }
  BaseEntity <|-- Order
  Order "1" --> "*" Item : contains
  Order --> DiscountRule : pricing
  Order ..> Customer : placedBy
\`\`\`

<!-- uml-class-diagram-layout:{"v":1,"positions":{"BaseEntity":{"x":200,"y":40},"Order":{"x":200,"y":280},"Item":{"x":520,"y":280},"DiscountRule":{"x":520,"y":40},"Customer":{"x":520,"y":520}},"folded":{},"edgeVisibility":{"inherit":true,"association":true}} -->
`,
  },
  {
    path: 'diagrams/workspace-overview.uml.md',
    content: `# 组件图 · 概览

> **约定**：每个 \`*.uml.md\` **只保存一张图**。多图请拆成多文件（见同目录下其它 \`*.uml.md\`）。

\`\`\`mermaid
flowchart LR
  UI[Vue SDI] --> Core[Workspace]
  Core --> FS[Files]
\`\`\`
`,
  },
  {
    path: 'namespace/helloworld.class.md',
    content: `# Classes · helloworld（默认占位）

> **约定**：一个 \`*.class.md\` 描述**一个类**的全部契约定义（成员表、可见性等）；脚手架或默认生成时，示例类名统一为 **helloworld** / **Helloworld**（本文件演示单类全量描述形态）。

### Helloworld

<!-- class-md-meta: {"inherits":"BaseEntity","associations":["Item","DiscountRule"]} -->

| Kind | Name | Type | Note |
|------|------|------|------|
| field | exampleField | string | 示例字段 |
| method | greet | void | 示例方法；参数与返回值在实现语言中落地 |
`,
  },
  {
    path: 'namespace/globals.code.md',
    content: `# 全局函数、变量与宏（抽象契约）

> **约定**：本文件用**与具体编程语言无关**的条目/表格描述**全局函数**、**全局变量**、**宏** 等非类成员契约；**不**在此书写某种语言的源码。实现侧再映射到各 \`code_impls\` 下的翻译单元。

## 函数

| Kind | Name | 签名（抽象） | 效果 / 返回值（抽象） | Note |
|------|------|--------------|----------------------|------|
| function | log_debug | 接收一条文本消息 | 无返回值；用于诊断输出 | 可在匿名作用域内实现 |

## 全局变量 / 常量

| Kind | Name | 类型（抽象） | Note |
|------|------|--------------|------|
| constant | VERSION_MAJOR | 整数 | 主版本号，与发布对齐 |

## 宏

| Kind | Name | 展开语义（抽象） | Note |
|------|------|------------------|------|
| macro | ACME_VERSION_MAJOR | 编译期主版本整型 | 与 \`VERSION_MAJOR\` 一致时可由生成器关联 |
`,
  },
].map((f) => ({ ...f, kind: detectKindFromPath(f.path) }));
