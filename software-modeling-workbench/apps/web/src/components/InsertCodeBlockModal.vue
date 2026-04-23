<script setup lang="ts">
import { computed } from 'vue';
import { modelRefsSchemeDoc, MV_MERMAID_UML_INSERT_KINDS, getMermaidNonUmlViewKinds } from '@smw/core';
import type { InsertCodeBlockKind } from '../utils/code-block-insert';
import { useAppLocale } from '../composables/useAppLocale';
import {
  getInsertGroups,
  insertCardDesc,
  insertCardTitle,
  insertModalCancel,
  insertModalCloseTitle,
  insertModalJumpGroupTitle,
  insertModalLeadHtml,
  insertModalPickCardTitle,
  insertModalTitle,
  insertModalTocAria,
  insertModalTocHeading,
} from '../i18n/insert-modal-locale';
import DiagramTypeThumb from './DiagramTypeThumb.vue';

defineProps<{ open: boolean }>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', kind: InsertCodeBlockKind): void;
}>();

const { locale } = useAppLocale();

const mermaidUmlKinds = [...MV_MERMAID_UML_INSERT_KINDS] as InsertCodeBlockKind[];
const mermaidOtherKinds = getMermaidNonUmlViewKinds() as InsertCodeBlockKind[];

const insertGroups = computed(() => getInsertGroups(locale.value, mermaidUmlKinds, mermaidOtherKinds));

function pick(kind: InsertCodeBlockKind) {
  emit('select', kind);
}

function groupSectionId(gi: number): string {
  return `icb-insert-g${gi}`;
}

function scrollToGroup(gi: number) {
  const el = document.getElementById(groupSectionId(gi));
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => el.focus({ preventScroll: true }), 280);
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="icb-back"
      role="presentation"
      tabindex="-1"
      @click.self="emit('close')"
      @keydown="onKeydown"
    >
      <div
        class="icb-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="icb-title"
        tabindex="-1"
        @click.stop
      >
        <header class="icb-head">
          <h2 id="icb-title" class="icb-title">{{ insertModalTitle(locale) }}</h2>
          <p class="icb-lead" v-html="insertModalLeadHtml(locale)" />
          <p class="icb-lead icb-lead--scheme">{{ modelRefsSchemeDoc(locale === 'en' ? 'en' : 'zh') }}</p>
        </header>

        <div class="icb-body">
          <nav class="icb-toc" :aria-label="insertModalTocAria(locale)">
            <p class="icb-toc-heading">{{ insertModalTocHeading(locale) }}</p>
            <ul class="icb-toc-list">
              <li v-for="(g, gi) in insertGroups" :key="`toc-${gi}`">
                <button
                  type="button"
                  class="icb-toc-link"
                  :title="insertModalJumpGroupTitle(locale, g.title)"
                  @click="scrollToGroup(gi)"
                >
                  {{ g.title }}
                </button>
              </li>
            </ul>
          </nav>
          <div class="icb-scroll">
            <section
              v-for="(g, gi) in insertGroups"
              :key="gi"
              :id="groupSectionId(gi)"
              class="icb-group"
              tabindex="-1"
            >
              <h3 class="icb-group-title">{{ g.title }}</h3>
              <div class="icb-grid">
                <button
                  v-for="k in g.kinds"
                  :key="k"
                  type="button"
                  class="icb-card"
                  :title="insertModalPickCardTitle(locale, insertCardTitle(k, locale))"
                  @click="pick(k)"
                >
                  <DiagramTypeThumb :variant="k" class="icb-thumb-wrap" />
                  <span class="icb-card-title">{{ insertCardTitle(k, locale) }}</span>
                  <span class="icb-card-desc">{{ insertCardDesc(k, locale) }}</span>
                  <span class="icb-kind-tag"><code>{{ k }}</code></span>
                </button>
              </div>
            </section>
          </div>
        </div>

        <footer class="icb-foot">
          <button type="button" class="icb-btn" :title="insertModalCloseTitle(locale)" @click="emit('close')">
            {{ insertModalCancel(locale) }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.icb-back {
  position: fixed;
  inset: 0;
  z-index: 240;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
}
.icb-dialog {
  display: flex;
  flex-direction: column;
  max-width: 920px;
  max-height: min(92vh, 720px);
  width: 100%;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}
.icb-head {
  flex-shrink: 0;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #e2e8f0;
}
.icb-title {
  margin: 0 0 8px;
  font-size: 1.1rem;
}
.icb-lead {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: #475569;
}
.icb-lead--scheme {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #64748b;
}
.icb-body {
  display: grid;
  /* 略宽于原 140px，避免「数据库模型（Model）」等 TOC 在中文下换行 */
  grid-template-columns: minmax(200px, 24%) 1fr;
  min-height: 0;
  flex: 1;
}
.icb-toc {
  border-right: 1px solid #e2e8f0;
  padding: 10px 10px 12px;
  background: #f8fafc;
}
.icb-toc-heading {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.icb-toc-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.icb-toc-list li {
  margin-bottom: 4px;
}
.icb-toc-link {
  display: block;
  width: 100%;
  margin: 0;
  padding: 4px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  font-size: 0.78rem;
  text-align: left;
  color: #334155;
  cursor: pointer;
  white-space: nowrap;
}
.icb-toc-link:hover {
  background: #e2e8f0;
}
.icb-scroll {
  overflow: auto;
  padding: 10px 14px 14px;
}
.icb-group {
  margin-bottom: 18px;
}
.icb-group-title {
  margin: 0 0 8px;
  font-size: 0.88rem;
  color: #0f172a;
}
.icb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.icb-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  margin: 0;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.icb-card:hover {
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
}
.icb-thumb-wrap {
  align-self: center;
}
.icb-card-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: #0f172a;
}
.icb-card-desc {
  font-size: 0.72rem;
  line-height: 1.45;
  color: #475569;
}
.icb-kind-tag {
  font-size: 0.68rem;
  color: #64748b;
}
.icb-foot {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}
.icb-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
  font: inherit;
  cursor: pointer;
}
.icb-btn:hover {
  background: #f1f5f9;
}
</style>
