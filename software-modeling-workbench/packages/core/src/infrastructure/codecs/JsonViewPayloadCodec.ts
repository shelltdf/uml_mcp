import type { IViewPayloadCodec } from '../../application/contracts/ViewContracts.js';

export class JsonViewPayloadCodec implements IViewPayloadCodec {
  public encode(payload: unknown): string {
    return JSON.stringify(payload);
  }

  public decode(payloadText: string): unknown {
    return JSON.parse(payloadText);
  }
}
