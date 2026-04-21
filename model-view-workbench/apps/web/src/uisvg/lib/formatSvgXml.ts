/**
 * 将单个 SVG/XML 元素片段格式化为带缩进的文本（用于只读预览）。
 * 解析失败时原样返回。
 */

function escapeTextContent(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttrValue(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function serializeElement(el: Element, depth: number, indentUnit: string): string {
  const pad = indentUnit.repeat(depth)
  const tag = el.tagName
  let attrStr = ''
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i]
    attrStr += ` ${a.name}="${escapeAttrValue(a.value)}"`
  }

  const childNodes = Array.from(el.childNodes)
  const meaningful = childNodes.filter((n) => {
    if (n.nodeType === Node.TEXT_NODE) return !!(n.textContent && n.textContent.trim())
    if (n.nodeType === Node.ELEMENT_NODE) return true
    return false
  })

  if (meaningful.length === 0) {
    return `${pad}<${tag}${attrStr} />`
  }

  if (meaningful.length === 1 && meaningful[0].nodeType === Node.TEXT_NODE) {
    const t = (meaningful[0] as Text).textContent ?? ''
    return `${pad}<${tag}${attrStr}>${escapeTextContent(t)}</${tag}>`
  }

  let out = `${pad}<${tag}${attrStr}>`
  for (const n of childNodes) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      out += '\n' + serializeElement(n as Element, depth + 1, indentUnit)
    } else if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) {
      out += '\n' + indentUnit.repeat(depth + 1) + escapeTextContent(n.textContent.trim())
    }
  }
  out += `\n${pad}</${tag}>`
  return out
}

/**
 * @param xml `XMLSerializer` 得到的单元素 `outerXML` 片段
 * @param indentSize 每层缩进空格数
 */
export function formatSvgFragmentIndented(xml: string, indentSize = 2): string {
  const t = xml.trim()
  if (!t) return ''
  const indentUnit = ' '.repeat(Math.max(1, indentSize))
  const parser = new DOMParser()
  let doc: Document
  try {
    doc = parser.parseFromString(t, 'image/svg+xml')
  } catch {
    return xml
  }
  if (doc.getElementsByTagName('parsererror').length > 0) return xml
  const root = doc.documentElement
  if (!root || root.tagName.toLowerCase() === 'parsererror') return xml
  try {
    return serializeElement(root, 0, indentUnit)
  } catch {
    return xml
  }
}
