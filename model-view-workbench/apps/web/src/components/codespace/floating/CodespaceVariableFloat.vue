<script setup lang="ts">
import { computed } from 'vue';
import type { MvCodespaceVariable, MvModelCodespacePayload } from '@mvwb/core';
import { getNamespaceAtPath } from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

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
  <CodespaceFloatShell :open="open && !!v" :title="v ? `变量 · ${v.name}` : '变量'" @close="emit('close')">
    <template v-if="v">
      <label class="field">
        <span>id</span>
        <input type="text" class="wide" :value="v.id" title="id — 无全局快捷键" @input="patchVar({ id: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">
        <span>name</span>
        <input type="text" class="wide" :value="v.name" title="name — 无全局快捷键" @input="patchVar({ name: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">
        <span>type</span>
        <input type="text" class="wide" :value="v.type ?? ''" title="type — 无全局快捷键" @input="patchVar({ type: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">
        <span>notes</span>
        <input type="text" class="wide" :value="v.notes ?? ''" title="notes — 无全局快捷键" @input="patchVar({ notes: ($event.target as HTMLInputElement).value })" />
      </label>
      <button type="button" class="link-btn cs-danger" title="删除变量 — 无全局快捷键" @click="removeVar">删除变量</button>
    </template>
  </CodespaceFloatShell>
</template>
