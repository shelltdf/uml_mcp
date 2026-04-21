import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks, replaceBlockInnerById, findMvModelSqlTable } from '../src/parse/blocks.js';
import {
  MV_MERMAID_UML_INSERT_KINDS,
  getMermaidNonUmlViewKinds,
  getMermaidViewKinds,
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
  it('parses mv-model-sql', () => {
    const md = `# Hi\n\n\`\`\`mv-model-sql\n${JSON.stringify(minimalSqlPayload)}\n\`\`\`\n`;
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].kind).toBe('mv-model-sql');
    expect(r.blocks[0].payload.id).toBe('sql1');
    expect((r.blocks[0].payload as { tables: unknown[] }).tables).toHaveLength(1);
  });

  it('findMvModelSqlTable resolves block#table', () => {
    const md = `\`\`\`mv-model-sql\n${JSON.stringify({
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

  it('parses mv-view mermaid-flowchart kind', () => {
    const mer = 'flowchart TD\n  A --> B';
    const md =
      '\`\`\`mv-view\n' +
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

  it('parses mv-view with refs', () => {
    const mer = 'classDiagram\n  class A';
    const md =
      '\`\`\`mv-view\n' +
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

  it('parses multiple mv-model-sql blocks in one file', () => {
    const md =
      '\`\`\`mv-model-sql\n' +
      '{"id":"a","tables":[{"id":"x","columns":[{"name":"x"}],"rows":[{"x":1}]}]}\n' +
      '\`\`\`\n\n' +
      '\`\`\`mv-model-sql\n' +
      '{"id":"b","title":"Second","tables":[{"id":"t","columns":[{"name":"y"}],"rows":[{"y":2}]}]}\n' +
      '\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(2);
    expect(r.blocks[0].payload.id).toBe('a');
    expect((r.blocks[1].payload as { title?: string }).title).toBe('Second');
  });

  it('rejects mv-model-sql row with unknown column key', () => {
    const md =
      '\`\`\`mv-model-sql\n' +
      JSON.stringify({
        id: 't',
        tables: [{ id: 'tb', columns: [{ name: 'a' }], rows: [{ a: 1, bad: 2 }] }],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('unknown property'))).toBe(true);
  });

  it('rejects mv-model-sql row missing required column', () => {
    const md =
      '\`\`\`mv-model-sql\n' +
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

  it('parses mv-model-sql with extended column metadata', () => {
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
    const md = '\`\`\`mv-model-sql\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].kind).toBe('mv-model-sql');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects mv-model-sql column with invalid primaryKey type', () => {
    const md =
      '\`\`\`mv-model-sql\n' +
      JSON.stringify({
        id: 't',
        tables: [{ id: 'tb', columns: [{ name: 'a', primaryKey: 'yes' }], rows: [{ a: 1 }] }],
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('primaryKey'))).toBe(true);
  });

  it('rejects mv-model-sql duplicate primary key tuple in rows', () => {
    const md =
      '\`\`\`mv-model-sql\n' +
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

  it('rejects mv-model-sql duplicate table id', () => {
    const md =
      '\`\`\`mv-model-sql\n' +
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

  it('parses mv-model-codespace', () => {
    const payload = {
      id: 'cs1',
      title: 'mono',
      workspaceRoot: '.',
      modules: [{ id: 'a', name: 'pkg_a', path: 'packages/a', role: 'lib' }],
    };
    const md = '\`\`\`mv-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('mv-model-codespace');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects mv-model-codespace duplicate module id', () => {
    const md =
      '\`\`\`mv-model-codespace\n' +
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

  it('parses mv-model-codespace with namespaces classifiers and associations', () => {
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
                  member: [{ name: 'x', type: 'int' }],
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
    const md = '\`\`\`mv-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('mv-model-codespace');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('parses mv-model-codespace members with methodKind/accessor/operatorSymbol', () => {
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
                  member: [{ name: 'state', visibility: 'private', accessor: 'getset', type: 'int' }],
                  method: [
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
    const md = '\`\`\`mv-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('parses mv-model-codespace class properties[]', () => {
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
    const md = '\`\`\`mv-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects mv-model-codespace property with invalid getterVisibility', () => {
    const md =
      '\`\`\`mv-model-codespace\n' +
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

  it('mv-view removal does not affect mv-model-codespace parsing', () => {
    const modelBlock =
      '```mv-model-codespace\n' +
      JSON.stringify({
        id: 'cs_only_truth',
        modules: [{ id: 'm1', name: 'ModuleA', namespaces: [{ id: 'n1', name: 'NsA', classes: [{ id: 'c1', name: 'User' }] }] }],
      }) +
      '\n```\n';
    const mer = 'classDiagram\n  class User';
    const viewBlock =
      '```mv-view\n' +
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
    expect(withView.blocks.some((b) => b.kind === 'mv-model-codespace' && b.payload.id === 'cs_only_truth')).toBe(true);

    const mdWithoutView = modelBlock;
    const withoutView = parseMarkdownBlocks(mdWithoutView);
    expect(withoutView.errors).toEqual([]);
    const model = withoutView.blocks.find((b) => b.kind === 'mv-model-codespace');
    expect(model?.payload.id).toBe('cs_only_truth');
  });

  it('rejects mv-model-codespace module/namespace names with non-english characters', () => {
    const md =
      '\`\`\`mv-model-codespace\n' +
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

  it('rejects mv-model-codespace member accessor on non-field kind', () => {
    const md =
      '\`\`\`mv-model-codespace\n' +
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
                classes: [{ id: 'c1', name: 'C1', method: [{ name: 'f', accessor: 'get' }] }],
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

  it('rejects mv-model-codespace duplicate id between module and namespace', () => {
    const md =
      '\`\`\`mv-model-codespace\n' +
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

  it('rejects mv-model-codespace bases targetId not a classifier', () => {
    const md =
      '\`\`\`mv-model-codespace\n' +
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

  it('rejects mv-model-codespace association endpoint not a classifier', () => {
    const md =
      '\`\`\`mv-model-codespace\n' +
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

  it('parses mv-model-codespace member and property associatedClassifierId', () => {
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
                  member: [{ name: 'ref', associatedClassifierId: 'cls-b' }],
                  properties: [{ name: 'Prop', associatedClassifierId: 'cls-b' }],
                },
                { id: 'cls-b', name: 'B' },
              ],
            },
          ],
        },
      ],
    };
    const md = '\`\`\`mv-model-codespace\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects mv-model-codespace associatedClassifierId when not a classifier id', () => {
    const md =
      '\`\`\`mv-model-codespace\n' +
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
                    member: [{ name: 'f', associatedClassifierId: 'nosuch' }],
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

  it('parses mv-model-interface', () => {
    const payload = {
      id: 'api1',
      title: '用户 API',
      endpoints: [{ id: 'list', name: '列表', method: 'GET', path: '/users' }],
    };
    const md = '\`\`\`mv-model-interface\n' + JSON.stringify(payload) + '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.errors).toEqual([]);
    expect(r.blocks[0].kind).toBe('mv-model-interface');
    expect(r.blocks[0].payload).toMatchObject(payload);
  });

  it('rejects mv-model-interface duplicate endpoint id', () => {
    const md =
      '\`\`\`mv-model-interface\n' +
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

  it('rejects mv-view mermaid-* without trailing mermaid mirror', () => {
    const md =
      '\`\`\`mv-view\n' +
      JSON.stringify({
        id: 'bad',
        kind: 'mermaid-flowchart',
        modelRefs: [],
        payload: 'flowchart TD\n  A --> B',
      }) +
      '\n\`\`\`\n';
    const r = parseMarkdownBlocks(md);
    expect(r.blocks).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('trailing') && e.message.includes('mermaid'))).toBe(true);
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

  it('replaceBlockInnerById for mv-model-sql', () => {
    const inner0 = {
      id: 'u',
      tables: [{ id: 'main', columns: [{ name: 'n' }], rows: [] }],
    };
    const md = 'x\n\`\`\`mv-model-sql\n' + JSON.stringify(inner0) + '\n\`\`\`\ny';
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
