<script setup lang="ts">
import { computed, inject } from 'vue';
import type { MvCodespaceClassEnum, MvModelCodespacePayload } from '@mvwb/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import { getNamespaceAtPath } from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const csMsg = inject(CS_CANVAS_MSG_KEY)!;

const props = defineProps<{
  open: boolean;
  modelValue: MvModelCodespacePayload;
  mi: number;
  path: number[];
  eni: number;
  ci?: number;
  classPath?: number[];
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

function resolveEnum(payload: MvModelCodespacePayload): MvCodespaceClassEnum | null {
  const ns = getNamespaceAtPath(payload, props.mi, props.path);
  if (!ns) return null;
  if (props.ci === undefined) {
    return ns.enums?.[props.eni] ?? null;
  }
  let cls = ns.classes?.[props.ci];
  for (const idx of props.classPath ?? []) cls = cls?.classes?.[idx];
  return cls?.enums?.[props.eni] ?? null;
}

const enumItem = computed(() => resolveEnum(props.modelValue));
const floatTitle = computed(() => {
  const name = enumItem.value?.name?.trim() || `Enum#${props.eni + 1}`;
  return csMsg.value.formatEnumLabel(name);
});

function patchEnum(part: Partial<MvCodespaceClassEnum>) {
  props.runPatch((d) => {
    const e = resolveEnum(d);
    if (!e) return;
    Object.assign(e, part);
  });
}

function removeEnum() {
  props.runPatch((d) => {
    const ns = getNamespaceAtPath(d, props.mi, props.path);
    if (!ns) return;
    if (props.ci === undefined) {
      ns.enums?.splice(props.eni, 1);
      return;
    }
    let cls = ns.classes?.[props.ci];
    for (const idx of props.classPath ?? []) cls = cls?.classes?.[idx];
    cls?.enums?.splice(props.eni, 1);
  });
  emit('close');
}
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!enumItem"
    :title="floatTitle"
    @close="emit('close')"
  >
    <template v-if="enumItem">
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="enumItem.name"
          :title="csMsg.flTechNameTitle"
          @input="patchEnum({ name: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>group</span>
        <input
          type="text"
          class="wide"
          :value="enumItem.enumGroup ?? ''"
          title="enum group"
          @input="patchEnum({ enumGroup: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>value</span>
        <input
          type="text"
          class="wide"
          :value="enumItem.value ?? enumItem.type ?? ''"
          :title="csMsg.flTechTypeTitle"
          @input="patchEnum({ value: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>type</span>
        <input
          type="text"
          class="wide"
          :value="enumItem.type ?? ''"
          :title="csMsg.flTechTypeTitle"
          @input="patchEnum({ type: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="enumItem.notes ?? ''"
          :title="csMsg.flTechNotesTitle"
          @input="patchEnum({ notes: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <button type="button" class="link-btn cs-danger" :title="csMsg.flClsRemoveMemberTitle" @click="removeEnum">
        {{ csMsg.flClsRemoveMemberLabel }}
      </button>
    </template>
  </CodespaceFloatShell>
</template>
