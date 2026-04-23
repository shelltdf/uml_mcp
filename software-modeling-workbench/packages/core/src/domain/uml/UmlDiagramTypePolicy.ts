import type { MvViewKind } from '../../types.js';
import { MV_UML_KIND_DIAGRAM_TYPE } from '../../types.js';

export class UmlDiagramTypePolicy {
  public expectedDiagramType(kind: MvViewKind): string | null {
    return MV_UML_KIND_DIAGRAM_TYPE[kind] ?? null;
  }

  public isUmlKind(kind: MvViewKind): boolean {
    return this.expectedDiagramType(kind) !== null;
  }
}
