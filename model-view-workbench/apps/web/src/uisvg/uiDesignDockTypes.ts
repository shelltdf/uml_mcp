import type { CanvasViewCommand } from './components/canvasViewCommands';
import type { OutlineNode } from './lib/uisvgDocument';

export interface UiDesignDockState {
  svgMarkup: string;
  selectedIds: string[];
  outlineNodes: OutlineNode[];
}

export type UiDesignDockAction =
  | 'outline-select'
  | 'outline-frame'
  | 'outline-reparent'
  | 'add-basic'
  | 'add-windows'
  | 'update-svg'
  | 'update-selected-id'
  | 'canvas-command';

export interface UiDesignDockCommand {
  id: number;
  action: UiDesignDockAction;
  /** 语义随 action：`outline-reparent` 为 JSON；`canvas-command` 为 CanvasViewCommand 名 */
  payload?: string;
}

/** 校验 canvas-command 子类型 */
export function isCanvasViewCommandName(s: string): s is CanvasViewCommand {
  return (
    s === 'delete' ||
    s === 'copy' ||
    s === 'paste' ||
    s === 'align-left' ||
    s === 'align-right' ||
    s === 'align-hcenter' ||
    s === 'align-top' ||
    s === 'align-bottom' ||
    s === 'align-vcenter'
  );
}
