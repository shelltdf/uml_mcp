import type { MindmapEdgeData, MindmapGraphState, MindmapNodeData, MindmapPayloadV0 } from './types';

function normalizeNodes(raw: unknown): MindmapNodeData[] {
  if (!Array.isArray(raw)) return [];
  const out: MindmapNodeData[] = [];
  for (let i = 0; i < raw.length; i++) {
    const n = raw[i];
    if (!n || typeof n !== 'object' || Array.isArray(n)) continue;
    const no = n as Record<string, unknown>;
    const id = typeof no.id === 'string' && no.id.trim() ? no.id.trim() : `n_${i + 1}`;
    const label = typeof no.label === 'string' ? no.label : id;
    const parentId = typeof no.parentId === 'string' && no.parentId.trim() ? no.parentId.trim() : null;
    const order = typeof no.order === 'number' && Number.isFinite(no.order) ? no.order : i;
    const collapsed = no.collapsed === true || undefined;
    const icon = typeof no.icon === 'string' ? no.icon : undefined;
    const note = typeof no.note === 'string' ? no.note : undefined;
    const textColor = typeof no.textColor === 'string' ? no.textColor : undefined;
    const bgColor = typeof no.bgColor === 'string' ? no.bgColor : undefined;
    const fontSize = typeof no.fontSize === 'number' && Number.isFinite(no.fontSize) ? no.fontSize : undefined;
    const borderStyle = no.borderStyle === 'square' || no.borderStyle === 'rounded' || no.borderStyle === 'bottom'
      ? no.borderStyle
      : undefined;
    const borderWidth = typeof no.borderWidth === 'number' && Number.isFinite(no.borderWidth) ? no.borderWidth : undefined;
    const borderColor = typeof no.borderColor === 'string' ? no.borderColor : undefined;
    out.push({ id, label, parentId, order, collapsed, icon, note, textColor, bgColor, fontSize, borderStyle, borderWidth, borderColor });
  }
  if (!out.length) {
    out.push({ id: 'root', label: 'Root', parentId: null, order: 0 });
  }
  const seen = new Set<string>();
  for (const n of out) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      continue;
    }
    let i = 2;
    while (seen.has(`${n.id}_${i}`)) i += 1;
    n.id = `${n.id}_${i}`;
    seen.add(n.id);
  }
  const idSet = new Set(out.map((n) => n.id));
  for (const n of out) {
    if (n.parentId && !idSet.has(n.parentId)) n.parentId = null;
  }
  if (!out.some((n) => n.parentId === null)) {
    out[0]!.parentId = null;
  }
  return out;
}

function buildEdges(nodes: MindmapNodeData[], rawEdges: unknown): MindmapEdgeData[] {
  if (Array.isArray(rawEdges)) {
    const out: MindmapEdgeData[] = [];
    for (let i = 0; i < rawEdges.length; i++) {
      const e = rawEdges[i];
      if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
      const eo = e as Record<string, unknown>;
      if (typeof eo.from !== 'string' || typeof eo.to !== 'string') continue;
      out.push({
        id: typeof eo.id === 'string' && eo.id.trim() ? eo.id.trim() : `e_${i + 1}`,
        from: eo.from,
        to: eo.to,
      });
    }
    if (out.length) return out;
  }
  return nodes
    .filter((n) => n.parentId)
    .map((n, i) => ({ id: `e_${i + 1}`, from: n.parentId!, to: n.id }));
}

export function parseMindmapPayloadText(text: string): MindmapGraphState {
  const src = (text ?? '').trim();
  if (!src) {
    return {
      nodes: [{ id: 'root', label: 'Root', parentId: null, order: 0 }],
      edges: [],
      panX: 0,
      panY: 0,
      scale: 1,
      theme: 'classic',
    };
  }
  try {
    const obj = JSON.parse(src) as MindmapPayloadV0;
    const nodes = normalizeNodes(obj?.nodes);
    const edges = buildEdges(nodes, obj?.edges);
    return {
      nodes,
      edges,
      panX: typeof obj?.view?.panX === 'number' ? obj.view.panX : 0,
      panY: typeof obj?.view?.panY === 'number' ? obj.view.panY : 0,
      scale: typeof obj?.view?.scale === 'number' ? obj.view.scale : 1,
      theme: typeof obj?.theme === 'string' && obj.theme.trim() ? obj.theme.trim() : 'classic',
    };
  } catch {
    return {
      nodes: [{ id: 'root', label: src.slice(0, 64) || 'Root', parentId: null, order: 0 }],
      edges: [],
      panX: 0,
      panY: 0,
      scale: 1,
      theme: 'classic',
    };
  }
}

export function serializeMindmapPayload(state: MindmapGraphState): string {
  const payload: MindmapPayloadV0 = {
    format: 'mv-mindmap-v0',
    nodes: state.nodes.map((n, idx) => ({
      id: n.id,
      label: n.label,
      parentId: n.parentId ?? undefined,
      order: Number.isFinite(n.order) ? n.order : idx,
      collapsed: n.collapsed === true || undefined,
      icon: n.icon || undefined,
      note: n.note || undefined,
      textColor: n.textColor || undefined,
      bgColor: n.bgColor || undefined,
      fontSize: Number.isFinite(n.fontSize ?? NaN) ? n.fontSize : undefined,
      borderStyle: n.borderStyle || undefined,
      borderWidth: Number.isFinite(n.borderWidth ?? NaN) ? n.borderWidth : undefined,
      borderColor: n.borderColor || undefined,
    })),
    edges: state.edges.map((e) => ({ id: e.id, from: e.from, to: e.to })),
    view: { panX: state.panX, panY: state.panY, scale: state.scale },
    theme: state.theme || 'classic',
  };
  return JSON.stringify(payload, null, 2);
}
