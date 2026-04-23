import type { AppLocale } from './app-locale';

export interface KvModelCanvasUi {
  sectionTitle: string;
  formatHintIntro: string;
  blockIdLabel: string;
  blockIdInputTitle: string;
  optionalPlaceholder: string;
  formatHintDocs: string;
  documentHeading: (indexOneBased: number) => string;
  deleteDocTitle: string;
  deleteDocLabel: string;
  docJsonAriaLabel: (indexOneBased: number) => string;
  addDocumentButton: string;
  alertDocMustBeObject: string;
}

const zh: KvModelCanvasUi = {
  sectionTitle: 'KV 数据表画布 · 文档集',
  formatHintIntro:
    '类比 MongoDB collection：documents[] 中每条为独立 JSON 对象，键集合可不固定。保存时用解析器校验。块 id 只读。',
  blockIdLabel: '块 id（只读）',
  blockIdInputTitle: '块 id — 无全局快捷键',
  optionalPlaceholder: '可选',
  formatHintDocs: '每条下方为 JSON 对象；失焦时解析并格式化。可增删文档条数。',
  documentHeading: (n) => `文档 ${n}`,
  deleteDocTitle: '删除该文档 — 无全局快捷键',
  deleteDocLabel: '删除',
  docJsonAriaLabel: (n) => `文档 ${n} JSON`,
  addDocumentButton: '＋ 添加文档',
  alertDocMustBeObject: '每条文档须为 JSON 对象（类似 MongoDB 文档，键可自由；不可为数组或 null）。',
};

const en: KvModelCanvasUi = {
  sectionTitle: 'KV model canvas · documents',
  formatHintIntro:
    'Like a MongoDB collection: each entry in documents[] is a standalone JSON object; keys may vary per document. The parser validates on save. Block id is read-only.',
  blockIdLabel: 'Block id (read-only)',
  blockIdInputTitle: 'Block id — no global shortcut',
  optionalPlaceholder: 'Optional',
  formatHintDocs: 'Each area below is one JSON object; blur parses and pretty-prints. You can add or remove documents.',
  documentHeading: (n) => `Document ${n}`,
  deleteDocTitle: 'Remove this document — no global shortcut',
  deleteDocLabel: 'Remove',
  docJsonAriaLabel: (n) => `Document ${n} JSON`,
  addDocumentButton: '+ Add document',
  alertDocMustBeObject:
    'Each document must be a JSON object (Mongo-style; keys are free). Arrays and null are not allowed here.',
};

const table: Record<AppLocale, KvModelCanvasUi> = { zh, en };

export function kvModelCanvasMessagesFor(loc: AppLocale): KvModelCanvasUi {
  return table[loc] ?? en;
}
