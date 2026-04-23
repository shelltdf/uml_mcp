import type { AppLocale } from './app-locale';

export interface StructModelCanvasUi {
  sectionTitle: string;
  formatHintIntro: string;
  jsonTextareaAriaLabel: string;
}

const zh: StructModelCanvasUi = {
  sectionTitle: '结构化层次画布 · HDF5 风格',
  formatHintIntro:
    '类比 HDF5：顶层 root 为组（name、可选 attributes、子 groups[]、datasets[]）。数据集含 name、可选 dtype、data。保存前将整段 JSON 送解析器校验。',
  jsonTextareaAriaLabel: 'smw-model-struct JSON 正文',
};

const en: StructModelCanvasUi = {
  sectionTitle: 'Structured hierarchy canvas · HDF5-style',
  formatHintIntro:
    'HDF5-like model: top-level root is a group (name, optional attributes, child groups[], datasets[]). Each dataset has name, optional dtype, and data. The parser validates the full JSON before save.',
  jsonTextareaAriaLabel: 'Structured model JSON (smw-model-struct)',
};

const table: Record<AppLocale, StructModelCanvasUi> = { zh, en };

export function structModelCanvasMessagesFor(loc: AppLocale): StructModelCanvasUi {
  return table[loc] ?? en;
}
