<script setup lang="ts">
import {
  MV_MODEL_CANVAS_TITLE,
  MV_MODEL_REFS_SCHEME_DOC,
  MV_VIEW_KIND_METADATA,
  getMermaidViewKinds,
} from '@mvwb/core';
import type { InsertCodeBlockKind } from '../utils/code-block-insert';
import DiagramTypeThumb from './DiagramTypeThumb.vue';

defineProps<{ open: boolean }>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', kind: InsertCodeBlockKind): void;
}>();

const mermaidInsertKinds = getMermaidViewKinds() as InsertCodeBlockKind[];

/** 插入代码块弹窗分组（顺序即展示顺序） */
const insertGroups: { title: string; kinds: InsertCodeBlockKind[] }[] = [
  { title: '数据模型', kinds: ['mv-model'] },
  { title: 'UI 相关', kinds: ['table-readonly', 'mindmap-ui', 'ui-design'] },
  { title: 'Mermaid 相关', kinds: mermaidInsertKinds },
  { title: 'PlantUML', kinds: ['uml-class', 'uml-sequence', 'uml-activity'] },
  { title: '其它', kinds: ['uml-diagram'] },
];

function titleFor(kind: InsertCodeBlockKind): string {
  if (kind === 'mv-model') return MV_MODEL_CANVAS_TITLE;
  return MV_VIEW_KIND_METADATA[kind].canvasTitle;
}

function descFor(kind: InsertCodeBlockKind): string {
  if (kind === 'mv-model') {
    return '插入 ```mv-model``` 围栏代码块，块内为表数据（常用 JSON）；在数据表画布中结构化编辑列与行。';
  }
  return MV_VIEW_KIND_METADATA[kind].description;
}

function pick(kind: InsertCodeBlockKind) {
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
          <h2 id="icb-title" class="icb-title">插入代码块</h2>
          <p class="icb-lead">
            Model 与 View 在 Markdown 中以<strong>围栏代码块</strong>落盘（围栏语言为 <code>mv-model</code> / <code>mv-view</code>）；块内正文可为
            <strong>JSON</strong>、<strong>XML</strong> 或<strong>纯文本</strong>等，由对应类型解释。选择下方类型后，将在光标处插入一整段围栏；插入后可在左侧围栏索引选中块，并打开<strong>代码块画布</strong>做结构化或所见即所得编辑（须为「富文本」或「原始文本」模式）。
          </p>
          <p class="icb-lead icb-lead--scheme">{{ MV_MODEL_REFS_SCHEME_DOC }}</p>
        </header>

        <div class="icb-body">
          <section v-for="(g, gi) in insertGroups" :key="gi" class="icb-group">
            <h3 class="icb-group-title">{{ g.title }}</h3>
            <div class="icb-grid">
              <button
                v-for="k in g.kinds"
                :key="k"
                type="button"
                class="icb-card"
                :title="`插入「${titleFor(k)}」围栏代码块 — 无全局快捷键`"
                @click="pick(k)"
              >
                <DiagramTypeThumb :variant="k" class="icb-thumb-wrap" />
                <span class="icb-card-title">{{ titleFor(k) }}</span>
                <span class="icb-card-desc">{{ descFor(k) }}</span>
                <span class="icb-kind-tag"><code>{{ k }}</code></span>
              </button>
            </div>
          </section>
        </div>

        <footer class="icb-foot">
          <button type="button" class="icb-btn" title="关闭 — 无全局快捷键" @click="emit('close')">取消</button>
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
.icb-head {
  flex-shrink: 0;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(to bottom, #f8fafc, #fff);
}
.icb-title {
  margin: 0 0 8px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}
.icb-lead {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #475569;
}
.icb-lead--scheme {
  margin-top: 8px;
  padding: 8px 10px;
  background: #f1f5f9;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 0.78rem;
  color: #334155;
}
.icb-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 16px 14px;
}
.icb-group {
  margin-bottom: 18px;
}
.icb-group:last-child {
  margin-bottom: 0;
}
.icb-group-title {
  margin: 0 0 10px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.02em;
}
.icb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.icb-card {
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
.icb-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12);
}
.icb-thumb-wrap {
  border-radius: 6px;
  background: #f8fafc;
  padding: 6px;
  border: 1px solid #e2e8f0;
}
.icb-card-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
}
.icb-card-desc {
  font-size: 0.72rem;
  line-height: 1.4;
  color: #64748b;
}
.icb-kind-tag {
  font-size: 0.65rem;
  color: #94a3b8;
}
.icb-foot {
  flex-shrink: 0;
  padding: 10px 16px 14px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
}
.icb-btn {
  padding: 8px 18px;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
  cursor: pointer;
  color: #334155;
}
.icb-btn:hover {
  background: #f1f5f9;
}
</style>
