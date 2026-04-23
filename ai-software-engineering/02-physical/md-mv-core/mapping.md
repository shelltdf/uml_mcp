# md-mv-core ↔ 源码映射

| 逻辑 | 路径 |
|------|------|
| 解析与回写 | `software-modeling-workbench/packages/core/src/parse/blocks.ts`（含 `mv-model-codespace` 递归校验） |
| 契约类型 | `software-modeling-workbench/packages/core/src/types.ts`（含 `MvCodespaceNamespaceNode` 等 codespace 子结构） |
| 代码空间画布 UI | `CodespaceCanvasEditor.vue`、`CodespaceModuleSvgCanvas.vue`、`codespace/floating/*Float.vue`、`CodespaceFloatShell.vue`；视口 `composables/useCanvasViewport.ts`；布局 `utils/codespace-svg-layout.ts`；辅助 `utils/codespace-canvas.ts` |
| 引用 URI | `software-modeling-workbench/packages/core/src/refs/resolve.ts` |
| 导出 | `software-modeling-workbench/packages/core/src/index.ts` |
