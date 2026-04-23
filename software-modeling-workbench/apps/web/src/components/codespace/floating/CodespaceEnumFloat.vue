<script setup lang="ts">
import { computed, inject } from 'vue';
import type { MvCodespaceClassEnum, MvModelCodespacePayload } from '@mvwb/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import { getNamespaceAtPath } from '../../../utils/codespace-canvas';
import {
  formatModuleScopedPath,
  resolveNamespacePathLabel,
  resolveNestedClassifierNameChain,
} from '../../../utils/codespace-module-path';
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
const enumFullScopedPath = computed(() => {
  const e = enumItem.value;
  if (!e) return '';
  const nm = e.name?.trim() || `Enum#${props.eni + 1}`;
  const ns = resolveNamespacePathLabel(props.modelValue, props.mi, props.path);
  if (props.ci === undefined) {
    return formatModuleScopedPath(props.modelValue, props.mi, ns, nm);
  }
  const chain = resolveNestedClassifierNameChain(
    props.modelValue,
    props.mi,
    props.path,
    props.ci,
    props.classPath,
  );
  return formatModuleScopedPath(props.modelValue, props.mi, ns, chain, nm);
});
const floatTitle = computed(() => csMsg.value.formatEnumLabel(enumFullScopedPath.value));

function patchEnum(part: Partial<MvCodespaceClassEnum>) {
  props.runPatch((d) => {
    const e = resolveEnum(d);
    if (!e) return;
    Object.assign(e, part);
  });
}

function addLiteral() {
  props.runPatch((d) => {
    const e = resolveEnum(d);
    if (!e) return;
    if (!e.literals) e.literals = [];
    let i = e.literals.length + 1;
    let nextName = `Item${i}`;
    const used = new Set(
      e.literals
        .map((x) => x.split('=').map((p) => p.trim())[0] ?? '')
        .filter(Boolean),
    );
    while (used.has(nextName)) {
      i++;
      nextName = `Item${i}`;
    }
    e.literals.push(nextName);
  });
}

function parseLiteral(raw: string): { name: string; value: string } {
  const s = String(raw ?? '');
  const eq = s.indexOf('=');
  if (eq < 0) return { name: s.trim(), value: '' };
  return {
    name: s.slice(0, eq).trim(),
    value: s.slice(eq + 1).trim(),
  };
}

function patchLiteral(idx: number, part: { name?: string; value?: string }) {
  props.runPatch((d) => {
    const e = resolveEnum(d);
    if (!e?.literals?.[idx]) return;
    const cur = parseLiteral(e.literals[idx]);
    const name = (part.name ?? cur.name).trim();
    const value = (part.value ?? cur.value).trim();
    e.literals[idx] = value ? `${name} = ${value}` : name;
  });
}

function removeLiteral(idx: number) {
  props.runPatch((d) => {
    const e = resolveEnum(d);
    if (!e?.literals) return;
    e.literals.splice(idx, 1);
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
        <span>underlyingType</span>
        <input
          type="text"
          class="wide"
          :value="enumItem.type ?? ''"
          :title="csMsg.flTechTypeTitle"
          @input="patchEnum({ type: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <div class="field">
        <span>values</span>
        <div class="cs-literal-list">
          <div v-for="(lit, li) in enumItem.literals ?? []" :key="'lit-' + li" class="cs-literal-row">
            <input
              type="text"
              class="wide"
              :value="parseLiteral(lit).name"
              title="enum name"
              placeholder="name"
              @input="patchLiteral(li, { name: ($event.target as HTMLInputElement).value })"
            />
            <input
              type="text"
              class="wide"
              :value="parseLiteral(lit).value"
              title="enum value"
              placeholder="value"
              @input="patchLiteral(li, { value: ($event.target as HTMLInputElement).value })"
            />
            <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeLiteral(li)">
              {{ csMsg.flClsRemoveMemberLabel }}
            </button>
          </div>
          <button type="button" class="add-row" :title="csMsg.flClsAddEnumLiteralTitle" @click="addLiteral">
            {{ csMsg.flClsAddEnumLiteralLabel }}
          </button>
        </div>
      </div>
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

<style scoped>
.cs-literal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.cs-literal-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cs-literal-row .wide {
  flex: 1 1 auto;
}
</style>
