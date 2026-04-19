/** 工作台「预览」与导出离屏渲染共用的 Vditor.preview 参数 */
export const mvwbVditorPreviewOptions = {
  mode: 'light' as const,
  lang: 'zh_CN' as const,
  markdown: {
    toc: true,
    mark: false,
    footnotes: true,
    autoSpace: true,
  },
};
