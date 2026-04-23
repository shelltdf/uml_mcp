import type { AppLocale } from './app-locale';
import type { MvModelColumnDef } from '@mvwb/core';

export interface SqlModelCanvasColDataTooltip {
  pivot: (name: string) => string;
  withComment: (comment: string) => string;
  nullableNull: string;
  nullableNot: string;
  pkBadge: string;
  uqBadge: string;
  logicType: (t: string) => string;
  tail: string;
}

export interface SqlModelCanvasUi {
  formatHintIntro: string;
  metaSectionTitle: string;
  modelIdInputTitle: string;
  groupCommentLabel: string;
  optionalPlaceholder: string;
  subtableTablistAria: string;
  subtableTabTitle: (id: string) => string;
  deleteSubtableButtonTitle: string;
  deleteSubtableAriaLabel: (id: string) => string;
  addSubtableButtonTitle: string;
  addSubtableLabel: string;
  ddlSectionAria: string;
  ddlFoldTitle: string;
  tooltipDdlFold: (expanded: boolean) => string;
  ddlFormatHint: string;
  tableIdInputTitle: string;
  subtableCommentLabel: string;
  ddlPreviewAria: string;
  columnNameAria: (i: number) => string;
  columnNameBlurTitle: string;
  columnTypeAria: (name: string) => string;
  columnTypeSelectTitle: string;
  columnNullableAria: (name: string) => string;
  columnPkAria: (name: string) => string;
  columnUniqueAria: (name: string) => string;
  defaultPlaceholder: string;
  defaultBlurTitle: string;
  columnCommentAria: (name: string) => string;
  columnDefaultAria: (name: string) => string;
  columnCommentPlaceholder: string;
  columnCommentTitle: string;
  moveColumnLeftTitle: string;
  moveColumnRightTitle: string;
  dropColumnTitle: string;
  dropColumnLabel: string;
  addColumnButton: string;
  dmlSectionAria: string;
  dmlFoldTitle: string;
  tooltipDmlFold: (expanded: boolean) => string;
  dmlFormatHint: string;
  whereLabel: string;
  wherePlaceholder: string;
  rowCountTotal: (n: number) => string;
  rowCountShown: (shown: number) => string;
  readonlyToggleHideTitle: string;
  readonlyToggleShowTitle: string;
  readonlyToggleHideLabel: string;
  readonlyToggleShowLabel: string;
  copyRowTitle: string;
  copyRowLabel: string;
  deleteRowTitle: string;
  deleteRowLabel: string;
  insertRowButton: string;
  clearAllRowsTitle: string;
  clearAllRowsLabel: string;
  readonlyPreviewSectionAria: string;
  readonlyPreviewSectionTitle: string;
  readonlyPreviewHint: (tableId: string, filtered: number, total: number) => string;
  tooltipSchemaNullable: string;
  tooltipSchemaPk: string;
  tooltipSchemaUq: string;
  colDataTooltip: SqlModelCanvasColDataTooltip;
  ddlPreviewNoColumns: string;
  ddlPreviewHeaderLine: string;
  alertCannotDeleteLastSubtable: string;
  alertSubtableIdEmpty: string;
  alertSubtableIdConflict: string;
  alertTableMinOneColumn: string;
  confirmDeleteColumn: (name: string) => string;
  alertColumnNameEmpty: string;
  alertColumnNameExists: string;
  alertIdPkCannotNullable: string;
  confirmClearAllRows: (n: number) => string;
  subtableDeleteTitle: string;
  subtableDeleteWarningLead: (id: string) => string;
  subtableDeleteLi1: string;
  subtableDeleteLi2: (subtableId: string) => string;
  subtableDeleteLi3: string;
  subtableDeleteCancelTitle: string;
  subtableDeleteCancelLabel: string;
  subtableDeleteConfirmTitle: string;
  subtableDeleteConfirmLabel: string;
}

