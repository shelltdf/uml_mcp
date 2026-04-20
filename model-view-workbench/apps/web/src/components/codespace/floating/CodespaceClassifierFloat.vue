<script setup lang="ts">
import { computed, inject } from 'vue';
import type {
  MvCodespaceAccessorVisibility,
  MvCodespaceClassifier,
  MvCodespaceClassifierBase,
  MvCodespaceMember,
  MvCodespaceMethodKind,
  MvCodespaceProperty,
  MvModelCodespacePayload,
} from '@mvwb/core';
import { CS_CANVAS_MSG_KEY } from '../../../i18n/codespace-canvas-messages';
import {
  collectClassifierIds,
  getNamespaceAtPath,
  rebuildPathIdsForModule,
} from '../../../utils/codespace-canvas';
import CodespaceFloatShell from '../CodespaceFloatShell.vue';

const csMsg = inject(CS_CANVAS_MSG_KEY)!;

const CLASSIFIER_KINDS = ['class', 'interface', 'struct'] as const;
const BASE_REL = ['generalization', 'realization'] as const;
const METHOD_KINDS: readonly MvCodespaceMethodKind[] = [
  'normal',
  'constructor',
  'destructor',
  'functor',
  'operator',
];
const ACCESS_VIS: readonly MvCodespaceAccessorVisibility[] = ['public', 'protected', 'private', 'package'];
const MEMBER_VIS_OPTIONS: readonly string[] = ['public', 'protected', 'private', 'package'];
const MEMBER_TYPE_OPTIONS: readonly string[] = [
  'string',
  'int',
  'float',
  'boolean',
  'json',
  'number',
  'void',
  'any',
  'unknown',
];
const OPERATOR_SYMBOL_OPTIONS = ['+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>=', '[]', '()'] as const;

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
const fieldRows = computed(() =>
  (selectedClass.value?.members ?? [])
    .map((mem, idx) => ({ mem, idx }))
    .filter((r) => r.mem.kind === 'field' && (r.mem.accessor === undefined || r.mem.accessor === 'none')),
);
const methodRows = computed(() =>
  (selectedClass.value?.members ?? [])
    .map((mem, idx) => ({ mem, idx }))
    .filter((r) => r.mem.kind === 'method'),
);
const enumRows = computed(() =>
  (selectedClass.value?.members ?? [])
    .map((mem, idx) => ({ mem, idx }))
    .filter((r) => r.mem.kind === 'enumLiteral'),
);
const propertyRows = computed(() => selectedClass.value?.properties ?? []);
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
    if (key === 'name') {
      (c as unknown as Record<string, unknown>)[key] = value;
      rebuildPathIdsForModule(d, props.mi);
      return;
    }
    if (key === 'stereotype' || key === 'notes') {
      const str = String(value ?? '').trim();
      (c as unknown as Record<string, unknown>)[key] = str ? String(value) : undefined;
    }
  });
}

function normalizeMemberByKind(mem: MvCodespaceMember): void {
  if (mem.kind === 'field') {
    delete mem.signature;
    delete mem.methodKind;
    delete mem.operatorSymbol;
    if (!mem.visibility) mem.visibility = 'private';
    // members 语义收敛为“普通成员变量”，不承载 accessor 关系
    delete mem.accessor;
    delete mem.enumGroup;
    return;
  }
  if (mem.kind === 'method') {
    delete mem.accessor;
    if (!mem.methodKind) mem.methodKind = 'normal';
    if (!mem.signature) mem.signature = '()';
    if (!mem.type) mem.type = 'int';
    if (mem.methodKind !== 'operator') delete mem.operatorSymbol;
    delete mem.enumGroup;
    return;
  }
  delete mem.type;
  delete mem.signature;
  delete mem.accessor;
  delete mem.methodKind;
  delete mem.operatorSymbol;
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
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.members) c.members = [];
    const name = ensureUniqueMemberName(c.members, csMsg.value.newMemberName);
    c.members.push({ name, kind: 'field', visibility: 'public', type: 'int' });
  });
}

