<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import type { LocaleId } from '../i18n/ui';
import { getMessages } from '../i18n/ui';
import {
  type CodeItemCategory,
  type CodeMdLayout,
  type CodeMdState,
  buildCodeMdMarkdown,
  parseCodeMdMarkdown,
} from '../lib/codeMdModel';
import { workspace } from '../stores/workspace';

const props = defineProps<{
  markdown: string;
  tabId: string;
  locale: LocaleId;
}>();

const m = computed(() => getMessages(props.locale));

const viewportRef = ref<HTMLElement | null>(null);
const state = reactive<CodeMdState>({
  introMarkdown: '',
  functions: [],
  variables: [],
  macros: [],
});
const layout = reactive<CodeMdLayout>({
  v: 1,
  functionPositions: [],
  variablePositions: [],
  macroPositions: [],
});
const lastSynced = ref('');

const scale = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;

const selected = ref<{ category: CodeItemCategory; index: number } | null>(null);

const drag = ref<{ category: CodeItemCategory; index: number; ox: number; oy: number } | null>(null);
let dragCaptureEl: HTMLElement | null = null;

function load(md: string): void {
  const { state: s, layout: lo } = parseCodeMdMarkdown(md);
  state.introMarkdown = s.introMarkdown;
  state.functions.splice(0, state.functions.length, ...s.functions);
  state.variables.splice(0, state.variables.length, ...s.variables);
  state.macros.splice(0, state.macros.length, ...s.macros);
  layout.v = lo.v;
  layout.functionPositions.splice(0, layout.functionPositions.length, ...lo.functionPositions);
  layout.variablePositions.splice(0, layout.variablePositions.length, ...lo.variablePositions);
  layout.macroPositions.splice(0, layout.macroPositions.length, ...lo.macroPositions);
  lastSynced.value = md;
}

function pushMd(): void {
  const md = buildCodeMdMarkdown({ ...state }, { ...layout });
  lastSynced.value = md;
  workspace.updateContent(props.tabId, md);
}

watch(
  () => props.markdown,
  (md) => {
    if (md === lastSynced.value) return;
    load(md);
    selected.value = null;
  },
);

watch(
  () => props.tabId,
  () => {
    load(props.markdown);
    selected.value = null;
    scale.value = 1;
    panX.value = 0;
    panY.value = 0;
  },
);

onMounted(() => {
  load(props.markdown);
  window.addEventListener('pointermove', onGlobalPointerMove);
  window.addEventListener('pointerup', onGlobalPointerUp);
});
onUnmounted(() => {
  window.removeEventListener('pointermove', onGlobalPointerMove);
  window.removeEventListener('pointerup', onGlobalPointerUp);
});

function worldTransform(): Record<string, string> {
  return {
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
    transformOrigin: '0 0',
  };
}

function clientToWorld(clientX: number, clientY: number): { x: number; y: number } {
  const el = viewportRef.value;
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  return { x: (sx - panX.value) / scale.value, y: (sy - panY.value) / scale.value };
}

function onWheel(e: WheelEvent): void {
  if (!viewportRef.value) return;
  const rect = viewportRef.value.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const prev = scale.value;
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const next = Math.min(4, Math.max(0.25, prev + delta));
  if (next === prev) return;
  e.preventDefault();
  const k = next / prev;
  panX.value = cx - k * (cx - panX.value);
  panY.value = cy - k * (cy - panY.value);
  scale.value = next;
}

function onViewportPointerDown(e: PointerEvent): void {
  if (e.button !== 1) return;
  e.preventDefault();
  isPanning.value = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panOriginX = panX.value;
  panOriginY = panY.value;
  viewportRef.value?.setPointerCapture(e.pointerId);
}

function onPanMove(e: PointerEvent): void {
  if (!isPanning.value) return;
  panX.value = panOriginX + (e.clientX - panStartX);
  panY.value = panOriginY + (e.clientY - panStartY);
}

