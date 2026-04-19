<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue';
import {
  MV_MAP_CANVAS_TITLE,
  MV_MODEL_CANVAS_TITLE,
  MV_MODEL_REFS_SCHEME_DOC,
  MV_VIEW_KIND_METADATA,
  isPlantUmlViewKind,
  parseMarkdownBlocks,
  parseRefUri,
  replaceBlockInnerById,
  resolveRefPath,
  type MvMapPayload,
  type MvModelPayload,
  type MvViewKind,
  type MvViewPayload,
  type ParsedFenceBlock,
} from '@mvwb/core';

const props = withDefaults(
  defineProps<{
    markdown: string;
    relPath: string;
    blockId: string;
    /** 嵌入主窗口中间列时为 true（勿用 100vh，避免撑破布局） */
    embedded?: boolean;
    /** 工作区内其它 .md 全文，用于解析 ref: 跨文件 modelRefs（浏览器画布弹窗由主窗口注入） */
    workspaceFiles?: Record<string, string>;
  }>(),
  { embedded: false, workspaceFiles: () => ({}) },
);

const emit = defineEmits<{
  (e: 'saved', payload: { markdown: string; relPath: string }): void;
  (e: 'close'): void;
}>();

const block = computed<ParsedFenceBlock | null>(() => {
  const { blocks } = parseMarkdownBlocks(props.markdown);
  return blocks.find((b) => b.payload.id === props.blockId) ?? null;
});

const modelDraft = ref<MvModelPayload | null>(null);
const viewDraft = ref<MvViewPayload | null>(null);
const viewModelRefsText = ref('');
const mapJsonText = ref('');

watch(
  block,
  (b) => {
    modelDraft.value = null;
    viewDraft.value = null;
    viewModelRefsText.value = '';
    mapJsonText.value = '';
    if (!b) return;
    if (b.kind === 'mv-model') {
      modelDraft.value = JSON.parse(JSON.stringify(b.payload)) as MvModelPayload;
    } else if (b.kind === 'mv-view') {
      viewDraft.value = JSON.parse(JSON.stringify(b.payload)) as MvViewPayload;
      viewModelRefsText.value = (viewDraft.value.modelRefs ?? []).join(', ');
    } else if (b.kind === 'mv-map') {
      mapJsonText.value = JSON.stringify(b.payload as MvMapPayload, null, 2);
    }
  },
  { immediate: true },
);

const canvasSurfaceTitle = computed(() => {
  const b = block.value;
  if (!b) return '';
  if (b.kind === 'mv-model') return MV_MODEL_CANVAS_TITLE;
  if (b.kind === 'mv-map') return MV_MAP_CANVAS_TITLE;
  if (b.kind === 'mv-view') {
    const k = (b.payload as MvViewPayload).kind;
    return MV_VIEW_KIND_METADATA[k].canvasTitle;
  }
  return '';
});

const viewKindDescription = computed(() => {
  const b = block.value;
  if (!b || b.kind !== 'mv-view' || !viewDraft.value) return '';
  return MV_VIEW_KIND_METADATA[viewDraft.value.kind as MvViewKind].description;
});

const viewPayloadPlaceholder = computed(() => {
  const b = block.value;
  if (!b || b.kind !== 'mv-view' || !viewDraft.value) return '';
  return MV_VIEW_KIND_METADATA[viewDraft.value.kind as MvViewKind].payloadPlaceholder;
});

function resolveMvModelByRef(ref: string): MvModelPayload | null {
  const r = ref.trim();
  if (!r) return null;
  const parsed = parseRefUri(r);
  if (parsed) {
    const targetPath = resolveRefPath(props.relPath.replace(/\\/g, '/'), parsed.fileRel);
    const md = props.workspaceFiles[targetPath];
    if (!md) return null;
    const { blocks } = parseMarkdownBlocks(md);
    const m = blocks.find((x) => x.kind === 'mv-model' && x.payload.id === parsed.blockId);
    return m && m.kind === 'mv-model' ? (m.payload as MvModelPayload) : null;
  }
  const { blocks } = parseMarkdownBlocks(props.markdown);
  const m = blocks.find((x) => x.kind === 'mv-model' && x.payload.id === r);
  return m && m.kind === 'mv-model' ? (m.payload as MvModelPayload) : null;
}

const tableReadonlyBackingModel = computed((): MvModelPayload | null => {
  if (!block.value || block.value.kind !== 'mv-view' || !viewDraft.value) return null;
  if (viewDraft.value.kind !== 'table-readonly') return null;
  const id = viewDraft.value.modelRefs[0];
  if (!id) return null;
  return resolveMvModelByRef(id);
});

function addModelRow() {
  const m = modelDraft.value;
  if (!m) return;
  const row: Record<string, unknown> = {};
  for (const c of m.columns) {
    row[c.name] = '';
  }
  m.rows = [...m.rows, row];
}

