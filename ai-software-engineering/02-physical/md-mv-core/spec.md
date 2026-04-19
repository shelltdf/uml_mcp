# md-mv-core 物理规格

## 围栏块语法

- 围栏首行必须为以下之一（整行，前后无其它字符）：`` ```mv-model ``、`` ```mv-view ``、`` ```mv-map ``。
- 围栏内为 **单个 JSON 对象**（允许首尾空白）；解析前对体文本 `trim()` 后 `JSON.parse`。
- 闭合围栏：行首为换行后的 `` ``` ``（即序列 `\n` + `` ``` ``）。

## mv-model

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| columns | array | 每项含 `name`（必填），可选 `type`、`nullable` |
| rows | array | 对象数组，键与列名对应 |

## mv-view

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| kind | string | 当前实现：`table-readonly` \| `mermaid-class` |
| modelRefs | string[] | 同文件 model 的 `id`，或 `ref:相对路径.md#blockId`（解析 API 见包内 `refs/`） |
| payload | string? | 视图载荷（如 Mermaid 源码） |

## mv-map

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| rules | array | 每项含 `modelId`、`targetPath`，可选 `template` |

## 块回写

`replaceBlockInnerById(source, blockId, newInnerJson)` 仅替换 **围栏内 JSON 体**（不含围栏行），保持围栏行与闭合围栏不变。

## 错误语义

- 重复 `id`：后出现的块丢弃并记录错误。
- JSON 无效 / 校验失败：记录错误并跳过该块；同文件其它块仍可解析。
