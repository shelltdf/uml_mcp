/** Fence language tags supported by the workbench */
export type MvFenceKind = 'mv-model' | 'mv-model-kv' | 'mv-model-struct' | 'mv-view' | 'mv-map';

/** `` ```mv-model `` 单列 schema（设计元数据 + 行数据键名） */
export interface MvModelColumnDef {
  name: string;
  type?: string;
  /** 为 true 时行对象可省略该键（与 SQL NULL 语义接近，见解析校验） */
  nullable?: boolean;
  /** 主键列；多列为 true 时表示联合主键（设计/文档用，解析不强制行级唯一） */
  primaryKey?: boolean;
  /** 唯一约束（设计/文档用，解析不校验行数据唯一） */
  unique?: boolean;
  /** 新增行或补全非空缺键时使用的 JSON 字面量 */
  defaultValue?: string | number | boolean | null;
  /** 列说明 / 注释 */
  comment?: string;
}

/**
 * 一个 `` ```mv-model `` 围栏 = **一张表**（固定列 schema + 行数据）。
 * 同一 Markdown 内可出现 **多个** `` ```mv-model `` 块，即多张表；以 `id` 区分并在文件内唯一。
 */
export interface MvModelPayload {
  id: string;
  /** 人类可读表名（可选，用于 UI） */
  title?: string;
  /** 固定列定义：每行只能包含此处声明的列名；非 `nullable` 的列在每一行中必须出现 */
  columns: MvModelColumnDef[];
  /** 行数据：每元素为一行，键与 `columns[].name` 对齐 */
  rows: Array<Record<string, unknown>>;
}

/**
 * 一个 `` ```mv-model-kv `` 围栏 = **文档型数据集合**（类比 MongoDB collection：每条为 JSON 对象，键集合可不固定）。
 */
export interface MvModelKvPayload {
  id: string;
  title?: string;
  /** 各元素须为 **JSON 对象**（非数组）；键值结构自由 */
  documents: Array<Record<string, unknown>>;
}

/** 结构化层次中的数据集节点（类比 HDF5 Dataset） */
export interface MvStructDataset {
  name: string;
  dtype?: string;
  /** 任意 JSON：标量、数组、小矩阵等 */
  data?: unknown;
}

/** 结构化层次中的组节点（类比 HDF5 Group） */
export interface MvStructGroup {
  name: string;
  attributes?: Record<string, unknown>;
  groups?: MvStructGroup[];
  datasets?: MvStructDataset[];
}

/**
 * 一个 `` ```mv-model-struct `` 围栏 = **单根层次结构**（类比 HDF5：根下递归组 + 数据集）。
 */
export interface MvModelStructPayload {
  id: string;
  title?: string;
  root: MvStructGroup;
}

/**
 * 已注册的 `mv-view` 具体类型（逻辑上均为「视图基类」的派生）。
 * 新增产品子类型时：在此追加字面量、更新 `blocks.ts` 校验白名单，并实现对应渲染器。
 */
