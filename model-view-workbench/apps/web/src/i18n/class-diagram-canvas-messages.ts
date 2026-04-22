import type { AppLocale } from './app-locale';

/** 嵌入块画布的 Mermaid 类图编辑器（源自 uml-vue-sdi 文案裁剪） */
export type ClassDiagramCanvasMessages = {
  cdeNewClass: string;
  cdeNewClassHint: string;
  cdeToolbarAria: string;
  cdeAutoLayout: string;
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
  cdeOpenCodespaceClass: string;
  cdeDeleteClass: string;
  cdeDeleteClassConfirm: string;
  cdeModelSourceInvalid: string;
  /** uml-class 仅观察 codespace 时在画布上的提示 */
  cdeObserveModeBanner: string;
};

export const classDiagramCanvasMessages: Record<AppLocale, ClassDiagramCanvasMessages> = {
  zh: {
    cdeNewClass: '新建类',
    cdeNewClassHint: '在视口中心附近添加新类框（名称自动避重）',
    cdeToolbarAria: '类图画布工具',
    cdeAutoLayout: '自动排版',
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
      '中键拖拽：平移画布\n滚轮：缩放\n左键点击类框：选中；Ctrl/⌘+点击：多选\n左键拖空白：框选\n左键拖拽类框：移动\n双击类框：在 Codespace 中打开类编辑（需 modelRefs 绑定）',
    cdeVisibilityPanel: '显示',
    cdeShowInherit: '继承关系',
    cdeShowAssoc: '关联关系',
    cdeOpenCodespaceClass: '在 Codespace 中编辑类',
    cdeDeleteClass: '删除此类',
    cdeDeleteClassConfirm: '确定删除该类及其全部连线？此操作不可撤销。',
    cdeModelSourceInvalid: '未指定有效 model 来源。请先在“基本信息”中绑定可用的 modelRefs（块id#子表id）。',
    cdeObserveModeBanner: '仅观察：类与连线来自 codespace，只读；本视图仅保存布局位置等显示信息。',
  },
  en: {
    cdeNewClass: 'New class',
    cdeNewClassHint: 'Add a class box near the viewport center (name auto-deconflicted)',
    cdeToolbarAria: 'Class diagram toolbar',
    cdeAutoLayout: 'Auto layout',
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
      'Middle-drag: pan\nWheel: zoom\nClick class: select; Ctrl/Cmd+click: multi\nDrag empty: marquee\nDrag class: move\nDouble-click: open Codespace class editor (requires modelRefs)',
    cdeVisibilityPanel: 'Show',
    cdeShowInherit: 'Inheritance',
    cdeShowAssoc: 'Associations',
    cdeOpenCodespaceClass: 'Edit class in Codespace',
    cdeDeleteClass: 'Delete class',
    cdeDeleteClassConfirm: 'Delete this class and all attached lines? This cannot be undone.',
    cdeModelSourceInvalid:
      'No valid model source configured. Bind a usable modelRefs entry (blockId#tableId) in Basic Info first.',
    cdeObserveModeBanner:
      'Observe-only: classes and edges come from codespace (read-only). This view saves layout/positions only.',
  },
};
