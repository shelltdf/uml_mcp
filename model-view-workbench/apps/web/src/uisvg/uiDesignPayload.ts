import { createEmptyDocument } from './lib/uisvgDocument';

/**
 * 将围栏内 `mv-view` 的 payload 规范为 UISVG 可编辑的 SVG 字符串。
 * - 已是 `<svg` 开头的视为成品 SVG；
 * - `{"svg":"..."}` 取 svg 字段；
 * - 旧占位 JSON（如 `screens`）或无 `svg` 时退回空文档。
 */
export function normalizeUiDesignPayloadFromFence(payload: unknown): string {
  if (payload === undefined || payload === null) return createEmptyDocument();
  if (typeof payload === 'string') {
    const t = payload.trim();
    if (!t) return createEmptyDocument();
    if (t.startsWith('<')) return payload;
    try {
      const o = JSON.parse(t) as unknown;
      return normalizeUiDesignPayloadFromFence(o);
    } catch {
      return createEmptyDocument();
    }
  }
  if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    if (typeof o.svg === 'string' && o.svg.trim()) return o.svg;
    return createEmptyDocument();
  }
  return createEmptyDocument();
}
