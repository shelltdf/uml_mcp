import { describe, expect, it } from 'vitest';
import { UmlViewPayloadValidator } from '../src/application/services/UmlViewPayloadValidator.js';

describe('UmlViewPayloadValidator', () => {
  const validator = new UmlViewPayloadValidator();

  it('accepts valid uml-class object payload', () => {
    const res = validator.validate('uml-class', {
      schema: 'smw-uml/v1',
      diagramType: 'class',
      classes: [{ id: 'a', name: 'A' }],
    });
    expect(res).toEqual({ ok: true });
  });

  it('rejects invalid diagramType', () => {
    const res = validator.validate('uml-class', {
      schema: 'smw-uml/v1',
      diagramType: 'sequence',
    });
    expect(res.ok).toBe(false);
  });
});