function onPanUp(e: PointerEvent): void {
  if (!isPanning.value) return;
  isPanning.value = false;
  try {
    viewportRef.value?.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function zoomDelta(d: number): void {
  scale.value = Math.min(4, Math.max(0.25, scale.value + d));
}

function resetZoom100(): void {
  scale.value = 1;
}

function onWorldPointerDownSelf(e: PointerEvent): void {
  if (e.button === 0) selected.value = null;
}

function uniqueName(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

function addFunction(): void {
  const names = state.functions.map((f) => f.name);
  const name = uniqueName('new_fn', names);
  const i = state.functions.length;
  state.functions.push({
    kind: 'function',
    name,
    signature: '',
    effect: '',
    note: '',
  });
  layout.functionPositions.push({ x: 100 + (i % 4) * 40, y: 100 + Math.floor(i / 4) * 40 });
  selected.value = { category: 'function', index: state.functions.length - 1 };
  pushMd();
}

function addVariable(): void {
  const names = state.variables.map((v) => v.name);
  const name = uniqueName('new_var', names);
  const i = state.variables.length;
  state.variables.push({
    kind: 'constant',
    name,
    typeAbs: '',
    note: '',
  });
  layout.variablePositions.push({ x: 440 + (i % 4) * 40, y: 100 + Math.floor(i / 4) * 40 });
  selected.value = { category: 'variable', index: state.variables.length - 1 };
  pushMd();
}

function addMacro(): void {
  const names = state.macros.map((x) => x.name);
  const name = uniqueName('NEW_MACRO', names);
  const i = state.macros.length;
  state.macros.push({
    kind: 'macro',
    name,
    expandSemantics: '',
    note: '',
  });
  layout.macroPositions.push({ x: 780 + (i % 4) * 40, y: 100 + Math.floor(i / 4) * 40 });
  selected.value = { category: 'macro', index: state.macros.length - 1 };
  pushMd();
}

function deleteRow(category: CodeItemCategory, index: number): void {
  if (category === 'function') {
    state.functions.splice(index, 1);
    layout.functionPositions.splice(index, 1);
  } else if (category === 'variable') {
    state.variables.splice(index, 1);
    layout.variablePositions.splice(index, 1);
  } else {
    state.macros.splice(index, 1);
    layout.macroPositions.splice(index, 1);
  }
  if (
    selected.value?.category === category &&
    (selected.value.index === index || selected.value.index > index)
  ) {
    if (selected.value.index === index) selected.value = null;
    else if (selected.value.index > index) selected.value = { category, index: selected.value.index - 1 };
  }
  pushMd();
}

function selectCard(category: CodeItemCategory, index: number): void {
  selected.value = { category, index };
}

function startDrag(e: PointerEvent, category: CodeItemCategory, index: number): void {
  if (e.button !== 0) return;
  e.stopPropagation();
  selectCard(category, index);
  const w = clientToWorld(e.clientX, e.clientY);
  const pos =
    category === 'function'
      ? layout.functionPositions[index]
      : category === 'variable'
        ? layout.variablePositions[index]
        : layout.macroPositions[index];
  if (!pos) return;
  drag.value = { category, index, ox: w.x - pos.x, oy: w.y - pos.y };
  dragCaptureEl = e.currentTarget as HTMLElement;
  dragCaptureEl.setPointerCapture(e.pointerId);
}

function onGlobalPointerMove(e: PointerEvent): void {
  const d = drag.value;
  if (!d) return;
  const w = clientToWorld(e.clientX, e.clientY);
  const nx = w.x - d.ox;
  const ny = w.y - d.oy;
  if (d.category === 'function') {
    const p = layout.functionPositions[d.index];
    if (p) {
      p.x = nx;
      p.y = ny;
    }
  } else if (d.category === 'variable') {
    const p = layout.variablePositions[d.index];
    if (p) {
      p.x = nx;
      p.y = ny;
    }
  } else {
    const p = layout.macroPositions[d.index];
    if (p) {
      p.x = nx;
      p.y = ny;
    }
  }
}

function onGlobalPointerUp(e: PointerEvent): void {
  if (!drag.value) return;
  drag.value = null;
  try {
    if (dragCaptureEl) dragCaptureEl.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  dragCaptureEl = null;
  pushMd();
}

function subLine(s: string, max = 42): string {
  const t = s.trim();
  if (t.length <= max) return t || '—';
  return `${t.slice(0, max)}…`;
}

function onInspectorChange(): void {
  pushMd();
}
</script>

<template>
  <div class="cmdc">
    <div
      ref="viewportRef"
      class="cmdc-viewport"
      :title="m.codeCanvasViewportTitle"
      @wheel.prevent="onWheel"
      @pointerdown="onViewportPointerDown"
      @pointermove="onPanMove"
      @pointerup="onPanUp"
      @pointercancel="onPanUp"
    >
      <aside class="cmdc-toolbar" :aria-label="m.codeCanvasToolbarAria">
        <button
          type="button"
          class="cmdc-toolbar__btn"
          :title="`${m.codeCanvasNewFunction} — 无全局快捷键`"
          @click="addFunction"
        >
          <span class="cmdc-toolbar__glyph" aria-hidden="true">ƒ</span>
        </button>
        <button
          type="button"
          class="cmdc-toolbar__btn"
          :title="`${m.codeCanvasNewVariable} — 无全局快捷键`"
          @click="addVariable"
        >
          <span class="cmdc-toolbar__glyph" aria-hidden="true">𝑥</span>
        </button>
        <button
          type="button"
          class="cmdc-toolbar__btn"
          :title="`${m.codeCanvasNewMacro} — 无全局快捷键`"
          @click="addMacro"
        >
          <span class="cmdc-toolbar__glyph" aria-hidden="true">#</span>
        </button>
      </aside>

      <div class="cmdc-world-wrap">
        <div class="cmdc-world" :style="worldTransform()" @pointerdown.self="onWorldPointerDownSelf">
          <div class="cmdc-grid" aria-hidden="true" />

          <div
            v-for="(f, i) in state.functions"
            :key="'fn-' + i + '-' + f.name"
            class="cmdc-card cmdc-card--fn"
            :class="{ 'cmdc-card--selected': selected?.category === 'function' && selected?.index === i }"
            :style="{ left: layout.functionPositions[i]?.x + 'px', top: layout.functionPositions[i]?.y + 'px' }"
            @pointerdown="startDrag($event, 'function', i)"
          >
            <span class="cmdc-card__badge" aria-hidden="true">ƒ</span>
            <div class="cmdc-card__body">
              <div class="cmdc-card__name">{{ f.name }}</div>
              <div class="cmdc-card__detail">{{ subLine(f.signature || f.effect) }}</div>
            </div>
            <button
              type="button"
              class="cmdc-card__del"
              :title="`${m.codeCanvasDelete} — 无全局快捷键`"
              @pointerdown.stop
              @click.stop="deleteRow('function', i)"
            >
              ×
            </button>
          </div>

          <div
            v-for="(v, i) in state.variables"
            :key="'var-' + i + '-' + v.name"
            class="cmdc-card cmdc-card--var"
            :class="{ 'cmdc-card--selected': selected?.category === 'variable' && selected?.index === i }"
            :style="{ left: layout.variablePositions[i]?.x + 'px', top: layout.variablePositions[i]?.y + 'px' }"
            @pointerdown="startDrag($event, 'variable', i)"
          >
            <span class="cmdc-card__badge" aria-hidden="true">𝑥</span>
            <div class="cmdc-card__body">
              <div class="cmdc-card__name">{{ v.name }}</div>
              <div class="cmdc-card__detail">{{ subLine(v.typeAbs || v.note) }}</div>
            </div>
            <button
              type="button"
              class="cmdc-card__del"
              :title="`${m.codeCanvasDelete} — 无全局快捷键`"
              @pointerdown.stop
              @click.stop="deleteRow('variable', i)"
            >
              ×
            </button>
          </div>

          <div
            v-for="(mac, i) in state.macros"
            :key="'mac-' + i + '-' + mac.name"
            class="cmdc-card cmdc-card--macro"
            :class="{ 'cmdc-card--selected': selected?.category === 'macro' && selected?.index === i }"
            :style="{ left: layout.macroPositions[i]?.x + 'px', top: layout.macroPositions[i]?.y + 'px' }"
            @pointerdown="startDrag($event, 'macro', i)"
          >
            <span class="cmdc-card__badge" aria-hidden="true">#</span>
            <div class="cmdc-card__body">
              <div class="cmdc-card__name">{{ mac.name }}</div>
              <div class="cmdc-card__detail">{{ subLine(mac.expandSemantics || mac.note) }}</div>
            </div>
            <button
              type="button"
              class="cmdc-card__del"
              :title="`${m.codeCanvasDelete} — 无全局快捷键`"
              @pointerdown.stop
              @click.stop="deleteRow('macro', i)"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div class="cmdc-hud">
        <div class="cmdc-hud__row">
          <button type="button" class="cmdc-hud__btn" :title="m.cdeResetZoom" @click="resetZoom100">100%</button>
          <button type="button" class="cmdc-hud__btn" @click="zoomDelta(-0.1)">−</button>
          <span class="cmdc-hud__pct">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="cmdc-hud__btn" @click="zoomDelta(0.1)">+</button>
        </div>
      </div>
    </div>

    <div class="cmdc-inspector">
      <p class="cmdc-inspector__hint">{{ m.codeCanvasInspectorHint }}</p>
      <template v-if="selected?.category === 'function' && state.functions[selected.index]">
        <div class="cmdc-inspector__grid">
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldKind }}</label>
          <input v-model="state.functions[selected.index].kind" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldName }}</label>
          <input v-model="state.functions[selected.index].name" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldSignature }}</label>
          <input v-model="state.functions[selected.index].signature" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldEffect }}</label>
          <input v-model="state.functions[selected.index].effect" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldNote }}</label>
          <input v-model="state.functions[selected.index].note" class="cmdc-inspector__inp" @change="onInspectorChange" />
        </div>
      </template>
      <template v-else-if="selected?.category === 'variable' && state.variables[selected.index]">
        <div class="cmdc-inspector__grid">
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldKind }}</label>
          <input v-model="state.variables[selected.index].kind" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldName }}</label>
          <input v-model="state.variables[selected.index].name" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldType }}</label>
          <input v-model="state.variables[selected.index].typeAbs" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldNote }}</label>
          <input v-model="state.variables[selected.index].note" class="cmdc-inspector__inp" @change="onInspectorChange" />
        </div>
      </template>
      <template v-else-if="selected?.category === 'macro' && state.macros[selected.index]">
        <div class="cmdc-inspector__grid">
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldKind }}</label>
          <input v-model="state.macros[selected.index].kind" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldName }}</label>
          <input v-model="state.macros[selected.index].name" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldExpand }}</label>
          <input v-model="state.macros[selected.index].expandSemantics" class="cmdc-inspector__inp" @change="onInspectorChange" />
          <label class="cmdc-inspector__lbl">{{ m.codeCanvasFieldNote }}</label>
          <input v-model="state.macros[selected.index].note" class="cmdc-inspector__inp" @change="onInspectorChange" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cmdc {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--canvas-bg, #eceff4);
}
:root[data-theme='dark'] .cmdc {
  --canvas-bg: #1a1b1f;
}

