import type { MvModelCodespacePayload } from '@mvwb/core';
import { getNamespaceAtPath } from './codespace-canvas';

export function moduleLabelFromPayload(payload: MvModelCodespacePayload, mi: number): string {
  const raw = (payload.modules?.[mi]?.name ?? '').trim();
  return raw ? raw : `Module#${mi + 1}`;
}

/** Same as floating editors: `.A.B` for nested NS, `.` for root-only chain. */
export function resolveNamespacePathLabel(payload: MvModelCodespacePayload, mi: number, path: number[]): string {
  const mod = payload.modules?.[mi];
  const names: string[] = [];
  let nodes = mod?.namespaces ?? [];
  for (const idx of path) {
    const n = nodes?.[idx];
    if (!n) break;
    const name = (n.name ?? '').trim();
    if (name) names.push(name);
    nodes = n.namespaces ?? [];
  }
  return names.length ? `.${names.join('.')}` : '.';
}

function splitPathSegments(chain: string): string[] {
  return String(chain ?? '')
    .split('.')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** `[module].seg1.seg2` — module in brackets so root `.` does not collide with dot separators. */
export function formatModuleScopedPath(payload: MvModelCodespacePayload, mi: number, ...chains: string[]): string {
  const modulePart = `[${moduleLabelFromPayload(payload, mi)}]`;
  const segs = chains.flatMap((c) => splitPathSegments(c));
  return segs.length ? `${modulePart}.${segs.join('.')}` : modulePart;
}

/** Dot-joined nested class names from `classes[ci]` through `classPath`. */
export function resolveNestedClassifierNameChain(
  payload: MvModelCodespacePayload,
  mi: number,
  path: number[],
  ci: number,
  classPath?: number[],
): string {
  const ns = getNamespaceAtPath(payload, mi, path);
  if (!ns) return '';
  const root = ns.classes?.[ci];
  if (!root) return '';
  const parts: string[] = [(root.name ?? '').trim()];
  let cur = root;
  for (const idx of classPath ?? []) {
    const next = cur.classes?.[idx];
    if (!next) break;
    parts.push((next.name ?? '').trim());
    cur = next;
  }
  return parts.filter(Boolean).join('.');
}
