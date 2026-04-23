import type { AppLocale } from './app-locale';

export interface InterfaceModelCanvasUi {
  sectionTitle: string;
  formatHintIntro: string;
  jsonTextareaAriaLabel: string;
}

const zh: InterfaceModelCanvasUi = {
  sectionTitle: '接口图模型画布 · 端点列表示意',
  formatHintIntro:
    '接口图（文档化）：非空 endpoints[]；每条须含非空 id、name，可选 method / path / notes（均为字符串）。端点 id 在块内须唯一。不等同于 OpenAPI 等正式契约，仅供示意与对齐讨论。',
  jsonTextareaAriaLabel: 'smw-model-interface JSON 正文',
};

const en: InterfaceModelCanvasUi = {
  sectionTitle: 'Interface diagram model · endpoint list',
  formatHintIntro:
    'Documented interface diagram: non-empty endpoints[]; each item needs non-empty id and name, optional method / path / notes (all strings). Endpoint id must be unique within the block. Not a formal OpenAPI contract—for illustration and discussion only.',
  jsonTextareaAriaLabel: 'Interface model JSON (smw-model-interface)',
};

const table: Record<AppLocale, InterfaceModelCanvasUi> = { zh, en };

export function interfaceModelCanvasMessagesFor(loc: AppLocale): InterfaceModelCanvasUi {
  return table[loc] ?? en;
}
