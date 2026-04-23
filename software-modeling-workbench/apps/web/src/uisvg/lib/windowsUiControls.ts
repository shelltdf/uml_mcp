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
import {
  appendSvgShape,
  appendToDrawingLayer,
  nextWindowsControlDomId,
  type AppendObjectResult,
} from './uisvgDocument'
import { uisvgLocalNameToQName, writeUisvgBundleToObjectRoot, type UisvgObjectBundleV1 } from './uisvgMetaNode'

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
      { id: 'MenuStrip', label: 'MenuStrip', win32: '#32768 (HMENU+rebar)', qt: 'QMenuBar' },
      { id: 'ToolStrip', label: 'ToolStrip', win32: 'ToolbarWindow32', qt: 'QToolBar' },
      { id: 'StatusStrip', label: 'StatusStrip', win32: 'msctls_statusbar32', qt: 'QStatusBar' },
      { id: 'ContextMenuStrip', label: 'ContextMenuStrip', win32: '#32768 (popup)', qt: 'QMenu' },
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
  MenuStrip(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'win-bar-face',
        width: '160',
        height: '22',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    const t = T(doc, '6', '16', 'File  Edit  View', '11')
    t.setAttribute('data-uisvg-part', 'win-bar-caption')
    g.appendChild(t)
  },
  ToolStrip(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'toolstrip-face',
        width: '160',
        height: '26',
        fill: WIN_FACE,
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'toolstrip-item',
        x: '6',
        y: '4',
        width: '22',
        height: '18',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'toolstrip-item',
        x: '32',
        y: '4',
        width: '22',
        height: '18',
        fill: WIN_BTN,
        stroke: WIN_BORDER,
      }),
    )
  },
  StatusStrip(doc, g) {
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
  ContextMenuStrip(doc, g) {
    g.appendChild(
      E(doc, 'rect', {
        'data-uisvg-part': 'contextmenu-face',
        width: '100',
        height: '56',
        fill: '#ffffff',
        stroke: WIN_BORDER,
        filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,.2))',
      }),
    )
    const tOpen = T(doc, '8', '16', 'Open', '11')
    tOpen.setAttribute('data-uisvg-part', 'contextmenu-item')
    g.appendChild(tOpen)
    const tExit = T(doc, '8', '32', 'Exit', '11')
    tExit.setAttribute('data-uisvg-part', 'contextmenu-item')
    g.appendChild(tExit)
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
  })
  return { svg, createdDomId }
}
