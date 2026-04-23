import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import {
  applyThemeToDocument,
  getStoredThemePreference,
  resolveEffectiveTheme,
  setStoredThemePreference,
  type ThemePreference,
} from '../theme/themePreference'

/**
 * 主题偏好（默认 `system` = 跟随操作系统 `prefers-color-scheme`）。
 * 启动时已在 `main.ts` 调用 `applyThemeToDocument`，此处同步媒体查询以便系统主题切换时更新。
 */
export function useTheme(): {
  themePreference: Ref<ThemePreference>
  effectiveTheme: Ref<'light' | 'dark'>
  setThemePreference: (p: ThemePreference) => void
} {
  const themePreference = ref<ThemePreference>(getStoredThemePreference())
  const effectiveTheme = computed(() => resolveEffectiveTheme(themePreference.value))

  function setThemePreference(p: ThemePreference) {
    themePreference.value = p
    setStoredThemePreference(p)
    applyThemeToDocument(p)
  }

  onMounted(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (themePreference.value === 'system') applyThemeToDocument('system')
    }
    mql.addEventListener('change', onChange)
    onUnmounted(() => mql.removeEventListener('change', onChange))
  })

  return { themePreference, effectiveTheme, setThemePreference }
}
