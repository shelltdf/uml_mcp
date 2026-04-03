import { describe, expect, it } from 'vitest';
import {
  extractMermaidBlocks,
  inferMermaidDiagramKeyword,
  inferMermaidDiagramTypeFromMarkdown,
  parseUmlSyncMarkdown,
  detectKindFromPath,
  getSyncPanelModel,
  getSyncEditorState,
  serializeUmlSyncMarkdown,
  isUmlSyncPath,
  defaultCodeImplRootForType,
} from './lib/formats';
import {
  isClassMemberMethodLine,
  parseClassDiagramBody,
  serializeClassDiagramBody,
  stripMermaidMemberModifiers,
} from './lib/classDiagramModel';
import { parseClassMdMarkdown, serializeClassMdMarkdown } from './lib/classClassMdModel';
import { buildCodeMdMarkdown, parseCodeMdMarkdown } from './lib/codeMdModel';

describe('formats', () => {
  it('default code impl root follows impl_<type>_project', () => {
    expect(defaultCodeImplRootForType('cpp')).toBe('impl_cpp_project');
    expect(defaultCodeImplRootForType('csharp')).toBe('impl_csharp_project');
  });

  it('detects kinds', () => {
    expect(detectKindFromPath('uml.sync.md')).toBe('sync');
    expect(detectKindFromPath('proj/uml.sync.md')).toBe('sync');
    expect(detectKindFromPath('uml.sync (2).md')).toBe('sync');
    expect(isUmlSyncPath('uml.sync (3).md')).toBe(true);
    expect(detectKindFromPath('x.uml.md')).toBe('uml');
    expect(detectKindFromPath('a.class.md')).toBe('class');
    expect(detectKindFromPath('b.code.md')).toBe('code');
  });

  it('sync panel model always has config fields', () => {
    const raw = `---
uml_root: custom
---

# x`;
    const m = getSyncPanelModel(raw);
    expect(m.config.uml_root).toBe('custom');
    expect(m.hasYamlFrontMatter).toBe(true);
    const noFm = getSyncPanelModel('# hello');
    expect(noFm.hasYamlFrontMatter).toBe(false);
    expect(noFm.config.uml_root).toBe('diagrams');
    expect(noFm.config.namespace_root).toBe('namespace');
    expect(noFm.config.code_impls).toEqual([{ root: 'impl_cpp_project', code_type: 'cpp' }]);
  });

  it('extracts mermaid blocks', () => {
    const md = '```mermaid\nclassDiagram\n  class A\n```';
    expect(extractMermaidBlocks(md)).toHaveLength(1);
  });

  it('class diagram parse/serialize roundtrip', () => {
    const body = `classDiagram
  class A {
    +int x
    +run()
  }
  class B
  A <|-- B
`;
    const st = parseClassDiagramBody(body);
    expect(st).not.toBeNull();
    expect(st?.classes.length).toBeGreaterThanOrEqual(2);
    const again = serializeClassDiagramBody(st!);
    const st2 = parseClassDiagramBody(again);
    expect(st2?.classes.map((c) => c.name).sort()).toEqual(st?.classes.map((c) => c.name).sort());
  });

  it('parses classDiagram association with cardinality and label', () => {
    const body = `classDiagram
  class Order {
    +string id
  }
  class Item {
    +string sku
  }
  Order "1" --> "*" Item : contains
`;
    const st = parseClassDiagramBody(body);
    expect(st?.links.length).toBe(1);
    expect(st?.links[0].kind).toBe('association');
    expect(st?.links[0].from).toBe('Order');
    expect(st?.links[0].to).toBe('Item');
  });

  it('classifies private and static methods after stripping modifiers', () => {
    expect(stripMermaidMemberModifiers('-$ foo()')).toBe('foo()');
    expect(isClassMemberMethodLine('-$ foo()')).toBe(true);
    expect(isClassMemberMethodLine('-String secret')).toBe(false);
    expect(isClassMemberMethodLine('+$ staticBar()')).toBe(true);
  });

  it('parses classDiagram private fields and private methods', () => {
    const body = `classDiagram
  class A {
    -String secret
    +String pub
    -getSecret()
    +$ staticM()
  }
`;
    const st = parseClassDiagramBody(body);
    const c = st?.classes.find((x) => x.name === 'A');
    expect(c?.attributes.some((x) => x.includes('secret'))).toBe(true);
    expect(c?.attributes.some((x) => x.includes('pub'))).toBe(true);
    expect(c?.methods.some((x) => x.includes('getSecret'))).toBe(true);
    expect(c?.methods.some((x) => x.includes('staticM'))).toBe(true);
  });

  it('parses classDiagram inheritance', () => {
    const body = `classDiagram
  class Animal
  class Dog
  Animal <|-- Dog
`;
    const st = parseClassDiagramBody(body);
    expect(st?.links.some((l) => l.kind === 'inherit' && l.from === 'Dog' && l.to === 'Animal')).toBe(
      true,
    );
  });

  it('parses classDiagram dependency ..> as association edge', () => {
    const body = `classDiagram
  class Order
  class Customer
  Order ..> Customer : placedBy
`;
    const st = parseClassDiagramBody(body);
    expect(st?.links.length).toBe(1);
    expect(st?.links[0].kind).toBe('association');
    expect(st?.links[0].from).toBe('Order');
    expect(st?.links[0].to).toBe('Customer');
  });

  it('code md parse/serialize roundtrip', () => {
    const md = `# 全局测试

> 约定段落

## 函数

| Kind | Name | 签名（抽象） | 效果 / 返回值（抽象） | Note |
|------|------|--------------|----------------------|------|
| function | a | sig | eff | n |

## 全局变量 / 常量

| Kind | Name | 类型（抽象） | Note |
|------|------|--------------|------|
| constant | V | int | nv |

## 宏

| Kind | Name | 展开语义（抽象） | Note |
|------|------|------------------|------|
| macro | M | exp | mn |
`;
    const { state, layout } = parseCodeMdMarkdown(md);
    expect(state.functions.length).toBe(1);
    expect(state.variables.length).toBe(1);
    expect(state.macros.length).toBe(1);
    const out = buildCodeMdMarkdown(state, layout);
    const again = parseCodeMdMarkdown(out);
    expect(again.state.functions.map((f) => f.name)).toEqual(state.functions.map((f) => f.name));
    expect(again.state.variables.map((v) => v.name)).toEqual(state.variables.map((v) => v.name));
    expect(again.state.macros.map((x) => x.name)).toEqual(state.macros.map((x) => x.name));
  });

  it('class md parse/serialize roundtrip', () => {
    const md = `# X

### Foo

<!-- class-md-meta: {"inherits":"Base","associations":["Other"]} -->

| Kind | Name | Type | Note |
|------|------|------|------|
| field | a | int | |
`;
    const s = parseClassMdMarkdown(md);
    expect(s.title).toBe('Foo');
    expect(s.meta.inherits).toBe('Base');
    expect(s.meta.associations).toEqual(['Other']);
    expect(s.rows.length).toBe(1);
    const out = serializeClassMdMarkdown(md, s);
    const s2 = parseClassMdMarkdown(out);
    expect(s2.rows).toEqual(s.rows);
    expect(s2.meta.inherits).toBe('Base');
  });

  it('infers mermaid diagram keyword from first block', () => {
    expect(inferMermaidDiagramKeyword('%% note\nclassDiagram\n  class A')).toBe('classDiagram');
    expect(inferMermaidDiagramKeyword('flowchart LR\n  A-->B')).toBe('flowchart');
    expect(inferMermaidDiagramKeyword('stateDiagram-v2\n  [*] --> A')).toBe('stateDiagram-v2');
    const md = '# t\n\n```mermaid\nsequenceDiagram\n  A->>B: hi\n```';
    expect(inferMermaidDiagramTypeFromMarkdown(md)).toBe('sequenceDiagram');
    expect(inferMermaidDiagramTypeFromMarkdown('no block')).toBeNull();
  });

  it('parses uml.sync front matter (code_impls)', () => {
    const raw = `---
namespace_root: .
uml_root: diagrams
code_impls:
  - root: .
    code_type: csharp
sync_profile: none
---

# body
`;
    const { config, body } = parseUmlSyncMarkdown(raw);
    expect(config).not.toBeNull();
    expect(config?.uml_root).toBe('diagrams');
    expect(config?.namespace_root).toBe('.');
    expect(config?.code_impls).toEqual([{ root: '.', code_type: 'csharp' }]);
    expect(config?.sync_profile).toBe('none');
    expect(body.trim().startsWith('# body')).toBe(true);
  });

  it('migrates legacy code_roots + code_type to code_impls', () => {
    const raw = `---
namespace_root: .
uml_root: diagrams
code_roots:
  - .
  - src
code_type: csharp
sync_profile: strict
---

# body
`;
    const { config } = parseUmlSyncMarkdown(raw);
    expect(config?.code_impls).toEqual([
      { root: '.', code_type: 'csharp' },
      { root: 'src', code_type: 'csharp' },
    ]);
  });

  it('serializes and round-trips sync markdown', () => {
    const st = getSyncEditorState('');
    const body = '# Title\n\nHello';
    const md = serializeUmlSyncMarkdown(st.config, body);
    const again = parseUmlSyncMarkdown(md);
    expect(again.config?.uml_root).toBe(st.config.uml_root);
    expect(again.body.trim()).toBe(body.trim());
  });

  it('migrates legacy namespace_dirs key to namespace_root', () => {
    const raw = `---
namespace_dirs:
  - legacy-ns
uml_root: diagrams
---
`;
    const { config } = parseUmlSyncMarkdown(raw);
    expect(config?.namespace_root).toBe('legacy-ns');
  });
});
