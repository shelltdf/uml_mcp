import type { MessageKey } from '../i18n/messages'
import {
  FORM_BOTTOM_RESERVE,
  FORM_CAPTION_ICON_TOP_LOCAL,
  FORM_CAPTION_MIN_LINE_LOCAL_Y,
  FORM_HORIZONTAL_INSET,
  FORM_TITLE_BAR_HEIGHT,
  layoutFormCaptionSlots,
  WINDOWS_CONTROL_PLACEMENT_SIZE,
} from './libraryPlacement'
import { relayoutFormBars } from './formBarLayout'
import { appendSvgShape, appendToDrawingLayer, nextWindowsControlDomId, type AppendObjectResult } from './uisvgDocument'
import {
  isUisvgObjectRootG,
  readUisvgBundleFromObjectRoot,
  uisvgLocalNameToQName,
  writeUisvgBundleToObjectRoot,
  type UisvgObjectBundleV1,
} from './uisvgMetaNode'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** 基础几何 / 容器；显示名由 i18n，小字为 UISVG QName（`uisvg:Rect` 等） */
export const BASIC_SHAPE_ITEMS: { id: 'rect' | 'text' | 'frame' }[] = [{ id: 'rect' }, { id: 'text' }, { id: 'frame' }]

/** 与 WinForms 控件 id 对应；并标注常见 Win32 窗口类名与 Qt 控件类（便于跨技术栈对照） */
export interface WindowsPaletteItem {
  id: string
  /** WinForms 类型名（与 uisvg 语义子节点 localName、builders 主键一致） */
  label: string
  /** Win32：常见为 RegisterClass 类名或系统类（如 BUTTON、SysListView32） */
  win32: string
  /** Qt Widgets 常见类名 */
  qt: string
}

/** 左侧组件库「Windows」分类：标题键走 i18n `uiLib.group.*` */
export const WINDOWS_UI_GROUPS: { titleKey: MessageKey; items: WindowsPaletteItem[] }[] = [
  {
    titleKey: 'uiLib.group.window',
    items: [
      {
        id: 'Form',
        label: 'Form',
        win32: '#32770 (DIALOG)',
        qt: 'QMainWindow / QDialog',
      },
    ],
  },
  {
    titleKey: 'uiLib.group.menusAndBars',
    items: [
      { id: 'MenuBar', label: 'Menu Bar', win32: '#32768 (HMENU+rebar)', qt: 'QMenuBar' },
      { id: 'Menu', label: 'Menu', win32: '#32768 (menu)', qt: 'QMenu' },
      { id: 'MenuItem', label: 'Menu Item', win32: 'MENUITEMINFO', qt: 'QAction' },
      { id: 'ToolBar', label: 'Tool Bar', win32: 'ToolbarWindow32', qt: 'QToolBar' },
      { id: 'ToolButton', label: 'Tool Button', win32: 'ToolbarWindow32 button', qt: 'QToolButton / QAction' },
      { id: 'StatusBar', label: 'Status Bar', win32: 'msctls_statusbar32', qt: 'QStatusBar' },
      { id: 'ContextMenu', label: 'Context Menu', win32: '#32768 (popup)', qt: 'QMenu' },
    ],
  },
  {
    titleKey: 'uiLib.group.containers',
    items: [
      { id: 'GroupBox', label: 'GroupBox', win32: 'BUTTON (BS_GROUPBOX)', qt: 'QGroupBox' },
      { id: 'Panel', label: 'Panel', win32: 'STATIC / #32770 child', qt: 'QWidget / QFrame' },
      { id: 'TabControl', label: 'TabControl', win32: 'SysTabControl32', qt: 'QTabWidget' },
      { id: 'SplitContainer', label: 'SplitContainer', win32: 'custom (splitter)', qt: 'QSplitter' },
      { id: 'FlowLayoutPanel', label: 'FlowLayoutPanel', win32: 'custom', qt: 'QWidget + QFlowLayout' },
      { id: 'TableLayoutPanel', label: 'TableLayoutPanel', win32: 'custom', qt: 'QWidget + QGridLayout' },
    ],
  },
  {
    titleKey: 'uiLib.group.commands',
    items: [
      { id: 'Button', label: 'Button', win32: 'BUTTON', qt: 'QPushButton' },
      { id: 'Label', label: 'Label', win32: 'STATIC', qt: 'QLabel' },
      { id: 'LinkLabel', label: 'LinkLabel', win32: 'SysLink', qt: 'QLabel (RichText/link)' },
    ],
  },
  {
    titleKey: 'uiLib.group.textInput',
    items: [
      { id: 'TextBox', label: 'TextBox', win32: 'EDIT', qt: 'QLineEdit' },
      { id: 'MaskedTextBox', label: 'MaskedTextBox', win32: 'EDIT', qt: 'QLineEdit + QRegExpValidator' },
      { id: 'RichTextBox', label: 'RichTextBox', win32: 'RICHEDIT50W', qt: 'QTextEdit / QTextBrowser' },
    ],
  },
  {
    titleKey: 'uiLib.group.selection',
    items: [
      { id: 'CheckBox', label: 'CheckBox', win32: 'BUTTON (BS_AUTOCHECKBOX)', qt: 'QCheckBox' },
      { id: 'RadioButton', label: 'RadioButton', win32: 'BUTTON (BS_AUTORADIOBUTTON)', qt: 'QRadioButton' },
      { id: 'ComboBox', label: 'ComboBox', win32: 'COMBOBOX', qt: 'QComboBox' },
      { id: 'ListBox', label: 'ListBox', win32: 'LISTBOX', qt: 'QListWidget' },
      { id: 'CheckedListBox', label: 'CheckedListBox', win32: 'LISTBOX', qt: 'QListWidget (checkState)' },
    ],
  },
  {
    titleKey: 'uiLib.group.numericAndDate',
    items: [
      { id: 'NumericUpDown', label: 'NumericUpDown', win32: 'msctls_updown32 + EDIT', qt: 'QSpinBox / QDoubleSpinBox' },
      { id: 'DateTimePicker', label: 'DateTimePicker', win32: 'SysDateTimePick32', qt: 'QDateTimeEdit' },
      { id: 'MonthCalendar', label: 'MonthCalendar', win32: 'SysMonthCal32', qt: 'QCalendarWidget' },
    ],
  },
  {
    titleKey: 'uiLib.group.rangeAndProgress',
    items: [
      { id: 'TrackBar', label: 'TrackBar', win32: 'msctls_trackbar32', qt: 'QSlider' },
      { id: 'ProgressBar', label: 'ProgressBar', win32: 'msctls_progress32', qt: 'QProgressBar' },
      { id: 'HScrollBar', label: 'HScrollBar', win32: 'SCROLLBAR', qt: 'QScrollBar (Qt::Horizontal)' },
      { id: 'VScrollBar', label: 'VScrollBar', win32: 'SCROLLBAR', qt: 'QScrollBar (Qt::Vertical)' },
    ],
  },
  {
    titleKey: 'uiLib.group.listAndTree',
    items: [
      { id: 'TreeView', label: 'TreeView', win32: 'SysTreeView32', qt: 'QTreeWidget / QTreeView' },
      { id: 'ListView', label: 'ListView', win32: 'SysListView32', qt: 'QListView / QTableView' },
      { id: 'DataGridView', label: 'DataGridView', win32: 'SysListView32 (REPORT) / custom', qt: 'QTableWidget' },
    ],
  },
  {
    titleKey: 'uiLib.group.graphicsAndOther',
    items: [
      { id: 'PictureBox', label: 'PictureBox', win32: 'STATIC (SS_BITMAP/SS_ICON)', qt: 'QLabel (QPixmap)' },
      { id: 'PropertyGrid', label: 'PropertyGrid', win32: 'custom / msctls_trackbar32 host', qt: 'QtPropertyBrowser / QTreeWidget' },
    ],
  },
]