const zh: SqlModelCanvasUi = {
  formatHintIntro:
    '本围栏为 Model（mv-model-sql）：一个代码块内可含多张子表；mv-view 为 View，通过 modelRefs 绑定 块id#子表id（见下方属性区说明）。子表用标签切换；可对子表做增删。',
  metaSectionTitle: 'Model 组 · 元数据',
  modelIdInputTitle: '围栏块 id，与 mv-view 的 modelRefs 第一段对齐 — 无全局快捷键',
  groupCommentLabel: '组 COMMENT（title）',
  optionalPlaceholder: '可选',
  subtableTablistAria: '子表（标签切换）',
  subtableTabTitle: (id) => `子表 ${id}；点击标签切换，× 删除（须确认）— 无全局快捷键`,
  deleteSubtableButtonTitle: '删除此子表（弹出确认）— 无全局快捷键',
  deleteSubtableAriaLabel: (id) => `删除子表 ${id}`,
  addSubtableButtonTitle: '新增一张子表 — 无全局快捷键',
  addSubtableLabel: '＋ 子表',
  ddlSectionAria: 'DDL 当前子表列定义',
  ddlFoldTitle: 'DDL · 当前子表列定义',
  tooltipDdlFold: (expanded) =>
    (expanded ? '折叠' : '展开') + ' DDL · 当前子表列定义 — 无全局快捷键',
  ddlFormatHint:
    '以 SQL 表设计语义呈现：COLUMN / 逻辑类型映射为示意 TYPE、NULL / NOT NULL、PRIMARY KEY（多列即联合）、UNIQUE、DEFAULT、列级 -- comment。下方 CREATE TABLE 为只读示意（对应当前子表）；落盘为 mv-model-sql JSON。默认值输入仍按 JSON 字面量解析。子表 id 可编辑（失焦校验唯一）。',
  tableIdInputTitle: '子表 id；须在同组内唯一 — 无全局快捷键',
  subtableCommentLabel: '子表 COMMENT（title）',
  ddlPreviewAria: 'CREATE TABLE 示意',
  columnNameAria: (i) => `列名 ${i + 1}`,
  columnNameBlurTitle: '失焦时校验并重命名（非空、同表不重复）— 无全局快捷键',
  columnTypeAria: (name) => `列 ${name} 类型`,
  columnTypeSelectTitle: '逻辑类型（写入 JSON）；单元格仍按文本编辑 — 无全局快捷键',
  columnNullableAria: (name) => `列 ${name} 可空`,
  columnPkAria: (name) => `列 ${name} 主键`,
  columnUniqueAria: (name) => `列 ${name} 唯一`,
  defaultPlaceholder: '空=无；null / true / 数字 / 文本',
  defaultBlurTitle: '失焦写入 JSON；空清除 — 无全局快捷键',
  columnCommentAria: (name) => `列 ${name} 注释`,
  columnDefaultAria: (name) => `列 ${name} 默认值`,
  columnCommentPlaceholder: '-- 列说明',
  columnCommentTitle: '仅设计/文档用 — 无全局快捷键',
  moveColumnLeftTitle: '左移 — 无全局快捷键',
  moveColumnRightTitle: '右移 — 无全局快捷键',
  dropColumnTitle: '删除列 — 无全局快捷键',
  dropColumnLabel: '删列',
  addColumnButton: '＋ ADD COLUMN',
  dmlSectionAria: 'DML 行集 JSON 单元格',
  dmlFoldTitle: 'DML · 行集（JSON 单元格）',
  tooltipDmlFold: (expanded) =>
    (expanded ? '折叠' : '展开') + ' DML · 行集（JSON 单元格） — 无全局快捷键',
  dmlFormatHint:
    "类比 UPDATE 单格编辑；INSERT/DELETE 用添加行、删行、复制行；筛选为全列子串匹配（视图层 LIKE '%…%' 语义，不写回 JSON）。",
  whereLabel: 'WHERE 子串',
  wherePlaceholder: '任意列 LIKE …',
  rowCountTotal: (n) => `共 ${n} 行`,
  rowCountShown: (shown) => ` · 显示 ${shown} 行`,
  readonlyToggleHideTitle: '隐藏下方只读平铺表（当前子表，与 DML 筛选一致）— 无全局快捷键',
  readonlyToggleShowTitle: '在画布内只读展示当前子表行（与上方 DML 同一 WHERE 筛选）— 无全局快捷键',
  readonlyToggleHideLabel: '隐藏只读视图',
  readonlyToggleShowLabel: '显示只读视图',
  copyRowTitle: '复制本行 — 无全局快捷键',
  copyRowLabel: '复制',
  deleteRowTitle: '删除本行 — 无全局快捷键',
  deleteRowLabel: '删行',
  insertRowButton: '＋ INSERT ROW',
  clearAllRowsTitle: '清空全部行 — 无全局快捷键',
  clearAllRowsLabel: '清空全部行',
  readonlyPreviewSectionAria: '当前子表只读平铺预览',
  readonlyPreviewSectionTitle: 'SELECT * 风格 · 只读（当前子表）',
  readonlyPreviewHint: (tableId, filtered, total) =>
    `与上方 DML 为同一子表 ${tableId}；行集与 WHERE 子串筛选一致（仅展示 ${filtered} / ${total} 行）。只读单元格，与只读表预览一致；未保存修改即时反映；落盘为 mv-model-sql JSON。`,
  tooltipSchemaNullable:
    '可空（NULLABLE）：该列在每一行 JSON 中可以不出现键，表示「未填」；数据区把单元格清空也会移除该键。取消可空后，每行必须包含此键，保存前会为缺键行自动补「默认值」或空串。解析会拒绝「必填列却缺键」的行。此为模式设计，不等同于单元格内 SQL NULL 字面量。无全局快捷键。',
  tooltipSchemaPk:
    '主键（PRIMARY KEY，PK）：勾选表示该列属于表的主键；多列同时勾选表示联合主键。标记会写入 mv-model-sql JSON，便于与 SQL 表设计对齐。当前工作台不会在保存时校验主键唯一、非空或自增。无全局快捷键。',
  tooltipSchemaUq:
    '唯一（UNIQUE，UQ）：勾选表示业务上希望该列在整张表内取值不重复（类似 SQL UNIQUE）。标记会写入 JSON；当前不会自动扫描全部行做重复校验，若需真唯一请在业务或后续校验中实现。无全局快捷键。',
  colDataTooltip: {
    pivot: (name) => `列「${name}」：数据区表头。`,
    withComment: (comment) => `列注释：${comment}`,
    nullableNull: '角标「null」= 可空：行 JSON 可省略该键；清空单元格会不写键。',
    nullableNot: '本列不可空：每行须有该键；缺省由默认值或空串补齐。',
    pkBadge: '角标「PK」= 已标主键（设计语义，多列即联合主键）。',
    uqBadge: '角标「UQ」= 已标唯一（设计语义，当前不自动查重）。',
    logicType: (t) => `逻辑类型：${t}。`,
    tail: '无全局快捷键。',
  },
  ddlPreviewNoColumns: '-- （无列，无法生成 DDL）',
  ddlPreviewHeaderLine: '-- 示意 DDL（不执行；保存仍为 mv-model-sql JSON）',
  alertCannotDeleteLastSubtable:
    '【警告】无法删除：Model 组内须至少保留一张子表。\n\n若需移除整组数据模型，请在主文档中删除对应的 mv-model-sql 围栏块。',
  alertSubtableIdEmpty: '子表 id 不能为空。',
  alertSubtableIdConflict: '子表 id 与同组其它表冲突。',
  alertTableMinOneColumn: '表至少保留一列。',
  confirmDeleteColumn: (name) => `确定删除列「${name}」？该列上的数据将从所有行中删除。`,
  alertColumnNameEmpty: '列名不能为空。',
  alertColumnNameExists: '列名已存在。',
  alertIdPkCannotNullable: '列「id」作为主键时不可设为可空。',
  confirmClearAllRows: (n) => `确定清空全部 ${n} 行数据？（表结构不变）`,
  subtableDeleteTitle: '删除子表',
  subtableDeleteWarningLead: (id) => `【警告】即将删除子表「${id}」。`,
  subtableDeleteLi1: '该子表上的列定义与全部行数据将从当前编辑内容中移除。',
  subtableDeleteLi2: (subtableId) =>
    `其它块中引用「块 id#${subtableId}」的 modelRefs 在保存后可能失效，需自行修正。`,
  subtableDeleteLi3: '此步在本会话内不可撤销（未保存前可关闭画布放弃全部修改）。',
  subtableDeleteCancelTitle: '放弃删除 — 无全局快捷键',
  subtableDeleteCancelLabel: '取消',
  subtableDeleteConfirmTitle: '确认删除该子表 — 无全局快捷键',
  subtableDeleteConfirmLabel: '确定删除',
};

