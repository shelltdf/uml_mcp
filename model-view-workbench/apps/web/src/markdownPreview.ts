import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * 将 Markdown 转为可安全插入页面的 HTML（经 DOMPurify 消毒）。
 */
export function renderMarkdownSafe(src: string): string {
  const raw = marked.parse(src, { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
