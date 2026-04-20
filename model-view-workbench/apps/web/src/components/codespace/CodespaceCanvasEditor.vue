<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { MvModelCodespacePayload } from '@mvwb/core';
import {
  getNamespaceAtPath,
  insertNamespaceChild,
  newCodespaceUniqueId,
  removeNamespaceAtPath,
} from '../../utils/codespace-canvas';
import {
  buildCodespaceDockContext,
  type CodespaceDockContextPayload,
  type CsDockSelection,
} from '../../utils/codespace-dock-context';
import type { CodespaceSvgPick } from '../../utils/codespace-svg-layout';
import CodespaceModuleSvgCanvas from './CodespaceModuleSvgCanvas.vue';
import CodespaceClassifierFloat from './floating/CodespaceClassifierFloat.vue';
import CodespaceFunctionFloat from './floating/CodespaceFunctionFloat.vue';
import CodespaceMacroFloat from './floating/CodespaceMacroFloat.vue';
import CodespaceModuleFloat from './floating/CodespaceModuleFloat.vue';
import CodespaceNamespaceFloat from './floating/CodespaceNamespaceFloat.vue';
import CodespaceVariableFloat from './floating/CodespaceVariableFloat.vue';

const props = withDefaults(
  defineProps<{
    modelValue: MvModelCodespacePayload;
    /** 主窗口嵌入标签时为 true：收紧间距与画布 chrome，少占边框留白 */
    compactLayout?: boolean;
  }>(),
  { compactLayout: false },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: MvModelCodespacePayload): void;
  /** 同步到主窗口右侧属性 Dock：摘要 + 属性行 */
  (e: 'codespaceDockContext', ctx: CodespaceDockContextPayload): void;
}>();

const selection = ref<CsDockSelection>({ t: 'meta' });
const advancedJsonOpen = ref(false);
const advancedJsonText = ref('');
const moduleDeleteMi = ref<number | null>(null);
const nsDeleteCtx = ref<{ mi: number; path: number[] } | null>(null);

const floatOpen = ref(false);
const floatPick = ref<CodespaceSvgPick | null>(null);

const moduleFloatCtx = computed(() => (floatPick.value?.t === 'module' ? floatPick.value : null));
const nsFloatCtx = computed(() => (floatPick.value?.t === 'ns' ? floatPick.value : null));
const classFloatCtx = computed(() => (floatPick.value?.t === 'class' ? floatPick.value : null));
const varFloatCtx = computed(() => (floatPick.value?.t === 'var' ? floatPick.value : null));
const fnFloatCtx = computed(() => (floatPick.value?.t === 'fn' ? floatPick.value : null));
const macroFloatCtx = computed(() => (floatPick.value?.t === 'macro' ? floatPick.value : null));

function patch(updater: (d: MvModelCodespacePayload) => void) {
  const d = JSON.parse(JSON.stringify(props.modelValue)) as MvModelCodespacePayload;
  updater(d);
  emit('update:modelValue', d);
}

watch(
  () => props.modelValue,
  () => {
    if (advancedJsonOpen.value) {
      advancedJsonText.value = JSON.stringify(props.modelValue, null, 2);
    }
  },
  { deep: true },
);

function onAdvancedToggle(ev: Event) {
  const el = ev.target as HTMLDetailsElement;
  advancedJsonOpen.value = el.open;
  if (el.open) advancedJsonText.value = JSON.stringify(props.modelValue, null, 2);
}

function applyAdvancedJson() {
  try {
    const p = JSON.parse(advancedJsonText.value) as MvModelCodespacePayload;
    if (!p || typeof p !== 'object' || !Array.isArray(p.modules)) {
      window.alert('JSON 须为对象且含 modules 数组。');
      return;
    }
    emit('update:modelValue', p);
    selection.value = { t: 'meta' };
    advancedJsonText.value = JSON.stringify(p, null, 2);
  } catch {
    window.alert('JSON 解析失败。');
  }
}

const canvasSelection = computed((): CodespaceSvgPick | null => {
  const s = selection.value;
  if (s.t === 'meta') return null;
  return s as CodespaceSvgPick;
});

function onCanvasSelect(p: CodespaceSvgPick) {
  selection.value = p as Exclude<CsDockSelection, { t: 'meta' }>;
}

function openDefinition(p: CodespaceSvgPick) {
  floatPick.value = p;
  floatOpen.value = true;
}

