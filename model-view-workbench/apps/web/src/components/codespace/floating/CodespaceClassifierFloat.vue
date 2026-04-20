<script setup lang="ts">
import { computed, inject } from 'vue';
import type {
  MvCodespaceClassifier,
  MvCodespaceClassifierBase,
  MvCodespaceMember,
  MvModelCodespacePayload,
} from '@mvwb/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import { collectClassifierIds, getNamespaceAtPath } from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const csMsg = inject(CS_CANVAS_MSG_KEY)!;

const CLASSIFIER_KINDS = ['class', 'interface', 'struct'] as const;
const MEMBER_KINDS = ['field', 'method', 'enumLiteral'] as const;
const BASE_REL = ['generalization', 'realization'] as const;

const props = defineProps<{
  open: boolean;
  modelValue: MvModelCodespacePayload;
  mi: number;
  path: number[];
  ci: number;
  runPatch: (fn: (d: MvModelCodespacePayload) => void) => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const selectedClass = computed((): MvCodespaceClassifier | null =>
  getNamespaceAtPath(props.modelValue, props.mi, props.path)?.classes?.[props.ci] ?? null,
);

const classifierOptions = computed(() => collectClassifierIds(props.modelValue));

function classTemplateParamsStr(): string {
  const c = getNamespaceAtPath(props.modelValue, props.mi, props.path)?.classes?.[props.ci];
  return (c?.templateParams ?? []).join(', ');
}

function patchClassField(key: keyof MvCodespaceClassifier, value: unknown) {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (key === 'kind') {
      const s = typeof value === 'string' ? value : '';
      if (!s || s === 'class') delete c.kind;
      else c.kind = s as MvCodespaceClassifier['kind'];
      return;
    }
    if (key === 'abstract') {
      c.abstract = value === true ? true : undefined;
      return;
    }
    if (key === 'id' || key === 'name') {
      (c as unknown as Record<string, unknown>)[key] = value;
      return;
    }
    if (key === 'stereotype' || key === 'notes') {
      const str = String(value ?? '').trim();
      (c as unknown as Record<string, unknown>)[key] = str ? String(value) : undefined;
    }
  });
}

function setClassTemplateParams(raw: string) {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    const parts = raw
      .split(/[,，\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    c.templateParams = parts.length ? parts : undefined;
  });
}

function addBase() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.bases) c.bases = [];
    const ids = collectClassifierIds(d);
    const tid = ids.find((id) => id !== c.id) ?? ids[0] ?? c.id;
    c.bases.push({ targetId: tid, relation: 'generalization' });
  });
}

function patchBase(bi: number, part: Partial<MvCodespaceClassifierBase>) {
  props.runPatch((d) => {
    const b = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.bases?.[bi];
    if (!b) return;
    Object.assign(b, part);
  });
}

function removeBase(bi: number) {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.bases?.splice(bi, 1);
  });
}

function addMember() {
  const name = csMsg.value.newMemberName;
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.members) c.members = [];
    c.members.push({ name, kind: 'field' });
  });
}

function patchMember(miIdx: number, part: Partial<MvCodespaceMember>) {
  props.runPatch((d) => {
    const mem = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.members?.[miIdx];
    if (!mem) return;
    Object.assign(mem, part);
  });
}

function removeMember(miIdx: number) {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.members?.splice(miIdx, 1);
  });
}

function removeClass() {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.splice(props.ci, 1);
  });
  emit('close');
}
</script>

