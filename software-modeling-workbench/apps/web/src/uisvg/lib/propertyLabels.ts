import type { MessageKey } from '../i18n/messages'

/** 与 `useI18n().t` 一致，用于纯函数中拼接 tooltip */
export type TranslateFn = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string

/** UISVG QName（如 `uisvg:Form`）为第一行；第二行为语义 localName */
export function objectIdentityUisvgTooltip(
  uisvgLocalName: string,
  uisvgType: string,
  t: TranslateFn,
): string {
  return [`${uisvgType}`, t('tooltip.semanticLocalName', { name: uisvgLocalName })].join('\n')
}

/**
 * 第一行为 UISVG 完整类型名（QName）；其后为标识与可选名称。
 */
export function objectIdentityIdTooltip(
  domId: string,
  outlineLabel: string,
  uisvgTypeFull: string,
  t: TranslateFn,
): string {
  const lines: string[] = [`${uisvgTypeFull}`]
  lines.push(t('tooltip.idLine', { id: domId }))
  const name = outlineLabel.trim()
  if (name !== domId) {
    lines.push(t('tooltip.nameLine', { name: outlineLabel }))
  }
  return lines.join('\n')
}

/** 大纲折叠按钮 */
export function outlineFoldTitle(collapsed: boolean, t: TranslateFn): string {
  return collapsed ? t('outline.foldExpand') : t('outline.foldCollapse')
}

/** 大纲项 tooltip：第一行为 UISVG QName；其后为 ID、名称与操作说明 */
export function outlineItemTitle(
  p: { label: string; uisvgType: string; id: string },
  t: TranslateFn,
): string {
  const lines: string[] = [`${p.uisvgType}`]
  lines.push(t('tooltip.idLine', { id: p.id }))
  if (p.label.trim() !== p.id) {
    lines.push(t('tooltip.nameLine', { name: p.label }))
  }
  lines.push(t('outline.itemHint'))
  return lines.join('\n')
}
