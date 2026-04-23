import * as htmlToImage from 'html-to-image';
import Vditor from 'vditor';
import { smwVditorPreviewOptions } from './vditor-smw-preview-options';

const VDITOR_VER = '3.11.2';

export function stripMdExtension(rel: string): string {
  const base = rel.split(/[/\\]/).pop() || 'document';
  return base.replace(/\.md$/i, '') || 'document';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function triggerDownload(filename: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export function exportMarkdownFile(baseName: string, markdown: string) {
  triggerDownload(`${baseName}.md`, new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
}

/**
 * 在离屏容器中渲染 Markdown（与预览区 Vditor 选项一致），供 HTML/PNG/SVG 导出。
 */
export async function renderMarkdownOffscreen(markdown: string): Promise<{
  /** `.vditor-reset` 或回退为内层容器，用于位图/SVG 截图 */
  captureRoot: HTMLElement;
  /** 渲染后的 HTML 片段（放入独立 HTML 的 body） */
  bodyHtml: string;
  cleanup: () => void;
}> {
  const host = document.createElement('div');
  host.setAttribute('data-smw-export-host', '1');
  host.style.cssText =
    'position:fixed;left:-12000px;top:0;width:min(920px,100vw);max-width:920px;background:#fff;overflow:visible;pointer-events:none;';
  document.body.appendChild(host);
  const inner = document.createElement('div');
  inner.className = 'md-preview-root smw-export-inner';
  host.appendChild(inner);
  await Vditor.preview(inner, markdown, smwVditorPreviewOptions);
  const captureRoot = (inner.querySelector('.vditor-reset') as HTMLElement) ?? inner;
  return {
    captureRoot,
    bodyHtml: inner.innerHTML,
    cleanup: () => host.remove(),
  };
}

export type ExportVisualOpts = {
  /** 已用 Vditor.preview 渲染好的 `.vditor-reset`（与中间列预览 DOM 一致）；不传则离屏渲染 `markdown` */
  previewRoot?: HTMLElement | null;
};

export async function exportStandaloneHtml(
  markdown: string,
  baseName: string,
  pageTitle: string,
  visual?: ExportVisualOpts,
): Promise<void> {
  let bodyHtml: string;
  let cleanup: () => void;
  const root = visual?.previewRoot ?? null;
  if (root) {
    bodyHtml = root.outerHTML;
    cleanup = () => {};
  } else {
    const r = await renderMarkdownOffscreen(markdown);
    bodyHtml = r.bodyHtml;
    cleanup = r.cleanup;
  }
  try {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(pageTitle)}</title>
  <link rel="stylesheet" href="https://unpkg.com/vditor@${VDITOR_VER}/dist/index.css"/>
  <style>body{margin:0;padding:16px;background:#fff;}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
    triggerDownload(`${baseName}.html`, new Blob([html], { type: 'text/html;charset=utf-8' }));
  } finally {
    cleanup();
  }
}

function expandForCapture(el: HTMLElement): () => void {
  const prevH = el.style.height;
  const prevW = el.style.width;
  const prevO = el.style.overflow;
  el.style.height = `${Math.max(el.scrollHeight, 1)}px`;
  el.style.width = `${Math.max(el.scrollWidth, 400)}px`;
  el.style.overflow = 'visible';
  return () => {
    el.style.height = prevH;
    el.style.width = prevW;
    el.style.overflow = prevO;
  };
}

/**
 * Vditor.preview 会异步插入 Mermaid SVG，scrollHeight 会阶跃增大；稳定后再截图才完整。
 */
async function waitForStableScrollBox(
  node: HTMLElement,
  opts?: { timeoutMs?: number; pollMs?: number; stableRounds?: number },
): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? 12000;
  const pollMs = opts?.pollMs ?? 160;
  const stableRounds = opts?.stableRounds ?? 5;
  const t0 = performance.now();
  let last = -1;
  let stable = 0;
  while (performance.now() - t0 < timeoutMs) {
    void node.offsetHeight;
    const h = node.scrollHeight;
    if (h === last) stable += 1;
    else {
      stable = 0;
      last = h;
    }
    if (last >= 0 && stable >= stableRounds) return;
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

function capturePixelSize(el: HTMLElement): { width: number; height: number } {
  const width = Math.ceil(Math.max(el.scrollWidth, el.clientWidth, 400));
  const height = Math.ceil(Math.max(el.scrollHeight, el.clientHeight, 1));
  return { width, height };
}

async function flushLayout(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

export async function exportPng(
  markdown: string,
  baseName: string,
  visual?: ExportVisualOpts,
): Promise<void> {
  let captureRoot: HTMLElement;
  let cleanup: () => void;
  const live = visual?.previewRoot ?? null;
  if (live) {
    captureRoot = live;
    cleanup = () => {};
  } else {
    const r = await renderMarkdownOffscreen(markdown);
    captureRoot = r.captureRoot;
    cleanup = r.cleanup;
  }
  try {
    await waitForStableScrollBox(captureRoot);
    const restore = expandForCapture(captureRoot);
    try {
      await flushLayout();
      const { width, height } = capturePixelSize(captureRoot);
      const dataUrl = await htmlToImage.toPng(captureRoot, {
        pixelRatio: 2,
        cacheBust: true,
        width,
        height,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      triggerDownload(`${baseName}.png`, blob);
    } finally {
      restore();
    }
  } finally {
    cleanup();
  }
}

export async function exportSvg(
  markdown: string,
  baseName: string,
  visual?: ExportVisualOpts,
): Promise<void> {
  let captureRoot: HTMLElement;
  let cleanup: () => void;
  const live = visual?.previewRoot ?? null;
  if (live) {
    captureRoot = live;
    cleanup = () => {};
  } else {
    const r = await renderMarkdownOffscreen(markdown);
    captureRoot = r.captureRoot;
    cleanup = r.cleanup;
  }
  try {
    await waitForStableScrollBox(captureRoot);
    const restore = expandForCapture(captureRoot);
    try {
      await flushLayout();
      const { width, height } = capturePixelSize(captureRoot);
      const dataUrl = await htmlToImage.toSvg(captureRoot, {
        pixelRatio: 2,
        cacheBust: true,
        width,
        height,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      triggerDownload(`${baseName}.svg`, blob);
    } finally {
      restore();
    }
  } finally {
    cleanup();
  }
}
