import type { AppLocale } from './app-locale';

/** 嵌入块画布的 Mermaid 类图编辑器（源自 uml-vue-sdi 文案裁剪） */
export type ClassDiagramCanvasMessages = {
  cdeNewClass: string;
  cdeNewClassHint: string;
  cdeToolbarAria: string;
  cdeAutoLayout: string;
  /** 工具提示：Alt+点击仅微调连线、不重建树形排版 */
  cdeAutoLayoutAltPreserve: string;
  /** 排版松弛：优先消除边交叉（无法从数学上保证任意图一定零交叉） */
  cdePrioritizeNoCrossing: string;
  cdePrioritizeNoCrossingTitle: string;
  cdeFit: string;
  cdeOrigin: string;
  cdeResetZoom: string;
  cdeZoomIn: string;
  cdeZoomOut: string;
  cdsInheritHandleHint: string;
  cdeSectionAttrs: string;
  cdeSectionProps: string;
  cdeSectionEnums: string;
  cdeSectionMethods: string;
  cdeShortcutsPanel: string;
  cdeShortcutsBody: string;
  cdeVisibilityPanel: string;
  cdeShowInherit: string;
  cdeShowAssoc: string;
  cdeLayoutBeauty: string;
  cdeLayoutBeautyFast: string;
  cdeLayoutBeautyBalanced: string;
  cdeLayoutBeautyPolish: string;
  cdeOpenCodespaceClass: string;
  cdeDeleteClass: string;
  cdeDeleteClassConfirm: string;
  cdeModelSourceInvalid: string;
  /** uml-class 仅观察 codespace 时在画布上的提示 */
  cdeObserveModeBanner: string;
  /** 右键：从 model 添加一层相关的类到画布 */
  cdeCtxAddRelatedHeader: string;
  cdeCtxRelatedInheritance: string;
  cdeCtxRelatedAssociation: string;
  cdeCtxRelatedNone: string;
  cdeCtxRelatedNeedModel: string;
  /** 当前类无法在 codespace 中解析（与双击打开失败同类） */
  cdeCtxRelatedNoResolve: string;
  /** 调试：复制当前画布状态 JSON */
  cdeCopyDrawingInfo: string;
  cdeCopyDrawingInfoTitle: string;
  /** 复制成功后按钮旁短暂提示（非 alert） */
  cdeCopyDrawingInfoToastOk: string;
  cdeCopyDrawingInfoToastFail: string;
};