function closeFloat() {
  floatOpen.value = false;
  floatPick.value = null;
}

watch(
  [selection, () => props.modelValue],
  () => {
    emit('codespaceDockContext', buildCodespaceDockContext(selection.value, props.modelValue));
  },
  { deep: true, immediate: true },
);

function addModule() {
  patch((d) => {
    d.modules.push({
      id: newCodespaceUniqueId('mod', d),
      name: '新模块',
    });
  });
}

function tryRequestDeleteModule(mi: number) {
  if (props.modelValue.modules.length <= 1) {
    window.alert('至少保留一个模块。');
    return;
  }
  moduleDeleteMi.value = mi;
}

function onModuleFloatRequestDelete(mi: number) {
  closeFloat();
  tryRequestDeleteModule(mi);
}

function confirmDeleteModule() {
  const mi = moduleDeleteMi.value;
  moduleDeleteMi.value = null;
  if (mi === null) return;
  patch((d) => {
    if (d.modules.length <= 1) return;
    d.modules.splice(mi, 1);
    selection.value = { t: 'meta' };
  });
}

function cancelDeleteModule() {
  moduleDeleteMi.value = null;
}

function requestDeleteNs(mi: number, path: number[]) {
  closeFloat();
  nsDeleteCtx.value = { mi, path };
}

function confirmDeleteNs() {
  const ctx = nsDeleteCtx.value;
  nsDeleteCtx.value = null;
  if (!ctx) return;
  patch((d) => {
    removeNamespaceAtPath(d, ctx.mi, ctx.path);
  });
  selection.value = { t: 'module', mi: ctx.mi };
}

function cancelDeleteNs() {
  nsDeleteCtx.value = null;
}

function addTopLevelNs(mi: number) {
  patch((d) => {
    insertNamespaceChild(d, mi, [], {
      id: newCodespaceUniqueId('ns', d),
      name: '新命名空间',
      namespaces: [],
    });
  });
}

function addChildNs(mi: number, parentPath: number[]) {
  patch((d) => {
    insertNamespaceChild(d, mi, parentPath, {
      id: newCodespaceUniqueId('ns', d),
      name: '子命名空间',
      namespaces: [],
    });
  });
}

function addClass(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.classes) n.classes = [];
    n.classes.push({
      id: newCodespaceUniqueId('cls', d),
      name: '新类',
      kind: 'class',
    });
  });
}

function addVar(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.variables) n.variables = [];
    n.variables.push({ id: newCodespaceUniqueId('var', d), name: '新变量' });
  });
}

function addFn(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.functions) n.functions = [];
    n.functions.push({ id: newCodespaceUniqueId('fn', d), name: '新函数' });
  });
}

function addMacro(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.macros) n.macros = [];
    n.macros.push({ id: newCodespaceUniqueId('mac', d), name: '新宏' });
  });
}

function patchMetaTitle(title: string) {
  patch((d) => {
    d.title = title.trim() ? title : undefined;
  });
}

function patchMetaRoot(root: string) {
  patch((d) => {
    d.workspaceRoot = root.trim() ? root : undefined;
  });
}
</script>

