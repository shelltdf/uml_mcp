import type { ClassDef, ClassPositions } from '../../utils/uml-class-payload';

export class UmlCanvasInteractionService {
  public clientToWorld(
    clientX: number,
    clientY: number,
    viewport: HTMLElement | null,
    panX: number,
    panY: number,
    scale: number,
  ): { x: number; y: number } {
    if (!viewport) return { x: 0, y: 0 };
    const r = viewport.getBoundingClientRect();
    return {
      x: (clientX - r.left - panX) / scale,
      y: (clientY - r.top - panY) / scale,
    };
  }

  public classIdAtWorldPoint(
    wx: number,
    wy: number,
    classes: ClassDef[],
    positions: ClassPositions,
    classBoxSize: (c: ClassDef) => { w: number; h: number },
  ): string | null {
    for (let i = classes.length - 1; i >= 0; i--) {
      const c = classes[i]!;
      const p = positions[c.id] ?? { x: 0, y: 0 };
      const { w, h } = classBoxSize(c);
      if (wx >= p.x && wx <= p.x + w && wy >= p.y && wy <= p.y + h) return c.id;
    }
    return null;
  }
}
