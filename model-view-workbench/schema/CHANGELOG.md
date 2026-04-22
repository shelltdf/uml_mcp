# Schema Changelog（Model-View Workbench）

记录 `mv-*` 核心 schema 的版本变更，尤其是 breaking changes。

## 2026-04-22

### Breaking

`mv-model-codespace` 的 class 成员字段统一为复数字段，并移除 legacy 支持：

- `member` -> `members`
- `method` -> `methods`
- `enum` -> `enums`

同时移除旧兼容路径：

- 不再接受旧键 `member` / `method` / `enum`
- 不再自动归并 legacy `members[{ kind: ... }]`

### Upgrade Notes

升级时请先迁移历史数据，再执行解析校验：

- `classes[].member` -> `classes[].members`
- `classes[].method` -> `classes[].methods`
- `classes[].enum` -> `classes[].enums`
- 清理 `classes[].members[{ kind: ... }]` 旧结构

建议使用 `parseMarkdownBlocks()` 对迁移后文档做全量校验。  
可使用迁移脚本：

- dry-run：`npm run migrate:codespace-schema -- .`
- write：`npm run migrate:codespace-schema -- . --write`

### Behavior Update（UML class canvas sync）

- `association` 从 class 级改为成员/属性级同步：写入 `members[]/properties[]` 的 `associatedClassifierId`。
- `dependency` 作为 class 级关系：写入 `namespaces[].associations[]`（`kind: dependency`）。
- `uml-class` relation 新增可选元信息用于精确定位来源槽位：
  - `fromSlotSection: 'members' | 'properties'`
  - `fromSlotName: string`