function addProperty() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.properties) c.properties = [];
    const name = ensureUniquePropertyName(c.properties, 'property');
    c.properties.push({
      name,
      backingFieldName: `_${name}`,
      backingVisibility: 'private',
      type: 'int',
      hasGetter: true,
      hasSetter: true,
      getterVisibility: 'public',
      setterVisibility: 'public',
    });
  });
}

function ensureUniqueMemberName(members: MvCodespaceMember[], preferred: string): string {
  const base = (preferred || 'member').trim() || 'member';
  const used = new Set(members.map((m) => (m.name ?? '').trim()).filter(Boolean));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

function ensureUniquePropertyName(properties: MvCodespaceProperty[], preferred: string): string {
  const base = (preferred || 'property').trim() || 'property';
  const used = new Set(properties.map((p) => (p.name ?? '').trim()).filter(Boolean));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

function memberTypeKnown(v: string | undefined): boolean {
  const t = (v ?? '').trim();
  return !!t && MEMBER_TYPE_OPTIONS.includes(t);
}

function addMethodMember() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.members) c.members = [];
    const name = ensureUniqueMemberName(c.members, 'method');
    c.members.push({ name, kind: 'method', methodKind: 'normal', signature: '()', type: 'int' });
  });
}

function addEnumMember() {
  props.runPatch((d) => {
    const c = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci];
    if (!c) return;
    if (!c.members) c.members = [];
    const name = ensureUniqueMemberName(c.members, 'ENUM');
    c.members.push({ name, kind: 'enumLiteral', enumGroup: 'default' });
  });
}

function patchProperty(pi: number, part: Partial<MvCodespaceProperty>) {
  props.runPatch((d) => {
    const prop = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.properties?.[pi];
    if (!prop) return;
    Object.assign(prop, part);
  });
}

function removeProperty(pi: number) {
  props.runPatch((d) => {
    getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.properties?.splice(pi, 1);
  });
}

