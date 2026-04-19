<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue';
import {
  MV_MAP_CANVAS_TITLE,
  MV_MODEL_CANVAS_TITLE,
  MV_MODEL_KV_CANVAS_TITLE,
  MV_MODEL_REFS_SCHEME_DOC,
  MV_MODEL_STRUCT_CANVAS_TITLE,
  MV_VIEW_KIND_METADATA,
  isMermaidViewKind,
  isPlantUmlViewKind,
  parseMarkdownBlocks,
  parseRefUri,
  replaceBlockInnerById,
  resolveRefPath,
  type MvMapPayload,
  type MvModelColumnDef,
  type MvModelKvPayload,
  type MvModelPayload,
  type MvViewKind,
  type MvViewPayload,
  type ParsedFenceBlock,
} from '@mvwb/core';

const MODEL_COL_TYPES = ['string', 'int', 'float', 'boolean', 'json'] as const;

/** 表设计列「可空」：列表头与勾选框共用 */
const TOOLTIP_SCHEMA_NULLABLE =
  '可空（NULLABLE）：该列在每一行 JSON 中可以不出现键，表示「未填」；数据区把单元格清空也会移除该键。取消可空后，每行必须包含此键，保存前会为缺键行自动补「默认值」或空串。解析会拒绝「必填列却缺键」的行。此为模式设计，不等同于单元格内 SQL NULL 字面量。无全局快捷键。';

/** 表设计列「主键」 */
const TOOLTIP_SCHEMA_PK =
  '主键（PRIMARY KEY，PK）：勾选表示该列属于表的主键；多列同时勾选表示联合主键。标记会写入 mv-model JSON，便于与 SQL 表设计对齐。当前工作台不会在保存时校验主键唯一、非空或自增。无全局快捷键。';

/** 表设计列「唯一」 */
const TOOLTIP_SCHEMA_UQ =
  '唯一（UNIQUE，UQ）：勾选表示业务上希望该列在整张表内取值不重复（类似 SQL UNIQUE）。标记会写入 JSON；当前不会自动扫描全部行做重复校验，若需真唯一请在业务或后续校验中实现。无全局快捷键。';

function columnDataHeaderTooltip(c: MvModelColumnDef): string {
  const parts: string[] = [];
  parts.push(`列「${c.name}」：数据区表头。`);
  if (c.comment?.trim()) parts.push(`列注释：${c.comment.trim()}`);
  parts.push(
    c.nullable === true
      ? '角标「null」= 可空：行 JSON 可省略该键；清空单元格会不写键。'
      : '本列不可空：每行须有该键；缺省由默认值或空串补齐。',
  );
  if (c.primaryKey === true) parts.push('角标「PK」= 已标主键（设计语义，多列即联合主键）。');
  if (c.unique === true) parts.push('角标「UQ」= 已标唯一（设计语义，当前不自动查重）。');
  if (c.type) parts.push(`逻辑类型：${c.type}。`);
  parts.push('无全局快捷键。');
  return parts.join(' ');
}

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
/** 行数据区：按单元格全文筛选（不写入 JSON） */
const modelRowFilter = ref('');
/** mv-model 画布内嵌只读平铺表（无需另建 table-readonly 的 mv-view） */
const showModelReadonlyPreview = ref(false);
const kvDraft = ref<MvModelKvPayload | null>(null);
/** 与 documents 平行的 JSON 文本，便于逐条编辑 */
const kvDocStrings = ref<string[]>([]);
const structJsonText = ref('');
const viewDraft = ref<MvViewPayload | null>(null);
const viewModelRefsText = ref('');
const mapJsonText = ref('');

