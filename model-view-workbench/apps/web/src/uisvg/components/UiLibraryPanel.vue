<script setup lang="ts">
import { ref } from 'vue'
import DockFoldSection from './DockFoldSection.vue'
import { useI18n } from '../composables/useI18n'
import type { MessageKey } from '../i18n/messages'
import {
  BASIC_SHAPE_ITEMS,
  paletteTooltip,
  uisvgPaletteTagForBasicShape,
  uisvgPaletteTagForWindowsItem,
  WINDOWS_UI_GROUPS,
} from '../lib/windowsUiControls'
import { setPaletteWinDragData } from '../lib/paletteWinDrag'
import PaletteItemIcon from './PaletteItemIcon.vue'

const { t } = useI18n()

function onWinPaletteDragStart(e: DragEvent, controlId: string) {
  if (e.dataTransfer) {
    setPaletteWinDragData(e.dataTransfer, controlId)
    e.dataTransfer.effectAllowed = 'copy'
  }
}

function basicDisplayKey(id: 'rect' | 'text' | 'frame'): MessageKey {
  return `uiLib.basic.${id}`
}

function winDisplayKey(controlId: string): MessageKey {
  return `uiLib.win.${controlId}` as MessageKey
}

withDefaults(
  defineProps<{
    externalRailStrip?: boolean
  }>(),
  { externalRailStrip: false },
)

const emit = defineEmits<{
  'add-basic': [id: 'rect' | 'text' | 'frame']
  'add-windows': [controlId: string]
}>()

function onWinPaletteRowKeydown(e: KeyboardEvent, controlId: string) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('add-windows', controlId)
  }
}

const uiLibraryOpen = defineModel<boolean>({ default: true })
const railOpen = defineModel<boolean>('railOpen', { default: true })

/** 库内两区块独立折叠 */
const basicSectionOpen = ref(true)
const windowsSectionOpen = ref(true)
</script>

<template>
  <div class="ui-library">
    <DockFoldSection
      v-model="uiLibraryOpen"
      v-model:rail-open="railOpen"
      :external-rail-strip="externalRailStrip"
      :title="t('uiLib.title')"
      panel-id="dock-ui-library"
      root-class="ui-library-root"
      rail-edge="left"
    >
      <div class="ui-library-body">
        <section class="ui-library__section">
          <button
            type="button"
            class="ui-library__fold-head"
            :aria-expanded="basicSectionOpen"
            aria-controls="ui-lib-basic"
            @click="basicSectionOpen = !basicSectionOpen"
          >
            <span
              class="ui-library__chev"
              :class="{ 'ui-library__chev--collapsed': !basicSectionOpen }"
              aria-hidden="true"
              >▼</span
            >
            <span class="ui-library__fold-title">{{ t('uiLib.basicSection') }}</span>
          </button>
          <div
            v-show="basicSectionOpen"
            id="ui-lib-basic"
            class="ui-library__fold-body"
          >
            <div class="palette-buttons">
              <button
                v-for="item in BASIC_SHAPE_ITEMS"
                :key="item.id"
                type="button"
                class="win-button pal-btn pal-btn--with-icon"
                :title="`${t(basicDisplayKey(item.id))} · ${uisvgPaletteTagForBasicShape(item.id)}`"
                @click="emit('add-basic', item.id)"
              >
                <PaletteItemIcon variant="basic" :id="item.id" />
                <span class="pal-txt">
                  <span class="pal-txt-main">{{ t(basicDisplayKey(item.id)) }}</span>
                  <span class="pal-txt-sub pal-txt-sub--tag">{{ uisvgPaletteTagForBasicShape(item.id) }}</span>
                </span>
              </button>
            </div>
          </div>
        </section>

        <section class="ui-library__section ui-library__section--windows">
          <button
            type="button"
            class="ui-library__fold-head"
            :aria-expanded="windowsSectionOpen"
            aria-controls="ui-lib-windows"
            @click="windowsSectionOpen = !windowsSectionOpen"
          >
            <span
              class="ui-library__chev"
              :class="{ 'ui-library__chev--collapsed': !windowsSectionOpen }"
              aria-hidden="true"
              >▼</span
            >
            <span class="ui-library__fold-title">{{ t('uiLib.windowsSection') }}</span>
          </button>
          <div
            v-show="windowsSectionOpen"
            id="ui-lib-windows"
            class="ui-library__fold-body"
          >
            <p class="palette-hint">{{ t('uiLib.hint') }}</p>
            <template v-for="grp in WINDOWS_UI_GROUPS" :key="grp.titleKey">
              <h4 class="palette-subtitle">{{ t(grp.titleKey) }}</h4>
              <div class="palette-buttons palette-buttons--win">
                <!-- div+role：原生 button 上 draggable 在部分浏览器中无法启动拖放 -->
                <div
                  v-for="item in grp.items"
                  :key="item.id"
                  role="button"
                  tabindex="0"
                  class="win-button pal-btn pal-btn--win pal-btn--with-icon"
                  draggable="true"
                  :title="paletteTooltip(item)"
                  @click="emit('add-windows', item.id)"
                  @keydown="onWinPaletteRowKeydown($event, item.id)"
                  @dragstart="onWinPaletteDragStart($event, item.id)"
                >
                  <PaletteItemIcon variant="windows" :id="item.id" />
                  <span class="pal-txt">
                    <span class="pal-txt-main">{{ t(winDisplayKey(item.id)) }}</span>
                    <span class="pal-txt-sub pal-txt-sub--tag">{{ uisvgPaletteTagForWindowsItem(item) }}</span>
                  </span>
                </div>
              </div>
            </template>
          </div>
        </section>
      </div>
    </DockFoldSection>
  </div>
