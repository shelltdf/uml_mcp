import type { AppLocale } from './app-locale';

/** 与 `buildFenceMarkdownForInsert` 历史默认一致（用于识别旧文档 + 中文插入） */
export const ZH_SQL_MODEL_GROUP_TITLE = '新 SQL Model 组';
export const ZH_SQL_PRIMARY_TABLE_TITLE = '主表';
export const ZH_KV_MODEL_GROUP_TITLE = '新 KV 文档集';
export const ZH_STRUCT_MODEL_GROUP_TITLE = '新层次结构';
export const ZH_INTERFACE_MODEL_GROUP_TITLE = '新接口模型';

export function defaultSqlModelGroupTitle(loc: AppLocale): string {
  return loc === 'en' ? 'New SQL model group' : ZH_SQL_MODEL_GROUP_TITLE;
}

export function defaultSqlPrimaryTableTitle(loc: AppLocale): string {
  return loc === 'en' ? 'Primary table' : ZH_SQL_PRIMARY_TABLE_TITLE;
}

export function defaultKvModelGroupTitle(loc: AppLocale): string {
  return loc === 'en' ? 'New KV document set' : ZH_KV_MODEL_GROUP_TITLE;
}

export function defaultStructModelGroupTitle(loc: AppLocale): string {
  return loc === 'en' ? 'New hierarchy' : ZH_STRUCT_MODEL_GROUP_TITLE;
}

export function defaultInterfaceModelGroupTitle(loc: AppLocale): string {
  return loc === 'en' ? 'New interface model' : ZH_INTERFACE_MODEL_GROUP_TITLE;
}

/** 英文 Dock 摘要：若标题仍是历史中文默认，则改显示技术摘要行 */
export function isZhDefaultModelBlockTitle(kind: string, title: string): boolean {
  const t = title.trim();
  if (kind === 'smw-model-sql') return t === ZH_SQL_MODEL_GROUP_TITLE;
  if (kind === 'smw-model-kv') return t === ZH_KV_MODEL_GROUP_TITLE;
  if (kind === 'smw-model-struct') return t === ZH_STRUCT_MODEL_GROUP_TITLE;
  if (kind === 'smw-model-interface') return t === ZH_INTERFACE_MODEL_GROUP_TITLE;
  return false;
}
