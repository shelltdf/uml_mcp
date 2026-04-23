import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks, replaceBlockInnerById, findMvModelSqlTable } from '../src/parse/blocks.js';
import {
  MV_MERMAID_UML_INSERT_KINDS,
  MV_UML_VIEW_KINDS,
  getMermaidNonUmlViewKinds,
  getMermaidViewKinds,
  isUmlViewKind,
} from '../src/types.js';

const minimalSqlPayload = {
  id: 'sql1',
  tables: [
    {
      id: 't1',
      columns: [{ name: 'a', type: 'int' }],
      rows: [{ a: 1 }],
    },
  ],
};

describe('parseMarkdownBlocks', () => {
  it('parses smw-model-sql', () => {
    const md = `# Hi\n\n\`\`\`smw-model-sql\n${JSON.stringify(minimalSqlPayload)}\n\`\`\`\n`;
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].kind).toBe('smw-model-sql');
    expect(r.blocks[0].payload.id).toBe('sql1');
    expect((r.blocks[0].payload as { tables: unknown[] }).tables).toHaveLength(1);
  });

  it('findMvModelSqlTable resolves block#table', () => {
    const md = `\`\`\`smw-model-sql\n${JSON.stringify({
      id: 'doc',
      tables: [
        { id: 'a', columns: [{ name: 'x' }], rows: [{ x: 1 }] },
        { id: 'b', columns: [{ name: 'y' }], rows: [{ y: 2 }] },
      ],
    })}\n\`\`\`\n`;
    const r = parseMarkdownBlocks(md);
    expect(findMvModelSqlTable(r.blocks, 'doc', 'b')?.rows).toEqual([{ y: 2 }]);
    expect(findMvModelSqlTable(r.blocks, 'doc')).toBeNull();
    expect(findMvModelSqlTable(r.blocks, 'doc', 'a')?.id).toBe('a');
  });

  it('parses smw-view mermaid-flowchart kind', () => {
    const mer = 'flowchart TD\n  A --> B';
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'mf1',
        kind: 'mermaid-flowchart',
        modelRefs: [],
        payload: mer,
      }) +
      '\n\`\`\`\n\n\`\`\`mermaid\n' +
      mer +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect((r.blocks[0].payload as { kind: string }).kind).toBe('mermaid-flowchart');
    expect(r.blocks[0].mermaidMirror).toBeDefined();
  });

  it('parses smw-view with refs', () => {
    const mer = 'classDiagram\n  class A';
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'v1',
        kind: 'mermaid-class',
        modelRefs: ['ref:./m.md#t1#tbl'],
        payload: mer,
      }) +
      '\n\`\`\`\n\n\`\`\`mermaid\n' +
      mer +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].payload.id).toBe('v1');
    expect(r.blocks[0].mermaidMirror).toBeDefined();
  });

  it('parses smw-view mindmap-ui and uml-diagram kinds', () => {
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'm1',
        kind: 'mindmap-ui',
        title: '需求脑图',
        modelRefs: ['person'],
        payload: '{"nodes":[]}',
      }) +
      '\n\`\`\`\n' +
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'u1',
        kind: 'uml-diagram',
        modelRefs: [],
        payload: JSON.stringify({
          schema: 'smw-uml/v1',
          diagramType: 'generic',
          elements: [{ id: 'A', kind: 'actor', name: 'A' }, { id: 'B', kind: 'component', name: 'B' }],
          relations: [{ from: 'A', to: 'B', type: 'uses' }],
        }),
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(2);
    expect((r.blocks[0].payload as { kind: string }).kind).toBe('mindmap-ui');
    expect((r.blocks[1].payload as { kind: string }).kind).toBe('uml-diagram');
  });

  it('parses smw-view mindmap-ui with object payload', () => {
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'mm_obj_1',
        kind: 'mindmap-ui',
        title: 'mindmap object payload',
        modelRefs: [],
        payload: {
          format: 'mv-mindmap-v0',
          nodes: [
            { id: 'root', label: 'Root' },
            { id: 'n1', label: 'Topic 1', parentId: 'root' },
          ],
        },
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    const p = r.blocks[0].payload as { kind: string; payload: unknown };
    expect(p.kind).toBe('mindmap-ui');
    expect(typeof p.payload).toBe('object');
    expect((p.payload as { nodes?: unknown[] }).nodes?.length).toBe(2);
  });

  it('parses smw-view ui-design and uml-class kinds', () => {
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({ id: 'ui1', kind: 'ui-design', modelRefs: [], payload: { screens: [] } }) +
      '\n\`\`\`\n' +
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'uc1',
        kind: 'uml-class',
        modelRefs: [],
        payload: {
          schema: 'smw-uml/v1',
          diagramType: 'class',
          classes: [{ id: 'A', name: 'A' }],
          relations: [],
        },
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks.length).toBe(2);
    expect((r.blocks[0].payload as { kind: string }).kind).toBe('ui-design');
    expect((r.blocks[1].payload as { kind: string }).kind).toBe('uml-class');
  });

  it('rejects smw-view uml-class payload that is not smw-uml/v1 class json', () => {
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'uc_bad',
        kind: 'uml-class',
        modelRefs: [],
        payload: '@startuml\nclass A\n@enduml',
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('uml-class payload must be valid JSON'))).toBe(true);
  });

  it('parses smw-view uml-sequence with smw-uml/v1 payload', () => {
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'us1',
        kind: 'uml-sequence',
        modelRefs: [],
        payload: JSON.stringify({
          schema: 'smw-uml/v1',
          diagramType: 'sequence',
          participants: [{ id: 'u', name: 'User' }, { id: 'a', name: 'API' }],
          messages: [{ from: 'u', to: 'a', name: 'request' }],
        }),
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect((r.blocks[0].payload as { kind: string }).kind).toBe('uml-sequence');
  });

  it('rejects smw-view uml-component when diagramType mismatches kind', () => {
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'ucp_bad',
        kind: 'uml-component',
        modelRefs: [],
        payload: JSON.stringify({
          schema: 'smw-uml/v1',
          diagramType: 'deployment',
        }),
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('uml-component payload.diagramType'))).toBe(true);
  });

  it('rejects smw-view with unknown kind', () => {
    const md =
      '\`\`\`smw-view\n' + JSON.stringify({ id: 'x', kind: 'unknown-kind', modelRefs: [] }) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('unknown kind'))).toBe(true);
  });

  it('parses multiple smw-model-sql blocks in one file', () => {
    const md =
      '\`\`\`smw-model-sql\n' +
      '{"id":"a","tables":[{"id":"x","columns":[{"name":"x"}],"rows":[{"x":1}]}]}\n' +
      '\`\`\`\n\n' +
      '\`\`\`smw-model-sql\n' +
      '{"id":"b","title":"Second","tables":[{"id":"t","columns":[{"name":"y"}],"rows":[{"y":2}]}]}\n' +
      '\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(2);
    expect(r.blocks[0].payload.id).toBe('a');
    expect((r.blocks[1].payload as { title?: string }).title).toBe('Second');
  });

  it('rejects smw-model-sql row with unknown column key', () => {
    const md =
      '\`\`\`smw-model-sql\n' +
      JSON.stringify({
        id: 't',
        tables: [{ id: 'tb', columns: [{ name: 'a' }], rows: [{ a: 1, bad: 2 }] }],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('unknown property'))).toBe(true);
  });

  it('rejects smw-model-sql row missing required column', () => {
    const md =
      '\`\`\`smw-model-sql\n' +
      JSON.stringify({
        id: 't',
        tables: [
          {
            id: 'tb',
            columns: [
              { name: 'a', nullable: true },
              { name: 'b' },
            ],
            rows: [{ a: 1 }],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('missing required'))).toBe(true);
  });

  it('parses smw-model-sql with extended column metadata', () => {
    const payload = {
      id: 'grp',
      tables: [
        {
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
        },
      ],
    };
    const md = '\`\`\`smw-model-sql\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].kind).toBe('smw-model-sql');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects smw-model-sql column with invalid primaryKey type', () => {
    const md =
      '\`\`\`smw-model-sql\n' +
      JSON.stringify({
        id: 't',
        tables: [{ id: 'tb', columns: [{ name: 'a', primaryKey: 'yes' }], rows: [{ a: 1 }] }],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('primaryKey'))).toBe(true);
  });

  it('rejects smw-model-sql duplicate primary key tuple in rows', () => {
    const md =
      '\`\`\`smw-model-sql\n' +
      JSON.stringify({
        id: 'x',
        tables: [
          {
            id: 'tb',
            columns: [
              { name: 'id', type: 'string', primaryKey: true, nullable: false },
              { name: 'name', type: 'string', nullable: true },
            ],
            rows: [
              { id: '1', name: 'a' },
              { id: '1', name: 'b' },
            ],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('duplicate primary key'))).toBe(true);
  });

  it('rejects smw-model-sql duplicate table id', () => {
    const md =
      '\`\`\`smw-model-sql\n' +
      JSON.stringify({
        id: 'x',
        tables: [
          { id: 'same', columns: [{ name: 'a' }], rows: [] },
          { id: 'same', columns: [{ name: 'b' }], rows: [] },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('duplicate table id'))).toBe(true);
  });

  it('parses smw-model-kv', () => {
    const payload = { id: 'c1', title: 'col', documents: [{ a: 1 }, { b: 'x' }] };
    const md = '\`\`\`smw-model-kv\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('smw-model-kv');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects smw-model-kv document that is array', () => {
    const md =
      '\`\`\`smw-model-kv\n' + JSON.stringify({ id: 'x', documents: [[1, 2]] }) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('documents[0]'))).toBe(true);
  });

  it('parses smw-model-struct', () => {
    const payload = {
      id: 'h1',
      root: {
        name: '/',
        groups: [{ name: 'g1', datasets: [{ name: 'd1', dtype: 'float', data: [1] }] }],
      },
    };
    const md = '\`\`\`smw-model-struct\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('smw-model-struct');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('parses smw-model-codespace', () => {
    const payload = {
      id: 'cs1',
      title: 'mono',
      workspaceRoot: '.',
      modules: [{ id: 'a', name: 'pkg_a', path: 'packages/a', role: 'lib' }],
    };
    const md = '\`\`\`smw-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('smw-model-codespace');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects smw-model-codespace duplicate module id', () => {
    const md =
      '\`\`\`smw-model-codespace\n' +
      JSON.stringify({
        id: 'x',
        modules: [
          { id: 'm', name: 'A' },
          { id: 'm', name: 'B' },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('duplicate id'))).toBe(true);
  });

  it('parses smw-model-codespace with namespaces classifiers and associations', () => {
    const payload = {
      id: 'cs-uml',
      title: 'with-ns',
      modules: [
        {
          id: 'mod-core',
          name: 'core',
          namespaces: [
            {
              id: 'ns-root',
              name: 'root',
              classes: [
                {
                  id: 'cls-base',
                  name: 'Base',
                  kind: 'class',
                  abstract: true,
                  members: [{ name: 'x', type: 'int' }],
                },
                {
                  id: 'cls-derived',
                  name: 'Derived',
                  bases: [{ targetId: 'cls-base', relation: 'generalization' }],
                },
              ],
              associations: [
                {
                  id: 'assoc-1',
                  kind: 'association',
                  fromClassifierId: 'cls-derived',
                  toClassifierId: 'cls-base',
                  fromEnd: { role: 'd', multiplicity: '1', navigable: true },
                },
              ],
              macros: [{ id: 'mac-max', name: 'MAX', params: 'a,b', definitionSnippet: '((a)>(b)?(a):(b))' }],
              variables: [{ id: 'var-pi', name: 'pi', type: 'double' }],
              functions: [{ id: 'fn-main', name: 'main', signature: 'int main()' }],
            },
          ],
        },
      ],
    };
    const md = '\`\`\`smw-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('smw-model-codespace');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('parses smw-model-codespace members with methodKind/accessor/operatorSymbol', () => {
    const payload = {
      id: 'cs-member-kinds',
      modules: [
        {
          id: 'mod_a',
          name: 'ModA',
          namespaces: [
            {
              id: 'ns_a',
              name: 'NsA',
              classes: [
                {
                  id: 'cls_a',
                  name: 'ClassA',
                  members: [{ name: 'state', visibility: 'private', accessor: 'getset', type: 'int' }],
                  methods: [
                    { name: 'ctor', methodKind: 'constructor', signature: 'ClassA()' },
                    {
                      name: 'index',
                      methodKind: 'operator',
                      operatorSymbol: '[]',
                      signature: 'operator[](int i)',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const md = '\`\`\`smw-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('parses smw-model-codespace class properties[]', () => {
    const payload = {
      id: 'cs-properties',
      modules: [
        {
          id: 'mod_a',
          name: 'ModA',
          namespaces: [
            {
              id: 'ns_a',
              name: 'NsA',
              classes: [
                {
                  id: 'cls_a',
                  name: 'ClassA',
                  properties: [
                    {
                      name: 'balance',
                      backingFieldName: '_balance',
                      backingVisibility: 'private',
                      type: 'number',
                      hasGetter: true,
                      hasSetter: false,
                      getterVisibility: 'public',
                      setterVisibility: 'public',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const md = '\`\`\`smw-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects smw-model-codespace property with invalid getterVisibility', () => {
    const md =
      '\`\`\`smw-model-codespace\n' +
      JSON.stringify({
        id: 'x',
        modules: [
          {
            id: 'm1',
            name: 'ModuleA',
            namespaces: [
              {
                id: 'n1',
                name: 'NsA',
                classes: [
                  {
                    id: 'c1',
                    name: 'C1',
                    properties: [{ name: 'p', getterVisibility: 'external' }],
                  },
                ],
              },
            ],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('getterVisibility must be one of'))).toBe(true);
  });

  it('smw-view removal does not affect smw-model-codespace parsing', () => {
    const modelBlock =
      '```smw-model-codespace\n' +
      JSON.stringify({
        id: 'cs_only_truth',
        modules: [{ id: 'm1', name: 'ModuleA', namespaces: [{ id: 'n1', name: 'NsA', classes: [{ id: 'c1', name: 'User' }] }] }],
      }) +
      '\n```\n';
    const mer = 'classDiagram\n  class User';
    const viewBlock =
      '```smw-view\n' +
      JSON.stringify({
        id: 'v1',
        kind: 'mermaid-class',
        modelRefs: ['cs_only_truth'],
        payload: mer,
      }) +
      '\n```\n\n```mermaid\n' +
      mer +
      '\n```\n';
    const mdWithView = `${modelBlock}\n${viewBlock}`;
    const withView = parseMarkdownBlocks(mdWithView);
    expect(withView.errors).toEqual([]);
    expect(withView.blocks.some((b) => b.kind === 'smw-model-codespace' && b.payload.id === 'cs_only_truth')).toBe(true);

    const mdWithoutView = modelBlock;
    const withoutView = parseMarkdownBlocks(mdWithoutView);
    expect(withoutView.errors).toEqual([]);
    const model = withoutView.blocks.find((b) => b.kind === 'smw-model-codespace');
    expect(model?.payload.id).toBe('cs_only_truth');
  });

  it('rejects smw-model-codespace module/namespace names with non-english characters', () => {
    const md =
      '\`\`\`smw-model-codespace\n' +
      JSON.stringify({
        id: 'x',
        modules: [
          {
            id: 'm1',
            name: '模块A',
            namespaces: [{ id: 'n1', name: '命名空间' }],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('must use English letters'))).toBe(true);
  });

  it('accepts smw-model-codespace root namespace empty string', () => {
    const md =
      '```smw-model-codespace\n' +
      JSON.stringify({
        id: 'cs_root_dot',
        modules: [
          {
            id: 'm1',
            name: 'Core',
            namespaces: [{ id: 'n_root', name: '', namespaces: [{ id: 'n_core', name: 'Core' }] }],
          },
        ],
      }) +
      '\n```\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toHaveLength(0);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]?.kind).toBe('smw-model-codespace');
  });

  it('rejects smw-model-codespace methods accessor not allowed', () => {
    const md =
      '\`\`\`smw-model-codespace\n' +
      JSON.stringify({
        id: 'x',
        modules: [
          {
            id: 'm1',
            name: 'ModuleA',
            namespaces: [
              {
                id: 'n1',
                name: 'NsA',
                classes: [{ id: 'c1', name: 'C1', methods: [{ name: 'f', accessor: 'get' }] }],
              },
            ],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('accessor') && e.message.includes('not allowed'))).toBe(true);
  });

  it('rejects smw-model-codespace duplicate id between module and namespace', () => {
    const md =
      '\`\`\`smw-model-codespace\n' +
      JSON.stringify({
        id: 'x',
        modules: [
          {
            id: 'dup',
            name: 'M',
            namespaces: [{ id: 'dup', name: 'N' }],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('duplicate id'))).toBe(true);
  });

  it('rejects smw-model-codespace bases targetId not a classifier', () => {
    const md =
      '\`\`\`smw-model-codespace\n' +
      JSON.stringify({
        id: 'x',
        modules: [
          {
            id: 'm',
            name: 'M',
            namespaces: [
              {
                id: 'ns',
                name: 'ns',
                classes: [
                  { id: 'c1', name: 'C1', bases: [{ targetId: 'missing', relation: 'generalization' }] },
                ],
              },
            ],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('targetId') && e.message.includes('missing'))).toBe(
      true,
    );
  });

  it('rejects smw-model-codespace association endpoint not a classifier', () => {
    const md =
      '\`\`\`smw-model-codespace\n' +
      JSON.stringify({
        id: 'x',
        modules: [
          {
            id: 'm',
            name: 'M',
            namespaces: [
              {
                id: 'ns',
                name: 'ns',
                classes: [{ id: 'c1', name: 'C1' }],
                associations: [
                  {
                    id: 'a1',
                    kind: 'dependency',
                    fromClassifierId: 'c1',
                    toClassifierId: 'ghost',
                  },
                ],
              },
            ],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('toClassifierId') && e.message.includes('ghost'))).toBe(
      true,
    );
  });

  it('parses smw-model-codespace member and property associatedClassifierId', () => {
    const payload = {
      id: 'cs-assoccls',
      modules: [
        {
          id: 'mod',
          name: 'Mod',
          namespaces: [
            {
              id: 'ns',
              name: 'Ns',
              classes: [
                {
                  id: 'cls-a',
                  name: 'A',
                  members: [{ name: 'ref', associatedClassifierId: 'cls-b' }],
                  properties: [{ name: 'Prop', associatedClassifierId: 'cls-b' }],
                },
                { id: 'cls-b', name: 'B' },
              ],
            },
          ],
        },
      ],
    };
    const md = '\`\`\`smw-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects smw-model-codespace associatedClassifierId when not a classifier id', () => {
    const md =
      '\`\`\`smw-model-codespace\n' +
      JSON.stringify({
        id: 'x',
        modules: [
          {
            id: 'm',
            name: 'M',
            namespaces: [
              {
                id: 'ns',
                name: 'Ns',
                classes: [
                  {
                    id: 'c1',
                    name: 'C1',
                    members: [{ name: 'f', associatedClassifierId: 'nosuch' }],
                  },
                ],
              },
            ],
          },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('associatedClassifierId') && e.message.includes('nosuch'))).toBe(
      true,
    );
  });

  it('parses smw-model-interface', () => {
    const payload = {
      id: 'api1',
      title: '用户 API',
      endpoints: [{ id: 'list', name: '列表', method: 'GET', path: '/users' }],
    };
    const md = '\`\`\`smw-model-interface\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('smw-model-interface');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects smw-model-interface duplicate endpoint id', () => {
    const md =
      '\`\`\`smw-model-interface\n' +
      JSON.stringify({
        id: 'x',
        endpoints: [
          { id: 'a', name: '1' },
          { id: 'a', name: '2' },
        ],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('duplicate endpoint id'))).toBe(true);
  });

  it('parses smw-view mermaid-* without trailing mermaid mirror', () => {
    const md =
      '\`\`\`smw-view\n' +
      JSON.stringify({
        id: 'bad',
        kind: 'mermaid-flowchart',
        modelRefs: [],
        payload: 'flowchart TD\n  A --> B',
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect((r.blocks[0].payload as { kind?: string }).kind).toBe('mermaid-flowchart');
    expect(r.blocks[0].mermaidMirror).toBeUndefined();
  });

  it('parses smw-view mermaid-flowchart with trailing mermaid mirror and fills empty payload', () => {
    const mer = 'flowchart TD\n  A --> B';
    const md =
      '\`\`\`smw-view\n' +
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

  it('prefers smw-view JSON payload over trailing mermaid when both non-empty', () => {
    const md =
      '\`\`\`smw-view\n' +
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

  it('replaceBlockInnerById syncs trailing mermaid mirror for mermaid-* smw-view', () => {
    const mer0 = 'flowchart TD\n  X';
    const md =
      'pre\n\`\`\`smw-view\n' +
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

  it('replaceBlockInnerById for smw-model-sql', () => {
    const inner0 = {
      id: 'u',
      tables: [{ id: 'main', columns: [{ name: 'n' }], rows: [] }],
    };
    const md = 'x\n\`\`\`smw-model-sql\n' + JSON.stringify(inner0) + '\n\`\`\`\ny';
    const next = JSON.stringify(
      {
        id: 'u',
        tables: [{ id: 'main', columns: [{ name: 'n' }], rows: [{ n: 2 }] }],
      },
      null,
      2,
    );
    const out = replaceBlockInnerById(md, 'u', next);
    expect(out).toBeTruthy();
    const r = parseMarkdownBlocks(out!);
    expect(r.errors).toEqual([]);
    expect((r.blocks[0].payload as { tables: { rows: unknown[] }[] }).tables[0].rows).toEqual([{ n: 2 }]);
  });
});

describe('Mermaid insert UI kind partition', () => {
  it('Mermaid UML + Mermaid 其他 无重复且并集为全部 mermaid-*', () => {
    const all = [...getMermaidViewKinds()].sort();
    const uml = [...MV_MERMAID_UML_INSERT_KINDS];
    const other = [...getMermaidNonUmlViewKinds()];
    expect(new Set([...uml, ...other]).size).toBe(uml.length + other.length);
    expect([...uml, ...other].sort()).toEqual(all);
  });
});
