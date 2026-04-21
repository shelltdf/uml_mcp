export interface MindmapNodeData {
  id: string;
  label: string;
  parentId: string | null;
  order: number;
  collapsed?: boolean;
  icon?: string;
  note?: string;
  textColor?: string;
  bgColor?: string;
  fontSize?: number;
}

export interface MindmapEdgeData {
  id: string;
  from: string;
  to: string;
}

export interface MindmapPayloadV0 {
  format: 'mv-mindmap-v0';
  nodes: Array<{
    id: string;
    label: string;
    parentId?: string | null;
    order?: number;
    collapsed?: boolean;
    icon?: string;
    note?: string;
    textColor?: string;
    bgColor?: string;
    fontSize?: number;
  }>;
  edges?: Array<{ id?: string; from: string; to: string }>;
  view?: { panX?: number; panY?: number; scale?: number };
  theme?: string;
}

export interface MindmapLayoutNode extends MindmapNodeData {
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
}

export interface MindmapGraphState {
  nodes: MindmapNodeData[];
  edges: MindmapEdgeData[];
  panX: number;
  panY: number;
  scale: number;
  theme: string;
}

export interface MindmapSelectionState {
  selectedIds: string[];
}

export interface MindmapViewportSize {
  width: number;
  height: number;
}