export const MV_VIEW_KINDS = [
  'table-readonly',
  /** Mermaid：各图类型独立 kind，payload 均为对应 Mermaid 语法片段（由渲染器解释） */
  'mermaid-architecture',
  'mermaid-block',
  'mermaid-c4',
  'mermaid-class',
  'mermaid-er',
  'mermaid-flowchart',
  'mermaid-gantt',
  'mermaid-gitgraph',
  'mermaid-journey',
  'mermaid-kanban',
  'mermaid-mindmap',
  'mermaid-packet',
  'mermaid-pie',
  'mermaid-quadrant',
  'mermaid-requirement',
  'mermaid-sankey',
  'mermaid-sequence',
  'mermaid-state',
  'mermaid-timeline',
  'mermaid-xychart',
  'mermaid-zenuml',
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

/** Mermaid 系视图 kind（`mermaid-*`）；与 `mindmap-ui`（应用脑图 JSON）区分 */
export const MV_MERMAID_VIEW_KINDS: ReadonlySet<MvViewKind> = new Set(
  MV_VIEW_KINDS.filter((k): k is MvViewKind => k.startsWith('mermaid-')),
);

export function isMermaidViewKind(kind: MvViewKind): boolean {
  return MV_MERMAID_VIEW_KINDS.has(kind);
}

/** 与 `MV_VIEW_KINDS` 顺序一致的全部 Mermaid 视图 kind（供插入代码块 UI 等复用） */
export function getMermaidViewKinds(): readonly MvViewKind[] {
  return MV_VIEW_KINDS.filter((k): k is MvViewKind => k.startsWith('mermaid-'));
}

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
  'mermaid-architecture': {
    canvasTitle: 'Mermaid 架构图画布',
    description: '编辑 Mermaid architecture-beta 等源码（写入 payload）。',
    payloadPlaceholder:
      'architecture-beta\n    group api(cloud)[API] {\n        service s(server)[Service]\n    }',
  },
  'mermaid-block': {
    canvasTitle: 'Mermaid 块图画布',
    description: '编辑 Mermaid block-beta 等源码（写入 payload）。',
    payloadPlaceholder: 'block-beta\ncolumns 1\n  block:a["Block A"]',
  },
  'mermaid-c4': {
    canvasTitle: 'Mermaid C4 图画布',
    description: '编辑 Mermaid C4Context / C4Container 等源码（写入 payload）。',
    payloadPlaceholder:
      'C4Context\n    title System Context\n    Person(user, "User")\n    System(sys, "System")\n    Rel(user, sys, "Uses")',
  },
  'mermaid-class': {
    canvasTitle: 'Mermaid Class 图画布',
    description: '编辑 Mermaid classDiagram 等源码（写入 payload）。',
    payloadPlaceholder: 'classDiagram\n  class Example',
  },
  'mermaid-er': {
    canvasTitle: 'Mermaid ER 图画布',
    description: '编辑 Mermaid erDiagram 源码（写入 payload）。',
    payloadPlaceholder: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places',
  },
  'mermaid-flowchart': {
    canvasTitle: 'Mermaid 流程图画布',
    description: '编辑 Mermaid flowchart / graph 源码（写入 payload）。',
    payloadPlaceholder: 'flowchart TD\n    A[Start] --> B{Choice}\n    B -->|Yes| C[OK]\n    B -->|No| D[End]',
  },
  'mermaid-gantt': {
    canvasTitle: 'Mermaid 甘特图画布',
    description: '编辑 Mermaid gantt 源码（写入 payload）。',
    payloadPlaceholder: 'gantt\n    title Example\n    dateFormat YYYY-MM-DD\n    section A\n    Task1 :a1, 2024-01-01, 3d',
  },
  'mermaid-gitgraph': {
    canvasTitle: 'Mermaid Git 图画布',
    description: '编辑 Mermaid gitGraph 源码（写入 payload）。',
    payloadPlaceholder: 'gitGraph\n    commit\n    branch develop\n    checkout develop\n    commit',
  },
  'mermaid-journey': {
    canvasTitle: 'Mermaid 用户旅程图画布',
    description: '编辑 Mermaid journey 源码（写入 payload）。',
    payloadPlaceholder: 'journey\n    title My day\n    section Morning\n      Make tea: 5: Me',
  },
  'mermaid-kanban': {
    canvasTitle: 'Mermaid 看板图画布',
    description: '编辑 Mermaid kanban 源码（写入 payload）。',
    payloadPlaceholder: 'kanban\n  Todo\n    [Task A]\n    [Task B]\n  Done[]',
  },
  'mermaid-mindmap': {
    canvasTitle: 'Mermaid 脑图画布',
    description: '编辑 Mermaid mindmap 语法（写入 payload）；与应用 JSON 脑图 `mindmap-ui` 不同。',
    payloadPlaceholder: 'mindmap\n  root((Topic))\n    A\n      A1\n    B',
  },
  'mermaid-packet': {
    canvasTitle: 'Mermaid 分组位段图画布',
    description: '编辑 Mermaid packet-beta 等源码（写入 payload）。',
    payloadPlaceholder: 'packet-beta\n0-15: "Source Port"\n16-31: "Destination Port"',
  },
  'mermaid-pie': {
    canvasTitle: 'Mermaid 饼图画布',
    description: '编辑 Mermaid pie 源码（写入 payload）。',
    payloadPlaceholder: 'pie title Example\n    "A" : 40\n    "B" : 35\n    "C" : 25',
  },
  'mermaid-quadrant': {
    canvasTitle: 'Mermaid 象限图画布',
    description: '编辑 Mermaid quadrantChart 源码（写入 payload）。',
    payloadPlaceholder:
      'quadrantChart\n    title Reach vs engagement\n    x-axis Low --> High\n    y-axis Low --> High\n    Campaign: [0.3, 0.6]',
  },
  'mermaid-requirement': {
    canvasTitle: 'Mermaid 需求图画布',
    description: '编辑 Mermaid requirementDiagram 源码（写入 payload）。',
    payloadPlaceholder:
      'requirementDiagram\n    requirement req1 {\n    id: 1\n    text: requirement text\n    risk: high\n    verifymethod: test\n    }\n    element e1 {\n    type: simulation\n    }\n    e1 - satisfies -> req1',
  },
  'mermaid-sankey': {
    canvasTitle: 'Mermaid Sankey 图画布',
    description: '编辑 Mermaid sankey-beta 等源码（写入 payload）。',
    payloadPlaceholder: 'sankey-beta\n\nSource,A,100\nA,B,50\nA,C,50',
  },
  'mermaid-sequence': {
    canvasTitle: 'Mermaid 序列图画布',
    description: '编辑 Mermaid sequenceDiagram 源码（写入 payload）。',
    payloadPlaceholder: 'sequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi',
  },
  'mermaid-state': {
    canvasTitle: 'Mermaid 状态图画布',
    description: '编辑 Mermaid stateDiagram-v2 源码（写入 payload）。',
    payloadPlaceholder: 'stateDiagram-v2\n    [*] --> Idle\n    Idle --> [*]',
  },
  'mermaid-timeline': {
    canvasTitle: 'Mermaid 时间线图画布',
    description: '编辑 Mermaid timeline 源码（写入 payload）。',
    payloadPlaceholder: 'timeline\n    title History\n    2020 : Milestone A\n    2021 : Milestone B',
  },
  'mermaid-xychart': {
    canvasTitle: 'Mermaid XY 图表画布',
    description: '编辑 Mermaid xychart-beta 源码（写入 payload）。',
    payloadPlaceholder:
      'xychart-beta\n    title "Example"\n    x-axis [jan, feb, mar]\n    y-axis "y" 0 --> 10\n    bar [2, 5, 8]',
  },
  'mermaid-zenuml': {
    canvasTitle: 'Mermaid ZenUML 图画布',
    description: '编辑 Mermaid zenuml 源码（写入 payload）。',
    payloadPlaceholder: 'zenuml\n    Alice->Bob: Hello',
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

/** 数据表（mv-model）块在 Workbench 中的画布名称（SQL 风格布局与 DDL 示意） */
export const MV_MODEL_CANVAS_TITLE = 'SQL 风格数据表画布';

/** KV 文档集（mv-model-kv）画布名称 */
export const MV_MODEL_KV_CANVAS_TITLE = 'KV 数据表画布';

/** 结构化层次（mv-model-struct）画布名称 */
export const MV_MODEL_STRUCT_CANVAS_TITLE = '结构化层次画布';

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
 * 具体语义由 `kind` 决定（表只读、Mermaid 各图、脑图 UI、PlantUML 各图、UI 设计等）。
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
   * 子类型载荷：如各 `mermaid-*` / `uml-diagram` 的图源、`mindmap-ui` 的序列化快照等（由对应 `kind` 的渲染器解释）。
   * 对 **`mermaid-*`**：可与紧随 `` ```mv-view `` 后的标准 `` ```mermaid`` 围栏**镜像同文**（见 `ParsedMermaidMirrorFence`），便于 GitHub 等普通 Markdown 渲染图；工作台保存时会同步两段正文。
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

export type MvBlockPayload =
  | MvModelPayload
  | MvModelKvPayload
  | MvModelStructPayload
  | MvViewPayload
  | MvMapPayload;

/**
 * 紧随 `` ```mv-view ``（且 `kind` 为 `mermaid-*`）的标准 `` ```mermaid `` 围栏，与 JSON 内 `payload` 同源，供普通 Markdown 预览 Mermaid。
 * 解析时若 JSON 中 `payload` 为空而镜像非空，则用镜像正文填充 `payload`。
 */
export interface ParsedMermaidMirrorFence {
  /** `` ```mermaid`` 行首第一个 `` ` `` 的偏移 */
  fenceStartOffset: number;
  /** Mermaid 正文起始（开围栏换行后） */
  innerStartOffset: number;
  /** Mermaid 正文结束（闭合 `` ``` `` 前） */
  innerEndOffset: number;
  /** 闭合围栏之后（与块级 `endOffset` 语义一致，可含末尾换行） */
  endOffset: number;
}

export interface ParsedFenceBlock {
  kind: MvFenceKind;
  /** 1-based line of opening ``` */
  startLine: number;
  /** 1-based line of closing ```（含可选尾随 `` ```mermaid`` 时取该段闭合行） */
  endLine: number;
  /** Character offset in source of opening ` */
  startOffset: number;
  /** First character of inner body (after opening fence line) */
  innerStartOffset: number;
  /** Offset where inner body ends (before closing newline+```) */
  innerEndOffset: number;
  /**
   * 该逻辑块在源码中的结束偏移：无镜像时为 mv-view 围栏结束；有 `mermaidMirror` 时为镜像 Mermaid 围栏结束（便于光标落在整块内）。
   */
  endOffset: number;
  /** Raw inner text between fences (trimmed for JSON parse) */
  rawInner: string;
  payload: MvBlockPayload;
  /** 仅 `mv-view` 且 `kind` 为 `mermaid-*` 且源码紧随标准 `` ```mermaid`` 时出现 */
  mermaidMirror?: ParsedMermaidMirrorFence;
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
