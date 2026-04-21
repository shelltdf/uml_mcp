<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import type { CanvasSettings } from '../lib/uisvgDocument'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  settings: CanvasSettings
  /** 标题栏文案（由 AppShell 传入当前语言） */
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  apply: [value: CanvasSettings]
}>()

const width = ref(1200)
const height = ref(800)
const grid = ref(16)
const dpi = ref(96)

watch(
  () => props.settings,
  (s) => {
    width.value = s.width
    height.value = s.height
    grid.value = s.grid
    dpi.value = s.dpi
  },
  { immediate: true, deep: true },
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const s = props.settings
      width.value = s.width
      height.value = s.height
      grid.value = s.grid
      dpi.value = s.dpi
    }
  },
)

const preview = computed(() => ({
  width: Math.max(16, Math.round(width.value)),
  height: Math.max(16, Math.round(height.value)),
  grid: Math.max(1, Math.round(grid.value)),
  dpi: Math.max(1, Math.round(dpi.value)),
}))

function close() {
  emit('update:modelValue', false)
}

function onOk() {
  emit('apply', preview.value)
  close()
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="csd-backdrop"
      role="presentation"
      @mousedown="onBackdrop"
    >
      <div class="csd-dialog" role="dialog" aria-labelledby="csd-title" aria-modal="true">
        <div class="csd-caption">
          <span id="csd-title" class="csd-title">{{ title ?? t('canvasSettings.title') }}</span>
        </div>
        <div class="csd-body">
          <p class="csd-hint">
            {{ t('canvasSettings.hint') }}
          </p>
          <div class="csd-row">
            <label class="csd-lbl" for="csd-w">{{ t('canvasSettings.width') }}</label>
            <input id="csd-w" v-model.number="width" type="number" min="16" class="csd-input win-input" />
          </div>
          <div class="csd-row">
            <label class="csd-lbl" for="csd-h">{{ t('canvasSettings.height') }}</label>
            <input id="csd-h" v-model.number="height" type="number" min="16" class="csd-input win-input" />
          </div>
          <div class="csd-row">
            <label class="csd-lbl" for="csd-g">{{ t('canvasSettings.grid') }}</label>
            <input id="csd-g" v-model.number="grid" type="number" min="1" class="csd-input win-input" />
          </div>
          <div class="csd-row">
            <label class="csd-lbl" for="csd-d">{{ t('canvasSettings.dpi') }}</label>
            <input id="csd-d" v-model.number="dpi" type="number" min="1" class="csd-input win-input" />
          </div>
        </div>
        <div class="csd-actions">
          <button type="button" class="win-button" @click="close">{{ t('canvasSettings.cancel') }}</button>
          <button type="button" class="win-button csd-ok" @click="onOk">{{ t('canvasSettings.ok') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.csd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.csd-dialog {
  min-width: 360px;
  max-width: 92vw;
  background: #f0f0f0;
  border: 1px solid #535353;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.25);
  font-size: 12px;
}

.csd-caption {
  padding: 6px 10px;
  background: linear-gradient(to bottom, #ffffff, #ececec);
  border-bottom: 1px solid #a0a0a0;
}

.csd-title {
  font-weight: 600;
  color: #1a1a1a;
}

.csd-body {
  padding: 12px 14px;
  background: #f5f5f5;
}

.csd-hint {
  margin: 0 0 12px;
  line-height: 1.45;
  color: #404040;
  font-size: 11px;
}

.csd-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.csd-lbl {
  width: 100px;
  flex-shrink: 0;
  color: #303030;
}

.csd-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font-size: 12px;
}

.csd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px 10px;
  border-top: 1px solid #d0d0d0;
  background: #f0f0f0;
}

.csd-ok {
  min-width: 72px;
}
</style>
