<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DockFoldSection from './DockFoldSection.vue'
import DockRailTab from './DockRailTab.vue'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
import SvgDomTree from './SvgDomTree.vue'
import {
  applyElementEdits,
  applyUiPanelEdits,
  getGraphicsElementByDomId,
  getSelectedElementSnapshot,
  parseUiPropsJsonFromElement,
  resolveDomElementId,
  type ElementAttrRow,
} from '../lib/uisvgDocument'
import { objectIdentityIdTooltip, objectIdentityUisvgTooltip } from '../lib/propertyLabels'
import { useI18n } from '../composables/useI18n'
import {
  formatSemanticRowLabel,
  getUiPropertiesPanelModel,
  type UiPropertiesPanelModel,
} from '../lib/uiObjectProperties'
import { formatSvgFragmentIndented } from '../lib/formatSvgXml'

const { t, locale } = useI18n()

const props = defineProps<{
  svgMarkup: string
  selectedId: string | null
}>()

const emit = defineEmits<{
  'update:svg': [markup: string]
  'update:selectedId': [id: string | null]
  /** 三个 dock 全部收起到右侧边条时，供 AppShell 将侧栏缩为窄条 */
  'update:allRightRailsCollapsed': [collapsed: boolean]
}>()

const displayLabel = ref('')
const attrRows = ref<ElementAttrRow[]>([])
/** 当前解析到的 DOM id，提交时使用 */
const resolvedDomId = ref<string | null>(null)

const treeOpen = ref(true)
const uiOpen = ref(true)
const svgOpen = ref(true)
/** SVG 只读片段区：是否自动换行（关则横向滚动、不换行） */
const svgFragWrap = ref(false)
/** 复制 SVG 片段后短暂为 true，用于按钮文案反馈 */
const svgCopyDone = ref(false)
let svgCopyDoneTimer: ReturnType<typeof setTimeout> | null = null
/** 收起到右侧边条（◀ 窄条）；与 ▼ 内容折叠独立。两个 SVG dock 默认整块收进窄条 */
const treeRailOpen = ref(false)
const uiRailOpen = ref(true)
const svgRailOpen = ref(false)

const allRightRailsCollapsed = computed(
  () => !treeRailOpen.value && !uiRailOpen.value && !svgRailOpen.value,
)

/** 至少有一个 dock 收起到边条时，右侧独立窄条列 */
const hasRightRailStrip = computed(
  () => !treeRailOpen.value || !uiRailOpen.value || !svgRailOpen.value,
)

watch(
  allRightRailsCollapsed,
  (v) => {
    emit('update:allRightRailsCollapsed', v)
  },
  { immediate: true },
)

/** 右侧三个独立 dock 的纵向分割（第三块 flex 填满剩余） */
const dataPanelRootRef = ref<HTMLElement | null>(null)
const rightPane1H = ref(200)
const rightPane2H = ref(220)

/** 垂直顺序：UI 属性 → SVG 结构 → SVG 对象属性；▼ / 边条规则同前 */
const pane1Style = computed(() => {
  if (!uiRailOpen.value) return { flex: '0 0 auto', height: 'auto' }
  if (!uiOpen.value) return {}
  const p3Body = svgRailOpen.value && svgOpen.value
  const p2Body = treeRailOpen.value && treeOpen.value
  if (p3Body) return { height: `${rightPane1H.value}px`, flex: '0 0 auto' }
  if (!p2Body) return { flex: '1 1 auto', minHeight: `${rightPane1H.value}px` }
  return { height: `${rightPane1H.value}px`, flex: '0 0 auto' }
})

const pane2Style = computed(() => {
  if (!treeRailOpen.value) return { flex: '0 0 auto', height: 'auto' }
  if (!treeOpen.value) return {}
  if (svgRailOpen.value && svgOpen.value) return { height: `${rightPane2H.value}px`, flex: '0 0 auto' }
  return { flex: '1 1 auto', minHeight: `${rightPane2H.value}px` }
})

