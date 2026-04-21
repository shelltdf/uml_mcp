<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DockRailTab from './DockRailTab.vue'
import OutlinePanel from './OutlinePanel.vue'
import UiLibraryPanel from './UiLibraryPanel.vue'
import { useI18n } from '../composables/useI18n'
import type { OutlineNode } from '../lib/uisvgDocument'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

defineProps<{
  nodes: OutlineNode[]
  selectedIds: string[]
}>()

const { t } = useI18n()

const emit = defineEmits<{
  select: [id: string]
  frameInView: [id: string]
  reparent: [payload: { childId: string; parentId: string }]
  'add-basic': [id: 'rect' | 'text' | 'frame']
  'add-windows': [controlId: string]
  'update:allLeftRailsCollapsed': [collapsed: boolean]
}>()

/** ▼ 内容展开 */
const leftOutlineOpen = ref(true)
const leftUiLibraryOpen = ref(true)
/** 收起到左侧边条 */
const leftOutlineRailOpen = ref(true)
const leftUiLibraryRailOpen = ref(true)

/** 仅两条 dock：大纲 | UI 库，一条横向分割 */
const leftPane1Px = ref(160)

const leftDockHostRef = ref<HTMLElement | null>(null)

const allLeftRailsCollapsed = computed(
  () => !leftOutlineRailOpen.value && !leftUiLibraryRailOpen.value,
)

const hasLeftRailStrip = computed(
  () => !leftOutlineRailOpen.value || !leftUiLibraryRailOpen.value,
)

watch(
  allLeftRailsCollapsed,
  (v) => {
    emit('update:allLeftRailsCollapsed', v)
  },
  { immediate: true },
)

const leftPane1Style = computed(() => {
  if (!leftOutlineOpen.value) return {}
  if (leftUiLibraryRailOpen.value && leftUiLibraryOpen.value) {
    return { height: `${leftPane1Px.value}px`, flex: '0 0 auto' }
  }
  return { flex: '1 1 auto', minHeight: `${leftPane1Px.value}px` }
})

const leftPane2Style = computed(() => {
  if (!leftUiLibraryOpen.value) return {}
  return { flex: '1 1 auto', minHeight: '120px' }
})

function onLeftDockSplit(e: MouseEvent) {
  e.preventDefault()
  if (!leftOutlineRailOpen.value || !leftUiLibraryRailOpen.value) return
  const startY = e.clientY
  const start1 = leftPane1Px.value
  const el = leftDockHostRef.value
  if (!el) return
  const SPLIT = 5
  const min1 = 72
  const minLib = 120
  const total = el.clientHeight

  function move(ev: MouseEvent) {
    const dy = ev.clientY - startY
    const max1 = total - SPLIT - minLib
    leftPane1Px.value = clamp(Math.round(start1 + dy), min1, Math.max(min1, max1))
  }
  function up() {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

function expandAllRails() {
  leftOutlineRailOpen.value = true
  leftUiLibraryRailOpen.value = true
}

defineExpose({ expandAllRails, leftDockHostRef })
</script>

<template>
  <div ref="leftDockHostRef" class="left-dock-panel">
    <aside
      v-if="hasLeftRailStrip"
      class="left-dock-panel__rail-strip"
      aria-label="已收起的面板"
    >
      <DockRailTab
        v-if="!leftOutlineRailOpen"
        :title="t('dock.outline')"
        rail-edge="left"
        @click="leftOutlineRailOpen = true"
      />
      <DockRailTab
        v-if="!leftUiLibraryRailOpen"
        :title="t('dock.uiLibrary')"
        rail-edge="left"
        @click="leftUiLibraryRailOpen = true"
      />
    </aside>

    <div
      class="left-dock-panel__main"
      :class="{ 'left-dock-panel__main--empty': allLeftRailsCollapsed }"
    >
      <template v-if="leftOutlineRailOpen">
        <div
          class="dock-pane dock-pane--left-third"
          :class="{ 'dock-pane--v-collapsed': !leftOutlineOpen }"
          :style="leftPane1Style"
        >
          <OutlinePanel
            v-model="leftOutlineOpen"
            v-model:rail-open="leftOutlineRailOpen"
            :nodes="nodes"
            :selected-ids="selectedIds"
            external-rail-strip
            @select="emit('select', $event)"
            @frame-in-view="emit('frameInView', $event)"
            @reparent="emit('reparent', $event)"
          />
        </div>
      </template>

      <div
        v-show="leftOutlineRailOpen && leftUiLibraryRailOpen"
        class="dock-splitter dock-splitter--h dock-splitter--in-left"
        role="separator"
        aria-orientation="horizontal"
        aria-label="调整 UI 大纲与 UI 库区域高度"
        tabindex="0"
        @mousedown="onLeftDockSplit($event)"
      />

      <template v-if="leftUiLibraryRailOpen">
        <div
          class="dock-pane dock-pane--left-third"
          :class="{
            'dock-pane--fill': leftUiLibraryOpen,
            'dock-pane--v-collapsed': !leftUiLibraryOpen,
          }"
          :style="leftPane2Style"
        >
          <UiLibraryPanel
            v-model="leftUiLibraryOpen"
            v-model:rail-open="leftUiLibraryRailOpen"
            external-rail-strip
            @add-basic="emit('add-basic', $event)"
            @add-windows="emit('add-windows', $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.left-dock-panel {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.left-dock-panel__rail-strip {
  flex: 0 0 18px;
  width: 18px;
  min-width: 18px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  align-self: stretch;
  border-right: 1px solid var(--win-border);
  background: var(--win-panel);
}

.left-dock-panel__main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-dock-panel__main--empty {
  flex: 0 0 0;
  width: 0;
  min-width: 0;
  overflow: hidden;
}

.dock-pane--left-third {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.dock-pane--v-collapsed {
  flex: 0 0 auto;
  height: auto;
  overflow: visible;
}

.dock-pane--left-third:not(.dock-pane--v-collapsed):not(.dock-pane--fill) {
  flex-shrink: 0;
}

.dock-pane--fill {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dock-splitter--in-left {
  flex-shrink: 0;
  background: linear-gradient(to bottom, #e4e4e4, #d4d4d4);
  z-index: 2;
  height: 5px;
  cursor: ns-resize;
  border-top: 1px solid #f8f8f8;
  border-bottom: 1px solid #a0a0a0;
}

.dock-splitter--in-left:hover,
.dock-splitter--in-left:focus-visible {
  background: linear-gradient(to bottom, #d4eaff, #b8d4f0);
  outline: none;
}
</style>
