/** Fence language tags supported by the workbench */
export type MvFenceKind =
  | 'mv-model-sql'
  | 'mv-model-kv'
  | 'mv-model-struct'
  | 'mv-model-codespace'
  | 'mv-model-interface'
  | 'mv-view'
  | 'mv-map';

/** `` ```mv-model-sql `` 内单张表的列 schema（设计元数据 + 行数据键名）。列名 ``id`` 在业务上常作主键：Workbench 默认 ``primaryKey`` + 非可空，且解析器要求 **所有标记 ``primaryKey`` 的列在行间取值组合唯一**。 */
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
 * `` ```mv-model-sql `` 围栏内的 **一张物理表**（固定列 schema + 行数据）。
 * 块级 `MvModelSqlPayload.id` 为该 Model 组 id；本对象的 `id` 为组内表 id（唯一）。
 */
export interface MvModelSqlTable {
  id: string;
  /** 人类可读表名（可选） */
  title?: string;
  columns: MvModelColumnDef[];
  rows: Array<Record<string, unknown>>;
}

/**
 * 一个 `` ```mv-model-sql `` 围栏 = **Model（SQL 表组）**：可含多张表；围栏在文件内以块级 `id` 唯一。
 * **View**（``mv-view``）通过 `modelRefs` 绑定本块：`块id#表id`；仅一块内一张表时可写 `块id`（省略表 id）。
 */
