export type AppLocale = 'zh' | 'en';

export const LOCALE_STORAGE_KEY = 'mvwb-locale';

export function getInitialLocale(): AppLocale {
  try {
    const s = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (s === 'zh' || s === 'en') return s;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

export function applyDocumentLang(locale: AppLocale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
}
