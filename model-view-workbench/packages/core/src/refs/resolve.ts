import type { ResolvedRef } from '../types.js';

const REF_RE = /^ref:(.+)#([^#]+)$/;

/**
 * Parse ref: relative/path.md#blockId
 */
export function parseRefUri(ref: string): ResolvedRef | null {
  const s = ref.trim();
  const m = REF_RE.exec(s);
  if (!m) return null;
  return { ref: s, fileRel: normalizeRelPath(m[1]), blockId: m[2] };
}

/** Normalize path segments; keep posix style for storage */
export function normalizeRelPath(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/').filter((x) => x && x !== '.');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

/**
 * Join base file directory + rel ref path.
 * @param fromFileRel path relative to workspace e.g. docs/a.md
 * @param refPath path from ref URI (may be relative)
 */
export function resolveRefPath(fromFileRel: string, refPath: string): string {
  const baseDir = fromFileRel.includes('/') ? fromFileRel.slice(0, fromFileRel.lastIndexOf('/')) : '';
  const combined = baseDir ? `${baseDir}/${refPath}` : refPath;
  return normalizeRelPath(combined);
}

/**
 * Detect circular ref graph. `edges` maps node -> successor nodes (directed).
 */
export function detectRefCycle(edges: Map<string, Set<string>>): { cyclic: boolean; chain?: string[] } {
  const state = new Map<string, 0 | 1 | 2>(); // 0=unseen,1=visiting,2=done
  let cycle: string[] | undefined;

  function dfs(u: string, path: string[]): void {
    if (cycle) return;
    const s = state.get(u) ?? 0;
    if (s === 1) {
      const i = path.indexOf(u);
      cycle = i >= 0 ? path.slice(i).concat(u) : [u];
      return;
    }
    if (s === 2) return;
    state.set(u, 1);
    path.push(u);
    for (const v of edges.get(u) ?? []) dfs(v, path);
    path.pop();
    state.set(u, 2);
  }

  for (const n of edges.keys()) {
    if ((state.get(n) ?? 0) === 0) dfs(n, []);
    if (cycle) return { cyclic: true, chain: cycle };
  }
  return { cyclic: false };
}
