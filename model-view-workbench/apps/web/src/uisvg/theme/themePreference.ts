/** 用户选择：浅色 / 深色 / 跟随操作系统 */
export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'uisvg-editor-theme'

export function getStoredThemePreference(): ThemePreference {
  const s = localStorage.getItem(STORAGE_KEY)
  if (s === 'light' || s === 'dark' || s === 'system') return s
  return 'system'
}

export function setStoredThemePreference(p: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, p)
}

export function resolveEffectiveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'light') return 'light'
  if (pref === 'dark') return 'dark'
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 将解析后的亮/暗应用到 `document.documentElement[data-theme]` */
export function applyThemeToDocument(pref: ThemePreference): void {
  if (typeof document === 'undefined') return
  const eff = resolveEffectiveTheme(pref)
  document.documentElement.setAttribute('data-theme', eff)
  document.documentElement.style.colorScheme = eff === 'dark' ? 'dark' : 'light'
}
