<script setup lang="ts">
import { computed } from 'vue';
import type { MvModelCodespaceModule, MvModelCodespacePayload } from '@mvwb/core';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

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
</script>

<template>
  <CodespaceFloatShell :open="open && !!mod" :title="mod ? `模块 · ${mod.name}` : '模块'" @close="emit('close')">
    <template v-if="mod">
      <label class="field">
        <span>id</span>
        <input
          type="text"
          class="wide"
          :value="mod.id"
          title="模块 id — 无全局快捷键"
          @input="patchModuleField('id', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="mod.name"
          title="模块名称 — 无全局快捷键"
          @input="patchModuleField('name', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>path</span>
        <input
          type="text"
          class="wide"
          :value="mod.path ?? ''"
          title="相对路径 — 无全局快捷键"
          @input="patchModuleField('path', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>role</span>
        <input
          type="text"
          class="wide"
          :value="mod.role ?? ''"
          title="角色 — 无全局快捷键"
          @input="patchModuleField('role', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="mod.notes ?? ''"
          title="备注 — 无全局快捷键"
          @input="patchModuleField('notes', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <div class="cs-actions">
        <button
          type="button"
          class="add-row"
          title="在本模块下添加顶层命名空间 — 无全局快捷键"
          @click="emit('addTopLevelNs', props.mi)"
        >
          ＋ 顶层命名空间
        </button>
        <button type="button" class="link-btn cs-danger" title="删除模块 — 无全局快捷键" @click="emit('requestDelete', props.mi)">
          删除模块…
        </button>
      </div>
    </template>
  </CodespaceFloatShell>
</template>
