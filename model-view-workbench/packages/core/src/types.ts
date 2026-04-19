/** Fence language tags supported by the workbench */
export type MvFenceKind = 'mv-model' | 'mv-view' | 'mv-map';

export interface MvModelPayload {
  id: string;
  /** Table columns (SQL-like) */
  columns: Array<{ name: string; type?: string; nullable?: boolean }>;
  /** Row objects keyed by column name */
  rows: Array<Record<string, unknown>>;
}

export interface MvViewPayload {
  id: string;
  /** View implementation kind */
  kind: 'table-readonly' | 'mermaid-class';
  /** Block ids or ref: URIs */
  modelRefs: string[];
  /** View-specific body (e.g. Mermaid source) */
  payload?: string;
}

export interface MvMapRule {
  modelId: string;
  targetPath: string;
  /** Optional template id or snippet name */
  template?: string;
}

export interface MvMapPayload {
  id: string;
  rules: MvMapRule[];
}

export type MvBlockPayload = MvModelPayload | MvViewPayload | MvMapPayload;

export interface ParsedFenceBlock {
  kind: MvFenceKind;
  /** 1-based line of opening ``` */
  startLine: number;
  /** 1-based line of closing ``` */
  endLine: number;
  /** Character offset in source of opening ` */
  startOffset: number;
  /** First character of inner body (after opening fence line) */
  innerStartOffset: number;
  /** Offset where inner body ends (before closing newline+```) */
  innerEndOffset: number;
  /** Character offset after closing fence newline */
  endOffset: number;
  /** Raw inner text between fences (trimmed for JSON parse) */
  rawInner: string;
  payload: MvBlockPayload;
}

export interface ParseMdResult {
  blocks: ParsedFenceBlock[];
  errors: Array<{ message: string; line?: number }>;
}

/** ref:./path/to.md#blockId or ref:other.md#blockId */
export interface ResolvedRef {
  ref: string;
  /** Normalized relative path from workspace root */
  fileRel: string;
  blockId: string;
}
