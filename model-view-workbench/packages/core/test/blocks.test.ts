import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks, replaceBlockInnerById } from '../src/parse/blocks.js';

describe('parseMarkdownBlocks', () => {
  it('parses mv-model', () => {
    const md = `# Hi\n\n\`\`\`mv-model\n{"id":"t1","columns":[{"name":"a","type":"int"}],"rows":[{"a":1}]}\n\`\`\`\n`;
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].kind).toBe('mv-model');
    expect(r.blocks[0].payload.id).toBe('t1');
  });

  it('parses mv-view with refs', () => {
    const md =
      '\`\`\`mv-view\n' +
      JSON.stringify({
        id: 'v1',
        kind: 'mermaid-class',
        modelRefs: ['ref:./m.md#t1'],
        payload: 'classDiagram\n  class A',
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].payload.id).toBe('v1');
  });

  it('replaceBlockInnerById', () => {
    const md = 'x\n\`\`\`mv-model\n{"id":"u","columns":[],"rows":[]}\n\`\`\`\ny';
    const next = JSON.stringify({ id: 'u', columns: [{ name: 'n' }], rows: [{ n: 2 }] }, null, 2);
    const out = replaceBlockInnerById(md, 'u', next);
    expect(out).toBeTruthy();
    const r = parseMarkdownBlocks(out!);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0]?.payload).toMatchObject({ id: 'u', rows: [{ n: 2 }] });
  });
});