watch(
  block,
  (b) => {
    modelDraft.value = null;
    showModelReadonlyPreview.value = false;
    kvDraft.value = null;
    kvDocStrings.value = [];
    structJsonText.value = '';
    viewDraft.value = null;
    viewModelRefsText.value = '';
    mapJsonText.value = '';
    if (!b) return;
    if (b.kind === 'mv-model') {
      modelRowFilter.value = '';
      modelDraft.value = JSON.parse(JSON.stringify(b.payload)) as MvModelPayload;
    } else if (b.kind === 'mv-model-kv') {
      const p = JSON.parse(JSON.stringify(b.payload)) as MvModelKvPayload;
      kvDraft.value = p;
      kvDocStrings.value = p.documents.map((d) => JSON.stringify(d, null, 2));
    } else if (b.kind === 'mv-model-struct') {
      structJsonText.value = JSON.stringify(b.payload, null, 2);
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
  if (b.kind === 'mv-model-kv') return MV_MODEL_KV_CANVAS_TITLE;
  if (b.kind === 'mv-model-struct') return MV_MODEL_STRUCT_CANVAS_TITLE;
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

const filteredModelRowEntries = computed(() => {
  const m = modelDraft.value;
  if (!m) return [] as { row: Record<string, unknown>; index: number }[];
  const q = modelRowFilter.value.trim().toLowerCase();
  if (!q) return m.rows.map((row, index) => ({ row, index }));
  return m.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      m.columns.some((c) => cellStr(row, c.name).toLowerCase().includes(q)),
    );
});

function sqlQuoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** mv 逻辑类型 → 示意 SQL 类型关键字（非方言精确映射） */
function mvTypeToSqlType(c: MvModelColumnDef): string {
  const t = c.type ?? 'string';
  switch (t) {
    case 'string':
      return 'VARCHAR';
    case 'int':
      return 'BIGINT';
    case 'float':
      return 'DOUBLE PRECISION';
    case 'boolean':
      return 'BOOLEAN';
    case 'json':
      return 'JSON';
    default:
      return String(t).toUpperCase();
  }
}

function sqlDefaultLiteral(v: unknown): string {
  if (v === null) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
}

/** 与列定义对齐的 CREATE TABLE 示意（不落盘、不执行） */
const modelSqlDdlPreview = computed(() => {
  const m = modelDraft.value;
  if (!m) return '--';
  if (!m.columns.length) return '-- （无列，无法生成 DDL）';
  const lines: string[] = [];
  lines.push('-- 示意 DDL（不执行；保存仍为 mv-model JSON）');
  if (m.title?.trim()) lines.push(`-- TABLE COMMENT: ${m.title.trim().replace(/\n/g, ' ')}`);
  lines.push(`CREATE TABLE ${sqlQuoteIdent(m.id)} (`);
  const pkNames = m.columns.filter((c) => c.primaryKey === true).map((c) => c.name);
  const colLines: string[] = [];
  for (const c of m.columns) {
    const parts: string[] = [];
    parts.push(`  ${sqlQuoteIdent(c.name)}`);
    parts.push(mvTypeToSqlType(c));
    parts.push(c.nullable === true ? 'NULL' : 'NOT NULL');
    if (c.unique === true && c.primaryKey !== true) parts.push('UNIQUE');
    if (c.defaultValue !== undefined) parts.push(`DEFAULT ${sqlDefaultLiteral(c.defaultValue)}`);
    let line = parts.join(' ');
    if (c.comment?.trim()) line += `  -- ${c.comment.trim().replace(/\n/g, ' ')}`;
    colLines.push(line);
  }
  if (pkNames.length) colLines.push(`  PRIMARY KEY (${pkNames.map(sqlQuoteIdent).join(', ')})`);
  lines.push(colLines.join(',\n'));
  lines.push(');');
  return lines.join('\n');
});

function columnHeaderSqlLabel(c: MvModelColumnDef): string {
  const bits = [c.name, mvTypeToSqlType(c), c.nullable === true ? 'NULL' : 'NOT NULL'];
  if (c.primaryKey === true) bits.push('PK');
  if (c.unique === true) bits.push('UQ');
  return bits.join(' · ');
}

/** 列名校验：与 core 一致，非空且不重复即可（推荐 SQL 标识符风格，非强制） */
function sanitizeColumnName(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return t;
}

/** 新行 / 新列补格 / 保存补键：与列上 defaultValue、nullable 一致 */
function initialCellValueForColumn(c: MvModelColumnDef): unknown {
  if (c.defaultValue !== undefined) return c.defaultValue;
  if (c.nullable === true) return null;
  return '';
}

function defaultValueInputStr(c: MvModelColumnDef): string {
  const v = c.defaultValue;
  if (v === undefined) return '';
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

/** 空串表示清除默认值；否则按布尔/数字/null 字面量解析，否则为字符串 */
function parseDefaultLiteralInput(raw: string): unknown | undefined {
  const t = raw.trim();
  if (t === '') return undefined;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (!Number.isNaN(Number(t)) && String(Number(t)) === t) return Number(t);
  return raw;
}

function addModelColumn() {
  const m = modelDraft.value;
  if (!m) return;
  let n = m.columns.length + 1;
  let name = `col_${n}`;
  while (m.columns.some((c) => c.name === name)) {
    n++;
    name = `col_${n}`;
  }
  const newCol: MvModelColumnDef = { name, type: 'string', nullable: true };
  m.columns = [...m.columns, newCol];
  const init = initialCellValueForColumn(newCol);
  for (const row of m.rows) {
    row[name] = init;
  }
}

function removeModelColumn(ci: number) {
  const m = modelDraft.value;
  if (!m || ci < 0 || ci >= m.columns.length) return;
  if (m.columns.length <= 1) {
    window.alert('表至少保留一列。');
    return;
  }
  const col = m.columns[ci]!;
  if (!window.confirm(`确定删除列「${col.name}」？该列上的数据将从所有行中删除。`)) return;
  const key = col.name;
  m.columns = m.columns.filter((_, i) => i !== ci);
  m.rows = m.rows.map((row) => {
    const next = { ...row };
    delete next[key];
    return next;
  });
}

function onColumnNameBlur(ci: number, ev: FocusEvent) {
  const el = ev.target as HTMLInputElement;
  renameModelColumn(ci, el.value);
  void Promise.resolve().then(() => {
    const m = modelDraft.value;
    if (m?.columns[ci]) el.value = m.columns[ci]!.name;
  });
}

function renameModelColumn(ci: number, raw: string) {
  const m = modelDraft.value;
  if (!m) return;
  const nextName = sanitizeColumnName(raw);
  if (!nextName) {
    window.alert('列名不能为空。');
    return;
  }
  const old = m.columns[ci]!.name;
  if (old === nextName) return;
  if (m.columns.some((c, i) => i !== ci && c.name === nextName)) {
    window.alert('列名已存在。');
    return;
  }
  m.columns = m.columns.map((c, i) => (i === ci ? { ...c, name: nextName } : c));
  for (const row of m.rows) {
    if (Object.prototype.hasOwnProperty.call(row, old)) {
      row[nextName] = row[old];
      delete row[old];
    }
  }
}

function moveModelColumn(ci: number, delta: number) {
  const m = modelDraft.value;
  if (!m) return;
  const ni = ci + delta;
  if (ni < 0 || ni >= m.columns.length) return;
  const cols = [...m.columns];
  const t = cols[ni]!;
  cols[ni] = cols[ci]!;
  cols[ci] = t;
  m.columns = cols;
}

function setModelColumnType(ci: number, type: string) {
  const m = modelDraft.value;
  if (!m) return;
  m.columns = m.columns.map((c, i) => (i === ci ? { ...c, type: type || undefined } : c));
}

function setModelColumnNullable(ci: number, nullable: boolean) {
  const m = modelDraft.value;
  if (!m) return;
  const col = m.columns[ci]!;
  if (nullable === false) {
    const nextCol: MvModelColumnDef = { ...col };
    delete nextCol.nullable;
    for (const row of m.rows) {
      if (!(col.name in row)) row[col.name] = initialCellValueForColumn(nextCol);
    }
  }
  m.columns = m.columns.map((c, i) => (i === ci ? { ...c, nullable: nullable ? true : undefined } : c));
}

function setModelColumnPrimaryKey(ci: number, pk: boolean) {
  const m = modelDraft.value;
  if (!m) return;
  m.columns = m.columns.map((c, i) =>
    i === ci ? { ...c, primaryKey: pk ? true : undefined } : c,
  );
}

function setModelColumnUnique(ci: number, uq: boolean) {
  const m = modelDraft.value;
  if (!m) return;
  m.columns = m.columns.map((c, i) => (i === ci ? { ...c, unique: uq ? true : undefined } : c));
}

function onColumnCommentBlur(ci: number, ev: FocusEvent) {
  const m = modelDraft.value;
  if (!m) return;
  const t = (ev.target as HTMLInputElement).value;
  m.columns = m.columns.map((c, i) => (i === ci ? { ...c, comment: t.trim() ? t : undefined } : c));
}

function onColumnDefaultBlur(ci: number, ev: FocusEvent) {
  const el = ev.target as HTMLInputElement;
  const v = parseDefaultLiteralInput(el.value);
  const m = modelDraft.value;
  if (!m) return;
  m.columns = m.columns.map((c, i) => {
    if (i !== ci) return c;
    const next: MvModelColumnDef = { ...c };
    if (v === undefined) delete next.defaultValue;
    else next.defaultValue = v as string | number | boolean | null;
    return next;
  });
  void Promise.resolve().then(() => {
    const col = modelDraft.value?.columns[ci];
    if (col) el.value = defaultValueInputStr(col);
  });
}

function addModelRow() {
  const m = modelDraft.value;
  if (!m) return;
  const row: Record<string, unknown> = {};
  for (const c of m.columns) {
    row[c.name] = initialCellValueForColumn(c);
  }
  m.rows = [...m.rows, row];
}

function duplicateModelRow(originalIndex: number) {
  const m = modelDraft.value;
  if (!m || originalIndex < 0 || originalIndex >= m.rows.length) return;
  const copy = { ...m.rows[originalIndex] };
  m.rows = [...m.rows.slice(0, originalIndex + 1), copy, ...m.rows.slice(originalIndex + 1)];
}

function removeModelRow(index: number) {
  const m = modelDraft.value;
  if (!m || index < 0 || index >= m.rows.length) return;
  m.rows = m.rows.filter((_, i) => i !== index);
}

function clearAllModelRows() {
  const m = modelDraft.value;
  if (!m || m.rows.length === 0) return;
  if (!window.confirm(`确定清空全部 ${m.rows.length} 行数据？（表结构不变）`)) return;
  m.rows = [];
}

function normalizeModelRowsForSave() {
  const m = modelDraft.value;
  if (!m) return;
  for (const row of m.rows) {
    for (const c of m.columns) {
      if (!(c.name in row) && c.nullable !== true) {
        row[c.name] = initialCellValueForColumn(c);
      }
    }
  }
}

function cellStr(row: Record<string, unknown>, col: string): string {
  const v = row[col];
  if (v === null || v === undefined) return '';
  return String(v);
}

function setCell(row: Record<string, unknown>, col: string, s: string) {
  const t = s.trim();
  const m = modelDraft.value;
  const colDef = m?.columns.find((c) => c.name === col);
  const nullable = colDef?.nullable === true;
  if (t === '') {
    if (nullable) delete row[col];
    else row[col] = '';
    return;
  }
  if (t === 'true') row[col] = true;
  else if (t === 'false') row[col] = false;
  else if (!Number.isNaN(Number(t)) && String(Number(t)) === t) row[col] = Number(t);
  else row[col] = s;
}

function fenceInnerParsesOk(fence: string, inner: string): boolean {
  const md = `\`\`\`${fence}\n${inner}\n\`\`\`\n`;
  const r = parseMarkdownBlocks(md);
  return r.errors.length === 0 && r.blocks.length === 1 && r.blocks[0].kind === fence;
}

function setKvDocString(i: number, s: string) {
  const next = [...kvDocStrings.value];
  next[i] = s;
  kvDocStrings.value = next;
}

function onKvDocBlur(i: number) {
  if (!kvDraft.value) return;
  const raw = kvDocStrings.value[i] ?? '{}';
  try {
    const p = JSON.parse(raw) as unknown;
    if (p === null || typeof p !== 'object' || Array.isArray(p)) throw new Error('not object');
    const docs = [...kvDraft.value.documents];
    docs[i] = p as Record<string, unknown>;
    kvDraft.value = { ...kvDraft.value, documents: docs };
    const nextS = [...kvDocStrings.value];
    nextS[i] = JSON.stringify(p, null, 2);
    kvDocStrings.value = nextS;
  } catch {
    window.alert('每条文档须为 JSON 对象（类似 MongoDB 文档，键可自由；不可为数组或 null）。');
    const nextS = [...kvDocStrings.value];
    nextS[i] = JSON.stringify(kvDraft.value.documents[i], null, 2);
    kvDocStrings.value = nextS;
  }
}

function addKvDocument() {
  if (!kvDraft.value) return;
  const doc: Record<string, unknown> = {};
  kvDraft.value = { ...kvDraft.value, documents: [...kvDraft.value.documents, doc] };
  kvDocStrings.value = [...kvDocStrings.value, '{}'];
}

function removeKvDocument(i: number) {
  if (!kvDraft.value || i < 0 || i >= kvDraft.value.documents.length) return;
  const docs = kvDraft.value.documents.filter((_, j) => j !== i);
  kvDraft.value = { ...kvDraft.value, documents: docs };
  kvDocStrings.value = kvDocStrings.value.filter((_, j) => j !== i);
}

function buildInnerJson(): string | null {
  const b = block.value;
  if (!b) return null;
  if (b.kind === 'mv-model' && modelDraft.value) {
    normalizeModelRowsForSave();
    return JSON.stringify(modelDraft.value, null, 2);
  }
  if (b.kind === 'mv-model-kv' && kvDraft.value) {
    const inner = JSON.stringify(kvDraft.value, null, 2);
    return fenceInnerParsesOk('mv-model-kv', inner) ? inner : null;
  }
  if (b.kind === 'mv-model-struct') {
    try {
      const parsed = JSON.parse(structJsonText.value) as Record<string, unknown>;
      const inner = JSON.stringify(parsed, null, 2);
      return fenceInnerParsesOk('mv-model-struct', inner) ? inner : null;
    } catch {
      return null;
    }
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
  if (!inner) {
    const k = block.value?.kind;
    if (k === 'mv-model-kv' || k === 'mv-model-struct') {
      window.alert('无法保存：JSON 无效或不符合当前围栏契约（结构化层次须含合法 root；KV 每条须为 JSON 对象）。');
    }
    return;
  }
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
        <span class="canvas-badge">代码块画布</span>
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
          :title="embedded ? '关闭代码块画布标签 — 无全局快捷键' : '关闭窗口 — 无全局快捷键'"
          @click="closeWin"
        >
          关闭
        </button>
        <button
          v-if="block && block.kind === 'mv-model'"
          type="button"
          class="tb"
          :title="
            showModelReadonlyPreview
              ? '隐藏下方只读平铺表 — 无全局快捷键'
              : '在画布内展示只读平铺表（等同只读表视图效果），无需另建 mv-view table-readonly — 无全局快捷键'
          "
          @click="showModelReadonlyPreview = !showModelReadonlyPreview"
        >
          {{ showModelReadonlyPreview ? '隐藏只读视图' : '显示只读视图' }}
        </button>
        <button type="button" class="tb primary" :disabled="!block" title="保存到 Markdown — 无全局快捷键" @click="save">保存</button>
      </div>
    </header>

    <main v-if="block" class="canvas-body">
      <div class="canvas-surface" aria-label="Markdown 围栏代码块编辑画布">
        <template v-if="block.kind === 'mv-model' && modelDraft">
          <div class="model-sql-surface">
          <h3 class="model-section-title">DDL · 列定义（结构化编辑）</h3>
          <p class="canvas-hint canvas-hint--compact">
            以 <strong>SQL 表设计</strong> 语义呈现：<code>COLUMN</code> / 逻辑类型映射为示意 <code>TYPE</code>、<code>NULL</code> /
            <code>NOT NULL</code>、<code>PRIMARY KEY</code>（多列即联合）、<code>UNIQUE</code>、<code>DEFAULT</code>、列级
            <code>-- comment</code>。下方 <code>CREATE TABLE</code> 为<strong>只读示意</strong>；落盘仍是 <code>mv-model</code> JSON。默认值输入仍按
            JSON 字面量解析。块 <code>id</code> 只读。
          </p>
          <div class="model-meta-grid model-meta-grid--sql">
            <label class="field field--inline">
              <span class="sql-meta-label">TABLE</span>
              <input class="wide sql-mono-inp" type="text" :value="modelDraft.id" readonly title="块 id ≡ 表名标识；只读 — 无全局快捷键" />
            </label>
            <label class="field field--inline">
              <span class="sql-meta-label">COMMENT（title）</span>
              <input v-model="modelDraft.title" class="wide sql-mono-inp" type="text" placeholder="可选" />
            </label>
          </div>
          <pre class="model-ddl-preview" aria-label="CREATE TABLE 示意">{{ modelSqlDdlPreview }}</pre>
          <div class="canvas-table-wrap model-schema-wrap">
            <table class="canvas-table model-schema-table model-schema-table--wide model-schema-table--sql">
              <thead>
                <tr>
                  <th><span class="sql-th">column</span></th>
                  <th><span class="sql-th">type</span></th>
                  <th class="td-center" :title="TOOLTIP_SCHEMA_NULLABLE"><span class="sql-th">null</span></th>
                  <th class="td-center" :title="TOOLTIP_SCHEMA_PK"><span class="sql-th">pk</span></th>
                  <th class="td-center" :title="TOOLTIP_SCHEMA_UQ"><span class="sql-th">uq</span></th>
                  <th><span class="sql-th">default</span></th>
                  <th><span class="sql-th">comment</span></th>
                  <th class="col-schema-actions"><span class="sql-th">ord / drop</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, ci) in modelDraft.columns" :key="ci">
                  <td>
                    <input
                      class="cell-inp sql-mono-inp"
                      type="text"
                      :value="c.name"
                      :aria-label="`列名 ${ci + 1}`"
                      title="失焦时校验并重命名（非空、同表不重复）— 无全局快捷键"
                      @blur="onColumnNameBlur(ci, $event)"
                    />
                  </td>
                  <td>
                    <select
                      class="cell-inp cell-select sql-mono-inp"
                      :value="c.type ?? 'string'"
                      :aria-label="`列 ${c.name} 类型`"
                      title="逻辑类型（写入 JSON）；单元格仍按文本编辑 — 无全局快捷键"
                      @change="setModelColumnType(ci, ($event.target as HTMLSelectElement).value)"
                    >
                      <option v-for="t in MODEL_COL_TYPES" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </td>
                  <td class="td-center">
                    <input
                      type="checkbox"
                      :checked="c.nullable === true"
                      :aria-label="`列 ${c.name} 可空`"
                      :title="TOOLTIP_SCHEMA_NULLABLE"
                      @change="setModelColumnNullable(ci, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
                  <td class="td-center">
                    <input
                      type="checkbox"
                      :checked="c.primaryKey === true"
                      :aria-label="`列 ${c.name} 主键`"
                      :title="TOOLTIP_SCHEMA_PK"
                      @change="setModelColumnPrimaryKey(ci, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
                  <td class="td-center">
                    <input
                      type="checkbox"
                      :checked="c.unique === true"
                      :aria-label="`列 ${c.name} 唯一`"
                      :title="TOOLTIP_SCHEMA_UQ"
                      @change="setModelColumnUnique(ci, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
                  <td>
                    <input
                      class="cell-inp cell-inp--default sql-mono-inp"
                      type="text"
                      :value="defaultValueInputStr(c)"
                      :aria-label="`列 ${c.name} 默认值`"
                      placeholder="空=无；null / true / 数字 / 文本"
                      title="失焦写入 JSON；空清除 — 无全局快捷键"
                      @blur="onColumnDefaultBlur(ci, $event)"
                    />
                  </td>
                  <td>
                    <input
                      class="cell-inp cell-inp--comment sql-mono-inp"
                      type="text"
                      :value="c.comment ?? ''"
                      :aria-label="`列 ${c.name} 注释`"
                      placeholder="-- 列说明"
                      title="仅设计/文档用 — 无全局快捷键"
                      @blur="onColumnCommentBlur(ci, $event)"
                    />
                  </td>
                  <td class="col-schema-actions">
                    <button type="button" class="btn-ghost" title="左移 — 无全局快捷键" @click="moveModelColumn(ci, -1)">←</button>
                    <button type="button" class="btn-ghost" title="右移 — 无全局快捷键" @click="moveModelColumn(ci, 1)">→</button>
                    <button type="button" class="link-btn" title="删除列 — 无全局快捷键" @click="removeModelColumn(ci)">删列</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button type="button" class="add-row" @click="addModelColumn">＋ ADD COLUMN</button>

          <h3 class="model-section-title model-section-title--data">DML · 行集（JSON 单元格）</h3>
          <p class="canvas-hint canvas-hint--compact">
            类比 <code>UPDATE</code> 单格编辑；<code>INSERT</code>/<code>DELETE</code> 用添加行、删行、复制行；筛选为全列子串匹配（视图层
            <code>LIKE '%…%'</code> 语义，不写回 JSON）。
          </p>
          <div class="model-data-toolbar">
            <label class="field field--grow">
              <span class="sql-meta-label">WHERE 子串</span>
              <input v-model="modelRowFilter" class="wide sql-mono-inp" type="search" placeholder="任意列 LIKE …" />
            </label>
            <span class="model-row-count">
              共 {{ modelDraft.rows.length }} 行
              <template v-if="modelRowFilter.trim()"> · 显示 {{ filteredModelRowEntries.length }} 行</template>
            </span>
          </div>
          <div class="canvas-table-wrap canvas-table-wrap--sql-rows">
            <table class="canvas-table canvas-table--sql-rows">
              <thead>
                <tr>
                  <th
                    v-for="c in modelDraft.columns"
                    :key="c.name"
                    class="th-sql-col"
                    :title="columnDataHeaderTooltip(c)"
                  >
                    <code class="th-sql-col-line">{{ columnHeaderSqlLabel(c) }}</code>
                  </th>
                  <th class="col-actions"><span class="sql-th">_ops</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="{ row, index: ri } in filteredModelRowEntries" :key="ri">
                  <td v-for="c in modelDraft.columns" :key="c.name">
                    <input
                      class="cell-inp sql-mono-inp"
                      type="text"
                      :value="cellStr(row, c.name)"
                      :aria-label="c.name"
                      @input="setCell(row, c.name, ($event.target as HTMLInputElement).value)"
                    />
                  </td>
                  <td class="col-actions">
                    <button type="button" class="link-btn link-btn--muted" title="复制本行 — 无全局快捷键" @click="duplicateModelRow(ri)">复制</button>
                    <button type="button" class="link-btn" title="删除本行 — 无全局快捷键" @click="removeModelRow(ri)">删行</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="model-data-actions">
            <button type="button" class="add-row" @click="addModelRow">＋ INSERT ROW</button>
            <button
              type="button"
              class="add-row add-row--danger"
              :disabled="modelDraft.rows.length === 0"
              title="清空全部行 — 无全局快捷键"
              @click="clearAllModelRows"
            >
              清空全部行
            </button>
          </div>

          <section v-if="showModelReadonlyPreview" class="model-readonly-preview" aria-label="只读平铺表预览">
            <h3 class="model-section-title model-section-title--readonly">SELECT * 风格 · 只读</h3>
            <p class="canvas-hint canvas-hint--compact">
              平铺<strong>全部行</strong>（与 <code>table-readonly</code> 视图画布表格区一致）；无需另建 <code>mv-view</code>。未保存修改即时反映；落盘仍以
              <code>mv-model</code> JSON 为准。
            </p>
            <div class="canvas-table-wrap canvas-table-wrap--readonly">
              <table class="canvas-table canvas-table--sql-rows">
                <thead>
                  <tr>
                    <th v-for="c in modelDraft.columns" :key="'ro-h-' + c.name">{{ c.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in modelDraft.rows" :key="'ro-r-' + ri">
                    <td v-for="c in modelDraft.columns" :key="c.name">{{ cellStr(row, c.name) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          </div>
        </template>

        <template v-else-if="block.kind === 'mv-model-kv' && kvDraft">
          <h3 class="model-section-title">KV 数据表画布 · 文档集</h3>
          <p class="canvas-hint canvas-hint--compact">
            类比 <strong>MongoDB collection</strong>：<code>documents[]</code> 中每条为<strong>独立 JSON 对象</strong>，键集合可不固定。保存时用解析器校验。块
            <code>id</code> 只读。
          </p>
          <div class="model-meta-grid">
            <label class="field field--inline">
              <span>块 id（只读）</span>
              <input class="wide" type="text" :value="kvDraft.id" readonly title="块 id — 无全局快捷键" />
            </label>
            <label class="field field--inline">
              <span>标题 title</span>
              <input v-model="kvDraft.title" class="wide" type="text" placeholder="可选" />
            </label>
          </div>
          <p class="canvas-hint canvas-hint--compact">每条下方为 JSON 对象；失焦时解析并格式化。可增删文档条数。</p>
          <div v-for="(_d, di) in kvDraft.documents" :key="di" class="kv-doc-block">
            <div class="kv-doc-head">
              <span>文档 {{ di + 1 }}</span>
              <button type="button" class="link-btn" title="删除该文档 — 无全局快捷键" @click="removeKvDocument(di)">删除</button>
            </div>
            <textarea
              class="payload-ta kv-doc-ta"
              spellcheck="false"
              rows="8"
              :value="kvDocStrings[di]"
              :aria-label="`文档 ${di + 1} JSON`"
              @input="setKvDocString(di, ($event.target as HTMLTextAreaElement).value)"
              @blur="onKvDocBlur(di)"
            />
          </div>
          <button type="button" class="add-row" @click="addKvDocument">＋ 添加文档</button>
        </template>

        <template v-else-if="block.kind === 'mv-model-struct'">
          <h3 class="model-section-title">结构化层次画布 · HDF5 风格</h3>
          <p class="canvas-hint canvas-hint--compact">
            类比 <strong>HDF5</strong>：顶层 <code>root</code> 为组（<code>name</code>、可选 <code>attributes</code>、子 <code>groups[]</code>、
            <code>datasets[]</code>）。数据集含 <code>name</code>、可选 <code>dtype</code>、<code>data</code>。保存前将整段 JSON 送解析器校验。
          </p>
          <textarea v-model="structJsonText" class="payload-ta" spellcheck="false" rows="22" aria-label="mv-model-struct JSON" />
        </template>

        <template v-else-if="block.kind === 'mv-view' && viewDraft">
          <p class="canvas-hint title">{{ canvasSurfaceTitle }}</p>
          <p class="canvas-hint canvas-hint--compact">
            对应文档中的 <code>mv-view</code> 围栏代码块；块内为视图 JSON，<code>payload</code> 可为 JSON、XML、PlantUML/Mermaid 文本等。
          </p>
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

          <p v-if="isMermaidViewKind(viewDraft.kind)" class="canvas-hint canvas-hint--compact">
            若源码里本 <code>mv-view</code> 围栏之后紧跟标准 mermaid 代码围栏（三个反引号 + <code>mermaid</code>），则其与下方 <code>payload</code> 为<strong>同文镜像</strong>；保存时会一并写回，便于普通 Markdown 预览出图。
          </p>
          <label class="field">
            <span
              >payload（{{
                isPlantUmlViewKind(viewDraft.kind)
                  ? 'PlantUML / 图源'
                  : isMermaidViewKind(viewDraft.kind)
                    ? 'Mermaid 图源'
                    : '子类型载荷'
              }}）</span
            >
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
          <p class="canvas-hint">编辑 <code>mv-map</code> 围栏代码块内的映射规则 JSON；保存后写回 Markdown。</p>
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
  min-width: 118px;
  width: auto;
  text-align: center;
  white-space: nowrap;
}
.col-schema-actions {
  min-width: 132px;
  text-align: center;
  white-space: nowrap;
}
.td-center {
  text-align: center;
}
.model-section-title {
  margin: 20px 0 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}
.model-section-title:first-of-type {
  margin-top: 0;
}
.model-section-title--data {
  margin-top: 24px;
}
.model-readonly-preview {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}
.model-section-title--readonly {
  margin-top: 0;
  color: #475569;
}
.model-sql-surface {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8125rem;
}
.model-sql-surface .canvas-hint {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 0.8125rem;
}
.model-sql-surface .model-meta-grid--sql {
  max-width: 100%;
}
.sql-meta-label {
  font-weight: 600;
  color: #0c4a6e;
  letter-spacing: 0.02em;
}
.sql-mono-inp,
.sql-mono-inp.cell-select {
  font-family: inherit;
}
.model-ddl-preview {
  margin: 0 0 14px;
  padding: 12px 14px;
  max-height: 220px;
  overflow: auto;
  white-space: pre;
  word-break: normal;
  tab-size: 2;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 6px;
  border: 1px solid #1e293b;
  font-size: 0.78rem;
  line-height: 1.45;
}
.sql-th {
  font-weight: 700;
  color: #0369a1;
  text-transform: lowercase;
  letter-spacing: 0.04em;
  font-size: 0.72rem;
}
.model-schema-table--sql thead th {
  vertical-align: bottom;
}
.th-sql-col {
  max-width: 14rem;
  text-align: left;
  font-weight: 600;
}
.th-sql-col-line {
  display: block;
  white-space: normal;
  word-break: break-word;
  font-size: 0.72rem;
  font-weight: 500;
  color: #0f172a;
  line-height: 1.35;
}
.canvas-table-wrap--sql-rows {
  border-color: #cbd5e1;
}
.canvas-table--sql-rows .cell-inp {
  font-family: inherit;
}
.model-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  margin-bottom: 12px;
  max-width: 960px;
}
@media (max-width: 720px) {
  .model-meta-grid {
    grid-template-columns: 1fr;
  }
}
.field--inline {
  margin-bottom: 0;
}
.field--grow {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}
.model-schema-wrap {
  margin-bottom: 8px;
}
.model-schema-table .cell-inp {
  min-width: 100px;
}
.model-schema-table--wide {
  min-width: 880px;
}
.cell-inp--default {
  min-width: 120px;
  font-size: 0.78rem;
}
.cell-inp--comment {
  min-width: 100px;
  font-size: 0.78rem;
}
.th-pk {
  margin-left: 4px;
  font-size: 0.62rem;
  font-weight: 700;
  color: #1d4ed8;
  vertical-align: super;
}
.th-uq {
  margin-left: 2px;
  font-size: 0.62rem;
  font-weight: 600;
  color: #7c3aed;
  vertical-align: super;
}
.cell-select {
  cursor: pointer;
}
.btn-ghost {
  margin: 0 2px;
  padding: 2px 8px;
  font-size: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}
.btn-ghost:hover {
  background: #e2e8f0;
}
.th-type {
  font-weight: 400;
  color: #64748b;
  font-size: 0.72rem;
}
.th-null {
  margin-left: 4px;
  font-size: 0.65rem;
  color: #94a3b8;
}
.model-data-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
  margin-bottom: 10px;
  max-width: 960px;
}
.model-row-count {
  font-size: 0.78rem;
  color: #64748b;
  padding-bottom: 4px;
}
.model-data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
}
.model-data-actions .add-row {
  margin-top: 0;
}
.add-row--danger {
  border-color: #fca5a5;
  color: #b91c1c;
}
.add-row--danger:disabled {
  opacity: 0.45;
}
.link-btn--muted {
  color: #475569;
  margin-right: 6px;
}
.kv-doc-block {
  margin-bottom: 14px;
  max-width: 960px;
}
.kv-doc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f172a;
}
.kv-doc-ta {
  font-family: ui-monospace, Consolas, monospace;
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
