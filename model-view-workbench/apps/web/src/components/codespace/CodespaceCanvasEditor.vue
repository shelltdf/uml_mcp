<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import type { MvModelCodespacePayload } from '@mvwb/core';
import { useAppLocale } from '../../composables/useAppLocale';
import { CS_CANVAS_MSG_KEY, codespaceCanvasMessages } from '../../i18n/codespace-canvas-messages';
import {
  ensureModuleRootNamespace,
  getNamespaceAtPath,
  insertNamespaceChild,
  newCodespaceUniqueId,
  rebuildPathIdsForModule,
  removeNamespaceAtPath,
} from '../../utils/codespace-canvas';
import {
  buildCodespaceDockContext,
  type CodespaceDockContextPayload,
  type CsDockSelection,
} from '../../utils/codespace-dock-context';
import type { CodespaceSvgPick } from '../../utils/codespace-svg-layout';
import FormatHint from '../common/FormatHint.vue';
import CodespaceModuleSvgCanvas from './CodespaceModuleSvgCanvas.vue';
import CodespaceClassifierFloat from './floating/CodespaceClassifierFloat.vue';
import CodespaceFunctionFloat from './floating/CodespaceFunctionFloat.vue';
import CodespaceEnumFloat from './floating/CodespaceEnumFloat.vue';
import CodespaceMacroFloat from './floating/CodespaceMacroFloat.vue';
import CodespaceModuleFloat from './floating/CodespaceModuleFloat.vue';
import CodespaceNamespaceFloat from './floating/CodespaceNamespaceFloat.vue';
import CodespaceVariableFloat from './floating/CodespaceVariableFloat.vue';

const { locale } = useAppLocale();
const csCanvasMsg = computed(() => codespaceCanvasMessages[locale.value]);
provide(CS_CANVAS_MSG_KEY, csCanvasMsg);

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
const enumFloatCtx = computed(() => (floatPick.value?.t === 'enum' ? floatPick.value : null));
const varFloatCtx = computed(() => (floatPick.value?.t === 'var' ? floatPick.value : null));
const fnFloatCtx = computed(() => (floatPick.value?.t === 'fn' ? floatPick.value : null));
const macroFloatCtx = computed(() => (floatPick.value?.t === 'macro' ? floatPick.value : null));

function ensureUniqueName(preferred: string, usedNames: string[]): string {
  const base = preferred.trim() || 'Item';
  const used = new Set(usedNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (!used.has(base.toLowerCase())) return base;
  let i = 2;
  while (used.has(`${base}_${i}`.toLowerCase())) i++;
  return `${base}_${i}`;
}

function patch(updater: (d: MvModelCodespacePayload) => void) {
  const d = JSON.parse(JSON.stringify(props.modelValue)) as MvModelCodespacePayload;
  for (const m of d.modules ?? []) ensureModuleRootNamespace(m, d);
  updater(d);
  for (const m of d.modules ?? []) ensureModuleRootNamespace(m, d);
  emit('update:modelValue', d);
}

watch(
  () => props.modelValue,
  () => {
    let needsNormalize = false;
    for (const m of props.modelValue.modules ?? []) {
      const ns = m.namespaces ?? [];
      if (ns.length !== 1 || (ns[0]?.name ?? '').trim() !== '') {
        needsNormalize = true;
        break;
      }
    }
    if (needsNormalize) {
      patch(() => {});
      return;
    }
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
      window.alert(csCanvasMsg.value.edJsonNeedObjectModules);
      return;
    }
    emit('update:modelValue', p);
    selection.value = { t: 'meta' };
    advancedJsonText.value = JSON.stringify(p, null, 2);
  } catch {
    window.alert(csCanvasMsg.value.edJsonParseFail);
  }
}

const canvasSelection = computed((): CodespaceSvgPick | null => {
  const s = selection.value;
  if (s.t === 'meta') return null;
  return s as CodespaceSvgPick;
});

function onCanvasSelect(p: CodespaceSvgPick | null) {
  if (!p) {
    selection.value = { t: 'meta' };
    return;
  }
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
  [selection, () => props.modelValue, locale],
  () => {
    emit(
      'codespaceDockContext',
      buildCodespaceDockContext(selection.value, props.modelValue, locale.value),
    );
  },
  { deep: true, immediate: true },
);

function addModule() {
  patch((d) => {
    const name = ensureUniqueName(
      csCanvasMsg.value.newModuleName,
      d.modules.map((m) => m.name ?? ''),
    );
    d.modules.push({
      id: newCodespaceUniqueId('mod', d),
      name,
      namespaces: [
        {
          id: newCodespaceUniqueId('ns', d),
          name: '',
          namespaces: [],
        },
      ],
    });
  });
}