function onRightDockSplit(which: 1 | 2, e: MouseEvent) {
  e.preventDefault()
  if (which === 1 && (!uiRailOpen.value || !treeRailOpen.value)) return
  if (which === 2 && (!treeRailOpen.value || !svgRailOpen.value)) return
  const startY = e.clientY
  const start1 = rightPane1H.value
  const start2 = rightPane2H.value
  const el = dataPanelRootRef.value
  if (!el) return
  const SPLIT = 5
  const min1 = 72
  const min2 = 80
  const min3 = 100

  function move(ev: MouseEvent) {
    const dy = ev.clientY - startY
    const total = el.clientHeight
    if (which === 1) {
      /** p1 + 5 + p2 + 5 + p3 = total，拖拽第 1 条时 p2 不变，p3 ≥ min3 */
      const max1 = total - SPLIT * 2 - start2 - min3
      rightPane1H.value = clamp(start1 + dy, min1, Math.max(min1, max1))
    } else {
      const max2 = total - SPLIT * 2 - rightPane1H.value - min3
      rightPane2H.value = clamp(start2 + dy, min2, Math.max(min2, max2))
    }
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

const uiModel = ref<UiPropertiesPanelModel | null>(null)
/** 与 `data-uisvg-ui-props` 同步，键为语义行 `name` */
const uiSemanticValues = ref<Record<string, string>>({})

function loadFromMarkup() {
  const snap = getSelectedElementSnapshot(props.svgMarkup, props.selectedId)
  if (!snap) {
    resolvedDomId.value = null
    displayLabel.value = ''
    attrRows.value = []
    return
  }
  resolvedDomId.value = snap.domId
  displayLabel.value = snap.displayLabel
  attrRows.value = snap.attrRows.map((r) => ({ ...r }))
}

function loadUiPanelState() {
  const m = getUiPropertiesPanelModel(props.svgMarkup, props.selectedId)
  uiModel.value = m
  if (!m) {
    uiSemanticValues.value = {}
    return
  }
  const domId = resolveDomElementId(props.svgMarkup, props.selectedId)
  if (!domId) {
    uiSemanticValues.value = {}
    return
  }
  const parser = new DOMParser()
  const doc = parser.parseFromString(props.svgMarkup, 'image/svg+xml')
  const el = getGraphicsElementByDomId(doc, domId)
  const stored = el ? parseUiPropsJsonFromElement(el) : {}
  const next: Record<string, string> = {}
  for (const row of m.semanticRows) {
    next[row.name] = stored[row.name] ?? row.defaultValue
  }
  uiSemanticValues.value = next
}

watch(
  () => [props.svgMarkup, props.selectedId] as const,
  () => {
    loadFromMarkup()
    loadUiPanelState()
  },
  { immediate: true },
)

const tagHint = computed(() => {
  const snap = getSelectedElementSnapshot(props.svgMarkup, props.selectedId)
  return snap ? `<${snap.tagName}>` : ''
})

const outerXmlPreview = computed(() => {
  const snap = getSelectedElementSnapshot(props.svgMarkup, props.selectedId)
  if (!snap) return ''
  const max = 12000
  const s = formatSvgFragmentIndented(snap.outerXml, 2)
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n\n… (truncated, ${s.length} chars total)`
})

/** 只读 SVG 片段：转义后做简单高亮 */
const outerXmlHighlighted = computed(() => highlightSvgXml(outerXmlPreview.value))

function highlightSvgXml(xml: string): string {
  const esc = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  let s = esc(xml)
  s = s.replace(/(&quot;[^&]*?&quot;)/g, '<span class="hl-str">$1</span>')
  s = s.replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="hl-tag">$2</span>')
  return s
}

/** 复制完整格式化片段（与预览同格式，但不截断） */
async function copySvgFragment() {
  const snap = getSelectedElementSnapshot(props.svgMarkup, props.selectedId)
  if (!snap) return
  const text = formatSvgFragmentIndented(snap.outerXml, 2)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    } catch {
      return
    }
  }
  if (svgCopyDoneTimer) clearTimeout(svgCopyDoneTimer)
  svgCopyDone.value = true
  svgCopyDoneTimer = setTimeout(() => {
    svgCopyDone.value = false
    svgCopyDoneTimer = null
  }, 1500)
}

function commit() {
  const domId = resolvedDomId.value
  if (!domId || !props.selectedId) return
  const r = applyElementEdits(props.svgMarkup, domId, displayLabel.value, attrRows.value)
  if (!r) return
  emit('update:svg', r.markup)
  if (r.newDomId !== props.selectedId) {
    emit('update:selectedId', r.newDomId)
  }
}

function commitUi() {
  const domId = resolveDomElementId(props.svgMarkup, props.selectedId)
  if (!domId || !uiModel.value) return
  const markup = applyUiPanelEdits(props.svgMarkup, domId, {
    semanticValues: { ...uiSemanticValues.value },
  })
  if (markup) emit('update:svg', markup)
}

function semanticSwitchChecked(name: string): boolean {
  const v = (uiSemanticValues.value[name] ?? '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'on'
}

function onSemanticSwitch(name: string, ev: Event) {
  const t = ev.target as HTMLInputElement | null
  if (!t) return
  uiSemanticValues.value = { ...uiSemanticValues.value, [name]: t.checked ? 'true' : 'false' }
  commitUi()
}

function addAttrRow() {
  attrRows.value = [...attrRows.value, { name: '', value: '' }]
}

function removeAttrRow(i: number) {
  const next = attrRows.value.filter((_, j) => j !== i)
  attrRows.value = next
  commit()
}

function onAttrChange() {
  commit()
}

function onTreeSelect(id: string) {
  emit('update:selectedId', id)
}

/** 中栏/右栏分割拖拽时若当前为窄条模式，先展开全部 rail 以便恢复宽度 */
function expandAllRails() {
  treeRailOpen.value = true
  uiRailOpen.value = true
  svgRailOpen.value = true
}

defineExpose({ expandAllRails })
</script>

<template>
  <div
    ref="dataPanelRootRef"
    class="data-panel"
    :class="{ 'data-panel--all-rail-tabs': allRightRailsCollapsed }"
  >
    <!-- 展开中的 dock：主列，与收起的边条列分离 -->
    <div
      class="data-panel__main"
      :class="{ 'data-panel__main--empty': allRightRailsCollapsed }"
    >
      <template v-if="uiRailOpen">
        <div
          class="dock-pane dock-pane--right-third"
          :class="{ 'dock-pane--v-collapsed': !uiOpen }"
          :style="pane1Style"
        >
          <DockFoldSection
            v-model="uiOpen"
            v-model:railOpen="uiRailOpen"
            external-rail-strip
            :title="t('panel.dockUiProps')"
            panel-id="dp-ui-props"
            root-class="panel-section ui-props-section"
            rail-edge="right"
          >
      <div v-if="!uiModel" class="section-muted">{{ t('panel.notSelectedObject') }}</div>
      <div v-else class="ui-props-body">
        <div class="ui-headline">{{ uiModel.headline }}</div>
        <div class="ui-identity-grid" :aria-label="t('panel.objectIdentityAria')">
          <div class="ui-id-row">
            <span class="ui-id-cap">{{ t('panel.id') }}</span>
            <span class="ui-id-val ui-id-val--mono" :title="objectIdentityIdTooltip(uiModel.domId, uiModel.outlineLabel, uiModel.uisvgType, t)">{{
              uiModel.domId
            }}</span>
          </div>
          <div class="ui-id-row">
            <span class="ui-id-cap">{{ t('panel.uisvgType') }}</span>
            <span
              class="ui-id-val ui-id-val--uisvg-full"
              :title="objectIdentityUisvgTooltip(uiModel.uisvgLocalName, uiModel.uisvgType, t)"
              >{{ uiModel.uisvgType }}</span
            >
          </div>
        </div>
        <template v-if="uiModel.platformValues">
          <div class="ui-sem-title">{{ t('panel.platformMapping') }}</div>
          <div class="ui-platform-readonly" aria-readonly="true">
            <div class="ui-platform-line">
              <span class="ui-platform-cap">WinForms</span>
              <span class="ui-platform-txt">{{ uiModel.platformValues.winforms }}</span>
            </div>
            <div class="ui-platform-line">
              <span class="ui-platform-cap">Win32</span>
              <span class="ui-platform-txt">{{ uiModel.platformValues.win32 }}</span>
            </div>
            <div class="ui-platform-line">
              <span class="ui-platform-cap">Qt</span>
              <span class="ui-platform-txt">{{ uiModel.platformValues.qt }}</span>
            </div>
          </div>
        </template>
        <div class="ui-sem-title">{{ t('panel.uiSemantics') }}</div>
        <div class="ui-sem-table-wrap">
          <table class="ui-sem-table">
            <thead>
              <tr>
                <th class="col-name">{{ t('panel.colName') }}</th>
                <th class="col-val">{{ t('panel.colValue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in uiModel.semanticRows" :key="row.name">
                <td class="col-name" :title="row.meaning">{{ formatSemanticRowLabel(row, locale) }}</td>
                <td class="col-val">
                  <template v-if="row.editor === 'text'">
                    <input
                      v-model="uiSemanticValues[row.name]"
                      class="win-input ui-sem-inp"
                      type="text"
                      spellcheck="false"
                      autocomplete="off"
                      @change="commitUi"
                    />
                  </template>
                  <template v-else-if="row.editor === 'number'">
                    <input
                      v-model="uiSemanticValues[row.name]"
                      class="win-input ui-sem-inp"
                      type="number"
                      spellcheck="false"
                      autocomplete="off"
                      @change="commitUi"
                    />
                  </template>
                  <template v-else-if="row.editor === 'enum'">
                    <select
                      v-model="uiSemanticValues[row.name]"
                      class="win-input ui-sem-inp ui-sem-select"
                      @change="commitUi"
                    >
                      <option value="">{{ t('panel.enumUnset') }}</option>
                      <option v-for="opt in row.enumOptions ?? []" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </template>
                  <template v-else-if="row.editor === 'mask'">
                    <input
                      v-model="uiSemanticValues[row.name]"
                      class="win-input ui-sem-inp"
                      type="text"
                      spellcheck="false"
                      autocomplete="off"
                      :placeholder="row.maskHint || t('panel.maskPlaceholder')"
                      :title="row.maskHint ? t('panel.maskExample', { hint: row.maskHint }) : t('panel.maskTitlePattern')"
                      @change="commitUi"
                    />
                  </template>
                  <template v-else-if="row.editor === 'switch'">
                    <label class="ui-sem-switch">
                      <input
                        type="checkbox"
                        :checked="semanticSwitchChecked(row.name)"
                        @change="onSemanticSwitch(row.name, $event)"
                      />
                      <span class="ui-sem-switch-lbl">{{ t('panel.onOff') }}</span>
                    </label>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
          </DockFoldSection>
        </div>
      </template>

      <div
        v-show="uiRailOpen && treeRailOpen"
        class="dock-splitter dock-splitter--h dock-splitter--in-data"
        role="separator"
        aria-orientation="horizontal"
        aria-label="调整 UI 属性与 SVG 结构区域高度"
        tabindex="0"
        @mousedown="onRightDockSplit(1, $event)"
      />

      <template v-if="treeRailOpen">
        <div
          class="dock-pane dock-pane--right-third"
          :class="{ 'dock-pane--v-collapsed': !treeOpen }"
          :style="pane2Style"
        >
          <DockFoldSection
            v-model="treeOpen"
            v-model:railOpen="treeRailOpen"
            external-rail-strip
            :title="t('panel.dockSvgTree')"
            panel-id="dp-svg-tree"
            root-class="tree-block"
            rail-edge="right"
          >
            <div class="tree-scroll">
              <SvgDomTree :svg-markup="svgMarkup" :selected-id="selectedId" @select="onTreeSelect" />
            </div>
          </DockFoldSection>
        </div>
      </template>

      <div
        v-show="treeRailOpen && svgRailOpen"
        class="dock-splitter dock-splitter--h dock-splitter--in-data"
        role="separator"
        aria-orientation="horizontal"
        aria-label="调整 SVG 结构与 SVG 对象属性区域高度"
        tabindex="0"
        @mousedown="onRightDockSplit(2, $event)"
      />

      <template v-if="svgRailOpen">
        <div
          class="dock-pane dock-pane--right-third"
          :class="{
            'dock-pane--fill': svgOpen,
            'dock-pane--v-collapsed': !svgOpen,
          }"
        >
          <DockFoldSection
            v-model="svgOpen"
            v-model:railOpen="svgRailOpen"
            external-rail-strip
            :title="t('panel.dockSvgObjectProps')"
            panel-id="dp-svg-props"
            root-class="panel-section svg-props-section"
            rail-edge="right"
          >
      <div v-if="!resolvedDomId" class="data-meta muted">{{ t('panel.notEditableNode') }}</div>

      <template v-else>
      <div class="props-stack">
      <div class="data-meta">
        <div class="meta-row">
          <span class="meta-tag">{{ tagHint }}</span>
          <span class="meta-domid">#{{ resolvedDomId }}</span>
        </div>
        <label class="lbl-name">
          <span class="lbl-cap">{{ t('panel.displayName') }}</span>
          <input
            v-model="displayLabel"
            class="win-input inp-name"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :title="t('panel.displayNameInputTitle')"
            @change="commit"
          />
        </label>
        <p class="hint">{{ t('panel.hintDataUisvgLabel') }}</p>
      </div>

      <div class="attr-head">
        <span class="attr-title">{{ t('panel.xmlAttributes') }}</span>
        <button type="button" class="win-button btn-mini" @click="addAttrRow">{{ t('panel.add') }}</button>
      </div>
      <div class="attr-scroll">
        <table class="attr-table">
          <thead>
            <tr>
              <th>{{ t('panel.colName') }}</th>
              <th>{{ t('panel.colValue') }}</th>
              <th class="col-act" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in attrRows" :key="i">
              <td>
                <input
                  v-model="row.name"
                  class="win-input inp-cell"
                  type="text"
                  spellcheck="false"
                  @change="onAttrChange"
                />
              </td>
              <td>
                <input
                  v-model="row.value"
                  class="win-input inp-cell"
                  type="text"
                  spellcheck="false"
                  @change="onAttrChange"
                />
              </td>
              <td class="col-act">
                <button type="button" class="btn-del" :title="t('panel.deleteAttr')" @click="removeAttrRow(i)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="frag-head frag-head--row">
        <span class="frag-title">{{ t('panel.svgFragmentReadonly') }}</span>
        <div class="frag-head-actions">
          <button
            type="button"
            class="win-button btn-mini frag-copy-btn"
            :title="svgCopyDone ? t('panel.copiedTitle') : t('panel.copyTitle')"
            :disabled="!outerXmlPreview"
            @click="copySvgFragment"
          >
            {{ svgCopyDone ? t('panel.copied') : t('panel.copy') }}
          </button>
          <label class="frag-wrap-toggle" :title="t('panel.autoWrapTitle')">
            <input v-model="svgFragWrap" type="checkbox" />
            <span>{{ t('panel.autoWrap') }}</span>
          </label>
        </div>
      </div>
      <div class="frag-box" aria-readonly="true">
        <pre
          class="frag-pre"
          :class="{ 'frag-pre--nowrap': !svgFragWrap }"
          v-html="outerXmlHighlighted"
        />
      </div>
      </div>
      </template>
          </DockFoldSection>
        </div>
      </template>
    </div>

    <!-- 收起 dock 独占右侧窄条列，不与主列混排 -->
    <aside
      v-if="hasRightRailStrip"
      class="data-panel__rail-strip"
      aria-label="已收起的面板"
    >
      <DockRailTab
        v-if="!uiRailOpen"
        :title="t('panel.dockUiProps')"
        rail-edge="right"
        @click="uiRailOpen = true"
      />
      <DockRailTab
        v-if="!treeRailOpen"
        :title="t('panel.dockSvgTree')"
        rail-edge="right"
        @click="treeRailOpen = true"
      />
      <DockRailTab
        v-if="!svgRailOpen"
        :title="t('panel.dockSvgObjectProps')"
        rail-edge="right"
        @click="svgRailOpen = true"
      />
    </aside>
  </div>
</template>

<style scoped>
.data-panel {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

/** 展开区：与右侧收起窄条列分离 */
.data-panel__main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/** 全部收起：主列不占宽，整栏仅窄条列（配合 AppShell 窄宽度） */
.data-panel__main--empty {
  flex: 0 0 0;
  width: 0;
  min-width: 0;
  overflow: hidden;
}

/** 收起 dock 独占列，自上而下排列标签按钮 */
.data-panel__rail-strip {
  flex: 0 0 18px;
  width: 18px;
  min-width: 18px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  align-self: stretch;
  border-left: 1px solid var(--win-border);
  background: var(--win-panel);
}

/** 三个 dock 全部收到右侧边条时 */
.data-panel--all-rail-tabs {
  align-items: stretch;
}

.dock-pane--right-third {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/** 垂直 ▼ 收起：仅标题条高度，剩余高度给其它 dock */
.dock-pane--v-collapsed {
  flex: 0 0 auto;
  height: auto;
  overflow: visible;
}

.dock-pane--right-third:not(.dock-pane--v-collapsed):not(.dock-pane--fill) {
  flex-shrink: 0;
}

.dock-pane--fill {
  flex: 1 1 auto;
  min-height: 0;
}

.dock-splitter--in-data {
  flex-shrink: 0;
  background: linear-gradient(to bottom, #e4e4e4, #d4d4d4);
  z-index: 2;
  height: 5px;
  cursor: ns-resize;
  border-top: 1px solid #f8f8f8;
  border-bottom: 1px solid #a0a0a0;
}

.dock-splitter--in-data:hover,
.dock-splitter--in-data:focus-visible {
  background: linear-gradient(to bottom, #d4eaff, #b8d4f0);
  outline: none;
}

.tree-block {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-bottom: none;
}

/** ▼ 收起：不抢占其它 dock 的纵向空间（覆盖上一段 flex:1） */
.tree-block:has(:deep(.dock-fold--collapsed)) {
  flex: 0 0 auto !important;
  height: auto !important;
  min-height: 0;
}

.tree-block.dock-fold-outer--rail-collapsed {
  flex: 0 0 auto;
  max-height: none;
}

.tree-block :deep(.dock-fold.dock-fold--collapsed) {
  flex: 0 0 auto;
  max-height: none;
}

.tree-block :deep(.dock-fold__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tree-scroll {
  overflow: auto;
  flex: 1;
  min-height: 72px;
  padding: 2px 0 4px;
}

.props-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-section {
  flex: 0 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-bottom: 1px solid var(--win-border);
}

.ui-props-section {
  max-height: none;
}

.ui-props-section:has(:deep(.dock-fold--collapsed)) {
  flex: 0 0 auto !important;
  height: auto !important;
  min-height: 0;
}

.ui-props-section.dock-fold-outer--rail-collapsed {
  flex: 0 0 auto;
  max-height: none;
}

.ui-props-section :deep(.dock-fold.dock-fold--collapsed) {
  flex: 0 0 auto;
  max-height: none;
}

.ui-props-section :deep(.dock-fold__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.svg-props-section {
  flex: 1 1 auto;
  min-height: 0;
  border-bottom: none;
}

.svg-props-section:has(:deep(.dock-fold--collapsed)) {
  flex: 0 0 auto !important;
  height: auto !important;
  min-height: 0;
}

.svg-props-section.dock-fold-outer--rail-collapsed {
  flex: 0 0 auto;
}

.svg-props-section :deep(.dock-fold.dock-fold--collapsed) {
  flex: 0 0 auto;
}

.svg-props-section :deep(.dock-fold__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-muted {
  padding: 8px;
  font-size: 12px;
  color: #707070;
}

.ui-props-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  padding: 6px 8px 8px;
  font-size: 11px;
}

.ui-headline {
  font-weight: 600;
  color: #0d47a1;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.ui-identity-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  margin-bottom: 8px;
  font-size: 11px;
  flex-shrink: 0;
}

.ui-id-row {
  display: contents;
}

.ui-id-cap {
  color: #606060;
  font-weight: 600;
  white-space: nowrap;
}

.ui-id-val {
  color: #1a1a1a;
  min-width: 0;
  word-break: break-word;
}

.ui-id-val--mono {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
}

.ui-id-val--uisvg-full {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  line-height: 1.35;
  word-break: break-all;
  white-space: normal;
}

.ui-id-val code {
  font-size: 10px;
  background: #f0f0f0;
  padding: 0 4px;
}

.ui-platform-readonly {
  margin-bottom: 6px;
  padding: 6px 8px;
  border: 1px solid #e8e8e8;
  border-radius: 2px;
  background: #f8f8f8;
  font-size: 11px;
  flex-shrink: 0;
}

.ui-platform-line {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
}

.ui-platform-line:last-child {
  margin-bottom: 0;
}

.ui-platform-cap {
  flex: 0 0 72px;
  font-weight: 600;
  color: #505050;
}

.ui-platform-txt {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  color: #303030;
}

.ui-sem-title {
  font-weight: 600;
  font-size: 11px;
  margin: 8px 0 4px;
  color: #303030;
  flex-shrink: 0;
}

.ui-sem-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  background: #fafafa;
}

.ui-sem-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

.ui-sem-table th {
  text-align: left;
  padding: 4px 6px;
  background: #ececec;
  border-bottom: 1px solid var(--win-border);
  position: sticky;
  top: 0;
}

.ui-sem-table td {
  padding: 3px 4px;
  vertical-align: top;
  border-bottom: 1px solid #ececec;
}

.ui-sem-table .col-name {
  font-weight: 600;
  color: #1a3a6e;
  white-space: nowrap;
  max-width: 88px;
}

.ui-sem-table .col-val {
  min-width: 96px;
}

.ui-sem-inp {
  width: 100%;
  font-size: 10px;
  font-family: ui-monospace, Consolas, monospace;
}

.ui-sem-select {
  font-family: inherit;
}

.ui-sem-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.ui-sem-switch input {
  margin: 0;
}

.ui-sem-switch-lbl {
  font-size: 10px;
  color: #505050;
}

.data-meta {
  padding: 8px;
  font-size: 12px;
  border-bottom: 1px solid var(--win-border);
  flex-shrink: 0;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.meta-tag {
  font-weight: 600;
  color: #0d47a1;
}

.meta-domid {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  color: #505050;
}

.lbl-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lbl-cap {
  font-size: 11px;
  color: #404040;
}

.inp-name {
  width: 100%;
  font-size: 12px;
}

.hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: #707070;
}

.hint code {
  font-size: 10px;
  background: #f0f0f0;
  padding: 0 4px;
}

.muted {
  color: #707070;
  padding: 8px;
}

.attr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid var(--win-border);
  flex-shrink: 0;
}

.attr-title {
  font-weight: 600;
  font-size: 12px;
}

.btn-mini {
  font-size: 11px;
  padding: 1px 8px;
  min-height: 22px;
}

.attr-scroll {
  flex: 1;
  min-height: 80px;
  overflow: auto;
  border-bottom: 1px solid var(--win-border);
}

.attr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.attr-table th {
  text-align: left;
  padding: 4px 6px;
  background: #f5f5f5;
  border-bottom: 1px solid var(--win-border);
  position: sticky;
  top: 0;
}

.attr-table td {
  padding: 2px 4px;
  vertical-align: middle;
  border-bottom: 1px solid #ececec;
}

.inp-cell {
  width: 100%;
  font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
}

.col-act {
  width: 28px;
  text-align: center;
}

.btn-del {
  border: none;
  background: transparent;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
}

.btn-del:hover {
  color: #c00;
  background: #ffecec;
}

.frag-head {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #404040;
  flex-shrink: 0;
}

.frag-head--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.frag-title {
  flex: 1;
  min-width: 0;
}

.frag-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.frag-copy-btn {
  min-width: 52px;
}

.frag-wrap-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: normal;
  color: #505050;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.frag-wrap-toggle input {
  margin: 0;
}

.frag-box {
  flex: 1;
  min-height: 120px;
  overflow: auto;
  margin: 0 6px 6px;
  padding: 0;
  border: 1px solid #b8c4f0;
  border-radius: 2px;
  background: linear-gradient(160deg, #f8fafc 0%, #eef2ff 55%, #e8edff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.frag-pre {
  margin: 0;
  padding: 8px;
  font-size: 10px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: #1e293b;
  user-select: text;
}

.frag-pre--nowrap {
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
}

.frag-pre :deep(.hl-tag) {
  color: #166534;
  font-weight: 600;
}

.frag-pre :deep(.hl-str) {
  color: #9a3412;
}
</style>
