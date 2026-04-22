<script setup lang="ts">
import { computed, nextTick, provide, ref, watch } from 'vue';
import CodespaceCanvasEditor from './codespace/CodespaceCanvasEditor.vue';
import FormatHint from './common/FormatHint.vue';
import CodespaceClassifierFloat from './codespace/floating/CodespaceClassifierFloat.vue';
import MermaidClassDiagramCanvas from './mvview/MermaidClassDiagramCanvas.vue';
import UmlClassDiagramCanvas from './mvview/UmlClassDiagramCanvas.vue';
import MindmapCanvas from './mindmap/MindmapCanvas.vue';
import type { MindmapDockCommand, MindmapDockState } from './mindmap/MindmapCanvas.vue';
import UiDesignCanvas from './UiDesignCanvas.vue';
import type { UiDesignDockCommand, UiDesignDockState } from './UiDesignCanvas.vue';
import { normalizeUiDesignPayloadFromFence } from '../uisvg/uiDesignPayload';
import {
  MV_UML_KIND_DIAGRAM_TYPE,
  parseViewPayloadClassDiagram,
  isMermaidViewKind,
  isUmlViewKind,
  normalizeRelPath,
  parseMarkdownBlocks,
  replaceBlockInnerById,
  slug,
  type MvCodespaceAssociation,
  type MvCodespaceClassifierBase,
  type MvCodespaceNamespaceNode,
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
import {
  mergeInheritIntoClassDiagramPayload,
  parseViewPayloadClassDiagram as parseUmlClassDiagramPayload,
  stripInheritFromClassDiagramPayload,
} from '../utils/uml-class-payload';
import { useAppLocale } from '../composables/useAppLocale';
import { CS_CANVAS_MSG_KEY, codespaceCanvasMessages } from '../i18n/codespace-canvas-messages';
import { blockCanvasSurfaceTitle } from '../i18n/insert-modal-locale';
import { mvViewKindStrings } from '../i18n/mv-view-kind-locale';
import { kvModelCanvasMessagesFor } from '../i18n/kv-model-canvas-messages';
import {
  buildColumnDataHeaderTooltip,
  sqlModelCanvasMessagesFor,
} from '../i18n/sql-model-canvas-messages';
import { interfaceModelCanvasMessagesFor } from '../i18n/interface-model-canvas-messages';
import { structModelCanvasMessagesFor } from '../i18n/struct-model-canvas-messages';
import type { CodespaceDockContextPayload } from '../utils/codespace-dock-context';
import {
  findCodespaceClassifierForClassCanvas,
  getFirstCodespaceRefForClassCanvas,
  listCodespaceClassesForClassCanvas,
  resolveDiagramClassToCodespaceClassId,
  type CodespaceClassTreeItem,
} from '../utils/class-canvas-codespace-bridge';
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

const sqlUi = computed(() => sqlModelCanvasMessagesFor(locale.value));
const kvUi = computed(() => kvModelCanvasMessagesFor(locale.value));
const structUi = computed(() => structModelCanvasMessagesFor(locale.value));
const interfaceUi = computed(() => interfaceModelCanvasMessagesFor(locale.value));

const MODEL_COL_TYPES = ['string', 'int', 'float', 'boolean', 'json'] as const;

const props = withDefaults(
  defineProps<{
    markdown: string;
    relPath: string;
    blockId: string;
    /** 嵌入主窗口中间列时为 true（勿用 100vh，避免撑破布局） */
    embedded?: boolean;
    /** 工作区内其它 .md 全文，用于解析 ref: 跨文件 modelRefs（浏览器画布弹窗由主窗口注入） */
    workspaceFiles?: Record<string, string>;
    mindmapDockCommand?: MindmapDockCommand | null;
    uiDesignDockCommand?: UiDesignDockCommand | null;
  }>(),
  { embedded: false, workspaceFiles: () => ({}), mindmapDockCommand: null, uiDesignDockCommand: null },
);

const emit = defineEmits<{
  (e: 'updated', payload: { markdown: string; relPath: string }): void;
  (e: 'close'): void;
  /** 代码空间画布选中节点摘要与属性行，供主窗口属性 Dock 展示 */
  (e: 'codespaceDockContext', ctx: CodespaceDockContextPayload): void;
  /** 画布是否有未保存改动（供外层工具栏“保存”按钮高亮） */
  (e: 'dirtyChange', dirty: boolean): void;
  /** mindmap-ui 专用右侧 Dock 状态 */
  (e: 'mindmapDockState', ctx: MindmapDockState): void;
  /** ui-design：左右 dock 所需的画布状态 */
  (e: 'uiDesignDockState', ctx: UiDesignDockState): void;
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
const classCanvasPayloadMode = ref<'meta' | 'canvas' | 'source'>('canvas');
/** ui-design mv-view：绑定区与 SVG 画布分区 */
const uiDesignMvTab = ref<'refs' | 'canvas'>('canvas');
/** 类图双击 / 浮窗编辑的 codespace 侧车副本（与 modelRefs 指向块同步保存） */
const classCanvasCodespaceFloatOpen = ref(false);
const classCanvasCodespaceFloat = ref<{ mi: number; path: number[]; ci: number } | null>(null);
const classCanvasCodespaceSideBlockId = ref<string | null>(null);
const classCanvasCodespaceSidePayload = ref<MvModelCodespacePayload | null>(null);
/** 自动内存同步后，忽略同一次回流导致的本地重置 */
const lastAutoSyncedMarkdown = ref('');
/** 子表标签「×」删除：页内确认（部分壳层对 window.confirm 不可靠） */
const subtableDeleteOpen = ref(false);
const subtableDeleteIndex = ref<number | null>(null);

watch(
  block,
  (b) => {
    if (lastAutoSyncedMarkdown.value && props.markdown === lastAutoSyncedMarkdown.value) {
      lastAutoSyncedMarkdown.value = '';
      return;
    }
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
    classCanvasPayloadMode.value = 'canvas';
    classCanvasCodespaceFloatOpen.value = false;
    classCanvasCodespaceFloat.value = null;
    classCanvasCodespaceSideBlockId.value = null;
    classCanvasCodespaceSidePayload.value = null;
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
      if (
        viewDraft.value.payload !== undefined &&
        typeof viewDraft.value.payload !== 'string' &&
        (typeof viewDraft.value.payload !== 'object' || viewDraft.value.payload === null || Array.isArray(viewDraft.value.payload))
      ) {
        viewDraft.value.payload = '';
      }
      if (viewDraft.value.kind === 'uml-class' && typeof viewDraft.value.payload === 'string') {
        viewDraft.value.payload = fromViewPayloadText('uml-class', viewDraft.value.payload);
      }
      if (viewDraft.value.kind === 'ui-design') {
        viewDraft.value.payload = normalizeUiDesignPayloadFromFence(viewDraft.value.payload);
      }
      // 用户要求：路径输入框默认保持空字符串，不做 modelRefs 自动反推。
      modelRefsRelPathInput.value = '';
      tryAutoBindSingleModelRefOnViewOpen();
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
  if (b.kind === 'mv-model-sql') return blockCanvasSurfaceTitle('mv-model-sql', locale.value);
  if (b.kind === 'mv-model-kv') return blockCanvasSurfaceTitle('mv-model-kv', locale.value);
  if (b.kind === 'mv-model-struct') return blockCanvasSurfaceTitle('mv-model-struct', locale.value);
  if (b.kind === 'mv-model-codespace') return ui.value.canvasTitleMvModelCodespace;
  if (b.kind === 'mv-model-interface') return blockCanvasSurfaceTitle('mv-model-interface', locale.value);
  if (b.kind === 'mv-map') return blockCanvasSurfaceTitle('mv-map', locale.value);
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
const viewUsesCoreUmlPayloadMapping = computed(() => {
  const v = viewDraft.value;
  return !!v && typeof v.kind === 'string' && v.kind.startsWith('uml-');
});

function viewPayloadPrefersObject(kind: MvViewKind): boolean {
  return isUmlViewKind(kind) || kind === 'mindmap-ui';
}

function toViewPayloadText(payload: MvViewPayload['payload']): string {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') return JSON.stringify(payload, null, 2);
  return '';
}

function defaultUmlPayloadObject(kind: MvViewKind): Record<string, unknown> | null {
  const diagramType = MV_UML_KIND_DIAGRAM_TYPE[kind];
  if (!diagramType) return null;
  const base: Record<string, unknown> = {
    schema: 'mvwb-uml/v1',
    diagramType,
  };
  if (kind === 'uml-class') {
    base.classes = [{ id: 'new_class', name: 'NewClass', attributes: [], methods: [] }];
    base.relations = [];
    base.layout = { positions: { new_class: { x: 80, y: 80 } }, folded: {} };
    base.edgeVisibility = { inherit: true, association: true };
  }
  return base;
}

function fromViewPayloadText(kind: MvViewKind, text: string): MvViewPayload['payload'] {
  if (!viewPayloadPrefersObject(kind)) return text;
  const s = text.trim();
  if (!s) return '';
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // keep raw text while editing incomplete JSON
  }
  if (kind === 'uml-class') {
    return defaultUmlPayloadObject(kind) ?? '';
  }
  return text;
}

function setViewPayloadText(text: string): void {
  const v = viewDraft.value;
  if (!v) return;
  if (v.kind === 'uml-class' && !v.observeCodespaceOnly && classCanvasHasValidModelSource.value) {
    if (ensureClassCanvasCodespaceSidePayloadForClassSync()) {
      syncUmlInheritLinksToCodespaceBases(text);
      syncUmlAssociationEdgesToCodespaceAssociations(text);
    }
  }
  v.payload = fromViewPayloadText(v.kind, text);
}

function onMindmapDockContext(ctx: CodespaceDockContextPayload): void {
  emit('codespaceDockContext', ctx);
}
function onMindmapDockState(ctx: MindmapDockState): void {
  emit('mindmapDockState', ctx);
}
function onUiDesignDockState(ctx: UiDesignDockState): void {
  emit('uiDesignDockState', ctx);
}

const classTabMetaLabel = computed(() => (locale.value === 'en' ? 'Basic Info' : '基本信息'));
const classTabCanvasLabel = computed(() => (locale.value === 'en' ? 'Class Canvas' : '类图画布'));
const classTabSourceLabel = computed(() => (locale.value === 'en' ? 'Source' : '源码'));
const isClassCanvasKind = computed(() => viewDraft.value?.kind === 'mermaid-class' || viewDraft.value?.kind === 'uml-class');
const isMindmapCanvasKind = computed(() => viewDraft.value?.kind === 'mindmap-ui');
const isUiDesignCanvasKind = computed(() => viewDraft.value?.kind === 'ui-design');

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

function tryAutoBindSingleModelRefOnViewOpen(): void {
  const v = viewDraft.value;
  const b = block.value;
  if (!v || !b || b.kind !== 'mv-view') return;
  const parsed = parseMarkdownBlocks(props.markdown);
  const modelBlocks = parsed.blocks.filter((x) =>
    x.kind === 'mv-model-sql' ||
    x.kind === 'mv-model-kv' ||
    x.kind === 'mv-model-struct' ||
    x.kind === 'mv-model-codespace' ||
    x.kind === 'mv-model-interface',
  );
  if (modelBlocks.length !== 1) return;
  const only = modelBlocks[0]!;
  let tableId: string | undefined;
  if (only.kind === 'mv-model-sql') {
    const p = only.payload as MvModelSqlPayload;
    tableId = p.tables[0]?.id;
  }
  const target = buildModelRefString(
    normalizeRelPath(props.relPath.replace(/\\/g, '/')),
    normalizeRelPath(props.relPath.replace(/\\/g, '/')),
    only.payload.id,
    tableId,
  );
  // 已是唯一有效绑定则不重复触发。
  if (v.modelRefs.length === 1 && v.modelRefs[0] === target) return;
  // 有多个历史引用时保留人工确认。
  if (v.modelRefs.length > 1) return;
  v.modelRefs = [target];
  let next = replaceBlockInnerById(props.markdown, props.blockId, JSON.stringify(v, null, 2));
  if (!next) return;
  if (isMermaidViewKind(v.kind)) {
    next = upsertTrailingMermaidMirror(next, props.blockId, toViewPayloadText(v.payload));
  }
  emit('updated', { markdown: next, relPath: props.relPath });
  window.alert(locale.value === 'en' ? `Auto-bound modelRefs: ${target}` : `已自动绑定 modelRefs：${target}`);
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

const classCanvasHasValidModelSource = computed((): boolean => {
  const v = viewDraft.value;
  if (!v || (v.kind !== 'mermaid-class' && v.kind !== 'uml-class')) return true;
  if (modelRefsTargetMissing.value) return false;
  if (!Array.isArray(v.modelRefs) || v.modelRefs.length === 0) return false;
  const canonSet = new Set(modelRefsCandidates.value.map((c) => canonicalModelRef(c)));
  const valSet = new Set(modelRefsCandidates.value.map((c) => c.value));
  return v.modelRefs.some((r) => canonSet.has(r) || valSet.has(r));
});

const classCanvasModelSourceError = computed((): string => {
  if (classCanvasHasValidModelSource.value) return '';
  return locale.value === 'en'
    ? 'No valid model source. Bind a usable modelRefs entry in Basic Info first.'
    : '未指定有效 model 来源，请先在“基本信息”里绑定可用的 modelRefs。';
});

/** uml-class：仅观察 codespace，不写回 model、不占用侧车同步。 */
const umlClassObserveCodespaceOnly = computed(
  () => viewDraft.value?.kind === 'uml-class' && viewDraft.value.observeCodespaceOnly === true,
);

/** 与 codespace 合并展示 / 落盘 strip inherit：有效 modelRefs，或仅观察模式（至少配置了 modelRefs 列表）。 */
const umlClassUsesCodespaceLayoutMerge = computed((): boolean => {
  const v = viewDraft.value;
  if (!v || v.kind !== 'uml-class') return false;
  if (umlClassObserveCodespaceOnly.value) return Array.isArray(v.modelRefs) && v.modelRefs.length > 0;
  return classCanvasHasValidModelSource.value;
});

const classCanvasCodespaceClassTree = computed<CodespaceClassTreeItem[]>(() => {
  if (!viewDraft.value || (viewDraft.value.kind !== 'mermaid-class' && viewDraft.value.kind !== 'uml-class')) return [];
  return listCodespaceClassesForClassCanvas(classCanvasSourceMarkdown.value, viewDraft.value.modelRefs ?? []);
});

const classCanvasSourceMarkdown = computed((): string => {
  const sideId = classCanvasCodespaceSideBlockId.value;
  const sidePayload = classCanvasCodespaceSidePayload.value;
  if (!sideId || !sidePayload) return props.markdown;
  const next = replaceBlockInnerById(props.markdown, sideId, JSON.stringify(sidePayload, null, 2));
  return next ?? props.markdown;
});

/** 只读：合并展示用 codespace payload，勿在 computed 里写入侧车 ref。 */
function classCanvasCodespacePayloadForMerge(): MvModelCodespacePayload | null {
  if (classCanvasCodespaceSidePayload.value) return classCanvasCodespaceSidePayload.value;
  const v = viewDraft.value;
  if (!v || v.kind !== 'uml-class') return null;
  return getFirstCodespaceRefForClassCanvas(props.markdown, v.modelRefs ?? [])?.payload ?? null;
}

function collectInheritEdgesFromCodespaceForDiagram(
  diagramPayloadText: string,
  cs: MvModelCodespacePayload,
  rows: CodespaceClassTreeItem[],
): { from: string; to: string }[] {
  const { state } = parseUmlClassDiagramPayload(diagramPayloadText);
  if (!state.classes.length) return [];
  const nameByDiagramId = new Map(state.classes.map((c) => [c.id, (c.name ?? c.id).trim()] as const));
  const csToDiag = new Map<string, string>();
  for (const dc of state.classes) {
    const csId = resolveDiagramClassToCodespaceClassId(dc.id, nameByDiagramId.get(dc.id) ?? dc.id, rows);
    if (csId) csToDiag.set(csId, dc.id);
  }
  const out: { from: string; to: string }[] = [];
  const seen = new Set<string>();
  for (const mod of cs.modules ?? []) {
    const walk = (nodes: typeof mod.namespaces) => {
      for (const n of nodes ?? []) {
        for (const c of n.classes ?? []) {
          const childDiag = csToDiag.get(c.id);
          if (!childDiag) continue;
          for (const b of c.bases ?? []) {
            if (b.relation !== 'generalization') continue;
            const parentDiag = csToDiag.get(b.targetId);
            if (!parentDiag) continue;
            const k = `${childDiag}\t${parentDiag}`;
            if (seen.has(k)) continue;
            seen.add(k);
            out.push({ from: childDiag, to: parentDiag });
          }
        }
        walk(n.namespaces);
      }
    };
    walk(mod.namespaces);
  }
  return out;
}

/** 画布展示：继承边来自 codespace `bases.generalization`；编辑态 viewDraft 仍可带 inherit 供 watch 写回 codespace。 */
const umlClassCanvasModelValue = computed((): string => {
  const v = viewDraft.value;
  const raw = toViewPayloadText(v?.payload);
  if (!v || v.kind !== 'uml-class') return raw;
  if (!umlClassUsesCodespaceLayoutMerge.value) return raw;
  const cs = classCanvasCodespacePayloadForMerge();
  if (!cs) return raw;
  const rows = listCodespaceClassesForClassCanvas(classCanvasSourceMarkdown.value, v.modelRefs ?? []);
  const stripped = stripInheritFromClassDiagramPayload(raw);
  const edges = collectInheritEdgesFromCodespaceForDiagram(stripped, cs, rows);
  return mergeInheritIntoClassDiagramPayload(stripped, edges);
});

/** 源码 tab：与保存到 md 的 mv-view 一致，不展示 inherit（继承只在 codespace `bases`）。 */
const umlClassPayloadSourceText = computed((): string => {
  const v = viewDraft.value;
  const raw = toViewPayloadText(v?.payload);
  if (!v || v.kind !== 'uml-class') return raw;
  if (!umlClassUsesCodespaceLayoutMerge.value) return raw;
  return stripInheritFromClassDiagramPayload(raw);
});

const classCanvasAssocTargetsByClassId = computed<Record<string, string[]>>(() => {
  const out: Record<string, string[]> = {};
  const v = viewDraft.value;
  if (!v || (v.kind !== 'mermaid-class' && v.kind !== 'uml-class')) return out;
  const parsed = parseViewPayloadClassDiagram(toViewPayloadText(v.payload));
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
  const side = classCanvasCodespaceSidePayload.value;
  if (!v || !side) return;
  if (v.kind !== 'mermaid-class' && v.kind !== 'uml-class') return;
  if (v.kind === 'uml-class' && v.observeCodespaceOnly) return;
  const targets = classCanvasAssocTargetsByClassId.value;
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
  /** 类图连线端点用的是 `slug(类名)`，codespace 里常用 `cls-*` id；两边都试才能推类型。 */
  const resolveClassLevelType = (classId: string, className: string): string | undefined => {
    const keys = [classId, slug(className)].filter((k) => k.trim().length > 0);
    for (const k of keys) {
      const first = targets[k]?.[0];
      if (first) return nameById.get(first) ?? first;
    }
    return undefined;
  };
  /** members / properties 上 `associatedClassifierId`：仅推导「当前类 ↔ 指定 Classifier」沿类图存在边时的对端显示名。 */
  const resolveTypeForAssociatedClassifier = (
    ownerClassId: string,
    ownerClassName: string,
    assocClassifierId: string,
  ): string | undefined => {
    const bid = assocClassifierId.trim();
    if (!bid) return undefined;
    const otherName = (nameById.get(bid) ?? '').trim();
    const neighborKeys = new Set<string>([bid, otherName ? slug(otherName) : ''].filter((x) => x.length > 0));
    const ownerKeys = [ownerClassId, slug(ownerClassName)].filter((k) => k.trim().length > 0);
    for (const ok of ownerKeys) {
      const neigh = targets[ok];
      if (!neigh) continue;
      for (const nid of neigh) {
        if (neighborKeys.has(nid)) return nameById.get(bid) ?? nameById.get(nid) ?? nid;
      }
    }
    return undefined;
  };
  for (const mod of side.modules ?? []) {
    const walk = (nodes: typeof mod.namespaces) => {
      for (const n of nodes ?? []) {
        for (const c of n.classes ?? []) {
          const cn = (c.name ?? c.id).trim();
          const fallback = resolveClassLevelType(c.id, cn);
          for (const m of c.members ?? []) {
            const aid = m.associatedClassifierId?.trim();
            if (aid) {
              const t = resolveTypeForAssociatedClassifier(c.id, cn, aid) ?? nameById.get(aid) ?? aid;
              m.typeFromAssociation = true;
              if (t) m.type = t;
              continue;
            }
            const t = fallback;
            m.typeFromAssociation = !!t || undefined;
            if (t) m.type = t;
          }
          for (const p of c.properties ?? []) {
            const aid = p.associatedClassifierId?.trim();
            if (aid) {
              const t = resolveTypeForAssociatedClassifier(c.id, cn, aid) ?? nameById.get(aid) ?? aid;
              p.typeFromAssociation = true;
              if (t) p.type = t;
              continue;
            }
            const t = fallback;
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

/** 未打开 codespace 浮窗时，为类图→model 同步懒加载同文件首个 codespace 围栏。 */
function ensureClassCanvasCodespaceSidePayloadForClassSync(): boolean {
  const v0 = viewDraft.value;
  if (v0?.kind === 'uml-class' && v0.observeCodespaceOnly) return false;
  if (classCanvasCodespaceSidePayload.value) return true;
  const v = viewDraft.value;
  if (!v || (v.kind !== 'uml-class' && v.kind !== 'mermaid-class')) return false;
  const first = getFirstCodespaceRefForClassCanvas(props.markdown, v.modelRefs ?? []);
  if (!first) return false;
  classCanvasCodespaceSideBlockId.value = first.codespaceBlockId;
  classCanvasCodespaceSidePayload.value = first.payload;
  return true;
}

/** uml-class：以当前 payload 文本中的 inherit 为准写 codespace `bases.generalization`；删除画布继承会清空对应记录。 */
function syncUmlInheritLinksToCodespaceBases(diagramPayloadText: string): void {
  const v = viewDraft.value;
  if (!v || v.kind !== 'uml-class') return;
  if (v.observeCodespaceOnly) return;
  if (!classCanvasCodespaceSidePayload.value) return;
  const side = classCanvasCodespaceSidePayload.value;
  const { state } = parseUmlClassDiagramPayload(diagramPayloadText);
  const rows = listCodespaceClassesForClassCanvas(classCanvasSourceMarkdown.value, v.modelRefs ?? []);
  const nameByDiagramClassId = (id: string): string => {
    const c = state.classes.find((x) => x.id === id);
    return (c?.name ?? id).trim() || id;
  };
  const resolveCsId = (diagramId: string): string | null =>
    resolveDiagramClassToCodespaceClassId(diagramId, nameByDiagramClassId(diagramId), rows);

  const codespaceIdsInDiagram = new Set<string>();
  for (const dc of state.classes) {
    const cid = resolveCsId(dc.id);
    if (cid) codespaceIdsInDiagram.add(cid);
  }

  const genByChild = new Map<string, MvCodespaceClassifierBase[]>();
  for (const l of state.links) {
    if (l.kind !== 'inherit') continue;
    const childCs = resolveCsId(l.from);
    const parentCs = resolveCsId(l.to);
    if (!childCs || !parentCs || childCs === parentCs) continue;
    const arr = genByChild.get(childCs) ?? [];
    arr.push({ targetId: parentCs, relation: 'generalization' });
    genByChild.set(childCs, arr);
  }
  for (const [childId, arr] of genByChild) {
    const seen = new Set<string>();
    const dedup: MvCodespaceClassifierBase[] = [];
    for (const b of arr) {
      if (seen.has(b.targetId)) continue;
      seen.add(b.targetId);
      dedup.push(b);
    }
    genByChild.set(childId, dedup);
  }

  for (const mod of side.modules ?? []) {
    const walk = (nodes: typeof mod.namespaces) => {
      for (const n of nodes ?? []) {
        for (const c of n.classes ?? []) {
          if (!codespaceIdsInDiagram.has(c.id)) continue;
          const kept = (c.bases ?? []).filter((b) => b.relation !== 'generalization');
          const gens = genByChild.get(c.id) ?? [];
          const nextBases = [...kept, ...gens];
          if (JSON.stringify(c.bases ?? []) !== JSON.stringify(nextBases)) c.bases = nextBases;
        }
        walk(n.namespaces);
      }
    };
    walk(mod.namespaces);
  }
}

function directedAssocKey(fromClassifierId: string, toClassifierId: string): string {
  return `${fromClassifierId}\t${toClassifierId}`;
}

/**
 * uml-class：`association` 精确同步到成员/属性（associatedClassifierId），`dependency` 写 class 级 associations。
 * - association：仅当边上带 fromSlotSection/fromSlotName（来自右侧成员/属性句柄）才回写
 * - dependency：写入 namespaces[].associations（id 前缀 diag-dep-，不覆盖同向手工记录）
 */
function syncUmlAssociationEdgesToCodespaceAssociations(diagramPayloadText: string): void {
  const v = viewDraft.value;
  if (!v || v.kind !== 'uml-class') return;
  if (v.observeCodespaceOnly) return;
  if (!classCanvasCodespaceSidePayload.value) return;
  const side = classCanvasCodespaceSidePayload.value;
  const { state } = parseUmlClassDiagramPayload(diagramPayloadText);
  const rows = listCodespaceClassesForClassCanvas(classCanvasSourceMarkdown.value, v.modelRefs ?? []);
  const nameByDiagramClassId = (id: string): string => {
    const c = state.classes.find((x) => x.id === id);
    return (c?.name ?? id).trim() || id;
  };
  const resolveCsId = (diagramId: string): string | null =>
    resolveDiagramClassToCodespaceClassId(diagramId, nameByDiagramClassId(diagramId), rows);
  const classifierNameById = new Map<string, string>();
  for (const mod of side.modules ?? []) {
    const walk = (nodes: MvCodespaceNamespaceNode[] | undefined) => {
      if (!nodes?.length) return;
      for (const n of nodes) {
        for (const c of n.classes ?? []) classifierNameById.set(c.id, (c.name ?? c.id).trim() || c.id);
        walk(n.namespaces);
      }
    };
    walk(mod.namespaces);
  }

  type DiagramAssocSlot = {
    fromCs: string;
    toCs: string;
    section: 'members' | 'properties';
    slotName: string;
  };
  type DiagramDep = { fromCs: string; toCs: string; fromMult?: string; toMult?: string };
  const slotAssocs: DiagramAssocSlot[] = [];
  const deps: DiagramDep[] = [];
  for (const l of state.links) {
    if (l.kind !== 'association' && l.kind !== 'dependency') continue;
    const a = resolveCsId(l.from);
    const b = resolveCsId(l.to);
    if (!a || !b || a === b) continue;
    if (l.kind === 'dependency') {
      deps.push({
        fromCs: a,
        toCs: b,
        fromMult: l.fromMult,
        toMult: l.toMult,
      });
      continue;
    }
    const section = l.fromSlotSection;
    const slotName = (l.fromSlotName ?? '').trim();
    if ((section === 'members' || section === 'properties') && slotName) {
      slotAssocs.push({ fromCs: a, toCs: b, section, slotName });
    }
  }

  function findOwnerNs(
    nodes: MvCodespaceNamespaceNode[] | undefined,
    clsId: string,
  ): MvCodespaceNamespaceNode | null {
    if (!nodes?.length) return null;
    for (const n of nodes) {
      if (n.classes?.some((c) => c.id === clsId)) return n;
      const sub = findOwnerNs(n.namespaces, clsId);
      if (sub) return sub;
    }
    return null;
  }

  const byNsDep = new Map<MvCodespaceNamespaceNode, DiagramDep[]>();
  for (const mod of side.modules ?? []) {
    const roots = mod.namespaces;
    for (const d of deps) {
      const nf = findOwnerNs(roots, d.fromCs);
      const nt = findOwnerNs(roots, d.toCs);
      if (!nf || nf !== nt) continue;
      const arr = byNsDep.get(nf) ?? [];
      const ix = arr.findIndex((x) => x.fromCs === d.fromCs && x.toCs === d.toCs);
      if (ix >= 0) arr[ix] = d;
      else arr.push(d);
      byNsDep.set(nf, arr);
    }
  }

  const byClassSlot = new Map<string, string>();
  const slotKey = (clsId: string, section: 'members' | 'properties', slotName: string): string =>
    `${clsId}\t${section}\t${slotName.trim().toLowerCase()}`;
  for (const a of slotAssocs) {
    byClassSlot.set(slotKey(a.fromCs, a.section, a.slotName), a.toCs);
  }

  let changed = false;
  for (const mod of side.modules ?? []) {
    const walk = (nodes: MvCodespaceNamespaceNode[] | undefined) => {
      if (!nodes?.length) return;
      for (const n of nodes) {
        for (const c of n.classes ?? []) {
          const patchList = <T extends { name: string; associatedClassifierId?: string; typeFromAssociation?: boolean }>(
            list: T[] | undefined,
            section: 'members' | 'properties',
          ) => {
            if (!list?.length) return;
            for (const row of list) {
              const nm = (row.name ?? '').trim();
              if (!nm) continue;
              const key = slotKey(c.id, section, nm);
              const hit = byClassSlot.get(key);
              if (hit) {
                if (row.associatedClassifierId !== hit) {
                  row.associatedClassifierId = hit;
                  changed = true;
                }
                const t = classifierNameById.get(hit) ?? hit;
                if ((row as { type?: string }).type !== t) {
                  (row as { type?: string }).type = t;
                  changed = true;
                }
                if (row.typeFromAssociation !== true) {
                  row.typeFromAssociation = true;
                  changed = true;
                }
              } else if (row.typeFromAssociation === true) {
                row.associatedClassifierId = undefined;
                if ((row as { type?: string }).type !== undefined) (row as { type?: string }).type = undefined;
                row.typeFromAssociation = undefined;
                changed = true;
              }
            }
          };
          patchList(c.members, 'members');
          patchList(c.properties, 'properties');
        }
        walk(n.namespaces);
      }
    };
    walk(mod.namespaces);
  }

  function walkNs(nodes: MvCodespaceNamespaceNode[] | undefined, fn: (n: MvCodespaceNamespaceNode) => void): void {
    if (!nodes?.length) return;
    for (const n of nodes) {
      fn(n);
      walkNs(n.namespaces, fn);
    }
  }

  for (const mod of side.modules ?? []) {
    walkNs(mod.namespaces, (ns) => {
      const list = byNsDep.get(ns) ?? [];
      const manual = (ns.associations ?? []).filter((a) => !String(a.id).startsWith('diag-dep-'));
      const manualDirected = new Set(manual.map((a) => directedAssocKey(a.fromClassifierId, a.toClassifierId)));

      const fromDiag: MvCodespaceAssociation[] = [];
      for (const d of list) {
        const k = directedAssocKey(d.fromCs, d.toCs);
        if (manualDirected.has(k)) continue;
        fromDiag.push({
          id: `diag-dep-${d.fromCs}-${d.toCs}`,
          kind: 'dependency',
          fromClassifierId: d.fromCs,
          toClassifierId: d.toCs,
          fromEnd: d.fromMult?.trim() ? { multiplicity: d.fromMult.trim() } : undefined,
          toEnd: d.toMult?.trim() ? { multiplicity: d.toMult.trim() } : undefined,
        });
      }
      const next = [...manual, ...fromDiag];
      if (JSON.stringify(ns.associations ?? []) !== JSON.stringify(next)) {
        ns.associations = next;
        changed = true;
      }
    });
  }
  if (changed) {
    classCanvasCodespaceSidePayload.value = JSON.parse(JSON.stringify(side)) as MvModelCodespacePayload;
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
  const u = sqlModelCanvasMessagesFor(locale.value);
  const m = modelDraft.value;
  if (!m) return '--';
  if (!m.columns.length) return u.ddlPreviewNoColumns;
  const lines: string[] = [];
  lines.push(u.ddlPreviewHeaderLine);
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
    window.alert(sqlModelCanvasMessagesFor(locale.value).alertCannotDeleteLastSubtable);
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
  const msg = sqlModelCanvasMessagesFor(locale.value);
  if (!raw) {
    window.alert(msg.alertSubtableIdEmpty);
    el.value = m.id;
    return;
  }
  if (d.tables.some((t, j) => t.id === raw && j !== activeTableIndex.value)) {
    window.alert(msg.alertSubtableIdConflict);
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
  const msg = sqlModelCanvasMessagesFor(locale.value);
  if (m.columns.length <= 1) {
    window.alert(msg.alertTableMinOneColumn);
    return;
  }
  const col = m.columns[ci]!;
  if (!window.confirm(msg.confirmDeleteColumn(col.name))) return;
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
  const msg = sqlModelCanvasMessagesFor(locale.value);
  const nextName = sanitizeColumnName(raw);
  if (!nextName) {
    window.alert(msg.alertColumnNameEmpty);
    return;
  }
  const old = m.columns[ci]!.name;
  if (old === nextName) return;
  if (m.columns.some((c, i) => i !== ci && c.name === nextName)) {
    window.alert(msg.alertColumnNameExists);
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
    window.alert(sqlModelCanvasMessagesFor(locale.value).alertIdPkCannotNullable);
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
  if (!window.confirm(sqlModelCanvasMessagesFor(locale.value).confirmClearAllRows(m.rows.length))) return;
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
    window.alert(kvModelCanvasMessagesFor(locale.value).alertDocMustBeObject);
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
    else if (
      v.kind === 'uml-class' &&
      (classCanvasHasValidModelSource.value || v.observeCodespaceOnly === true) &&
      (typeof v.payload === 'string' || (v.payload && typeof v.payload === 'object'))
    ) {
      const pt = typeof v.payload === 'string' ? v.payload : JSON.stringify(v.payload, null, 2);
      const stripped = stripInheritFromClassDiagramPayload(pt);
      v.payload = fromViewPayloadText('uml-class', stripped);
    }
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
  if (b.kind === 'mv-view' && classCanvasCodespaceSideBlockId.value && classCanvasCodespaceSidePayload.value) {
    const sideBlockId = classCanvasCodespaceSideBlockId.value;
    const sideInnerNow = JSON.stringify(classCanvasCodespaceSidePayload.value, null, 2).trim();
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
  [() => viewDraft.value?.payload, () => classCanvasCodespaceSidePayload.value],
  () => {
    const vd = viewDraft.value;
    if (vd?.kind === 'uml-class' && vd.observeCodespaceOnly) {
      syncAssocTypeFromDiagramToCodespace();
      return;
    }
    if (vd?.kind === 'uml-class' || vd?.kind === 'mermaid-class') {
      ensureClassCanvasCodespaceSidePayloadForClassSync();
    }
    syncAssocTypeFromDiagramToCodespace();
  },
  { deep: true },
);

watch(
  () => viewDraft.value?.observeCodespaceOnly,
  (obs) => {
    if (obs && viewDraft.value?.kind === 'uml-class') {
      classCanvasCodespaceFloatOpen.value = false;
      classCanvasCodespaceFloat.value = null;
      classCanvasCodespaceSideBlockId.value = null;
      classCanvasCodespaceSidePayload.value = null;
    }
  },
);

function autoSyncToMarkdownInMemory(): void {
  const inner = buildInnerJson();
  if (!inner) return;
  let base = props.markdown;
  if (
    block.value?.kind === 'mv-view' &&
    classCanvasCodespaceSideBlockId.value &&
    classCanvasCodespaceSidePayload.value &&
    classCanvasCodespaceSideBlockId.value !== props.blockId
  ) {
    const csInner = JSON.stringify(classCanvasCodespaceSidePayload.value, null, 2);
    const r0 = replaceBlockInnerById(base, classCanvasCodespaceSideBlockId.value, csInner);
    if (r0) base = r0;
  }
  let next = replaceBlockInnerById(base, props.blockId, inner);
  if (!next) return;
  if (block.value?.kind === 'mv-view' && viewDraft.value && isMermaidViewKind(viewDraft.value.kind)) {
    next = upsertTrailingMermaidMirror(next, props.blockId, toViewPayloadText(viewDraft.value.payload));
  }
  if (next === props.markdown) return;
  lastAutoSyncedMarkdown.value = next;
  emit('updated', { markdown: next, relPath: props.relPath });
}

watch(
  hasCanvasUnsavedChanges,
  (dirty) => {
    if (!dirty) return;
    autoSyncToMarkdownInMemory();
  },
  { flush: 'post' },
);

function closeWin() {
  emit('close');
}

function setCodespaceDraft(v: MvModelCodespacePayload) {
  codespaceDraft.value = v;
}

function patchClassCanvasCodespaceSide(fn: (d: MvModelCodespacePayload) => void) {
  const p = classCanvasCodespaceSidePayload.value;
  if (!p) return;
  fn(p);
}

function onClassCanvasOpenClassifier(ev: { classDiagramClassId: string; className: string }) {
  const vd = viewDraft.value;
  if (!vd) return;
  if (vd.kind === 'uml-class' && vd.observeCodespaceOnly) {
    window.alert(
      locale.value === 'en'
        ? 'This view is observe-only. Open the mv-model-codespace fence to edit the model.'
        : '当前为仅观察视图。请直接打开 mv-model-codespace 围栏编辑模型。',
    );
    return;
  }
  const hit = findCodespaceClassifierForClassCanvas(
    classCanvasSourceMarkdown.value,
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
  classCanvasCodespaceSideBlockId.value = hit.codespaceBlockId;
  classCanvasCodespaceSidePayload.value = hit.payload;
  classCanvasCodespaceFloat.value = { mi: hit.mi, path: hit.path, ci: hit.ci };
  classCanvasCodespaceFloatOpen.value = true;
}

function closeClassCanvasCodespaceFloat() {
  classCanvasCodespaceFloatOpen.value = false;
}

function onClassCanvasCreateMissingClassifier(ev: { classId: string; className: string }) {
  const vd = viewDraft.value;
  if (!vd) return;
  if (vd.kind === 'uml-class' && vd.observeCodespaceOnly) return;

  if (!classCanvasCodespaceSidePayload.value || !classCanvasCodespaceSideBlockId.value) {
    const first = getFirstCodespaceRefForClassCanvas(classCanvasSourceMarkdown.value, vd.modelRefs ?? []);
    if (!first) {
      window.alert(
        locale.value === 'en'
          ? 'No same-file mv-model-codespace found in modelRefs; cannot sync new class to model.'
          : 'modelRefs 未绑定同文件 mv-model-codespace，无法把新 class 同步到 model。',
      );
      return;
    }
    classCanvasCodespaceSideBlockId.value = first.codespaceBlockId;
    classCanvasCodespaceSidePayload.value = first.payload;
  }

  const payload = classCanvasCodespaceSidePayload.value;
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
    members: [],
    methods: [],
    properties: [],
    enums: [],
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
      </div>
    </header>

    <main v-if="block" class="canvas-body">
      <div class="canvas-surface" :aria-label="ui.blockCanvasBodyAria">
        <template v-if="block.kind === 'mv-model-sql' && modelSqlDraft">
          <div class="model-sql-surface">
          <FormatHint>{{ sqlUi.formatHintIntro }}</FormatHint>
          <h3 class="model-section-title">{{ sqlUi.metaSectionTitle }}</h3>
          <div class="model-meta-grid model-meta-grid--sql">
            <label class="field field--inline">
              <span class="sql-meta-label">MODEL id</span>
              <input class="wide sql-mono-inp" type="text" :value="modelSqlDraft.id" readonly :title="sqlUi.modelIdInputTitle" />
            </label>
            <label class="field field--inline">
              <span class="sql-meta-label">{{ sqlUi.groupCommentLabel }}</span>
              <input v-model="modelSqlDraft.title" class="wide sql-mono-inp" type="text" :placeholder="sqlUi.optionalPlaceholder" />
            </label>
          </div>
          <div class="model-subtable-shell">
            <div class="model-subtable-tabbar" role="tablist" :aria-label="sqlUi.subtableTablistAria">
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
                :title="sqlUi.subtableTabTitle(tb.id)"
                @click="onSubtableTabStripClick(ti, $event)"
                @keydown.enter.prevent="selectSqlTable(ti)"
                @keydown.space.prevent="selectSqlTable(ti)"
              >
                <span class="model-subtable-tab-label">{{ tb.id }}</span>
                <button
                  v-if="modelSqlDraft.tables.length > 1"
                  type="button"
                  class="model-subtable-tab-close"
                  :title="sqlUi.deleteSubtableButtonTitle"
                  :aria-label="sqlUi.deleteSubtableAriaLabel(tb.id)"
                  @click.stop="openSubtableDeleteDialog(ti)"
                >
                  ×
                </button>
              </div>
              <span class="model-subtable-tabspacer" aria-hidden="true"></span>
              <button
                type="button"
                class="model-subtable-tab model-subtable-tab--action model-subtable-tab--add"
                :title="sqlUi.addSubtableButtonTitle"
                @click="addModelSqlTable"
              >
                {{ sqlUi.addSubtableLabel }}
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
            :aria-label="sqlUi.ddlSectionAria"
          >
            <h3 class="model-fold-heading">
              <button
                type="button"
                class="model-fold-head"
                :aria-expanded="sqlDdlSectionOpen"
                aria-controls="sql-ddl-fold-panel"
                id="sql-ddl-fold-trigger"
                :title="sqlUi.tooltipDdlFold(sqlDdlSectionOpen)"
                @click="sqlDdlSectionOpen = !sqlDdlSectionOpen"
              >
                <span class="model-fold-chevron" aria-hidden="true">{{ sqlDdlSectionOpen ? '▼' : '▶' }}</span>
                <span class="model-fold-title">{{ sqlUi.ddlFoldTitle }}</span>
              </button>
            </h3>
            <div
              v-show="sqlDdlSectionOpen"
              id="sql-ddl-fold-panel"
              class="model-fold-body"
              role="region"
              aria-labelledby="sql-ddl-fold-trigger"
            >
          <FormatHint>{{ sqlUi.ddlFormatHint }}</FormatHint>
          <div class="model-meta-grid model-meta-grid--sql">
            <label class="field field--inline">
              <span class="sql-meta-label">TABLE id</span>
              <input
                class="wide sql-mono-inp"
                type="text"
                :value="modelDraft.id"
                :title="sqlUi.tableIdInputTitle"
                @blur="onSqlTableIdBlur($event)"
              />
            </label>
            <label class="field field--inline">
              <span class="sql-meta-label">{{ sqlUi.subtableCommentLabel }}</span>
              <input v-model="modelDraft.title" class="wide sql-mono-inp" type="text" :placeholder="sqlUi.optionalPlaceholder" />
            </label>
          </div>
          <pre class="model-ddl-preview" :aria-label="sqlUi.ddlPreviewAria">{{ modelSqlDdlPreview }}</pre>
          <div class="canvas-table-wrap model-schema-wrap">
            <table class="canvas-table model-schema-table model-schema-table--wide model-schema-table--sql">
              <thead>
                <tr>
                  <th><span class="sql-th">column</span></th>
                  <th><span class="sql-th">type</span></th>
                  <th class="td-center" :title="sqlUi.tooltipSchemaNullable"><span class="sql-th">null</span></th>
                  <th class="td-center" :title="sqlUi.tooltipSchemaPk"><span class="sql-th">pk</span></th>
                  <th class="td-center" :title="sqlUi.tooltipSchemaUq"><span class="sql-th">uq</span></th>
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
                      :aria-label="sqlUi.columnNameAria(ci)"
                      :title="sqlUi.columnNameBlurTitle"
                      @blur="onColumnNameBlur(ci, $event)"
                    />
                  </td>
                  <td>
                    <select
                      class="cell-inp cell-select sql-mono-inp"
                      :value="c.type ?? 'string'"
                      :aria-label="sqlUi.columnTypeAria(c.name)"
                      :title="sqlUi.columnTypeSelectTitle"
                      @change="setModelColumnType(ci, ($event.target as HTMLSelectElement).value)"
                    >
                      <option v-for="t in MODEL_COL_TYPES" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </td>
                  <td class="td-center">
                    <input
                      type="checkbox"
                      :checked="c.nullable === true"
                      :aria-label="sqlUi.columnNullableAria(c.name)"
                      :title="sqlUi.tooltipSchemaNullable"
                      @change="setModelColumnNullable(ci, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
                  <td class="td-center">
                    <input
                      type="checkbox"
                      :checked="c.primaryKey === true"
                      :aria-label="sqlUi.columnPkAria(c.name)"
                      :title="sqlUi.tooltipSchemaPk"
                      @change="setModelColumnPrimaryKey(ci, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
                  <td class="td-center">
                    <input
                      type="checkbox"
                      :checked="c.unique === true"
                      :aria-label="sqlUi.columnUniqueAria(c.name)"
                      :title="sqlUi.tooltipSchemaUq"
                      @change="setModelColumnUnique(ci, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
                  <td>
                    <input
                      class="cell-inp cell-inp--default sql-mono-inp"
                      type="text"
                      :value="defaultValueInputStr(c)"
                      :aria-label="sqlUi.columnDefaultAria(c.name)"
                      :placeholder="sqlUi.defaultPlaceholder"
                      :title="sqlUi.defaultBlurTitle"
                      @blur="onColumnDefaultBlur(ci, $event)"
                    />
                  </td>
                  <td>
                    <input
                      class="cell-inp cell-inp--comment sql-mono-inp"
                      type="text"
                      :value="c.comment ?? ''"
                      :aria-label="sqlUi.columnCommentAria(c.name)"
                      :placeholder="sqlUi.columnCommentPlaceholder"
                      :title="sqlUi.columnCommentTitle"
                      @blur="onColumnCommentBlur(ci, $event)"
                    />
                  </td>
                  <td class="col-schema-actions">
                    <button type="button" class="btn-ghost" :title="sqlUi.moveColumnLeftTitle" @click="moveModelColumn(ci, -1)">←</button>
                    <button type="button" class="btn-ghost" :title="sqlUi.moveColumnRightTitle" @click="moveModelColumn(ci, 1)">→</button>
                    <button type="button" class="link-btn" :title="sqlUi.dropColumnTitle" @click="removeModelColumn(ci)">{{ sqlUi.dropColumnLabel }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button type="button" class="add-row" @click="addModelColumn">{{ sqlUi.addColumnButton }}</button>
            </div>
          </section>

          <section
            class="model-fold-section"
            :class="{ 'model-fold-section--collapsed': !sqlDmlSectionOpen }"
            :aria-label="sqlUi.dmlSectionAria"
          >
            <h3 class="model-fold-heading">
              <button
                type="button"
                class="model-fold-head"
                :aria-expanded="sqlDmlSectionOpen"
                aria-controls="sql-dml-fold-panel"
                id="sql-dml-fold-trigger"
                :title="sqlUi.tooltipDmlFold(sqlDmlSectionOpen)"
                @click="sqlDmlSectionOpen = !sqlDmlSectionOpen"
              >
                <span class="model-fold-chevron" aria-hidden="true">{{ sqlDmlSectionOpen ? '▼' : '▶' }}</span>
                <span class="model-fold-title">{{ sqlUi.dmlFoldTitle }}</span>
              </button>
            </h3>
            <div
              v-show="sqlDmlSectionOpen"
              id="sql-dml-fold-panel"
              class="model-fold-body"
              role="region"
              aria-labelledby="sql-dml-fold-trigger"
            >
          <FormatHint>{{ sqlUi.dmlFormatHint }}</FormatHint>
          <div class="model-data-toolbar">
            <label class="field field--grow">
              <span class="sql-meta-label">{{ sqlUi.whereLabel }}</span>
              <input v-model="modelRowFilter" class="wide sql-mono-inp" type="search" :placeholder="sqlUi.wherePlaceholder" />
            </label>
            <span class="model-row-count">
              {{ sqlUi.rowCountTotal(modelDraft.rows.length) }}
              <template v-if="modelRowFilter.trim()">{{ sqlUi.rowCountShown(filteredModelRowEntries.length) }}</template>
            </span>
            <button
              type="button"
              class="tb model-readonly-toggle"
              :title="showModelReadonlyPreview ? sqlUi.readonlyToggleHideTitle : sqlUi.readonlyToggleShowTitle"
              @click="showModelReadonlyPreview = !showModelReadonlyPreview"
            >
              {{ showModelReadonlyPreview ? sqlUi.readonlyToggleHideLabel : sqlUi.readonlyToggleShowLabel }}
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
                    :title="buildColumnDataHeaderTooltip(c, sqlUi)"
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
                    <button type="button" class="link-btn link-btn--muted" :title="sqlUi.copyRowTitle" @click="duplicateModelRow(ri)">{{ sqlUi.copyRowLabel }}</button>
                    <button type="button" class="link-btn" :title="sqlUi.deleteRowTitle" @click="removeModelRow(ri)">{{ sqlUi.deleteRowLabel }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="model-data-actions">
            <button type="button" class="add-row" @click="addModelRow">{{ sqlUi.insertRowButton }}</button>
            <button
              type="button"
              class="add-row add-row--danger"
              :disabled="modelDraft.rows.length === 0"
              :title="sqlUi.clearAllRowsTitle"
              @click="clearAllModelRows"
            >
              {{ sqlUi.clearAllRowsLabel }}
            </button>
          </div>
            </div>
          </section>
            </div>
          </div>

          <section
            v-if="showModelReadonlyPreview && modelDraft"
            class="model-readonly-preview"
            :aria-label="sqlUi.readonlyPreviewSectionAria"
          >
            <h3 class="model-section-title model-section-title--readonly">{{ sqlUi.readonlyPreviewSectionTitle }}</h3>
            <FormatHint>{{ sqlUi.readonlyPreviewHint(modelDraft.id, filteredModelRowEntries.length, modelDraft.rows.length) }}</FormatHint>
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
          <h3 class="model-section-title">{{ kvUi.sectionTitle }}</h3>
          <FormatHint>{{ kvUi.formatHintIntro }}</FormatHint>
          <div class="model-meta-grid">
            <label class="field field--inline">
              <span>{{ kvUi.blockIdLabel }}</span>
              <input class="wide" type="text" :value="kvDraft.id" readonly :title="kvUi.blockIdInputTitle" />
            </label>
            <label class="field field--inline">
              <span>{{ ui.labelTitle }}</span>
              <input v-model="kvDraft.title" class="wide" type="text" :placeholder="kvUi.optionalPlaceholder" />
            </label>
          </div>
          <FormatHint>{{ kvUi.formatHintDocs }}</FormatHint>
          <div v-for="(_d, di) in kvDraft.documents" :key="di" class="kv-doc-block">
            <div class="kv-doc-head">
              <span>{{ kvUi.documentHeading(di + 1) }}</span>
              <button type="button" class="link-btn" :title="kvUi.deleteDocTitle" @click="removeKvDocument(di)">{{ kvUi.deleteDocLabel }}</button>
            </div>
            <textarea
              class="payload-ta kv-doc-ta"
              spellcheck="false"
              rows="8"
              :value="kvDocStrings[di]"
              :aria-label="kvUi.docJsonAriaLabel(di + 1)"
              @input="setKvDocString(di, ($event.target as HTMLTextAreaElement).value)"
              @blur="onKvDocBlur(di)"
            />
          </div>
          <button type="button" class="add-row" @click="addKvDocument">{{ kvUi.addDocumentButton }}</button>
        </template>

        <template v-else-if="block.kind === 'mv-model-struct'">
          <h3 class="model-section-title">{{ structUi.sectionTitle }}</h3>
          <FormatHint>{{ structUi.formatHintIntro }}</FormatHint>
          <textarea
            v-model="structJsonText"
            class="payload-ta"
            spellcheck="false"
            rows="22"
            :aria-label="structUi.jsonTextareaAriaLabel"
          />
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
          <h3 class="model-section-title">{{ interfaceUi.sectionTitle }}</h3>
          <FormatHint>{{ interfaceUi.formatHintIntro }}</FormatHint>
          <textarea
            v-model="interfaceJsonText"
            class="payload-ta"
            spellcheck="false"
            rows="22"
            :aria-label="interfaceUi.jsonTextareaAriaLabel"
          />
        </template>

        <template v-else-if="block.kind === 'mv-view' && viewDraft">
          <div
            class="mv-view-shell"
            :class="{
              'mv-view-shell--class-canvas': isClassCanvasKind && classCanvasPayloadMode === 'canvas',
              'mv-view-shell--mindmap-canvas': isMindmapCanvasKind,
              'mv-view-shell--ui-design-canvas': isUiDesignCanvasKind,
            }"
          >
          <template v-if="isClassCanvasKind">
            <div class="mv-class-payload-head" role="tablist">
              <button
                type="button"
                class="mv-class-tab"
                :class="{ 'mv-class-tab--active': classCanvasPayloadMode === 'meta' }"
                role="tab"
                id="mv-class-tab-meta"
                :aria-selected="classCanvasPayloadMode === 'meta'"
                :tabindex="classCanvasPayloadMode === 'meta' ? 0 : -1"
                aria-controls="mv-class-panel-meta"
                @click="classCanvasPayloadMode = 'meta'"
              >
                {{ classTabMetaLabel }}
              </button>
              <button
                type="button"
                class="mv-class-tab"
                :class="{ 'mv-class-tab--active': classCanvasPayloadMode === 'canvas' }"
                role="tab"
                id="mv-class-tab-canvas"
                :aria-selected="classCanvasPayloadMode === 'canvas'"
                :tabindex="classCanvasPayloadMode === 'canvas' ? 0 : -1"
                aria-controls="mv-class-panel-canvas"
                @click="classCanvasPayloadMode = 'canvas'"
              >
                {{ classTabCanvasLabel }}
              </button>
              <button
                type="button"
                class="mv-class-tab"
                :class="{ 'mv-class-tab--active': classCanvasPayloadMode === 'source' }"
                role="tab"
                id="mv-class-tab-source"
                :aria-selected="classCanvasPayloadMode === 'source'"
                :tabindex="classCanvasPayloadMode === 'source' ? 0 : -1"
                aria-controls="mv-class-panel-source"
                @click="classCanvasPayloadMode = 'source'"
              >
                {{ classTabSourceLabel }}
              </button>
            </div>
            <div
              v-show="classCanvasPayloadMode === 'meta'"
              id="mv-class-panel-meta"
              class="mv-class-panel-meta"
              role="tabpanel"
              aria-labelledby="mv-class-tab-meta"
            >
              <label class="field mv-title-row">
                <span class="mv-title-row-label">{{ ui.labelTitle }}</span>
                <input v-model="viewDraft.title" type="text" class="wide" />
              </label>
              <div class="mv-model-refs-picker">
                <div class="mv-model-refs-panel" role="region" :aria-label="ui.modelRefsPickerTablistAria">
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
                      <button type="button" class="tb mv-mini-btn" @click="openModelRefsPathPrompt">
                        {{ ui.modelRefsPickerOpenFileButton }}
                      </button>
                      <button type="button" class="tb mv-mini-btn" @click="clearModelRefsPathInput">
                        {{ ui.modelRefsPickerClearPathButton }}
                      </button>
                    </div>
                  </label>
                  <FormatHint v-if="modelRefsTargetMissing" variant="warn">
                    {{ ui.modelRefsPickerFileMissing }}
                  </FormatHint>
                  <FormatHint v-else>{{ ui.modelRefsPickerBindListHintSingle }}</FormatHint>
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
                  <FormatHint v-else-if="!modelRefsTargetMissing">（{{ ui.dockViewModelRefsNone }}）</FormatHint>
                  <div v-if="modelRefsOrphanRefs.length" class="mv-model-refs-orphans-block">
                    <FormatHint>
                      {{ ui.modelRefsPickerOrphansHint }}
                      <code v-for="(o, i) in modelRefsOrphanRefs" :key="'orph-' + i" class="mv-model-refs-orph">{{ o }}</code>
                    </FormatHint>
                  </div>
                </div>
              </div>
              <label v-if="viewDraft.kind === 'uml-class'" class="field mv-class-observe-only">
                <span>{{
                  locale === 'en'
                    ? 'Observe codespace only (read-only; this block saves layout/positions only)'
                    : '仅观察 codespace（只读；本块只保存画布布局与位置等显示信息）'
                }}</span>
                <input
                  type="checkbox"
                  :checked="viewDraft.observeCodespaceOnly === true"
                  @change="viewDraft.observeCodespaceOnly = ($event.target as HTMLInputElement).checked"
                />
              </label>
            </div>
            <div
              v-show="classCanvasPayloadMode === 'canvas'"
              id="mv-class-panel-canvas"
              class="mv-class-canvas-wrap"
              role="tabpanel"
              aria-labelledby="mv-class-tab-canvas"
            >
              <MermaidClassDiagramCanvas
                v-if="viewDraft.kind === 'mermaid-class'"
                :model-value="toViewPayloadText(viewDraft.payload)"
                :canvas-id="blockId"
                :codespace-classes="classCanvasCodespaceClassTree"
                :model-source-valid="classCanvasHasValidModelSource"
                :model-source-error="classCanvasModelSourceError"
                @update:model-value="(v: string) => setViewPayloadText(v)"
                @open-classifier="onClassCanvasOpenClassifier"
                @create-missing-classifier="onClassCanvasCreateMissingClassifier"
              />
              <UmlClassDiagramCanvas
                v-else-if="viewDraft.kind === 'uml-class'"
                :model-value="umlClassCanvasModelValue"
                :canvas-id="`${blockId}-uml`"
                :codespace-classes="classCanvasCodespaceClassTree"
                :model-source-valid="classCanvasHasValidModelSource"
                :model-source-error="classCanvasModelSourceError"
                :observe-codespace-only="viewDraft.observeCodespaceOnly === true"
                @update:model-value="(v: string) => setViewPayloadText(v)"
                @open-classifier="onClassCanvasOpenClassifier"
                @create-missing-classifier="onClassCanvasCreateMissingClassifier"
              />
            </div>
            <label
              v-show="classCanvasPayloadMode === 'source'"
              id="mv-class-panel-source"
              class="field"
              role="tabpanel"
              aria-labelledby="mv-class-tab-source"
            >
              <span>payload（{{ viewDraft.kind === 'uml-class' ? 'UML classDiagram' : 'Mermaid classDiagram' }}）</span>
              <textarea
                :value="viewDraft.kind === 'uml-class' ? umlClassPayloadSourceText : toViewPayloadText(viewDraft.payload)"
                class="payload-ta"
                spellcheck="false"
                rows="16"
                :placeholder="viewPayloadPlaceholder"
                @input="setViewPayloadText(($event.target as HTMLTextAreaElement).value)"
              />
            </label>
          </template>
          <template v-else>
            <template v-if="viewDraft.kind === 'ui-design'">
              <div class="mv-ui-design-book">
                <div class="mv-model-refs-tablist" role="tablist" :aria-label="ui.modelRefsPickerTablistAria">
                  <button
                    type="button"
                    class="mv-class-tab"
                    role="tab"
                    :class="{ 'mv-class-tab--active': uiDesignMvTab === 'refs' }"
                    :aria-selected="uiDesignMvTab === 'refs'"
                    @click="uiDesignMvTab = 'refs'"
                  >
                    {{ ui.modelRefsPickerTabBind }}
                  </button>
                  <button
                    type="button"
                    class="mv-class-tab"
                    role="tab"
                    :class="{ 'mv-class-tab--active': uiDesignMvTab === 'canvas' }"
                    :aria-selected="uiDesignMvTab === 'canvas'"
                    @click="uiDesignMvTab = 'canvas'"
                  >
                    {{ ui.modelRefsPickerCanvasTab }}
                  </button>
                </div>
                <div v-show="uiDesignMvTab === 'refs'" class="mv-model-refs-picker">
                  <div class="mv-model-refs-panel" role="region" :aria-label="ui.modelRefsPickerTablistAria">
                    <FormatHint class="dock-hint--tight">{{ ui.modelRefsPickerBindNoSvgCanvas }}</FormatHint>
                    <label class="field mv-title-row">
                      <span class="mv-title-row-label">{{ ui.labelTitle }}</span>
                      <input v-model="viewDraft.title" type="text" class="wide" />
                    </label>
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
                        <button type="button" class="tb mv-mini-btn" @click="openModelRefsPathPrompt">
                          {{ ui.modelRefsPickerOpenFileButton }}
                        </button>
                        <button type="button" class="tb mv-mini-btn" @click="clearModelRefsPathInput">
                          {{ ui.modelRefsPickerClearPathButton }}
                        </button>
                      </div>
                    </label>
                    <FormatHint v-if="modelRefsTargetMissing" variant="warn">
                      {{ ui.modelRefsPickerFileMissing }}
                    </FormatHint>
                    <FormatHint v-else>{{ ui.modelRefsPickerBindListHintSingle }}</FormatHint>
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
                    <FormatHint v-else-if="!modelRefsTargetMissing">（{{ ui.dockViewModelRefsNone }}）</FormatHint>
                    <div v-if="modelRefsOrphanRefs.length" class="mv-model-refs-orphans-block">
                      <FormatHint>
                        {{ ui.modelRefsPickerOrphansHint }}
                        <code v-for="(o, i) in modelRefsOrphanRefs" :key="'orph2-' + i" class="mv-model-refs-orph">{{ o }}</code>
                      </FormatHint>
                    </div>
                  </div>
                </div>
                <div
                  v-show="uiDesignMvTab === 'canvas'"
                  class="mv-class-canvas-wrap mv-uisvg-canvas-wrap mv-ui-design-canvas-slot"
                >
                  <UiDesignCanvas
                    :model-value="toViewPayloadText(viewDraft.payload)"
                    :canvas-id="`${blockId}-uisvg`"
                    :dock-command="uiDesignDockCommand"
                    @update:model-value="(v: string) => setViewPayloadText(v)"
                    @ui-design-dock-state="onUiDesignDockState"
                  />
                </div>
              </div>
            </template>
            <template v-else>
              <label class="field mv-title-row">
                <span class="mv-title-row-label">{{ ui.labelTitle }}</span>
                <input v-model="viewDraft.title" type="text" class="wide" />
              </label>
              <div v-if="viewDraft.kind !== 'mindmap-ui'" class="mv-model-refs-picker">
                <div class="mv-model-refs-panel" role="region" :aria-label="ui.modelRefsPickerTablistAria">
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
                      <button type="button" class="tb mv-mini-btn" @click="openModelRefsPathPrompt">
                        {{ ui.modelRefsPickerOpenFileButton }}
                      </button>
                      <button type="button" class="tb mv-mini-btn" @click="clearModelRefsPathInput">
                        {{ ui.modelRefsPickerClearPathButton }}
                      </button>
                    </div>
                  </label>
                  <FormatHint v-if="modelRefsTargetMissing" variant="warn">
                    {{ ui.modelRefsPickerFileMissing }}
                  </FormatHint>
                  <FormatHint v-else>{{ ui.modelRefsPickerBindListHintSingle }}</FormatHint>
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
                  <FormatHint v-else-if="!modelRefsTargetMissing">（{{ ui.dockViewModelRefsNone }}）</FormatHint>
                  <div v-if="modelRefsOrphanRefs.length" class="mv-model-refs-orphans-block">
                    <FormatHint>
                      {{ ui.modelRefsPickerOrphansHint }}
                      <code v-for="(o, i) in modelRefsOrphanRefs" :key="'orph3-' + i" class="mv-model-refs-orph">{{ o }}</code>
                    </FormatHint>
                  </div>
                </div>
              </div>
            </template>
          </template>
          <template v-if="viewDraft.kind === 'mindmap-ui'">
            <div class="mv-class-canvas-wrap">
              <MindmapCanvas
                :model-value="toViewPayloadText(viewDraft.payload)"
                :canvas-id="`${blockId}-mindmap`"
                :dock-command="mindmapDockCommand"
                @update:model-value="(v: string) => setViewPayloadText(v)"
                @dock-context="onMindmapDockContext"
                @dock-state="onMindmapDockState"
              />
            </div>
          </template>
          <label v-if="!isClassCanvasKind && viewDraft.kind !== 'mindmap-ui' && viewDraft.kind !== 'ui-design'" class="field">
            <span
              >payload（{{
                isUmlViewKind(viewDraft.kind)
                  ? 'UML 记录（独立格式）'
                  : isMermaidViewKind(viewDraft.kind)
                    ? 'Mermaid 图源'
                    : '子类型载荷'
              }}）</span
            >
            <textarea
              :value="toViewPayloadText(viewDraft.payload)"
              class="payload-ta"
              spellcheck="false"
              rows="16"
              :placeholder="viewPayloadPlaceholder"
              @input="setViewPayloadText(($event.target as HTMLTextAreaElement).value)"
            />
            <FormatHint v-if="viewUsesCoreUmlPayloadMapping">
              {{ ui.viewUmlPayloadMappingHint }}
            </FormatHint>
          </label>
          <CodespaceClassifierFloat
            v-if="classCanvasCodespaceSidePayload && classCanvasCodespaceFloat"
            :open="classCanvasCodespaceFloatOpen"
            :model-value="classCanvasCodespaceSidePayload"
            :mi="classCanvasCodespaceFloat.mi"
            :path="classCanvasCodespaceFloat.path"
            :ci="classCanvasCodespaceFloat.ci"
            :diagram-assoc-targets-by-class-id="classCanvasAssocTargetsByClassId"
            :run-patch="patchClassCanvasCodespaceSide"
            @close="closeClassCanvasCodespaceFloat"
          />
          </div>
        </template>

        <template v-else-if="block.kind === 'mv-map'">
          <FormatHint variant="title">{{ canvasSurfaceTitle }}</FormatHint>
          <FormatHint>编辑 <code>mv-map</code> 围栏代码块内的映射规则 JSON；保存后写回 Markdown。</FormatHint>
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
          <h2 id="msc-del-title" class="msc-del-title">{{ sqlUi.subtableDeleteTitle }}</h2>
          <p id="msc-del-desc" class="msc-del-desc">
            {{ sqlUi.subtableDeleteWarningLead(subtableDeleteTargetId) }}
          </p>
          <ul class="msc-del-list">
            <li>{{ sqlUi.subtableDeleteLi1 }}</li>
            <li>{{ sqlUi.subtableDeleteLi2(subtableDeleteTargetId) }}</li>
            <li>{{ sqlUi.subtableDeleteLi3 }}</li>
          </ul>
          <div class="msc-del-actions">
            <button type="button" class="msc-del-btn" :title="sqlUi.subtableDeleteCancelTitle" @click="cancelSubtableDelete">
              {{ sqlUi.subtableDeleteCancelLabel }}
            </button>
            <button
              type="button"
              class="msc-del-btn msc-del-btn--danger"
              :title="sqlUi.subtableDeleteConfirmTitle"
              @click="confirmSubtableDelete"
            >
              {{ sqlUi.subtableDeleteConfirmLabel }}
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
.mv-model-refs-picker {
  margin-bottom: 10px;
}
.mv-ui-design-book {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.mv-ui-design-book .mv-model-refs-tablist {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.mv-ui-design-book .mv-model-refs-picker {
  flex: 0 0 auto;
  margin-bottom: 0;
}
.mv-ui-design-book .mv-ui-design-canvas-slot {
  flex: 1 1 auto;
  min-height: 0;
}
.mv-model-refs-panel {
  margin-top: 2px;
}
.mv-model-refs-orphans-block {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}
.mv-model-refs-orphans-block .mv-model-refs-orph {
  display: block;
  word-break: break-all;
}
.mv-model-refs-orphans-block .mv-model-refs-orph + .mv-model-refs-orph {
  margin-top: 4px;
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
.canvas-root--embedded .mv-view-shell--mindmap-canvas {
  flex: 1 1 auto;
  min-height: 0;
}
.canvas-root--embedded .mv-view-shell--mindmap-canvas .mv-class-canvas-wrap {
  flex: 1 1 auto;
  min-height: 0;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}
.canvas-root--embedded .mv-view-shell--mindmap-canvas .mv-class-canvas-wrap :deep(.mmc) {
  flex: 1 1 auto;
  min-height: 0;
}
.canvas-root--embedded .mv-view-shell--ui-design-canvas {
  flex: 1 1 auto;
  min-height: 0;
}
.canvas-root--embedded .mv-view-shell--ui-design-canvas .mv-class-canvas-wrap {
  flex: 1 1 auto;
  min-height: 0;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}
.canvas-root--embedded .mv-view-shell--ui-design-canvas .mv-class-canvas-wrap :deep(.ui-design-canvas) {
  flex: 1 1 auto;
  min-height: 0;
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
.model-sql-surface :deep(.canvas-hint) {
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
.mv-title-row {
  display: grid;
  grid-template-columns: auto minmax(220px, 1fr);
  align-items: center;
  column-gap: 10px;
}
.mv-title-row .wide {
  width: 100%;
}
.mv-title-row-label {
  white-space: nowrap;
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
