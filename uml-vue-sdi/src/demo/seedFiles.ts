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

> 读者说明：本节面向 AI / 自动化助手；人类可参阅，但变更顺序与约束以本节为准。

正文按 sync_profile 分类：仅适用与 YAML 中 sync_profile 同名的二级标题小节。当前仅 strict。

## strict

1. **类图变更**时，先更新同主题的 *.uml.md，再改 namespace 下 *.class.md 与 *.code.md（若涉及），最后改 **impl_cpp_project** 下真实源码与头文件。
2. ***.code.md 路径**：放在各 **namespace_root** 下（与 *.class.md 同树），**不**放在 code_impls 代码根内。
3. **全局函数或宏**仅出现在上述 *.code.md 与对应翻译单元（impl_cpp_project 等）；不在 *.class.md 重复类成员。
4. **namespace_root** 默认含 **namespace**（类表 / 非类片段契约）；**code_impls** 默认一项为根 **impl_cpp_project**、类型 **cpp**（真实代码；均为工作区相对路径）。
`,
  },
  {
    path: 'diagrams/domain.uml.md',
    content: `# 领域 UML

## 类图 · 核心

\`\`\`mermaid
classDiagram
  class Order {
    +string id
    +addItem(Item)
  }
  class Item {
    +string sku
  }
  Order "1" --> "*" Item : contains
\`\`\`

## 组件图 · 概览

\`\`\`mermaid
flowchart LR
  UI[Vue SDI] --> Core[Workspace]
  Core --> FS[Files]
\`\`\`
`,
  },
  {
    path: 'namespace/order.class.md',
    content: `# Classes · Order 域

### Order

| Kind | Name | Type | Note |
|------|------|------|------|
| field | id | string | 业务主键 |
| method | addItem | void | 参数：Item |

### Item

| Kind | Name | Type | Note |
|------|------|------|------|
| field | sku | string | 库存单位 |
`,
  },
  {
    path: 'namespace/globals.code.md',
    content: `# 非类代码片段（示例）

## logging.cpp（全局辅助）

\`\`\`cpp
namespace {
void log_debug(const char* msg) {
  // ...
}
}
\`\`\`

## 宏

\`\`\`cpp
#define ACME_VERSION_MAJOR 1
\`\`\`
`,
  },
].map((f) => ({ ...f, kind: detectKindFromPath(f.path) }));
