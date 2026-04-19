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
