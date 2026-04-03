import { computed, ref, type Ref } from 'vue';

/** 与 CSS transform `translate(panX, panY) scale(scale)`、`transform-origin: 0 0` 一致：屏幕坐标 ≈ 世界坐标 * scale + pan */
export function useCanvasViewport(viewportRef: Ref<HTMLElement | null>) {
  const scale = ref(1);
  const panX = ref(0);
  const panY = ref(0);
  const isPanning = ref(false);
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;

  const zoomPercent = computed(() => `${Math.round(scale.value * 100)}%`);

  function onWheel(e: WheelEvent): void {
    const el = viewportRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const prev = scale.value;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const next = Math.min(4, Math.max(0.25, prev + delta));
    if (next === prev) return;
    e.preventDefault();
    const k = next / prev;
    panX.value = cx - k * (cx - panX.value);
    panY.value = cy - k * (cy - panY.value);
    scale.value = next;
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 1) return;
    e.preventDefault();
    isPanning.value = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panOriginX = panX.value;
    panOriginY = panY.value;
    try {
      viewportRef.value?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isPanning.value) return;
    panX.value = panOriginX + (e.clientX - panStartX);
    panY.value = panOriginY + (e.clientY - panStartY);
  }

  function onPointerUp(e: PointerEvent): void {
    if (!isPanning.value) return;
    isPanning.value = false;
    try {
      viewportRef.value?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  /** 还原：缩放 100%，以当前视口中心为锚 */
  function resetZoom(): void {
    const el = viewportRef.value;
    if (!el) {
      scale.value = 1;
      panX.value = 0;
      panY.value = 0;
      return;
    }
    const rect = el.getBoundingClientRect();
    const vx = rect.width / 2;
    const vy = rect.height / 2;
    const prev = scale.value;
    const next = 1;
    const k = next / prev;
    panX.value = vx - k * (vx - panX.value);
    panY.value = vy - k * (vy - panY.value);
    scale.value = next;
  }

  /** 原点：不改变缩放，使内容包围盒中心与视口中心对齐 */
  function originToContentCenter(bounds: { minX: number; minY: number; maxX: number; maxY: number }): void {
    const el = viewportRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const s = scale.value;
    const vx = rect.width / 2;
    const vy = rect.height / 2;
    panX.value = vx - cx * s;
    panY.value = vy - cy * s;
  }

  /** 适应：缩放并平移使包围盒落在视口内（含边距） */
  function zoomToFit(bounds: { minX: number; minY: number; maxX: number; maxY: number }, margin = 48): void {
    const el = viewportRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bw = Math.max(1, bounds.maxX - bounds.minX);
    const bh = Math.max(1, bounds.maxY - bounds.minY);
    const s = Math.min(
      (rect.width - 2 * margin) / bw,
      (rect.height - 2 * margin) / bh,
      4,
    );
    const next = Math.max(0.25, s);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    scale.value = next;
    panX.value = rect.width / 2 - cx * next;
    panY.value = rect.height / 2 - cy * next;
  }

  const transformStyle = computed(
    () => `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  );

  return {
    scale,
    panX,
    panY,
    isPanning,
    zoomPercent,
    transformStyle,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetZoom,
    originToContentCenter,
    zoomToFit,
  };
}
