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
