<script setup lang="ts">
import { computed } from 'vue';
import type { MvCodespaceFunction, MvModelCodespacePayload } from '@mvwb/core';
import { getNamespaceAtPath } from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const props = defineProps<{
  open: boolean;
  modelValue: MvModelCodespacePayload;
  mi: number;
  path: number[];
  fi: number;
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const fn = computed((): MvCodespaceFunction | null =>
  getNamespaceAtPath(props.modelValue, props.mi, props.path)?.functions?.[props.fi] ?? null,
);

function patchFn(part: Partial<MvCodespaceFunction>) {
  props.runPatch((d) => {
    const f = getNamespaceAtPath(d, props.mi, props.path)?.functions?.[props.fi];
    if (!f) return;
    Object.assign(f, part);
  });
}

function removeFn() {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.functions?.splice(props.fi, 1);
  });
  emit('close');
}
</script>

<template>
  <CodespaceFloatShell :open="open && !!fn" :title="fn ? `函数 · ${fn.name}` : '函数'" @close="emit('close')">
    <template v-if="fn">
      <label class="field">
        <span>id</span>
        <input type="text" class="wide" :value="fn.id" title="id — 无全局快捷键" @input="patchFn({ id: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">
        <span>name</span>
        <input type="text" class="wide" :value="fn.name" title="name — 无全局快捷键" @input="patchFn({ name: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">
        <span>signature</span>
        <input
          type="text"
          class="wide"
          :value="fn.signature ?? ''"
          title="signature — 无全局快捷键"
          @input="patchFn({ signature: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input type="text" class="wide" :value="fn.notes ?? ''" title="notes — 无全局快捷键" @input="patchFn({ notes: ($event.target as HTMLInputElement).value })" />
      </label>
      <button type="button" class="link-btn cs-danger" title="删除函数 — 无全局快捷键" @click="removeFn">删除函数</button>
    </template>
  </CodespaceFloatShell>
</template>
