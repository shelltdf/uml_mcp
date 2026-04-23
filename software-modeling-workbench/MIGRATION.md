# Migration Guide

## Mermaid split from core

Starting from this change, Mermaid class-diagram APIs are moved out of `@smw/core` into `@smw/mermaid`.

### 1) Install dependency

In consumers (for example `apps/web`), add:

```json
{
  "dependencies": {
    "@smw/mermaid": "file:../../packages/mermaid"
  }
}
```

### 2) Update imports

Replace Mermaid-related imports from `@smw/core`:

```ts
import {
  slug,
  parseViewPayloadClassDiagram,
  buildClassDiagramViewPayload,
  classDiagramHeaderHeight,
  diagramBounds,
} from '@smw/core';
```

with:

```ts
import {
  slug,
  parseViewPayloadClassDiagram,
  buildClassDiagramViewPayload,
  classDiagramHeaderHeight,
  diagramBounds,
} from '@smw/mermaid';
```

### 3) Keep core imports focused

Continue importing core model/types/parser APIs from `@smw/core` only.
Do not import Mermaid class-diagram APIs from core anymore.

### 4) Rebuild

Run:

```bash
npm install
npm run build
npm run test
```

The workspace scripts now include `@smw/mermaid` in build/test/dev flows.
