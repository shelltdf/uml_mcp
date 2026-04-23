import type { InjectionKey, Ref } from 'vue'

/** UI 大纲树折叠状态（provide / inject） */
export interface OutlineTreeCollapseContext {
  collapsedIds: Ref<Set<string>>
  toggle: (id: string) => void
}

export const outlineTreeCollapseKey: InjectionKey<OutlineTreeCollapseContext> = Symbol('outlineTreeCollapse')
