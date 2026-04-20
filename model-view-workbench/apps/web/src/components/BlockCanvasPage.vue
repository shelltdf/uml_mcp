<script setup lang="ts">
import { computed, nextTick, provide, ref, watch } from 'vue';
import CodespaceCanvasEditor from './codespace/CodespaceCanvasEditor.vue';
import CodespaceClassifierFloat from './codespace/floating/CodespaceClassifierFloat.vue';
import MermaidClassDiagramCanvas from './mvview/MermaidClassDiagramCanvas.vue';
import {
  MV_MAP_CANVAS_TITLE,
  MV_MODEL_INTERFACE_CANVAS_TITLE,
  MV_MODEL_KV_CANVAS_TITLE,
  MV_MODEL_SQL_CANVAS_TITLE,
  MV_MODEL_STRUCT_CANVAS_TITLE,
  parseViewPayloadClassDiagram,
  isMermaidViewKind,
  isPlantUmlViewKind,
  normalizeRelPath,
  parseMarkdownBlocks,
  replaceBlockInnerById,
  type MvMapPayload,
  type MvModelCodespacePayload,
  type MvModelColumnDef,
  type MvModelKvPayload,
  type MvModelSqlPayload,
  type MvModelSqlTable,
  type MvViewKind,
  type MvViewPayload,
  type ParsedFenceBlock,
} from '@mvwb/core';
import { useAppLocale } from '../composables/useAppLocale';
import { CS_CANVAS_MSG_KEY, codespaceCanvasMessages } from '../i18n/codespace-canvas-messages';
import { mvViewKindStrings } from '../i18n/mv-view-kind-locale';
import type { CodespaceDockContextPayload } from '../utils/codespace-dock-context';
import {
  findCodespaceClassifierForMermaidClass,
  getFirstCodespaceRefForMermaidClass,
  listCodespaceClassesForMermaidClass,
  type CodespaceClassTreeItem,
} from '../utils/mermaid-codespace-bridge';
import {
  buildModelRefString,
  inferPickerPathFromModelRefs,
  listModelRefCandidates,
  resolvePickerTargetFileRel,
  type ModelRefCandidate,
} from '../utils/model-refs-picker';

const { locale, ui } = useAppLocale();
const csCanvasMsgForBlock = computed(() => codespaceCanvasMessages[locale.value]);
provide(CS_CANVAS_MSG_KEY, csCanvasMsgForBlock);

const MODEL_COL_TYPES = ['string', 'int', 'float', 'boolean', 'json'] as const;

/** 表设计列「可空」：列表头与勾选框共用 */
const TOOLTIP_SCHEMA_NULLABLE =
  '可空（NULLABLE）：该列在每一行 JSON 中可以不出现键，表示「未填」；数据区把单元格清空也会移除该键。取消可空后，每行必须包含此键，保存前会为缺键行自动补「默认值」或空串。解析会拒绝「必填列却缺键」的行。此为模式设计，不等同于单元格内 SQL NULL 字面量。无全局快捷键。';

/** 表设计列「主键」 */
const TOOLTIP_SCHEMA_PK =
  '主键（PRIMARY KEY，PK）：勾选表示该列属于表的主键；多列同时勾选表示联合主键。标记会写入 mv-model-sql JSON，便于与 SQL 表设计对齐。当前工作台不会在保存时校验主键唯一、非空或自增。无全局快捷键。';

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
  /** 代码空间画布选中节点摘要与属性行，供主窗口属性 Dock 展示 */
  (e: 'codespaceDockContext', ctx: CodespaceDockContextPayload): void;
  /** 画布是否有未保存改动（供外层工具栏“保存”按钮高亮） */
  (e: 'dirtyChange', dirty: boolean): void;
}>();

const block = computed<ParsedFenceBlock | null>(() => {
  const { blocks } = parseMarkdownBlocks(props.markdown);
  return blocks.find((b) => b.payload.id === props.blockId) ?? null;
});

const modelSqlDraft = ref<MvModelSqlPayload | null>(null);
/** 当前编辑的 ``tables[]`` 下标 */
const activeTableIndex = ref(0);
/** 当前子表（计算属性，指向 modelSqlDraft 内对象，可原地改列/行） */
const modelDraft = computed((): MvModelSqlTable | null => {
  const d = modelSqlDraft.value;
  const i = activeTableIndex.value;
  if (!d || i < 0 || i >= d.tables.length) return null;
  return d.tables[i]!;
});
/** 行数据区：按单元格全文筛选（不写入 JSON） */
const modelRowFilter = ref('');
/** DDL / DML 分区折叠（仅 mv-model-sql 画布） */
const sqlDdlSectionOpen = ref(true);
const sqlDmlSectionOpen = ref(true);
/** mv-model-sql 画布内嵌只读平铺表：当前子表 + 与 DML 相同 WHERE 筛选 */
const showModelReadonlyPreview = ref(false);
const kvDraft = ref<MvModelKvPayload | null>(null);
/** 与 documents 平行的 JSON 文本，便于逐条编辑 */
const kvDocStrings = ref<string[]>([]);
const structJsonText = ref('');
const codespaceDraft = ref<MvModelCodespacePayload | null>(null);
const interfaceJsonText = ref('');
const viewDraft = ref<MvViewPayload | null>(null);
/** modelRefs：相对当前 mv-view 所在 .md 目录的路径，空=当前文件 */
const modelRefsRelPathInput = ref('');
const mapJsonText = ref('');
/** mermaid-class：payload 编辑模式 */
const mermaidPayloadMode = ref<'meta' | 'canvas' | 'source'>('canvas');
/** 类图双击 / 浮窗编辑的 codespace 侧车副本（与 modelRefs 指向块同步保存） */
const mermaidCodespaceFloatOpen = ref(false);
const mermaidCodespaceFloat = ref<{ mi: number; path: number[]; ci: number } | null>(null);
const mermaidCodespaceSideBlockId = ref<string | null>(null);
const mermaidCodespaceSidePayload = ref<MvModelCodespacePayload | null>(null);
/** 子表标签「×」删除：页内确认（部分壳层对 window.confirm 不可靠） */
const subtableDeleteOpen = ref(false);
const subtableDeleteIndex = ref<number | null>(null);

watch(
  block,
  (b) => {
    modelSqlDraft.value = null;
    activeTableIndex.value = 0;
    subtableDeleteOpen.value = false;
    subtableDeleteIndex.value = null;
    showModelReadonlyPreview.value = false;
    kvDraft.value = null;
    kvDocStrings.value = [];
    structJsonText.value = '';
    codespaceDraft.value = null;
    interfaceJsonText.value = '';
    viewDraft.value = null;
    modelRefsRelPathInput.value = '';
    mapJsonText.value = '';
    mermaidPayloadMode.value = 'canvas';
    mermaidCodespaceFloatOpen.value = false;
    mermaidCodespaceFloat.value = null;
    mermaidCodespaceSideBlockId.value = null;
    mermaidCodespaceSidePayload.value = null;
    if (!b) return;
    if (b.kind === 'mv-model-sql') {
      modelRowFilter.value = '';
      sqlDdlSectionOpen.value = true;
      sqlDmlSectionOpen.value = true;
      modelSqlDraft.value = JSON.parse(JSON.stringify(b.payload)) as MvModelSqlPayload;
      activeTableIndex.value = 0;
    } else if (b.kind === 'mv-model-kv') {
      const p = JSON.parse(JSON.stringify(b.payload)) as MvModelKvPayload;
      kvDraft.value = p;
      kvDocStrings.value = p.documents.map((d) => JSON.stringify(d, null, 2));
    } else if (b.kind === 'mv-model-struct') {
      structJsonText.value = JSON.stringify(b.payload, null, 2);
    } else if (b.kind === 'mv-model-codespace') {
      codespaceDraft.value = JSON.parse(JSON.stringify(b.payload)) as MvModelCodespacePayload;
    } else if (b.kind === 'mv-model-interface') {
      interfaceJsonText.value = JSON.stringify(b.payload, null, 2);
    } else if (b.kind === 'mv-view') {
      viewDraft.value = JSON.parse(JSON.stringify(b.payload)) as MvViewPayload;
      if (!Array.isArray(viewDraft.value.modelRefs)) viewDraft.value.modelRefs = [];
      if (typeof viewDraft.value.payload !== 'string') viewDraft.value.payload = '';
      // 用户要求：路径输入框默认保持空字符串，不做 modelRefs 自动反推。
      modelRefsRelPathInput.value = '';
    } else if (b.kind === 'mv-map') {
      mapJsonText.value = JSON.stringify(b.payload as MvMapPayload, null, 2);
    }
  },
  { immediate: true },
);

