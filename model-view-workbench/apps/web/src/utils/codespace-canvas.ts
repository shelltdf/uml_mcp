import type {
  MvCodespaceNamespaceNode,
  MvModelCodespaceModule,
  MvModelCodespacePayload,
} from '@mvwb/core';

function walkNamespaces(nodes: MvCodespaceNamespaceNode[] | undefined, visit: (n: MvCodespaceNamespaceNode) => void) {
  if (!nodes) return;
  for (const n of nodes) {
    visit(n);
    walkNamespaces(n.namespaces, visit);
  }
}

/** 围栏内所有带 `id` 的节点 id（含 payload.id、模块、命名空间树、类、变量、函数、宏、关联） */
export function collectAllCodespaceIds(p: MvModelCodespacePayload): Set<string> {
  const s = new Set<string>();
  const add = (id: unknown) => {
    if (typeof id === 'string' && id.trim()) s.add(id.trim());
  };
  add(p.id);
  for (const m of p.modules ?? []) {
    add(m.id);
    walkNamespaces(m.namespaces, (n) => {
      add(n.id);
      for (const c of n.classes ?? []) add(c.id);
      for (const v of n.variables ?? []) add(v.id);
      for (const f of n.functions ?? []) add(f.id);
      for (const mac of n.macros ?? []) add(mac.id);
      for (const a of n.associations ?? []) add(a.id);
    });
  }
  return s;
}

/** 全树 `classes[].id`，供 bases / associations 下拉 */
export function collectClassifierIds(p: MvModelCodespacePayload): string[] {
  const out: string[] = [];
  for (const m of p.modules ?? []) {
    walkNamespaces(m.namespaces, (n) => {
      for (const c of n.classes ?? []) out.push(c.id);
    });
  }
  return out;
}

export function newCodespaceUniqueId(prefix: string, p: MvModelCodespacePayload): string {
  const existing = collectAllCodespaceIds(p);
  for (let k = 0; k < 400; k++) {
    const id = `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    if (!existing.has(id)) return id;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 14)}`;
}

export function ensureModuleNamespaces(m: MvModelCodespaceModule): MvCodespaceNamespaceNode[] {
  if (!m.namespaces) m.namespaces = [];
  return m.namespaces;
}

/** `path` 为从 `module.namespaces` 起的下标链；返回该节点；`path` 空返回 null（表示模块根，非节点） */
export function getNamespaceAtPath(
  draft: MvModelCodespacePayload,
  mi: number,
  path: number[],
): MvCodespaceNamespaceNode | null {
  const m = draft.modules[mi];
  if (!m?.namespaces?.length || path.length === 0) return null;
  let cur = m.namespaces[path[0]!];
  if (!cur) return null;
  for (let i = 1; i < path.length; i++) {
    const idx = path[i]!;
    const next = cur.namespaces?.[idx];
    if (!next) return null;
    cur = next;
  }
  return cur;
}

/** 在 `path` 节点下挂子命名空间（path 空则在模块顶层） */
export function insertNamespaceChild(
  draft: MvModelCodespacePayload,
  mi: number,
  path: number[],
  node: MvCodespaceNamespaceNode,
) {
  const m = draft.modules[mi];
  if (!m) return;
  if (path.length === 0) {
    const arr = ensureModuleNamespaces(m);
    arr.push(node);
    return;
  }
  const parent = getNamespaceAtPath(draft, mi, path);
  if (!parent) return;
  if (!parent.namespaces) parent.namespaces = [];
  parent.namespaces.push(node);
}

export function removeNamespaceAtPath(draft: MvModelCodespacePayload, mi: number, path: number[]) {
  const m = draft.modules[mi];
  if (!m?.namespaces) return;
  if (path.length === 1) {
    m.namespaces.splice(path[0]!, 1);
    return;
  }
  const parentPath = path.slice(0, -1);
  const last = path[path.length - 1]!;
  const parent = getNamespaceAtPath(draft, mi, parentPath);
  if (!parent?.namespaces) return;
  parent.namespaces.splice(last, 1);
}
