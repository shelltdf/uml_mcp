export type FileKind = 'uml' | 'class' | 'code' | 'sync' | 'source' | 'unknown';

/** 单套代码实现：唯一代码根 + 代码类型（路径可为相对或绝对） */
export interface CodeImplementation {
  root: string;
  code_type: string;
}

/** 同步策略：产品 UI 仅支持 none / strict */
export type SyncProfile = 'none' | 'strict';

export interface UmlSyncConfig {
  /** 唯一命名空间根（YAML `namespace_root`：标量；兼容旧版列表取首项） */
  namespace_root: string;
  uml_root: string;
  /** 多套代码实现；每项 root 在契约内唯一，各带 code_type */
  code_impls: CodeImplementation[];
  sync_profile: SyncProfile;
}

const SYNC_FILENAME = 'uml.sync.md';

/** 工作区相对：默认命名空间根目录（类图等 UML 侧产物；非「代码实现」，不带 impl_ 前缀） */
export const DEFAULT_NAMESPACE_DIR = 'namespace';
/** 工作区相对：默认 C++ 代码根目录；产品默认带 `impl_` 前缀 */
export const DEFAULT_IMPL_CPP_PROJECT_ROOT = 'impl_cpp_project';

/** GUI：添加代码实现时可选类型 */
export const CODE_IMPL_TYPE_OPTIONS = [
  'cpp',
  'csharp',
  'java',
  'rust',
  'go',
  'javascript',
  'typescript',
  'python',
] as const;

/**
 * 按代码类型生成默认实现根目录名（如 cpp → `impl_cpp_project`）。
 * 仅用于 UI 默认建议，契约仍以用户确认的路径为准。
 */
export function defaultCodeImplRootForType(codeType: string): string {
  const raw = (codeType || 'cpp').trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'cpp';
  return `impl_${safe}_project`;
}

/** 无 YAML 或缺省列表为空时，面板与模板使用的契约默认值 */
export function defaultUmlSyncConfig(): UmlSyncConfig {
  return {
    namespace_root: DEFAULT_NAMESPACE_DIR,
    uml_root: 'diagrams',
    code_impls: [{ root: DEFAULT_IMPL_CPP_PROJECT_ROOT, code_type: 'cpp' }],
    sync_profile: 'strict',
  };
}

function normalizeSyncProfile(s: string): SyncProfile {
  const t = s.trim().toLowerCase();
  if (t === 'none') return 'none';
  return 'strict';
}

/** 保存前规范化：去空白、保证命名空间根与至少一项代码实现；sync_profile 仅 none | strict */
export function normalizeConfigForSave(config: UmlSyncConfig): UmlSyncConfig {
  let namespace_root =
    typeof config.namespace_root === 'string'
      ? config.namespace_root.trim()
      : '';
  if (!namespace_root) namespace_root = DEFAULT_NAMESPACE_DIR;

  let code_impls = config.code_impls
    .map((i) => ({
      root: i.root.trim(),
      code_type: (i.code_type || 'cpp').trim() || 'cpp',
    }))
    .filter((i) => i.root.length > 0);
  if (code_impls.length === 0) {
    code_impls = [{ root: DEFAULT_IMPL_CPP_PROJECT_ROOT, code_type: 'cpp' }];
  }
  const seen = new Set<string>();
  code_impls = code_impls.filter((x) => {
    if (seen.has(x.root)) return false;
    seen.add(x.root);
    return true;
  });

  return {
    namespace_root,
    uml_root: config.uml_root.trim() || 'diagrams',
    code_impls,
    sync_profile: normalizeSyncProfile(config.sync_profile),
  };
}

