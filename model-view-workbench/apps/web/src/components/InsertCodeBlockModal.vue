<script setup lang="ts">
import {
  MV_MODEL_KV_CANVAS_TITLE,
  MV_MODEL_REFS_SCHEME_DOC,
  MV_MODEL_SQL_CANVAS_TITLE,
  MV_MODEL_STRUCT_CANVAS_TITLE,
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
  {
    title: '数据模型（Model模型）',
    kinds: ['mv-model-sql', 'mv-model-kv', 'mv-model-struct'],
  },
  { title: 'UI 相关（View视图）', kinds: ['mindmap-ui', 'ui-design'] },
  { title: 'Mermaid 相关（View视图）', kinds: mermaidInsertKinds },
  { title: 'PlantUML（View视图）', kinds: ['uml-class', 'uml-sequence', 'uml-activity'] },
  { title: '其它（View视图）', kinds: ['uml-diagram'] },
];

function titleFor(kind: InsertCodeBlockKind): string {
  if (kind === 'mv-model-sql') return MV_MODEL_SQL_CANVAS_TITLE;
  if (kind === 'mv-model-kv') return MV_MODEL_KV_CANVAS_TITLE;
  if (kind === 'mv-model-struct') return MV_MODEL_STRUCT_CANVAS_TITLE;
  return MV_VIEW_KIND_METADATA[kind].canvasTitle;
}

/** 插入弹窗卡片文案：此处表示 Model / View 类型，不沿用各编辑器「画布」后缀 */
function insertCardTitle(kind: InsertCodeBlockKind): string {
  if (kind === 'mv-model-sql') return 'SQL数据库';
  if (kind === 'mv-model-kv') return 'KV数据库';
  if (kind === 'mv-model-struct') return '结构化数据库';
  const raw = titleFor(kind);
  let s = raw
    .replace(/\s*画布（/, '（')
    .replace(/画布$/, '')
    .trim();
  if (kind === 'uml-diagram' && !s.endsWith('图')) s = `${s}图`;
  return s;
}

function descFor(kind: InsertCodeBlockKind): string {
  if (kind === 'mv-model-sql') {
    return '插入 ```mv-model-sql``` 围栏：**Model** 组，内含多张 SQL 风格表（JSON）；画布内可对子表增删改查，并编辑列与行。';
  }
  if (kind === 'mv-model-kv') {
    return '插入 ```mv-model-kv``` 围栏：文档型集合（类比 MongoDB），每条为自由键的 JSON 对象；在 KV 数据表画布中编辑。';
  }
  if (kind === 'mv-model-struct') {
    return '插入 ```mv-model-struct``` 围栏：根下递归「组 / 数据集」（类比 HDF5）；在结构化层次画布中编辑 JSON。';
  }
  const base = MV_VIEW_KIND_METADATA[kind].description;
  if (typeof kind === 'string' && kind.startsWith('mermaid-')) {
    return `${base} 插入后在 mv-view 围栏之后附带标准 mermaid 围栏镜像段，正文与 JSON 内 payload 一致，便于 GitHub 等仅识别 Mermaid 的编辑器出图。`;
  }
  return base;
}

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
          <h2 id="icb-title" class="icb-title">插入代码块</h2>
          <p class="icb-lead">
            Model 与 View 在 Markdown 中以<strong>围栏代码块</strong>落盘（围栏语言含 <code>mv-model-sql</code> / <code>mv-model-kv</code> /
            <code>mv-model-struct</code> / <code>mv-view</code>）；块内正文可为
            <strong>JSON</strong>、<strong>XML</strong> 或<strong>纯文本</strong>等，由对应类型解释。选择下方类型后，将在光标处插入一整段围栏；插入后可在左侧围栏索引选中块，并打开<strong>代码块画布</strong>做结构化或所见即所得编辑（须为「富文本」或「原始文本」模式）。
          </p>
          <p class="icb-lead icb-lead--scheme">{{ MV_MODEL_REFS_SCHEME_DOC }}</p>
        </header>

        <div class="icb-body">
          <nav class="icb-toc" aria-label="类型大纲">
            <p class="icb-toc-heading">大纲</p>
            <ul class="icb-toc-list">
              <li v-for="(g, gi) in insertGroups" :key="`toc-${gi}`">
                <button
                  type="button"
                  class="icb-toc-link"
                  :title="`跳转到「${g.title}」— 无全局快捷键`"
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
                  :title="`插入「${insertCardTitle(k)}」围栏代码块 — 无全局快捷键`"
                  @click="pick(k)"
                >
                  <DiagramTypeThumb :variant="k" class="icb-thumb-wrap" />
                  <span class="icb-card-title">{{ insertCardTitle(k) }}</span>
                  <span class="icb-card-desc">{{ descFor(k) }}</span>
                  <span class="icb-kind-tag"><code>{{ k }}</code></span>
                </button>
              </div>
            </section>
          </div>
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
  width: min(1040px, 100%);
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
  display: flex;
  flex-direction: row;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}
.icb-toc {
  flex-shrink: 0;
  width: min(200px, 34vw);
  padding: 12px 10px 14px 14px;
  border-right: 1px solid #e2e8f0;
  background: #f1f5f9;
  overflow-y: auto;
}
.icb-toc-heading {
  margin: 0 0 10px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}
.icb-toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.icb-toc-list li + li {
  margin-top: 2px;
}
.icb-toc-link {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  font-size: 0.76rem;
  line-height: 1.35;
  color: #334155;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.icb-toc-link:hover {
  background: #e2e8f0;
  color: #0f172a;
}
.icb-scroll {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 12px 16px 14px;
}
.icb-group {
  margin-bottom: 18px;
  scroll-margin-top: 8px;
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
