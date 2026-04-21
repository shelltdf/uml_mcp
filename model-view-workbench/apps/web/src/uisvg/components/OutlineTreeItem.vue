<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import OutlineTreeItem from './OutlineTreeItem.vue'
import { outlineColumnResizeKey } from '../lib/outlineColumnResize'
import {
  outlineNodeMatchesAnySelection,
  UISVG_OUTLINE_ROOT_LOGICAL_ID,
  type OutlineNode,
} from '../lib/uisvgDocument'
import { outlineTreeCollapseKey } from '../lib/outlineTreeCollapse'
import { outlineNodeUisvgDisplayLine } from '../lib/uisvgMetaNode'
import { outlineFoldTitle, outlineItemTitle } from '../lib/propertyLabels'
import { OUTLINE_REPARENT_MIME } from '../lib/svgReparent'
import { isWinContainerUisvgLocalName } from '../lib/winFormContainers'

const props = withDefaults(
  defineProps<{
    node: OutlineNode
    selectedIds: string[]
    depth: number
  }>(),
  { selectedIds: () => [] },
)

const emit = defineEmits<{
  select: [id: string]
  /** 双击：在画布中居中并缩放以显示该对象 */
  frameInView: [id: string]
  /** 将 `childId` 对象根挂到当前行对应父级（虚拟根 → `#layer-root`） */
  reparent: [payload: { childId: string; parentId: string }]
}>()

const { t } = useI18n()

const collapseCtx = inject(outlineTreeCollapseKey, null)
const colResize = inject(outlineColumnResizeKey, null)

const nameColPct = computed(() => colResize?.nameColumnPercent.value ?? 52)
const typeColPct = computed(() => 100 - nameColPct.value)

const hasChildren = computed(() => !!props.node.children?.length)

const isCollapsed = computed(() => {
  if (!collapseCtx || !hasChildren.value) return false
  return collapseCtx.collapsedIds.value.has(props.node.id)
})

const uisvgType = computed(() => outlineNodeUisvgDisplayLine(props.node.uisvgLocalName))

function onFoldClick() {
  if (collapseCtx && hasChildren.value) {
    collapseCtx.toggle(props.node.id)
  }
}

const foldTitle = computed(() => outlineFoldTitle(isCollapsed.value, t))

const itemTitle = computed(() =>
  outlineItemTitle(
    {
      label: props.node.label,
      uisvgType: uisvgType.value,
      id: props.node.id,
    },
    t,
  ),
)

const isVirtualOutlineRoot = computed(() => props.node.id === UISVG_OUTLINE_ROOT_LOGICAL_ID)

const canDragOutlineRow = computed(
  () => !isVirtualOutlineRoot.value && props.node.id !== 'svg',
)

const isOutlineDropTarget = computed(
  () => isVirtualOutlineRoot.value || isWinContainerUisvgLocalName(props.node.uisvgLocalName),
)

const dropHighlight = ref(false)

function onOutlineDragStart(e: DragEvent) {
  if (!canDragOutlineRow.value) return
  e.dataTransfer?.setData(OUTLINE_REPARENT_MIME, props.node.id)
  e.dataTransfer!.effectAllowed = 'move'
}

function onOutlineDragEnd() {
  dropHighlight.value = false
}

function onOutlineDragOver(e: DragEvent) {
  if (!isOutlineDropTarget.value) return
  if (!e.dataTransfer?.types?.includes?.(OUTLINE_REPARENT_MIME)) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dropHighlight.value = true
}

function onOutlineDragLeave(e: DragEvent) {
  const rel = e.relatedTarget as Node | null
  const cur = e.currentTarget as HTMLElement
  if (rel && cur.contains(rel)) return
  dropHighlight.value = false
}

