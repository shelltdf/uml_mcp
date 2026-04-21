/**
 * WinForms 风格控件中可作为子控件容器的语义标签（与 `uisvg:` 子元素 localName 一致）。
 * 插入组件库条目时：若当前选中其中之一，则新对象根挂到该 `<g>` 下，而非 `#layer-root` 顶层。
 */
export function isWinContainerUisvgLocalName(name: string): boolean {
  return (
    name === 'Form' ||
    name === 'Panel' ||
    name === 'GroupBox' ||
    name === 'TabControl' ||
    name === 'SplitContainer' ||
    name === 'FlowLayoutPanel' ||
    name === 'TableLayoutPanel'
  )
}
