import type {
  MvCodespaceNamespaceNode,
  ParsedFenceBlock,
  MvMapPayload,
  MvModelCodespacePayload,
  MvModelInterfacePayload,
  MvModelKvPayload,
  MvModelSqlPayload,
  MvModelStructPayload,
  MvViewPayload,
} from '@mvwb/core';
import type { AppLocale } from './app-locale';
import { isZhDefaultModelBlockTitle } from './model-block-insert-defaults';

function countCodespaceNamespaceNodes(nodes: MvCodespaceNamespaceNode[] | undefined): number {
  if (!nodes?.length) return 0;
  let total = nodes.length;
  for (const ns of nodes) {
    total += countCodespaceNamespaceNodes(ns.namespaces);
  }
  return total;
}

function countCodespaceClassifiersInNamespaces(nodes: MvCodespaceNamespaceNode[] | undefined): number {
  if (!nodes?.length) return 0;
  let c = 0;
  for (const ns of nodes) {
    c += ns.classes?.length ?? 0;
    c += countCodespaceClassifiersInNamespaces(ns.namespaces);
  }
  return c;
}

/** 索引行 / 子标签：围栏语言之外的子类型摘要（随界面语言切换） */
export function fenceBlockSubtypeLabel(b: ParsedFenceBlock, locale: AppLocale): string {
  const en = locale === 'en';
  if (b.kind === 'mv-model-sql') {
    const p = b.payload as MvModelSqlPayload;
    const t = p.title?.trim() ?? '';
    const ids = p.tables.map((x) => x.id).join(', ');
    const fallback = en ? `SQL · ${p.tables.length} table(s) (${ids})` : `SQL · ${p.tables.length} 表 (${ids})`;
    if (!t) return fallback;
    if (en && isZhDefaultModelBlockTitle(b.kind, t)) return fallback;
    return t;
  }
  if (b.kind === 'mv-model-kv') {
    const p = b.payload as MvModelKvPayload;
    const t = p.title?.trim() ?? '';
    const fallback = en ? `KV · ${p.documents.length} doc(s)` : `KV · ${p.documents.length} 条`;
    if (!t) return fallback;
    if (en && isZhDefaultModelBlockTitle(b.kind, t)) return fallback;
    return t;
  }
  if (b.kind === 'mv-model-struct') {
    const p = b.payload as MvModelStructPayload;
    const t = p.title?.trim() ?? '';
    const fallback = `Struct · ${p.root.name}`;
    if (!t) return fallback;
    if (en && isZhDefaultModelBlockTitle(b.kind, t)) return fallback;
    return t;
  }
  if (b.kind === 'mv-model-codespace') {
    const p = b.payload as MvModelCodespacePayload;
    const t = p.title?.trim();
    const n = p.modules?.length ?? 0;
    let ns = 0;
    let cls = 0;
    for (const m of p.modules ?? []) {
      ns += countCodespaceNamespaceNodes(m.namespaces);
      cls += countCodespaceClassifiersInNamespaces(m.namespaces);
    }
    if (ns > 0 || cls > 0) {
      return (
        t ||
        (en
          ? `Codespace · ${n} module(s) · ${ns} NS · ${cls} class(es)`
          : `Codespace · ${n} 模块 · ${ns} NS · ${cls} 类`)
      );
    }
    return t || (en ? `Codespace · ${n} module(s)` : `Codespace · ${n} 模块`);
  }
  if (b.kind === 'mv-model-interface') {
    const p = b.payload as MvModelInterfacePayload;
    const t = p.title?.trim() ?? '';
    const n = p.endpoints?.length ?? 0;
    const fallback = en ? `API · ${n} endpoint(s)` : `接口 · ${n} 端点`;
    if (!t) return fallback;
    if (en && isZhDefaultModelBlockTitle(b.kind, t)) return fallback;
    return t;
  }
  if (b.kind === 'mv-view') {
    return (b.payload as MvViewPayload).kind;
  }
  if (b.kind === 'mv-map') {
    const p = b.payload as MvMapPayload;
    const n = p.rules?.length ?? 0;
    return n > 0 ? (en ? `Map · ${n} rule(s)` : `映射 · ${n} 条`) : en ? 'Map' : '映射';
  }
  return '—';
}