const subtableDeleteTargetId = computed(() => {
  const d = modelSqlDraft.value;
  const i = subtableDeleteIndex.value;
  if (!d || i === null || i < 0 || i >= d.tables.length) return '';
  return d.tables[i]!.id;
});

watch(subtableDeleteOpen, async (open) => {
  if (!open) return;
  await nextTick();
  document.querySelector<HTMLElement>('.msc-del-dialog')?.focus();
});

const canvasSurfaceTitle = computed(() => {
  const b = block.value;
  if (!b) return '';
  if (b.kind === 'mv-model-sql') return MV_MODEL_SQL_CANVAS_TITLE;
  if (b.kind === 'mv-model-kv') return MV_MODEL_KV_CANVAS_TITLE;
  if (b.kind === 'mv-model-struct') return MV_MODEL_STRUCT_CANVAS_TITLE;
  if (b.kind === 'mv-model-codespace') return ui.value.canvasTitleMvModelCodespace;
  if (b.kind === 'mv-model-interface') return MV_MODEL_INTERFACE_CANVAS_TITLE;
  if (b.kind === 'mv-map') return MV_MAP_CANVAS_TITLE;
  if (b.kind === 'mv-view') {
    const k = (b.payload as MvViewPayload).kind;
    return mvViewKindStrings(k, locale.value).canvasTitle;
  }
  return '';
});

const viewKindDescription = computed(() => {
  const b = block.value;
  if (!b || b.kind !== 'mv-view' || !viewDraft.value) return '';
  return mvViewKindStrings(viewDraft.value.kind as MvViewKind, locale.value).description;
});

const viewPayloadPlaceholder = computed(() => {
  const b = block.value;
  if (!b || b.kind !== 'mv-view' || !viewDraft.value) return '';
  return mvViewKindStrings(viewDraft.value.kind as MvViewKind, locale.value).payloadPlaceholder;
});

const classTabMetaLabel = computed(() => (locale.value === 'en' ? 'Basic Info' : '基本信息'));
const classTabCanvasLabel = computed(() => (locale.value === 'en' ? 'Class Canvas' : '类图画布'));
const classTabSourceLabel = computed(() => (locale.value === 'en' ? 'Source' : '源码'));

const modelRefsTargetFileRel = computed(() =>
  resolvePickerTargetFileRel(props.relPath, modelRefsRelPathInput.value),
);

const modelRefsTargetMarkdown = computed((): string | null => {
  const viewN = normalizeRelPath(props.relPath.replace(/\\/g, '/'));
  const targetN = normalizeRelPath(modelRefsTargetFileRel.value.replace(/\\/g, '/'));
  if (viewN === targetN) return props.markdown;
  const raw = props.workspaceFiles?.[targetN];
  return raw !== undefined ? raw : null;
});

const modelRefsTargetMissing = computed(
  () =>
    modelRefsRelPathInput.value.trim() !== '' &&
    modelRefsTargetMarkdown.value === null,
);

const modelRefsCandidates = computed((): ModelRefCandidate[] =>
  listModelRefCandidates(modelRefsTargetMarkdown.value ?? ''),
);

function canonicalModelRef(c: ModelRefCandidate): string {
  return buildModelRefString(
    normalizeRelPath(props.relPath.replace(/\\/g, '/')),
    modelRefsTargetFileRel.value,
    c.blockId,
    c.tableId,
  );
}

function isModelRefCandidateChecked(c: ModelRefCandidate): boolean {
  const v = viewDraft.value;
  if (!v?.modelRefs?.length) return false;
  const canon = canonicalModelRef(c);
  return v.modelRefs.some((r) => r === canon || r === c.value);
}

function toggleModelRefCandidate(c: ModelRefCandidate) {
  const v = viewDraft.value;
  if (!v) return;
  const canon = canonicalModelRef(c);
  // 该区域按单选处理：只保留当前选中的一个引用，避免旧模板/历史引用残留。
  v.modelRefs = [canon];
}

function clearModelRefsPathInput() {
  modelRefsRelPathInput.value = '';
}

function openModelRefsPathPrompt() {
  const next = window.prompt(
    locale.value === 'en' ? 'Input model file relative path (.md):' : '请输入模型文件相对路径（.md）：',
    modelRefsRelPathInput.value,
  );
  if (next === null) return;
  modelRefsRelPathInput.value = next.trim();
}

/** 当前路径下列表无法覆盖的已有引用（仍保留在 JSON 中） */
const modelRefsOrphanRefs = computed((): string[] => {
  const v = viewDraft.value;
  if (!v?.modelRefs?.length) return [];
  const canonSet = new Set(modelRefsCandidates.value.map((c) => canonicalModelRef(c)));
  const valSet = new Set(modelRefsCandidates.value.map((c) => c.value));
  return v.modelRefs.filter((r) => !canonSet.has(r) && !valSet.has(r));
});

const mermaidClassHasValidModelSource = computed((): boolean => {
  const v = viewDraft.value;
  if (!v || v.kind !== 'mermaid-class') return true;
  if (modelRefsTargetMissing.value) return false;
  if (!Array.isArray(v.modelRefs) || v.modelRefs.length === 0) return false;
  const canonSet = new Set(modelRefsCandidates.value.map((c) => canonicalModelRef(c)));
  const valSet = new Set(modelRefsCandidates.value.map((c) => c.value));
  return v.modelRefs.some((r) => canonSet.has(r) || valSet.has(r));
});

const mermaidClassModelSourceError = computed((): string => {
  if (mermaidClassHasValidModelSource.value) return '';
  return locale.value === 'en'
    ? 'No valid model source. Bind a usable modelRefs entry in Basic Info first.'
    : '未指定有效 model 来源，请先在“基本信息”里绑定可用的 modelRefs。';
});

const mermaidCodespaceClassTree = computed<CodespaceClassTreeItem[]>(() => {
  if (!viewDraft.value || viewDraft.value.kind !== 'mermaid-class') return [];
  return listCodespaceClassesForMermaidClass(mermaidClassSourceMarkdown.value, viewDraft.value.modelRefs ?? []);
});

const mermaidClassSourceMarkdown = computed((): string => {
  const sideId = mermaidCodespaceSideBlockId.value;
  const sidePayload = mermaidCodespaceSidePayload.value;
  if (!sideId || !sidePayload) return props.markdown;
  const next = replaceBlockInnerById(props.markdown, sideId, JSON.stringify(sidePayload, null, 2));
  return next ?? props.markdown;
});

const mermaidAssocTargetsByClassId = computed<Record<string, string[]>>(() => {
  const out: Record<string, string[]> = {};
  const v = viewDraft.value;
  if (!v || v.kind !== 'mermaid-class') return out;
  const parsed = parseViewPayloadClassDiagram(v.payload ?? '');
  for (const l of parsed.state.links) {
    if (l.kind !== 'association') continue;
    if (!out[l.from]) out[l.from] = [];
    if (!out[l.to]) out[l.to] = [];
    if (!out[l.from]!.includes(l.to)) out[l.from]!.push(l.to);
    if (!out[l.to]!.includes(l.from)) out[l.to]!.push(l.from);
  }
  return out;
});

