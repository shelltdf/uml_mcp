# 模型 ↔ 源码映射

| 元素 | 路径 |
|------|------|
| 应用入口 | `uml-vue-sdi/src/main.ts` |
| 根组件 / SDI 壳（标题条、菜单栏、主区、Dock 列、分割条、状态栏、模态与 Log） | `uml-vue-sdi/src/App.vue` |
| 工作区状态（标签、活动文件、脏标记、`directoryExistsInWorkspace` 等） | `uml-vue-sdi/src/stores/workspace.ts` |
| 格式与同步配置解析 / 序列化 | `uml-vue-sdi/src/lib/formats.ts` |
| `uml.sync.md` 表单 GUI | `uml-vue-sdi/src/components/SyncConfigEditor.vue` |
| Mermaid 预览 | `uml-vue-sdi/src/components/MermaidPreview.vue` |
| `classDiagram` 可编辑画布（类框、继承/关联、布局注释） | `uml-vue-sdi/src/components/ClassDiagramCanvas.vue`、`uml-vue-sdi/src/lib/classDiagramModel.ts` |
| `*.class.md` 画布 + 表格 | `uml-vue-sdi/src/components/ClassClassMdCanvas.vue`、`uml-vue-sdi/src/lib/classClassMdModel.ts` |
| `*.code.md` 画布 + 表单 | `uml-vue-sdi/src/components/CodeMdCanvas.vue`、`uml-vue-sdi/src/lib/codeMdModel.ts` |
| 顶标签栏 | `uml-vue-sdi/src/components/EditorTabs.vue` |
| 右侧「文本内容」停靠 | `uml-vue-sdi/src/components/TextContentDock.vue` |
| 右侧「属性」停靠 | `uml-vue-sdi/src/components/PropertiesDock.vue` |
| 界面文案 i18n | `uml-vue-sdi/src/i18n/ui.ts` |
| 内置示例种子 | `uml-vue-sdi/src/demo/seedFiles.ts` |
