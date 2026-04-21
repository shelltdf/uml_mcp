function stripXmlDeclaration(s: string): string {
  return s.replace(/<\?xml[^?]*\?>\s*/gi, '').trim()
}

/**
 * 在新窗口中渲染整份 SVG（类似 Qt Designer 的「预览」：仅展示设计稿，无编辑器装饰）。
 */
export function openUisvgPreviewWindow(svgMarkup: string): Window | null {
  const svg = stripXmlDeclaration(svgMarkup)
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UISVG 预览</title>
  <style>
    html, body { margin: 0; min-height: 100%; background: #c8c8c8; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      box-sizing: border-box;
      font-family: 'Segoe UI', 'Microsoft YaHei UI', system-ui, sans-serif;
    }
    .preview-wrap {
      background: #fff;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
      line-height: 0;
    }
    .preview-wrap svg { display: block; vertical-align: top; }
  </style>
</head>
<body>
  <div class="preview-wrap">${svg}</div>
</body>
</html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, 'uisvg-preview', 'noopener,noreferrer')
  if (w) {
    window.setTimeout(() => URL.revokeObjectURL(url), 120000)
  }
  return w
}