export interface MvModelSqlPayload {
  id: string;
  title?: string;
  tables: MvModelSqlTable[];
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

/** 代码空间内 Classifier 种类（UML Classifier 的文档化子集） */
export type MvCodespaceClassifierKind = 'class' | 'interface' | 'struct';

/** 泛化 / 实现（对应 UML Generalization / InterfaceRealization） */
export type MvCodespaceBaseRelation = 'generalization' | 'realization';

/** 方法语义细分（用于构造/析构/仿函数/操作符等文档化标记） */
export type MvCodespaceMethodKind = 'normal' | 'constructor' | 'destructor' | 'functor' | 'operator';
/** 方法参数传递方式 */
export type MvCodespaceMethodParamPassMode = 'value' | 'reference' | 'pointer';
/** 字段访问器策略（私有字段 + get/set 包装语义） */
export type MvCodespaceFieldAccessor = 'none' | 'get' | 'set' | 'getset';
/** Property 访问器可见性 */
export type MvCodespaceAccessorVisibility = 'public' | 'protected' | 'private' | 'package';

/** 类间关系种类（对应 UML Association / Shared aggregation / Composition / Dependency） */
export type MvCodespaceAssociationKind =
  | 'association'
  | 'aggregation'
  | 'composition'
  | 'dependency';

/** 继承或实现边：`targetId` 须指向同围栏内另一条 `classes[].id` */
export interface MvCodespaceClassifierBase {
  targetId: string;
  relation: MvCodespaceBaseRelation;
}

/** Classifier 普通成员变量（原 `members` 中 `kind: field`） */
export interface MvCodespaceClassMember {
  name: string;
  static?: boolean;
  /** 如 public / private / protected / package */
  visibility?: string;
  accessor?: MvCodespaceFieldAccessor;
  /** 该成员对应的关联另一端 Classifier（同围栏 `classes[].id`）；与类图/同步类型语义独立可配 */
  associatedClassifierId?: string;
  typeFromAssociation?: boolean;
  type?: string;
  notes?: string;
}

/** Classifier 方法参数 */
export interface MvCodespaceMethodParam {
  name: string;
  type?: string;
  /** 值传递 / 引用 / 指针 */
  passMode?: MvCodespaceMethodParamPassMode;
  isConst?: boolean;
  notes?: string;
}

/** Classifier 方法 */
export interface MvCodespaceClassMethod {
  name: string;
  static?: boolean;
  visibility?: string;
  virtual?: boolean;
  methodKind?: MvCodespaceMethodKind;
  operatorSymbol?: string;
  params?: MvCodespaceMethodParam[];
  typeFromAssociation?: boolean;
  type?: string;
  signature?: string;
  notes?: string;
}

/** Classifier 枚举字面量（JSON 键名 `enum`） */
export interface MvCodespaceClassEnum {
  name: string;
  enumGroup?: string;
  /** 字面量值（如 C++ 枚举项显式赋值） */
  value?: string;
  type?: string;
  notes?: string;
}

/** Property：私有 backing 字段 + 可选公有/受保护访问器（get/set）复合语义 */
export interface MvCodespaceProperty {
  /** 业务语义名（例如 balance） */
  name: string;
  /** 私有 backing 字段名（例如 _balance） */
  backingFieldName?: string;
  /** backing 字段可见性；默认 private */
  backingVisibility?: string;
  /** 该属性对应的关联另一端 Classifier（同围栏 `classes[].id`） */
  associatedClassifierId?: string;
  type?: string;
  /** type 是否由关联关系自动推导（只读语义开关） */
  typeFromAssociation?: boolean;
  static?: boolean;
  hasGetter?: boolean;
  hasSetter?: boolean;
  getterVisibility?: MvCodespaceAccessorVisibility;
  setterVisibility?: MvCodespaceAccessorVisibility;
  notes?: string;
}

/** 命名空间内类型（class / interface / struct 示意） */
export interface MvCodespaceClassifier {
  id: string;
  name: string;
  kind?: MvCodespaceClassifierKind;
  /** 人类可读全名，不参与引用解析 */
  qualifiedName?: string;
  notes?: string;
  abstract?: boolean;
  stereotype?: string;
  /** 模板形参名列表（示意，如 `["T","U"]`） */
  templateParams?: string[];
  bases?: MvCodespaceClassifierBase[];
  /** 独立属性组：私有字段 + 访问器；不与 members/methods 混用 */
  properties?: MvCodespaceProperty[];
  /** 普通成员变量（复数键） */
  members?: MvCodespaceClassMember[];
  /** 方法（复数键） */
  methods?: MvCodespaceClassMethod[];
  /** 枚举字面量（复数键） */
  enums?: MvCodespaceClassEnum[];
}

export interface MvCodespaceVariable {
  id: string;
  name: string;
  type?: string;
  notes?: string;
}

export interface MvCodespaceFunction {
  id: string;
  name: string;
  signature?: string;
  notes?: string;
}

/** 文档化宏，不执行预处理器 */
export interface MvCodespaceMacro {
  id: string;
  name: string;
  params?: string;
  definitionSnippet?: string;
  notes?: string;
}

export interface MvCodespaceAssociationEnd {
  role?: string;
  multiplicity?: string;
  navigable?: boolean;
}

/** 类级关联；端点须引用同围栏内 `classes[].id`（v1 不跨 module） */
export interface MvCodespaceAssociation {
  id: string;
  kind: MvCodespaceAssociationKind;
  fromClassifierId: string;
  toClassifierId: string;
  fromEnd?: MvCodespaceAssociationEnd;
  toEnd?: MvCodespaceAssociationEnd;
  notes?: string;
}

/**
 * 递归命名空间（≈ 嵌套 UML Package / Namespace）。
 * 同一块内 `id` 与模块 `id`、其它命名空间、类、变量、函数、宏、关联的 `id` **全局不得重复**。
 */
export interface MvCodespaceNamespaceNode {
  id: string;
  name: string;
  qualifiedName?: string;
  notes?: string;
  namespaces?: MvCodespaceNamespaceNode[];
  classes?: MvCodespaceClassifier[];
  variables?: MvCodespaceVariable[];
  functions?: MvCodespaceFunction[];
  macros?: MvCodespaceMacro[];
  associations?: MvCodespaceAssociation[];
}

/** ``mv-model-codespace`` 内描述仓库/工作区划分的逻辑模块条目（示意，非运行时代码树）。 */
export interface MvModelCodespaceModule {
  id: string;
  name: string;
  /** 仓库内相对路径或逻辑位置 */
  path?: string;
  /** 如 lib / app / tool 等 */
  role?: string;
  notes?: string;
  /** 可选：模块下命名空间树（UML 风格代码结构示意） */
  namespaces?: MvCodespaceNamespaceNode[];
}

/**
 * 一个 `` ```mv-model-codespace `` 围栏 = **软件模型 / 代码空间示意**：工作区根与模块列表（JSON）；用于文档化 monorepo 或分层边界，不等同于真实文件系统。
 */
export interface MvModelCodespacePayload {
  id: string;
  title?: string;
  /** 工作区或 monorepo 根路径片段（示意） */
  workspaceRoot?: string;
  /** 至少一条模块；`id` 在块内须唯一 */
  modules: MvModelCodespaceModule[];
}

/** ``mv-model-interface`` 内单条接口 / 端点描述（文档化用，非运行时契约）。 */
export interface MvModelInterfaceEndpoint {
  id: string;
  name: string;
  /** HTTP 方法或 RPC 动词等 */
  method?: string;
  /** 路径或操作名 */
  path?: string;
  notes?: string;
}

/**
 * 一个 `` ```mv-model-interface `` 围栏 = **接口模型 / 接口图示意**：端点列表（JSON），用于文档化 API 面或模块间契约，**不**替代 OpenAPI 等正式规范文件。
 */
export interface MvModelInterfacePayload {
  id: string;
  title?: string;
  /** 至少一条；每项 `id` 在块内须唯一 */
  endpoints: MvModelInterfaceEndpoint[];
}

/**
 * 已注册的 `mv-view` 具体类型（逻辑上均为「视图基类」的派生）。
 * 新增产品子类型时：在此追加字面量、更新 `blocks.ts` 校验白名单，并实现对应渲染器。
 */
export const MV_VIEW_KINDS = [
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
  /** UML：类图专用画布（独立 JSON 记录格式） */
  'uml-class',
  /** UML：对象图（独立 JSON 记录格式） */
  'uml-object',
  /** UML：包图（独立 JSON 记录格式） */
  'uml-package',
  /** UML：组合结构图（独立 JSON 记录格式） */
  'uml-composite-structure',
  /** UML：组件图（独立 JSON 记录格式） */
  'uml-component',
  /** UML：部署图（独立 JSON 记录格式） */
  'uml-deployment',
  /** UML：Profile 图（独立 JSON 记录格式） */
  'uml-profile',
  /** UML：用例图（独立 JSON 记录格式） */
  'uml-usecase',
  /** UML：序列图专用画布（独立 JSON 记录格式） */
  'uml-sequence',
  /** UML：状态机图（独立 JSON 记录格式） */
  'uml-state-machine',
  /** UML：通信图（独立 JSON 记录格式） */
  'uml-communication',
  /** UML：时序图（Timing，独立 JSON 记录格式） */
  'uml-timing',
  /** UML：交互概览图（独立 JSON 记录格式） */
  'uml-interaction-overview',
  /** UML：活动图专用画布（独立 JSON 记录格式） */
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

/**
 * 插入对话框 **「Mermaid UML」** 分组：与 **UML 图类**、**ER**、**需求图**、**C4**、**架构图（architecture-beta）**、**ZenUML 序列** 等**建模/架构**用途邻近的 Mermaid 图类（其余见 {@link getMermaidNonUmlViewKinds}）。
 * **不含** `mermaid-block`：`block-beta` 为通用分块/阵列排版，**不是** OMG UML 标准图类，留在「Mermaid 其他」。
 * 顺序与 `MV_VIEW_KINDS` 中首次出现顺序一致，便于与全量列表对照。
 */
export const MV_MERMAID_UML_INSERT_KINDS: readonly MvViewKind[] = [
  'mermaid-class',
  'mermaid-sequence',
  'mermaid-state',
  'mermaid-er',
  'mermaid-c4',
  'mermaid-architecture',
  'mermaid-requirement',
  'mermaid-zenuml',
];

/** `mermaid-*` 中不在 {@link MV_MERMAID_UML_INSERT_KINDS} 内的 kind，顺序同 `MV_VIEW_KINDS`。 */
export function getMermaidNonUmlViewKinds(): readonly MvViewKind[] {
  const uml = new Set<string>(MV_MERMAID_UML_INSERT_KINDS);
  return MV_VIEW_KINDS.filter((k): k is MvViewKind => k.startsWith('mermaid-') && !uml.has(k));
}

/** 各视图 kind 对应独立「画布」的人类可读标题与说明（Workbench UI 与文档可共用） */
export const MV_VIEW_KIND_METADATA: Record<
  MvViewKind,
  { canvasTitle: string; description: string; payloadPlaceholder: string }
> = {
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
    canvasTitle: '通用 UML 图画布',
    description: '通用 UML 独立记录（JSON）编辑面；核心不依赖 Mermaid / @startuml 扩展。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-class': {
    canvasTitle: 'UML Class 图画布',
    description: '专用类图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-object': {
    canvasTitle: 'UML Object 图画布',
    description: '专用对象图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-package': {
    canvasTitle: 'UML Package 图画布',
    description: '专用包图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-composite-structure': {
    canvasTitle: 'UML Composite Structure 图画布',
    description: '专用组合结构图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-component': {
    canvasTitle: 'UML Component 图画布',
    description: '专用组件图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-deployment': {
    canvasTitle: 'UML Deployment 图画布',
    description: '专用部署图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-profile': {
    canvasTitle: 'UML Profile 图画布',
    description: '专用 Profile 图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-usecase': {
    canvasTitle: 'UML Use Case 图画布',
    description: '专用用例图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-sequence': {
    canvasTitle: 'UML 序列图画布',
    description: '专用序列图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-state-machine': {
    canvasTitle: 'UML State Machine 图画布',
    description: '专用状态机图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-communication': {
    canvasTitle: 'UML Communication 图画布',
    description: '专用通信图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-timing': {
    canvasTitle: 'UML Timing 图画布',
    description: '专用时序（Timing）图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-interaction-overview': {
    canvasTitle: 'UML Interaction Overview 图画布',
    description: '专用交互概览图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'uml-activity': {
    canvasTitle: 'UML 活动图画布',
    description: '专用活动图编辑面；payload 使用 UML 独立 JSON 记录格式。',
    payloadPlaceholder: '（由插入代码块对话框按 core 的 UML 映射自动生成）',
  },
  'ui-design': {
    canvasTitle: 'UI 设计画布',
    description: '界面结构、线框或组件树等规格；payload 格式由后续专用编辑器约定（可为 JSON）。',
    payloadPlaceholder: '{ "screens": [], "components": [] }',
  },
};

/** ``mv-model-sql``（多表 Model 组）在 Workbench 中的画布名称 */
export const MV_MODEL_SQL_CANVAS_TITLE = 'mv-model-sql 画布（Model · 多表）';

/** @deprecated 使用 {@link MV_MODEL_SQL_CANVAS_TITLE} */
export const MV_MODEL_CANVAS_TITLE = MV_MODEL_SQL_CANVAS_TITLE;

/** KV 文档集（mv-model-kv）画布名称 */
export const MV_MODEL_KV_CANVAS_TITLE = 'KV 数据表画布';

/** 结构化层次（mv-model-struct）画布名称 */
export const MV_MODEL_STRUCT_CANVAS_TITLE = '结构化层次画布';

/** 代码空间 / 软件仓库结构示意（mv-model-codespace）画布名称 */
/** 与代码/文档 id 对齐：ASCII，壳层可按 `locale` 另行展示本地化副标题 */
export const MV_MODEL_CODESPACE_CANVAS_TITLE = '代码空间模型画布';

/** 接口模型 / 接口图示意（mv-model-interface）画布名称 */
export const MV_MODEL_INTERFACE_CANVAS_TITLE = '接口图模型画布';

/** 映射块画布名称 */
export const MV_MAP_CANVAS_TITLE = '映射规则画布';

/**
 * **modelRefs 书写约定**（供 UI 与文档展示；解析规则见 `refs/resolve.ts` 的 `parseRefUri` / `resolveRefPath`）。
 * 每个 `mv-view` 应在 `modelRefs` 中列出其依赖的 **Model 地址**：可多项。
 */
export const MV_MODEL_REFS_SCHEME_DOC_ZH =
  'modelRefs 每项指向 **Model** 围栏（``mv-model-sql`` / ``mv-model-kv`` / ``mv-model-struct`` / ``mv-model-codespace`` / ``mv-model-interface``）：同文件写 `块id`；``mv-model-sql`` 多表时写 `块id#表id`，仅一张表时可只写 `块id`。跨文件写 `ref:相对路径.md#块id`，sql 多表时再加 `#表id`。路径相对于当前 mv-view 所在 .md 的目录，用 /。';

/** English counterpart of {@link MV_MODEL_REFS_SCHEME_DOC_ZH}. */
export const MV_MODEL_REFS_SCHEME_DOC_EN =
  'Each `modelRefs` entry points to a **Model** fence (``mv-model-sql`` / ``mv-model-kv`` / ``mv-model-struct`` / ``mv-model-codespace`` / ``mv-model-interface``): in the **same** Markdown file write `block-id`; for ``mv-model-sql`` with **multiple** tables use `block-id#table-id`, and with **only one** table you may write just `block-id`. **Cross-file** refs use `ref:relative/path.md#block-id`, appending `#table-id` when SQL has multiple tables. Paths are **relative to the directory of the `.md` that contains the `mv-view`**, using `/`.';

/**
 * @deprecated 与 {@link MV_MODEL_REFS_SCHEME_DOC_ZH} 同文；新代码请用 {@link modelRefsSchemeDoc} 或 `MV_MODEL_REFS_SCHEME_DOC_ZH` / `MV_MODEL_REFS_SCHEME_DOC_EN`。
 */
export const MV_MODEL_REFS_SCHEME_DOC = MV_MODEL_REFS_SCHEME_DOC_ZH;

export function modelRefsSchemeDoc(lang: 'zh' | 'en'): string {
  return lang === 'en' ? MV_MODEL_REFS_SCHEME_DOC_EN : MV_MODEL_REFS_SCHEME_DOC_ZH;
}

/** UML 系视图（细分 kind 与通用 uml-diagram；独立记录格式） */
export const MV_UML_VIEW_KINDS: ReadonlySet<MvViewKind> = new Set([
  'uml-diagram',
  'uml-class',
  'uml-object',
  'uml-package',
  'uml-composite-structure',
  'uml-component',
  'uml-deployment',
  'uml-profile',
  'uml-usecase',
  'uml-sequence',
  'uml-state-machine',
  'uml-communication',
  'uml-timing',
  'uml-interaction-overview',
  'uml-activity',
]);

/** `uml-*` kind 对应独立 JSON 记录中的 `diagramType`。 */
export const MV_UML_KIND_DIAGRAM_TYPE: Readonly<Record<string, string>> = {
  'uml-diagram': 'generic',
  'uml-class': 'class',
  'uml-object': 'object',
  'uml-package': 'package',
  'uml-composite-structure': 'composite-structure',
  'uml-component': 'component',
  'uml-deployment': 'deployment',
  'uml-profile': 'profile',
  'uml-usecase': 'usecase',
  'uml-sequence': 'sequence',
  'uml-state-machine': 'state-machine',
  'uml-communication': 'communication',
  'uml-timing': 'timing',
  'uml-interaction-overview': 'interaction-overview',
  'uml-activity': 'activity',
};

export function isUmlViewKind(kind: MvViewKind): boolean {
  return MV_UML_VIEW_KINDS.has(kind);
}

/**
 * @deprecated 请改用 `MV_UML_VIEW_KINDS`。
 * 仅为兼容旧调用保留该别名，避免核心语义继续绑定具体扩展实现。
 * TODO(v2): 移除该兼容别名。
 */
export const MV_PLANTUML_VIEW_KINDS = MV_UML_VIEW_KINDS;

/**
 * @deprecated 请改用 `isUmlViewKind`。
 * 仅为兼容旧调用保留该别名，避免核心语义继续绑定具体扩展实现。
 * TODO(v2): 移除该兼容别名。
 */
export const isPlantUmlViewKind = isUmlViewKind;

/**
 * **mv-view**：JSON 中的「视图基类」——公共字段为 `id`、`kind`、`modelRefs`（及可选 `title`）；
 * 具体语义由 `kind` 决定（表只读、Mermaid 各图、脑图 UI、UML 各图、UI 设计等）。
 */
export interface MvViewPayload {
  id: string;
  kind: MvViewKind;
  /** 绑定的 Model 地址：同文件 `块id` 或 sql 多表时的 `块id#表id`；跨文件 `ref:路径.md#块id`（见 `MV_MODEL_REFS_SCHEME_DOC_ZH` / `MV_MODEL_REFS_SCHEME_DOC_EN`、`modelRefsSchemeDoc`） */
  modelRefs: string[];
  /**
   * 仅当 `kind === 'uml-class'` 有意义：为 true 时表示本块**只读观察** `modelRefs` 指向的 codespace（类、继承、关联等从 model 来），
   * **不写入、不同步** codespace；`payload` 中只宜保留各 view 私有的**显示状态**（如 `layout.positions`、折叠、边可见性等）。
   */
  observeCodespaceOnly?: boolean;
  /** 可选视图标题（展示用） */
  title?: string;
  /**
   * 子类型载荷：如各 `mermaid-*` / `uml-diagram` 的图源、`mindmap-ui` 的序列化快照等（由对应 `kind` 的渲染器解释）。
   * 对 **`mermaid-*`**：可与紧随 `` ```mv-view `` 后的标准 `` ```mermaid`` 围栏**镜像同文**（见 `ParsedMermaidMirrorFence`），便于 GitHub 等普通 Markdown 渲染图；工作台保存时会同步两段正文。
   */
  payload?: string | Record<string, unknown>;
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
  | MvModelSqlPayload
  | MvModelKvPayload
  | MvModelStructPayload
  | MvModelCodespacePayload
  | MvModelInterfacePayload
  | MvViewPayload
  | MvMapPayload;

/**
 * 紧随 `` ```mv-view ``（且 `kind` 为 `mermaid-*`）的标准 `` ```mermaid `` 围栏，与 JSON 内 `payload` 同源，供普通 Markdown 预览 Mermaid。
 * 该段为可选扩展：存在时，解析器可在 JSON `payload` 为空时用镜像正文填充。
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
  /** `mv-view` 且 `kind` 为 `mermaid-*` 时可选（紧随的标准 `` ```mermaid`` 段） */
  mermaidMirror?: ParsedMermaidMirrorFence;
}

export interface ParseMdResult {
  blocks: ParsedFenceBlock[];
  errors: Array<{ message: string; line?: number }>;
}

/** ref:./path/to.md#blockId 或 ref:./path/to.md#blockId#tableId（mv-model-sql 子表） */
export interface ResolvedRef {
  ref: string;
  /** Normalized relative path from workspace root */
  fileRel: string;
  blockId: string;
  /** ``mv-model-sql`` 内子表 `id`；单段 ref 时省略 */
  tableId?: string;
}
