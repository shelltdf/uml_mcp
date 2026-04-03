import { describe, expect, it } from 'vitest';
import { extractMermaidBlocks, parseUmlSyncMarkdown, detectKindFromPath } from './lib/formats';

describe('formats', () => {
  it('detects kinds', () => {
    expect(detectKindFromPath('uml.sync.md')).toBe('sync');
    expect(detectKindFromPath('x.uml.md')).toBe('uml');
    expect(detectKindFromPath('a.class.md')).toBe('class');
    expect(detectKindFromPath('b.code.md')).toBe('code');
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
