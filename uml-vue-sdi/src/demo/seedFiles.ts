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
namespace_dirs:
  - include/Acme
  - src/Acme
uml_root: diagrams
code_roots:
  - src
  - include
sync_profile: strict
---

# 同步规则

1. **类图变更**时，先更新同主题的 *.uml.md，再改 *.class.md，最后改 include/ / src/ 下头文件与实现。
2. **全局函数或宏**仅出现在 *.code.md 与对应翻译单元；不在 *.class.md 重复类成员。
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
    path: 'models/order.class.md',
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
    path: 'src/globals.code.md',
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
