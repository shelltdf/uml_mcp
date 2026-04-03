/**
 * 由 *.class.md 与 uml.sync 契约解析「已同步实现」候选路径（工作区相对路径）。
 */

import {
  isUmlSyncPath,
  normalizeConfigForSave,
  parseUmlSyncMarkdown,
  type UmlSyncConfig,
} from './formats';

export function slugFromClassTitle(title: string): string {
  return String(title ?? '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * @param metaCodeFiles `class-md-meta` 中可选的 `code_files`（工作区相对路径）
 */
export function resolveClassImplementationPaths(
  _classMdPath: string,
  classTitle: string,
  metaCodeFiles: string[] | undefined,
  syncConfig: UmlSyncConfig | null,
): string[] {
  if (metaCodeFiles && metaCodeFiles.length > 0) {
    const cleaned = metaCodeFiles
      .filter((p): p is string => typeof p === 'string')
      .map((p) => p.trim().replace(/\\/g, '/'))
      .filter(Boolean);
    return [...new Set(cleaned)];
  }
  if (!syncConfig?.code_impls?.length) return [];
  const slug = slugFromClassTitle(classTitle);
  const out: string[] = [];
  for (const impl of syncConfig.code_impls) {
    if (!impl || typeof impl.root !== 'string' || !impl.root.trim()) continue;
    const root = impl.root.replace(/\\/g, '/').replace(/\/+$/, '');
    const ct = impl.code_type.toLowerCase();
    if (ct === 'cpp' || ct === 'c++' || ct === 'cxx') {
      out.push(`${root}/include/acme/${slug}.hpp`);
      out.push(`${root}/src/${slug}.cpp`);
    } else {
      out.push(`${root}/${slug}.${ct}`);
    }
  }
  return [...new Set(out)];
}

export function getSyncConfigFromTabs(
  tabs: readonly { kind: string; path: string; content: string }[] | null | undefined,
): UmlSyncConfig | null {
  if (!tabs || !Array.isArray(tabs)) return null;
  for (const t of tabs) {
    if (!t || typeof t.path !== 'string' || typeof t.content !== 'string') continue;
    if (t.kind !== 'sync') continue;
    if (!isUmlSyncPath(t.path)) continue;
    const { config } = parseUmlSyncMarkdown(t.content);
    if (config) return normalizeConfigForSave(config);
  }
  return null;
}

export function normalizeWorkspacePath(p: string): string {
  if (typeof p !== 'string' || !p) return '';
  return p.replace(/\\/g, '/').toLowerCase();
}
