<script setup lang="ts">
import { computed, inject } from 'vue';
import type { MvCodespaceMacro, MvModelCodespacePayload } from '@mvwb/core';
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
  maci: number;
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const mac = computed((): MvCodespaceMacro | null =>
  getNamespaceAtPath(props.modelValue, props.mi, props.path)?.macros?.[props.maci] ?? null,
);

const fullScopedTitle = computed(() => {
  const item = mac.value;
  if (!item) return '';
  const nm = (item.name ?? '').trim() || (item.id ?? '').trim() || `Macro#${props.maci + 1}`;
  return formatModuleScopedPath(
    props.modelValue,
    props.mi,
    resolveNamespacePathLabel(props.modelValue, props.mi, props.path),
    nm,
  );
});

function patchMacro(part: Partial<MvCodespaceMacro>) {
  props.runPatch((d) => {
    const m = getNamespaceAtPath(d, props.mi, props.path)?.macros?.[props.maci];
    if (!m) return;
    Object.assign(m, part);
  });
}

function removeMacro() {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.macros?.splice(props.maci, 1);
  });
  emit('close');
}
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!mac"
    :title="mac ? csMsg.flMacroTitle(fullScopedTitle) : csMsg.flMacroBare"
    @close="emit('close')"
  >
    <template v-if="mac">
      <label class="field">
        <span>id</span>
        <input
          type="text"
          class="wide"
          :value="mac.id"
          :title="csMsg.flTechIdTitle"
          @input="patchMacro({ id: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="mac.name"
          :title="csMsg.flTechNameTitle"
          @input="patchMacro({ name: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>params</span>
        <input
          type="text"
          class="wide"
          :value="mac.params ?? ''"
          :title="csMsg.flTechParamsTitle"
          @input="patchMacro({ params: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>definitionSnippet</span>
        <textarea
          class="payload-ta"
          rows="3"
          spellcheck="false"
          :value="mac.definitionSnippet ?? ''"
          :title="csMsg.flTechDefSnippetTitle"
          @input="patchMacro({ definitionSnippet: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="mac.notes ?? ''"
          :title="csMsg.flTechNotesTitle"
          @input="patchMacro({ notes: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <button type="button" class="link-btn cs-danger" :title="csMsg.flMacroDeleteTitle" @click="removeMacro">
        {{ csMsg.flMacroDeleteLabel }}
      </button>
    </template>
  </CodespaceFloatShell>
</template>
