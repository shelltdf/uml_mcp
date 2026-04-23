<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { MvModelCodespaceModule, MvModelCodespacePayload } from '@smw/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const cs = inject(CS_CANVAS_MSG_KEY)!;

const props = defineProps<{
  open: boolean;
  modelValue: MvModelCodespacePayload;
  mi: number;
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
}>();

const emit = defineEmits<{
  close: [];
  requestDelete: [mi: number];
  addTopLevelNs: [mi: number];
}>();

const mod = computed((): MvModelCodespaceModule | null => props.modelValue.modules[props.mi] ?? null);
const ENGLISH_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const nameError = ref('');

function patchModuleField(key: keyof MvModelCodespaceModule, value: string) {
  props.runPatch((d) => {
    const m = d.modules[props.mi];
    if (!m) return;
    if (key === 'id' || key === 'name') {
      (m as unknown as Record<string, unknown>)[key] = value;
      return;
    }
    const v = value.trim();
    (m as unknown as Record<string, unknown>)[key] = v ? value : undefined;
  });
}

function onModuleNameInput(value: string) {
  if (!ENGLISH_NAME_RE.test(value)) {
    nameError.value = cs.value.flModNameEnglishOnly;
    return;
  }
  nameError.value = '';
  patchModuleField('name', value);
}
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!mod"
    :title="mod ? cs.flModuleTitle(mod.name) : cs.flModuleBare"
    @close="emit('close')"
  >
    <template v-if="mod">
      <label class="field">
        <span>id</span>
        <input
          type="text"
          class="wide"
          :value="mod.id"
          :title="cs.flModIdTitle"
          @input="patchModuleField('id', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="mod.name"
          :title="cs.flModNameTitle"
          @input="onModuleNameInput(($event.target as HTMLInputElement).value)"
        />
        <small v-if="nameError" class="cs-error">{{ nameError }}</small>
      </label>
      <label class="field">
        <span>path</span>
        <input
          type="text"
          class="wide"
          :value="mod.path ?? ''"
          :title="cs.flModPathTitle"
          @input="patchModuleField('path', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>role</span>
        <input
          type="text"
          class="wide"
          :value="mod.role ?? ''"
          :title="cs.flModRoleTitle"
          @input="patchModuleField('role', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="mod.notes ?? ''"
          :title="cs.flModNotesTitle"
          @input="patchModuleField('notes', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <div class="cs-actions">
        <button type="button" class="add-row" :title="cs.flModAddRootNsTitle" @click="emit('addTopLevelNs', props.mi)">
          {{ cs.flModAddRootNsLabel }}
        </button>
        <button type="button" class="link-btn cs-danger" :title="cs.flModDeleteTitle" @click="emit('requestDelete', props.mi)">
          {{ cs.flModDeleteLabel }}
        </button>
      </div>
    </template>
  </CodespaceFloatShell>
</template>
