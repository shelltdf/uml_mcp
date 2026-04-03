<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { UmlSyncConfig } from '../lib/formats';
import {
  CODE_IMPL_TYPE_OPTIONS,
  defaultCodeImplRootForType,
  DEFAULT_NAMESPACE_DIR,
  getSyncEditorState,
  normalizeConfigForSave,
  serializeUmlSyncMarkdown,
} from '../lib/formats';
import { getMessages, type LocaleId } from '../i18n/ui';
import { workspace } from '../stores/workspace';

const props = defineProps<{
  tabId: string;
  content: string;
  locale: LocaleId;
}>();

const msg = computed(() => getMessages(props.locale));

const localConfig = ref<UmlSyncConfig>(getSyncEditorState('').config);
const localBody = ref('');
const hasFm = ref(false);
let lastEmitted = '';

/** 添加代码实现弹窗 */
const addModalOpen = ref(false);
const addRoot = ref('');
const addCodeType = ref<string>('cpp');

/** 查看（修改菜单：只读说明） */
const viewModalOpen = ref(false);
const viewImplIndex = ref<number | null>(null);

/** 行内操作菜单 */
const menuOpenIndex = ref<number | null>(null);

/** 同步规则正文：随内容增高，全文可见（无框内滚动条） */
const rulesTextareaRef = ref<HTMLTextAreaElement | null>(null);