function yamlScalar(s: string): string {
  if (s === '') return '""';
  if (/^[a-zA-Z0-9_.\\/:-]+$/.test(s)) return s;
  const escaped = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * 由结构化配置与正文生成完整 `uml.sync.md` 文本（含 YAML 前置块）。
 * 会先执行 {@link normalizeConfigForSave}。
 */
export function serializeUmlSyncMarkdown(config: UmlSyncConfig, body: string): string {
  const c = normalizeConfigForSave(config);
  const lines: string[] = ['---'];
  lines.push(`namespace_root: ${yamlScalar(c.namespace_root)}`);
  lines.push(`uml_root: ${yamlScalar(c.uml_root)}`);
  lines.push('code_impls:');
  for (const impl of c.code_impls) {
    lines.push(`  - root: ${yamlScalar(impl.root)}`);
    lines.push(`    code_type: ${yamlScalar(impl.code_type)}`);
  }
  lines.push(`sync_profile: ${yamlScalar(c.sync_profile)}`);
  lines.push('---');
  const bodyTrim = body.replace(/\s*$/, '');
  return `${lines.join('\n')}\n\n${bodyTrim}${bodyTrim ? '\n' : ''}`;
}

/** 解析结果中若 `namespace_root` / `code_impls` 为空，补全产品默认（供 UI 展示） */
function applyUmlSyncDisplayDefaults(config: UmlSyncConfig): UmlSyncConfig {
  const ns = config.namespace_root.trim();
  return {
    ...config,
    namespace_root: ns || DEFAULT_NAMESPACE_DIR,
    code_impls:
      config.code_impls.length > 0
        ? config.code_impls
        : [{ root: DEFAULT_IMPL_CPP_PROJECT_ROOT, code_type: 'cpp' }],
    sync_profile: normalizeSyncProfile(config.sync_profile),
  };
}

/** 是否为 uml.sync 契约文件（含未保存的 uml.sync (2).md 等） */
export function isUmlSyncPath(path: string): boolean {
  const base = path.split(/[/\\]/).pop() ?? path;
  return base === SYNC_FILENAME || /^uml\.sync(?:\s+\(\d+\))?\.md$/i.test(base);
}

export function detectKindFromPath(path: string): FileKind {
  if (isUmlSyncPath(path)) {
    return 'sync';
  }
  if (path.endsWith('.uml.md')) return 'uml';
  if (path.endsWith('.class.md')) return 'class';
  if (path.endsWith('.code.md')) return 'code';
  if (/\.(cpp|cc|cxx|c|hpp|hh|h)\b/i.test(path)) return 'source';
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

/**
 * 从一段 Mermaid 源码解析**图类型关键字**（首条非注释非空行的首 token，与画布首块一致）。
 * 例如 `classDiagram`、`flowchart`、`stateDiagram-v2`、`sequenceDiagram`。
 */
export function inferMermaidDiagramKeyword(mermaidCode: string): string | null {
  const lines = mermaidCode.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('%%')) continue;
    const token = t.split(/\s+/)[0];
    if (token) return token;
  }
  return null;
}

/** 与画布一致：取 Markdown 中首个 fenced `mermaid` 块的图类型关键字。 */
export function inferMermaidDiagramTypeFromMarkdown(markdown: string): string | null {
  const blocks = extractMermaidBlocks(markdown);
  if (blocks.length === 0) return null;
  return inferMermaidDiagramKeyword(blocks[0]);
}

function stripScalar(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '');
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

type ParseMode = 'none' | 'namespace_root' | 'legacy_namespace_dirs' | 'legacy_code_roots' | 'code_impls';