function onOutlineDrop(e: DragEvent) {
  dropHighlight.value = false
  if (!isOutlineDropTarget.value) return
  const childId = e.dataTransfer?.getData(OUTLINE_REPARENT_MIME)?.trim()
  if (!childId) return
  e.preventDefault()
  const parentId = isVirtualOutlineRoot.value ? 'layer-root' : props.node.id
  if (childId === parentId) return
  emit('reparent', { childId, parentId })
}
</script>

<template>
  <li class="outline-branch" :style="{ paddingLeft: `${depth * 14}px` }">
    <div class="outline-row">
      <button
        v-if="hasChildren"
        type="button"
        class="outline-fold"
        :class="{ 'outline-fold--collapsed': isCollapsed }"
        :aria-expanded="!isCollapsed"
        :title="foldTitle"
        @click.stop="onFoldClick"
      >
        <span class="outline-fold__glyph" aria-hidden="true">▼</span>
      </button>
      <span v-else class="outline-fold outline-fold--spacer" aria-hidden="true" />

      <div
        class="outline-item"
        :class="{
          active: outlineNodeMatchesAnySelection(node, selectedIds),
          'outline-item--drop': dropHighlight,
        }"
        :title="itemTitle"
        :draggable="canDragOutlineRow"
        @click.stop="emit('select', node.id)"
        @dblclick.stop="emit('frameInView', node.id)"
        @dragstart="onOutlineDragStart"
        @dragend="onOutlineDragEnd"
        @dragover="onOutlineDragOver"
        @dragleave="onOutlineDragLeave"
        @drop="onOutlineDrop"
      >
        <span
          class="outline-cell outline-cell--id"
          :style="{ flex: `${nameColPct} 1 0%` }"
        >{{ node.id }}</span>
        <span
          class="outline-cell outline-cell--uisvg"
          :style="{ flex: `${typeColPct} 1 0%` }"
        >{{ uisvgType }}</span>
      </div>
    </div>

    <ul v-if="hasChildren && !isCollapsed" class="outline-nested">
      <OutlineTreeItem
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :selected-ids="selectedIds"
        :depth="depth + 1"
        @select="emit('select', $event)"
        @frame-in-view="emit('frameInView', $event)"
        @reparent="emit('reparent', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.outline-branch {
  list-style: none;
  margin: 0;
  padding: 0;
}

.outline-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 22px;
}

.outline-fold {
  flex: 0 0 18px;
  width: 18px;
  min-width: 18px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #505050;
  border-radius: 2px;
}

.outline-fold:hover {
  background: var(--win-hover, #e5f3ff);
  color: #1a1a1a;
}

.outline-fold:focus-visible {
  outline: 1px solid #0078d4;
  outline-offset: -1px;
}

.outline-fold__glyph {
  display: inline-block;
  font-size: 9px;
  line-height: 1;
  transform-origin: 50% 45%;
  transition: transform 0.12s ease;
}

.outline-fold--collapsed .outline-fold__glyph {
  transform: rotate(-90deg);
}

.outline-fold--spacer {
  flex: 0 0 18px;
  width: 18px;
  min-width: 18px;
}

.outline-nested {
  margin: 0;
  padding: 0;
  list-style: none;
}

.outline-item {
  flex: 1;
  min-width: 0;
  padding: 4px 6px 4px 2px;
  cursor: default;
  display: flex;
  align-items: center;
  gap: 0;
}

.outline-item:hover {
  background: var(--win-hover);
}

.outline-item.active {
  background: var(--win-active);
}

.outline-item--drop {
  outline: 1px dashed #0078d4;
  outline-offset: -1px;
  background: #e5f3ff;
}

.outline-cell {
  font-size: 12px;
  line-height: 1.35;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.outline-cell--id {
  font-family: ui-monospace, 'Cascadia Mono', 'Consolas', monospace;
  font-weight: 600;
  font-size: 11px;
}

.outline-cell--uisvg {
  font-family: ui-monospace, 'Cascadia Mono', 'Consolas', monospace;
  font-size: 10px;
  color: #303030;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
