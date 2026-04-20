/**
 * 将 Mermaid 类图节点与同文件 ``mv-model-codespace`` 中的 Classifier 对齐（供块画布双击打开浮窗）。
 */
import {
  parseMarkdownBlocks,
  slug,
  type MvCodespaceNamespaceNode,
  type MvModelCodespacePayload,
  type ParsedFenceBlock,
} from '@mvwb/core';

function walkClassifiers(
  p: MvModelCodespacePayload,
  visit: (mi: number, path: number[], ci: number, id: string, name: string) => void,
): void {
  const mods = p.modules ?? [];
  for (let mi = 0; mi < mods.length; mi++) {
    const walkNs = (nodes: MvCodespaceNamespaceNode[] | undefined, path: number[]) => {
      if (!nodes?.length) return;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        const nextPath = [...path, i];
        const classes = n.classes ?? [];
        for (let ci = 0; ci < classes.length; ci++) {
          const c = classes[ci]!;
          visit(mi, nextPath, ci, c.id, (c.name ?? c.id).trim());
        }
        walkNs(n.namespaces, nextPath);
      }
    };
    walkNs(mods[mi]!.namespaces, []);
  }
}

function matchesClass(diagramId: string, diagramName: string, classifierId: string, classifierName: string): boolean {
  const cn = classifierName.trim();
  const slugName = slug(cn);
  if (diagramId && (diagramId === classifierId || diagramId === slugName)) return true;
  if (diagramName && (diagramName === cn || slug(diagramName) === classifierId)) return true;
  return false;
}

export type CodespaceClassifierHit = {
  codespaceBlockId: string;
  payload: MvModelCodespacePayload;
  mi: number;
  path: number[];
  ci: number;
};

export type CodespaceClassTreeItem = {
  codespaceBlockId: string;
  moduleId: string;
  moduleName: string;
  namespacePath: string[];
  classId: string;
  className: string;
};

export type FirstCodespaceRef = {
  codespaceBlockId: string;
  payload: MvModelCodespacePayload;
};

/** 仅在 ``markdown``（与 mv-view 同文件）内解析 modelRefs，定位第一个 codespace 块内匹配的类 */
export function findCodespaceClassifierForMermaidClass(
  markdown: string,
  modelRefs: string[],
  diagramClassId: string,
  diagramClassName: string,
): CodespaceClassifierHit | null {
  const { blocks } = parseMarkdownBlocks(markdown);
  const byId = new Map(blocks.map((b) => [b.payload.id, b] as const));

  const tryBlock = (b: ParsedFenceBlock | undefined): CodespaceClassifierHit | null => {
    if (!b || b.kind !== 'mv-model-codespace') return null;
    const payload = JSON.parse(JSON.stringify(b.payload)) as MvModelCodespacePayload;
    let found: { mi: number; path: number[]; ci: number } | null = null;
    walkClassifiers(payload, (mi, path, ci, id, name) => {
      if (found) return;
      if (matchesClass(diagramClassId, diagramClassName, id, name)) found = { mi, path, ci };
    });
    if (!found) return null;
    const { mi, path, ci } = found;
    return { codespaceBlockId: b.payload.id, payload, mi, path, ci };
  };

  for (const raw of modelRefs) {
    const s = raw.trim();
    if (!s) continue;
    if (s.startsWith('ref:')) continue;
    const hash = s.indexOf('#');
    const bid = hash === -1 ? s : s.slice(0, hash);
    const hit = tryBlock(byId.get(bid));
    if (hit) return hit;
  }
  return null;
}

/** 从当前 ``modelRefs`` 解析同文件第一个 codespace，并拉平出“模块/命名空间/类”树节点。 */
export function listCodespaceClassesForMermaidClass(
  markdown: string,
  modelRefs: string[],
): CodespaceClassTreeItem[] {
  const { blocks } = parseMarkdownBlocks(markdown);
  const byId = new Map(blocks.map((b) => [b.payload.id, b] as const));
  const out: CodespaceClassTreeItem[] = [];
  const seenCodespace = new Set<string>();

  for (const raw of modelRefs) {
    const s = raw.trim();
    if (!s || s.startsWith('ref:')) continue;
    const hash = s.indexOf('#');
    const bid = hash === -1 ? s : s.slice(0, hash);
    const b = byId.get(bid);
    if (!b || b.kind !== 'mv-model-codespace') continue;
    if (seenCodespace.has(b.payload.id)) continue;
    seenCodespace.add(b.payload.id);
    const payload = b.payload as MvModelCodespacePayload;
    for (const m of payload.modules ?? []) {
      const modId = m.id;
      const modName = (m.name ?? m.id).trim();
      const walkNs = (nodes: MvCodespaceNamespaceNode[] | undefined, nsPath: string[]) => {
        if (!nodes?.length) return;
        for (const n of nodes) {
          const curPath = [...nsPath, n.name];
          for (const c of n.classes ?? []) {
            out.push({
              codespaceBlockId: payload.id,
              moduleId: modId,
              moduleName: modName,
              namespacePath: curPath,
              classId: c.id,
              className: (c.name ?? c.id).trim(),
            });
          }
          walkNs(n.namespaces, curPath);
        }
      };
      walkNs(m.namespaces, []);
    }
  }
  const uniq = new Map<string, CodespaceClassTreeItem>();
  for (const row of out) {
    const k = `${row.codespaceBlockId}|${row.moduleId}|${row.namespacePath.join('.')}|${row.classId}`;
    if (!uniq.has(k)) uniq.set(k, row);
  }
  return [...uniq.values()];
}

/** 从 modelRefs 取第一个同文件 codespace（供“新增不存在 class 时同步写回 model”）。 */
export function getFirstCodespaceRefForMermaidClass(
  markdown: string,
  modelRefs: string[],
): FirstCodespaceRef | null {
  const { blocks } = parseMarkdownBlocks(markdown);
  const byId = new Map(blocks.map((b) => [b.payload.id, b] as const));
  for (const raw of modelRefs) {
    const s = raw.trim();
    if (!s || s.startsWith('ref:')) continue;
    const hash = s.indexOf('#');
    const bid = hash === -1 ? s : s.slice(0, hash);
    const b = byId.get(bid);
    if (!b || b.kind !== 'mv-model-codespace') continue;
    return {
      codespaceBlockId: b.payload.id,
      payload: JSON.parse(JSON.stringify(b.payload)) as MvModelCodespacePayload,
    };
  }
  return null;
}
