import type { ComputedRef, InjectionKey } from 'vue';
import type { CodespaceLayoutLabelFns } from '../utils/codespace-svg-layout';
import type { AppLocale } from './app-locale';

/** `CodespaceCanvasEditor` provide → 子组件 inject */
export const CS_CANVAS_MSG_KEY: InjectionKey<ComputedRef<CodespaceCanvasMessages>> = Symbol('smw.csCanvasMsg');

/**
 * 代码空间模型画布文案。
 *
 * **与模型 / 代码 id 对齐的字符串**（节点类型前缀、Dock 类型栏、悬浮窗标题上的 Module/NS/Class/…、
 * 新建节点默认 `name` 等）在 `codespaceCanvasMessagesEn` 中统一定义为 **ASCII 英文**；
 * `zh` 通过 `{ ...en, ...overrides }` 仅覆盖说明性 UI（对话框、错误提示、画布快捷键区等），
 * 避免中文界面下出现不可作为标识符的默认名或与代码语义不一致的中文类型词。
 */
export interface CodespaceCanvasMessages {
  formatModuleLabel: (name: string) => string;
  formatNsLabel: (name: string) => string;
  formatClassLabel: (name: string) => string;
  formatEnumLabel: (name: string) => string;
  formatVarLabel: (name: string) => string;
  formatFnLabel: (name: string) => string;
  formatMacroLabel: (name: string) => string;
  formatModuleFallback: (mi: number) => string;
  dockSummaryMeta: string;
  dockSummaryModuleBare: string;
  dockSummaryNsBare: string;
  dockSummaryClassBare: string;
  dockSummaryEnumBare: string;
  dockSummaryVarBare: string;
  dockSummaryFnBare: string;
  dockSummaryMacroBare: string;
  dockEmpty: string;
  dockUnset: string;
  dockKindUnsetClass: string;
  dockYes: string;
  dockNo: string;
  dockNodeType: string;
  dockBlockWorkspace: string;
  dockBlockId: string;
  dockTitle: string;
  dockWorkspaceRoot: string;
  dockModuleCount: string;
  dockError: string;
  dockInvalidModuleIndex: (mi: number) => string;
  dockModule: string;
  dockTopLevelNsCount: string;
  dockHierarchy: string;
  dockPathIndices: string;
  dockTopLevel: string;
  dockCannotResolveNs: string;
  dockChildNsCount: string;
  dockClassCount: string;
  dockVarCount: string;
  dockFnCount: string;
  dockMacroCount: string;
  dockAssocCount: string;
  dockParentNsInvalid: string;
  dockClassifierNode: string;
  dockInvalidClassIndex: (ci: number) => string;
  dockInvalidEnumIndex: (eni: number) => string;
  dockInvalidVarIndex: (vi: number) => string;
  dockInvalidFnIndex: (fi: number) => string;
  dockInvalidMacroIndex: (maci: number) => string;
  dockMembersCount: string;
  dockBasesNone: string;
  /** bases 行内多条关系之间的分隔 */
  dockBasesJoin: string;
  /** 面包屑：模块 › NS › … */
  dockBreadcrumbSep: string;
  svgKeysSummary: string;
  svgKeysTitle: string;
  svgKeysBody: string;
  svgAriaModuleTree: string;
  /** 外层画布壳（div）：含快捷键/工具条/视口 HUD，不等同于单一 svg */
  svgCanvasRegionAria: string;
  svgHudAria: string;
  svgZoomOutTitle: string;
  svgZoomPctTitle: string;
  svgZoomInTitle: string;
  svgFitTitle: string;
  svgFitLabel: string;
  svgOriginTitle: string;
  svgOriginLabel: string;
  svgResetTitle: string;
  svgResetLabel: string;
  /** 重新跑布局算法并适应视口（与 Fit 区别：强制重算布局缓存） */
  svgRelayoutTitle: string;
  svgRelayoutLabel: string;
  /** 左侧浮动工具条（与 UML 类图画布 `cde-canvas-toolbar` 语义对齐） */
  svgCanvasToolbarAria: string;
  svgCtxAddModuleTitle: string;
  svgCtxAddModuleLabel: string;
  floatMaximizeTitle: string;
  floatRestoreTitle: string;
  floatCloseTitle: string;
  edMetaBarTitle: string;
  edMetaAria: string;
  edIdReadonlyTitle: string;
  edTitleFieldTitle: string;
  edWorkspaceRootTitle: string;
  edAdvancedSummary: string;
  edAdvancedHint: string;
  edAdvancedApplyTitle: string;
  edAdvancedApplyLabel: string;
  edJsonNeedObjectModules: string;
  edJsonParseFail: string;
  edKeepOneModule: string;
  edDelModuleTitle: string;
  edDelModuleDesc: string;
  edDelNsTitle: string;
  edDelNsDesc: string;
  edCancel: string;
  edCancelBtnTitle: string;
  edConfirmDelete: string;
  edConfirmDeleteBtnTitle: string;
  newModuleName: string;
  newNsName: string;
  newChildNsName: string;
  newClassName: string;
  newEnumName: string;
  newVarName: string;
  newFnName: string;
  newMacroName: string;
  /** 新建类成员默认名 */
  newMemberName: string;
  flModuleTitle: (name: string) => string;
  flModuleBare: string;
  flNsTitle: (name: string) => string;
  flNsBare: string;
  flVarTitle: (name: string) => string;
  flVarBare: string;
  flFnTitle: (name: string) => string;
  flFnBare: string;
  flMacroTitle: (name: string) => string;
  flMacroBare: string;
  flClassifierTitle: (name: string) => string;
  flClassifierBare: string;
  flModIdTitle: string;
  flModNameTitle: string;
  flModPathTitle: string;
  flModRoleTitle: string;
  flModNotesTitle: string;
  flModAddRootNsTitle: string;
  flModAddRootNsLabel: string;
  flModDeleteTitle: string;
  flModDeleteLabel: string;
  flModNameEnglishOnly: string;
  flNsNameTitle: string;
  flNsQNameTitle: string;
  flNsNotesTitle: string;
  flNsAddChildNsTitle: string;
  flNsAddChildNsLabel: string;
  flNsAddClassTitle: string;
  flNsAddClassLabel: string;
  flNsAddEnumTitle: string;
  flNsAddEnumLabel: string;
  flNsAddVarTitle: string;
  flNsAddVarLabel: string;
  flNsAddFnTitle: string;
  flNsAddFnLabel: string;
  flNsAddMacroTitle: string;
  flNsAddMacroLabel: string;
  flNsDeleteTitle: string;
  flNsDeleteLabel: string;
  flNsNameEnglishOnly: string;
  flVarDeleteTitle: string;
  flVarDeleteLabel: string;
  flFnDeleteTitle: string;
  flFnDeleteLabel: string;
  flMacroDeleteTitle: string;
  flMacroDeleteLabel: string;
  flClsIdTitle: string;
  /** 类 id 输入框下方说明：随名称/路径重算 id、关系引用自动改写 */
  flClsIdReadonlyHint: string;
  flClsNameTitle: string;
  flClsKindTitle: string;
  flClsAbstractTitle: string;
  flClsStereotypeTitle: string;
  flClsStereotypePlaceholder: string;
  flClsTemplateParamsLabel: string;
  flClsTemplateParamsTitle: string;
  flClsTemplateParamsPlaceholder: string;
  flClsNotesTitle: string;
  flClsNotesPlaceholder: string;
  flClsBasesHeading: string;
  /** bases 行：按名称选择基类型时的字段标签 */
  flClsBaseTypeLabel: string;
  /** bases 行：解析后的名称 + id 只读展示说明 */
  flClsBaseRefCaption: string;
  /** bases 下拉：选择基类型（存储仍为 targetId） */
  flClsTargetIdTitle: string;
  /** targetId 不在当前围栏类表中时的下拉首项前缀 */
  flClsBaseInvalidTargetPrefix: string;
  flClsRelationTitle: string;
  flClsDelShortTitle: string;
  flClsDelShortLabel: string;
  flClsAddBaseTitle: string;
  flClsAddBaseLabel: string;
  flClsMembersHeading: string;
  flClsMemberNameTitle: string;
  flClsMemberKindTitle: string;
  flClsMemberVisTitle: string;
  flClsMemberVirtualTitle: string;
  flClsMemberStaticTitle: string;
  flClsMemberTypeSigTitle: string;
  flClsMemberAccessorTitle: string;
  flClsMemberMethodKindTitle: string;
  flClsMemberOperatorTitle: string;
  flClsRemoveMemberTitle: string;
  flClsRemoveMemberLabel: string;
  flClsAddMemberTitle: string;
  flClsAddMemberLabel: string;
  flClsFieldsHeading: string;
  flClsMethodsHeading: string;
  flClsEnumLiteralsHeading: string;
  flClsAddFieldTitle: string;
  flClsAddFieldLabel: string;
  flClsAddMethodTitle: string;
  flClsAddMethodLabel: string;
  flClsAddEnumLiteralTitle: string;
  flClsAddEnumLiteralLabel: string;
  flClsRemoveClassTitle: string;
  flClsRemoveClassLabel: string;
  flTechIdTitle: string;
  flTechNameTitle: string;
  flTechTypeTitle: string;
  flTechNotesTitle: string;
  flTechSignatureTitle: string;
  flTechParamsTitle: string;
  flTechDefSnippetTitle: string;
}

