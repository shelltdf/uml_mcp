/** 基于内存中已解码字符串的启发式元信息（浏览器内无法还原原始字节流）。 */

export type TextFileEncodingKey = 'utf8' | 'utf8bom';
export type TextFileLineEndingKey = 'crlf' | 'lf' | 'cr' | 'mixed' | 'none';
export type TextFileIndentKey = 'tab' | 'space2' | 'space4' | 'mixed' | 'unknown';

export interface TextFileMetaRaw {
  encodingKey: TextFileEncodingKey;
  lineEndingKey: TextFileLineEndingKey;
  indentKey: TextFileIndentKey;
  endianKey: 'na_utf8_text';
  crlf: number;
  lf: number;
  cr: number;
}

export function analyzeTextContent(content: string): TextFileMetaRaw {
  const encodingKey: TextFileEncodingKey =
    content.length > 0 && content.charCodeAt(0) === 0xfeff ? 'utf8bom' : 'utf8';

  let crlf = 0;
  let lf = 0;
  let cr = 0;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\r' && content[i + 1] === '\n') {
      crlf += 1;
      i += 1;
    } else if (ch === '\n') {
      lf += 1;
    } else if (ch === '\r') {
      cr += 1;
    }
  }

  const total = crlf + lf + cr;
  let lineEndingKey: TextFileLineEndingKey;
  if (total === 0) lineEndingKey = 'none';
  else if (crlf > 0 && lf === 0 && cr === 0) lineEndingKey = 'crlf';
  else if (lf > 0 && crlf === 0 && cr === 0) lineEndingKey = 'lf';
  else if (cr > 0 && crlf === 0 && lf === 0) lineEndingKey = 'cr';
  else lineEndingKey = 'mixed';

  const lines = content.split(/\r\n|\n|\r/);
  let tabLines = 0;
  let space2 = 0;
  let space4 = 0;
  let otherSpaces = 0;

  for (const line of lines.slice(0, 60)) {
    const m = line.match(/^[\t ]+/);
    if (!m) continue;
    const w = m[0];
    if (w.includes('\t')) {
      tabLines += 1;
      continue;
    }
    if (!/^ +$/.test(w)) {
      otherSpaces += 1;
      continue;
    }
    const n = w.length;
    if (n >= 4 && n % 4 === 0) space4 += 1;
    else if (n >= 2 && n % 2 === 0) space2 += 1;
    else otherSpaces += 1;
  }

  const samples = tabLines + space2 + space4 + otherSpaces;
  let indentKey: TextFileIndentKey;
  if (samples === 0) {
    indentKey = 'unknown';
  } else {
    const max = Math.max(tabLines, space2, space4, otherSpaces);
    const winners: string[] = [];
    if (tabLines === max) winners.push('tab');
    if (space4 === max) winners.push('s4');
    if (space2 === max) winners.push('s2');
    if (otherSpaces === max) winners.push('other');
    if (winners.length !== 1) {
      indentKey = 'mixed';
    } else if (winners[0] === 'tab') {
      indentKey = 'tab';
    } else if (winners[0] === 's4') {
      indentKey = 'space4';
    } else if (winners[0] === 's2') {
      indentKey = 'space2';
    } else {
      indentKey = 'mixed';
    }
  }

  return {
    encodingKey,
    lineEndingKey,
    indentKey,
    endianKey: 'na_utf8_text',
    crlf,
    lf,
    cr,
  };
}