export function getWindowsPaletteItem(controlId: string): WindowsPaletteItem | null {
  for (const g of WINDOWS_UI_GROUPS) {
    const it = g.items.find((i) => i.id === controlId)
    if (it) return it
  }
  return null
}

export function paletteTooltip(item: WindowsPaletteItem): string {
  return `WinForms: ${item.label}\nWin32: ${item.win32}\nQt: ${item.qt}`
}

/** UISVG QName（如 `uisvg:Form`） */
export function uisvgPaletteTagForWindowsItem(item: WindowsPaletteItem): string {
  return uisvgLocalNameToQName(item.id)
}

/** 基础形状：rect/text/frame → `uisvg:Rect` / `uisvg:Text` / `uisvg:Frame` */
export function uisvgPaletteTagForBasicShape(id: 'rect' | 'text' | 'frame'): string {
  return uisvgLocalNameToQName(id)
}

function canParentAcceptWindowsChild(parent: Element, parentId: string, childId: string): boolean {
  if (childId === 'ToolButton') return parentId === 'ToolBar' || parentId === 'ToolStrip'
  if (parentId === 'MenuBar' || parentId === 'MenuStrip') return childId === 'Menu'
  if (parentId === 'Menu') return childId === 'Menu' || childId === 'MenuItem'
  if (parentId === 'ContextMenu' || parentId === 'ContextMenuStrip') {
    if (childId !== 'Menu') return false
    for (const ch of parent.children) {
      if (ch.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(ch)) continue
      const b = readUisvgBundleFromObjectRoot(ch as Element)
      if (b.uisvgLocalName.replace(/^win\./, '') === 'Menu') return false
    }
    return true
  }
  return true
}

function localNameOfObjectRoot(g: Element): string {
  return readUisvgBundleFromObjectRoot(g).uisvgLocalName.replace(/^win\./, '')
}

function normalizeMenuLocalName(local: string): string {
  const k = local.trim().toLowerCase()
  if (k === 'menustrip' || k === 'menubar') return 'MenuBar'
  if (k === 'menu') return 'Menu'
  if (k === 'menuitem') return 'MenuItem'
  if (k === 'contextmenu' || k === 'contextmenustrip') return 'ContextMenu'
  return local
}

function menuDisplayName(g: Element): string {
  const b = readUisvgBundleFromObjectRoot(g)
  const t = (b.uiProps?.Text ?? b.uiProps?.text ?? '').trim()
  if (t) return t
  const caption = g.querySelector(':scope > text[data-uisvg-part="menu-caption"], :scope > text[data-uisvg-part="menuitem-caption"]')
    ?.textContent
    ?.trim()
  if (caption) return caption
  const local = b.uisvgLocalName.replace(/^win\./, '')
  const fallbackByType = local === 'MenuItem' ? 'Menu Item' : local === 'MenuBar' ? 'Menu Bar' : 'Menu'
  const label = (b.label || '').trim()
  // 过滤自动生成 id 风格标签（如 uisvg-Menu-1），避免误当成可见标题。
  if (!label || /^uisvg-[\w-]+-\d+$/i.test(label)) return fallbackByType
  return label
}

function menuItemShortcutText(g: Element): string {
  const b = readUisvgBundleFromObjectRoot(g)
  return (b.uiProps?.ShortcutText ?? '').trim()
}

function menuItemToggleEnabled(g: Element): boolean {
  const b = readUisvgBundleFromObjectRoot(g)
  const raw = (b.uiProps?.Toggle ?? '').trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on'
}

function menuItemChecked(g: Element): boolean {
  const b = readUisvgBundleFromObjectRoot(g)
  const raw = (b.uiProps?.Checked ?? '').trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on'
}

function menuStripOwnTitle(g: Element): string {
  const b = readUisvgBundleFromObjectRoot(g)
  const t = (b.uiProps?.Text ?? b.uiProps?.text ?? '').trim()
  if (t) return t
  const caption = g.querySelector(':scope > text[data-uisvg-part="win-bar-caption"]')?.textContent?.trim()
  if (caption) return caption
  return (b.label || 'MenuBar').trim() || 'MenuBar'
}

function contextMenuOwnTitle(g: Element): string {
  const b = readUisvgBundleFromObjectRoot(g)
  const t = (b.uiProps?.Text ?? b.uiProps?.text ?? '').trim()
  if (t) return t
  const caption = g.querySelector(':scope > text[data-uisvg-part="contextmenu-item"]')?.textContent?.trim()
  if (caption) return caption
  return (b.label || 'ContextMenu').trim() || 'ContextMenu'
}

function relayoutToolButtonVisual(g: Element): void {
  if (!isUisvgObjectRootG(g)) return
  const local = localNameOfObjectRoot(g)
  if (local !== 'ToolButton') return
  const b = readUisvgBundleFromObjectRoot(g)
  const text = (b.uiProps?.Text ?? '').trim() || 'Tool'
  const iconEl0 = g.querySelector(':scope > text[data-uisvg-part="toolbutton-icon"]') as SVGTextElement | null
  const hasIconProp = Object.prototype.hasOwnProperty.call(b.uiProps ?? {}, 'IconUtf8')
  const iconProp = hasIconProp ? (b.uiProps?.IconUtf8 ?? '').trim() : ''
  const displayModeRaw = (b.uiProps?.DisplayMode ?? 'Both').trim()
  const displayMode = displayModeRaw === 'Text' || displayModeRaw === 'Icon' ? displayModeRaw : 'Both'
  const showText = displayMode === 'Text' || displayMode === 'Both'
  const showIcon = displayMode === 'Icon' || displayMode === 'Both'
  const icon = showIcon ? iconProp || (iconEl0?.textContent ?? '').trim() || '⚙' : iconProp
  const textW = showText ? Math.max(16, text.length * 7) : 0
  const iconW = showIcon && icon ? 16 : 0
  const gap = showText && showIcon && icon ? 4 : 0
  const totalW = Math.max(28, iconW + gap + textW + 12)
  const face = g.querySelector(':scope > rect[data-uisvg-part="toolbutton-face"]') as SVGRectElement | null
  if (face) {
    face.setAttribute('width', String(totalW))
    face.setAttribute('height', '24')
  }
  const iconEl = g.querySelector(':scope > text[data-uisvg-part="toolbutton-icon"]') as SVGTextElement | null
  if (iconEl) {
    iconEl.textContent = icon
    iconEl.setAttribute('opacity', showIcon && icon ? '1' : '0')
    iconEl.setAttribute('x', '12')
    iconEl.setAttribute('y', '16')
  }
  const cap = g.querySelector(':scope > text[data-uisvg-part="toolbutton-caption"]') as SVGTextElement | null
  if (cap) {
    cap.textContent = text
    cap.setAttribute('opacity', showText ? '1' : '0')
    cap.setAttribute('x', showIcon && icon ? '24' : '8')
    cap.setAttribute('y', '16')
  }
}

