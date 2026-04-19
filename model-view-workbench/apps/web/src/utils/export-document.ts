import * as htmlToImage from 'html-to-image';
import Vditor from 'vditor';

const VDITOR_VER = '3.11.2';

const previewOpts = {
  mode: 'light' as const,
  lang: 'zh_CN' as const,
  markdown: {
    toc: true,
    mark: false,
    footnotes: true,
    autoSpace: true,
  },
};

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
  host.setAttribute('data-mvwb-export-host', '1');
  host.style.cssText =
    'position:fixed;left:-12000px;top:0;width:min(920px,100vw);max-width:920px;background:#fff;overflow:visible;pointer-events:none;';
  document.body.appendChild(host);
  const inner = document.createElement('div');
  inner.className = 'md-preview-root mvwb-export-inner';
  host.appendChild(inner);
  await Vditor.preview(inner, markdown, previewOpts);
  const captureRoot = (inner.querySelector('.vditor-reset') as HTMLElement) ?? inner;
  return {
    captureRoot,
    bodyHtml: inner.innerHTML,
    cleanup: () => host.remove(),
  };
}

export async function exportStandaloneHtml(markdown: string, baseName: string, pageTitle: string): Promise<void> {
  const { bodyHtml, cleanup } = await renderMarkdownOffscreen(markdown);
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

export async function exportPng(markdown: string, baseName: string): Promise<void> {
  const { captureRoot, cleanup } = await renderMarkdownOffscreen(markdown);
  const restore = expandForCapture(captureRoot);
  try {
    const dataUrl = await htmlToImage.toPng(captureRoot, { pixelRatio: 2, cacheBust: true });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    triggerDownload(`${baseName}.png`, blob);
  } finally {
    restore();
    cleanup();
  }
}

export async function exportSvg(markdown: string, baseName: string): Promise<void> {
  const { captureRoot, cleanup } = await renderMarkdownOffscreen(markdown);
  const restore = expandForCapture(captureRoot);
  try {
    const dataUrl = await htmlToImage.toSvg(captureRoot, { pixelRatio: 2, cacheBust: true });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    triggerDownload(`${baseName}.svg`, blob);
  } finally {
    restore();
    cleanup();
  }
}
