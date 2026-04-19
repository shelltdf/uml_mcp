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

  it('parses mv-view mermaid-flowchart kind', () => {
    const md =
      '\`\`\`mv-view\n' +
      JSON.stringify({
        id: 'mf1',
        kind: 'mermaid-flowchart',
        modelRefs: [],
        payload: 'flowchart TD\n  A --> B',
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect((r.blocks[0].payload as { kind: string }).kind).toBe('mermaid-flowchart');
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

  it('parses mv-view mindmap-ui and uml-diagram kinds', () => {
    const md =
      '\`\`\`mv-view\n' +
      JSON.stringify({
        id: 'm1',
        kind: 'mindmap-ui',
        title: '需求脑图',
        modelRefs: ['person'],
        payload: '{"nodes":[]}',
      }) +
      '\n\`\`\`\n' +
      '\`\`\`mv-view\n' +
      JSON.stringify({
        id: 'u1',
        kind: 'uml-diagram',
        modelRefs: [],
        payload: '@startuml\nA --> B\n@enduml',
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(2);
    expect((r.blocks[0].payload as { kind: string }).kind).toBe('mindmap-ui');
    expect((r.blocks[1].payload as { kind: string }).kind).toBe('uml-diagram');
  });

  it('parses mv-view ui-design and uml-class kinds', () => {
    const md =
      '\`\`\`mv-view\n' +
      JSON.stringify({ id: 'ui1', kind: 'ui-design', modelRefs: [], payload: '{}' }) +
      '\n\`\`\`\n' +
      '\`\`\`mv-view\n' +
      JSON.stringify({ id: 'uc1', kind: 'uml-class', modelRefs: [], payload: '@startuml\n@enduml' }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks.length).toBe(2);
    expect((r.blocks[0].payload as { kind: string }).kind).toBe('ui-design');
    expect((r.blocks[1].payload as { kind: string }).kind).toBe('uml-class');
  });

  it('rejects mv-view with unknown kind', () => {
    const md =
      '\`\`\`mv-view\n' + JSON.stringify({ id: 'x', kind: 'unknown-kind', modelRefs: [] }) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('unknown kind'))).toBe(true);
  });

  it('parses multiple mv-model tables in one file', () => {
    const md =
      '\`\`\`mv-model\n' +
      '{"id":"a","columns":[{"name":"x"}],"rows":[{"x":1}]}\n' +
      '\`\`\`\n\n' +
      '\`\`\`mv-model\n' +
      '{"id":"b","title":"Second","columns":[{"name":"y"}],"rows":[{"y":2}]}\n' +
      '\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(2);
    expect(r.blocks[0].payload.id).toBe('a');
    expect((r.blocks[1].payload as { title?: string }).title).toBe('Second');
  });

  it('rejects mv-model row with unknown column key', () => {
    const md =
      '\`\`\`mv-model\n' + JSON.stringify({ id: 't', columns: [{ name: 'a' }], rows: [{ a: 1, bad: 2 }] }) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('unknown property'))).toBe(true);
  });

  it('rejects mv-model row missing required column', () => {
    const md =
      '\`\`\`mv-model\n' +
      JSON.stringify({
        id: 't',
        columns: [
          { name: 'a', nullable: true },
          { name: 'b' },
        ],
        rows: [{ a: 1 }],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('missing required'))).toBe(true);
  });

  it('parses mv-model with extended column metadata', () => {
    const payload = {
      id: 'tbl',
      columns: [
        {
          name: 'id',
          type: 'int',
          primaryKey: true,
          defaultValue: 0,
          comment: ' surrogate ',
        },
        { name: 'code', type: 'string', unique: true, nullable: true, defaultValue: null },
      ],
      rows: [{ id: 1, code: 'a' }],
    };
    const md = '\`\`\`mv-model\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].kind).toBe('mv-model');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects mv-model column with invalid primaryKey type', () => {
    const md =
      '\`\`\`mv-model\n' +
      JSON.stringify({
        id: 't',
        columns: [{ name: 'a', primaryKey: 'yes' }],
        rows: [{ a: 1 }],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('primaryKey'))).toBe(true);
  });

  it('parses mv-model-kv', () => {
    const payload = { id: 'c1', title: 'col', documents: [{ a: 1 }, { b: 'x' }] };
    const md = '\`\`\`mv-model-kv\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('mv-model-kv');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects mv-model-kv document that is array', () => {
    const md =
      '\`\`\`mv-model-kv\n' + JSON.stringify({ id: 'x', documents: [[1, 2]] }) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('documents[0]'))).toBe(true);
  });

  it('parses mv-model-struct', () => {
    const payload = {
      id: 'h1',
      root: {
        name: '/',
        groups: [{ name: 'g1', datasets: [{ name: 'd1', dtype: 'float', data: [1] }] }],
      },
    };
    const md = '\`\`\`mv-model-struct\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('mv-model-struct');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('parses mv-view mermaid-flowchart with trailing mermaid mirror and fills empty payload', () => {
    const mer = 'flowchart TD\n  A --> B';
    const md =
      '\`\`\`mv-view\n' +
      JSON.stringify({ id: 'mf2', kind: 'mermaid-flowchart', modelRefs: [], payload: '' }) +
      '\n\`\`\`\n\n\`\`\`mermaid\n' +
      mer +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect((r.blocks[0].payload as { payload?: string }).payload).toBe(mer);
    expect(r.blocks[0].mermaidMirror).toMatchObject({
      innerStartOffset: expect.any(Number),
      innerEndOffset: expect.any(Number),
    });
    expect(r.blocks[0].endOffset).toBeGreaterThan(r.blocks[0].innerEndOffset);
  });

  it('prefers mv-view JSON payload over trailing mermaid when both non-empty', () => {
    const md =
      '\`\`\`mv-view\n' +
      JSON.stringify({
        id: 'mf3',
        kind: 'mermaid-flowchart',
        modelRefs: [],
        payload: 'from-json',
      }) +
      '\n\`\`\`\n\n\`\`\`mermaid\nfrom-mer\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(1);
    expect((r.blocks[0].payload as { payload?: string }).payload).toBe('from-json');
    expect(r.blocks[0].mermaidMirror).toBeDefined();
  });

  it('replaceBlockInnerById syncs trailing mermaid mirror for mermaid-* mv-view', () => {
    const mer0 = 'flowchart TD\n  X';
    const md =
      'pre\n\`\`\`mv-view\n' +
      JSON.stringify({
        id: 'sync1',
        kind: 'mermaid-flowchart',
        modelRefs: [],
        payload: mer0,
      }) +
      '\n\`\`\`\n\n\`\`\`mermaid\n' +
      mer0 +
      '\n\`\`\`\npost';
    const mer1 = 'flowchart TD\n  Y';
    const next = JSON.stringify(
      { id: 'sync1', kind: 'mermaid-flowchart', modelRefs: [], payload: mer1 },
      null,
      2,
    );
    const out = replaceBlockInnerById(md, 'sync1', next);
    expect(out).toBeTruthy();
    expect(out).toContain(mer1);
    expect(out!.indexOf(mer0)).toBe(-1);
    const r = parseMarkdownBlocks(out!);
    expect(r.errors).toEqual([]);
    expect((r.blocks[0].payload as { payload?: string }).payload).toBe(mer1);
  });

  it('replaceBlockInnerById', () => {
    const md = 'x\n\`\`\`mv-model\n{"id":"u","columns":[{"name":"n"}],"rows":[]}\n\`\`\`\ny';
    const next = JSON.stringify({ id: 'u', columns: [{ name: 'n' }], rows: [{ n: 2 }] }, null, 2);
    const out = replaceBlockInnerById(md, 'u', next);
    expect(out).toBeTruthy();
    const r = parseMarkdownBlocks(out!);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0]?.payload).toMatchObject({ id: 'u', rows: [{ n: 2 }] });
  });
});
