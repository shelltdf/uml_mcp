import type {
  MvCodespaceClassifier,
  MvCodespaceClassifierBase,
  MvModelCodespacePayload,
} from '@mvwb/core';
import type { AppLocale } from '../i18n/app-locale';
import { codespaceCanvasMessages, type CodespaceCanvasMessages } from '../i18n/codespace-canvas-messages';
import { getNamespaceAtPath } from './codespace-canvas';
import type { CodespaceSvgPick } from './codespace-svg-layout';

/** 画布选中 → 右侧属性 Dock 展示用 */
export interface CodespaceDockPropLine {
  label: string;
  value: string;
}

export interface CodespaceDockContextPayload {
  summary: string;
  lines: CodespaceDockPropLine[];
  /** 嵌入画布所在文档路径与围栏 id；主窗口据此写入对应 canvas tab，避免仅依赖当前激活会话时丢失更新 */
  dockSourceRelPath?: string;
  dockSourceBlockId?: string;
}

export type CsDockSelection = { t: 'meta' } | CodespaceSvgPick;

function emptyLabel(v: string | undefined | null, empty: string): string {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t : empty;
}

function trunc(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function basesSummary(bases: MvCodespaceClassifierBase[] | undefined, M: CodespaceCanvasMessages): string {
  if (!bases?.length) return M.dockBasesNone;
  return bases.map((b) => `${b.relation}→${b.targetId}`).join(M.dockBasesJoin);
}

function resolveClassBySelection(
  payload: MvModelCodespacePayload,
  s: Extract<CsDockSelection, { t: 'class' }>,
): MvCodespaceClassifier | undefined {
  const ns = getNamespaceAtPath(payload, s.mi, s.path);
  let c = ns?.classes?.[s.ci];
  for (const idx of s.classPath ?? []) c = c?.classes?.[idx];
  return c;
}

function resolveEnumBySelection(
  payload: MvModelCodespacePayload,
  s: Extract<CsDockSelection, { t: 'enum' }>,
) {
  const ns = getNamespaceAtPath(payload, s.mi, s.path);
  if (!ns) return undefined;
  if (s.ci === undefined) return ns.enums?.[s.eni];
  let c = ns.classes?.[s.ci];
  for (const idx of s.classPath ?? []) c = c?.classes?.[idx];
  return c?.enums?.[s.eni];
}

/** 从模块根沿 path 拼面包屑（模块名 › NS › …） */
function namespaceBreadcrumb(
  payload: MvModelCodespacePayload,
  mi: number,
  path: number[],
  M: CodespaceCanvasMessages,
): string {
  const mod = payload.modules[mi];
  const parts: string[] = [mod?.name?.trim() ? mod.name : M.formatModuleFallback(mi)];
  if (!mod?.namespaces?.length || !path.length) return parts.join(M.dockBreadcrumbSep);
  let list = mod.namespaces;
  for (const idx of path) {
    const n = list[idx];
    if (!n) break;
    parts.push(n.name);
    list = n.namespaces ?? [];
  }
  return parts.join(M.dockBreadcrumbSep);
}

function formatSummary(s: CsDockSelection, p: MvModelCodespacePayload, M: CodespaceCanvasMessages): string {
  if (s.t === 'meta') return M.dockSummaryMeta;
  if (s.t === 'module') {
    const m = p.modules[s.mi];
    return m ? M.formatModuleLabel(m.name) : M.dockSummaryModuleBare;
  }
  if (s.t === 'ns') {
    const n = getNamespaceAtPath(p, s.mi, s.path);
    return n ? M.formatNsLabel(n.name) : M.dockSummaryNsBare;
  }
  if (s.t === 'class') {
    const c = resolveClassBySelection(p, s);
    return c ? M.formatClassLabel(c.name) : M.dockSummaryClassBare;
  }
  if (s.t === 'enum') {
    const e = resolveEnumBySelection(p, s);
    return e ? M.formatEnumLabel(e.name) : M.dockSummaryEnumBare;
  }
  if (s.t === 'var') {
    const v = getNamespaceAtPath(p, s.mi, s.path)?.variables?.[s.vi];
    return v ? M.formatVarLabel(v.name) : M.dockSummaryVarBare;
  }
  if (s.t === 'fn') {
    const f = getNamespaceAtPath(p, s.mi, s.path)?.functions?.[s.fi];
    return f ? M.formatFnLabel(f.name) : M.dockSummaryFnBare;
  }
  const mac = getNamespaceAtPath(p, s.mi, s.path)?.macros?.[s.maci];
  return mac ? M.formatMacroLabel(mac.name) : M.dockSummaryMacroBare;
}

function formatLines(s: CsDockSelection, p: MvModelCodespacePayload, M: CodespaceCanvasMessages): CodespaceDockPropLine[] {
  const lines: CodespaceDockPropLine[] = [];
  const push = (label: string, value: string) => lines.push({ label, value });

  if (s.t === 'meta') {
    push(M.dockNodeType, M.dockBlockWorkspace);
    push(M.dockBlockId, p.id);
    push(M.dockTitle, emptyLabel(p.title, M.dockUnset));
    push(M.dockWorkspaceRoot, emptyLabel(p.workspaceRoot, M.dockUnset));
    push(M.dockModuleCount, String(p.modules?.length ?? 0));
    return lines;
  }

  if (s.t === 'module') {
    const m = p.modules[s.mi];
    if (!m) {
      push(M.dockNodeType, M.dockModule);
      push(M.dockError, M.dockInvalidModuleIndex(s.mi));
      return lines;
    }
    push(M.dockNodeType, M.dockModule);
    push('id', m.id);
    push('name', m.name);
    push('path', emptyLabel(m.path, M.dockUnset));
    push('role', emptyLabel(m.role, M.dockUnset));
    push('notes', emptyLabel(m.notes, M.dockUnset));
    push(M.dockTopLevelNsCount, String(m.namespaces?.length ?? 0));
    return lines;
  }

  if (s.t === 'ns') {
    const n = getNamespaceAtPath(p, s.mi, s.path);
    push(M.dockNodeType, M.dockSummaryNsBare);
    push(M.dockHierarchy, namespaceBreadcrumb(p, s.mi, s.path, M));
    push(M.dockPathIndices, s.path.length ? s.path.join(' / ') : M.dockTopLevel);
    if (!n) {
      push(M.dockError, M.dockCannotResolveNs);
      return lines;
    }
    push('id', n.id);
    push('name', n.name);
    push('qualifiedName', emptyLabel(n.qualifiedName, M.dockUnset));
    push('notes', emptyLabel(n.notes, M.dockUnset));
    push(M.dockChildNsCount, String(n.namespaces?.length ?? 0));
    push(M.dockClassCount, String(n.classes?.length ?? 0));
    push(M.dockVarCount, String(n.variables?.length ?? 0));
    push(M.dockFnCount, String(n.functions?.length ?? 0));
    push(M.dockMacroCount, String(n.macros?.length ?? 0));
    push(M.dockAssocCount, String(n.associations?.length ?? 0));
    return lines;
  }

  const ns = getNamespaceAtPath(p, s.mi, s.path);
  if (!ns) {
    push(M.dockError, M.dockParentNsInvalid);
    return lines;
  }

  if (s.t === 'class') {
    const c: MvCodespaceClassifier | undefined = resolveClassBySelection(p, s);
    push(M.dockNodeType, M.dockClassifierNode);
    push(M.dockHierarchy, namespaceBreadcrumb(p, s.mi, s.path, M));
    if (!c) {
      push(M.dockError, M.dockInvalidClassIndex(s.ci));
      return lines;
    }
    push('id', c.id);
    push('name', c.name);
    push('kind', emptyLabel(c.kind, M.dockKindUnsetClass));
    push('qualifiedName', emptyLabel(c.qualifiedName, M.dockUnset));
    push('stereotype', emptyLabel(c.stereotype, M.dockUnset));
    push(
      'abstract',
      c.abstract === true ? M.dockYes : c.abstract === false ? M.dockNo : M.dockUnset,
    );
    push('notes', emptyLabel(c.notes, M.dockUnset));
    const tp = c.templateParams?.filter(Boolean).join(', ');
    push('templateParams', emptyLabel(tp, M.dockUnset));
    push('bases', basesSummary(c.bases, M));
    push(
      M.dockMembersCount,
      String((c.members?.length ?? 0) + (c.methods?.length ?? 0) + (c.enums?.length ?? 0)),
    );
    return lines;
  }

  if (s.t === 'var') {
    const v = ns.variables?.[s.vi];
    push(M.dockNodeType, M.dockSummaryVarBare);
    push(M.dockHierarchy, namespaceBreadcrumb(p, s.mi, s.path, M));
    if (!v) {
      push(M.dockError, M.dockInvalidVarIndex(s.vi));
      return lines;
    }
    push('id', v.id);
    push('name', v.name);
    push('type', emptyLabel(v.type, M.dockUnset));
    push('notes', emptyLabel(v.notes, M.dockUnset));
    return lines;
  }

  if (s.t === 'enum') {
    const e = resolveEnumBySelection(p, s);
    push(M.dockNodeType, M.dockSummaryEnumBare);
    push(M.dockHierarchy, namespaceBreadcrumb(p, s.mi, s.path, M));
    if (!e) {
      push(M.dockError, M.dockInvalidEnumIndex(s.eni));
      return lines;
    }
    push('name', e.name);
    push('values', e.literals?.length ? e.literals.join(', ') : M.dockUnset);
    push('type', emptyLabel(e.type, M.dockUnset));
    push('notes', emptyLabel(e.notes, M.dockUnset));
    return lines;
  }

  if (s.t === 'fn') {
    const f = ns.functions?.[s.fi];
    push(M.dockNodeType, M.dockSummaryFnBare);
    push(M.dockHierarchy, namespaceBreadcrumb(p, s.mi, s.path, M));
    if (!f) {
      push(M.dockError, M.dockInvalidFnIndex(s.fi));
      return lines;
    }
    push('id', f.id);
    push('name', f.name);
    push('signature', emptyLabel(f.signature, M.dockUnset));
    push('notes', emptyLabel(f.notes, M.dockUnset));
    return lines;
  }

  const mac = ns.macros?.[s.maci];
  push(M.dockNodeType, M.dockSummaryMacroBare);
  push(M.dockHierarchy, namespaceBreadcrumb(p, s.mi, s.path, M));
  if (!mac) {
    push(M.dockError, M.dockInvalidMacroIndex(s.maci));
    return lines;
  }
  push('id', mac.id);
  push('name', mac.name);
  push('params', emptyLabel(mac.params, M.dockUnset));
  push('notes', emptyLabel(mac.notes, M.dockUnset));
  const def = mac.definitionSnippet?.trim();
  push('definitionSnippet', def ? trunc(def, 200) : M.dockUnset);
  return lines;
}

/** 供 `CodespaceCanvasEditor` 同步到主窗口属性 Dock */
export function buildCodespaceDockContext(
  selection: CsDockSelection,
  payload: MvModelCodespacePayload,
  locale: AppLocale = 'zh',
): CodespaceDockContextPayload {
  const M = codespaceCanvasMessages[locale];
  return {
    summary: formatSummary(selection, payload, M),
    lines: formatLines(selection, payload, M),
  };
}
