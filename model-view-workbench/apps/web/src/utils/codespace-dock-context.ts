import type {
  MvCodespaceClassifier,
  MvCodespaceClassifierBase,
  MvModelCodespacePayload,
} from '@mvwb/core';
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
}

export type CsDockSelection = { t: 'meta' } | CodespaceSvgPick;

function emptyLabel(v: string | undefined | null, empty = '（未填）'): string {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t : empty;
}

function trunc(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function basesSummary(bases: MvCodespaceClassifierBase[] | undefined): string {
  if (!bases?.length) return '（无）';
  return bases.map((b) => `${b.relation}→${b.targetId}`).join('；');
}

/** 从模块根沿 path 拼面包屑（模块名 › NS › …） */
function namespaceBreadcrumb(payload: MvModelCodespacePayload, mi: number, path: number[]): string {
  const mod = payload.modules[mi];
  const parts: string[] = [mod?.name?.trim() ? mod.name : `模块[${mi}]`];
  if (!mod?.namespaces?.length || !path.length) return parts.join(' › ');
  let list = mod.namespaces;
  for (const idx of path) {
    const n = list[idx];
    if (!n) break;
    parts.push(n.name);
    list = n.namespaces ?? [];
  }
  return parts.join(' › ');
}

function formatSummary(s: CsDockSelection, p: MvModelCodespacePayload): string {
  if (s.t === 'meta') return '块与工作区';
  if (s.t === 'module') {
    const m = p.modules[s.mi];
    return m ? `模块 · ${m.name}` : '模块';
  }
  if (s.t === 'ns') {
    const n = getNamespaceAtPath(p, s.mi, s.path);
    return n ? `命名空间 · ${n.name}` : '命名空间';
  }
  if (s.t === 'class') {
    const c = getNamespaceAtPath(p, s.mi, s.path)?.classes?.[s.ci];
    return c ? `类 · ${c.name}` : '类';
  }
  if (s.t === 'var') {
    const v = getNamespaceAtPath(p, s.mi, s.path)?.variables?.[s.vi];
    return v ? `变量 · ${v.name}` : '变量';
  }
  if (s.t === 'fn') {
    const f = getNamespaceAtPath(p, s.mi, s.path)?.functions?.[s.fi];
    return f ? `函数 · ${f.name}` : '函数';
  }
  const mac = getNamespaceAtPath(p, s.mi, s.path)?.macros?.[s.maci];
  return mac ? `宏 · ${mac.name}` : '宏';
}

function formatLines(s: CsDockSelection, p: MvModelCodespacePayload): CodespaceDockPropLine[] {
  const lines: CodespaceDockPropLine[] = [];
  const push = (label: string, value: string) => lines.push({ label, value });

  if (s.t === 'meta') {
    push('节点类型', '块与工作区');
    push('块 id', p.id);
    push('title', emptyLabel(p.title));
    push('workspaceRoot', emptyLabel(p.workspaceRoot));
    push('模块数', String(p.modules?.length ?? 0));
    return lines;
  }

  if (s.t === 'module') {
    const m = p.modules[s.mi];
    if (!m) {
      push('节点类型', '模块');
      push('错误', `模块索引 ${s.mi} 无效`);
      return lines;
    }
    push('节点类型', '模块');
    push('id', m.id);
    push('name', m.name);
    push('path', emptyLabel(m.path));
    push('role', emptyLabel(m.role));
    push('notes', emptyLabel(m.notes));
    push('顶层命名空间数', String(m.namespaces?.length ?? 0));
    return lines;
  }

  if (s.t === 'ns') {
    const n = getNamespaceAtPath(p, s.mi, s.path);
    push('节点类型', '命名空间');
    push('层级', namespaceBreadcrumb(p, s.mi, s.path));
    push('path 索引', s.path.length ? s.path.join(' / ') : '（顶层）');
    if (!n) {
      push('错误', '无法解析该命名空间节点');
      return lines;
    }
    push('id', n.id);
    push('name', n.name);
    push('qualifiedName', emptyLabel(n.qualifiedName));
    push('notes', emptyLabel(n.notes));
    push('子命名空间', String(n.namespaces?.length ?? 0));
    push('类', String(n.classes?.length ?? 0));
    push('变量', String(n.variables?.length ?? 0));
    push('函数', String(n.functions?.length ?? 0));
    push('宏', String(n.macros?.length ?? 0));
    push('关联', String(n.associations?.length ?? 0));
    return lines;
  }

  const ns = getNamespaceAtPath(p, s.mi, s.path);
  if (!ns) {
    push('错误', '父命名空间无效');
    return lines;
  }

  if (s.t === 'class') {
    const c: MvCodespaceClassifier | undefined = ns.classes?.[s.ci];
    push('节点类型', 'Classifier（类 / 接口 / 结构）');
    push('层级', namespaceBreadcrumb(p, s.mi, s.path));
    if (!c) {
      push('错误', `类索引 ${s.ci} 无效`);
      return lines;
    }
    push('id', c.id);
    push('name', c.name);
    push('kind', emptyLabel(c.kind, '（未标，默认 class）'));
    push('qualifiedName', emptyLabel(c.qualifiedName));
    push('stereotype', emptyLabel(c.stereotype));
    push('abstract', c.abstract === true ? '是' : c.abstract === false ? '否' : '（未填）');
    push('notes', emptyLabel(c.notes));
    const tp = c.templateParams?.filter(Boolean).join(', ');
    push('templateParams', emptyLabel(tp));
    push('bases', basesSummary(c.bases));
    push('成员 members', String(c.members?.length ?? 0));
    return lines;
  }

  if (s.t === 'var') {
    const v = ns.variables?.[s.vi];
    push('节点类型', '变量');
    push('层级', namespaceBreadcrumb(p, s.mi, s.path));
    if (!v) {
      push('错误', `变量索引 ${s.vi} 无效`);
      return lines;
    }
    push('id', v.id);
    push('name', v.name);
    push('type', emptyLabel(v.type));
    push('notes', emptyLabel(v.notes));
    return lines;
  }

  if (s.t === 'fn') {
    const f = ns.functions?.[s.fi];
    push('节点类型', '函数');
    push('层级', namespaceBreadcrumb(p, s.mi, s.path));
    if (!f) {
      push('错误', `函数索引 ${s.fi} 无效`);
      return lines;
    }
    push('id', f.id);
    push('name', f.name);
    push('signature', emptyLabel(f.signature));
    push('notes', emptyLabel(f.notes));
    return lines;
  }

  const mac = ns.macros?.[s.maci];
  push('节点类型', '宏');
  push('层级', namespaceBreadcrumb(p, s.mi, s.path));
  if (!mac) {
    push('错误', `宏索引 ${s.maci} 无效`);
    return lines;
  }
  push('id', mac.id);
  push('name', mac.name);
  push('params', emptyLabel(mac.params));
  push('notes', emptyLabel(mac.notes));
  const def = mac.definitionSnippet?.trim();
  push('definitionSnippet', def ? trunc(def, 200) : '（未填）');
  return lines;
}

/** 供 `CodespaceCanvasEditor` 同步到主窗口属性 Dock */
export function buildCodespaceDockContext(
  selection: CsDockSelection,
  payload: MvModelCodespacePayload,
): CodespaceDockContextPayload {
  return {
    summary: formatSummary(selection, payload),
    lines: formatLines(selection, payload),
  };
}
