/**
 * 组件库按钮用小图标（16×16 viewBox），与 windowsUiControls 中控件 id 对应。
 * 仅为象形示意，非像素级还原各平台皮肤。
 */
export const WINDOWS_PALETTE_ICON_INNER: Record<string, string> = {
  Button:
    '<rect x="2" y="5" width="12" height="7" rx="1" fill="#e8ecf0" stroke="#6b6b6b" stroke-width="1"/><line x1="5" y1="8.5" x2="11" y2="8.5" stroke="#404040" stroke-width="0.8"/>',
  Label:
    '<line x1="2" y1="8" x2="13" y2="8" stroke="#303030" stroke-width="1.2"/><line x1="2" y1="11" x2="10" y2="11" stroke="#909090" stroke-width="0.8"/>',
  LinkLabel:
    '<path d="M2 10 L8 10" stroke="#0066cc" stroke-width="1.2"/><line x1="2" y1="12" x2="9" y2="12" stroke="#0066cc" stroke-width="0.6"/>',
  TextBox:
    '<rect x="2" y="5" width="12" height="7" fill="#fff" stroke="#6b6b6b"/><line x1="4" y1="8.5" x2="10" y2="8.5" stroke="#c0c0c0" stroke-width="0.6"/>',
  MaskedTextBox:
    '<rect x="2" y="5" width="12" height="7" fill="#fff" stroke="#6b6b6b"/><circle cx="4.5" cy="8.5" r="0.6" fill="#606060"/><circle cx="7" cy="8.5" r="0.6" fill="#606060"/><circle cx="9.5" cy="8.5" r="0.6" fill="#606060"/>',
  RichTextBox:
    '<rect x="2" y="3" width="12" height="11" fill="#fff" stroke="#6b6b6b"/><line x1="4" y1="6" x2="11" y2="6" stroke="#a0a0a0"/><line x1="4" y1="8.5" x2="10" y2="8.5" stroke="#a0a0a0"/><line x1="4" y1="11" x2="9" y2="11" stroke="#a0a0a0"/>',
  CheckBox:
    '<rect x="2" y="4.5" width="5" height="5" fill="#fff" stroke="#404040"/><path d="M3.5 7.5 L5 9 L7.5 5.5" fill="none" stroke="#202020" stroke-width="1"/><line x1="9" y1="7.5" x2="14" y2="7.5" stroke="#303030"/>',
  RadioButton:
    '<circle cx="4.5" cy="8" r="3.5" fill="#fff" stroke="#404040"/><circle cx="4.5" cy="8" r="1.8" fill="#303030"/><line x1="9" y1="8" x2="14" y2="8" stroke="#303030"/>',
  ComboBox:
    '<rect x="2" y="5" width="10" height="7" fill="#fff" stroke="#6b6b6b"/><rect x="11" y="5" width="3" height="7" fill="#e8e8e8" stroke="#6b6b6b"/><path d="M12 7.5 L13 7.5 L12.5 9 Z" fill="#404040"/>',
  ListBox:
    '<rect x="2" y="3" width="12" height="11" fill="#fff" stroke="#6b6b6b"/><line x1="4" y1="6" x2="11" y2="6" stroke="#c8c8c8"/><line x1="4" y1="9" x2="11" y2="9" stroke="#c8c8c8"/><rect x="3" y="5" width="8" height="2.5" fill="#cce8ff" opacity="0.7"/>',
  CheckedListBox:
    '<rect x="2" y="3" width="12" height="11" fill="#fff" stroke="#6b6b6b"/><rect x="3.5" y="4.5" width="3" height="3" fill="#fff" stroke="#404040"/><path d="M4.2 6.2 L5 7 L6.3 5" stroke="#202020" fill="none"/><rect x="3.5" y="8.5" width="3" height="3" fill="#fff" stroke="#404040"/>',
  NumericUpDown:
    '<rect x="2" y="5" width="9" height="7" fill="#fff" stroke="#6b6b6b"/><rect x="10.5" y="5" width="3.5" height="3.5" fill="#e8e8e8" stroke="#888"/><path d="M12 6.2 L12.5 7 L11.5 7 Z"/><rect x="10.5" y="8.5" width="3.5" height="3.5" fill="#e8e8e8" stroke="#888"/>',
  DateTimePicker:
    '<rect x="2" y="5" width="10" height="7" fill="#fff" stroke="#6b6b6b"/><rect x="11" y="5" width="3" height="7" fill="#f0f0f0" stroke="#6b6b6b"/><rect x="11.5" y="6" width="2" height="2" fill="none" stroke="#505050"/><line x1="12.25" y1="7.5" x2="12.25" y2="8.5" stroke="#505050"/>',
  MonthCalendar:
    '<rect x="2" y="3" width="12" height="11" fill="#fff" stroke="#6b6b6b"/><line x1="2" y1="6" x2="14" y2="6" stroke="#d0d0d0"/><rect x="4" y="8" width="2" height="2" fill="#cce8ff" stroke="#888"/><rect x="7" y="8" width="2" height="2" fill="none" stroke="#ddd"/>',
  TrackBar:
    '<rect x="2" y="7" width="12" height="3" fill="#e0e0e0" stroke="#888"/><rect x="6" y="5" width="3" height="7" rx="0.5" fill="#e8ecf0" stroke="#505050"/>',
  ProgressBar:
    '<rect x="2" y="6" width="12" height="5" fill="#fff" stroke="#6b6b6b"/><rect x="3" y="7" width="7" height="3" fill="#217346" opacity="0.5"/>',
  HScrollBar:
    '<rect x="2" y="6" width="12" height="5" fill="#e8e8e8" stroke="#888"/><rect x="6" y="7" width="4" height="3" fill="#d0d0d0" stroke="#707070"/>',
  VScrollBar:
    '<rect x="6" y="2" width="5" height="12" fill="#e8e8e8" stroke="#888"/><rect x="7" y="6" width="3" height="4" fill="#d0d0d0" stroke="#707070"/>',
  TreeView:
    '<rect x="2" y="3" width="12" height="11" fill="#fff" stroke="#6b6b6b"/><path d="M3 5 L5 5 L5 7 L3 7 Z" fill="#f8f8f8" stroke="#888"/><line x1="6" y1="6" x2="11" y2="6" stroke="#404040"/><line x1="7" y1="9" x2="11" y2="9" stroke="#707070"/>',
  ListView:
    '<rect x="2" y="3" width="12" height="11" fill="#fff" stroke="#6b6b6b"/><line x1="2" y1="6" x2="14" y2="6" stroke="#d0d0d0"/><line x1="7" y1="6" x2="7" y2="14" stroke="#d0d0d0"/><line x1="4" y1="8" x2="6" y2="8" stroke="#a0a0a0"/>',
  DataGridView:
    '<rect x="2" y="3" width="12" height="11" fill="#fff" stroke="#6b6b6b"/><line x1="2" y1="6" x2="14" y2="6" stroke="#a0a0a0"/><line x1="6" y1="6" x2="6" y2="14" stroke="#d0d0d0"/><line x1="10" y1="6" x2="10" y2="14" stroke="#d0d0d0"/><line x1="2" y1="9" x2="14" y2="9" stroke="#e8e8e8"/>',
  GroupBox:
    '<rect x="2" y="6" width="12" height="8" fill="none" stroke="#808080"/><rect x="4" y="3.5" width="6" height="3" fill="#f0f0f0" stroke="#a0a0a0"/>',
  Panel:
    '<rect x="3" y="4" width="10" height="9" fill="#f5f5f5" stroke="#a0a0a0"/>',
  TabControl:
    '<rect x="2" y="7" width="12" height="7" fill="#fff" stroke="#6b6b6b"/><rect x="2" y="4" width="5" height="4" fill="#e8e8e8" stroke="#6b6b6b"/><rect x="6.5" y="4.5" width="4" height="3" fill="#fff" stroke="#a0a0a0"/>',
  SplitContainer:
    '<rect x="2" y="3" width="6" height="11" fill="#fafafa" stroke="#888"/><rect x="8" y="3" width="6" height="11" fill="#fafafa" stroke="#888"/><rect x="7" y="6" width="2" height="5" fill="#d8d8d8" stroke="#707070"/>',
  FlowLayoutPanel:
    '<rect x="2" y="4" width="12" height="9" fill="none" stroke="#a0a0a0" stroke-dasharray="1 1"/><rect x="3" y="5" width="3" height="2" fill="#e8e8e8" stroke="#888"/><rect x="7" y="5" width="3" height="2" fill="#e8e8e8" stroke="#888"/>',
  TableLayoutPanel:
    '<rect x="2" y="4" width="12" height="9" fill="#fff" stroke="#888"/><line x1="8" y1="4" x2="8" y2="13" stroke="#d0d0d0"/><line x1="2" y1="8.5" x2="14" y2="8.5" stroke="#d0d0d0"/>',
  MenuStrip:
    '<rect x="2" y="4" width="12" height="4" fill="#f0f0f0" stroke="#a0a0a0"/><line x1="4" y1="6.5" x2="6" y2="6.5" stroke="#404040"/><line x1="8" y1="6.5" x2="10" y2="6.5" stroke="#404040"/>',
  ToolStrip:
    '<rect x="2" y="5" width="12" height="6" fill="#f0f0f0" stroke="#a0a0a0"/><rect x="4" y="6.5" width="3" height="3" fill="#e0e0e0" stroke="#888"/><rect x="8.5" y="6.5" width="3" height="3" fill="#e0e0e0" stroke="#888"/>',
  StatusStrip:
    '<rect x="2" y="6" width="12" height="5" fill="#e8e8e8" stroke="#888"/><line x1="4" y1="8.5" x2="8" y2="8.5" stroke="#505050"/>',
  ContextMenuStrip:
    '<rect x="3" y="3" width="9" height="8" fill="#fff" stroke="#909090"/><line x1="5" y1="6" x2="11" y2="6" stroke="#c0c0c0"/><line x1="5" y1="9" x2="10" y2="9" stroke="#c0c0c0"/>',
  PictureBox:
    '<rect x="2" y="4" width="12" height="9" fill="#e8f2ff" stroke="#6b8cc4"/><path d="M4 11 L6 8 L8 10 L11 7 L13 10 L13 12 L4 12 Z" fill="#9cc4e8" opacity="0.6"/>',
  PropertyGrid:
    '<rect x="2" y="3" width="12" height="11" fill="#fff" stroke="#6b6b6b"/><rect x="2" y="3" width="12" height="4" fill="#e8e8e8" stroke="#6b6b6b"/><line x1="7" y1="7" x2="7" y2="14" stroke="#d0d0d0"/>',
  Form:
    '<rect x="2" y="4" width="12" height="10" fill="#ececec" stroke="#505050"/><rect x="2" y="4" width="12" height="3" fill="#fff" stroke="#505050"/><circle cx="12.5" cy="5.5" r="0.8" fill="#c44"/><circle cx="10.8" cy="5.5" r="0.8" fill="#ca4"/><rect x="4" y="5" width="4" height="1.5" fill="#c0c0c0"/>',
}

const FALLBACK =
  '<rect x="3" y="3" width="10" height="10" rx="1" fill="#eee" stroke="#999"/>'

export function windowsPaletteIconSvgInner(controlId: string): string {
  return WINDOWS_PALETTE_ICON_INNER[controlId] ?? FALLBACK
}

/** 基础形状小图标 */
export const BASIC_PALETTE_ICON_INNER: Record<'rect' | 'text' | 'frame', string> = {
  rect: '<rect x="3" y="4" width="10" height="9" fill="#e3f2fd" stroke="#1976d2"/>',
  text: '<text x="8" y="11" text-anchor="middle" font-size="9" font-family="Segoe UI,sans-serif" fill="#303030">T</text>',
  frame: '<rect x="3" y="4" width="10" height="9" fill="none" stroke="#707070" stroke-dasharray="2 1"/><rect x="5" y="6" width="6" height="5" fill="#f5f5f5" stroke="#a0a0a0"/>',
}

export function basicPaletteIconSvgInner(id: 'rect' | 'text' | 'frame'): string {
  return BASIC_PALETTE_ICON_INNER[id]
}
