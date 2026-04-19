# md-mv-core ↔ 源码映射

| 逻辑 | 路径 |
|------|------|
| 解析与回写 | `model-view-workbench/packages/core/src/parse/blocks.ts`（含 `mv-model-codespace` 递归校验） |
| 契约类型 | `model-view-workbench/packages/core/src/types.ts`（含 `MvCodespaceNamespaceNode` 等 codespace 子结构） |
| 代码空间画布 UI | `model-view-workbench/apps/web/src/components/codespace/CodespaceCanvasEditor.vue`；辅助 `apps/web/src/utils/codespace-canvas.ts` |
| 引用 URI | `model-view-workbench/packages/core/src/refs/resolve.ts` |
| 导出 | `model-view-workbench/packages/core/src/index.ts` |
