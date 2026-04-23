import type {
  MvCodespaceNamespaceNode,
  MvModelCodespaceModule,
  MvModelCodespacePayload,
} from '@smw/core';

export const CODESPACE_ROOT_NAMESPACE_NAME = '';

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

function normalizePathIdPart(raw: string): string {
  const t = raw.trim();
  if (!t) return 'Unnamed';
  const safe = t.replace(/[^A-Za-z0-9_]/g, '_');
  return safe || 'Unnamed';
}

function makeUniquePathId(base: string, used: Set<string>): string {
  let out = base;
  let i = 2;
  while (used.has(out)) {
    out = `${base}_${i}`;
    i += 1;
  }
  used.add(out);
  return out;
}

type NsWalker = (n: MvCodespaceNamespaceNode, path: number[]) => void;
function walkNamespacesWithPath(nodes: MvCodespaceNamespaceNode[] | undefined, basePath: number[], visit: NsWalker) {
  if (!nodes) return;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const p = [...basePath, i];
    visit(n, p);
    walkNamespacesWithPath(n.namespaces, p, visit);
  }
}

/**
 * 依据命名空间层级重建 namespace/class 的路径型 id：
 * - namespace.id: `Core` / `Core.Sub`
 * - class.id: `Core.Service`
 * 同时维护 bases/associations 指向的新 class id。
 */
export function rebuildPathIdsForModule(draft: MvModelCodespacePayload, mi: number): void {
  const mod = draft.modules[mi];
  if (!mod?.namespaces?.length) return;

  const oldNsIds = new Set<string>();
  const oldClassIds = new Set<string>();
  walkNamespacesWithPath(mod.namespaces, [], (n) => {
    if (typeof n.id === 'string' && n.id.trim()) oldNsIds.add(n.id.trim());
    for (const c of n.classes ?? []) {
      if (typeof c.id === 'string' && c.id.trim()) oldClassIds.add(c.id.trim());
    }
  });

  const used = collectAllCodespaceIds(draft);
  for (const id of oldNsIds) used.delete(id);
  for (const id of oldClassIds) used.delete(id);

  const classIdMap = new Map<string, string>();

  const assign = (nodes: MvCodespaceNamespaceNode[] | undefined, prefix: string[]) => {
    if (!nodes) return;
    for (const n of nodes) {
      const nsPart = normalizePathIdPart(n.name ?? '');
      const nsBase = [...prefix, nsPart].join('.');
      const oldNs = n.id;
      n.id = makeUniquePathId(nsBase, used);
      if (oldNs && oldNs !== n.id) {
        // 仅保留 class 映射用于后续关系修正；ns 引用当前无外部字段依赖。
      }

      const cls = n.classes ?? [];
      for (const c of cls) {
        const clsPart = normalizePathIdPart(c.name ?? '');
        const clsBase = `${n.id}.${clsPart}`;
        const oldId = c.id;
        const nextId = makeUniquePathId(clsBase, used);
        c.id = nextId;
        if (oldId && oldId !== nextId) classIdMap.set(oldId, nextId);
      }
      assign(n.namespaces, [...prefix, nsPart]);
    }
  };
  assign(mod.namespaces, []);

  // 修正 class id 被重建后，bases / associations 的引用。
  walkNamespacesWithPath(mod.namespaces, [], (n) => {
    for (const c of n.classes ?? []) {
      for (const b of c.bases ?? []) {
        const mapped = classIdMap.get(b.targetId);
        if (mapped) b.targetId = mapped;
      }
    }
    for (const a of n.associations ?? []) {
      const fm = classIdMap.get(a.fromClassifierId);
      if (fm) a.fromClassifierId = fm;
      const tm = classIdMap.get(a.toClassifierId);
      if (tm) a.toClassifierId = tm;
    }
  });
}

export function ensureModuleNamespaces(m: MvModelCodespaceModule): MvCodespaceNamespaceNode[] {
  if (!m.namespaces) m.namespaces = [];
  return m.namespaces;
}

/** 每个 module 保证存在且仅依赖首个根命名空间 `.` 作为固定入口。 */
export function ensureModuleRootNamespace(
  m: MvModelCodespaceModule,
  payload?: MvModelCodespacePayload,
): MvCodespaceNamespaceNode {
  const arr = ensureModuleNamespaces(m);
  const roots = arr.filter((n) => (n.name ?? '').trim() === CODESPACE_ROOT_NAMESPACE_NAME);
  const root =
    roots[0] ??
    ({
      id: payload ? newCodespaceUniqueId('ns', payload) : 'ns_root',
      name: CODESPACE_ROOT_NAMESPACE_NAME,
      namespaces: [],
    } satisfies MvCodespaceNamespaceNode);
  root.name = CODESPACE_ROOT_NAMESPACE_NAME;
  if (!root.namespaces) root.namespaces = [];
  // 统一约束：module 顶层仅保留一个 "." 根空间，其它顶层都迁入 root.namespaces。
  const toMove: MvCodespaceNamespaceNode[] = [];
  for (const n of arr) {
    if (n === root) continue;
    if ((n.name ?? '').trim() === CODESPACE_ROOT_NAMESPACE_NAME) {
      // 额外 root 合并其子树
      for (const ch of n.namespaces ?? []) toMove.push(ch);
      continue;
    }
    toMove.push(n);
  }
  if (toMove.length) {
    if (!root.namespaces) root.namespaces = [];
    root.namespaces.push(...toMove);
  }
  m.namespaces = [root];
  return root;
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
  if (path.length === 1 && path[0] === 0) return;
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