function syncAssocTypeFromDiagramToCodespace(): void {
  const v = viewDraft.value;
  const side = mermaidCodespaceSidePayload.value;
  if (!v || v.kind !== 'mermaid-class' || !side) return;
  const targets = mermaidAssocTargetsByClassId.value;
  const nameById = new Map<string, string>();
  for (const mod of side.modules ?? []) {
    const walk = (nodes: typeof mod.namespaces) => {
      for (const n of nodes ?? []) {
        for (const c of n.classes ?? []) nameById.set(c.id, (c.name ?? c.id).trim());
        walk(n.namespaces);
      }
    };
    walk(mod.namespaces);
  }
  const resolveType = (classId: string): string | undefined => {
    const first = targets[classId]?.[0];
    if (!first) return undefined;
    return nameById.get(first) ?? first;
  };
  for (const mod of side.modules ?? []) {
    const walk = (nodes: typeof mod.namespaces) => {
      for (const n of nodes ?? []) {
        for (const c of n.classes ?? []) {
          const t = resolveType(c.id);
          for (const m of c.member ?? []) {
            m.typeFromAssociation = !!t || undefined;
            if (t) m.type = t;
          }
          for (const p of c.properties ?? []) {
            p.typeFromAssociation = !!t || undefined;
            if (t) p.type = t;
          }
        }
        walk(n.namespaces);
      }
    };
    walk(mod.namespaces);
  }
}

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
  lines.push('-- 示意 DDL（不执行；保存仍为 mv-model-sql JSON）');
  const grp = modelSqlDraft.value;
  if (grp?.title?.trim()) lines.push(`-- MODEL GROUP: ${grp.title.trim().replace(/\n/g, ' ')}`);
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

function selectSqlTable(index: number) {
  const d = modelSqlDraft.value;
  if (!d || index < 0 || index >= d.tables.length) return;
  activeTableIndex.value = index;
  modelRowFilter.value = '';
}

function addModelSqlTable() {
  const d = modelSqlDraft.value;
  if (!d) return;
  let n = d.tables.length + 1;
  let tid = `t_${n}`;
  while (d.tables.some((t) => t.id === tid)) {
    n++;
    tid = `t_${n}`;
  }
  const newTable: MvModelSqlTable = {
    id: tid,
    title: '',
    columns: [{ name: 'id', type: 'string', primaryKey: true, nullable: false }],
    rows: [],
  };
  d.tables = [...d.tables, newTable];
  activeTableIndex.value = d.tables.length - 1;
  modelRowFilter.value = '';
}

function onSubtableTabStripClick(ti: number, ev: MouseEvent) {
  const el = ev.target as HTMLElement | null;
  if (el?.closest('.model-subtable-tab-close')) return;
  selectSqlTable(ti);
}

function openSubtableDeleteDialog(index: number) {
  const d = modelSqlDraft.value;
  if (!d || index < 0 || index >= d.tables.length) return;
  if (d.tables.length <= 1) {
    window.alert(
      '【警告】无法删除：Model 组内须至少保留一张子表。\n\n若需移除整组数据模型，请在主文档中删除对应的 mv-model-sql 围栏块。',
    );
    return;
  }
  subtableDeleteIndex.value = index;
  subtableDeleteOpen.value = true;
}

function cancelSubtableDelete() {
  subtableDeleteOpen.value = false;
  subtableDeleteIndex.value = null;
}

function confirmSubtableDelete() {
  const d = modelSqlDraft.value;
  const i = subtableDeleteIndex.value;
  subtableDeleteOpen.value = false;
  subtableDeleteIndex.value = null;
  if (!d || i === null || i < 0 || i >= d.tables.length) return;
  if (d.tables.length <= 1) return;
  const oldActive = activeTableIndex.value;
  d.tables = d.tables.filter((_, j) => j !== i);
  let newIdx = oldActive;
  if (i < oldActive) newIdx = oldActive - 1;
  else if (i === oldActive) newIdx = Math.min(i, d.tables.length - 1);
  activeTableIndex.value = Math.max(0, newIdx);
  modelRowFilter.value = '';
}

function onSqlTableIdBlur(ev: FocusEvent) {
  const el = ev.target as HTMLInputElement;
  const d = modelSqlDraft.value;
  const m = modelDraft.value;
  if (!d || !m) return;
  const raw = sanitizeColumnName(el.value);
  if (!raw) {
    window.alert('子表 id 不能为空。');
    el.value = m.id;
    return;
  }
  if (d.tables.some((t, j) => t.id === raw && j !== activeTableIndex.value)) {
    window.alert('子表 id 与同组其它表冲突。');
    el.value = m.id;
    return;
  }
  m.id = raw;
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
  const isIdCol = nextName === 'id';
  m.columns = m.columns.map((c, i) => {
    if (i !== ci) return c;
    if (isIdCol) return { ...c, name: 'id', primaryKey: true, nullable: undefined };
    return { ...c, name: nextName };
  });
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
  if (nullable && col.name === 'id' && col.primaryKey === true) {
    window.alert('列「id」作为主键时不可设为可空。');
    return;
  }
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
  m.columns = m.columns.map((c, i) => {
    if (i !== ci) return c;
    const next: MvModelColumnDef = { ...c };
    if (pk) {
      next.primaryKey = true;
      if (next.name === 'id') delete next.nullable;
    } else {
      delete next.primaryKey;
    }
    return next;
  });
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
  const pks = pkColumnsOf(m);
  if (pks.length > 0) {
    const hasIdPk = pks.some((c) => c.name === 'id');
    const k0 = pkTupleKeyFromRow(row, pks);
    const dupTuple = m.rows.some((r) => pkTupleKeyFromRow(r, pks) === k0);
    /** 首行也会得到非可空列的初始空串；空 id 不应作为主键值保留 */
    const emptyIdPk = hasIdPk && cellStr(row, 'id') === '';
    if (dupTuple || emptyIdPk) {
      const bump = pks.find((c) => c.name === 'id') ?? pks[0]!;
      row[bump.name] = nextUniqueScalarForColumnExcluding(m, bump.name, -1);
    }
  }
  m.rows = [...m.rows, row];
}

