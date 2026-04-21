<script setup lang="ts">
import { onMounted, provide, ref } from 'vue'
import DockFoldSection from './DockFoldSection.vue'
import OutlineTreeItem from './OutlineTreeItem.vue'
import {
  OUTLINE_NAME_COL_DEFAULT,
  OUTLINE_NAME_COL_MAX,
  OUTLINE_NAME_COL_MIN,
  OUTLINE_NAME_COL_STORAGE_KEY,
  outlineColumnResizeKey,
} from '../lib/outlineColumnResize'
import { outlineTreeCollapseKey } from '../lib/outlineTreeCollapse'
import { useI18n } from '../composables/useI18n'
import type { OutlineNode } from '../lib/uisvgDocument'

withDefaults(
  defineProps<{
    nodes: OutlineNode[]
    selectedIds: string[]
    /** 为 true 时收起窄条由父级（如 LeftDockPanel）独立列渲染 */
    externalRailStrip?: boolean
  }>(),
  { selectedIds: () => [], externalRailStrip: false },
)

const { t } = useI18n()

const emit = defineEmits<{
  select: [id: string]
  frameInView: [id: string]
  reparent: [payload: { childId: string; parentId: string }]
}>()

const outlineOpen = defineModel<boolean>({ default: true })
const railOpen = defineModel<boolean>('railOpen', { default: true })

/** 折叠的节点 id（默认全部展开) */
const collapsedIds = ref<Set<string>>(new Set())

function toggleOutlineFold(id: string) {
  const next = new Set(collapsedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsedIds.value = next
}

provide(outlineTreeCollapseKey, {
  collapsedIds,
  toggle: toggleOutlineFold,
})

const headerColsRef = ref<HTMLElement | null>(null)

function clampColPct(n: number): number {
  return Math.min(OUTLINE_NAME_COL_MAX, Math.max(OUTLINE_NAME_COL_MIN, n))
}

const nameColumnPercent = ref(OUTLINE_NAME_COL_DEFAULT)

onMounted(() => {
  try {
    const raw = localStorage.getItem(OUTLINE_NAME_COL_STORAGE_KEY)
    if (raw !== null) {
      const n = Number.parseFloat(raw)
      if (Number.isFinite(n)) nameColumnPercent.value = clampColPct(n)
    }
  } catch {
    /* ignore */
  }
})

function persistColPct() {
  try {
    localStorage.setItem(OUTLINE_NAME_COL_STORAGE_KEY, String(nameColumnPercent.value))
  } catch {
    /* ignore */
  }
}

provide(outlineColumnResizeKey, { nameColumnPercent })

function onColResizeStart(e: MouseEvent) {
  e.preventDefault()
  const cols = headerColsRef.value
  if (!cols) return

  function move(ev: MouseEvent) {
    const rect = cols.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const pct = (x / rect.width) * 100
    nameColumnPercent.value = clampColPct(pct)
  }

  function up() {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    persistColPct()
  }

  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
</script>

<template>
  <DockFoldSection
    v-model="outlineOpen"
    v-model:rail-open="railOpen"
    :external-rail-strip="externalRailStrip"
    :title="t('dock.outline')"
    panel-id="dock-outline-body"
    root-class="outline-panel"
    rail-edge="left"
  >
    <div class="outline-tree-wrap">
      <div class="outline-header" role="presentation">
        <span class="outline-header__fold-spacer" aria-hidden="true" />
        <div ref="headerColsRef" class="outline-header__cols">
          <span
            id="outline-h-id"
            class="outline-header__cell outline-header__cell--id"
            :style="{ flex: `${nameColumnPercent} 1 0%` }"
          >{{ t('outline.columnId') }}</span>
          <div
            class="outline-col-resizer"
            role="separator"
            aria-orientation="vertical"
            :aria-label="t('outline.resizeColumns')"
            :title="t('outline.resizeColumns')"
            @mousedown="onColResizeStart"
          />
          <span
            id="outline-h-uisvg"
            class="outline-header__cell outline-header__cell--type"
            :style="{ flex: `${100 - nameColumnPercent} 1 0%` }"
          >{{ t('outline.columnUisvgType') }}</span>
        </div>
      </div>
      <ul class="outline-list" aria-labelledby="outline-h-id outline-h-uisvg">
        <OutlineTreeItem
          v-for="n in nodes"
          :key="n.id"
          :node="n"
          :selected-ids="selectedIds"
          :depth="0"
          @select="emit('select', $event)"
          @frame-in-view="emit('frameInView', $event)"
          @reparent="emit('reparent', $event)"
        />
      </ul>
    </div>
  </DockFoldSection>
</template>

<style scoped>
.outline-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/** ▼ 收起：高度仅标题行，把空间让给其它 dock */
.outline-panel:has(:deep(.dock-fold--collapsed)) {
  flex: 0 0 auto !important;
  height: auto !important;
  min-height: 0;
}

.outline-panel.dock-fold-outer--rail-collapsed {
  flex: 0 0 auto;
  min-height: 0;
}

.outline-panel :deep(.dock-fold.dock-fold--collapsed) {
  flex: 0 0 auto;
}

.outline-panel :deep(.dock-fold__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.outline-tree-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.outline-header {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  border-bottom: 1px solid var(--win-border);
  background: linear-gradient(to bottom, #f2f2f2, #ebebeb);
}

.outline-header__fold-spacer {
  flex: 0 0 18px;
  width: 18px;
  min-width: 18px;
}

.outline-header__cols {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 4px 6px 5px 2px;
}

.outline-header__cell {
  font-size: 10px;
  font-weight: 600;
  color: #505050;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.outline-col-resizer {
  flex: 0 0 5px;
  margin: 0 -1px;
  cursor: col-resize;
  align-self: stretch;
  border-radius: 1px;
  background: transparent;
}

.outline-col-resizer:hover {
  background: rgba(0, 120, 212, 0.18);
}

.outline-col-resizer:active {
  background: rgba(0, 120, 212, 0.28);
}

.outline-list {
  margin: 0;
  padding: 2px 0 4px;
  list-style: none;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

</style>
