<script setup lang="ts">
import { computed, inject } from 'vue';
import type { MvCodespaceVariable, MvModelCodespacePayload } from '@mvwb/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import { getNamespaceAtPath } from '../../../utils/codespace-canvas';
import { formatModuleScopedPath, resolveNamespacePathLabel } from '../../../utils/codespace-module-path';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const csMsg = inject(CS_CANVAS_MSG_KEY)!;

const props = defineProps<{
  open: boolean;
  modelValue: MvModelCodespacePayload;
  mi: number;
  path: number[];
  vi: number;
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const v = computed((): MvCodespaceVariable | null =>
  getNamespaceAtPath(props.modelValue, props.mi, props.path)?.variables?.[props.vi] ?? null,
);

const fullScopedTitle = computed(() => {
  const item = v.value;
  if (!item) return '';
  const nm = (item.name ?? '').trim() || (item.id ?? '').trim() || `Var#${props.vi + 1}`;
  return formatModuleScopedPath(
    props.modelValue,
    props.mi,
    resolveNamespacePathLabel(props.modelValue, props.mi, props.path),
    nm,
  );
});

function patchVar(part: Partial<MvCodespaceVariable>) {
  props.runPatch((d) => {
    const x = getNamespaceAtPath(d, props.mi, props.path)?.variables?.[props.vi];
    if (!x) return;
    Object.assign(x, part);
  });
}

function removeVar() {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.variables?.splice(props.vi, 1);
  });
  emit('close');
}
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!v"
    :title="v ? csMsg.flVarTitle(fullScopedTitle) : csMsg.flVarBare"
    @close="emit('close')"
  >
    <template v-if="v">
      <label class="field">
        <span>id</span>
        <input
          type="text"
          class="wide"
          :value="v.id"
          :title="csMsg.flTechIdTitle"
          @input="patchVar({ id: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="v.name"
          :title="csMsg.flTechNameTitle"
          @input="patchVar({ name: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>type</span>
        <input
          type="text"
          class="wide"
          :value="v.type ?? ''"
          :title="csMsg.flTechTypeTitle"
          @input="patchVar({ type: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="v.notes ?? ''"
          :title="csMsg.flTechNotesTitle"
          @input="patchVar({ notes: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <button type="button" class="link-btn cs-danger" :title="csMsg.flVarDeleteTitle" @click="removeVar">
        {{ csMsg.flVarDeleteLabel }}
      </button>
    </template>
  </CodespaceFloatShell>
</template>
