import type { Extension } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';

/** 与下拉选项 value 一致；不含 auto（由 Tab.textDockLanguage 空值表示）。 */
export type TextDockLanguageId =
  | 'plain'
  | 'markdown'
  | 'javascript'
  | 'typescript'
  | 'tsx'
  | 'jsx'
  | 'json'
  | 'yaml'
  | 'cpp'
  | 'python'
  | 'xml'
  | 'css'
  | 'html'
  | 'vue';

export function inferLanguageFromPath(path: string): TextDockLanguageId {
  const base = path.split(/[/\\]/).pop() ?? path;
  const lower = base.toLowerCase();

  if (
    lower.endsWith('.md') ||
    lower.endsWith('.mdx') ||
    lower.endsWith('.markdown')
  ) {
    return 'markdown';
  }
  if (lower.endsWith('.ts')) return 'typescript';
  if (lower.endsWith('.tsx')) return 'tsx';
  if (lower.endsWith('.jsx')) return 'jsx';
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return 'javascript';
  }
  if (lower.endsWith('.vue')) return 'vue';
  if (lower.endsWith('.json') || lower.endsWith('.jsonc')) return 'json';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
  if (lower.endsWith('.py') || lower.endsWith('.pyw') || lower.endsWith('.pyi')) {
    return 'python';
  }
  if (
    lower.endsWith('.css') ||
    lower.endsWith('.scss') ||
    lower.endsWith('.sass') ||
    lower.endsWith('.less')
  ) {
    return 'css';
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (
    lower.endsWith('.xml') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.xsd') ||
    lower.endsWith('.xsl') ||
    lower.endsWith('.plist')
  ) {
    return 'xml';
  }
  if (/\.(cpp|cc|cxx|hpp|hh|hxx|h\+\+|inl)$/i.test(lower)) return 'cpp';
  if (lower.endsWith('.c') || lower.endsWith('.h')) return 'cpp';

  return 'plain';
}

export function resolveLanguageId(
  path: string,
  manual: string | null | undefined,
): TextDockLanguageId {
  if (manual == null || manual === '' || manual === 'auto') {
    return inferLanguageFromPath(path);
  }
  return manual as TextDockLanguageId;
}

export function getLanguageExtension(id: TextDockLanguageId): Extension {
  switch (id) {
    case 'plain':
      return [];
    case 'markdown':
      return markdown();
    case 'javascript':
      return javascript();
    case 'typescript':
      return javascript({ typescript: true });
    case 'tsx':
      return javascript({ typescript: true, jsx: true });
    case 'jsx':
      return javascript({ jsx: true });
    case 'json':
      return json();
    case 'yaml':
      return yaml();
    case 'cpp':
      return cpp();
    case 'python':
      return python();
    case 'xml':
      return xml();
    case 'css':
      return css();
    case 'html':
    case 'vue':
      return html();
    default:
      return [];
  }
}