const sep = ' · ';

/** 模型 / 画布 / Dock 技术层：各语言共用（ASCII，便于与代码符号一致） */
export const codespaceCanvasMessagesEn: CodespaceCanvasMessages = {
  formatModuleLabel: (name) => `Module${sep}${name}`,
  formatNsLabel: (name) => `NS${sep}${name}`,
  formatClassLabel: (name) => `Class${sep}${name}`,
  formatEnumLabel: (name) => `Enum${sep}${name}`,
  formatVarLabel: (name) => `Variable${sep}${name}`,
  formatFnLabel: (name) => `Function${sep}${name}`,
  formatMacroLabel: (name) => `Macro${sep}${name}`,
  formatModuleFallback: (mi) => `Module[${mi}]`,
  dockSummaryMeta: 'Block & workspace',
  dockSummaryModuleBare: 'Module',
  dockSummaryNsBare: 'Namespace',
  dockSummaryClassBare: 'Class',
  dockSummaryEnumBare: 'Enum',
  dockSummaryVarBare: 'Variable',
  dockSummaryFnBare: 'Function',
  dockSummaryMacroBare: 'Macro',
  dockEmpty: '(none)',
  dockUnset: '(empty)',
  dockKindUnsetClass: '(unset, defaults to class)',
  dockYes: 'yes',
  dockNo: 'no',
  dockNodeType: 'Node type',
  dockBlockWorkspace: 'Block & workspace',
  dockBlockId: 'Block id',
  dockTitle: 'title',
  dockWorkspaceRoot: 'workspaceRoot',
  dockModuleCount: 'Modules',
  dockError: 'Error',
  dockInvalidModuleIndex: (mi) => `Invalid module index ${mi}`,
  dockModule: 'Module',
  dockTopLevelNsCount: 'Top-level namespaces',
  dockHierarchy: 'Hierarchy',
  dockPathIndices: 'Path indices',
  dockTopLevel: '(root)',
  dockCannotResolveNs: 'Cannot resolve this namespace node',
  dockChildNsCount: 'Child namespaces',
  dockClassCount: 'Classes',
  dockVarCount: 'Variables',
  dockFnCount: 'Functions',
  dockMacroCount: 'Macros',
  dockAssocCount: 'Associations',
  dockParentNsInvalid: 'Parent namespace invalid',
  dockClassifierNode: 'Classifier (class / interface / struct)',
  dockInvalidClassIndex: (ci) => `Invalid class index ${ci}`,
  dockInvalidEnumIndex: (eni) => `Invalid enum index ${eni}`,
  dockInvalidVarIndex: (vi) => `Invalid variable index ${vi}`,
  dockInvalidFnIndex: (fi) => `Invalid function index ${fi}`,
  dockInvalidMacroIndex: (maci) => `Invalid macro index ${maci}`,
  dockMembersCount: 'Members',
  dockBasesNone: '(none)',
  dockBasesJoin: '; ',
  dockBreadcrumbSep: ' › ',
  svgKeysSummary: 'Shortcuts & actions',
  svgKeysTitle: 'Expand / collapse — no global shortcut',
  svgKeysBody: `Middle-drag: pan viewport
Wheel: zoom (pointer as anchor)
Click: select node
Double-click: open definition panel
Right-click: canvas menu (add module, etc.)`,
  svgAriaModuleTree: 'Codespace module tree',
  svgCanvasRegionAria:
    'Codespace model canvas — shortcuts, diagram tools, zoom controls, and the module tree diagram',
  svgHudAria: 'Viewport zoom',
  svgZoomOutTitle: 'Zoom out — no global shortcut',
  svgZoomPctTitle: 'Current zoom — no global shortcut',
  svgZoomInTitle: 'Zoom in — no global shortcut',
  svgFitTitle: 'Fit all — no global shortcut',
  svgFitLabel: 'Fit',
  svgOriginTitle: 'Origin (center content in viewport) — no global shortcut',
  svgOriginLabel: 'Origin',
  svgResetTitle: 'Reset 100% (anchor at viewport center) — no global shortcut',
  svgResetLabel: 'Reset',
  svgRelayoutTitle: 'Relayout module tree from model and fit view — no global shortcut',
  svgRelayoutLabel: 'Relayout',
  svgCanvasToolbarAria: 'Diagram tools',
  svgCtxAddModuleTitle: 'Add module — no global shortcut',
  svgCtxAddModuleLabel: '＋ Add module',
  floatMaximizeTitle: 'Maximize window — no global shortcut',
  floatRestoreTitle: 'Restore window size — no global shortcut',
  floatCloseTitle: 'Close — no global shortcut',
  edMetaBarTitle: 'Fence id is read-only (bound to block); title / workspaceRoot editable — no global shortcut',
  edMetaAria: 'id, title, workspaceRoot',
  edIdReadonlyTitle: 'Fence id is read-only — no global shortcut',
  edTitleFieldTitle: 'Title — no global shortcut',
  edWorkspaceRootTitle: 'workspaceRoot path segment — no global shortcut',
  edAdvancedSummary: 'Advanced: raw JSON',
  edAdvancedHint: 'After editing, click “Apply to tree”; must pass validation.',
  edAdvancedApplyTitle: 'Apply JSON — no global shortcut',
  edAdvancedApplyLabel: 'Apply to tree',
  edJsonNeedObjectModules: 'JSON must be an object with a modules array.',
  edJsonParseFail: 'JSON parse failed.',
  edKeepOneModule: 'At least one module is required.',
  edDelModuleTitle: 'Delete module',
  edDelModuleDesc: 'Remove this module from the codespace model? You can close the canvas without saving.',
  edDelNsTitle: 'Delete namespace',
  edDelNsDesc: 'This deletes the node, child namespaces, and attached content.',
  edCancel: 'Cancel',
  edCancelBtnTitle: 'Cancel — no global shortcut',
  edConfirmDelete: 'Delete',
  edConfirmDeleteBtnTitle: 'Confirm delete — no global shortcut',
  newModuleName: 'NewModule',
  newNsName: 'NewNamespace',
  newChildNsName: 'ChildNamespace',
  newClassName: 'NewClass',
  newEnumName: 'NewEnum',
  newVarName: 'newVariable',
  newFnName: 'newFunction',
  newMacroName: 'newMacro',
  newMemberName: 'member',
  flModuleTitle: (name) => `Module${sep}${name}`,
  flModuleBare: 'Module',
  flNsTitle: (name) => `Namespace${sep}${name}`,
  flNsBare: 'Namespace',
  flVarTitle: (name) => `Variable${sep}${name}`,
  flVarBare: 'Variable',
  flFnTitle: (name) => `Function${sep}${name}`,
  flFnBare: 'Function',
  flMacroTitle: (name) => `Macro${sep}${name}`,
  flMacroBare: 'Macro',
  flClassifierTitle: (name) => `Classifier${sep}${name}`,
  flClassifierBare: 'Classifier',
  flModIdTitle: 'Module id — no global shortcut',
  flModNameTitle: 'Module name — no global shortcut',
  flModPathTitle: 'Relative path — no global shortcut',
  flModRoleTitle: 'Role — no global shortcut',
  flModNotesTitle: 'Notes — no global shortcut',
  flModAddRootNsTitle: 'Add top-level namespace under this module — no global shortcut',
  flModAddRootNsLabel: '＋ Top-level namespace',
  flModDeleteTitle: 'Delete module — no global shortcut',
  flModDeleteLabel: 'Delete module…',
  flModNameEnglishOnly: 'Module name must be English letters, digits, or underscore, and start with a letter/underscore.',
  flNsNameTitle: 'Namespace name — no global shortcut',
  flNsQNameTitle: 'Qualified name (optional) — no global shortcut',
  flNsNotesTitle: 'Notes — no global shortcut',
  flNsAddChildNsTitle: 'Child namespace — no global shortcut',
  flNsAddChildNsLabel: '＋ Child namespace',
  flNsAddClassTitle: 'Class — no global shortcut',
  flNsAddClassLabel: '＋ Class',
  flNsAddEnumTitle: 'Enum literal — no global shortcut',
  flNsAddEnumLabel: '＋ Enum literal',
  flNsAddVarTitle: 'Variable — no global shortcut',
  flNsAddVarLabel: '＋ Variable',
  flNsAddFnTitle: 'Function — no global shortcut',
  flNsAddFnLabel: '＋ Function',
  flNsAddMacroTitle: 'Macro — no global shortcut',
  flNsAddMacroLabel: '＋ Macro',
  flNsDeleteTitle: 'Delete namespace subtree — no global shortcut',
  flNsDeleteLabel: 'Delete namespace…',
  flNsNameEnglishOnly: 'Namespace name must be English letters, digits, or underscore, and start with a letter/underscore.',
  flVarDeleteTitle: 'Delete variable — no global shortcut',
  flVarDeleteLabel: 'Delete variable',
  flFnDeleteTitle: 'Delete function — no global shortcut',
  flFnDeleteLabel: 'Delete function',
  flMacroDeleteTitle: 'Delete macro — no global shortcut',
  flMacroDeleteLabel: 'Delete macro',
  flClsIdTitle: 'Class id (read-only) — no global shortcut',
  flClsIdReadonlyHint:
    'Read-only: when you change the class name (and its namespace path), path-based ids are recomputed and references in bases / associations are remapped automatically.',
  flClsNameTitle: 'Class name — no global shortcut',
  flClsKindTitle: 'Kind — no global shortcut',
  flClsAbstractTitle: 'abstract — no global shortcut',
  flClsStereotypeTitle: 'Stereotype — no global shortcut',
  flClsStereotypePlaceholder: 'e.g. <<Entity>>',
  flClsTemplateParamsLabel: 'templateParams (comma or newline separated)',
  flClsTemplateParamsTitle: 'Template parameters — no global shortcut',
  flClsTemplateParamsPlaceholder: 'e.g. T, U',
  flClsNotesTitle: 'Notes — no global shortcut',
  flClsNotesPlaceholder: 'Describe design intent, constraints, and decisions...',
  flClsBasesHeading: 'bases (generalization / realization)',
  flClsBaseTypeLabel: 'Base type',
  flClsBaseRefCaption: 'Resolved name · stored id (read-only)',
  flClsTargetIdTitle: 'Pick a classifier by display name; JSON stores stable id as targetId — no global shortcut',
  flClsBaseInvalidTargetPrefix: '⚠ Invalid targetId:',
  flClsRelationTitle: 'relation — no global shortcut',
  flClsDelShortTitle: 'Remove — no global shortcut',
  flClsDelShortLabel: 'Del',
  flClsAddBaseTitle: 'Add base — no global shortcut',
  flClsAddBaseLabel: '＋ base',
  flClsMembersHeading: 'member[] (plain member variables)',
  flClsMemberNameTitle: 'Member name — no global shortcut',
  flClsMemberKindTitle: 'Member kind — no global shortcut',
  flClsMemberVisTitle: 'Visibility — no global shortcut',
  flClsMemberVirtualTitle: 'virtual — no global shortcut',
  flClsMemberStaticTitle: 'static — no global shortcut',
  flClsMemberTypeSigTitle: 'type or signature — no global shortcut',
  flClsMemberAccessorTitle: 'Property accessor setting — no global shortcut',
  flClsMemberMethodKindTitle: 'method category — no global shortcut',
  flClsMemberOperatorTitle: 'operator symbol — no global shortcut',
  flClsRemoveMemberTitle: 'Remove member — no global shortcut',
  flClsRemoveMemberLabel: 'Del',
  flClsAddMemberTitle: 'Add plain member variable to member[] — no global shortcut',
  flClsAddMemberLabel: '＋ member',
  flClsFieldsHeading: 'Property (private backing field + accessors)',
  flClsMethodsHeading: 'methods',
  flClsEnumLiteralsHeading: 'enum literals',
  flClsAddFieldTitle: 'Add Property — no global shortcut',
  flClsAddFieldLabel: '＋ Property',
  flClsAddMethodTitle: 'Add method — no global shortcut',
  flClsAddMethodLabel: '＋ method',
  flClsAddEnumLiteralTitle: 'Add enum literal — no global shortcut',
  flClsAddEnumLiteralLabel: '＋ enum literal',
  flClsRemoveClassTitle: 'Delete this class — no global shortcut',
  flClsRemoveClassLabel: 'Delete class',
  flTechIdTitle: 'id — no global shortcut',
  flTechNameTitle: 'name — no global shortcut',
  flTechTypeTitle: 'type — no global shortcut',
  flTechNotesTitle: 'notes — no global shortcut',
  flTechSignatureTitle: 'signature — no global shortcut',
  flTechParamsTitle: 'params — no global shortcut',
  flTechDefSnippetTitle: 'definitionSnippet — no global shortcut',
};