export function relayoutToolStripChildren(toolStripG: Element): void {
  if (!isUisvgObjectRootG(toolStripG)) return
  const pLocal = localNameOfObjectRoot(toolStripG)
  if (pLocal !== 'ToolBar' && pLocal !== 'ToolStrip') return
  let x = 4
  const y = 1
  const gap = 4
  for (let i = 0; i < toolStripG.children.length; i++) {
    const ch = toolStripG.children[i] as Element
    if (ch.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(ch)) continue
    const local = localNameOfObjectRoot(ch)
    if (local !== 'ToolButton') continue
    relayoutToolButtonVisual(ch)
    const face = ch.querySelector(':scope > rect[data-uisvg-part="toolbutton-face"]') as SVGRectElement | null
    const w = Math.max(28, Number(face?.getAttribute('width') || '0') || WINDOWS_CONTROL_PLACEMENT_SIZE.ToolButton.w)
    ch.setAttribute('transform', `translate(${x},${y})`)
    x += w + gap
  }
  const face = toolStripG.querySelector(':scope > rect[data-uisvg-part="toolstrip-face"]') as SVGRectElement | null
  if (face) {
    const minW = WINDOWS_CONTROL_PLACEMENT_SIZE.ToolBar.w
    const nextW = x > 4 ? x : minW
    face.setAttribute('width', String(Math.max(minW, nextW)))
    face.setAttribute('height', String(WINDOWS_CONTROL_PLACEMENT_SIZE.ToolBar.h))
  }
}

function estimateMenuRowWidth(label: string, withArrow: boolean): number {
  const textW = Math.max(24, label.length * 7 + 16)
  const arrowW = withArrow ? 16 : 0
  return Math.max(64, textW + arrowW + 8)
}

function objectChildrenByLocal(parent: Element, locals: Set<string>): Element[] {
  const out: Element[] = []
  for (let i = 0; i < parent.children.length; i++) {
    const ch = parent.children[i] as Element
    if (ch.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(ch)) continue
    const local = normalizeMenuLocalName(localNameOfObjectRoot(ch))
    if (locals.has(local)) out.push(ch)
  }
  return out
}

function resizeMenuLikeNode(g: Element, width: number, height: number): void {
  const face = g.querySelector(':scope > rect[data-uisvg-part="menu-face"], :scope > rect[data-uisvg-part="menuitem-face"]') as SVGRectElement | null
  if (face) {
    face.setAttribute('x', '0')
    face.setAttribute('y', '0')
    face.setAttribute('width', String(width))
    face.setAttribute('height', String(height))
  }
}

function relayoutMenuNode(
  menuG: Element,
  inMenuBar = false,
  submenuRight = false,
): { rowW: number; totalW: number; totalH: number; name: string } {
  const name = menuDisplayName(menuG)
  const childMenus = objectChildrenByLocal(menuG, new Set(['Menu', 'MenuItem']))
  const hasChildren = childMenus.length > 0
  const rowH = WINDOWS_CONTROL_PLACEMENT_SIZE.Menu.h
  const rowW = estimateMenuRowWidth(name, hasChildren)
  let panelW = 0
  let panelH = 0
  for (const ch of childMenus) {
    const childLocal = localNameOfObjectRoot(ch)
    let childRowW = estimateMenuRowWidth(menuDisplayName(ch), childLocal === 'Menu')
    if (childLocal === 'Menu') {
      const childInfo = relayoutMenuNode(ch, false)
      childRowW = Math.max(childRowW, childInfo.rowW)
    }
    panelW = Math.max(panelW, childRowW)
    panelH += rowH
  }
  const panelAtRight = !inMenuBar && submenuRight
  const totalW = hasChildren ? (panelAtRight ? rowW + panelW : Math.max(rowW, panelW)) : rowW
  const totalH = hasChildren ? (panelAtRight ? Math.max(rowH, panelH) : rowH + panelH) : rowH
  resizeMenuLikeNode(menuG, totalW, rowH)
  const menuFace = menuG.querySelector(':scope > rect[data-uisvg-part="menu-face"]') as SVGRectElement | null
  if (menuFace) {
    if (inMenuBar) {
      menuFace.setAttribute('fill', 'transparent')
      menuFace.setAttribute('stroke', 'none')
    } else {
      menuFace.setAttribute('fill', WIN_FACE)
      menuFace.setAttribute('stroke', WIN_BORDER)
    }
  }
  const menuBottom = menuG.querySelector(':scope > line[data-uisvg-part="menu-bottom-border"]') as SVGLineElement | null
  if (menuBottom) {
    menuBottom.setAttribute('x1', '0')
    menuBottom.setAttribute('x2', String(totalW))
    menuBottom.setAttribute('stroke', 'none')
    menuBottom.setAttribute('opacity', '0')
  }
  const caption = menuG.querySelector(':scope > text[data-uisvg-part="menu-caption"], :scope > text[data-uisvg-part="menuitem-caption"]') as SVGTextElement | null
  if (caption) {
    caption.textContent = name
    caption.setAttribute('x', '8')
    caption.setAttribute('y', '16')
  }
  const shortcut = menuG.querySelector(':scope > text[data-uisvg-part="menuitem-shortcut"]') as SVGTextElement | null
  if (shortcut) {
    const s = menuItemShortcutText(menuG)
    shortcut.textContent = s
    shortcut.setAttribute('x', String(Math.max(48, totalW - 22)))
    shortcut.setAttribute('opacity', s ? '1' : '0')
  }
  const check = menuG.querySelector(':scope > path[data-uisvg-part="menuitem-check"]') as SVGPathElement | null
  if (check) {
    check.setAttribute('opacity', menuItemToggleEnabled(menuG) && menuItemChecked(menuG) ? '1' : '0')
  }
  const toggleOn = menuItemToggleEnabled(menuG)
  const gutter = menuG.querySelector(':scope > rect[data-uisvg-part="menuitem-gutter"]') as SVGRectElement | null
  if (gutter) gutter.setAttribute('opacity', toggleOn ? '1' : '0')
  const sep = menuG.querySelector(':scope > line[data-uisvg-part="menuitem-separator"]') as SVGLineElement | null
  if (sep) {
    const x1 = toggleOn ? '25' : '0'
    sep.setAttribute('x1', x1)
    sep.setAttribute('x2', String(totalW - 1))
  }
  const captionItem = menuG.querySelector(':scope > text[data-uisvg-part="menuitem-caption"]') as SVGTextElement | null
  if (captionItem) captionItem.setAttribute('x', toggleOn ? '31' : '8')
  const hl = menuG.querySelector(':scope > rect[data-uisvg-part="menuitem-highlight"]') as SVGRectElement | null
  if (hl) {
    // MenuItem 默认仅展示 Normal 状态，不显示蓝色高亮底。
    hl.setAttribute('opacity', '0')
  }
  const arrow = menuG.querySelector(':scope > path[data-uisvg-part="menu-arrow"], :scope > path[data-uisvg-part="menuitem-arrow"]') as SVGPathElement | null
  if (arrow) {
    const part = arrow.getAttribute('data-uisvg-part')
    if (part === 'menu-arrow') {
      // Menu 标题默认不显示下拉三角（避免与 MenuItem 语义混淆）。
      arrow.setAttribute('opacity', '0')
      const cx = totalW - 19
      arrow.setAttribute('d', `M${cx} 9 L${cx + 6} 9 L${cx + 3} 13 Z`)
    } else if (part === 'menuitem-arrow') {
      // MenuItem 默认按 Normal 预览，不显示子菜单箭头。
      arrow.setAttribute('opacity', '0')
      const cx = totalW - 14
      arrow.setAttribute('d', `M${cx} 8 L${cx + 4} 11 L${cx} 14`)
    }
  }
  let rowY = 0
  for (const ch of childMenus) {
    const childLocal = localNameOfObjectRoot(ch)
    if (childLocal === 'Menu') {
      relayoutMenuNode(ch, false, true)
      const childX = panelAtRight ? rowW : 0
      const childY = inMenuBar || !panelAtRight ? rowH + rowY : rowY
      ch.setAttribute('transform', `translate(${childX},${childY})`)
      rowY += rowH
    } else {
      resizeMenuLikeNode(ch, Math.max(panelW, rowW), rowH)
      const t = ch.querySelector(':scope > text[data-uisvg-part="menuitem-caption"]') as SVGTextElement | null
      if (t) {
        t.textContent = menuDisplayName(ch)
        t.setAttribute('x', menuItemToggleEnabled(ch) ? '31' : '8')
        t.setAttribute('y', '16')
      }
      const st = ch.querySelector(':scope > text[data-uisvg-part="menuitem-shortcut"]') as SVGTextElement | null
      if (st) {
        const s = menuItemShortcutText(ch)
        st.textContent = s
        st.setAttribute('x', String(Math.max(48, Math.max(panelW, rowW) - 22)))
        st.setAttribute('opacity', s ? '1' : '0')
      }
      const ck = ch.querySelector(':scope > path[data-uisvg-part="menuitem-check"]') as SVGPathElement | null
      if (ck) {
        ck.setAttribute('opacity', menuItemToggleEnabled(ch) && menuItemChecked(ch) ? '1' : '0')
      }
      const gt = ch.querySelector(':scope > rect[data-uisvg-part="menuitem-gutter"]') as SVGRectElement | null
      if (gt) gt.setAttribute('opacity', menuItemToggleEnabled(ch) ? '1' : '0')
      const sp = ch.querySelector(':scope > line[data-uisvg-part="menuitem-separator"]') as SVGLineElement | null
      if (sp) {
        const x1 = menuItemToggleEnabled(ch) ? '25' : '0'
        sp.setAttribute('x1', x1)
        sp.setAttribute('x2', String(Math.max(panelW, rowW) - 1))
      }
      const arr = ch.querySelector(':scope > path[data-uisvg-part="menuitem-arrow"]') as SVGPathElement | null
      if (arr) {
        const cx = Math.max(panelW, rowW) - 14
        arr.setAttribute('d', `M${cx} 8 L${cx + 4} 11 L${cx} 14`)
      }
      const childX = panelAtRight ? rowW : 0
      const childY = inMenuBar || !panelAtRight ? rowH + rowY : rowY
      ch.setAttribute('transform', `translate(${childX},${childY})`)
      rowY += rowH
    }
  }
  return { rowW, totalW, totalH, name }
}

