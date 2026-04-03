export type FileKind = 'uml' | 'class' | 'code' | 'sync' | 'unknown';

export interface UmlSyncConfig {
  namespace_dirs: string[];
  uml_root: string;
  code_roots: string[];
  sync_profile: string;
}

const SYNC_FILENAME = 'uml.sync.md';

export function detectKindFromPath(path: string): FileKind {
  if (path.endsWith(SYNC_FILENAME) || path.split(/[/\\]/).pop() === SYNC_FILENAME) {
    return 'sync';
  }
  if (path.endsWith('.uml.md')) return 'uml';
  if (path.endsWith('.class.md')) return 'class';
  if (path.endsWith('.code.md')) return 'code';
  return 'unknown';
}

export function extractMermaidBlocks(markdown: string): string[] {
  const re = /```\s*mermaid\s*\n([\s\S]*?)```/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

/** 最小 YAML 子集解析：仅支持 uml.sync 约定字段 */
export function parseUmlSyncMarkdown(raw: string): { config: UmlSyncConfig | null; body: string } {
  const trimmed = raw.replace(/^\uFEFF/, '');
  if (!trimmed.startsWith('---')) {
    return { config: null, body: trimmed };
  }
  const end = trimmed.indexOf('\n---', 3);
  if (end === -1) {
    return { config: null, body: trimmed };
  }
  const fm = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).replace(/^\s*/, '');
  const config = parseSimpleYaml(fm);
  return { config, body };
}

function parseSimpleYaml(fm: string): UmlSyncConfig | null {
  const lines = fm.split(/\r?\n/);
  const namespace_dirs: string[] = [];
  const code_roots: string[] = [];
  let uml_root = 'diagrams';
  let sync_profile = 'strict';
  let inNs = false;
  let inCode = false;

  for (const line of lines) {
    const nsList = line.match(/^\s*-\s+"?([^"]+)"?\s*$/);
    if (/^namespace_dirs\s*:/.test(line)) {
      inNs = true;
      inCode = false;
      continue;
    }
    if (/^code_roots\s*:/.test(line)) {
      inCode = true;
      inNs = false;
      continue;
    }
    if (/^uml_root\s*:/.test(line)) {
      inNs = false;
      inCode = false;
      const v = line.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      if (v) uml_root = v;
      continue;
    }
    if (/^sync_profile\s*:/.test(line)) {
      inNs = false;
      inCode = false;
      const v = line.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      if (v) sync_profile = v;
      continue;
    }
    if (inNs && nsList) {
      namespace_dirs.push(nsList[1].trim());
    }
    if (inCode && nsList) {
      code_roots.push(nsList[1].trim());
    }
  }

  if (namespace_dirs.length === 0 && code_roots.length === 0 && uml_root === 'diagrams' && sync_profile === 'strict') {
    return null;
  }
  return {
    namespace_dirs,
    uml_root,
    code_roots,
    sync_profile,
  };
}
