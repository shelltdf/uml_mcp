/** Fence language tags supported by the workbench */
export type MvFenceKind = 'mv-model' | 'mv-view' | 'mv-map';

/**
 * 一个 `` ```mv-model `` 围栏 = **一张表**（固定列 schema + 行数据）。
 * 同一 Markdown 内可出现 **多个** `` ```mv-model `` 块，即多张表；以 `id` 区分并在文件内唯一。
 */
export interface MvModelPayload {
  id: string;
  /** 人类可读表名（可选，用于 UI） */
  title?: string;
  /** 固定列定义：每行只能包含此处声明的列名；非 `nullable` 的列在每一行中必须出现 */
  columns: Array<{ name: string; type?: string; nullable?: boolean }>;
  /** 行数据：每元素为一行，键与 `columns[].name` 对齐 */
  rows: Array<Record<string, unknown>>;
}

/**
 * 已注册的 `mv-view` 具体类型（逻辑上均为「视图基类」的派生）。
 * 新增产品子类型时：在此追加字面量、更新 `blocks.ts` 校验白名单，并实现对应渲染器。
 */
export const MV_VIEW_KINDS = [
  'table-readonly',
  'mermaid-class',
  'mindmap-ui',
  'uml-diagram',
  /** PlantUML：类图专用画布（payload 为 @startuml … class … @enduml 等） */
  'uml-class',
  /** PlantUML：序列图专用画布 */
  'uml-sequence',
  /** PlantUML：活动图专用画布 */
  'uml-activity',
  /** UI / 线框 / 组件规格（payload 由专用编辑器解释，可为 JSON 或 DSL 文本） */
  'ui-design',
] as const;

export type MvViewKind = (typeof MV_VIEW_KINDS)[number];

/** 各视图 kind 对应独立「画布」的人类可读标题与说明（Workbench UI 与文档可共用） */
export const MV_VIEW_KIND_METADATA: Record<
  MvViewKind,
  { canvasTitle: string; description: string; payloadPlaceholder: string }
> = {
  'table-readonly': {
    canvasTitle: '只读表视图画布',
    description: '编辑标题、modelRefs；表格数据请在关联的 mv-model 块画布中修改。',
    payloadPlaceholder: '（可选；本类型一般无需 payload）',
  },
  'mermaid-class': {
    canvasTitle: 'Mermaid Class 图画布',
    description: '编辑 Mermaid classDiagram 等源码（写入 payload）。',
    payloadPlaceholder: 'classDiagram\n  class Example',
  },
  'mindmap-ui': {
    canvasTitle: '脑图画布',
    description: '编辑脑图 JSON 快照（payload）；modelRefs 绑定数据表。',
    payloadPlaceholder: '{ "nodes": [], "edges": [] }',
  },
  'uml-diagram': {
    canvasTitle: '通用 UML / PlantUML 画布',
    description: '任意 PlantUML 片段写入 payload；若已区分专用图类型，建议改用 uml-class / uml-sequence / uml-activity。',
    payloadPlaceholder: '@startuml\nAlice -> Bob: hello\n@enduml',
  },
  'uml-class': {
    canvasTitle: 'UML Class 图画布',
    description: '专用类图编辑面；payload 为 PlantUML 类图相关源码。',
    payloadPlaceholder: '@startuml\nclass Order\nclass Customer\nOrder --> Customer\n@enduml',
  },
  'uml-sequence': {
    canvasTitle: 'UML 序列图画布',
    description: '专用序列图编辑面；payload 为 PlantUML sequence 相关源码。',
    payloadPlaceholder: '@startuml\nparticipant User\nparticipant API\nUser -> API: request\n@enduml',
  },
  'uml-activity': {
    canvasTitle: 'UML 活动图画布',
    description: '专用活动图编辑面；payload 为 PlantUML activity 相关源码。',
    payloadPlaceholder: '@startuml\nstart\n:步骤 A;\n:步骤 B;\nstop\n@enduml',
  },
  'ui-design': {
    canvasTitle: 'UI 设计画布',
    description: '界面结构、线框或组件树等规格；payload 格式由后续专用编辑器约定（可为 JSON）。',
    payloadPlaceholder: '{ "screens": [], "components": [] }',
  },
};

/** 数据表（mv-model）块在 Workbench 中的画布名称 */
export const MV_MODEL_CANVAS_TITLE = '数据表画布';

/** 映射块画布名称 */
export const MV_MAP_CANVAS_TITLE = '映射规则画布';

/**
 * **modelRefs 书写约定**（供 UI 与文档展示；解析规则见 `refs/resolve.ts` 的 `parseRefUri` / `resolveRefPath`）。
 * 每个 `mv-view` 应在 `modelRefs` 中列出其依赖的 **Model 地址**：可多项。
 */
export const MV_MODEL_REFS_SCHEME_DOC =
  'modelRefs 每项指向一个 mv-model 块：与该 view 在同一 .md 时，填写该 model 的 JSON id；在其它 .md 时，填写 ref:相对路径.md#块id（# 后为对方文件中 model 的 id；相对路径相对于当前 view 所在 .md 的目录，用 /）。';

/** PlantUML 系视图（细分 kind 与通用 uml-diagram） */
export const MV_PLANTUML_VIEW_KINDS: ReadonlySet<MvViewKind> = new Set([
  'uml-diagram',
  'uml-class',
  'uml-sequence',
  'uml-activity',
]);

export function isPlantUmlViewKind(kind: MvViewKind): boolean {
  return MV_PLANTUML_VIEW_KINDS.has(kind);
}

/**
 * **mv-view**：JSON 中的「视图基类」——公共字段为 `id`、`kind`、`modelRefs`（及可选 `title`）；
 * 具体语义由 `kind` 决定（表只读、Mermaid 类图、脑图 UI、PlantUML 各图、UI 设计等）。
 */
export interface MvViewPayload {
  id: string;
  kind: MvViewKind;
  /** 同文件 model 的 `id`，或 `ref:相对路径.md#blockId` */
  /** 绑定的 Model 地址列表：同文件为 ``mv-model`` 的 `id`；跨文件为 `ref:相对路径.md#块id`（见 `MV_MODEL_REFS_SCHEME_DOC`） */
  modelRefs: string[];
  /** 可选视图标题（展示用） */
  title?: string;
  /**
   * 子类型载荷：如 `mermaid-class` / `uml-diagram` 的图源、`mindmap-ui` 的序列化快照等（由对应 `kind` 的渲染器解释）。
   */
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