export function relayoutMenuHierarchy(parent: Element): void {
  if (parent.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(parent)) return
  const parentLocal = normalizeMenuLocalName(localNameOfObjectRoot(parent))
  if (parentLocal === 'MenuItem') {
    relayoutMenuNode(parent, false, false)
    return
  }
  if (parentLocal === 'MenuBar') {
    const menus = objectChildrenByLocal(parent, new Set(['Menu']))
    let x = 0
    const names: string[] = []
    for (const m of menus) {
      const info = relayoutMenuNode(m, true, false)
      m.setAttribute('transform', `translate(${x},0)`)
      x += info.rowW
      names.push(info.name)
    }
    const face = parent.querySelector(':scope > rect[data-uisvg-part="win-bar-face"]') as SVGRectElement | null
    if (face) {
      face.setAttribute('x', '0')
      face.setAttribute('y', '0')
      face.setAttribute('height', String(WINDOWS_CONTROL_PLACEMENT_SIZE.MenuBar.h))
      face.setAttribute('width', String(Math.max(WINDOWS_CONTROL_PLACEMENT_SIZE.MenuBar.w, x)))
    }
    const caption = parent.querySelector(':scope > text[data-uisvg-part="win-bar-caption"]') as SVGTextElement | null
    if (caption) {
      if (names.length) {
        // 有子菜单时由子 Menu 标签承担可视标题。
        caption.textContent = names.join('  ')
        caption.setAttribute('opacity', '0')
      } else {
        // 无子节点时显示自身标题（来自 UI semantics.Text）。
        caption.textContent = menuStripOwnTitle(parent)
        caption.setAttribute('opacity', '1')
      }
    }
    return
  }
  if (parentLocal === 'Menu' || parentLocal === 'ContextMenu') {
    if (parentLocal === 'Menu') {
      const parentObj = parent.parentElement
      const parentLocal2 =
        parentObj && parentObj.tagName.toLowerCase() === 'g' && isUisvgObjectRootG(parentObj)
          ? normalizeMenuLocalName(localNameOfObjectRoot(parentObj))
          : ''
      const isSubmenu = parentLocal2 === 'Menu'
      relayoutMenuNode(parent, false, isSubmenu)
      return
    }
    const menus = objectChildrenByLocal(parent, new Set(['Menu']))
    let y = 0
    const titleText = contextMenuOwnTitle(parent)
    const defaultW = Math.max(120, estimateMenuRowWidth(titleText, false))
    let maxW = defaultW
    for (const m of menus) {
      const info = relayoutMenuNode(m, false, false)
      m.setAttribute('transform', `translate(0,${y})`)
      y += info.totalH
      maxW = Math.max(maxW, info.totalW)
    }
    const doc = parent.ownerDocument
    let title = parent.querySelector(':scope > text[data-uisvg-part="contextmenu-item"]') as SVGTextElement | null
    if (!title && doc) {
      title = doc.createElementNS(SVG_NS, 'text') as SVGTextElement
      title.setAttribute('data-uisvg-part', 'contextmenu-item')
      title.setAttribute('fill', '#1a1a1a')
      title.setAttribute('font-family', 'Segoe UI, Microsoft YaHei UI, sans-serif')
      title.setAttribute('font-size', '11')
      parent.appendChild(title)
    }
    if (title) {
      title.textContent = titleText
      title.setAttribute('x', '8')
      title.setAttribute('y', '16')
      title.setAttribute('opacity', menus.length ? '0' : '1')
    }
    let face = parent.querySelector(':scope > rect[data-uisvg-part="contextmenu-face"]') as SVGRectElement | null
    if (!face && doc) {
      face = doc.createElementNS(SVG_NS, 'rect') as SVGRectElement
      face.setAttribute('data-uisvg-part', 'contextmenu-face')
      face.setAttribute('fill', '#ffffff')
      face.setAttribute('stroke', WIN_BORDER)
      face.setAttribute('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,.2))')
      parent.insertBefore(face, parent.firstChild)
    }
    if (face) {
      face.setAttribute('x', '0')
      face.setAttribute('y', '0')
      if (menus.length) {
        face.setAttribute('width', String(maxW))
        face.setAttribute('height', String(Math.max(22, y)))
      } else {
        // 无子节点时回到单标题默认尺寸与显示。
        face.setAttribute('width', String(defaultW))
        face.setAttribute('height', '22')
      }
    }
  }
}

