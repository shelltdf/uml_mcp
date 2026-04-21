import type { InjectionKey, Ref } from 'vue'

/** 标识（DOM id）列占比（约 25–75），UISVG 类型列为 100 - 该值；localStorage 键名仍含 `name` 以兼容旧版 */
export type OutlineColumnResizeContext = {
  nameColumnPercent: Ref<number>
}

export const outlineColumnResizeKey: InjectionKey<OutlineColumnResizeContext> =
  Symbol('outlineColumnResize')

export const OUTLINE_NAME_COL_STORAGE_KEY = 'uisvg-outline-name-col-pct'
export const OUTLINE_NAME_COL_MIN = 25
export const OUTLINE_NAME_COL_MAX = 75
export const OUTLINE_NAME_COL_DEFAULT = 52
