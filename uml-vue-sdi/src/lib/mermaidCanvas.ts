/**
 * Mermaid 渲染后 SVG 内的可交互图元命中与标签提取（类图 / 流程图等）。
 * 与 Mermaid 版本相关的 DOM 结构可能变化，此处采用宽松匹配。
 */

function isInteractiveGroup(g: SVGGElement): boolean {
  const cls = g.getAttribute('class') || '';
  const id = g.id || '';
  return (
    /\bnode\b/.test(cls) ||
    /\bcluster\b/.test(cls) ||
    /\bclassGroup\b/.test(cls) ||
    /\bedgeLabel\b/.test(cls) ||
    /\bedge\b/.test(cls) ||
    /classId|classDef|flowchart|state-|sequence|entity|activation|participant|gantt|pie|quadrant|block|package/.test(id)
  );
}

/**
 * 从事件目标向上查找第一个可视为「图中对象」的 `<g>`（用于点击选中）。
 */
export function findMermaidInteractiveGroup(start: Element | null): SVGGElement | null {
  let el: Element | null = start;
  for (let depth = 0; depth < 18 && el; depth++) {
    if (el.tagName === 'g') {
      const g = el as SVGGElement;
      if (isInteractiveGroup(g)) return g;
    }
    el = el.parentElement;
  }
  return null;
}

export function describeMermaidGroup(g: SVGGElement): { id: string; label: string } {
  const id = g.id || '';
  const texts = g.querySelectorAll('text');
  let label = '';
  if (texts.length) {
    label = Array.from(texts)
      .map((x) => x.textContent?.trim() || '')
      .filter(Boolean)
      .join(' · ');
  }
  return { id: id || label || 'element', label: label || id || '—' };
}

const SELECTED_CLASS = 'uml-svg-node--selected';

export function setMermaidGroupSelected(g: SVGGElement | null, selected: boolean): void {
  if (!g) return;
  if (selected) g.classList.add(SELECTED_CLASS);
  else g.classList.remove(SELECTED_CLASS);
}

export function clearMermaidSelectionInRoot(root: Element | null): void {
  if (!root) return;
  root.querySelectorAll(`g.${SELECTED_CLASS}`).forEach((el) => {
    el.classList.remove(SELECTED_CLASS);
  });
}

export function findGroupByNodeId(root: Element | null, nodeId: string): SVGGElement | null {
  if (!root || !nodeId) return null;
  const all = root.querySelectorAll('g');
  for (const g of all) {
    if (!(g instanceof SVGGElement)) continue;
    if (!isInteractiveGroup(g)) continue;
    if (g.id === nodeId) return g;
    const { id, label } = describeMermaidGroup(g);
    if (id === nodeId || label === nodeId) return g;
  }
  return null;
}
