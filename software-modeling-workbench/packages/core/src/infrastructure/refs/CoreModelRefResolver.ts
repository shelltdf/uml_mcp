import type { IModelRefResolver } from '../../application/contracts/ViewContracts.js';
import { resolveRefPath } from '../../refs/resolve.js';

export class CoreModelRefResolver implements IModelRefResolver {
  public resolve(baseRelPath: string, modelRef: string): string {
    return resolveRefPath(baseRelPath, modelRef);
  }
}
