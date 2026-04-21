import type { MvViewKind } from '../../types.js';

export interface IViewPayloadCodec {
  encode(payload: unknown): string;
  decode(payloadText: string): unknown;
}

export interface IUmlKindMapper {
  expectedDiagramType(kind: MvViewKind): string | null;
}

export interface IModelRefResolver {
  resolve(baseRelPath: string, modelRef: string): string;
}