<template>
  <div class="cs-editor" :class="{ 'cs-editor--compact': compactLayout }">
    <div class="cs-meta-bar">
      <div
        class="cs-meta-inline-wrap cs-meta-inline-bar"
        title="围栏内 id 与文档块绑定，只读；title / workspaceRoot 可编辑 — 无全局快捷键"
      >
        <div class="cs-meta-inline" role="group" aria-label="id、title、workspaceRoot">
          <span class="cs-meta-inline-lab">id</span>
          <input
            type="text"
            class="cs-meta-inline-inp cs-meta-inline-id"
            :value="modelValue.id"
            readonly
            title="围栏内 id 与文档块绑定，只读 — 无全局快捷键"
          />
          <span class="cs-meta-inline-lab">title</span>
          <input
            type="text"
            class="cs-meta-inline-inp cs-meta-inline-grow"
            :value="modelValue.title ?? ''"
            title="标题 — 无全局快捷键"
            @input="patchMetaTitle(($event.target as HTMLInputElement).value)"
          />
          <span class="cs-meta-inline-lab">workspaceRoot</span>
          <input
            type="text"
            class="cs-meta-inline-inp cs-meta-inline-grow"
            :value="modelValue.workspaceRoot ?? ''"
            title="workspaceRoot 工作区根路径片段 — 无全局快捷键"
            @input="patchMetaRoot(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <CodespaceModuleSvgCanvas
      class="cs-svg-wrap"
      :model-value="modelValue"
      :selected="canvasSelection"
      @select="onCanvasSelect"
      @open-definition="openDefinition"
      @add-module="addModule"
    />

    <CodespaceModuleFloat
      v-if="moduleFloatCtx"
      :open="floatOpen"
      :model-value="modelValue"
      :mi="moduleFloatCtx.mi"
      :run-patch="patch"
      @close="closeFloat"
      @request-delete="onModuleFloatRequestDelete"
      @add-top-level-ns="addTopLevelNs"
    />
    <CodespaceNamespaceFloat
      v-if="nsFloatCtx"
      :open="floatOpen"
      :model-value="modelValue"
      :mi="nsFloatCtx.mi"
      :path="nsFloatCtx.path"
      :run-patch="patch"
      @close="closeFloat"
      @add-child-ns="addChildNs"
      @add-class="addClass"
      @add-var="addVar"
      @add-fn="addFn"
      @add-macro="addMacro"
      @request-delete-ns="requestDeleteNs"
    />
    <CodespaceClassifierFloat
      v-if="classFloatCtx"
      :open="floatOpen"
      :model-value="modelValue"
      :mi="classFloatCtx.mi"
      :path="classFloatCtx.path"
      :ci="classFloatCtx.ci"
      :run-patch="patch"
      @close="closeFloat"
    />
    <CodespaceVariableFloat
      v-if="varFloatCtx"
      :open="floatOpen"
      :model-value="modelValue"
      :mi="varFloatCtx.mi"
      :path="varFloatCtx.path"
      :vi="varFloatCtx.vi"
      :run-patch="patch"
      @close="closeFloat"
    />
    <CodespaceFunctionFloat
      v-if="fnFloatCtx"
      :open="floatOpen"
      :model-value="modelValue"
      :mi="fnFloatCtx.mi"
      :path="fnFloatCtx.path"
      :fi="fnFloatCtx.fi"
      :run-patch="patch"
      @close="closeFloat"
    />
    <CodespaceMacroFloat
      v-if="macroFloatCtx"
      :open="floatOpen"
      :model-value="modelValue"
      :mi="macroFloatCtx.mi"
      :path="macroFloatCtx.path"
      :maci="macroFloatCtx.maci"
      :run-patch="patch"
      @close="closeFloat"
    />

    <details class="cs-advanced" @toggle="onAdvancedToggle">
      <summary>高级：原始 JSON</summary>
      <p class="canvas-hint canvas-hint--compact">编辑后点「应用到树」；须能通过解析校验。</p>
      <textarea v-model="advancedJsonText" class="payload-ta" spellcheck="false" rows="12" aria-label="codespace raw json" />
      <button type="button" class="add-row" title="应用 JSON — 无全局快捷键" @click="applyAdvancedJson">应用到树</button>
    </details>

    <Teleport to="body">
      <div
        v-if="moduleDeleteMi !== null"
        class="msc-del-back"
        role="presentation"
        tabindex="0"
        @click.self="cancelDeleteModule"
      >
        <div
          class="msc-del-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cs-mod-del-title"
          tabindex="-1"
          @keydown.esc.stop="cancelDeleteModule"
        >
          <h2 id="cs-mod-del-title" class="msc-del-title">删除模块</h2>
          <p class="msc-del-desc">确定从代码空间模型中删除该模块？未保存前可关闭画布放弃。</p>
          <div class="msc-del-actions">
            <button type="button" class="msc-del-btn" title="取消 — 无全局快捷键" @click="cancelDeleteModule">取消</button>
            <button type="button" class="msc-del-btn msc-del-btn--danger" title="确定删除 — 无全局快捷键" @click="confirmDeleteModule">
              确定删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="nsDeleteCtx" class="msc-del-back" role="presentation" tabindex="0" @click.self="cancelDeleteNs">
        <div
          class="msc-del-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cs-ns-del-title"
          tabindex="-1"
          @keydown.esc.stop="cancelDeleteNs"
        >
          <h2 id="cs-ns-del-title" class="msc-del-title">删除命名空间</h2>
          <p class="msc-del-desc">将删除该节点及其子命名空间与挂载内容。</p>
          <div class="msc-del-actions">
            <button type="button" class="msc-del-btn" title="取消 — 无全局快捷键" @click="cancelDeleteNs">取消</button>
            <button type="button" class="msc-del-btn msc-del-btn--danger" title="确定删除 — 无全局快捷键" @click="confirmDeleteNs">确定删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cs-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.cs-meta-bar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
}
.cs-meta-inline-bar {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  width: 100%;
}
.cs-meta-inline-wrap {
  overflow-x: auto;
  max-width: 100%;
  width: 100%;
}
.cs-meta-inline {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px 10px;
  min-width: min-content;
  font-size: 0.78rem;
}
.cs-meta-inline-lab {
  flex-shrink: 0;
  color: #64748b;
  font-weight: 500;
}
.cs-meta-inline-inp {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font: inherit;
  font-size: 0.8rem;
  min-width: 0;
  height: 28px;
  box-sizing: border-box;
}
.cs-meta-inline-id {
  width: 7.5em;
  max-width: 18vw;
  background: #f8fafc;
  color: #475569;
}
.cs-meta-inline-grow {
  flex: 1 1 5rem;
  width: 5rem;
  min-width: 4.5rem;
  max-width: none;
}
.cs-svg-wrap {
  flex: 1;
  min-height: 300px;
}
.cs-editor--compact {
  gap: 5px;
}
.cs-editor--compact .cs-meta-inline {
  gap: 4px 6px;
  font-size: 0.72rem;
}
.cs-editor--compact .cs-meta-inline-lab {
  font-size: 0.7rem;
}
.cs-editor--compact .cs-meta-inline-inp {
  height: 26px;
  padding: 2px 6px;
  font-size: 0.74rem;
}
.cs-editor--compact .cs-svg-wrap {
  min-height: 0;
}
.cs-editor--compact :deep(.cs-svg-canvas) {
  min-height: 0;
  border-radius: 4px;
}
.cs-editor--compact :deep(.cs-svg-viewport) {
  min-height: 0;
}
.cs-editor--compact :deep(.cs-svg-keys) {
  top: 4px;
  left: 4px;
  max-width: min(240px, 50vw);
  padding: 2px 6px;
  font-size: 0.66rem;
}
.cs-editor--compact :deep(.cs-svg-keys-pre) {
  margin-top: 4px;
  font-size: 10px;
}
.cs-editor--compact :deep(.cs-svg-hud) {
  left: 4px;
  bottom: 4px;
  gap: 4px;
  padding: 4px 6px;
  font-size: 0.7rem;
  border-radius: 4px;
}
.cs-editor--compact :deep(.cs-svg-hud-btn) {
  padding: 2px 6px;
  font-size: 0.7rem;
}
.cs-editor--compact .cs-advanced {
  margin-top: 2px;
  font-size: 0.76rem;
}
.cs-editor--compact .payload-ta {
  padding: 6px 8px;
  font-size: 0.76rem;
}
.cs-editor--compact .add-row {
  margin-top: 8px;
  padding: 4px 10px;
  font-size: 0.8rem;
}
.cs-advanced {
  flex-shrink: 0;
  margin-top: 4px;
  font-size: 0.8rem;
}
.canvas-hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: #475569;
}
.canvas-hint--compact {
  font-size: 0.76rem;
  margin-bottom: 6px;
}
.payload-ta {
  width: 100%;
  max-width: 960px;
  box-sizing: border-box;
  padding: 10px 12px;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  resize: vertical;
}
.add-row {
  margin-top: 12px;
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #64748b;
  background: #fff;
}
</style>

<style>
.msc-del-back {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  outline: none;
}
.msc-del-dialog {
  width: min(440px, 100%);
  padding: 18px 20px 16px;
  border-radius: 10px;
  border: 1px solid #94a3b8;
  background: #fff;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.25);
  outline: none;
}
.msc-del-title {
  margin: 0 0 10px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #991b1b;
}
.msc-del-desc {
  margin: 0 0 10px;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #334155;
}
.msc-del-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.msc-del-btn {
  padding: 8px 16px;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
  cursor: pointer;
  color: #334155;
}
.msc-del-btn:hover {
  background: #f1f5f9;
}
.msc-del-btn--danger {
  border-color: #dc2626;
  background: #dc2626;
  color: #fff;
  font-weight: 600;
}
.msc-del-btn--danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}
</style>