function duplicateModelRow(originalIndex: number) {
  const m = modelDraft.value;
  if (!m || originalIndex < 0 || originalIndex >= m.rows.length) return;
  const copy = { ...m.rows[originalIndex] };
  const insertAt = originalIndex + 1;
  m.rows = [...m.rows.slice(0, insertAt), copy, ...m.rows.slice(insertAt)];
  dedupePkOnRow(m, insertAt);
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

/** 保存前：主键列 id 不允许长期为空串（与新增行逻辑一致，并修复历史数据） */
function normalizeEmptyPkIdsForTable(tbl: MvModelSqlTable) {
  const idPk = tbl.columns.find((c) => c.name === 'id' && c.primaryKey === true);
  if (!idPk) return;
  for (let ri = 0; ri < tbl.rows.length; ri++) {
    const row = tbl.rows[ri]!;
    if (cellStr(row, 'id') !== '') continue;
    row.id = nextUniqueScalarForColumnExcluding(tbl, 'id', ri);
  }
}

function normalizeModelRowsForSave() {
  const d = modelSqlDraft.value;
  if (!d) return;
  for (const tbl of d.tables) {
    for (const row of tbl.rows) {
      for (const c of tbl.columns) {
        if (!(c.name in row) && c.nullable !== true) {
          row[c.name] = initialCellValueForColumn(c);
        }
      }
    }
    normalizeEmptyPkIdsForTable(tbl);
  }
}

function cellStr(row: Record<string, unknown>, col: string): string {
  const v = row[col];
  if (v === null || v === undefined) return '';
  return String(v);
}

function pkColumnsOf(m: MvModelSqlTable): MvModelColumnDef[] {
  return m.columns.filter((c) => c.primaryKey === true);
}

function pkTupleKeyFromRow(row: Record<string, unknown>, pks: MvModelColumnDef[]): string {
  return pks
    .map((c) => {
      if (!Object.prototype.hasOwnProperty.call(row, c.name)) return '__missing__';
      return JSON.stringify(row[c.name]);
    })
    .join('\u0001');
}

function nextUniqueScalarForColumnExcluding(m: MvModelSqlTable, colName: string, excludeRowIndex: number): string {
  const used = new Set<string>();
  for (let i = 0; i < m.rows.length; i++) {
    if (i === excludeRowIndex) continue;
    used.add(cellStr(m.rows[i]!, colName));
  }
  let n = 1;
  while (used.has(String(n))) n++;
  return String(n);
}

function dedupePkOnRow(m: MvModelSqlTable, rowIndex: number) {
  const pks = pkColumnsOf(m);
  if (pks.length === 0) return;
  const row = m.rows[rowIndex];
  if (!row) return;
  let guard = 0;
  while (
    m.rows.some((r, i) => i !== rowIndex && pkTupleKeyFromRow(r, pks) === pkTupleKeyFromRow(row, pks)) &&
    guard < 9999
  ) {
    const bump = pks.find((c) => c.name === 'id') ?? pks[0]!;
    row[bump.name] = nextUniqueScalarForColumnExcluding(m, bump.name, rowIndex);
    guard++;
  }
}

function setCell(row: Record<string, unknown>, col: string, s: string) {
  const m = modelDraft.value;
  const colDef = m?.columns.find((c) => c.name === col);
  const nullable = colDef?.nullable === true;
  const t = s.trim();
  let nextVal: unknown;
  if (t === '') {
    nextVal = nullable ? undefined : '';
  } else if (t === 'true') nextVal = true;
  else if (t === 'false') nextVal = false;
  else if (!Number.isNaN(Number(t)) && String(Number(t)) === t) nextVal = Number(t);
  else nextVal = s;

  if (m) {
    const pks = pkColumnsOf(m);
    if (pks.some((c) => c.name === col)) {
      const ri = m.rows.indexOf(row);
      if (ri >= 0) {
        const trial = { ...row };
        if (nextVal === undefined) delete trial[col];
        else trial[col] = nextVal;
        const testKey = pkTupleKeyFromRow(trial, pks);
        if (m.rows.some((r, i) => i !== ri && pkTupleKeyFromRow(r, pks) === testKey)) {
          window.alert(
            `主键不可重复：在 PK 列（${pks.map((c) => c.name).join(', ')}）上与其它行取值相同。`,
          );
          return;
        }
      }
    }
  }

  if (nextVal === undefined) delete row[col];
  else row[col] = nextVal;
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
  if (b.kind === 'mv-model-sql' && modelSqlDraft.value) {
    normalizeModelRowsForSave();
    const inner = JSON.stringify(modelSqlDraft.value, null, 2);
    return fenceInnerParsesOk('mv-model-sql', inner) ? inner : null;
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
  if (b.kind === 'mv-model-codespace' && codespaceDraft.value) {
    const inner = JSON.stringify(codespaceDraft.value, null, 2);
    return fenceInnerParsesOk('mv-model-codespace', inner) ? inner : null;
  }
  if (b.kind === 'mv-model-interface') {
    try {
      const parsed = JSON.parse(interfaceJsonText.value) as Record<string, unknown>;
      const inner = JSON.stringify(parsed, null, 2);
      return fenceInnerParsesOk('mv-model-interface', inner) ? inner : null;
    } catch {
      return null;
    }
  }
  if (b.kind === 'mv-view' && viewDraft.value) {
    const v = { ...viewDraft.value };
    if (!Array.isArray(v.modelRefs)) v.modelRefs = [];
    // Mermaid view must store source in a dedicated ```mermaid``` block.
    if (isMermaidViewKind(v.kind)) v.payload = '';
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

function upsertTrailingMermaidMirror(source: string, viewBlockId: string, body: string): string {
  const r = parseMarkdownBlocks(source);
  const b = r.blocks.find((x) => x.payload.id === viewBlockId && x.kind === 'mv-view');
  if (!b) return source;
  const mermaidBody = (body ?? '').replace(/\r\n/g, '\n').trimEnd();
  if (b.mermaidMirror) {
    return (
      source.slice(0, b.mermaidMirror.innerStartOffset) +
      (mermaidBody ? `${mermaidBody}\n` : '') +
      source.slice(b.mermaidMirror.innerEndOffset)
    );
  }
  const fence = `\n\`\`\`mermaid\n${mermaidBody ? `${mermaidBody}\n` : ''}\`\`\`\n`;
  return source.slice(0, b.endOffset) + fence + source.slice(b.endOffset);
}

function originalInnerJsonForCurrentBlock(): string | null {
  const b = block.value;
  if (!b) return null;
  return JSON.stringify(b.payload, null, 2);
}

/** 当前编辑态的“宽松”JSON 文本：即使未通过保存校验，也用于判断是否有改动。 */
function currentDraftInnerLoose(): string | null {
  const b = block.value;
  if (!b) return null;
  if (b.kind === 'mv-model-sql' && modelSqlDraft.value) return JSON.stringify(modelSqlDraft.value, null, 2);
  if (b.kind === 'mv-model-kv' && kvDraft.value) return JSON.stringify(kvDraft.value, null, 2);
  if (b.kind === 'mv-model-struct') return structJsonText.value.trim();
  if (b.kind === 'mv-model-codespace' && codespaceDraft.value) return JSON.stringify(codespaceDraft.value, null, 2);
  if (b.kind === 'mv-model-interface') return interfaceJsonText.value.trim();
  if (b.kind === 'mv-view' && viewDraft.value) return JSON.stringify(viewDraft.value, null, 2);
  if (b.kind === 'mv-map') return mapJsonText.value.trim();
  return null;
}

const hasCanvasUnsavedChanges = computed(() => {
  const b = block.value;
  if (!b) return false;
  const orig = originalInnerJsonForCurrentBlock();
  const cur = currentDraftInnerLoose();
  const mainDirty = (orig ?? '').trim() !== (cur ?? '').trim();
  if (!mainDirty && b.kind !== 'mv-view') return false;

  // mv-view 里还可能带同文件 codespace 侧车改动：也应触发“保存”变色。
  let sideDirty = false;
  if (b.kind === 'mv-view' && mermaidCodespaceSideBlockId.value && mermaidCodespaceSidePayload.value) {
    const sideBlockId = mermaidCodespaceSideBlockId.value;
    const sideInnerNow = JSON.stringify(mermaidCodespaceSidePayload.value, null, 2).trim();
    const { blocks } = parseMarkdownBlocks(props.markdown);
    const sideBlock = blocks.find((x) => x.payload.id === sideBlockId);
    const sideInnerOrig = sideBlock ? JSON.stringify(sideBlock.payload, null, 2).trim() : '';
    sideDirty = sideInnerNow !== sideInnerOrig;
  }
  return mainDirty || sideDirty;
});

watch(
  hasCanvasUnsavedChanges,
  (v) => emit('dirtyChange', v),
  { immediate: true },
);

watch(
  [() => viewDraft.value?.payload, () => mermaidCodespaceSidePayload.value],
  () => {
    syncAssocTypeFromDiagramToCodespace();
  },
  { deep: true },
);

function save() {
  const inner = buildInnerJson();
  if (!inner) {
    const k = block.value?.kind;
    if (
      k === 'mv-model-sql' ||
      k === 'mv-model-kv' ||
      k === 'mv-model-struct' ||
      k === 'mv-model-codespace' ||
      k === 'mv-model-interface'
    ) {
      window.alert(
        '无法保存：JSON 无效或不符合当前围栏契约（mv-model-sql：非空 tables、行须满足列声明、**主键列组合在表内唯一**；KV 每条须为 JSON 对象；结构化层次须含合法 root；代码空间须含非空 modules、全局 id 唯一、bases/associations 端点须指向已声明的 classes[].id；接口模型须含非空 endpoints 且端点 id 唯一）。',
      );
    }
    return;
  }
  let base = props.markdown;
  if (
    block.value?.kind === 'mv-view' &&
    mermaidCodespaceSideBlockId.value &&
    mermaidCodespaceSidePayload.value &&
    mermaidCodespaceSideBlockId.value !== props.blockId
  ) {
    const csInner = JSON.stringify(mermaidCodespaceSidePayload.value, null, 2);
    const r0 = replaceBlockInnerById(base, mermaidCodespaceSideBlockId.value, csInner);
    if (r0) base = r0;
  }
  let next = replaceBlockInnerById(base, props.blockId, inner);
  if (!next) return;
  if (block.value?.kind === 'mv-view' && viewDraft.value && isMermaidViewKind(viewDraft.value.kind)) {
    next = upsertTrailingMermaidMirror(next, props.blockId, viewDraft.value.payload ?? '');
  }
  mermaidCodespaceSideBlockId.value = null;
  mermaidCodespaceSidePayload.value = null;
  mermaidCodespaceFloatOpen.value = false;
  emit('saved', { markdown: next, relPath: props.relPath });
}

function closeWin() {
  emit('close');
}

function setCodespaceDraft(v: MvModelCodespacePayload) {
  codespaceDraft.value = v;
}

function patchMermaidCodespaceSide(fn: (d: MvModelCodespacePayload) => void) {
  const p = mermaidCodespaceSidePayload.value;
  if (!p) return;
  fn(p);
}

function onMermaidOpenClassifier(ev: { classDiagramClassId: string; className: string }) {
  const vd = viewDraft.value;
  if (!vd) return;
  const hit = findCodespaceClassifierForMermaidClass(
    mermaidClassSourceMarkdown.value,
    vd.modelRefs,
    ev.classDiagramClassId,
    ev.className,
  );
  if (!hit) {
    window.alert(
      locale.value === 'en'
        ? 'No matching class in a same-file mv-model-codespace listed in modelRefs (ref: cross-file not supported here yet).'
        : '未在同文件 modelRefs 所绑定的 mv-model-codespace 中找到该类（暂不支持 ref: 跨文件打开浮窗）。',
    );
    return;
  }
  mermaidCodespaceSideBlockId.value = hit.codespaceBlockId;
  mermaidCodespaceSidePayload.value = hit.payload;
  mermaidCodespaceFloat.value = { mi: hit.mi, path: hit.path, ci: hit.ci };
  mermaidCodespaceFloatOpen.value = true;
}

function closeMermaidCodespaceFloat() {
  mermaidCodespaceFloatOpen.value = false;
}

function onMermaidCreateMissingClassifier(ev: { classId: string; className: string }) {
  const vd = viewDraft.value;
  if (!vd) return;

  if (!mermaidCodespaceSidePayload.value || !mermaidCodespaceSideBlockId.value) {
    const first = getFirstCodespaceRefForMermaidClass(mermaidClassSourceMarkdown.value, vd.modelRefs ?? []);
    if (!first) {
      window.alert(
        locale.value === 'en'
          ? 'No same-file mv-model-codespace found in modelRefs; cannot sync new class to model.'
          : 'modelRefs 未绑定同文件 mv-model-codespace，无法把新 class 同步到 model。',
      );
      return;
    }
    mermaidCodespaceSideBlockId.value = first.codespaceBlockId;
    mermaidCodespaceSidePayload.value = first.payload;
  }

  const payload = mermaidCodespaceSidePayload.value;
  if (!payload) return;

  if (!payload.modules || payload.modules.length === 0) {
    payload.modules = [{ id: 'core', name: 'Core', namespaces: [] }];
  }
  const m0 = payload.modules[0]!;
  if (!m0.namespaces || m0.namespaces.length === 0) {
    m0.namespaces = [{ id: 'ns_root', name: 'Root', classes: [] }];
  }
  const ns0 = m0.namespaces[0]!;
  if (!ns0.classes) ns0.classes = [];

  const exists = ns0.classes.some((c) => c.id === ev.classId || c.name === ev.className);
  if (exists) return;
  ns0.classes.push({
    id: ev.classId,
    name: ev.className,
    kind: 'class',
    member: [],
    method: [],
  });
}
</script>

<template>
  <div class="canvas-root" :class="{ 'canvas-root--embedded': embedded }">
    <header class="canvas-toolbar">
      <div class="canvas-title">
        <span class="canvas-badge">{{ ui.labelCanvas }}</span>
        <template v-if="block">
          <strong>{{ canvasSurfaceTitle }}</strong>
          <span class="canvas-sep">·</span>
          <code>{{ block.kind }}</code>
          <span class="canvas-sep">·</span>
          <code>{{ block.payload.id }}</code>
        </template>
        <span v-else class="canvas-err">{{ ui.blockCanvasNotFound }}</span>
      </div>
      <div class="canvas-actions">
        <button
          type="button"
          class="tb"
          :title="embedded ? ui.closeCanvasTabTitle : ui.blockCanvasClosePopupTitle"
          @click="closeWin"
        >
          {{ ui.tbClose }}
        </button>
        <button
          type="button"
          :class="['tb', 'primary', { 'tb-dirty': hasCanvasUnsavedChanges }]"
          :disabled="!block"
          :title="ui.blockCanvasSaveTitle"
          @click="save"
        >
          {{ locale === 'en' ? 'Update' : '更新' }}
        </button>
      </div>
    </header>

    <main v-if="block" class="canvas-body">
      <div class="canvas-surface" :aria-label="ui.blockCanvasBodyAria">
        <template v-if="block.kind === 'mv-model-sql' && modelSqlDraft">
          <div class="model-sql-surface">
          <p class="canvas-hint canvas-hint--compact">
            本围栏为 <strong>Model</strong>（<code>mv-model-sql</code>）：一个代码块内可含<strong>多张</strong>子表；<code>mv-view</code> 为
            <strong>View</strong>，通过 <code>modelRefs</code> 绑定 <code>块id#子表id</code>（见下方属性区说明）。子表用标签切换；可对子表做增删。
          </p>
          <h3 class="model-section-title">Model 组 · 元数据</h3>
          <div class="model-meta-grid model-meta-grid--sql">
            <label class="field field--inline">
              <span class="sql-meta-label">MODEL id</span>
              <input class="wide sql-mono-inp" type="text" :value="modelSqlDraft.id" readonly title="围栏块 id，与 mv-view 的 modelRefs 第一段对齐 — 无全局快捷键" />
            </label>
            <label class="field field--inline">
              <span class="sql-meta-label">组 COMMENT（title）</span>
              <input v-model="modelSqlDraft.title" class="wide sql-mono-inp" type="text" placeholder="可选" />
            </label>
          </div>
          <div class="model-subtable-shell">
            <div class="model-subtable-tabbar" role="tablist" aria-label="子表（标签切换）">
              <div
                v-for="(tb, ti) in modelSqlDraft.tables"
                :key="tb.id"
                role="tab"
                :id="'sql-subtab-' + ti"
                :aria-selected="ti === activeTableIndex"
                :tabindex="ti === activeTableIndex ? 0 : -1"
                aria-controls="sql-tabpanel-subtable"
                class="model-subtable-tab"
                :class="{ 'model-subtable-tab--active': ti === activeTableIndex }"
                :title="`子表 ${tb.id}；点击标签切换，× 删除（须确认）— 无全局快捷键`"
                @click="onSubtableTabStripClick(ti, $event)"
                @keydown.enter.prevent="selectSqlTable(ti)"
                @keydown.space.prevent="selectSqlTable(ti)"
              >
                <span class="model-subtable-tab-label">{{ tb.id }}</span>
                <button
                  v-if="modelSqlDraft.tables.length > 1"
                  type="button"
                  class="model-subtable-tab-close"
                  title="删除此子表（弹出确认）— 无全局快捷键"
                  :aria-label="`删除子表 ${tb.id}`"
                  @click.stop="openSubtableDeleteDialog(ti)"
                >
                  ×
                </button>
              </div>
              <span class="model-subtable-tabspacer" aria-hidden="true"></span>
              <button
                type="button"
                class="model-subtable-tab model-subtable-tab--action model-subtable-tab--add"
                title="新增一张子表 — 无全局快捷键"
                @click="addModelSqlTable"
              >
                ＋ 子表
              </button>
            </div>
            <div
              v-if="modelDraft"
              id="sql-tabpanel-subtable"
              class="model-subtable-panel"
              role="tabpanel"
              :aria-labelledby="'sql-subtab-' + activeTableIndex"
            >
          <section
            class="model-fold-section"
            :class="{ 'model-fold-section--collapsed': !sqlDdlSectionOpen }"
            aria-label="DDL 当前子表列定义"
          >
            <h3 class="model-fold-heading">
              <button
                type="button"
                class="model-fold-head"
                :aria-expanded="sqlDdlSectionOpen"
                aria-controls="sql-ddl-fold-panel"
                id="sql-ddl-fold-trigger"
                :title="(sqlDdlSectionOpen ? '折叠' : '展开') + ' DDL · 当前子表列定义 — 无全局快捷键'"
                @click="sqlDdlSectionOpen = !sqlDdlSectionOpen"
              >
                <span class="model-fold-chevron" aria-hidden="true">{{ sqlDdlSectionOpen ? '▼' : '▶' }}</span>
                <span class="model-fold-title">DDL · 当前子表列定义</span>
              </button>
            </h3>
            <div
              v-show="sqlDdlSectionOpen"
              id="sql-ddl-fold-panel"
              class="model-fold-body"
              role="region"
              aria-labelledby="sql-ddl-fold-trigger"
            >
          <p class="canvas-hint canvas-hint--compact">
            以 <strong>SQL 表设计</strong> 语义呈现：<code>COLUMN</code> / 逻辑类型映射为示意 <code>TYPE</code>、<code>NULL</code> /
            <code>NOT NULL</code>、<code>PRIMARY KEY</code>（多列即联合）、<code>UNIQUE</code>、<code>DEFAULT</code>、列级
            <code>-- comment</code>。下方 <code>CREATE TABLE</code> 为<strong>只读示意</strong>（对应当前子表）；落盘为 <code>mv-model-sql</code> JSON。默认值输入仍按
            JSON 字面量解析。子表 <code>id</code> 可编辑（失焦校验唯一）。
          </p>
          <div class="model-meta-grid model-meta-grid--sql">
            <label class="field field--inline">
              <span class="sql-meta-label">TABLE id</span>
              <input
                class="wide sql-mono-inp"
                type="text"
                :value="modelDraft.id"
                title="子表 id；须在同组内唯一 — 无全局快捷键"
                @blur="onSqlTableIdBlur($event)"
              />
            </label>
            <label class="field field--inline">
              <span class="sql-meta-label">子表 COMMENT（title）</span>
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
            </div>
          </section>

          <section
            class="model-fold-section"
            :class="{ 'model-fold-section--collapsed': !sqlDmlSectionOpen }"
            aria-label="DML 行集 JSON 单元格"
          >
            <h3 class="model-fold-heading">
              <button
                type="button"
                class="model-fold-head"
                :aria-expanded="sqlDmlSectionOpen"
                aria-controls="sql-dml-fold-panel"
                id="sql-dml-fold-trigger"
                :title="(sqlDmlSectionOpen ? '折叠' : '展开') + ' DML · 行集（JSON 单元格） — 无全局快捷键'"
                @click="sqlDmlSectionOpen = !sqlDmlSectionOpen"
              >
                <span class="model-fold-chevron" aria-hidden="true">{{ sqlDmlSectionOpen ? '▼' : '▶' }}</span>
                <span class="model-fold-title">DML · 行集（JSON 单元格）</span>
              </button>
            </h3>
            <div
              v-show="sqlDmlSectionOpen"
              id="sql-dml-fold-panel"
              class="model-fold-body"
              role="region"
              aria-labelledby="sql-dml-fold-trigger"
            >
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
            <button
              type="button"
              class="tb model-readonly-toggle"
              :title="
                showModelReadonlyPreview
                  ? '隐藏下方只读平铺表（当前子表，与 DML 筛选一致）— 无全局快捷键'
                  : '在画布内只读展示当前子表行（与上方 DML 同一 WHERE 筛选）— 无全局快捷键'
              "
              @click="showModelReadonlyPreview = !showModelReadonlyPreview"
            >
              {{ showModelReadonlyPreview ? '隐藏只读视图' : '显示只读视图' }}
            </button>
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
            </div>
          </section>
            </div>
          </div>

          <section
            v-if="showModelReadonlyPreview && modelDraft"
            class="model-readonly-preview"
            aria-label="当前子表只读平铺预览"
          >
            <h3 class="model-section-title model-section-title--readonly">SELECT * 风格 · 只读（当前子表）</h3>
            <p class="canvas-hint canvas-hint--compact">
              与上方 DML 为同一子表 <code>{{ modelDraft.id }}</code>；行集与 <strong>WHERE 子串</strong> 筛选一致（仅展示
              {{ filteredModelRowEntries.length }} / {{ modelDraft.rows.length }} 行）。只读单元格，与只读表预览一致；未保存修改即时反映；落盘为
              <code>mv-model-sql</code> JSON。
            </p>
            <div class="model-readonly-one-table">
              <div class="canvas-table-wrap canvas-table-wrap--readonly">
                <table class="canvas-table canvas-table--sql-rows">
                  <thead>
                    <tr>
                      <th v-for="c in modelDraft.columns" :key="'ro-h-' + modelDraft.id + '-' + c.name">{{ c.name }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="{ row, index: ri } in filteredModelRowEntries" :key="'ro-r-' + modelDraft.id + '-' + ri">
                      <td v-for="c in modelDraft.columns" :key="c.name">{{ cellStr(row, c.name) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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

        <template v-else-if="block.kind === 'mv-model-codespace' && codespaceDraft">
          <CodespaceCanvasEditor
            :model-value="codespaceDraft"
            :compact-layout="embedded"
            @update:model-value="setCodespaceDraft"
            @codespace-dock-context="(c) => emit('codespaceDockContext', c)"
          />
        </template>

        <template v-else-if="block.kind === 'mv-model-interface'">
          <h3 class="model-section-title">接口图模型画布 · 端点列表示意</h3>
          <p class="canvas-hint canvas-hint--compact">
            <strong>接口图（文档化）</strong>：非空 <code>endpoints[]</code>；每条须含非空 <code>id</code>、<code>name</code>，可选
            <code>method</code> / <code>path</code> / <code>notes</code>（均为字符串）。端点 <code>id</code> 在块内须唯一。不等同于 OpenAPI
            等正式契约，仅供示意与对齐讨论。
          </p>
          <textarea v-model="interfaceJsonText" class="payload-ta" spellcheck="false" rows="22" aria-label="mv-model-interface JSON" />
        </template>

        <template v-else-if="block.kind === 'mv-view' && viewDraft">
          <div
            class="mv-view-shell"
            :class="{ 'mv-view-shell--class-canvas': viewDraft.kind === 'mermaid-class' && mermaidPayloadMode === 'canvas' }"
          >
          <template v-if="viewDraft.kind === 'mermaid-class'">
            <div class="mv-class-payload-head" role="tablist">
              <button
                type="button"
                class="mv-class-tab"
                :class="{ 'mv-class-tab--active': mermaidPayloadMode === 'meta' }"
                role="tab"
                id="mv-class-tab-meta"
                :aria-selected="mermaidPayloadMode === 'meta'"
                :tabindex="mermaidPayloadMode === 'meta' ? 0 : -1"
                aria-controls="mv-class-panel-meta"
                @click="mermaidPayloadMode = 'meta'"
              >
                {{ classTabMetaLabel }}
              </button>
              <button
                type="button"
                class="mv-class-tab"
                :class="{ 'mv-class-tab--active': mermaidPayloadMode === 'canvas' }"
                role="tab"
                id="mv-class-tab-canvas"
                :aria-selected="mermaidPayloadMode === 'canvas'"
                :tabindex="mermaidPayloadMode === 'canvas' ? 0 : -1"
                aria-controls="mv-class-panel-canvas"
                @click="mermaidPayloadMode = 'canvas'"
              >
                {{ classTabCanvasLabel }}
              </button>
              <button
                type="button"
                class="mv-class-tab"
                :class="{ 'mv-class-tab--active': mermaidPayloadMode === 'source' }"
                role="tab"
                id="mv-class-tab-source"
                :aria-selected="mermaidPayloadMode === 'source'"
                :tabindex="mermaidPayloadMode === 'source' ? 0 : -1"
                aria-controls="mv-class-panel-source"
                @click="mermaidPayloadMode = 'source'"
              >
                {{ classTabSourceLabel }}
              </button>
            </div>
            <div
              v-show="mermaidPayloadMode === 'meta'"
              id="mv-class-panel-meta"
              class="mv-class-panel-meta"
              role="tabpanel"
              aria-labelledby="mv-class-tab-meta"
            >
              <label class="field">
                <span>标题 title</span>
                <input v-model="viewDraft.title" type="text" class="wide" />
              </label>
              <div class="mv-model-refs-picker">
                <label class="field">
                  <span>{{ ui.modelRefsPickerPathLabel }}</span>
                  <div class="mv-model-refs-path-row">
                    <input
                      v-model="modelRefsRelPathInput"
                      type="text"
                      class="wide"
                      spellcheck="false"
                      :placeholder="ui.modelRefsPickerPathPlaceholder"
                    />
                    <button type="button" class="tb mv-mini-btn" @click="openModelRefsPathPrompt">打开文件</button>
                    <button type="button" class="tb mv-mini-btn" @click="clearModelRefsPathInput">清空</button>
                  </div>
                </label>
                <p v-if="modelRefsTargetMissing" class="canvas-hint canvas-hint--warn">
                  {{ ui.modelRefsPickerFileMissing }}
                </p>
                <p v-else class="canvas-hint canvas-hint--compact">勾选要绑定的模型（单选）；未列出的引用见下方高级区。</p>
                <div v-if="!modelRefsTargetMissing && modelRefsCandidates.length" class="mv-model-refs-cb-list" role="group">
                  <label v-for="c in modelRefsCandidates" :key="c.value" class="mv-model-refs-cb">
                    <input
                      type="radio"
                      name="model-refs-single"
                      :checked="isModelRefCandidateChecked(c)"
                      @change="toggleModelRefCandidate(c)"
                    />
                    <span>{{ c.label }}</span>
                  </label>
                </div>
                <p v-else-if="!modelRefsTargetMissing" class="canvas-hint canvas-hint--compact">（{{ ui.dockViewModelRefsNone }}）</p>
                <p v-if="modelRefsOrphanRefs.length" class="canvas-hint canvas-hint--compact">
                  其它已保存引用（未出现在上表）：
                  <code v-for="(o, i) in modelRefsOrphanRefs" :key="'orph-' + i" class="mv-model-refs-orph">{{ o }}</code>
                </p>
              </div>
            </div>
            <div
              v-show="mermaidPayloadMode === 'canvas'"
              id="mv-class-panel-canvas"
              class="mv-class-canvas-wrap"
              role="tabpanel"
              aria-labelledby="mv-class-tab-canvas"
            >
              <MermaidClassDiagramCanvas
                :model-value="viewDraft.payload ?? ''"
                :canvas-id="blockId"
                :codespace-classes="mermaidCodespaceClassTree"
                :model-source-valid="mermaidClassHasValidModelSource"
                :model-source-error="mermaidClassModelSourceError"
                @update:model-value="(v: string) => viewDraft && (viewDraft.payload = v)"
                @open-classifier="onMermaidOpenClassifier"
                @create-missing-classifier="onMermaidCreateMissingClassifier"
              />
            </div>
            <label
              v-show="mermaidPayloadMode === 'source'"
              id="mv-class-panel-source"
              class="field"
              role="tabpanel"
              aria-labelledby="mv-class-tab-source"
            >
              <span>payload（Mermaid classDiagram）</span>
              <textarea
                v-model="viewDraft.payload"
                class="payload-ta"
                spellcheck="false"
                rows="16"
                :placeholder="viewPayloadPlaceholder"
              />
            </label>
          </template>
          <template v-else>
            <label class="field">
              <span>标题 title</span>
              <input v-model="viewDraft.title" type="text" class="wide" />
            </label>
            <div class="mv-model-refs-picker">
              <label class="field">
                <span>{{ ui.modelRefsPickerPathLabel }}</span>
                <div class="mv-model-refs-path-row">
                  <input
                    v-model="modelRefsRelPathInput"
                    type="text"
                    class="wide"
                    spellcheck="false"
                    :placeholder="ui.modelRefsPickerPathPlaceholder"
                  />
                  <button type="button" class="tb mv-mini-btn" @click="openModelRefsPathPrompt">打开文件</button>
                  <button type="button" class="tb mv-mini-btn" @click="clearModelRefsPathInput">清空</button>
                </div>
              </label>
              <p v-if="modelRefsTargetMissing" class="canvas-hint canvas-hint--warn">
                {{ ui.modelRefsPickerFileMissing }}
              </p>
              <p v-else class="canvas-hint canvas-hint--compact">勾选要绑定的模型（单选）；未列出的引用见下方高级区。</p>
              <div v-if="!modelRefsTargetMissing && modelRefsCandidates.length" class="mv-model-refs-cb-list" role="group">
                <label v-for="c in modelRefsCandidates" :key="c.value" class="mv-model-refs-cb">
                  <input
                    type="radio"
                    name="model-refs-single"
                    :checked="isModelRefCandidateChecked(c)"
                    @change="toggleModelRefCandidate(c)"
                  />
                  <span>{{ c.label }}</span>
                </label>
              </div>
              <p v-else-if="!modelRefsTargetMissing" class="canvas-hint canvas-hint--compact">（{{ ui.dockViewModelRefsNone }}）</p>
              <p v-if="modelRefsOrphanRefs.length" class="canvas-hint canvas-hint--compact">
                其它已保存引用（未出现在上表）：
                <code v-for="(o, i) in modelRefsOrphanRefs" :key="'orph-' + i" class="mv-model-refs-orph">{{ o }}</code>
              </p>
            </div>
          </template>
          <label v-if="viewDraft.kind !== 'mermaid-class'" class="field">
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
              rows="16"
              :placeholder="viewPayloadPlaceholder"
            />
          </label>
          <CodespaceClassifierFloat
            v-if="mermaidCodespaceSidePayload && mermaidCodespaceFloat"
            :open="mermaidCodespaceFloatOpen"
            :model-value="mermaidCodespaceSidePayload"
            :mi="mermaidCodespaceFloat.mi"
            :path="mermaidCodespaceFloat.path"
            :ci="mermaidCodespaceFloat.ci"
            :diagram-assoc-targets-by-class-id="mermaidAssocTargetsByClassId"
            :run-patch="patchMermaidCodespaceSide"
            @close="closeMermaidCodespaceFloat"
          />
          </div>
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

    <Teleport to="body">
      <div
        v-if="subtableDeleteOpen && modelSqlDraft"
        class="msc-del-back"
        role="presentation"
        tabindex="0"
        @click.self="cancelSubtableDelete"
      >
        <div
          class="msc-del-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="msc-del-title"
          aria-describedby="msc-del-desc"
          tabindex="-1"
          @keydown.esc.stop="cancelSubtableDelete"
        >
          <h2 id="msc-del-title" class="msc-del-title">删除子表</h2>
          <p id="msc-del-desc" class="msc-del-desc">
            <strong>【警告】</strong>即将删除子表「<code>{{ subtableDeleteTargetId }}</code>」。
          </p>
          <ul class="msc-del-list">
            <li>该子表上的列定义与全部行数据将从当前编辑内容中移除。</li>
            <li>其它块中引用「块 id#{{ subtableDeleteTargetId }}」的 modelRefs 在保存后可能失效，需自行修正。</li>
            <li>此步在本会话内不可撤销（未保存前可关闭画布放弃全部修改）。</li>
          </ul>
          <div class="msc-del-actions">
            <button type="button" class="msc-del-btn" title="放弃删除 — 无全局快捷键" @click="cancelSubtableDelete">取消</button>
            <button
              type="button"
              class="msc-del-btn msc-del-btn--danger"
              title="确认删除该子表 — 无全局快捷键"
              @click="confirmSubtableDelete"
            >
              确定删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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
.tb.primary.tb-dirty:not(:disabled) {
  background: #ea580c;
  border-color: #c2410c;
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
.canvas-root--embedded .canvas-toolbar {
  padding: 5px 8px;
  gap: 8px;
}
.canvas-root--embedded .canvas-title {
  font-size: 0.82rem;
}
.canvas-root--embedded .canvas-body {
  padding: 4px 5px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.canvas-root--embedded .canvas-surface {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 5px 6px 6px;
  border-radius: 4px;
  box-shadow: none;
  background-size: 14px 14px;
}
/** 代码空间等单根子组件：撑满 surface 高度，便于内部 SVG 区 flex 吃满 */
.canvas-root--embedded .canvas-surface :deep(.cs-editor) {
  flex: 1 1 auto;
  min-height: 0;
}
.canvas-root--embedded .canvas-surface :deep(.cde) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.canvas-root--embedded .canvas-surface :deep(.cde-viewport) {
  flex: 1 1 auto;
  min-height: 0;
}
.canvas-root--embedded .tb {
  padding: 4px 10px;
  font-size: 0.8rem;
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
.mv-model-refs-picker {
  margin-bottom: 10px;
}
.mv-model-refs-path-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mv-model-refs-path-row .wide {
  flex: 1 1 auto;
}
.mv-mini-btn {
  flex: 0 0 auto;
  padding: 5px 10px;
}
.mv-model-refs-cb-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
  padding: 6px 0;
}
.mv-model-refs-cb {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.82rem;
  cursor: pointer;
}
.mv-class-payload-head {
  display: flex;
  gap: 6px;
  margin: 8px 0 6px;
}
.mv-class-tab {
  padding: 4px 12px;
  font-size: 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.mv-class-tab--active {
  border-color: #2563eb;
  background: #eff6ff;
  font-weight: 600;
}
.mv-class-canvas-wrap {
  min-height: 280px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}
.canvas-root--embedded .mv-class-canvas-wrap {
  min-height: 200px;
}
.mv-view-shell {
  display: flex;
  flex-direction: column;
}
.canvas-root--embedded .mv-view-shell--class-canvas {
  flex: 1 1 auto;
  min-height: 0;
}
.canvas-root--embedded .mv-view-shell--class-canvas .mv-class-canvas-wrap {
  flex: 1 1 auto;
  min-height: 0;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}
.canvas-root--embedded .mv-view-shell--class-canvas .mv-class-canvas-wrap :deep(.cde) {
  flex: 1 1 auto;
  min-height: 0;
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
.model-subtable-shell {
  max-width: 960px;
  margin: 12px 0 16px;
}
.model-subtable-tabbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0;
  padding: 0 4px 0 6px;
  min-height: 40px;
  background: linear-gradient(180deg, #eef2f7 0%, #dce3ec 100%);
  border-radius: 8px 8px 0 0;
  border: 1px solid #64748b;
  border-bottom: 2px solid #475569;
}
.model-subtable-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 6px 0 0 3px;
  padding: 6px 6px 6px 12px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  color: #334155;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 7px 7px 0 0;
  background: #cbd5e1;
  cursor: default;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.35);
  transition:
    background 0.12s,
    color 0.12s;
  user-select: none;
  outline: none;
}
.model-subtable-tab:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  z-index: 3;
}
.model-subtable-tab-label {
  cursor: pointer;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 0;
}
.model-subtable-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  margin: 0 0 0 2px;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  font-weight: 700;
  color: #64748b;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.model-subtable-tab-close:hover {
  color: #b91c1c;
  background: rgba(185, 28, 28, 0.12);
}
.model-subtable-tab-close:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.model-subtable-tab:hover:not(.model-subtable-tab--active) {
  background: #e2e8f0;
  color: #0f172a;
}
.model-subtable-tab--active {
  color: #0c4a6e;
  font-weight: 700;
  background: #f8fafc;
  border-color: #475569;
  border-bottom-color: #f8fafc;
  margin-bottom: -2px;
  padding-bottom: 9px;
  z-index: 2;
  box-shadow: 0 -1px 0 #f8fafc;
}
.model-subtable-tabspacer {
  flex: 1 1 12px;
  min-width: 8px;
  margin-bottom: 6px;
  pointer-events: none;
}
.model-subtable-tab--action {
  font-weight: 600;
  margin-left: 4px;
}
.model-subtable-tab--add {
  background: #e2e8f0;
  border-color: #94a3b8;
  border-style: dashed;
  color: #0f172a;
}
.model-subtable-tab--add:hover {
  background: #f1f5f9;
}
.model-subtable-panel {
  border: 1px solid #64748b;
  border-top: none;
  padding: 8px 10px 12px;
  background: #f8fafc;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}
.model-subtable-panel .model-fold-section:first-of-type {
  margin-top: 8px;
}
.model-subtable-panel .model-fold-section + .model-fold-section {
  margin-top: 12px;
}
.model-readonly-one-table {
  margin-bottom: 16px;
}
.model-readonly-table-title {
  margin: 0 0 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
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
.model-fold-section {
  max-width: 960px;
  border: 1px solid #64748b;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
  overflow: hidden;
}
.model-fold-section:first-of-type {
  margin-top: 16px;
}
.model-fold-section + .model-fold-section {
  margin-top: 14px;
}
.model-fold-heading {
  margin: 0;
  font-size: 1rem;
  line-height: 1.25;
}
.model-fold-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0;
  padding: 12px 16px;
  box-sizing: border-box;
  text-align: left;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.02em;
  background: linear-gradient(180deg, #e8eef5 0%, #d2dce8 100%);
  border: none;
  cursor: pointer;
  transition:
    filter 0.12s,
    background 0.12s;
}
.model-fold-head:hover {
  filter: brightness(1.04);
}
.model-fold-head:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
  position: relative;
  z-index: 1;
}
.model-fold-section--collapsed .model-fold-head {
  border-bottom: 0;
}
.model-fold-chevron {
  display: inline-flex;
  width: 1.35em;
  justify-content: center;
  flex-shrink: 0;
  color: #334155;
  font-size: 0.7rem;
  line-height: 1;
}
.model-fold-title {
  flex: 1;
}
.model-fold-body {
  padding: 12px 14px 14px;
  border-top: 1px solid #94a3b8;
  background: #f8fafc;
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
.model-readonly-toggle {
  flex-shrink: 0;
  align-self: center;
  margin-left: auto;
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

.msc-del-back {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  outline: none;
}
.msc-del-dialog {
  width: min(440px, 100%);
  padding: 18px 20px 16px;
  border-radius: 10px;
  border: 1px solid #94a3b8;
  background: #fff;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.25);
  outline: none;
}
.msc-del-title {
  margin: 0 0 10px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #991b1b;
}
.msc-del-desc {
  margin: 0 0 10px;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #334155;
}
.msc-del-list {
  margin: 0 0 16px;
  padding-left: 1.2rem;
  font-size: 0.82rem;
  line-height: 1.5;
  color: #475569;
}
.msc-del-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.msc-del-btn {
  padding: 8px 16px;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
  cursor: pointer;
  color: #334155;
}
.msc-del-btn:hover {
  background: #f1f5f9;
}
.msc-del-btn--danger {
  border-color: #dc2626;
  background: #dc2626;
  color: #fff;
  font-weight: 600;
}
.msc-del-btn--danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}
</style>
