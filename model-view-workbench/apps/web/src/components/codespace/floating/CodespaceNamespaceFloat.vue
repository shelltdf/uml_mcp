<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { MvCodespaceNamespaceNode, MvModelCodespacePayload } from '@mvwb/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import { getNamespaceAtPath, rebuildPathIdsForModule } from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const cs = inject(CS_CANVAS_MSG_KEY)!;

const props = defineProps<{
  open: boolean;
  modelValue: MvModelCodespacePayload;
  mi: number;
  path: number[];
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
}>();

const emit = defineEmits<{
  close: [];
  addChildNs: [mi: number, path: number[]];
  addClass: [mi: number, path: number[]];
  addVar: [mi: number, path: number[]];
  addFn: [mi: number, path: number[]];
  addMacro: [mi: number, path: number[]];
  requestDeleteNs: [mi: number, path: number[]];
}>();

const ns = computed((): MvCodespaceNamespaceNode | null =>
  getNamespaceAtPath(props.modelValue, props.mi, props.path),
);
const parentPathKey = computed(() => props.path.slice(0, -1).join('.'));
const parentNsOptions = computed(() => {
  const mod = props.modelValue.modules?.[props.mi];
  const out: Array<{ key: string; label: string; path: number[] }> = [
    { key: '', label: '(module root)', path: [] },
  ];
  const selfPath = props.path;
  const isDescendantPath = (candidate: number[]): boolean => {
    if (candidate.length < selfPath.length) return false;
    for (let i = 0; i < selfPath.length; i++) {
      if (candidate[i] !== selfPath[i]) return false;
    }
    return true;
  };
  const walk = (nodes: MvCodespaceNamespaceNode[] | undefined, base: number[]) => {
    if (!nodes) return;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!;
      const p = [...base, i];
      // 不能迁移到自身或后代下，避免循环。
      if (!isDescendantPath(p)) {
        out.push({
          key: p.join('.'),
          label: p.map((x) => String(x)).join('/') + ` · ${n.name}`,
          path: p,
        });
      }
      walk(n.namespaces, p);
    }
  };
  walk(mod?.namespaces, []);
  return out;
});
const ENGLISH_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const nameError = ref('');

function patchNsField(key: 'name' | 'qualifiedName' | 'notes', value: string) {
  props.runPatch((d) => {
    const n = getNamespaceAtPath(d, props.mi, props.path);
    if (!n) return;
    if (key === 'name') {
      n.name = value;
      rebuildPathIdsForModule(d, props.mi);
    }
    else {
      const v = value.trim();
      n[key] = v ? value : undefined;
    }
  });
}

function onNsNameInput(value: string) {
  if (!ENGLISH_NAME_RE.test(value)) {
    nameError.value = cs.value.flNsNameEnglishOnly;
    return;
  }
  nameError.value = '';
  patchNsField('name', value);
}

function moveNamespaceParent(targetKey: string): void {
  if (targetKey === parentPathKey.value) return;
  const target = parentNsOptions.value.find((o) => o.key === targetKey);
  if (!target) return;
  props.runPatch((d) => {
    const mod = d.modules?.[props.mi];
    if (!mod?.namespaces) return;
    const oldParentPath = props.path.slice(0, -1);
    const oldIdx = props.path[props.path.length - 1];
    let oldSiblings: MvCodespaceNamespaceNode[] | undefined;
    if (!oldParentPath.length) oldSiblings = mod.namespaces;
    else oldSiblings = getNamespaceAtPath(d, props.mi, oldParentPath)?.namespaces;
    if (!oldSiblings || oldIdx === undefined) return;
    const [moved] = oldSiblings.splice(oldIdx, 1);
    if (!moved) return;
    if (!target.path.length) {
      if (!mod.namespaces) mod.namespaces = [];
      mod.namespaces.push(moved);
    } else {
      const parent = getNamespaceAtPath(d, props.mi, target.path);
      if (!parent) return;
      if (!parent.namespaces) parent.namespaces = [];
      parent.namespaces.push(moved);
    }
    rebuildPathIdsForModule(d, props.mi);
  });
  emit('close');
}
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!ns"
    :title="ns ? cs.flNsTitle(ns.name) : cs.flNsBare"
    @close="emit('close')"
  >
    <template v-if="ns">
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="ns.name"
          :title="cs.flNsNameTitle"
          @input="onNsNameInput(($event.target as HTMLInputElement).value)"
        />
        <small v-if="nameError" class="cs-error">{{ nameError }}</small>
      </label>
      <label class="field">
        <span>qualifiedName</span>
        <input
          type="text"
          class="wide"
          :value="ns.qualifiedName ?? ''"
          :title="cs.flNsQNameTitle"
          @input="patchNsField('qualifiedName', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="ns.notes ?? ''"
          :title="cs.flNsNotesTitle"
          @input="patchNsField('notes', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>parentNamespace</span>
        <select
          class="wide"
          :value="parentPathKey"
          title="Move this namespace under another namespace or module root"
          @change="moveNamespaceParent(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in parentNsOptions" :key="'pns-' + opt.key" :value="opt.key">
            {{ opt.label }}
          </option>
        </select>
      </label>
      <div class="cs-actions">
        <button type="button" class="add-row" :title="cs.flNsAddChildNsTitle" @click="emit('addChildNs', props.mi, props.path)">
          {{ cs.flNsAddChildNsLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddClassTitle" @click="emit('addClass', props.mi, props.path)">
          {{ cs.flNsAddClassLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddVarTitle" @click="emit('addVar', props.mi, props.path)">
          {{ cs.flNsAddVarLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddFnTitle" @click="emit('addFn', props.mi, props.path)">
          {{ cs.flNsAddFnLabel }}
        </button>
        <button type="button" class="add-row" :title="cs.flNsAddMacroTitle" @click="emit('addMacro', props.mi, props.path)">
          {{ cs.flNsAddMacroLabel }}
        </button>
        <button
          type="button"
          class="link-btn cs-danger"
          :title="cs.flNsDeleteTitle"
          @click="emit('requestDeleteNs', props.mi, props.path)"
        >
          {{ cs.flNsDeleteLabel }}
        </button>
      </div>
    </template>
  </CodespaceFloatShell>
</template>