.cmdc-viewport {
  flex: 1;
  min-height: 200px;
  position: relative;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.cmdc-viewport:active {
  cursor: grabbing;
}

.cmdc-toolbar {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 9;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 6px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 65%, transparent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  pointer-events: auto;
}
.cmdc-toolbar__btn {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
  cursor: pointer;
  font: inherit;
}
.cmdc-toolbar__btn:hover {
  background: var(--menu-hover, rgba(0, 0, 0, 0.06));
}
.cmdc-toolbar__glyph {
  font-size: 1.35rem;
  line-height: 1;
  font-weight: 600;
}

.cmdc-world-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.cmdc-world {
  position: absolute;
  left: 0;
  top: 0;
  width: 4800px;
  height: 3600px;
  transform-origin: 0 0;
}

.cmdc-grid {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background-color: var(--uml-paper-bg, #f8fafc);
  background-image: linear-gradient(
      to right,
      var(--uml-grid-major, rgba(15, 23, 42, 0.07)) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, var(--uml-grid-major, rgba(15, 23, 42, 0.07)) 1px, transparent 1px);
  background-size: 24px 24px;
}
:root[data-theme='dark'] .cmdc-grid {
  --uml-paper-bg: #1c2028;
  --uml-grid-major: rgba(236, 239, 244, 0.07);
}

.cmdc-card {
  position: absolute;
  z-index: 2;
  width: 220px;
  min-height: 56px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 2px solid color-mix(in srgb, var(--border, #94a3b8) 70%, transparent);
  background: var(--card-bg, #fff);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  cursor: move;
  user-select: none;
}
.cmdc-card--fn {
  --card-bg: color-mix(in srgb, #dbeafe 88%, var(--editor-bg, #fff));
  border-color: #3b82f6;
}
.cmdc-card--var {
  --card-bg: color-mix(in srgb, #dcfce7 88%, var(--editor-bg, #fff));
  border-color: #16a34a;
}
.cmdc-card--macro {
  --card-bg: color-mix(in srgb, #fef3c7 88%, var(--editor-bg, #fff));
  border-color: #d97706;
}
.cmdc-card--selected {
  box-shadow: 0 0 0 2px #2563eb;
}
.cmdc-card__badge {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.5);
}
.cmdc-card__body {
  flex: 1;
  min-width: 0;
}
.cmdc-card__name {
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--fg, #0f172a);
  word-break: break-all;
}
.cmdc-card__detail {
  font-size: 0.68rem;
  opacity: 0.85;
  margin-top: 4px;
  line-height: 1.3;
  word-break: break-word;
}
.cmdc-card__del {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  line-height: 1;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 1.1rem;
}
.cmdc-card__del:hover {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

.cmdc-hud {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 7;
  pointer-events: auto;
}
.cmdc-hud__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--panel-bg, #fafafa) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 65%, transparent);
}
.cmdc-hud__btn {
  font: inherit;
  font-size: 0.75rem;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
}
.cmdc-hud__pct {
  min-width: 3.5em;
  text-align: center;
  font-weight: 600;
  font-size: 0.8rem;
}

.cmdc-inspector {
  flex: 0 0 auto;
  max-height: 38vh;
  overflow: auto;
  padding: 10px 12px 14px;
  border-top: 1px solid var(--border, #ccc);
  background: var(--editor-bg, #fff);
}
:root[data-theme='dark'] .cmdc-inspector {
  --editor-bg: #25262c;
}
.cmdc-inspector__hint {
  margin: 0 0 8px;
  font-size: 0.78rem;
  opacity: 0.85;
}
.cmdc-inspector__grid {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: 6px 10px;
  align-items: center;
  font-size: 0.8rem;
}
.cmdc-inspector__lbl {
  font-weight: 600;
  opacity: 0.9;
}
.cmdc-inspector__inp {
  width: 100%;
  font: inherit;
  padding: 4px 8px;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--panel-bg, #fafafa);
  color: inherit;
  box-sizing: border-box;
}
</style>