function tryRequestDeleteModule(mi: number) {
  if (props.modelValue.modules.length <= 1) {
    window.alert(csCanvasMsg.value.edKeepOneModule);
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
  if (ctx.path.length === 1 && ctx.path[0] === 0) {
    window.alert(locale.value === 'en' ? 'Root namespace cannot be deleted.' : '根命名空间不允许删除。');
    return;
  }
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
    const mod = d.modules[mi];
    if (!mod) return;
    const root = ensureModuleRootNamespace(mod, d);
    const siblings = root.namespaces ?? [];
    const name = ensureUniqueName(
      csCanvasMsg.value.newNsName,
      siblings.map((n) => n.name ?? ''),
    );
    insertNamespaceChild(d, mi, [0], {
      id: newCodespaceUniqueId('ns', d),
      name,
      namespaces: [],
    });
    rebuildPathIdsForModule(d, mi);
  });
}

function addChildNs(mi: number, parentPath: number[]) {
  patch((d) => {
    const parent = getNamespaceAtPath(d, mi, parentPath);
    if (!parent) return;
    const siblings = parent.namespaces ?? [];
    const name = ensureUniqueName(
      csCanvasMsg.value.newChildNsName,
      siblings.map((n) => n.name ?? ''),
    );
    insertNamespaceChild(d, mi, parentPath, {
      id: newCodespaceUniqueId('ns', d),
      name,
      namespaces: [],
    });
    rebuildPathIdsForModule(d, mi);
  });
}

function addClass(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.classes) n.classes = [];
    const name = ensureUniqueName(
      csCanvasMsg.value.newClassName,
      n.classes.map((c) => c.name ?? ''),
    );
    n.classes.push({
      id: newCodespaceUniqueId('cls', d),
      name,
      kind: 'class',
    });
    rebuildPathIdsForModule(d, mi);
  });
}

function addEnum(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.enums) n.enums = [];
    const name = ensureUniqueName(
      csCanvasMsg.value.newEnumName,
      n.enums.map((e) => e.name ?? ''),
    );
    n.enums.push({
      id: newCodespaceUniqueId('enum', d),
      name,
    });
  });
}

function addClassEnum(mi: number, path: number[], ci: number, classPath?: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n?.classes?.[ci]) return;
    let c = n.classes[ci];
    for (const idx of classPath ?? []) c = c?.classes?.[idx] as typeof c;
    if (!c) return;
    if (!c.enums) c.enums = [];
    const name = ensureUniqueName(
      csCanvasMsg.value.newEnumName,
      c.enums.map((e) => e.name ?? ''),
    );
    c.enums.push({ name, enumGroup: 'default', value: '0' });
  });
}

function addVar(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.variables) n.variables = [];
    n.variables.push({ id: newCodespaceUniqueId('var', d), name: csCanvasMsg.value.newVarName });
  });
}

function addFn(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.functions) n.functions = [];
    n.functions.push({ id: newCodespaceUniqueId('fn', d), name: csCanvasMsg.value.newFnName });
  });
}

function addMacro(mi: number, path: number[]) {
  patch((d) => {
    const n = getNamespaceAtPath(d, mi, path);
    if (!n) return;
    if (!n.macros) n.macros = [];
    n.macros.push({ id: newCodespaceUniqueId('mac', d), name: csCanvasMsg.value.newMacroName });
  });
}

function deleteClassByPick(p: Extract<CodespaceSvgPick, { t: 'class' }>) {
  patch((d) => {
    const n = getNamespaceAtPath(d, p.mi, p.path);
    if (!n?.classes || p.ci < 0 || p.ci >= n.classes.length) return;
    const classPath = p.classPath ?? [];
    if (!classPath.length) {
      n.classes.splice(p.ci, 1);
      rebuildPathIdsForModule(d, p.mi);
      return;
    }
    let parent = n.classes[p.ci];
    for (let i = 0; i < classPath.length - 1; i++) {
      parent = parent?.classes?.[classPath[i]!] as typeof parent;
      if (!parent) return;
    }
    const last = classPath[classPath.length - 1];
    if (last === undefined || !parent?.classes || last < 0 || last >= parent.classes.length) return;
    parent.classes.splice(last, 1);
    rebuildPathIdsForModule(d, p.mi);
  });
  selection.value = { t: 'meta' };
  closeFloat();
}

function deleteLeafByPick(p: Extract<CodespaceSvgPick, { t: 'enum' | 'var' | 'fn' | 'macro' }>) {
  patch((d) => {
    const n = getNamespaceAtPath(d, p.mi, p.path);
    if (!n) return;
    if (p.t === 'enum') {
      if (p.ci === undefined) {
        if (n.enums) n.enums.splice(p.eni, 1);
      }
      else {
        let c = n.classes?.[p.ci];
        for (const idx of p.classPath ?? []) c = c?.classes?.[idx];
        c?.enums?.splice(p.eni, 1);
      }
    }
    if (p.t === 'var' && n.variables) n.variables.splice(p.vi, 1);
    if (p.t === 'fn' && n.functions) n.functions.splice(p.fi, 1);
    if (p.t === 'macro' && n.macros) n.macros.splice(p.maci, 1);
  });
  selection.value = { t: 'meta' };
  closeFloat();
}

