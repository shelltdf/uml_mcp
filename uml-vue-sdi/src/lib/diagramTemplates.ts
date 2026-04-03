/** 可创建的 Mermaid 图类型：每个新建文件仅包含一个 ```mermaid 块（与「一文件一图」一致）。 */

export type DiagramTypeId =
  | 'flowchart'
  | 'sequenceDiagram'
  | 'classDiagram'
  | 'stateDiagram'
  | 'erDiagram'
  | 'journey'
  | 'gantt'
  | 'pie'
  | 'gitGraph'
  | 'mindmap'
  | 'timeline'
  | 'quadrantChart';

/** 新建面板缩略图：Mermaid 图 + 同步配置 umlSync */
export type DiagramThumbnailId = DiagramTypeId | 'umlSync';

/** 新建对话框顶部：同步配置（非 Mermaid，单独分类） */
export const NEW_SYNC_CARD = {
  id: 'umlSync' as const,
  labelZh: '同步配置（uml.sync.md）',
  labelEn: 'Sync config (uml.sync.md)',
};

export interface DiagramTypeDef {
  id: DiagramTypeId;
  labelZh: string;
  labelEn: string;
  /** 单个 mermaid 代码块正文（不含围栏） */
  mermaidBody: string;
}

function mdTitle(title: string) {
  return `# ${title}\n\n`;
}

export const DIAGRAM_TYPES: DiagramTypeDef[] = [
  {
    id: 'flowchart',
    labelZh: '流程图（flowchart）',
    labelEn: 'Flowchart',
    mermaidBody: `flowchart TD
    A[开始] --> B{判断}
    B -->|是| C[处理]
    B -->|否| D[结束]
    C --> D`,
  },
  {
    id: 'sequenceDiagram',
    labelZh: '时序图（sequence）',
    labelEn: 'Sequence diagram',
    mermaidBody: `sequenceDiagram
    participant A as 客户端
    participant B as 服务
    A->>B: 请求
    B-->>A: 响应`,
  },
  {
    id: 'classDiagram',
    labelZh: '类图（class）',
    labelEn: 'Class diagram',
    mermaidBody: `classDiagram
    class Animal {
      +String name
      +move()
    }
    class Dog {
      +bark()
    }
    Animal <|-- Dog`,
  },
  {
    id: 'stateDiagram',
    labelZh: '状态图（state）',
    labelEn: 'State diagram',
    mermaidBody: `stateDiagram-v2
    [*] --> Idle
    Idle --> Running : 启动
    Running --> Idle : 停止
    Running --> [*] : 结束`,
  },
  {
    id: 'erDiagram',
    labelZh: 'ER 图',
    labelEn: 'ER diagram',
    mermaidBody: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    CUSTOMER {
      string id PK
      string name
    }`,
  },
  {
    id: 'journey',
    labelZh: '用户旅程（journey）',
    labelEn: 'User journey',
    mermaidBody: `journey
    title 示例旅程
    section 浏览
      打开页面: 5: 用户
      阅读文档: 4: 用户
    section 行动
      提交反馈: 3: 用户`,
  },
  {
    id: 'gantt',
    labelZh: '甘特图（gantt）',
    labelEn: 'Gantt',
    mermaidBody: `gantt
    title 示例计划
    dateFormat  YYYY-MM-DD
    section 阶段
    任务A           :a1, 2026-01-01, 7d
    任务B           :after a1, 5d`,
  },
  {
    id: 'pie',
    labelZh: '饼图（pie）',
    labelEn: 'Pie chart',
    mermaidBody: `pie title 占比
    "A" : 40
    "B" : 35
    "C" : 25`,
  },
  {
    id: 'gitGraph',
    labelZh: 'Git 图（gitGraph）',
    labelEn: 'Git graph',
    mermaidBody: `gitGraph
    commit id: "init"
    branch dev
    checkout dev
    commit id: "feat"
    checkout main
    merge dev`,
  },
  {
    id: 'mindmap',
    labelZh: '思维导图（mindmap）',
    labelEn: 'Mindmap',
    mermaidBody: `mindmap
  root((主题))
    分支A
      叶子1
      叶子2
    分支B`,
  },
  {
    id: 'timeline',
    labelZh: '时间线（timeline）',
    labelEn: 'Timeline',
    mermaidBody: `timeline
    title 里程碑
    2026 Q1 : 规划
    2026 Q2 : 开发
    2026 Q3 : 发布`,
  },
  {
    id: 'quadrantChart',
    labelZh: '象限图（quadrant）',
    labelEn: 'Quadrant chart',
    mermaidBody: `quadrantChart
    title 优先级
    x-axis 低影响 --> 高影响
    y-axis 低紧急 --> 高紧急
    quadrant-1 立即处理
    quadrant-2 计划
    quadrant-3 可忽略
    quadrant-4 委派`,
  },
];

export function getDiagramType(id: DiagramTypeId): DiagramTypeDef | undefined {
  return DIAGRAM_TYPES.find((d) => d.id === id);
}

/** 生成新建 *.uml.md 全文（单图） */
export function buildNewUmlMarkdown(diagramId: DiagramTypeId, titleBase: string): string {
  const def = getDiagramType(diagramId);
  if (!def) return mdTitle(titleBase) + '```mermaid\nflowchart TD\n  A-->B\n```\n';
  const title = titleBase || def.labelZh;
  return `${mdTitle(title)}\`\`\`mermaid\n${def.mermaidBody}\n\`\`\`\n`;
}
