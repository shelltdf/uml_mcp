import { computed, type ComputedRef } from 'vue';
import { useAppLocale } from '../../composables/useAppLocale';
import { getSyncLocale } from '../../i18n/locale-sync';
import { zh, en, type MessageKey } from '../i18n/messages';

export type Locale = 'zh' | 'en';

function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

/** 与独立 uisvg-editor 一致接口；语言跟随 workbench `useAppLocale`。 */
export function useI18n(): {
  locale: ComputedRef<Locale>;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
} {
  const { locale: appLocale, setLocale: setAppLocale } = useAppLocale();
  const locale = computed<Locale>(() => (appLocale.value === 'en' ? 'en' : 'zh'));

  function t(key: MessageKey, params?: Record<string, string | number>): string {
    locale.value;
    const map = locale.value === 'zh' ? zh : en;
    const raw = map[key] ?? key;
    return interpolate(raw, params);
  }

  function setLocale(l: Locale) {
    setAppLocale(l);
  }

  return { locale, t, setLocale };
}

/** 非组件逻辑用：读当前同步语言（见 `locale-sync`）。 */
export function tStatic(key: MessageKey, params?: Record<string, string | number>): string {
  const l = getSyncLocale();
  const loc: Locale = l === 'en' ? 'en' : 'zh';
  const map = loc === 'zh' ? zh : en;
  return interpolate(map[key] ?? key, params);
}

/** workbench 已统一设置 document.lang；保留空实现以免误调破坏行为。 */
export function initDocumentLangFromStorage(): void {
  /* no-op: locale owned by useAppLocale */
}