function removeModelRow(index: number) {
  const m = modelDraft.value;
  if (!m || index < 0 || index >= m.rows.length) return;
  m.rows = m.rows.filter((_, i) => i !== index);
}

function cellStr(row: Record<string, unknown>, col: string): string {
  const v = row[col];
  if (v === null || v === undefined) return '';
  return String(v);
}

function setCell(row: Record<string, unknown>, col: string, s: string) {
  const t = s.trim();
  if (t === 'true') row[col] = true;
  else if (t === 'false') row[col] = false;
  else if (t !== '' && !Number.isNaN(Number(t)) && String(Number(t)) === t) row[col] = Number(t);
  else row[col] = s;
}

function buildInnerJson(): string | null {
  const b = block.value;
  if (!b) return null;
  if (b.kind === 'mv-model' && modelDraft.value) {
    return JSON.stringify(modelDraft.value, null, 2);
  }
  if (b.kind === 'mv-view' && viewDraft.value) {
    const v = { ...viewDraft.value };
    v.modelRefs = viewModelRefsText.value
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return JSON.stringify(v, null, 2);
  }
  if (b.kind === 'mv-map') {
    try {
      const parsed = JSON.parse(mapJsonText.value) as MvMapPayload;
      if (parsed && typeof parsed.id === 'string' && Array.isArray(parsed.rules)) {
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      return null;
    }
  }
  return null;
}

function save() {
  const inner = buildInnerJson();
  if (!inner) return;
  const next = replaceBlockInnerById(props.markdown, props.blockId, inner);
  if (!next) return;
  emit('saved', { markdown: next, relPath: props.relPath });
}

function closeWin() {
  emit('close');
}
</script>

<template>
  <div class="canvas-root" :class="{ 'canvas-root--embedded': embedded }">
    <header class="canvas-toolbar">
      <div class="canvas-title">
        <span class="canvas-badge">画布</span>
        <template v-if="block">
          <strong>{{ canvasSurfaceTitle }}</strong>
          <span class="canvas-sep">·</span>
          <code>{{ block.kind }}</code>
          <span class="canvas-sep">·</span>
          <code>{{ block.payload.id }}</code>
        </template>
        <span v-else class="canvas-err">未找到块</span>
      </div>
      <div class="canvas-actions">
        <button
          type="button"
          class="tb"
          :title="embedded ? '关闭画布标签 — 无全局快捷键' : '关闭窗口 — 无全局快捷键'"
          @click="closeWin"
        >
          关闭
        </button>
        <button type="button" class="tb primary" :disabled="!block" title="保存到 Markdown — 无全局快捷键" @click="save">保存</button>
      </div>
    </header>

    <main v-if="block" class="canvas-body">
      <div class="canvas-surface" aria-label="可视化编辑画布">
        <template v-if="block.kind === 'mv-model' && modelDraft">
          <p v-if="modelDraft.title" class="canvas-hint title">{{ modelDraft.title }}</p>
          <p class="canvas-hint">{{ MV_MODEL_CANVAS_TITLE }}：在下方直接编辑列与行；保存后写回 <code>mv-model</code> 围栏 JSON。</p>
          <div class="canvas-table-wrap">
            <table class="canvas-table">
              <thead>
                <tr>
                  <th v-for="c in modelDraft.columns" :key="c.name">{{ c.name }}</th>
                  <th class="col-actions" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in modelDraft.rows" :key="ri">
                  <td v-for="c in modelDraft.columns" :key="c.name">
                    <input
                      class="cell-inp"
                      type="text"
                      :value="cellStr(row, c.name)"
                      :aria-label="c.name"
                      @input="setCell(row, c.name, ($event.target as HTMLInputElement).value)"
                    />
                  </td>
                  <td class="col-actions">
                    <button type="button" class="link-btn" title="删除本行 — 无全局快捷键" @click="removeModelRow(ri)">删行</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button type="button" class="add-row" @click="addModelRow">添加行</button>
        </template>

        <template v-else-if="block.kind === 'mv-view' && viewDraft">
          <p class="canvas-hint title">{{ canvasSurfaceTitle }}</p>
          <p class="canvas-hint">类型 <code>{{ viewDraft.kind }}</code> — {{ viewKindDescription }}</p>
          <label class="field">
            <span>标题 title</span>
            <input v-model="viewDraft.title" type="text" class="wide" />
          </label>
          <p class="canvas-hint canvas-hint--compact">{{ MV_MODEL_REFS_SCHEME_DOC }}</p>
          <label class="field">
            <span>modelRefs（Model 地址，逗号分隔）</span>
            <input v-model="viewModelRefsText" type="text" class="wide" placeholder="同文件 id 或 ref:其它.md#块id" />
          </label>

          <template v-if="viewDraft.kind === 'table-readonly'">
            <div v-if="tableReadonlyBackingModel" class="canvas-table-wrap canvas-table-wrap--readonly">
              <p class="canvas-hint">关联表 <code>{{ tableReadonlyBackingModel.id }}</code>（只读预览；改数据请打开该 <code>mv-model</code> 块画布）</p>
              <table class="canvas-table">
                <thead>
                  <tr>
                    <th v-for="c in tableReadonlyBackingModel.columns" :key="c.name">{{ c.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in tableReadonlyBackingModel.rows" :key="ri">
                    <td v-for="c in tableReadonlyBackingModel.columns" :key="c.name">{{ cellStr(row, c.name) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="canvas-hint canvas-hint--warn">
              未解析到 modelRefs[0]（<code>{{ viewDraft.modelRefs[0] || '（空）' }}</code>）：请确认同文件 id 正确，或填写
              <code>ref:相对路径.md#块id</code> 且主窗口已打开对应 .md（跨文件预览需工作区快照）。
            </p>
          </template>

          <label class="field">
            <span>payload（{{ isPlantUmlViewKind(viewDraft.kind) ? 'PlantUML / 图源' : '子类型载荷' }}）</span>
            <textarea
              v-model="viewDraft.payload"
              class="payload-ta"
              spellcheck="false"
              :rows="viewDraft.kind === 'table-readonly' ? 6 : 16"
              :placeholder="viewPayloadPlaceholder"
            />
          </label>
        </template>

        <template v-else-if="block.kind === 'mv-map'">
          <p class="canvas-hint title">{{ MV_MAP_CANVAS_TITLE }}</p>
          <p class="canvas-hint">编辑映射规则 JSON；保存后写回 <code>mv-map</code> 围栏。</p>
          <textarea v-model="mapJsonText" class="payload-ta" spellcheck="false" rows="20" />
        </template>
      </div>
    </main>

    <main v-else class="canvas-body canvas-empty">
      <p>无法解析块 <code>{{ blockId }}</code>，请关闭窗口。</p>
    </main>
  </div>
</template>

<style scoped>
.canvas-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #e8ecf4;
}
.canvas-root:not(.canvas-root--embedded) {
  height: 100vh;
}
.canvas-root--embedded {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.canvas-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: linear-gradient(to bottom, #dfe6f2, #d4dbe8);
  border-bottom: 1px solid #9aa7c0;
}
.canvas-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}
.canvas-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: #2563eb;
  color: #fff;
}
.canvas-sep {
  opacity: 0.5;
}
.canvas-err {
  color: #b91c1c;
}
.canvas-actions {
  display: flex;
  gap: 8px;
}
.tb {
  padding: 6px 14px;
  font-size: 0.85rem;
  border-radius: 4px;
  border: 1px solid #94a3b8;
  background: #fff;
  cursor: pointer;
}
.tb.primary {
  background: #2563eb;
  color: #fff;
  border-color: #1d4ed8;
}
.tb:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.canvas-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}
.canvas-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}
.canvas-surface {
  min-height: calc(100vh - 120px);
  padding: 20px 24px 32px;
  border-radius: 8px;
  background-color: #f8fafc;
  background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
  background-size: 18px 18px;
  border: 1px solid #cbd5e1;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}
.canvas-root--embedded .canvas-surface {
  min-height: 0;
}
.canvas-hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: #475569;
}
.canvas-hint.title {
  font-weight: 700;
  color: #0f172a;
}
.canvas-hint--warn {
  color: #b45309;
}
.canvas-hint--compact {
  font-size: 0.76rem;
  margin-bottom: 6px;
}
.canvas-table-wrap--readonly {
  margin-bottom: 14px;
}
.canvas-table-wrap {
  overflow: auto;
  max-width: 100%;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  padding: 8px;
}
.canvas-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.canvas-table th,
.canvas-table td {
  border: 1px solid #e2e8f0;
  padding: 4px 6px;
}
.canvas-table th {
  background: #f1f5f9;
  text-align: left;
}
.col-actions {
  width: 64px;
  text-align: center;
}
.cell-inp {
  width: 100%;
  min-width: 72px;
  box-sizing: border-box;
  padding: 4px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font: inherit;
}
.link-btn {
  border: none;
  background: none;
  color: #b91c1c;
  cursor: pointer;
  font-size: 0.78rem;
  text-decoration: underline;
}
.add-row {
  margin-top: 12px;
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #64748b;
  background: #fff;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  max-width: 960px;
}
.field span {
  font-size: 0.78rem;
  color: #64748b;
}
.wide {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font: inherit;
}
.payload-ta {
  width: 100%;
  max-width: 960px;
  box-sizing: border-box;
  padding: 10px 12px;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  resize: vertical;
}
</style>
