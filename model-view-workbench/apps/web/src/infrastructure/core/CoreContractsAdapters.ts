import type { IUmlKindMapper, IViewPayloadCodec } from '@mvwb/core';
import { MV_UML_KIND_DIAGRAM_TYPE, type MvViewKind } from '@mvwb/core';

export class WebJsonViewPayloadCodec implements IViewPayloadCodec {
  public encode(payload: unknown): string {
    return JSON.stringify(payload, null, 2);
  }

  public decode(payloadText: string): unknown {
    return JSON.parse(payloadText);
  }
}

export class WebUmlKindMapper implements IUmlKindMapper {
  public expectedDiagramType(kind: MvViewKind): string | null {
    return MV_UML_KIND_DIAGRAM_TYPE[kind] ?? null;
  }
}