function requestDeletePick(p: CodespaceSvgPick) {
  if (p.t === 'module') {
    tryRequestDeleteModule(p.mi);
    return;
  }
  if (p.t === 'ns') {
    requestDeleteNs(p.mi, p.path);
    return;
  }
  if (p.t === 'class') {
    deleteClassByPick(p);
    return;
  }
  deleteLeafByPick(p);
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
        :title="csCanvasMsg.edMetaBarTitle"
      >
        <div class="cs-meta-inline" role="group" :aria-label="csCanvasMsg.edMetaAria">
          <span class="cs-meta-inline-lab">id</span>
          <input
            type="text"
            class="cs-meta-inline-inp cs-meta-inline-id"
            :value="modelValue.id"
            readonly
            :title="csCanvasMsg.edIdReadonlyTitle"
          />
          <span class="cs-meta-inline-lab">title</span>
          <input
            type="text"
            class="cs-meta-inline-inp cs-meta-inline-grow"
            :value="modelValue.title ?? ''"
            :title="csCanvasMsg.edTitleFieldTitle"
            @input="patchMetaTitle(($event.target as HTMLInputElement).value)"
          />
          <span class="cs-meta-inline-lab">workspaceRoot</span>
          <input
            type="text"
            class="cs-meta-inline-inp cs-meta-inline-grow"
            :value="modelValue.workspaceRoot ?? ''"
            :title="csCanvasMsg.edWorkspaceRootTitle"
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
      @add-top-level-ns="addTopLevelNs"
      @add-child-ns="addChildNs"
      @add-class="addClass"
      @add-class-enum="addClassEnum"
      @add-enum="addEnum"
      @add-var="addVar"
      @add-fn="addFn"
      @add-macro="addMacro"
      @request-delete-pick="requestDeletePick"
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
      @add-enum="addEnum"
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
      :class-path="classFloatCtx.classPath"
      :run-patch="patch"
      @close="closeFloat"
    />
    <CodespaceEnumFloat
      v-if="enumFloatCtx"
      :open="floatOpen"
      :model-value="modelValue"
      :mi="enumFloatCtx.mi"
      :path="enumFloatCtx.path"
      :eni="enumFloatCtx.eni"
      :ci="enumFloatCtx.ci"
      :class-path="enumFloatCtx.classPath"
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
      <summary>{{ csCanvasMsg.edAdvancedSummary }}</summary>
      <FormatHint>{{ csCanvasMsg.edAdvancedHint }}</FormatHint>
      <textarea v-model="advancedJsonText" class="payload-ta" spellcheck="false" rows="12" aria-label="codespace raw json" />
      <button type="button" class="add-row" :title="csCanvasMsg.edAdvancedApplyTitle" @click="applyAdvancedJson">
        {{ csCanvasMsg.edAdvancedApplyLabel }}
      </button>
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
          <h2 id="cs-mod-del-title" class="msc-del-title">{{ csCanvasMsg.edDelModuleTitle }}</h2>
          <p class="msc-del-desc">{{ csCanvasMsg.edDelModuleDesc }}</p>
          <div class="msc-del-actions">
            <button type="button" class="msc-del-btn" :title="csCanvasMsg.edCancelBtnTitle" @click="cancelDeleteModule">
              {{ csCanvasMsg.edCancel }}
            </button>
            <button
              type="button"
              class="msc-del-btn msc-del-btn--danger"
              :title="csCanvasMsg.edConfirmDeleteBtnTitle"
              @click="confirmDeleteModule"
            >
              {{ csCanvasMsg.edConfirmDelete }}
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
          <h2 id="cs-ns-del-title" class="msc-del-title">{{ csCanvasMsg.edDelNsTitle }}</h2>
          <p class="msc-del-desc">{{ csCanvasMsg.edDelNsDesc }}</p>
          <div class="msc-del-actions">
            <button type="button" class="msc-del-btn" :title="csCanvasMsg.edCancelBtnTitle" @click="cancelDeleteNs">
              {{ csCanvasMsg.edCancel }}
            </button>
            <button
              type="button"
              class="msc-del-btn msc-del-btn--danger"
              :title="csCanvasMsg.edConfirmDeleteBtnTitle"
              @click="confirmDeleteNs"
            >
              {{ csCanvasMsg.edConfirmDelete }}
            </button>
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
  flex: 0 0 auto;
  /* 典型围栏 id：前缀 + base36 时间戳 + 随机段，约 20–26 字；ch 按数字宽估算 */
  width: 26ch;
  min-width: 26ch;
  max-width: 40ch;
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
