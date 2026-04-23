/**
 * 将 Mermaid 类图节点与同文件 ``smw-model-codespace`` 中的 Classifier 对齐（供块画布双击打开浮窗）。
 */
import {
  parseMarkdownBlocks,
  type MvCodespaceClassEnum,
  type MvCodespaceClassMember,
  type MvCodespaceClassMethod,
  type MvCodespaceClassifier,
  type MvCodespaceNamespaceNode,
  type MvCodespaceProperty,
  type MvModelCodespacePayload,
  type ParsedFenceBlock,
} from '@smw/core';
import { slug } from '@smw/mermaid';
import { getNamespaceAtPath } from './codespace-canvas';

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

/** 严格：仅 codespace `classes[].id` 与类图节点 id 一致（避免跨 NS 重名误开第一个）。 */
function matchesClassifierIdStrict(diagramClassId: string, classifierId: string): boolean {
  return !!diagramClassId && diagramClassId === classifierId;
}

/**
 * 次要匹配：slug / 名称（仅在 strict 未命中时使用）。
 * 不包含 `diagramId === classifierId`，否则与 strict 重复且无意义。
 */
function matchesClassSecondary(
  diagramId: string,
  diagramName: string,
  classifierId: string,
  classifierName: string,
): boolean {
  const cn = classifierName.trim();
  const slugName = slug(cn);
  if (diagramId && diagramId === slugName) return true;
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
  attributeLines: string[];
  propertyLines: string[];
  enumLiteralLines: string[];
  methodLines: string[];
};

/** 将类图节点 id/名称解析为 codespace 中 `classes[].id`（首条匹配），供画布→model 同步。 */
export function resolveDiagramClassToCodespaceClassId(
  diagramClassId: string,
  diagramClassName: string,
  rows: CodespaceClassTreeItem[],
): string | null {
  for (const r of rows) {
    if (matchesClassifierIdStrict(diagramClassId, r.classId)) return r.classId;
  }
  for (const r of rows) {
    if (matchesClassSecondary(diagramClassId, diagramClassName, r.classId, r.className)) return r.classId;
  }
  return null;
}

export type FirstCodespaceRef = {
  codespaceBlockId: string;
  payload: MvModelCodespacePayload;
};

function visLead(v?: string): string {
  const t = (v ?? '').trim().toLowerCase();
  if (t === 'private') return '-';
  if (t === 'protected') return '#';
  if (t === 'package') return '~';
  return '+';
}

function fieldToAttrLine(m: MvCodespaceClassMember): string {
  const lead = visLead(m.visibility);
  const st = m.static ? '$' : '';
  const n = (m.name ?? '').trim() || 'member';
  const ty = (m.type ?? '').trim();
  if (ty) return `${lead}${st}${n}: ${ty}`;
  return `${lead}${st}${n}`;
}

function enumToLine(m: MvCodespaceClassEnum): string {
  const n = (m.name ?? '').trim() || 'ENUM';
  const vals = (m.literals ?? []).map((x) => x.trim()).filter(Boolean);
  if (!vals.length) {
    const val = (m.value ?? m.type ?? '').trim();
    return val ? `${n} = ${val}` : n;
  }
  return `${n}{ ${vals.join(', ')} }`;
}

function methodParamsToText(m: MvCodespaceClassMethod): string {
  if (!m.params?.length) return '';
  return m.params
    .map((p, i) => {
      const name = (p.name ?? '').trim() || `arg${i + 1}`;
      const type = (p.type ?? '').trim() || 'any';
      const cst = p.isConst ? 'const ' : '';
      const pass = p.passMode === 'reference' ? '&' : p.passMode === 'pointer' ? '*' : '';
      return `${cst}${type}${pass} ${name}`.trim();
    })
    .join(', ');
}

function methodToLine(m: MvCodespaceClassMethod): string {
  const lead = visLead(m.visibility);
  const st = m.static ? '$' : '';
  const sig = (m.signature ?? '').trim();
  const ptxt = methodParamsToText(m);
  const ret = (m.type ?? '').trim();
  const kind = (m.methodKind ?? 'normal').trim();
  const kindPrefix =
    kind && kind !== 'normal' ? `[${kind}] ` : '';
  if (ptxt) {
    const n = (m.name ?? '').trim() || 'method';
    const s = `${n}(${ptxt})`;
    return ret ? `${lead}${st}${kindPrefix}${s}: ${ret}`.trim() : `${lead}${st}${kindPrefix}${s}`.trim();
  }
  if (sig) {
    const s = sig.startsWith(m.name ?? '') ? sig : `${m.name}${sig.startsWith('(') ? '' : ' '}${sig}`;
    return ret ? `${lead}${st}${kindPrefix}${s}: ${ret}`.trim() : `${lead}${st}${kindPrefix}${s}`.trim();
  }
  const n = (m.name ?? '').trim() || 'method';
  return ret ? `${lead}${st}${kindPrefix}${n}(): ${ret}` : `${lead}${st}${kindPrefix}${n}()`;
}

function collectClassifierMemberLines(c: MvCodespaceClassifier): {
  attrs: string[];
  enums: string[];
  meths: string[];
} {
  const attrs = (c.members ?? []).map(fieldToAttrLine);
  const enums = (c.enums ?? []).map(enumToLine);
  const meths = (c.methods ?? []).map(methodToLine);
  return { attrs, enums, meths };
}

function propertyToLine(p: MvCodespaceProperty): string {
  const n = (p.name ?? '').trim() || 'property';
  const bf = (p.backingFieldName ?? '').trim();
  const ty = (p.type ?? '').trim();
  const g = p.hasGetter === false ? '' : 'get';
  const s = p.hasSetter === false ? '' : 'set';
  const gs = [g, s].filter(Boolean).join('/');
  const vis = (p.backingVisibility ?? 'private').trim();
  const left = bf ? `${vis} ${bf}` : `${vis} _${n}`;
  const right = ty ? `${n}: ${ty}` : n;
  return gs ? `${left} -> ${right} (${gs})` : `${left} -> ${right}`;
}