</template>

<style scoped>
.ui-library {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  height: 100%;
}

.ui-library:has(:deep(.dock-fold--collapsed)) {
  flex: 0 0 auto !important;
  height: auto !important;
  min-height: 0;
}

.ui-library-root {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ui-library-root:has(:deep(.dock-fold--collapsed)) {
  flex: 0 0 auto !important;
  height: auto !important;
  min-height: 0;
}

.ui-library-root.dock-fold-outer--rail-collapsed {
  flex: 0 0 auto;
  min-height: 0;
}

.ui-library-root :deep(.dock-fold.dock-fold--collapsed) {
  flex: 0 0 auto;
}

.ui-library-root :deep(.dock-fold__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ui-library-body {
  padding: 6px 0 10px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.ui-library__section {
  margin-bottom: 2px;
}

.ui-library__section--windows {
  border-top: 1px solid var(--win-border);
  padding-top: 4px;
  margin-top: 2px;
}

.ui-library__fold-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 5px 8px;
  border: none;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(to bottom, #f8f8f8, #ececec);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: #303030;
  text-align: left;
  cursor: pointer;
  user-select: none;
}

.ui-library__fold-head:hover {
  background: linear-gradient(to bottom, #eaf4ff, #e0e8f0);
}

.ui-library__fold-head:focus-visible {
  outline: 1px dotted #333;
  outline-offset: -2px;
}

.ui-library__chev {
  display: inline-block;
  width: 12px;
  font-size: 9px;
  line-height: 1;
  color: #505050;
  transform-origin: center;
  transition: transform 0.12s ease;
}

.ui-library__chev--collapsed {
  transform: rotate(-90deg);
}

.ui-library__fold-title {
  flex: 1;
  min-width: 0;
}

.ui-library__fold-body {
  padding-top: 6px;
}

.palette-hint {
  margin: 0 8px 8px;
  font-size: 10px;
  line-height: 1.45;
  color: #606060;
}

.palette-hint code {
  font-size: 9px;
  padding: 0 2px;
  background: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
}

.palette-subtitle {
  margin: 10px 8px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #505050;
}

.palette-subtitle:first-of-type {
  margin-top: 4px;
}

.palette-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-content: flex-start;
  padding: 0 8px;
}

.palette-buttons--win {
  padding-bottom: 4px;
}

.pal-btn {
  min-width: 72px;
}

.pal-btn--win {
  min-width: 0;
  max-width: 100%;
  font-size: 11px;
  padding: 4px 8px;
}

.pal-btn--with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-align: left;
}

.pal-txt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  gap: 1px;
}

.pal-txt-main {
  line-height: 1.2;
}

.pal-txt-sub {
  font-size: 9px;
  color: #606060;
  line-height: 1;
  font-weight: 400;
}

.pal-txt-sub--tag {
  font-family: ui-monospace, 'Cascadia Mono', 'Consolas', monospace;
  color: #505050;
}
</style>
