# Migration Guide

## Mermaid split from core

Starting from this change, Mermaid class-diagram APIs are moved out of `@mvwb/core` into `@mvwb/mermaid`.

### 1) Install dependency

In consumers (for example `apps/web`), add:

```json
{
  "dependencies": {
    "@mvwb/mermaid": "file:../../packages/mermaid"
  }
}
```

### 2) Update imports

Replace Mermaid-related imports from `@mvwb/core`:

```ts
import {
  slug,
  parseViewPayloadClassDiagram,
  buildClassDiagramViewPayload,
  classDiagramHeaderHeight,
  diagramBounds,
} from '@mvwb/core';
```

with:

```ts
import {
  slug,
  parseViewPayloadClassDiagram,
  buildClassDiagramViewPayload,
  classDiagramHeaderHeight,
  diagramBounds,
} from '@mvwb/mermaid';
```

### 3) Keep core imports focused

Continue importing core model/types/parser APIs from `@mvwb/core` only.
Do not import Mermaid class-diagram APIs from core anymore.

### 4) Rebuild

Run:

```bash
npm install
npm run build
npm run test
```

The workspace scripts now include `@mvwb/mermaid` in build/test/dev flows.
