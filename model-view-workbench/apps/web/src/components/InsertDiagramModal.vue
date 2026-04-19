<script setup lang="ts">
import { MV_MODEL_CANVAS_TITLE, MV_MODEL_REFS_SCHEME_DOC, MV_VIEW_KIND_METADATA, type MvViewKind } from '@mvwb/core';
import type { InsertDiagramKind } from '../utils/diagram-insert';
import DiagramTypeThumb from './DiagramTypeThumb.vue';

defineProps<{ open: boolean }>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', kind: InsertDiagramKind): void;
}>();

const viewKinds: MvViewKind[] = [
  'table-readonly',
  'mermaid-class',
  'mindmap-ui',
  'uml-class',
  'uml-sequence',
  'uml-activity',
  'uml-diagram',
  'ui-design',
];

function titleFor(kind: InsertDiagramKind): string {
  if (kind === 'mv-model') return MV_MODEL_CANVAS_TITLE;
  return MV_VIEW_KIND_METADATA[kind].canvasTitle;
}

function descFor(kind: InsertDiagramKind): string {
  if (kind === 'mv-model') return '插入一张可编辑的数据表（mv-model 围栏），可在数据表画布中维护列与行。';
  return MV_VIEW_KIND_METADATA[kind].description;
}

function pick(kind: InsertDiagramKind) {
  emit('select', kind);
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="idm-back"
      role="presentation"
      tabindex="-1"
      @click.self="emit('close')"
      @keydown="onKeydown"
    >
      <div
        class="idm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idm-title"
        tabindex="-1"
        @click.stop
      >
        <header class="idm-head">
          <h2 id="idm-title" class="idm-title">插入图</h2>
          <p class="idm-lead">
            选择一种块类型，将在当前光标处插入对应的 <code>mv-view</code> 或 <code>mv-model</code> 围栏；插入后可在右侧块列表中选中，用「画布」打开专属编辑窗口。
          </p>
          <p class="idm-lead idm-lead--scheme">{{ MV_MODEL_REFS_SCHEME_DOC }}</p>
        </header>

        <div class="idm-grid">
          <button type="button" class="idm-card" title="插入数据表块 — 无全局快捷键" @click="pick('mv-model')">
            <DiagramTypeThumb variant="mv-model" class="idm-thumb-wrap" />
            <span class="idm-card-title">{{ titleFor('mv-model') }}</span>
            <span class="idm-card-desc">{{ descFor('mv-model') }}</span>
          </button>

          <button
            v-for="vk in viewKinds"
            :key="vk"
            type="button"
            class="idm-card"
            :title="`插入 ${titleFor(vk)} — 无全局快捷键`"
            @click="pick(vk)"
          >
            <DiagramTypeThumb :variant="vk" class="idm-thumb-wrap" />
            <span class="idm-card-title">{{ titleFor(vk) }}</span>
            <span class="idm-card-desc">{{ descFor(vk) }}</span>
            <span class="idm-kind-tag"><code>{{ vk }}</code></span>
          </button>
        </div>

        <footer class="idm-foot">
          <button type="button" class="idm-btn" title="关闭 — 无全局快捷键" @click="emit('close')">取消</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.idm-back {
  position: fixed;
  inset: 0;
  z-index: 240;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
}
.idm-dialog {
  width: min(920px, 100%);
  max-height: min(88vh, 900px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}
.idm-head {
  flex-shrink: 0;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(to bottom, #f8fafc, #fff);
}
.idm-title {
  margin: 0 0 8px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}
.idm-lead {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #475569;
}
.idm-lead--scheme {
  margin-top: 8px;
  padding: 8px 10px;
  background: #f1f5f9;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 0.78rem;
  color: #334155;
}
.idm-grid {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.idm-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px;
  text-align: left;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.12s,
    box-shadow 0.12s;
}
.idm-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12);
}
.idm-thumb-wrap {
  border-radius: 6px;
  background: #f8fafc;
  padding: 6px;
  border: 1px solid #e2e8f0;
}
.idm-card-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
}
.idm-card-desc {
  font-size: 0.72rem;
  line-height: 1.4;
  color: #64748b;
}
.idm-kind-tag {
  font-size: 0.65rem;
  color: #94a3b8;
}
.idm-foot {
  flex-shrink: 0;
  padding: 10px 16px 14px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
}
.idm-btn {
  padding: 8px 18px;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
  cursor: pointer;
  color: #334155;
}
.idm-btn:hover {
  background: #f1f5f9;
}
</style>
