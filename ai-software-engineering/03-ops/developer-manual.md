# 开发维护说明

## 仓库布局

- `ai-software-engineering/`：四阶段文档（勿放入实现产物）。
- `uml-vue-sdi/`：Vue 实现。
- `examples/sync-demo/`：示例契约与目录树（`uml.sync.md`、`diagrams/`、`namespace/`、`impl_cpp_project/` 等）；字段与行为以 `02-physical/uml-vue-sdi/spec.md` 为准。

## 命令

在 `uml-vue-sdi/`：

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览 `dist` |
| `npm run test` | 冒烟（见 `src/smoke.test.ts`） |

根目录 Python 封装：`build.py`、`test.py`、`run.py`、`publish.py`、`dev.py`（调用 npm）。

## Cursor 规则

- UML ↔ 代码协同：`.cursor/rules/uml-code-sync.mdc`。