/** 仅在 ``markdown``（与 smw-view 同文件）内解析 modelRefs，定位第一个 codespace 块内匹配的类 */
export function findCodespaceClassifierForMermaidClass(
  markdown: string,
  modelRefs: string[],
  diagramClassId: string,
  diagramClassName: string,
): CodespaceClassifierHit | null {
  const { blocks } = parseMarkdownBlocks(markdown);
  const byId = new Map(blocks.map((b) => [b.payload.id, b] as const));

  const tryBlock = (b: ParsedFenceBlock | undefined): CodespaceClassifierHit | null => {
    if (!b || b.kind !== 'smw-model-codespace') return null;
    const payload = JSON.parse(JSON.stringify(b.payload)) as MvModelCodespacePayload;
    let found: { mi: number; path: number[]; ci: number } | null = null;
    walkClassifiers(payload, (mi, path, ci, id, name) => {
      if (found) return;
      if (matchesClassifierIdStrict(diagramClassId, id)) found = { mi, path, ci };
    });
    if (!found) {
      walkClassifiers(payload, (mi, path, ci, id, name) => {
        if (found) return;
        if (matchesClassSecondary(diagramClassId, diagramClassName, id, name)) found = { mi, path, ci };
      });
    }
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

/** 仅从 model 读取「一层」关联：继承目标（bases）与关联端点（命名空间 associations + 成员/属性 associatedClassifierId）。 */
export function collectOneHopRelatedClassifierIdsForPayload(
  payload: MvModelCodespacePayload,
  mi: number,
  path: number[],
  ci: number,
): { inheritanceIds: string[]; associationIds: string[] } {
  const ns = getNamespaceAtPath(payload, mi, path);
  const cls = ns?.classes?.[ci] as MvCodespaceClassifier | undefined;
  if (!cls) return { inheritanceIds: [], associationIds: [] };

  const inheritance = new Set<string>();
  for (const b of cls.bases ?? []) {
    if (b.relation !== 'generalization' && b.relation !== 'realization') continue;
    const t = (b.targetId ?? '').trim();
    if (t && t !== cls.id) inheritance.add(t);
  }

  const association = new Set<string>();
  const gatherMemberAssoc = (c: MvCodespaceClassifier) => {
    for (const m of c.members ?? []) {
      const tid = (m.associatedClassifierId ?? '').trim();
      if (tid && tid !== cls.id) association.add(tid);
    }
    for (const p of c.properties ?? []) {
      const tid = (p.associatedClassifierId ?? '').trim();
      if (tid && tid !== cls.id) association.add(tid);
    }
  };
  gatherMemberAssoc(cls);

  const walkNsAssoc = (nodes: MvCodespaceNamespaceNode[] | undefined) => {
    if (!nodes) return;
    for (const n of nodes) {
      for (const a of n.associations ?? []) {
        if (a.fromClassifierId === cls.id) {
          const tid = (a.toClassifierId ?? '').trim();
          if (tid && tid !== cls.id) association.add(tid);
        } else if (a.toClassifierId === cls.id) {
          const tid = (a.fromClassifierId ?? '').trim();
          if (tid && tid !== cls.id) association.add(tid);
        }
      }
      walkNsAssoc(n.namespaces);
    }
  };
  for (const mod of payload.modules ?? []) {
    walkNsAssoc(mod.namespaces);
  }

  return { inheritanceIds: [...inheritance], associationIds: [...association] };
}

/** 类图节点对应 Classifier 的一层相关类型（不递归）。 */
export function listOneHopRelatedClassifierIdsForDiagramClass(
  markdown: string,
  modelRefs: string[],
  diagramClassId: string,
  diagramClassName: string,
): { inheritanceIds: string[]; associationIds: string[] } | null {
  const hit = findCodespaceClassifierForMermaidClass(markdown, modelRefs, diagramClassId, diagramClassName);
  if (!hit) return null;
  return collectOneHopRelatedClassifierIdsForPayload(hit.payload, hit.mi, hit.path, hit.ci);
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
    if (!b || b.kind !== 'smw-model-codespace') continue;
    if (seenCodespace.has(b.payload.id)) continue;
    seenCodespace.add(b.payload.id);
    const payload = b.payload as MvModelCodespacePayload;
    for (const m of payload.modules ?? []) {
      const modId = m.id;
      const modName = (m.name ?? m.id).trim();
      const walkNs = (nodes: MvCodespaceNamespaceNode[] | undefined, nsPath: string[]) => {
        if (!nodes?.length) return;
        for (const n of nodes) {
          const nm = (n.name ?? '').trim();
          const curPath = nm ? [...nsPath, nm] : [...nsPath];
          for (const c of n.classes ?? []) {
            const { attrs, enums, meths } = collectClassifierMemberLines(c);
            const props: string[] = [];
            for (const p of c.properties ?? []) {
              props.push(propertyToLine(p));
            }
            out.push({
              codespaceBlockId: payload.id,
              moduleId: modId,
              moduleName: modName,
              namespacePath: curPath,
              classId: c.id,
              className: (c.name ?? c.id).trim(),
              attributeLines: attrs,
              propertyLines: props,
              enumLiteralLines: enums,
              methodLines: meths,
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
    if (!b || b.kind !== 'smw-model-codespace') continue;
    return {
      codespaceBlockId: b.payload.id,
      payload: JSON.parse(JSON.stringify(b.payload)) as MvModelCodespacePayload,
    };
  }
  return null;
}