function E(doc: Document, name: string, attrs: Record<string, string> = {}) {
  const e = doc.createElementNS(SVG_NS, name)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  return e
}

function T(doc: Document, x: string, y: string, text: string, size = '11') {
  const t = E(doc, 'text', {
    x,
    y,
    fill: '#1a1a1a',
    'font-family': 'Segoe UI, Microsoft YaHei UI, sans-serif',
    'font-size': size,
  })
  t.textContent = text
  return t
}

type Builder = (doc: Document, g: Element) => void

const WIN_FACE = '#f0f0f0'
const WIN_BORDER = '#adadad'
const WIN_BTN = '#e1e1e1'

const builders: Record<string, Builder> = {
  Button(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'button-face',
        width: '88',
        height: '26',
        rx: '2',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
    const bt = T(doc, '18', '18', 'Button')
    bt.setAttribute('data-uisvg-part', 'button-caption')
    g.appendChild(bt)
  },
  Label(doc, g) {
    g.appendChild(T(doc, '0', '14', 'Label', '12'))
  },
  LinkLabel(doc, g) {
    const t = T(doc, '0', '14', 'LinkLabel', '12')
    t.setAttribute('fill', '#0066cc')
    t.setAttribute('text-decoration', 'underline')
    g.appendChild(t)
  },
  TextBox(doc, g) {
    g.appendChild(E(doc, 'rect', { width: '128', height: '22', fill: '#ffffff', stroke: WIN_BORDER }))
    g.appendChild(T(doc, '4', '16', '', '11'))
  },
  MaskedTextBox(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'maskedtextbox-face',
        width: '128',
        height: '22',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    const mt = T(doc, '4', '16', '____-__', '11')
    mt.setAttribute('data-uisvg-part', 'maskedtextbox-text')
    g.appendChild(mt)
  },
  RichTextBox(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'richtextbox-face',
        width: '160',
        height: '72',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    const rt = T(doc, '6', '18', 'Rich text…', '11')
    rt.setAttribute('data-uisvg-part', 'richtextbox-text')
    g.appendChild(rt)
  },
  CheckBox(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'checkbox-box',
        x: '0',
        y: '2',
        width: '12',
        height: '12',
        fill: '#fff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'path', {
        'data-uisvg-part': 'checkbox-check',
        d: 'M2 7 L5 10 L11 3',
        fill: 'none',
        stroke: '#1a1a1a',
        'stroke-width': '1.2',
      }),
    )
    const cbl = T(doc, '18', '14', 'CheckBox', '12')
    cbl.setAttribute('data-uisvg-part', 'checkbox-label')
    g.appendChild(cbl)
  },
  RadioButton(doc, g) {
    g.appendChild(
      E(doc, 'circle', {
        'data-uisvg-part': 'radiobutton-outer',
        cx: '6',
        cy: '8',
        r: '6',
        fill: '#fff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'circle', {
        'data-uisvg-part': 'radiobutton-inner',
        cx: '6',
        cy: '8',
        r: '3',
        fill: '#1a1a1a',
      }),
    )
    const rbl = T(doc, '18', '14', 'RadioButton', '12')
    rbl.setAttribute('data-uisvg-part', 'radiobutton-label')
    g.appendChild(rbl)
  },
  ComboBox(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'combobox-face',
        width: '120',
        height: '22',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'combobox-dropdown',
        x: '96',
        y: '1',
        width: '22',
        height: '20',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'path', {
        'data-uisvg-part': 'combobox-arrow',
        d: 'M104 8 L112 8 L108 13 Z',
        fill: '#505050',
      }),
    )
    const ct = T(doc, '4', '16', 'Item', '11')
    ct.setAttribute('data-uisvg-part', 'combobox-text')
    g.appendChild(ct)
  },
  ListBox(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'listbox-face',
        width: '120',
        height: '72',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    for (const [y, label] of [
      ['16', 'Item 1'],
      ['30', 'Item 2'],
      ['44', 'Item 3'],
    ] as const) {
      const t = T(doc, '4', y, label, '11')
      t.setAttribute('data-uisvg-part', 'listbox-item')
      g.appendChild(t)
    }
  },
  CheckedListBox(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'checkedlistbox-face',
        width: '120',
        height: '72',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    const rows: { cy: string; ty: string; label: string }[] = [
      { cy: '6', ty: '16', label: 'One' },
      { cy: '22', ty: '32', label: 'Two' },
    ]
    for (const { cy, ty, label } of rows) {
      const box = E(doc, 'rect', {
        'data-uisvg-part': 'checkedlistbox-check',
        x: '4',
        y: cy,
        width: '10',
        height: '10',
        fill: '#fff',
        stroke: WIN_BORDER,
      })
      g.appendChild(box)
      const t = T(doc, '18', ty, label, '11')
      t.setAttribute('data-uisvg-part', 'checkedlistbox-item')
      g.appendChild(t)
    }
  },
  NumericUpDown(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'numericupdown-face',
        width: '72',
        height: '22',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'numericupdown-spin-top',
        x: '70',
        y: '1',
        width: '16',
        height: '10',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'numericupdown-spin-bottom',
        x: '70',
        y: '11',
        width: '16',
        height: '10',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    const tv = T(doc, '4', '16', '0', '11')
    tv.setAttribute('data-uisvg-part', 'numericupdown-text')
    g.appendChild(tv)
  },
  DateTimePicker(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'datetimepicker-face',
        width: '120',
        height: '22',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    const dt = T(doc, '4', '16', '2026-03-28', '11')
    dt.setAttribute('data-uisvg-part', 'datetimepicker-text')
    g.appendChild(dt)
  },
  MonthCalendar(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'monthcalendar-face',
        width: '160',
        height: '120',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    const title = T(doc, '6', '18', 'March 2026', '11')
    title.setAttribute('data-uisvg-part', 'monthcalendar-title')
    g.appendChild(title)
    g.appendChild(
      E(doc, 'line', {
        'data-uisvg-part': 'monthcalendar-underline',
        x1: '8',
        y1: '28',
        x2: '150',
        y2: '28',
        stroke: '#e0e0e0',
      }),
    )
  },
  TrackBar(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'trackbar-face',
        x: '0',
        y: '0',
        width: '120',
        height: '18',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'trackbar-track',
        x: '0',
        y: '8',
        width: '120',
        height: '4',
        fill: '#e0e0e0',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'trackbar-thumb',
        x: '52',
        y: '4',
        width: '8',
        height: '14',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
  },
  ProgressBar(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'progressbar-face',
        width: '120',
        height: '16',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'progressbar-fill',
        x: '1',
        y: '1',
        width: '72',
        height: '14',
        fill: '#06b',
        opacity: '0.35',
      }),
    )
  },
  HScrollBar(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'hscrollbar-face',
        x: '0',
        y: '0',
        width: '120',
        height: '16',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'hscrollbar-track',
        width: '120',
        height: '16',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'hscrollbar-thumb',
        x: '40',
        y: '2',
        width: '40',
        height: '12',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
  },
  VScrollBar(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'vscrollbar-face',
        x: '0',
        y: '0',
        width: '16',
        height: '80',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'vscrollbar-track',
        width: '16',
        height: '80',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'vscrollbar-thumb',
        x: '2',
        y: '28',
        width: '12',
        height: '24',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
  },
  TreeView(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'treeview-face',
        width: '120',
        height: '88',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    const tRoot = T(doc, '6', '16', '▾ Node', '11')
    tRoot.setAttribute('data-uisvg-part', 'treeview-root-label')
    g.appendChild(tRoot)
    const tChild = T(doc, '18', '30', 'Child', '11')
    tChild.setAttribute('data-uisvg-part', 'treeview-child-label')
    g.appendChild(tChild)
  },
  ListView(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'listview-face',
        width: '140',
        height: '80',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'line', {
        'data-uisvg-part': 'listview-header-line',
        x1: '4',
        y1: '22',
        x2: '134',
        y2: '22',
        stroke: '#e8e8e8',
      }),
    )
    const ta = T(doc, '6', '16', 'Col A', '10')
    ta.setAttribute('data-uisvg-part', 'listview-col-a')
    g.appendChild(ta)
    const tb = T(doc, '72', '16', 'Col B', '10')
    tb.setAttribute('data-uisvg-part', 'listview-col-b')
    g.appendChild(tb)
  },
  DataGridView(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'datagridview-face',
        x: '0',
        y: '0',
        width: '160',
        height: '88',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    for (let i = 0; i < 4; i++) {
      g.appendChild(
        E(doc, 'line', {
          'data-uisvg-part': `datagridview-hline-${i}`,
          x1: '0',
          y1: String(20 + i * 18),
          x2: '160',
          y2: String(20 + i * 18),
          stroke: '#e0e0e0',
        }),
      )
    }
    for (let j = 0; j < 3; j++) {
      g.appendChild(
        E(doc, 'line', {
          'data-uisvg-part': `datagridview-vline-${j}`,
          x1: String(40 + j * 40),
          y1: '0',
          x2: String(40 + j * 40),
          y2: '88',
          stroke: '#e0e0e0',
        }),
      )
    }
  },
  GroupBox(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'groupbox-border',
        x: '0',
        y: '8',
        width: '140',
        height: '72',
        fill: 'none',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'groupbox-title-chip',
        x: '8',
        y: '2',
        width: '56',
        height: '12',
        fill: WIN_FACE,
      }),
    )
    const gt = T(doc, '12', '12', 'Group', '11')
    gt.setAttribute('data-uisvg-part', 'groupbox-title-text')
    g.appendChild(gt)
  },
  Panel(doc, g) {
    g.appendChild(E(doc, 'rect', { width: '120', height: '64', fill: WIN_FACE, stroke: WIN_BORDER }))
  },
  TabControl(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'tabcontrol-client',
        x: '0',
        y: '18',
        width: '140',
        height: '64',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'tabcontrol-tab1-head',
        x: '0',
        y: '0',
        width: '44',
        height: '18',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    const t1 = T(doc, '6', '13', 'Tab 1', '10')
    t1.setAttribute('data-uisvg-part', 'tabcontrol-tab1-text')
    g.appendChild(t1)
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'tabcontrol-tab2-head',
        x: '44',
        y: '2',
        width: '44',
        height: '16',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    const t2 = T(doc, '50', '13', 'Tab 2', '10')
    t2.setAttribute('data-uisvg-part', 'tabcontrol-tab2-text')
    g.appendChild(t2)
  },
  SplitContainer(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'splitcontainer-left-pane',
        width: '56',
        height: '72',
        fill: '#fafafa',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'splitcontainer-right-pane',
        x: '60',
        y: '0',
        width: '56',
        height: '72',
        fill: '#fafafa',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'splitcontainer-splitter',
        x: '54',
        y: '28',
        width: '6',
        height: '18',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
  },
  FlowLayoutPanel(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'flowlayout-face',
        width: '120',
        height: '56',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
        strokeDasharray: '3 2',
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'flowlayout-item',
        x: '6',
        y: '8',
        width: '28',
        height: '16',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'flowlayout-item',
        x: '40',
        y: '8',
        width: '28',
        height: '16',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
  },
  TableLayoutPanel(doc, g) {
    g.appendChild(E(doc, 'rect', { width: '120', height: '56', fill: '#ffffff', stroke: WIN_BORDER }))
    g.appendChild(E(doc, 'line', { x1: '60', y1: '0', x2: '60', y2: '56', stroke: WIN_BORDER }))
    g.appendChild(E(doc, 'line', { x1: '0', y1: '28', x2: '120', y2: '28', stroke: WIN_BORDER }))
  },
  MenuBar(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'win-bar-face',
        width: '160',
        height: '22',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    const t = T(doc, '6', '16', 'MenuBar', '11')
    t.setAttribute('data-uisvg-part', 'win-bar-caption')
    g.appendChild(t)
  },
  Menu(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'menu-face',
        width: '120',
        height: '22',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    const t = T(doc, '8', '16', 'Menu', '11')
    t.setAttribute('data-uisvg-part', 'menu-caption')
    g.appendChild(t)
  },
  MenuItem(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'menuitem-face',
        width: '140',
        height: '22',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'menuitem-gutter',
        x: '0',
        y: '0',
        width: '24',
        height: '22',
        fill: '#f6f6f6',
        opacity: '0',
      }),
    )
    g.appendChild(
      E(doc, 'line', {
        'data-uisvg-part': 'menuitem-separator',
        x1: '0',
        y1: '0.5',
        x2: '139',
        y2: '0.5',
        stroke: '#ececec',
      }),
    )
    g.appendChild(
      E(doc, 'path', {
        'data-uisvg-part': 'menuitem-check',
        d: 'M7 11 L10 14 L16 7',
        fill: 'none',
        stroke: '#2a63bf',
        'stroke-width': '1.4',
        opacity: '0',
      }),
    )
    const t = T(doc, '8', '16', 'Menu Item', '11')
    t.setAttribute('data-uisvg-part', 'menuitem-caption')
    g.appendChild(t)
    const shortcut = T(doc, '118', '16', '', '10')
    shortcut.setAttribute('data-uisvg-part', 'menuitem-shortcut')
    shortcut.setAttribute('fill', '#6a6a6a')
    shortcut.setAttribute('text-anchor', 'end')
    g.appendChild(shortcut)
    // MenuItem 默认按 Normal 状态预览，不渲染右侧子菜单箭头。
  },
  ToolButton(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'toolbutton-face',
        width: '56',
        height: '24',
        rx: '2',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
    const icon = T(doc, '12', '16', '⚙', '12')
    icon.setAttribute('data-uisvg-part', 'toolbutton-icon')
    icon.setAttribute('text-anchor', 'middle')
    g.appendChild(icon)
    const cap = T(doc, '24', '16', 'Tool', '11')
    cap.setAttribute('data-uisvg-part', 'toolbutton-caption')
    g.appendChild(cap)
    relayoutToolButtonVisual(g)
  },
  ToolBar(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'toolstrip-face',
        width: '160',
        height: '26',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
  },
  StatusBar(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'win-bar-face',
        width: '160',
        height: '22',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    const t = T(doc, '6', '16', 'Ready', '11')
    t.setAttribute('data-uisvg-part', 'win-bar-caption')
    g.appendChild(t)
  },
  ContextMenu(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'contextmenu-face',
        width: '120',
        height: '22',
        fill: '#ffffff',
        stroke: WIN_BORDER,
        filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,.2))',
      }),
    )
    const tTitle = T(doc, '8', '16', 'ContextMenu', '11')
    tTitle.setAttribute('data-uisvg-part', 'contextmenu-item')
    g.appendChild(tTitle)
  },
  PictureBox(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'picturebox-face',
        width: '88',
        height: '64',
        fill: '#eef6ff',
        stroke: WIN_BORDER,
      }),
    )
    const pic = T(doc, '44', '40', 'IMG', '10')
    pic.setAttribute('fill', '#7090c0')
    pic.setAttribute('text-anchor', 'middle')
    pic.setAttribute('data-uisvg-part', 'picturebox-caption')
    g.appendChild(pic)
  },
  PropertyGrid(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'propertygrid-face',
        width: '120',
        height: '88',
        fill: '#ffffff',
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'propertygrid-toolbar',
        width: '120',
        height: '20',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    const tCap = T(doc, '4', '14', 'Property', '10')
    tCap.setAttribute('data-uisvg-part', 'propertygrid-toolbar-caption')
    g.appendChild(tCap)
    const tRow = T(doc, '4', '34', '(Name)', '10')
    tRow.setAttribute('data-uisvg-part', 'propertygrid-first-row-label')
    g.appendChild(tRow)
  },
  Form(doc, g) {
    const FORM_SZ = WINDOWS_CONTROL_PLACEMENT_SIZE.Form
    const FORM_W = String(FORM_SZ.w)
    const FORM_H = String(FORM_SZ.h)
    const th = String(FORM_TITLE_BAR_HEIGHT)
    const cix = String(FORM_HORIZONTAL_INSET)
    const ciy = String(FORM_TITLE_BAR_HEIGHT)
    const cih = String(FORM_SZ.h - FORM_TITLE_BAR_HEIGHT - FORM_BOTTOM_RESERVE)
    const ciw = String(FORM_SZ.w - 2 * FORM_HORIZONTAL_INSET)
    const FORM_TITLE = '#0078d4'
    const FORM_CAPTION = '#ffffff'
    const { minSlotLeft, maxSlotLeft, closeSlotLeft } = layoutFormCaptionSlots(0, FORM_SZ.w)
    const midY = FORM_CAPTION_MIN_LINE_LOCAL_Y
    const iconTop = FORM_CAPTION_ICON_TOP_LOCAL
    // 整窗外框（缩放柄）；标题栏宽高固定：宽=外框、高=FORM_TITLE_BAR_HEIGHT；三键槽位靠右（见 layoutFormCaptionSlots）
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'form-frame',
        x: '0',
        y: '0',
        width: FORM_W,
        height: FORM_H,
        fill: WIN_FACE,
        stroke: '#505050',
        'stroke-width': '1',
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'form-titlebar',
        x: '0',
        y: '0',
        width: FORM_W,
        height: th,
        fill: FORM_TITLE,
      }),
    )
    const title = T(doc, '8', '18', 'Form', '11')
    title.setAttribute('data-uisvg-part', 'form-title-text')
    title.setAttribute('fill', FORM_CAPTION)
    g.appendChild(title)
    g.appendChild(
      E(doc, 'line', {
        'data-uisvg-part': 'form-caption-min',
        x1: String(minSlotLeft + 5),
        y1: String(midY),
        x2: String(minSlotLeft + 13),
        y2: String(midY),
        stroke: FORM_CAPTION,
        'stroke-width': '1.25',
        'stroke-linecap': 'square',
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'form-caption-max',
        x: String(maxSlotLeft + 4),
        y: String(iconTop),
        width: '10',
        height: '10',
        fill: 'none',
        stroke: FORM_CAPTION,
        'stroke-width': '1.1',
      }),
    )
    g.appendChild(
      E(doc, 'path', {
        'data-uisvg-part': 'form-caption-close',
        d: `M ${closeSlotLeft + 3} ${iconTop} L ${closeSlotLeft + 15} ${iconTop + 12} M ${closeSlotLeft + 15} ${iconTop} L ${closeSlotLeft + 3} ${iconTop + 12}`,
        fill: 'none',
        stroke: FORM_CAPTION,
        'stroke-width': '1.25',
        'stroke-linecap': 'square',
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'form-client',
        x: cix,
        y: ciy,
        width: ciw,
        height: cih,
        fill: '#ffffff',
        stroke: WIN_BORDER,
        'stroke-width': '1',
      }),
    )
  },
}

