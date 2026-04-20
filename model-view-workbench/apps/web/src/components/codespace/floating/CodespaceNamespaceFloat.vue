<script setup lang="ts">
import { computed, inject } from 'vue';
import type { MvCodespaceNamespaceNode, MvModelCodespacePayload } from '@mvwb/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import { getNamespaceAtPath } from '../../../utils/codespace-canvas';
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

function patchNsField(key: 'name' | 'qualifiedName' | 'notes', value: string) {
  props.runPatch((d) => {
    const n = getNamespaceAtPath(d, props.mi, props.path);
    if (!n) return;
    if (key === 'name') n.name = value;
    else {
      const v = value.trim();
      n[key] = v ? value : undefined;
    }
  });
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
          @input="patchNsField('name', ($event.target as HTMLInputElement).value)"
        />
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