function adjustRulesTextareaHeight() {
  const el = rulesTextareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function onRulesBodyInput() {
  scheduleCommit();
  nextTick(adjustRulesTextareaHeight);
}

function cloneConfig(c: UmlSyncConfig): UmlSyncConfig {
  return {
    namespace_root: c.namespace_root,
    uml_root: c.uml_root,
    code_impls: c.code_impls.map((i) => ({ ...i })),
    sync_profile: c.sync_profile,
  };
}

function loadFromRaw(raw: string) {
  const st = getSyncEditorState(raw);
  localConfig.value = cloneConfig(st.config);
  localBody.value = st.body;
  hasFm.value = st.hasYamlFrontMatter;
  nextTick(adjustRulesTextareaHeight);
}

function commit() {
  const s = serializeUmlSyncMarkdown(localConfig.value, localBody.value);
  lastEmitted = s;
  workspace.updateContent(props.tabId, s);
  localConfig.value = cloneConfig(normalizeConfigForSave(localConfig.value));
}

let commitTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCommit() {
  if (commitTimer) clearTimeout(commitTimer);
  commitTimer = setTimeout(() => {
    commitTimer = null;
    commit();
  }, 150);
}

function existingImplRoots(): Set<string> {
  return new Set(localConfig.value.code_impls.map((x) => x.root));
}

/** 与已有实现不冲突的默认目录名 */
function nextSuggestedRoot(codeType: string): string {
  const base = defaultCodeImplRootForType(codeType);
  const used = existingImplRoots();
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

function openAddModal() {
  addCodeType.value = 'cpp';
  addRoot.value = nextSuggestedRoot('cpp');
  addModalOpen.value = true;
  closeMenu();
}

const addModalDuplicate = computed(() => {
  const r = addRoot.value.trim();
  return r.length > 0 && localConfig.value.code_impls.some((x) => x.root === r);
});

const addModalDirValid = computed(() => {
  const r = addRoot.value.trim();
  if (!r) return false;
  return workspace.directoryExistsInWorkspace(r);
});

const addModalConfirmDisabled = computed(
  () => addModalDuplicate.value || !addModalDirValid.value,
);

const addDefaultDirPlaceholder = computed(() => defaultCodeImplRootForType(addCodeType.value));

/** 用于提示：绝对路径不在工作区内校验 */
const addRootLooksAbsolute = computed(() => {
  const t = addRoot.value.trim();
  if (!t) return false;
  if (t.startsWith('\\\\')) return true;
  const n = t.replace(/\\/g, '/');
  return /^([a-zA-Z]:|\/)/.test(n);
});

watch(addCodeType, (t) => {
  if (!addModalOpen.value) return;
  addRoot.value = nextSuggestedRoot(t);
});

function confirmAddModal() {
  const root = addRoot.value.trim();
  if (!root || addModalConfirmDisabled.value) return;
  localConfig.value.code_impls.push({ root, code_type: addCodeType.value.trim() || 'cpp' });
  addModalOpen.value = false;
  commit();
}

function cancelAddModal() {
  addModalOpen.value = false;
}

function openViewModal(i: number) {
  viewImplIndex.value = i;
  viewModalOpen.value = true;
  closeMenu();
}

function closeViewModal() {
  viewModalOpen.value = false;
  viewImplIndex.value = null;
}

function removeCodeImpl(i: number) {
  if (localConfig.value.code_impls.length <= 1) return;
  localConfig.value.code_impls.splice(i, 1);
  closeMenu();
  commit();
}

function toggleMenu(i: number) {
  menuOpenIndex.value = menuOpenIndex.value === i ? null : i;
}

function closeMenu() {
  menuOpenIndex.value = null;
}

function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement;
  if (!t.closest?.('.sync-impl-menu-wrap')) {
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  nextTick(adjustRulesTextareaHeight);
});
onUnmounted(() => document.removeEventListener('click', onDocClick));

watch(
  () => [props.tabId, props.content] as const,
  ([id, c], old) => {
    if (old && old[0] === id && c === lastEmitted) return;
    loadFromRaw(c);
    lastEmitted = c;
  },
  { immediate: true },
);

const viewImpl = computed(() => {
  const i = viewImplIndex.value;
  if (i === null || i < 0) return null;
  return localConfig.value.code_impls[i] ?? null;
});
</script>

<template>
  <div class="sync-editor" role="region" :aria-label="msg.syncSummary">
    <h3>{{ msg.syncSummary }}</h3>
    <p class="sync-editor__hint">{{ msg.syncGuiHint }}</p>
    <p v-if="!hasFm" class="sync-yaml-hint">{{ msg.syncMissingYamlHint }}</p>

    <div class="sync-form">
      <label class="sync-field">
        <span class="sync-field__label">{{ msg.umlRoot }}</span>
        <input v-model="localConfig.uml_root" class="sync-field__input" type="text" autocomplete="off" @input="scheduleCommit" />
        <span class="sync-field__hint">{{ msg.syncPathRecordOnlyHint }}</span>
      </label>

      <label class="sync-field">
        <span class="sync-field__label">{{ msg.namespaces }}</span>
        <input
          v-model="localConfig.namespace_root"
          class="sync-field__input"
          type="text"
          autocomplete="off"
          :placeholder="DEFAULT_NAMESPACE_DIR"
          @input="scheduleCommit"
        />
        <span class="sync-field__hint">{{ msg.syncPathRecordOnlyHint }} {{ msg.syncNamespaceSingleHint }}</span>
      </label>

      <div class="sync-field sync-field--block">
        <span class="sync-field__label">{{ msg.codeImpls }}</span>
        <div v-for="(impl, i) in localConfig.code_impls" :key="'ci-' + i + '-' + impl.root" class="sync-impl-row sync-impl-row--compact">
          <code class="sync-impl-path" :title="impl.root">{{ impl.root }}</code>
          <span class="sync-impl-pill">{{ impl.code_type }}</span>
          <div class="sync-impl-menu-wrap">
            <button
              type="button"
              class="sync-impl-menu-btn sync-impl-menu-btn--compact"
              :aria-expanded="menuOpenIndex === i"
              :aria-label="msg.syncCodeImplActions"
              @click.stop.prevent="toggleMenu(i)"
            >
              ⋯
            </button>
            <ul v-if="menuOpenIndex === i" class="sync-impl-menu" role="menu" @click.stop>
              <li role="none">
                <button type="button" role="menuitem" class="sync-impl-menu__item" @click="openViewModal(i)">
                  {{ msg.syncCodeImplEdit }}
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="sync-impl-menu__item"
                  :disabled="localConfig.code_impls.length <= 1"
                  @click="removeCodeImpl(i)"
                >
                  {{ msg.syncCodeImplDelete }}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <button type="button" class="sync-add-btn" @click="openAddModal">{{ msg.syncAddCodeImpl }}</button>
      </div>

      <label class="sync-field">
        <span class="sync-field__label">{{ msg.syncProfile }}</span>
        <select v-model="localConfig.sync_profile" class="sync-field__select" @change="scheduleCommit">
          <option value="none">{{ msg.syncProfileNone }}</option>
          <option value="strict">{{ msg.syncProfileStrict }}</option>
        </select>
      </label>
    </div>

    <h4 class="sync-rules-title">{{ msg.syncRulesBody }}</h4>
    <textarea
      ref="rulesTextareaRef"
      v-model="localBody"
      class="sync-rules-textarea"
      :aria-label="msg.syncRulesBody"
      rows="1"
      @input="onRulesBodyInput"
    />

    <!-- 添加代码实现 -->
    <Teleport to="body">
      <div v-if="addModalOpen" class="sync-modal-overlay" role="presentation" @click.self="cancelAddModal">
        <div class="sync-modal" role="dialog" :aria-label="msg.syncAddCodeImplTitle" @click.stop>
          <h4 class="sync-modal__title">{{ msg.syncAddCodeImplTitle }}</h4>
          <label class="sync-modal__field">
            <span>{{ msg.syncCodeTypeField }}</span>
            <select v-model="addCodeType" class="sync-field__select sync-field__select--modal">
              <option v-for="t in CODE_IMPL_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label class="sync-modal__field">
            <span>{{ msg.syncCodeRootField }}</span>
            <input
              v-model="addRoot"
              class="sync-field__input"
              type="text"
              autocomplete="off"
              :placeholder="addDefaultDirPlaceholder"
            />
          </label>
          <p v-if="addRoot.trim() && addModalDuplicate" class="sync-modal__warn">{{ msg.syncCodeImplDuplicate }}</p>
          <p v-else-if="addRoot.trim() && !addModalDirValid" class="sync-modal__warn">{{ msg.syncCodeImplDirNotFound }}</p>
          <p v-else-if="addRoot.trim() && addRootLooksAbsolute" class="sync-modal__hint">{{ msg.syncCodeImplDirAbsoluteHint }}</p>
          <div class="sync-modal__actions">
            <button type="button" class="sync-modal__btn" @click="cancelAddModal">{{ msg.syncModalCancel }}</button>
            <button
              type="button"
              class="sync-modal__btn sync-modal__btn--primary"
              :disabled="addModalConfirmDisabled"
              @click="confirmAddModal"
            >
              {{ msg.syncModalConfirm }}
            </button>
          </div>
        </div>
      </div>

      <!-- 修改：只读说明 -->
      <div v-if="viewModalOpen" class="sync-modal-overlay" role="presentation" @click.self="closeViewModal">
        <div class="sync-modal" role="dialog" :aria-label="msg.syncCodeImplEdit" @click.stop>
          <h4 class="sync-modal__title">{{ msg.syncCodeImplEdit }}</h4>
          <p v-if="viewImpl" class="sync-modal__readonly-line">
            <strong>{{ msg.syncCodeRootField }}</strong> {{ viewImpl.root }}
          </p>
          <p v-if="viewImpl" class="sync-modal__readonly-line">
            <strong>{{ msg.syncCodeTypeField }}</strong> {{ viewImpl.code_type }}
          </p>
          <p class="sync-modal__immutable">{{ msg.syncCodeImplImmutableBody }}</p>
          <div class="sync-modal__actions">
            <button type="button" class="sync-modal__btn sync-modal__btn--primary" @click="closeViewModal">{{ msg.modalClose }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.sync-editor {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px;
  font-size: 0.85rem;
  border-bottom: none;
  background: var(--panel-bg, #fafafa);
}
.sync-editor h3 {
  margin: 0 0 6px;
  font-size: 0.95rem;
}
.sync-editor h4.sync-rules-title {
  margin-top: 0;
}
.sync-yaml-hint {
  margin: 0 0 12px;
  padding: 10px 12px;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #bf6f00;
  background: rgba(255, 193, 7, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
}
:root[data-theme='dark'] .sync-yaml-hint {
  color: #ffb74d;
  background: rgba(255, 193, 7, 0.08);
  border-color: rgba(255, 255, 255, 0.08);
}
.sync-editor__hint {
  margin: 0 0 10px;
  font-size: 0.82rem;
  line-height: 1.4;
  opacity: 0.88;
}
.sync-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}
.sync-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sync-field--block {
  align-items: stretch;
}
.sync-field__label {
  font-weight: 600;
  font-size: 0.82rem;
}
.sync-field__hint {
  font-size: 0.75rem;
  line-height: 1.35;
  opacity: 0.82;
}
.sync-field__input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  font: inherit;
  font-size: 0.88rem;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--editor-bg, #fff);
  color: inherit;
}
.sync-field__input--readonly {
  opacity: 0.92;
  cursor: default;
  background: var(--tab-bg, #ececec);
}
.sync-field__select {
  max-width: 280px;
  padding: 6px 8px;
  font: inherit;
  font-size: 0.88rem;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--editor-bg, #fff);
  color: inherit;
}
.sync-field__select--modal {
  max-width: none;
  width: 100%;
}
.sync-add-btn {
  align-self: flex-start;
  margin-top: 4px;
  padding: 4px 10px;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--panel-bg, #fafafa);
}
.sync-impl-row--compact {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  padding: 5px 8px;
  border: 1px solid color-mix(in srgb, var(--border, #ccc) 70%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--editor-bg, #fff) 92%, var(--tab-bg, #e8e8ea));
  box-sizing: border-box;
}
.sync-impl-row--compact:last-of-type {
  margin-bottom: 4px;
}
:root[data-theme='dark'] .sync-impl-row--compact {
  border-color: color-mix(in srgb, var(--border, #555) 80%, transparent);
  background: color-mix(in srgb, var(--editor-bg, #1e1e1e) 88%, var(--tab-bg, #2d2d30));
}
.sync-impl-path {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  background: transparent;
  color: inherit;
  padding: 0;
}
.sync-impl-pill {
  flex: 0 0 auto;
  padding: 1px 7px;
  font-size: 0.72rem;
  line-height: 1.35;
  border-radius: 4px;
  border: 1px solid var(--border, #ccc);
  background: var(--tab-bg, #e8e8ea);
  color: inherit;
}
.sync-impl-menu-wrap {
  position: relative;
  flex: 0 0 auto;
}
.sync-impl-menu-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--tab-bg, #e8e8ea);
  cursor: pointer;
  font-size: 1.05rem;
  line-height: 1;
}
.sync-impl-menu-btn--compact {
  min-width: 26px;
  height: 26px;
  padding: 0 5px;
  font-size: 1rem;
}
.sync-impl-menu {
  position: absolute;
  right: 0;
  bottom: 100%;
  margin: 0 0 4px;
  padding: 4px 0;
  list-style: none;
  min-width: 120px;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--editor-bg, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  z-index: 20;
}
.sync-impl-menu__item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.sync-impl-menu__item:hover:not(:disabled) {
  background: var(--tab-bg, #e8e8ea);
}
.sync-impl-menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.sync-rules-title {
  margin: 0 0 6px;
  font-size: 0.9rem;
  font-weight: 600;
}
.sync-rules-textarea {
  display: block;
  width: 100%;
  min-height: 4.5em;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.85rem;
  line-height: 1.45;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--editor-bg, #fff);
  color: inherit;
  resize: none;
  overflow-y: hidden;
  box-sizing: border-box;
}

.sync-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.35);
}
.sync-modal {
  width: 100%;
  max-width: 400px;
  padding: 16px 18px;
  border-radius: 8px;
  background: var(--editor-bg, #fff);
  color: inherit;
  border: 1px solid var(--border, #ccc);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.sync-modal__title {
  margin: 0 0 12px;
  font-size: 1rem;
}
.sync-modal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 0.88rem;
}
.sync-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.sync-modal__btn {
  padding: 6px 14px;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--panel-bg, #fafafa);
}
.sync-modal__btn--primary {
  background: var(--accent, #1976d2);
  color: #fff;
  border-color: transparent;
}
.sync-modal__btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sync-modal__readonly-line {
  margin: 0 0 8px;
  font-size: 0.88rem;
  word-break: break-all;
}
.sync-modal__immutable {
  margin: 0 0 12px;
  font-size: 0.82rem;
  line-height: 1.45;
  opacity: 0.9;
}
.sync-modal__warn {
  margin: 0 0 10px;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #b71c1c;
}
:root[data-theme='dark'] .sync-modal__warn {
  color: #ef9a9a;
}
.sync-modal__hint {
  margin: 0 0 10px;
  font-size: 0.78rem;
  line-height: 1.4;
  opacity: 0.88;
}
</style>