function patchMember(miIdx: number, part: Partial<MvCodespaceMember>) {
  props.runPatch((d) => {
    const mem = getNamespaceAtPath(d, props.mi, props.path)?.classes?.[props.ci]?.members?.[miIdx];
    if (!mem) return;
    Object.assign(mem, part);
    normalizeMemberByKind(mem);
    if (mem.kind === 'method' && mem.methodKind === 'operator') {
      const op = String(mem.operatorSymbol ?? '').trim();
      mem.operatorSymbol = op || '()';
    }
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
    :allow-maximize="true"
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
          readonly
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
      <div class="cs-inline-pair">
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
      </div>
      <label class="field">
        <span>stereotype</span>
        <input
          type="text"
          class="wide"
          :value="selectedClass.stereotype ?? ''"
          :placeholder="csMsg.flClsStereotypePlaceholder"
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
          :placeholder="csMsg.flClsTemplateParamsPlaceholder"
          :title="csMsg.flClsTemplateParamsTitle"
          @input="setClassTemplateParams(($event.target as HTMLTextAreaElement).value)"
        />
      </label>
      <label class="field">
        <span>notes</span>
        <textarea
          class="payload-ta"
          rows="6"
          :value="selectedClass.notes ?? ''"
          :placeholder="csMsg.flClsNotesPlaceholder"
          :title="csMsg.flClsNotesTitle"
          @input="patchClassField('notes', ($event.target as HTMLTextAreaElement).value)"
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
      <table class="cs-table">
        <thead>
          <tr>
            <th>name</th>
            <th>visibility</th>
            <th>type</th>
            <th>static</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ mem, idx } in fieldRows" :key="'all-' + idx">
            <td>
              <input
                :value="mem.name"
                :title="csMsg.flClsMemberNameTitle"
                @input="patchMember(idx, { name: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td>
              <select
                :value="mem.visibility ?? 'public'"
                :title="csMsg.flClsMemberVisTitle"
                @change="patchMember(idx, { visibility: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="v in MEMBER_VIS_OPTIONS" :key="'mv-' + v" :value="v">{{ v }}</option>
              </select>
            </td>
            <td>
              <select
                :value="mem.type ?? 'int'"
                :title="csMsg.flClsMemberTypeSigTitle"
                @change="patchMember(idx, { type: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="t in MEMBER_TYPE_OPTIONS" :key="'mt-' + t" :value="t">{{ t }}</option>
                <option v-if="mem.type && !memberTypeKnown(mem.type)" :value="mem.type">
                  {{ mem.type }}
                </option>
              </select>
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="mem.static === true"
                :title="csMsg.flClsMemberStaticTitle"
                @change="patchMember(idx, { static: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeMember(idx)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="add-row" :title="csMsg.flClsAddMemberTitle" @click="addMember">
        {{ csMsg.flClsAddMemberLabel }}
      </button>

      <h5 class="cs-subh">{{ csMsg.flClsFieldsHeading }}</h5>
      <table class="cs-table">
        <thead>
          <tr>
            <th>name</th>
            <th>backingField</th>
            <th>backingVisibility</th>
            <th>type</th>
            <th>getter</th>
            <th>setter</th>
            <th>getterVis</th>
            <th>setterVis</th>
            <th>static</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(prop, pi) in propertyRows" :key="'p-' + pi">
            <td>
              <input
                :value="prop.name"
                :title="csMsg.flClsMemberNameTitle"
                @input="patchProperty(pi, { name: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td>
              <input
                :value="prop.backingFieldName ?? ''"
                :title="csMsg.flClsMemberVisTitle"
                @input="patchProperty(pi, { backingFieldName: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td>
              <input
                :value="prop.backingVisibility ?? ''"
                :title="csMsg.flClsMemberVisTitle"
                @input="patchProperty(pi, { backingVisibility: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td>
              <input
                :value="prop.type ?? ''"
                :title="csMsg.flClsMemberTypeSigTitle"
                @input="patchProperty(pi, { type: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="prop.hasGetter !== false"
                :title="csMsg.flClsMemberAccessorTitle"
                @change="patchProperty(pi, { hasGetter: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="prop.hasSetter !== false"
                :title="csMsg.flClsMemberAccessorTitle"
                @change="patchProperty(pi, { hasSetter: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td>
              <select
                :value="prop.getterVisibility ?? 'public'"
                :title="csMsg.flClsMemberAccessorTitle"
                @change="patchProperty(pi, { getterVisibility: ($event.target as HTMLSelectElement).value as MvCodespaceAccessorVisibility })"
              >
                <option v-for="a in ACCESS_VIS" :key="'gv-' + a" :value="a">{{ a }}</option>
              </select>
            </td>
            <td>
              <select
                :value="prop.setterVisibility ?? 'public'"
                :title="csMsg.flClsMemberAccessorTitle"
                @change="patchProperty(pi, { setterVisibility: ($event.target as HTMLSelectElement).value as MvCodespaceAccessorVisibility })"
              >
                <option v-for="a in ACCESS_VIS" :key="'sv-' + a" :value="a">{{ a }}</option>
              </select>
            </td>
            <td class="cs-td-center">
              <input
                type="checkbox"
                :checked="prop.static === true"
                :title="csMsg.flClsMemberStaticTitle"
                @change="patchProperty(pi, { static: ($event.target as HTMLInputElement).checked })"
              />
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeProperty(pi)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="add-row" :title="csMsg.flClsAddFieldTitle" @click="addProperty">
        {{ csMsg.flClsAddFieldLabel }}
      </button>
      <h5 class="cs-subh">{{ csMsg.flClsMethodsHeading }}</h5>
      <table class="cs-table">
        <thead>
          <tr>
            <th>name</th>
            <th>visibility</th>
            <th>methodKind</th>
            <th>params</th>
            <th>return</th>
            <th>virtual</th>
            <th>operator</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ mem, idx } in methodRows" :key="idx">
            <td>
              <input :value="mem.name" :title="csMsg.flClsMemberNameTitle" @input="patchMember(idx, { name: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <input :value="mem.visibility ?? ''" :title="csMsg.flClsMemberVisTitle" @input="patchMember(idx, { visibility: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <select
                :value="mem.methodKind ?? 'normal'"
                :title="csMsg.flClsMemberMethodKindTitle"
                @change="patchMember(idx, { methodKind: ($event.target as HTMLSelectElement).value as MvCodespaceMethodKind })"
              >
                <option v-for="mk in METHOD_KINDS" :key="mk" :value="mk">{{ mk }}</option>
              </select>
            </td>
            <td>
              <input :value="mem.signature ?? '()'" placeholder="(arg: int)" :title="csMsg.flClsMemberTypeSigTitle" @input="patchMember(idx, { signature: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <select
                :value="mem.type ?? 'int'"
                :title="csMsg.flClsMemberTypeSigTitle"
                @change="patchMember(idx, { type: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="t in MEMBER_TYPE_OPTIONS" :key="'mr-' + t" :value="t">{{ t }}</option>
                <option v-if="mem.type && !memberTypeKnown(mem.type)" :value="mem.type">
                  {{ mem.type }}
                </option>
              </select>
            </td>
            <td class="cs-td-center">
              <input type="checkbox" :checked="mem.virtual === true" :title="csMsg.flClsMemberVirtualTitle" @change="patchMember(idx, { virtual: ($event.target as HTMLInputElement).checked })" />
            </td>
            <td>
              <template v-if="(mem.methodKind ?? 'normal') === 'operator'">
                <select
                  :value="mem.operatorSymbol ?? '()'"
                  :title="csMsg.flClsMemberOperatorTitle"
                  @change="patchMember(idx, { operatorSymbol: ($event.target as HTMLSelectElement).value })"
                >
                  <option v-for="op in OPERATOR_SYMBOL_OPTIONS" :key="op" :value="op">{{ op }}</option>
                </select>
              </template>
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeMember(idx)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="add-row" :title="csMsg.flClsAddMethodTitle" @click="addMethodMember">
        {{ csMsg.flClsAddMethodLabel }}
      </button>

      <h5 class="cs-subh">{{ csMsg.flClsEnumLiteralsHeading }}</h5>
      <table class="cs-table">
        <thead>
          <tr>
            <th>name</th>
            <th>value/type</th>
            <th>group</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ mem, idx } in enumRows" :key="idx">
            <td>
              <input :value="mem.name" :title="csMsg.flClsMemberNameTitle" @input="patchMember(idx, { name: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <input :value="mem.type ?? ''" :title="csMsg.flClsMemberTypeSigTitle" @input="patchMember(idx, { type: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <input :value="mem.enumGroup ?? ''" placeholder="default" title="enum group" @input="patchMember(idx, { enumGroup: ($event.target as HTMLInputElement).value })" />
            </td>
            <td>
              <button type="button" class="link-btn" :title="csMsg.flClsRemoveMemberTitle" @click="removeMember(idx)">
                {{ csMsg.flClsRemoveMemberLabel }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="cs-actions">
        <button type="button" class="add-row" :title="csMsg.flClsAddEnumLiteralTitle" @click="addEnumMember">
          {{ csMsg.flClsAddEnumLiteralLabel }}
        </button>
      </div>

      <div class="cs-actions">
        <button type="button" class="link-btn cs-danger" :title="csMsg.flClsRemoveClassTitle" @click="removeClass">
          {{ csMsg.flClsRemoveClassLabel }}
        </button>
      </div>
    </template>
  </CodespaceFloatShell>
</template>