<template>
  <CodespaceFloatShell
    :open="open && !!selectedClass"
    :title="selectedClass ? csMsg.flClassifierTitle(selectedClass.name) : csMsg.flClassifierBare"
    @close="emit('close')"
  >
    <template v-if="selectedClass">
      <label class="field">
        <span>id</span>
        <input
          type="text"
          class="wide"
          :value="selectedClass.id"
          :title="csMsg.flClsIdTitle"
          @input="patchClassField('id', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>name</span>
        <input
          type="text"
          class="wide"
          :value="selectedClass.name"
          :title="csMsg.flClsNameTitle"
          @input="patchClassField('name', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>kind</span>
        <select
          class="wide"
          :title="csMsg.flClsKindTitle"
          :value="selectedClass.kind ?? 'class'"
          @change="patchClassField('kind', ($event.target as HTMLSelectElement).value || undefined)"
        >
          <option v-for="k in CLASSIFIER_KINDS" :key="k" :value="k">{{ k }}</option>
        </select>
      </label>
      <label class="field cs-check">
        <input
          type="checkbox"
          :checked="selectedClass.abstract === true"
          :title="csMsg.flClsAbstractTitle"
          @change="patchClassField('abstract', ($event.target as HTMLInputElement).checked)"
        />
        <span>abstract</span>
      </label>
      <label class="field">
        <span>stereotype</span>
        <input
          type="text"
          class="wide"
          :value="selectedClass.stereotype ?? ''"
          :title="csMsg.flClsStereotypeTitle"
          @input="patchClassField('stereotype', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>{{ csMsg.flClsTemplateParamsLabel }}</span>
        <textarea
          class="payload-ta"
          rows="3"
          spellcheck="false"
          :value="classTemplateParamsStr()"
          :title="csMsg.flClsTemplateParamsTitle"
          @input="setClassTemplateParams(($event.target as HTMLTextAreaElement).value)"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <input
          type="text"
          class="wide"
          :value="selectedClass.notes ?? ''"
          :title="csMsg.flClsNotesTitle"
          @input="patchClassField('notes', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <h5 class="cs-subh">{{ csMsg.flClsBasesHeading }}</h5>
      <div v-for="(b, bi) in selectedClass.bases ?? []" :key="bi" class="cs-rowline">
        <select
          :title="csMsg.flClsTargetIdTitle"
          :value="b.targetId"
          @change="patchBase(bi, { targetId: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="cid in classifierOptions" :key="cid" :value="cid">{{ cid }}</option>
        </select>
        <select
          :title="csMsg.flClsRelationTitle"
          :value="b.relation"
          @change="
            patchBase(bi, {
              relation: ($event.target as HTMLSelectElement).value as MvCodespaceClassifierBase['relation'],
            })
          "
        >
          <option v-for="r in BASE_REL" :key="r" :value="r">{{ r }}</option>
        </select>
        <button type="button" class="link-btn" :title="csMsg.flClsDelShortTitle" @click="removeBase(bi)">
          {{ csMsg.flClsDelShortLabel }}
        </button>
      </div>
      <button type="button" class="add-row" :title="csMsg.flClsAddBaseTitle" @click="addBase">
        {{ csMsg.flClsAddBaseLabel }}
      </button>

      <h5 class="cs-subh">{{ csMsg.flClsMembersHeading }}</h5>
      <table v-if="(selectedClass.members?.length ?? 0) > 0" class="cs-table">
        <thead>
          <tr>
            <th>name</th>
            <th>kind</th>
            <th>visibility</th>
            <th>virtual</th>
            <th>type / signature</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(mem, miIdx) in selectedClass.members" :key="miIdx">
            <td>
              <input
                :value="mem.name"
                :title="csMsg.flClsMemberNameTitle"
                @input="patchMember(miIdx, { name: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td>
              <select
                :value="mem.kind"
                :title="csMsg.flClsMemberKindTitle"
                @change="
                  patchMember(miIdx, {
                    kind: ($event.target as HTMLSelectElement).value as MvCodespaceMember['kind'],
                  })
                "
              >
                <option v-for="mk in MEMBER_KINDS" :key="mk" :value="mk">{{ mk }}</option>
              </select>
            </td>
            <td>
              <input
                :value="mem.visibility ?? ''"
                :title="csMsg.flClsMemberVisTitle"
                @input="patchMember(miIdx, { visibility: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="mem.virtual === true"
                :title="csMsg.flClsMemberVirtualTitle"
                @change="patchMember(miIdx, { virtual: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td>
              <input
                :value="mem.kind === 'method' ? mem.signature ?? '' : mem.type ?? ''"
                :placeholder="mem.kind === 'method' ? 'signature' : 'type'"
                :title="csMsg.flClsMemberTypeSigTitle"
                @input="
                  patchMember(
                    miIdx,
                    mem.kind === 'method'
                      ? { signature: ($event.target as HTMLInputElement).value }
                      : { type: ($event.target as HTMLInputElement).value },
                  )
                "
              />
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeMember(miIdx)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="add-row" :title="csMsg.flClsAddMemberTitle" @click="addMember">
        {{ csMsg.flClsAddMemberLabel }}
      </button>

      <div class="cs-actions">
        <button type="button" class="link-btn cs-danger" :title="csMsg.flClsRemoveClassTitle" @click="removeClass">
          {{ csMsg.flClsRemoveClassLabel }}
        </button>
      </div>
    </template>
  </CodespaceFloatShell>
</template>
