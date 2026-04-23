# Payload 书写规范（sample-workspace）

为保持“核心能力”与“扩展能力”边界清晰，示例统一按下列规则书写：

| 分类 | 推荐写法 | 示例文件 |
|---|---|---|
| 核心 JSON payload | `payload` 直接写 JSON 对象 | `models-core.md` |
| Mermaid 文本扩展 | `payload` 用字符串（常为空串），正文放 `` ```mermaid `` 镜像段 | `models-mermaid.md` |
| startuml 插件片段 | 使用 `@startuml` 独立代码块（非 `mv-*` 核心契约） | `models-startuml.md` |

补充说明：

- `mv-view.kind` 属于 JSON 型（如 `uml-*`、`mindmap-ui`、`ui-design`）时，优先对象 payload。
- `mv-view.kind` 属于文本型扩展（如 `mermaid-*`）时，payload 维持字符串语义。
- `@startuml` 片段仅作为插件层文本示意，不参与 `mv-*` 核心契约。