// Backward-compat aliases for legacy control ids.
builders.MenuStrip = builders.MenuBar
builders.ToolStrip = builders.ToolBar
builders.StatusStrip = builders.StatusBar
builders.ContextMenuStrip = builders.ContextMenu

/** 与 `builders` 一致的控件 id 列表（像素导入等用于校验）。 */
export const WINDOWS_BUILDER_CONTROL_IDS: readonly string[] = Object.keys(builders)

/** 在已有 `<g>` 内生成与组件库一致的子树（用于像素导入等程序化创建）。 */
export function buildWindowsControlSubtree(doc: Document, g: Element, controlId: string): boolean {
  const build = builders[controlId]
  if (!build) return false
  build(doc, g)
  return true
}

export function appendWindowsControl(
  svgXml: string,
  controlId: string,
  placement: { x: number; y: number },
  /** 与右栏「UI 属性」一致的语义键值，写入对象根子节点 `uisvg:meta`（JSON） */
  initialUiProps?: Record<string, string>,
): AppendObjectResult {
  const build = builders[controlId]
  if (!build) return { svg: svgXml, createdDomId: '' }
  let createdDomId = ''
  const svg = appendSvgShape(svgXml, (doc) => {
    const { x, y } = placement
    const { id, index } = nextWindowsControlDomId(doc, controlId)
    createdDomId = id
    const g = E(doc, 'g', { id, transform: `translate(${x},${y})` })
    const meta = getWindowsPaletteItem(controlId)
    build(doc, g)
    const labelBase = (meta?.label || controlId).trim()
    const label = `${labelBase} ${index}`
    const b: UisvgObjectBundleV1 = {
      v: 1,
      uisvgLocalName: controlId,
      label,
      uiProps: initialUiProps && Object.keys(initialUiProps).length > 0 ? { ...initialUiProps } : {},
      platform: {
        winforms: controlId,
        win32: meta?.win32 ?? '',
        qt: meta?.qt ?? '',
      },
    }
    writeUisvgBundleToObjectRoot(g, b)
    appendToDrawingLayer(doc, g)
  })
  return { svg, createdDomId }
}

