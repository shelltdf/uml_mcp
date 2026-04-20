/**
 * `mv-view` 各 kind 的 **界面文案**（画布标题、说明、占位 payload）。
 * 契约与中文基线仍以 `@mvwb/core` 的 `MV_VIEW_KIND_METADATA` 为准；英文为 Web 壳层展示用。
 */
import { MV_VIEW_KIND_METADATA, type MvViewKind } from '@mvwb/core';
import type { AppLocale } from './app-locale';

type ViewKindUi = { canvasTitle: string; description: string; payloadPlaceholder: string };

const MV_VIEW_KIND_MESSAGES_EN: Record<MvViewKind, ViewKindUi> = {
  'mermaid-architecture': {
    canvasTitle: 'Mermaid architecture diagram canvas',
    description: 'Edit Mermaid architecture-beta source (written to payload).',
    payloadPlaceholder:
      'architecture-beta\n    group api(cloud)[API] {\n        service s(server)[Service]\n    }',
  },
  'mermaid-block': {
    canvasTitle: 'Mermaid block diagram canvas',
    description: 'Edit Mermaid block-beta source (written to payload).',
    payloadPlaceholder: 'block-beta\ncolumns 1\n  block:a["Block A"]',
  },
  'mermaid-c4': {
    canvasTitle: 'Mermaid C4 diagram canvas',
    description: 'Edit Mermaid C4Context / C4Container source (written to payload).',
    payloadPlaceholder:
      'C4Context\n    title System Context\n    Person(user, "User")\n    System(sys, "System")\n    Rel(user, sys, "Uses")',
  },
  'mermaid-class': {
    canvasTitle: 'Mermaid class diagram canvas',
    description: 'Edit Mermaid classDiagram source (written to payload).',
    payloadPlaceholder: 'classDiagram\n  class Example',
  },
  'mermaid-er': {
    canvasTitle: 'Mermaid ER diagram canvas',
    description: 'Edit Mermaid erDiagram source (written to payload).',
    payloadPlaceholder: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places',
  },
  'mermaid-flowchart': {
    canvasTitle: 'Mermaid flowchart canvas',
    description: 'Edit Mermaid flowchart / graph source (written to payload).',
    payloadPlaceholder: 'flowchart TD\n    A[Start] --> B{Choice}\n    B -->|Yes| C[OK]\n    B -->|No| D[End]',
  },
  'mermaid-gantt': {
    canvasTitle: 'Mermaid Gantt canvas',
    description: 'Edit Mermaid gantt source (written to payload).',
    payloadPlaceholder: 'gantt\n    title Example\n    dateFormat YYYY-MM-DD\n    section A\n    Task1 :a1, 2024-01-01, 3d',
  },
  'mermaid-gitgraph': {
    canvasTitle: 'Mermaid Git graph canvas',
    description: 'Edit Mermaid gitGraph source (written to payload).',
    payloadPlaceholder: 'gitGraph\n    commit\n    branch develop\n    checkout develop\n    commit',
  },
  'mermaid-journey': {
    canvasTitle: 'Mermaid user journey canvas',
    description: 'Edit Mermaid journey source (written to payload).',
    payloadPlaceholder: 'journey\n    title My day\n    section Morning\n      Make tea: 5: Me',
  },
  'mermaid-kanban': {
    canvasTitle: 'Mermaid Kanban canvas',
    description: 'Edit Mermaid kanban source (written to payload).',
    payloadPlaceholder: 'kanban\n  Todo\n    [Task A]\n    [Task B]\n  Done[]',
  },
  'mermaid-mindmap': {
    canvasTitle: 'Mermaid mindmap canvas',
    description:
      'Edit Mermaid mindmap syntax (written to payload); distinct from app JSON mindmap `mindmap-ui`.',
    payloadPlaceholder: 'mindmap\n  root((Topic))\n    A\n      A1\n    B',
  },
  'mermaid-packet': {
    canvasTitle: 'Mermaid packet diagram canvas',
    description: 'Edit Mermaid packet-beta source (written to payload).',
    payloadPlaceholder: 'packet-beta\n0-15: "Source Port"\n16-31: "Destination Port"',
  },
  'mermaid-pie': {
    canvasTitle: 'Mermaid pie chart canvas',
    description: 'Edit Mermaid pie source (written to payload).',
    payloadPlaceholder: 'pie title Example\n    "A" : 40\n    "B" : 35\n    "C" : 25',
  },
  'mermaid-quadrant': {
    canvasTitle: 'Mermaid quadrant chart canvas',
    description: 'Edit Mermaid quadrantChart source (written to payload).',
    payloadPlaceholder:
      'quadrantChart\n    title Reach vs engagement\n    x-axis Low --> High\n    y-axis Low --> High\n    Campaign: [0.3, 0.6]',
  },
  'mermaid-requirement': {
    canvasTitle: 'Mermaid requirement diagram canvas',
    description: 'Edit Mermaid requirementDiagram source (written to payload).',
    payloadPlaceholder:
      'requirementDiagram\n    requirement req1 {\n    id: 1\n    text: requirement text\n    risk: high\n    verifymethod: test\n    }\n    element e1 {\n    type: simulation\n    }\n    e1 - satisfies -> req1',
  },
  'mermaid-sankey': {
    canvasTitle: 'Mermaid Sankey canvas',
    description: 'Edit Mermaid sankey-beta source (written to payload).',
    payloadPlaceholder: 'sankey-beta\n\nSource,A,100\nA,B,50\nA,C,50',
  },
  'mermaid-sequence': {
    canvasTitle: 'Mermaid sequence diagram canvas',
    description: 'Edit Mermaid sequenceDiagram source (written to payload).',
    payloadPlaceholder: 'sequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi',
  },
  'mermaid-state': {
    canvasTitle: 'Mermaid state diagram canvas',
    description: 'Edit Mermaid stateDiagram-v2 source (written to payload).',
    payloadPlaceholder: 'stateDiagram-v2\n    [*] --> Idle\n    Idle --> [*]',
  },
  'mermaid-timeline': {
    canvasTitle: 'Mermaid timeline canvas',
    description: 'Edit Mermaid timeline source (written to payload).',
    payloadPlaceholder: 'timeline\n    title History\n    2020 : Milestone A\n    2021 : Milestone B',
  },
  'mermaid-xychart': {
    canvasTitle: 'Mermaid XY chart canvas',
    description: 'Edit Mermaid xychart-beta source (written to payload).',
    payloadPlaceholder:
      'xychart-beta\n    title "Example"\n    x-axis [jan, feb, mar]\n    y-axis "y" 0 --> 10\n    bar [2, 5, 8]',
  },
  'mermaid-zenuml': {
    canvasTitle: 'Mermaid ZenUML canvas',
    description: 'Edit Mermaid zenuml source (written to payload).',
    payloadPlaceholder: 'zenuml\n    Alice->Bob: Hello',
  },
  'mindmap-ui': {
    canvasTitle: 'Mindmap canvas',
    description: 'Edit mindmap JSON snapshot (payload); modelRefs bind data tables.',
    payloadPlaceholder: '{ "nodes": [], "edges": [] }',
  },
  'uml-diagram': {
    canvasTitle: 'Generic UML / PlantUML canvas',
    description:
      'Any PlantUML fragment in payload; prefer uml-class / uml-sequence / uml-activity when applicable.',
    payloadPlaceholder: '@startuml\nAlice -> Bob: hello\n@enduml',
  },
  'uml-class': {
    canvasTitle: 'UML class diagram canvas',
    description: 'Class diagram editor; payload is PlantUML class-related source.',
    payloadPlaceholder: '@startuml\nclass Order\nclass Customer\nOrder --> Customer\n@enduml',
  },
  'uml-sequence': {
    canvasTitle: 'UML sequence diagram canvas',
    description: 'Sequence diagram editor; payload is PlantUML sequence source.',
    payloadPlaceholder: '@startuml\nparticipant User\nparticipant API\nUser -> API: request\n@enduml',
  },
  'uml-activity': {
    canvasTitle: 'UML activity diagram canvas',
    description: 'Activity diagram editor; payload is PlantUML activity source.',
    payloadPlaceholder: '@startuml\nstart\n:Step A;\n:Step B;\nstop\n@enduml',
  },
  'ui-design': {
    canvasTitle: 'UI design canvas',
    description:
      'Wireframes, structure, or component tree specs; payload format is defined by the dedicated editor (may be JSON).',
    payloadPlaceholder: '{ "screens": [], "components": [] }',
  },
};

export function mvViewKindStrings(kind: MvViewKind, locale: AppLocale): ViewKindUi {
  return locale === 'en' ? MV_VIEW_KIND_MESSAGES_EN[kind] : MV_VIEW_KIND_METADATA[kind];
}

/** Default `title` inside mv-view JSON: strip trailing “画布” / “ canvas”. */
export function mvViewKindDefaultBlockTitle(kind: MvViewKind, locale: AppLocale): string {
  const t = mvViewKindStrings(kind, locale).canvasTitle;
  return t.replace(/画布$| canvas$/i, '').trim() || t;
}
