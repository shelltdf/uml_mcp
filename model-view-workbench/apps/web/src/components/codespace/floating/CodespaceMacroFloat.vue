<script setup lang="ts">
import { computed } from 'vue';
import type { MvCodespaceMacro, MvModelCodespacePayload } from '@mvwb/core';
import { getNamespaceAtPath } from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

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
  <CodespaceFloatShell :open="open && !!mac" :title="mac ? `宏 · ${mac.name}` : '宏'" @close="emit('close')">
    <template v-if="mac">
      <label class="field">
        <span>id</span>
        <input type="text" class="wide" :value="mac.id" title="id — 无全局快捷键" @input="patchMacro({ id: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">
        <span>name</span>
        <input type="text" class="wide" :value="mac.name" title="name — 无全局快捷键" @input="patchMacro({ name: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">
        <span>params</span>
        <input type="text" class="wide" :value="mac.params ?? ''" title="params — 无全局快捷键" @input="patchMacro({ params: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">
        <span>definitionSnippet</span>
        <textarea
          class="payload-ta"
          rows="3"
          spellcheck="false"
          :value="mac.definitionSnippet ?? ''"
          title="definitionSnippet — 无全局快捷键"
          @input="patchMacro({ definitionSnippet: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input type="text" class="wide" :value="mac.notes ?? ''" title="notes — 无全局快捷键" @input="patchMacro({ notes: ($event.target as HTMLInputElement).value })" />
      </label>
      <button type="button" class="link-btn cs-danger" title="删除宏 — 无全局快捷键" @click="removeMacro">删除宏</button>
    </template>
  </CodespaceFloatShell>
</template>