/**
 * 将 Windows 控件作为**已有对象根**的子节点插入（如拖入 Form 内）；
 * `parentDomId === 'layer-root'` 时与 `appendWindowsControl` 相同。
 */
export function appendWindowsControlUnderParent(
  svgXml: string,
  controlId: string,
  parentDomId: string,
  placement: { x: number; y: number },
  initialUiProps?: Record<string, string>,
): AppendObjectResult {
  if (parentDomId === 'layer-root') {
    return appendWindowsControl(svgXml, controlId, placement, initialUiProps)
  }
  const build = builders[controlId]
  if (!build) return { svg: svgXml, createdDomId: '' }
  let createdDomId = ''
  const svg = appendSvgShape(svgXml, (doc) => {
    const parent = doc.getElementById(parentDomId)
    if (!parent || parent.tagName.toLowerCase() !== 'g') return
    if (isUisvgObjectRootG(parent)) {
      const pb = readUisvgBundleFromObjectRoot(parent)
      const parentLocal = pb.uisvgLocalName.replace(/^win\./, '') || 'Panel'
      if (!canParentAcceptWindowsChild(parent, parentLocal, controlId)) return
    }
    if ((controlId === 'StatusBar' || controlId === 'StatusStrip') && isUisvgObjectRootG(parent)) {
      for (const ch of parent.children) {
        if (ch.tagName.toLowerCase() !== 'g' || !isUisvgObjectRootG(ch)) continue
        const b = readUisvgBundleFromObjectRoot(ch as Element)
        if (b.uisvgLocalName.replace(/^win\./, '') === 'StatusBar' || b.uisvgLocalName.replace(/^win\./, '') === 'StatusStrip')
          return
      }
    }
    const { x, y } = placement
    const { id, index } = nextWindowsControlDomId(doc, controlId)
    createdDomId = id
    const g = E(doc, 'g', { id, transform: `translate(${x},${y})` })
    const meta = getWindowsPaletteItem(controlId)
    build(doc, g)
    const labelBase = (meta?.label || controlId).trim()
    const label = `${labelBase} ${index}`
    const b: UisvgObjectBundleV1 = {
      v: 1,
      uisvgLocalName: controlId,
      label,
      uiProps: initialUiProps && Object.keys(initialUiProps).length > 0 ? { ...initialUiProps } : {},
      platform: {
        winforms: controlId,
        win32: meta?.win32 ?? '',
        qt: meta?.qt ?? '',
      },
    }
    writeUisvgBundleToObjectRoot(g, b)
    parent.appendChild(g)
    if (isUisvgObjectRootG(parent)) {
      const parentLocal = localNameOfObjectRoot(parent)
      if (parentLocal === 'MenuBar' || parentLocal === 'Menu' || parentLocal === 'ContextMenu') {
        relayoutMenuHierarchy(parent)
      } else if (parentLocal === 'ToolBar' || parentLocal === 'ToolStrip') {
        relayoutToolStripChildren(parent)
      }
    }
    if (
      isUisvgObjectRootG(parent) &&
      (controlId === 'MenuBar' ||
        controlId === 'MenuStrip' ||
        controlId === 'ToolBar' ||
        controlId === 'ToolStrip' ||
        controlId === 'StatusBar' ||
        controlId === 'StatusStrip')
    ) {
      const pb = readUisvgBundleFromObjectRoot(parent)
      if (pb.uisvgLocalName.replace(/^win\./, '') === 'Form') {
        relayoutFormBars(parent as unknown as SVGGElement)
      }
    }
  })
  return { svg, createdDomId }
}

