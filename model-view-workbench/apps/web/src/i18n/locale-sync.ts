import type { AppLocale } from './app-locale';
import { getInitialLocale } from './app-locale';

/** 供非 Vue 组合式上下文（纯函数）读取当前界面语言；由 `useAppLocale` 在初始化与 `setLocale` 时同步。 */
let syncLocale: AppLocale = getInitialLocale();

export function setSyncLocale(next: AppLocale): void {
  syncLocale = next;
}

export function getSyncLocale(): AppLocale {
  return syncLocale;
}
