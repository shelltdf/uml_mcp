# 示例入口：按核心与扩展拆分

为避免“核心能力”与“扩展能力”混写，本目录示例拆分为三个独立文件：

- 核心对象与核心视图：[`models-core.md`](models-core.md)
- Mermaid 扩展示例：[`models-mermaid.md`](models-mermaid.md)
- startuml（PlantUML）扩展示例：[`models-startuml.md`](models-startuml.md)

说明：

- `models-core.md` 仅包含核心契约示例（`smw-model-*` / `smw-view` 的核心 kind / `smw-map`）。
- `models-mermaid.md` 仅包含 `mermaid-*` 相关示例。
- `models-startuml.md` 仅包含 `@startuml` 语法片段示例（扩展用途）。

统一规则见：[`PAYLOAD_RULES.md`](PAYLOAD_RULES.md)。
