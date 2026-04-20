import type { ComputedRef, InjectionKey } from 'vue';
import type { CodespaceLayoutLabelFns } from '../utils/codespace-svg-layout';
import type { AppLocale } from './app-locale';

/** `CodespaceCanvasEditor` provide → 子组件 inject */
export const CS_CANVAS_MSG_KEY: InjectionKey<ComputedRef<CodespaceCanvasMessages>> = Symbol('mvwb.csCanvasMsg');

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
  formatVarLabel: (name: string) => string;
  formatFnLabel: (name: string) => string;
  formatMacroLabel: (name: string) => string;
  formatModuleFallback: (mi: number) => string;
  dockSummaryMeta: string;
  dockSummaryModuleBare: string;
  dockSummaryNsBare: string;
  dockSummaryClassBare: string;
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
  svgCtxAddModuleTitle: string;
  svgCtxAddModuleLabel: string;
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
  flNsNameTitle: string;
  flNsQNameTitle: string;
  flNsNotesTitle: string;
  flNsAddChildNsTitle: string;
  flNsAddChildNsLabel: string;
  flNsAddClassTitle: string;
  flNsAddClassLabel: string;
  flNsAddVarTitle: string;
  flNsAddVarLabel: string;
  flNsAddFnTitle: string;
  flNsAddFnLabel: string;
  flNsAddMacroTitle: string;
  flNsAddMacroLabel: string;
  flNsDeleteTitle: string;
  flNsDeleteLabel: string;
  flVarDeleteTitle: string;
  flVarDeleteLabel: string;
  flFnDeleteTitle: string;
  flFnDeleteLabel: string;
  flMacroDeleteTitle: string;
  flMacroDeleteLabel: string;
  flClsIdTitle: string;
  flClsNameTitle: string;
  flClsKindTitle: string;
  flClsAbstractTitle: string;
  flClsStereotypeTitle: string;
  flClsTemplateParamsLabel: string;
  flClsTemplateParamsTitle: string;
  flClsNotesTitle: string;
  flClsBasesHeading: string;
  flClsTargetIdTitle: string;
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
  flClsMemberTypeSigTitle: string;
  flClsRemoveMemberTitle: string;
  flClsRemoveMemberLabel: string;
  flClsAddMemberTitle: string;
  flClsAddMemberLabel: string;
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
  formatVarLabel: (name) => `Variable${sep}${name}`,
  formatFnLabel: (name) => `Function${sep}${name}`,
  formatMacroLabel: (name) => `Macro${sep}${name}`,
  formatModuleFallback: (mi) => `Module[${mi}]`,
  dockSummaryMeta: 'Block & workspace',
  dockSummaryModuleBare: 'Module',
  dockSummaryNsBare: 'Namespace',
  dockSummaryClassBare: 'Class',
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
  svgCtxAddModuleTitle: 'Add module — no global shortcut',
  svgCtxAddModuleLabel: '＋ Add module',
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
  flNsNameTitle: 'Namespace name — no global shortcut',
  flNsQNameTitle: 'Qualified name (optional) — no global shortcut',
  flNsNotesTitle: 'Notes — no global shortcut',
  flNsAddChildNsTitle: 'Child namespace — no global shortcut',
  flNsAddChildNsLabel: '＋ Child namespace',
  flNsAddClassTitle: 'Class — no global shortcut',
  flNsAddClassLabel: '＋ Class',
  flNsAddVarTitle: 'Variable — no global shortcut',
  flNsAddVarLabel: '＋ Variable',
  flNsAddFnTitle: 'Function — no global shortcut',
  flNsAddFnLabel: '＋ Function',
  flNsAddMacroTitle: 'Macro — no global shortcut',
  flNsAddMacroLabel: '＋ Macro',
  flNsDeleteTitle: 'Delete namespace subtree — no global shortcut',
  flNsDeleteLabel: 'Delete namespace…',
  flVarDeleteTitle: 'Delete variable — no global shortcut',
  flVarDeleteLabel: 'Delete variable',
  flFnDeleteTitle: 'Delete function — no global shortcut',
  flFnDeleteLabel: 'Delete function',
  flMacroDeleteTitle: 'Delete macro — no global shortcut',
  flMacroDeleteLabel: 'Delete macro',
  flClsIdTitle: 'Class id — no global shortcut',
  flClsNameTitle: 'Class name — no global shortcut',
  flClsKindTitle: 'Kind — no global shortcut',
  flClsAbstractTitle: 'abstract — no global shortcut',
  flClsStereotypeTitle: 'Stereotype — no global shortcut',
  flClsTemplateParamsLabel: 'templateParams (comma or newline separated)',
  flClsTemplateParamsTitle: 'Template parameters — no global shortcut',
  flClsNotesTitle: 'Notes — no global shortcut',
  flClsBasesHeading: 'bases (generalization / realization)',
  flClsTargetIdTitle: 'targetId — no global shortcut',
  flClsRelationTitle: 'relation — no global shortcut',
  flClsDelShortTitle: 'Remove — no global shortcut',
  flClsDelShortLabel: 'Del',
  flClsAddBaseTitle: 'Add base — no global shortcut',
  flClsAddBaseLabel: '＋ base',
  flClsMembersHeading: 'members',
  flClsMemberNameTitle: 'Member name — no global shortcut',
  flClsMemberKindTitle: 'Member kind — no global shortcut',
  flClsMemberVisTitle: 'Visibility — no global shortcut',
  flClsMemberVirtualTitle: 'virtual — no global shortcut',
  flClsMemberTypeSigTitle: 'type or signature — no global shortcut',
  flClsRemoveMemberTitle: 'Remove member — no global shortcut',
  flClsRemoveMemberLabel: 'Del',
  flClsAddMemberTitle: 'Add member — no global shortcut',
  flClsAddMemberLabel: '＋ member',
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
  svgCtxAddModuleTitle: '添加模块 — 无全局快捷键',
  svgCtxAddModuleLabel: '＋ Add module',
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
  flNsDeleteTitle: '删除命名空间子树 — 无全局快捷键',
  flNsDeleteLabel: '删除命名空间…',
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
  flClsAddMemberTitle: '添加成员 — 无全局快捷键',
  flClsRemoveClassTitle: '删除该类 — 无全局快捷键',
  flClsRemoveClassLabel: '删除类',
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
    varRow: M.formatVarLabel,
    fnRow: M.formatFnLabel,
    macroRow: M.formatMacroLabel,
    moduleNode: M.formatModuleLabel,
    moduleFallback: M.formatModuleFallback,
  };
}
