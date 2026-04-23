import { computed, ref } from 'vue';
import { applyDocumentLang, getInitialLocale, LOCALE_STORAGE_KEY, type AppLocale } from '../i18n/app-locale';
import { menuBarMessages } from '../i18n/menu-bar';
import { shellChromeMessages } from '../i18n/shell-chrome-messages';
import { setSyncLocale } from '../i18n/locale-sync';

const locale = ref<AppLocale>(getInitialLocale());
setSyncLocale(locale.value);
applyDocumentLang(locale.value);

export function useAppLocale() {
  const ui = computed(() => ({
    ...menuBarMessages[locale.value],
    ...shellChromeMessages[locale.value],
  }));

  function setLocale(next: AppLocale) {
    locale.value = next;
    setSyncLocale(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
    applyDocumentLang(next);
  }

  return { locale, ui, setLocale };
}
