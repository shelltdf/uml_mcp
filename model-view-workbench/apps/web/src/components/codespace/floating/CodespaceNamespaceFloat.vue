<script setup lang="ts">
import { computed } from 'vue';
import type { MvCodespaceNamespaceNode, MvModelCodespacePayload } from '@mvwb/core';
import { getNamespaceAtPath } from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

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
    :title="ns ? `命名空间 · ${ns.name}` : '命名空间'"
    @close="emit('close')"
  >
    <template v-if="ns">
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="ns.name"
          title="命名空间名称 — 无全局快捷键"
          @input="patchNsField('name', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>qualifiedName</span>
        <input
          type="text"
          class="wide"
          :value="ns.qualifiedName ?? ''"
          title="可选全名 — 无全局快捷键"
          @input="patchNsField('qualifiedName', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="ns.notes ?? ''"
          title="备注 — 无全局快捷键"
          @input="patchNsField('notes', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <div class="cs-actions">
        <button type="button" class="add-row" title="子命名空间 — 无全局快捷键" @click="emit('addChildNs', props.mi, props.path)">
          ＋ 子命名空间
        </button>
        <button type="button" class="add-row" title="类 — 无全局快捷键" @click="emit('addClass', props.mi, props.path)">＋ 类</button>
        <button type="button" class="add-row" title="变量 — 无全局快捷键" @click="emit('addVar', props.mi, props.path)">＋ 变量</button>
        <button type="button" class="add-row" title="函数 — 无全局快捷键" @click="emit('addFn', props.mi, props.path)">＋ 函数</button>
        <button type="button" class="add-row" title="宏 — 无全局快捷键" @click="emit('addMacro', props.mi, props.path)">＋ 宏</button>
        <button
          type="button"
          class="link-btn cs-danger"
          title="删除命名空间子树 — 无全局快捷键"
          @click="emit('requestDeleteNs', props.mi, props.path)"
        >
          删除命名空间…
        </button>
      </div>
    </template>
  </CodespaceFloatShell>
</template>