export function relayoutMenuHierarchyInSvgString(svgXml: string, anchorDomId: string): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  const anchor = doc.getElementById(anchorDomId)
  if (!anchor) return null
  let n: Element | null = anchor
  for (let i = 0; i < 64 && n; i++) {
    if (n.tagName.toLowerCase() === 'g' && isUisvgObjectRootG(n)) {
      const local = localNameOfObjectRoot(n)
      const norm = normalizeMenuLocalName(local)
      if (norm === 'MenuBar' || norm === 'Menu' || norm === 'ContextMenu' || norm === 'MenuItem') {
        relayoutMenuHierarchy(n)
        if (norm === 'Menu' && n.parentElement && isUisvgObjectRootG(n.parentElement)) {
          const pl = normalizeMenuLocalName(localNameOfObjectRoot(n.parentElement))
          if (pl === 'Menu' || pl === 'MenuBar' || pl === 'ContextMenu') relayoutMenuHierarchy(n.parentElement)
        }
        return new XMLSerializer().serializeToString(doc)
      }
    }
    n = n.parentElement
  }
  return null
}

export function relayoutToolButtonInSvgString(svgXml: string, anchorDomId: string): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  const anchor = doc.getElementById(anchorDomId)
  if (!anchor || anchor.tagName.toLowerCase() !== 'g') return null
  if (isUisvgObjectRootG(anchor) && (localNameOfObjectRoot(anchor) === 'ToolBar' || localNameOfObjectRoot(anchor) === 'ToolStrip')) {
    relayoutToolStripChildren(anchor)
    return new XMLSerializer().serializeToString(doc)
  }
  relayoutToolButtonVisual(anchor)
  const p = anchor.parentElement
  if (
    p &&
    p.tagName.toLowerCase() === 'g' &&
    isUisvgObjectRootG(p) &&
    (localNameOfObjectRoot(p) === 'ToolBar' || localNameOfObjectRoot(p) === 'ToolStrip')
  ) {
    relayoutToolStripChildren(p)
  }
  return new XMLSerializer().serializeToString(doc)
}

export function relayoutAllMenuHierarchiesInSvgString(svgXml: string): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgXml, 'image/svg+xml')
  let changed = false
  let hitCount = 0
  const groups = doc.querySelectorAll('g[id]')
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i] as Element
    if (!isUisvgObjectRootG(g)) continue
    const local = normalizeMenuLocalName(localNameOfObjectRoot(g))
    if (local !== 'MenuBar' && local !== 'Menu' && local !== 'ContextMenu' && local !== 'MenuItem') continue
    hitCount++
    relayoutMenuHierarchy(g)
    changed = true
  }
  if (!changed) return null
  return new XMLSerializer().serializeToString(doc)
}
