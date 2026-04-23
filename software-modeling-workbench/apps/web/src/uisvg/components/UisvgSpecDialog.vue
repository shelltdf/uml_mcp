<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import type { MessageKey } from '../i18n/messages'
import { uisvgLocalNameToQName, UISVG_NS } from '../lib/uisvgMetaNode'
import {
  formatSemanticRowLabel,
  semanticRowsForUisvgLocalName,
  type UiSemanticRow,
} from '../lib/uiObjectProperties'
import { WINDOWS_UI_GROUPS } from '../lib/windowsUiControls'

const { t, locale } = useI18n()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const basicLocalNames = ['Frame', 'Rect', 'Text'] as const

const allTypeRows = computed(() => {
  const basic = basicLocalNames.map((uisvgLocalName) => ({
    uisvgLocalName,
    qname: uisvgLocalNameToQName(uisvgLocalName),
    categoryKey: 'help.uisvgSpec.catBasic' as MessageKey,
  }))
  const win: { uisvgLocalName: string; qname: string; categoryKey: MessageKey }[] = []
  for (const grp of WINDOWS_UI_GROUPS) {
    for (const item of grp.items) {
      win.push({
        uisvgLocalName: item.id,
        qname: uisvgLocalNameToQName(item.id),
        categoryKey: grp.titleKey,
      })
    }
  }
  return [...basic, ...win]
})

const relationBlocks = computed(() => [
  { title: t('help.uisvgSpec.relStructureTitle'), body: t('help.uisvgSpec.relStructureBody') },
  { title: t('help.uisvgSpec.relKindTitle'), body: t('help.uisvgSpec.relKindBody') },
  { title: t('help.uisvgSpec.relHierarchyTitle'), body: t('help.uisvgSpec.relHierarchyBody') },
])

function rowsForType(uisvgLocalName: string): UiSemanticRow[] {
  return semanticRowsForUisvgLocalName(uisvgLocalName)
}

function propDisplayName(sem: UiSemanticRow): string {
  return formatSemanticRowLabel(sem, locale.value)
}

function editorLabel(ed: UiSemanticRow['editor']): string {
  switch (ed) {
    case 'text':
      return t('help.uisvgSpec.editorText')
    case 'number':
      return t('help.uisvgSpec.editorNumber')
    case 'enum':
      return t('help.uisvgSpec.editorEnum')
    case 'mask':
      return t('help.uisvgSpec.editorMask')
    case 'switch':
      return t('help.uisvgSpec.editorSwitch')
    default:
      return ''
  }
}

function propDescLines(sem: UiSemanticRow): string[] {
  const lines: string[] = [sem.meaning]
  if (sem.enumOptions?.length) {
    lines.push(t('help.uisvgSpec.attrEnumOptions', { values: sem.enumOptions.join(', ') }))
  }
  if (sem.maskHint) {
    lines.push(t('help.uisvgSpec.attrMaskHint', { hint: sem.maskHint }))
  }
  return lines
}

function close() {
  emit('update:modelValue', false)
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) close()
}

let escRemove: (() => void) | null = null

watch(
  () => props.modelValue,
  (open) => {
    escRemove?.()
    escRemove = null
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    escRemove = () => document.removeEventListener('keydown', onKey)
  },
)

