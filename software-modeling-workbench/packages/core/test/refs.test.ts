import { describe, expect, it } from 'vitest';
import { detectRefCycle, parseRefUri, resolveRefPath } from '../src/refs/resolve.js';

describe('parseRefUri', () => {
  it('parses ref:', () => {
    expect(parseRefUri('ref:./docs/a.md#myblock')).toEqual({
      ref: 'ref:./docs/a.md#myblock',
      fileRel: 'docs/a.md',
      blockId: 'myblock',
    });
  });

  it('parses ref with smw-model-sql table id', () => {
    expect(parseRefUri('ref:./docs/a.md#sql1#person')).toEqual({
      ref: 'ref:./docs/a.md#sql1#person',
      fileRel: 'docs/a.md',
      blockId: 'sql1',
      tableId: 'person',
    });
  });
});

describe('resolveRefPath', () => {
  it('resolves relative to file dir', () => {
    expect(resolveRefPath('src/views/v.md', '../models/m.md')).toBe('src/models/m.md');
  });
});

describe('detectRefCycle', () => {
  it('detects cycle', () => {
    const m = new Map<string, Set<string>>();
    m.set('a', new Set(['b']));
    m.set('b', new Set(['c']));
    m.set('c', new Set(['a']));
    expect(detectRefCycle(m).cyclic).toBe(true);
  });

  it('no cycle', () => {
    const m = new Map<string, Set<string>>();
    m.set('a', new Set(['b']));
    m.set('b', new Set());
    expect(detectRefCycle(m).cyclic).toBe(false);
  });
});
