# Schema 文档中心（Model-View Workbench）

该目录用于按版本维护 `mv-*` 核心 schema 规范，方便用户直接查看与版本对比。

## 文档结构

- `versions/<major>-<date>.md`：每个版本的完整规范快照（例如 `1-2026-04-22.md`）
- `CHANGELOG.md`：按时间记录 schema 变更（尤其 breaking changes）

## 快速入口

- 当前最新规范：[`versions/1-2026-04-22.md`](versions/1-2026-04-22.md)
- 变更记录：[`CHANGELOG.md`](CHANGELOG.md)

## 当前版本新增点（1-2026-04-22）

- `mv-model-codespace` 的 class 成员字段统一为复数：
  - `members` / `methods` / `enums` / `properties`
- `uml-class` 画布同步语义更新：
  - `association`：成员/属性级（同步到 `members[]/properties[]` 的 `associatedClassifierId`）
  - `dependency`：class 级（同步到 `namespaces[].associations[]`）
- `uml-class` relation 可选来源槽位元信息：
  - `fromSlotSection: 'members' | 'properties'`
  - `fromSlotName: string`

## 规范来源（Source Of Truth）

- 类型定义（字段形状）：`packages/core/src/types.ts`
- 解析与校验（合法性规则/报错）：`packages/core/src/parse/blocks.ts`

当文档与代码不一致时，以代码为准。