const en: SqlModelCanvasUi = {
  formatHintIntro:
    'This fenced block is a Model (mv-model-sql): one block can hold multiple child tables; mv-view is a View and binds via modelRefs as blockId#tableId (see the property panel). Switch tables with tabs; you can add or remove tables.',
  metaSectionTitle: 'Model group · metadata',
  modelIdInputTitle: 'Fence block id — first segment of mv-view modelRefs — no global shortcut',
  groupCommentLabel: 'Group COMMENT (title)',
  optionalPlaceholder: 'Optional',
  subtableTablistAria: 'Child tables (tab switcher)',
  subtableTabTitle: (id) =>
    `Table ${id}: click tab to switch, × to delete (confirm) — no global shortcut`,
  deleteSubtableButtonTitle: 'Delete this table (opens confirm dialog) — no global shortcut',
  deleteSubtableAriaLabel: (id) => `Delete table ${id}`,
  addSubtableButtonTitle: 'Add a child table — no global shortcut',
  addSubtableLabel: '+ Table',
  ddlSectionAria: 'DDL — column definitions for the active table',
  ddlFoldTitle: 'DDL · column definitions (active table)',
  tooltipDdlFold: (expanded) =>
    (expanded ? 'Collapse' : 'Expand') + ' DDL · column definitions (active table) — no global shortcut',
  ddlFormatHint:
    'Uses SQL-style table design semantics: COLUMN / logical types map to illustrative TYPE, NULL / NOT NULL, PRIMARY KEY (composite if multiple), UNIQUE, DEFAULT, and per-column -- comment. The CREATE TABLE below is read-only (current table); persisted payload remains mv-model-sql JSON. Default values are parsed as JSON literals. Table id is editable (blur validates uniqueness in the group).',
  tableIdInputTitle: 'Child table id — must be unique within this model group — no global shortcut',
  subtableCommentLabel: 'Table COMMENT (title)',
  ddlPreviewAria: 'Illustrative CREATE TABLE',
  columnNameAria: (i) => `Column name ${i + 1}`,
  columnNameBlurTitle: 'On blur: validate and rename (non-empty, unique in table) — no global shortcut',
  columnTypeAria: (name) => `Column ${name} type`,
  columnTypeSelectTitle: 'Logical type (stored in JSON) — no global shortcut',
  columnNullableAria: (name) => `Column ${name} nullable`,
  columnPkAria: (name) => `Column ${name} primary key`,
  columnUniqueAria: (name) => `Column ${name} unique`,
  defaultPlaceholder: 'empty = none; null / true / number / text',
  defaultBlurTitle: 'On blur: write JSON literal; empty clears — no global shortcut',
  columnCommentAria: (name) => `Column ${name} comment`,
  columnDefaultAria: (name) => `Column ${name} default`,
  columnCommentPlaceholder: '-- column comment',
  columnCommentTitle: 'Design / documentation only — no global shortcut',
  moveColumnLeftTitle: 'Move left — no global shortcut',
  moveColumnRightTitle: 'Move right — no global shortcut',
  dropColumnTitle: 'Drop column — no global shortcut',
  dropColumnLabel: 'Drop col',
  addColumnButton: '+ ADD COLUMN',
  dmlSectionAria: 'DML — row JSON cells',
  dmlFoldTitle: 'DML · rows (JSON cells)',
  tooltipDmlFold: (expanded) =>
    (expanded ? 'Collapse' : 'Expand') + ' DML · rows (JSON cells) — no global shortcut',
  dmlFormatHint:
    "Like editing UPDATE cell-by-cell; use add row / delete row / duplicate for INSERT/DELETE semantics. Filter matches any column substring (view-layer LIKE '%…%' behavior; not written back to JSON).",
  whereLabel: 'WHERE filter',
  wherePlaceholder: 'Any column LIKE …',
  rowCountTotal: (n) => `${n} row${n === 1 ? '' : 's'} total`,
  rowCountShown: (shown) => ` · showing ${shown} row${shown === 1 ? '' : 's'}`,
  readonlyToggleHideTitle: 'Hide read-only grid (same filter as DML) — no global shortcut',
  readonlyToggleShowTitle: 'Show read-only rows for the active table (same WHERE as DML) — no global shortcut',
  readonlyToggleHideLabel: 'Hide read-only view',
  readonlyToggleShowLabel: 'Show read-only view',
  copyRowTitle: 'Duplicate this row — no global shortcut',
  copyRowLabel: 'Copy',
  deleteRowTitle: 'Delete this row — no global shortcut',
  deleteRowLabel: 'Delete row',
  insertRowButton: '+ INSERT ROW',
  clearAllRowsTitle: 'Clear all rows — no global shortcut',
  clearAllRowsLabel: 'Clear all rows',
  readonlyPreviewSectionAria: 'Read-only grid preview for the active table',
  readonlyPreviewSectionTitle: 'SELECT * style · read-only (active table)',
  readonlyPreviewHint: (tableId, filtered, total) =>
    `Same table as DML above (${tableId}). Rows respect the WHERE filter (${filtered} / ${total} shown). Read-only cells; unsaved edits show immediately; persisted as mv-model-sql JSON.`,
  tooltipSchemaNullable:
    'NULLABLE: each row JSON may omit this key meaning unset; clearing the cell removes the key. When not nullable, every row must include the key; missing keys are filled with default or empty string before save. Parser rejects rows missing required keys. This is schema design, not the SQL NULL literal in a cell. No global shortcut.',
  tooltipSchemaPk:
    'PRIMARY KEY (PK): checked columns belong to the primary key; multiple checked columns form a composite key. Stored in mv-model-sql JSON for SQL alignment. The workbench does not enforce uniqueness, NOT NULL, or autoincrement on save. No global shortcut.',
  tooltipSchemaUq:
    'UNIQUE (UQ): indicates values should not repeat across the table (SQL UNIQUE semantics). Flag is stored in JSON; rows are not automatically scanned for duplicates. No global shortcut.',
  colDataTooltip: {
    pivot: (name) => `Column "${name}": header in the data grid.`,
    withComment: (comment) => `Comment: ${comment}`,
    nullableNull: 'Badge null = nullable: key may be omitted; clearing the cell omits the key.',
    nullableNot: 'Not nullable: every row must have the key; missing values use default or empty string.',
    pkBadge: 'Badge PK = marked primary key (design semantics; multiple = composite).',
    uqBadge: 'Badge UQ = marked unique (design semantics; no automatic duplicate check).',
    logicType: (t) => `Logical type: ${t}.`,
    tail: 'No global shortcut.',
  },
  ddlPreviewNoColumns: '-- (no columns; cannot render DDL)',
  ddlPreviewHeaderLine: '-- Illustrative DDL (not executed; save remains mv-model-sql JSON)',
  alertCannotDeleteLastSubtable:
    'Cannot delete: a model group must keep at least one table.\n\nTo remove the whole model, delete the mv-model-sql fence block in the document.',
  alertSubtableIdEmpty: 'Table id cannot be empty.',
  alertSubtableIdConflict: 'Table id conflicts with another table in this group.',
  alertTableMinOneColumn: 'A table must keep at least one column.',
  confirmDeleteColumn: (name) =>
    `Delete column "${name}"? Values for this column will be removed from all rows.`,
  alertColumnNameEmpty: 'Column name cannot be empty.',
  alertColumnNameExists: 'Column name already exists.',
  alertIdPkCannotNullable: 'Column "id" cannot be nullable while it is the primary key.',
  confirmClearAllRows: (n) => `Clear all ${n} row${n === 1 ? '' : 's'}? (schema unchanged)`,
  subtableDeleteTitle: 'Delete table',
  subtableDeleteWarningLead: (id) => `Warning: you are about to delete table "${id}".`,
  subtableDeleteLi1: 'Column definitions and all row data for this table will be removed from the draft.',
  subtableDeleteLi2: (subtableId) =>
    `modelRefs such as blockId#${subtableId} in other blocks may break after save; fix them manually.`,
  subtableDeleteLi3: 'This action cannot be undone in-session (close the canvas without saving to discard all edits).',
  subtableDeleteCancelTitle: 'Cancel — no global shortcut',
  subtableDeleteCancelLabel: 'Cancel',
  subtableDeleteConfirmTitle: 'Confirm delete table — no global shortcut',
  subtableDeleteConfirmLabel: 'Delete',
};

const table: Record<AppLocale, SqlModelCanvasUi> = { zh, en };

export function sqlModelCanvasMessagesFor(loc: AppLocale): SqlModelCanvasUi {
  return table[loc] ?? en;
}

export function buildColumnDataHeaderTooltip(c: MvModelColumnDef, u: SqlModelCanvasUi): string {
  const t = u.colDataTooltip;
  const parts: string[] = [];
  parts.push(t.pivot(c.name));
  if (c.comment?.trim()) parts.push(t.withComment(c.comment.trim()));
  parts.push(c.nullable === true ? t.nullableNull : t.nullableNot);
  if (c.primaryKey === true) parts.push(t.pkBadge);
  if (c.unique === true) parts.push(t.uqBadge);
  if (c.type) parts.push(t.logicType(c.type));
  parts.push(t.tail);
  return parts.join(' ');
}
