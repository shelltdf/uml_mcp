import { describe, expect, it } from 'vitest';
import {
  extractMermaidBlocks,
  parseUmlSyncMarkdown,
  detectKindFromPath,
  getSyncPanelModel,
  isUmlSyncPath,
} from './lib/formats';

describe('formats', () => {
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
  });

  it('extracts mermaid blocks', () => {
    const md = '```mermaid\nclassDiagram\n  class A\n```';
    expect(extractMermaidBlocks(md)).toHaveLength(1);
  });

  it('parses uml.sync front matter', () => {
    const raw = `---
namespace_dirs:
  - src/A
uml_root: diagrams
code_roots:
  - src
sync_profile: relaxed
---

# body
`;
    const { config, body } = parseUmlSyncMarkdown(raw);
    expect(config).not.toBeNull();
    expect(config?.uml_root).toBe('diagrams');
    expect(config?.namespace_dirs).toContain('src/A');
    expect(config?.code_roots).toContain('src');
    expect(config?.sync_profile).toBe('relaxed');
    expect(body.trim().startsWith('# body')).toBe(true);
  });
});