/** 中文界面：仅覆盖说明性文案；模型相关字符串继承 `codespaceCanvasMessagesEn` */
const codespaceCanvasZhOverrides: Partial<CodespaceCanvasMessages> = {
  dockSummaryMeta: '块与工作区',
  dockEmpty: '（无）',
  dockUnset: '（未填）',
  dockYes: '是',
  dockNo: '否',
  dockNodeType: '节点类型',
  dockBlockWorkspace: '块与工作区',
  dockError: '错误',
  dockInvalidModuleIndex: (mi) => `模块索引 ${mi} 无效`,
  dockCannotResolveNs: '无法解析该命名空间节点',
  dockParentNsInvalid: '父命名空间无效',
  dockInvalidClassIndex: (ci) => `类索引 ${ci} 无效`,
  dockInvalidEnumIndex: (eni) => `枚举索引 ${eni} 无效`,
  dockInvalidVarIndex: (vi) => `变量索引 ${vi} 无效`,
  dockInvalidFnIndex: (fi) => `函数索引 ${fi} 无效`,
  dockInvalidMacroIndex: (maci) => `宏索引 ${maci} 无效`,
  dockBasesNone: '（无）',
  dockBasesJoin: '；',
  dockTopLevel: '（顶层）',
  svgKeysSummary: '快捷键与操作',
  svgKeysTitle: '展开/折叠 — 无全局快捷键',
  svgKeysBody: `中键拖拽：平移视口
滚轮：缩放（以指针为锚点）
单击：选中节点
双击：打开定义悬浮窗
右键：画布菜单（添加模块等）`,
  svgAriaModuleTree: '代码空间模块树',
  svgCanvasRegionAria: '代码空间模型画布：快捷键、图示工具、缩放控制与模块树图',
  svgHudAria: '视口缩放',
  svgZoomOutTitle: '缩小 — 无全局快捷键',
  svgZoomPctTitle: '当前缩放 — 无全局快捷键',
  svgZoomInTitle: '放大 — 无全局快捷键',
  svgFitTitle: '适应全部 — 无全局快捷键',
  svgFitLabel: '适应',
  svgOriginTitle: '原点（内容中心对齐视口）— 无全局快捷键',
  svgOriginLabel: '原点',
  svgResetTitle: '还原 100%（以视口中心为锚）— 无全局快捷键',
  svgResetLabel: '还原',
  svgRelayoutTitle: '按当前模型重新计算树状布局并适应视口 — 无全局快捷键',
  svgRelayoutLabel: '重新排版',
  svgCanvasToolbarAria: '画布工具',
  svgCtxAddModuleTitle: '添加模块 — 无全局快捷键',
  svgCtxAddModuleLabel: '＋ Add module',
  floatMaximizeTitle: '窗口最大化 — 无全局快捷键',
  floatRestoreTitle: '还原窗口大小 — 无全局快捷键',
  floatCloseTitle: '关闭 — 无全局快捷键',
  edMetaBarTitle: '围栏内 id 与文档块绑定，只读；title / workspaceRoot 可编辑 — 无全局快捷键',
  edMetaAria: 'id、title、workspaceRoot',
  edIdReadonlyTitle: '围栏内 id 与文档块绑定，只读 — 无全局快捷键',
  edTitleFieldTitle: '标题 — 无全局快捷键',
  edWorkspaceRootTitle: 'workspaceRoot 工作区根路径片段 — 无全局快捷键',
  edAdvancedSummary: '高级：原始 JSON',
  edAdvancedHint: '编辑后点「应用到树」；须能通过解析校验。',
  edAdvancedApplyTitle: '应用 JSON — 无全局快捷键',
  edAdvancedApplyLabel: '应用到树',
  edJsonNeedObjectModules: 'JSON 须为对象且含 modules 数组。',
  edJsonParseFail: 'JSON 解析失败。',
  edKeepOneModule: '至少保留一个模块。',
  edDelModuleTitle: '删除模块',
  edDelModuleDesc: '确定从代码空间模型中删除该模块？未保存前可关闭画布放弃。',
  edDelNsTitle: '删除命名空间',
  edDelNsDesc: '将删除该节点及其子命名空间与挂载内容。',
  edCancel: '取消',
  edCancelBtnTitle: '取消 — 无全局快捷键',
  edConfirmDelete: '确定删除',
  edConfirmDeleteBtnTitle: '确定删除 — 无全局快捷键',
  flModDeleteTitle: '删除模块 — 无全局快捷键',
  flModDeleteLabel: '删除模块…',
  flModNameEnglishOnly: '模块名仅允许英文、数字、下划线，且必须以英文或下划线开头。',
  flNsDeleteTitle: '删除命名空间子树 — 无全局快捷键',
  flNsDeleteLabel: '删除命名空间…',
  flNsNameEnglishOnly: '命名空间名仅允许英文、数字、下划线，且必须以英文或下划线开头。',
  flVarDeleteTitle: '删除变量 — 无全局快捷键',
  flVarDeleteLabel: '删除变量',
  flFnDeleteTitle: '删除函数 — 无全局快捷键',
  flFnDeleteLabel: '删除函数',
  flMacroDeleteTitle: '删除宏 — 无全局快捷键',
  flMacroDeleteLabel: '删除宏',
  flClsDelShortTitle: '删除 — 无全局快捷键',
  flClsDelShortLabel: '删',
  flClsRemoveMemberTitle: '删除成员 — 无全局快捷键',
  flClsRemoveMemberLabel: '删',
  flClsAddMemberTitle: '添加普通成员变量到 member[] — 无全局快捷键',
  flClsMembersHeading: 'member[]（普通成员变量）',
  flClsStereotypePlaceholder: '例如 <<Entity>>',
  flClsTemplateParamsPlaceholder: '例如 T, U',
  flClsNotesPlaceholder: '可记录设计意图、约束与详细说明……',
  flClsMemberStaticTitle: 'static — 无全局快捷键',
  flClsMemberAccessorTitle: 'Property 访问器设置 — 无全局快捷键',
  flClsMemberMethodKindTitle: '方法类别 — 无全局快捷键',
  flClsMemberOperatorTitle: '操作符符号 — 无全局快捷键',
  flClsFieldsHeading: 'Property（私有 backing 字段 + 访问器）',
  flClsMethodsHeading: '方法',
  flClsEnumLiteralsHeading: '枚举字面量',
  flClsAddFieldTitle: '添加 Property — 无全局快捷键',
  flClsAddFieldLabel: '＋ Property',
  flClsAddMethodTitle: '添加方法 — 无全局快捷键',
  flClsAddMethodLabel: '＋ 方法',
  flClsAddEnumLiteralTitle: '添加枚举字面量 — 无全局快捷键',
  flClsAddEnumLiteralLabel: '＋ 枚举字面量',
  flNsAddEnumTitle: '添加枚举字面量 — 无全局快捷键',
  flNsAddEnumLabel: '＋ 枚举字面量',
  flClsRemoveClassTitle: '删除该类 — 无全局快捷键',
  flClsRemoveClassLabel: '删除类',
  flClsIdTitle: '类 id（只读）',
  flClsIdReadonlyHint:
    '只读：修改类名（及所在命名空间路径）后会按路径重算类 id，bases / associations 里对该类的引用会自动改写。',
  flClsBasesHeading: 'bases（继承 / 实现）',
  flClsBaseTypeLabel: '基类型',
  flClsBaseRefCaption: '解析名称 · 存储 id（只读）',
  flClsTargetIdTitle: '按类型名称选择基类；JSON 中仍以稳定 id 写入 targetId — 无全局快捷键',
  flClsBaseInvalidTargetPrefix: '⚠ 无效 targetId：',
};

export const codespaceCanvasMessages: Record<AppLocale, CodespaceCanvasMessages> = {
  en: codespaceCanvasMessagesEn,
  zh: { ...codespaceCanvasMessagesEn, ...codespaceCanvasZhOverrides },
};

export function makeCodespaceLayoutLabels(M: CodespaceCanvasMessages): CodespaceLayoutLabelFns {
  return {
    moduleBar: M.formatModuleLabel,
    nsHeader: M.formatNsLabel,
    classRow: M.formatClassLabel,
    enumRow: M.formatEnumLabel,
    varRow: M.formatVarLabel,
    fnRow: M.formatFnLabel,
    macroRow: M.formatMacroLabel,
    moduleNode: M.formatModuleLabel,
    moduleFallback: M.formatModuleFallback,
  };
}