export const classDiagramCanvasMessages: Record<AppLocale, ClassDiagramCanvasMessages> = {
  zh: {
    cdeNewClass: '新建类',
    cdeNewClassHint: '在视口中心附近添加新类框（名称自动避重）',
    cdeToolbarAria: '类图画布工具',
    cdeAutoLayout: '自动排版',
    cdeAutoLayoutAltPreserve: 'Alt+点击：保留类框位置，仅做关联约束/去重叠与连线松弛（不重建继承树排版）',
    cdePrioritizeNoCrossing: '先免交叉',
    cdePrioritizeNoCrossingTitle:
      '优先消除边交叉：松弛时先尽量把交叉数降到 0，再优化总长。复杂图仍可能残留交叉；亦非所有图都存在无交叉平面嵌入。',
    cdeFit: '适应',
    cdeOrigin: '原点',
    cdeResetZoom: '还原',
    cdeZoomIn: '放大',
    cdeZoomOut: '缩小',
    cdsInheritHandleHint: '拖拽到父类框以设置继承（子类顶部圆点连向父类）',
    cdeSectionAttrs: '属性',
    cdeSectionProps: 'Property',
    cdeSectionEnums: '枚举字面量',
    cdeSectionMethods: '操作',
    cdeShortcutsPanel: '快捷键',
    cdeShortcutsBody:
      '中键拖拽：平移画布\n滚轮：缩放\n左键点击类框：选中；Ctrl/⌘+点击：多选\n左键拖空白：框选\n左键拖拽类框：移动\n右侧成员/属性小三角拖拽：创建 association（同步到 members/properties）\n类框右上小三角拖拽：创建 dependency（class 级）\n双击类框：在 Codespace 中打开类编辑（需 modelRefs 绑定）',
    cdeVisibilityPanel: '显示',
    cdeShowInherit: '继承关系',
    cdeShowAssoc: '关联关系',
    cdeLayoutBeauty: '排版强度',
    cdeLayoutBeautyFast: '快速',
    cdeLayoutBeautyBalanced: '平衡',
    cdeLayoutBeautyPolish: '精修',
    cdeOpenCodespaceClass: '在 Codespace 中编辑类',
    cdeDeleteClass: '删除此类',
    cdeDeleteClassConfirm: '确定删除该类及其全部连线？此操作不可撤销。',
    cdeModelSourceInvalid: '未指定有效 model 来源。请先在“基本信息”中绑定可用的 modelRefs（块id#子表id）。',
    cdeObserveModeBanner: '仅观察：类与连线来自 codespace，只读；本视图仅保存布局位置等显示信息。',
    cdeCtxAddRelatedHeader: '添加相关类型（一层）',
    cdeCtxRelatedInheritance: '继承 / 实现',
    cdeCtxRelatedAssociation: '关联',
    cdeCtxRelatedNone: '无可添加的一层相关类型',
    cdeCtxRelatedNeedModel: '需绑定 modelRefs',
    cdeCtxRelatedNoResolve: '无法在 codespace 中解析当前类（检查 modelRefs / 类 id）',
    cdeCopyDrawingInfo: '复制调试',
    cdeCopyDrawingInfoTitle:
      '复制调试 JSON：含 renderGeometry（类框 nodeBounds、边 path 的 d、路由模式）；relationsSummary；payload 真源',
    cdeCopyDrawingInfoToastOk: '已复制',
    cdeCopyDrawingInfoToastFail: '复制失败',
  },
  en: {
    cdeNewClass: 'New class',
    cdeNewClassHint: 'Add a class box near the viewport center (name auto-deconflicted)',
    cdeToolbarAria: 'Class diagram toolbar',
    cdeAutoLayout: 'Auto layout',
    cdeAutoLayoutAltPreserve:
      'Alt+click: keep class positions; only enforce gaps, separate overlaps, relax wires (no inherit-tree relayout)',
    cdePrioritizeNoCrossing: 'Cross first',
    cdePrioritizeNoCrossingTitle:
      'Prioritize removing edge crossings during relax (minimize crossing count before wire length). Some graphs cannot be crossing-free; detection is heuristic.',
    cdeFit: 'Fit',
    cdeOrigin: 'Origin',
    cdeResetZoom: 'Reset zoom',
    cdeZoomIn: 'Zoom in',
    cdeZoomOut: 'Zoom out',
    cdsInheritHandleHint: 'Drag to a parent class to set inheritance',
    cdeSectionAttrs: 'Attributes',
    cdeSectionProps: 'Property',
    cdeSectionEnums: 'Enum literals',
    cdeSectionMethods: 'Methods',
    cdeShortcutsPanel: 'Shortcuts',
    cdeShortcutsBody:
      'Middle-drag: pan\nWheel: zoom\nClick class: select; Ctrl/Cmd+click: multi\nDrag empty: marquee\nDrag class: move\nDrag right member/property handles: create association (sync to members/properties)\nDrag top-right class handle: create dependency (class-level)\nDouble-click: open Codespace class editor (requires modelRefs)',
    cdeVisibilityPanel: 'Show',
    cdeShowInherit: 'Inheritance',
    cdeShowAssoc: 'Associations',
    cdeLayoutBeauty: 'Layout quality',
    cdeLayoutBeautyFast: 'Fast',
    cdeLayoutBeautyBalanced: 'Balanced',
    cdeLayoutBeautyPolish: 'Polish',
    cdeOpenCodespaceClass: 'Edit class in Codespace',
    cdeDeleteClass: 'Delete class',
    cdeDeleteClassConfirm: 'Delete this class and all attached lines? This cannot be undone.',
    cdeModelSourceInvalid:
      'No valid model source configured. Bind a usable modelRefs entry (blockId#tableId) in Basic Info first.',
    cdeObserveModeBanner:
      'Observe-only: classes and edges come from codespace (read-only). This view saves layout/positions only.',
    cdeCtxAddRelatedHeader: 'Add related types (one hop)',
    cdeCtxRelatedInheritance: 'Inheritance / realization',
    cdeCtxRelatedAssociation: 'Associations',
    cdeCtxRelatedNone: 'No one-hop related types',
    cdeCtxRelatedNeedModel: 'Requires modelRefs',
    cdeCtxRelatedNoResolve: 'Cannot resolve this class in bound codespace (check modelRefs / ids)',
    cdeCopyDrawingInfo: 'Copy debug',
    cdeCopyDrawingInfoTitle:
      'Copy debug JSON: renderGeometry (node bounds, SVG path d, edge render modes), relationsSummary, payload',
    cdeCopyDrawingInfoToastOk: 'Copied',
    cdeCopyDrawingInfoToastFail: 'Copy failed',
  },
};