function parseSimpleYaml(fm: string): UmlSyncConfig | null {
  const lines = fm.split(/\r?\n/);
  const namespace_root_list: string[] = [];
  const legacy_namespace_dirs: string[] = [];
  const legacy_code_roots: string[] = [];
  const code_impls: CodeImplementation[] = [];
  let uml_root = 'diagrams';
  let legacy_code_type = 'cpp';
  let sync_profile = 'strict';

  let mode: ParseMode = 'none';
  let implCurrent: CodeImplementation | null = null;

  function flushImplItem() {
    if (implCurrent && implCurrent.root) {
      code_impls.push(implCurrent);
    }
    implCurrent = null;
  }

  for (const line of lines) {
    const listItem = line.match(/^\s*-\s+"?([^"]+)"?\s*$/);
    const topKey = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);

    if (topKey && !/^\s/.test(line)) {
      flushImplItem();
      const key = topKey[1];
      const colonIdx = line.indexOf(':');
      const rest = line.slice(colonIdx + 1).trim();

      if (key === 'namespace_root') {
        if (rest) {
          namespace_root_list.length = 0;
          namespace_root_list.push(stripScalar(rest));
          mode = 'none';
        } else {
          mode = 'namespace_root';
        }
        continue;
      }
      if (key === 'namespace_dirs') {
        mode = 'legacy_namespace_dirs';
        continue;
      }
      if (key === 'code_impls') {
        mode = 'code_impls';
        continue;
      }
      if (key === 'code_roots') {
        mode = 'legacy_code_roots';
        continue;
      }
      if (key === 'uml_root') {
        mode = 'none';
        if (rest) uml_root = stripScalar(rest);
        continue;
      }
      if (key === 'code_type') {
        mode = 'none';
        if (rest) legacy_code_type = stripScalar(rest);
        continue;
      }
      if (key === 'sync_profile') {
        mode = 'none';
        if (rest) sync_profile = stripScalar(rest);
        continue;
      }
      mode = 'none';
      continue;
    }

    const rootLine = line.match(/^\s*-\s*root:\s*(.+)$/);
    if (mode === 'code_impls' && rootLine) {
      flushImplItem();
      implCurrent = { root: stripScalar(rootLine[1]), code_type: 'cpp' };
      continue;
    }

    const nestedCodeType = line.match(/^\s+code_type:\s*(.+)$/);
    if (mode === 'code_impls' && nestedCodeType && implCurrent) {
      implCurrent.code_type = stripScalar(nestedCodeType[1]);
      continue;
    }

    if (mode === 'namespace_root' && listItem) {
      namespace_root_list.push(listItem[1].trim());
      continue;
    }
    if (mode === 'legacy_namespace_dirs' && listItem) {
      legacy_namespace_dirs.push(listItem[1].trim());
      continue;
    }
    if (mode === 'legacy_code_roots' && listItem) {
      legacy_code_roots.push(listItem[1].trim());
      continue;
    }
  }

  flushImplItem();

  let finalImpls = code_impls;
  if (finalImpls.length === 0 && legacy_code_roots.length > 0) {
    finalImpls = legacy_code_roots.map((root) => ({
      root,
      code_type: legacy_code_type,
    }));
  }

  const seen = new Set<string>();
  finalImpls = finalImpls.filter((x) => {
    const k = x.root;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let ns = '';
  if (namespace_root_list.length > 0) {
    ns = namespace_root_list[0];
  } else if (legacy_namespace_dirs.length > 0) {
    ns = legacy_namespace_dirs[0];
  }

  return {
    namespace_root: ns,
    uml_root,
    code_impls: finalImpls,
    sync_profile: normalizeSyncProfile(sync_profile),
  };
}

/** 是否存在闭合的 YAML 前置块（--- ... ---） */
export function hasUmlSyncYamlHeader(raw: string): boolean {
  const trimmed = raw.replace(/^\uFEFF/, '').trimStart();
  if (!trimmed.startsWith('---')) return false;
  const end = trimmed.indexOf('\n---', 3);
  return end !== -1;
}

/**
 * 右侧「同步配置」面板用：始终给出可展示字段；无前置块时仍为默认结构并标记 hasYamlFrontMatter。
 */
export function getSyncPanelModel(raw: string): { config: UmlSyncConfig; hasYamlFrontMatter: boolean } {
  const parsed = parseUmlSyncMarkdown(raw);
  const base = parsed.config ?? defaultUmlSyncConfig();
  return {
    config: applyUmlSyncDisplayDefaults(base),
    hasYamlFrontMatter: hasUmlSyncYamlHeader(raw),
  };
}

/** 同步配置 GUI：初始状态（含正文） */
export function getSyncEditorState(raw: string): {
  config: UmlSyncConfig;
  body: string;
  hasYamlFrontMatter: boolean;
} {
  const parsed = parseUmlSyncMarkdown(raw);
  const base = parsed.config ?? defaultUmlSyncConfig();
  return {
    config: applyUmlSyncDisplayDefaults(base),
    body: parsed.body,
    hasYamlFrontMatter: hasUmlSyncYamlHeader(raw),
  };
}