onUnmounted(() => {
  escRemove?.()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="usd-backdrop"
      role="presentation"
      @mousedown="onBackdrop"
    >
      <div
        class="usd-dialog"
        role="dialog"
        aria-labelledby="usd-title"
        aria-modal="true"
        @mousedown.stop
      >
        <div class="usd-caption">
          <span id="usd-title" class="usd-title">{{ t('help.uisvgSpec.title') }}</span>
          <button type="button" class="usd-close win-button" :title="t('help.uisvgSpec.close')" @click="close">
            ×
          </button>
        </div>
        <div class="usd-body">
          <p class="usd-intro">{{ t('help.uisvgSpec.intro') }}</p>
          <p class="usd-ns">
            <span class="usd-ns-lbl">{{ t('help.uisvgSpec.nsLabel') }}:</span>
            <code class="usd-code">{{ UISVG_NS }}</code>
          </p>

          <h3 class="usd-h3">{{ t('help.uisvgSpec.sectionTypes') }}</h3>
          <div class="usd-table-wrap">
            <div class="usd-type-list">
              <div class="usd-type-list-header" role="row">
                <span class="usd-type-list-h-spacer" aria-hidden="true" />
                <span class="usd-type-list-h">{{ t('help.uisvgSpec.colQName') }}</span>
                <span class="usd-type-list-h">{{ t('help.uisvgSpec.colKind') }}</span>
                <span class="usd-type-list-h">{{ t('help.uisvgSpec.colCategory') }}</span>
              </div>
              <details v-for="row in allTypeRows" :key="row.uisvgLocalName" class="usd-type-details">
                <summary class="usd-type-summary">
                  <span class="usd-chev" aria-hidden="true">▸</span>
                  <code class="usd-code usd-sum-q">{{ row.qname }}</code>
                  <code class="usd-code usd-sum-k">{{ row.uisvgLocalName }}</code>
                  <span class="usd-sum-cat">{{ t(row.categoryKey) }}</span>
                </summary>
                <div class="usd-props">
                  <p class="usd-props-hint">{{ t('help.uisvgSpec.propsSection') }}</p>
                  <table class="usd-props-table">
                    <thead>
                      <tr>
                        <th>{{ t('help.uisvgSpec.colAttrName') }}</th>
                        <th>{{ t('help.uisvgSpec.colAttrDesc') }}</th>
                        <th>{{ t('help.uisvgSpec.colEditor') }}</th>
                        <th>{{ t('help.uisvgSpec.colDefault') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(sem, si) in rowsForType(row.uisvgLocalName)" :key="si">
                        <td class="usd-name-cell">
                          <code class="usd-code">{{ propDisplayName(sem) }}</code>
                        </td>
                        <td class="usd-desc-cell">
                          <p v-for="(line, li) in propDescLines(sem)" :key="li" class="usd-desc-line">
                            {{ line }}
                          </p>
                        </td>
                        <td class="usd-ed-cell">{{ editorLabel(sem.editor) }}</td>
                        <td class="usd-def-cell">
                          <code class="usd-code">{{ sem.defaultValue }}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>

          <h3 class="usd-h3">{{ t('help.uisvgSpec.sectionRelations') }}</h3>
          <ul class="usd-relations">
            <li v-for="(block, i) in relationBlocks" :key="i" class="usd-rel-item">
              <div class="usd-rel-title">{{ block.title }}</div>
              <p class="usd-rel-body">{{ block.body }}</p>
            </li>
          </ul>
        </div>
        <div class="usd-actions">
          <button type="button" class="win-button usd-ok" @click="close">{{ t('help.uisvgSpec.close') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.usd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10050;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.usd-dialog {
  width: min(800px, 96vw);
  max-height: min(86vh, 900px);
  display: flex;
  flex-direction: column;
  background: #f0f0f0;
  border: 1px solid #535353;
  box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.28);
  font-size: 12px;
}

.usd-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 6px 10px;
  background: linear-gradient(to bottom, #ffffff, #ececec);
  border-bottom: 1px solid #a0a0a0;
  flex-shrink: 0;
}

.usd-title {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 13px;
}

.usd-close {
  min-width: 28px;
  padding: 0 6px;
  line-height: 1.2;
  font-size: 16px;
}

.usd-body {
  padding: 12px 14px;
  background: #f5f5f5;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.usd-intro {
  margin: 0 0 10px;
  line-height: 1.5;
  color: #303030;
}

.usd-ns {
  margin: 0 0 14px;
  font-size: 11px;
  color: #404040;
}

.usd-ns-lbl {
  margin-right: 6px;
}

.usd-h3 {
  margin: 14px 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.usd-h3:first-of-type {
  margin-top: 0;
}

.usd-table-wrap {
  border: 1px solid #c0c0c0;
  border-radius: 2px;
  overflow: auto;
  max-height: min(420px, 52vh);
  background: #fff;
}

.usd-type-list {
  display: flex;
  flex-direction: column;
}

.usd-type-list-header {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 6px 10px 7px;
  background: linear-gradient(to bottom, #ececec, #e4e4e4);
  border-bottom: 1px solid #b8b8b8;
  font-size: 10px;
  font-weight: 600;
  color: #1a1a1a;
  position: sticky;
  top: 0;
  z-index: 2;
}

.usd-type-list-h-spacer {
  width: 16px;
  flex-shrink: 0;
}

.usd-type-list-h {
  line-height: 1.3;
}

.usd-type-details {
  border-bottom: 1px solid #e4e4e4;
}

.usd-type-details:last-child {
  border-bottom: none;
}

.usd-type-summary {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  list-style: none;
  align-items: start;
  font-size: 11px;
}

.usd-type-summary::-webkit-details-marker {
  display: none;
}

.usd-type-summary::marker {
  content: '';
}

.usd-type-details[open] .usd-chev {
  transform: rotate(90deg);
}

.usd-chev {
  display: inline-block;
  transition: transform 0.12s ease;
  font-size: 9px;
  line-height: 1.2;
  margin-top: 3px;
  color: #505050;
}

.usd-sum-q,
.usd-sum-k {
  word-break: break-all;
}

.usd-sum-cat {
  color: #303030;
  line-height: 1.35;
}

.usd-props {
  padding: 0 10px 10px 32px;
  background: #fafafa;
  border-top: 1px solid #ececec;
}

.usd-props-hint {
  margin: 8px 0 6px;
  font-size: 10px;
  color: #606060;
  line-height: 1.4;
}

.usd-props-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

.usd-props-table th,
.usd-props-table td {
  padding: 5px 6px;
  text-align: left;
  border: 1px solid #e0e0e0;
  vertical-align: top;
}

.usd-props-table th {
  background: #ececec;
  font-weight: 600;
  color: #1a1a1a;
}

.usd-name-cell {
  width: 22%;
}

.usd-desc-cell {
  width: 44%;
}

.usd-ed-cell {
  width: 14%;
  white-space: nowrap;
  color: #404040;
}

.usd-def-cell {
  width: 20%;
  color: #505050;
}

.usd-desc-line {
  margin: 0 0 4px;
  line-height: 1.45;
  color: #404040;
}

.usd-desc-line:last-child {
  margin-bottom: 0;
}

.usd-code {
  font-family: ui-monospace, 'Cascadia Mono', 'Consolas', monospace;
  font-size: 10px;
  color: #0b4d8c;
}

.usd-relations {
  margin: 0;
  padding: 0;
  list-style: none;
}

.usd-rel-item {
  margin-bottom: 12px;
}

.usd-rel-item:last-child {
  margin-bottom: 0;
}

.usd-rel-title {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.usd-rel-body {
  margin: 0;
  line-height: 1.5;
  color: #404040;
  font-size: 11px;
}

.usd-actions {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px 10px;
  border-top: 1px solid #d0d0d0;
  background: #f0f0f0;
  flex-shrink: 0;
}

.usd-ok {
  min-width: 72px;
}
</style>
