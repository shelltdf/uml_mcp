import { computed, nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue';
import type { CanvasViewCommand } from '../components/canvasViewCommands';
import CanvasView from '../components/CanvasView.vue';
import {
  alignUisvgObjectRoots,
  pasteUisvgClipboard,
  removeUisvgObjectRootsByLogicalIds,
  serializeUisvgClipboard,
  type AlignUisvgObjectRootsDebugOut,
  type CanvasAlignMode,
} from '../lib/canvasClipboardAlign';
import {
  appendFrame,
  appendRect,
  appendText,
  createEmptyDocument,
  getCanvasSettingsFromMarkup,
  outlineLogicalIdFromDomId,
  parseUisvgOutline,
  stripEditorCanvasChromeFromMarkup,
  UISVG_OUTLINE_ROOT_LOGICAL_ID,
  updateCanvasSettings,
  type CanvasSettings,
  type OutlineNode,
} from '../lib/uisvgDocument';
import type { UiDesignDockCommand } from '../uiDesignDockTypes';
import { BASIC_PLACEMENT_SIZE, findPlacementForNewItemWithDebug, getWindowsControlPlacementSize } from '../lib/libraryPlacement';
import { getDefaultUiPropsRecordForWinControl } from '../lib/uiObjectProperties';
import { reparentUisvgObjectInSvgString } from '../lib/svgReparent';
import { appendWindowsControl, appendWindowsControlUnderParent } from '../lib/windowsUiControls';
import { isCanvasViewCommandName } from '../uiDesignDockTypes';

const ALIGN_FROM_CMD: Partial<Record<CanvasViewCommand, CanvasAlignMode>> = {
  'align-left': 'left',
  'align-right': 'right',
  'align-hcenter': 'hcenter',
  'align-top': 'top',
  'align-bottom': 'bottom',
  'align-vcenter': 'vcenter',
};

export function useUisvgCanvasHost(opts: {
  svgMarkup: Ref<string>;
  selectedIds: Ref<string[]>;
  canvasRef: Ref<InstanceType<typeof CanvasView> | null>;
}) {
  const internalClipboard = ref('');
  const alignDebugInfo = ref('');
  const alignDebugNonce = ref(0);

  const outlineNodes = computed((): OutlineNode[] => parseUisvgOutline(opts.svgMarkup.value));

  function movableSelectedIds(): string[] {
    return opts.selectedIds.value.filter((id) => id !== UISVG_OUTLINE_ROOT_LOGICAL_ID);
  }

  function placementForNewItem(w: number, h: number) {
    const vis = opts.canvasRef.value?.getVisibleUserRect?.() ?? null;
    const canvas = getCanvasSettingsFromMarkup(opts.svgMarkup.value);
    const cw = canvas.width;
    const ch = canvas.height;
    const { x, y } = findPlacementForNewItemWithDebug(opts.svgMarkup.value, cw, ch, vis, w, h);
    return { x, y };
  }

  function selectCreatedObject(createdDomId: string) {
    if (!createdDomId.trim()) return;
    void nextTick(() => {
      const logical = outlineLogicalIdFromDomId(opts.svgMarkup.value, createdDomId);
      opts.selectedIds.value = [logical];
    });
  }

  function onPaletteDropWin(payload: {
    controlId: string;
    parentDomId: string;
    placement: { x: number; y: number };
  }) {
    let { svg, createdDomId } = appendWindowsControlUnderParent(
      opts.svgMarkup.value,
      payload.controlId,
      payload.parentDomId,
      payload.placement,
      getDefaultUiPropsRecordForWinControl(payload.controlId),
    );
    if (!createdDomId) {
      if (payload.parentDomId !== 'layer-root' && payload.controlId === 'StatusStrip') {
        return;
      }
      const sz = getWindowsControlPlacementSize(payload.controlId);
      const fallback = appendWindowsControl(
        opts.svgMarkup.value,
        payload.controlId,
        placementForNewItem(sz.w, sz.h),
        getDefaultUiPropsRecordForWinControl(payload.controlId),
      );
      svg = fallback.svg;
      createdDomId = fallback.createdDomId;
    }
    opts.svgMarkup.value = svg;
    selectCreatedObject(createdDomId);
  }

  function onCanvasCommand(cmd: CanvasViewCommand) {
    const ids = movableSelectedIds();
    if (cmd === 'delete') {
      if (!ids.length) return;
      const next = removeUisvgObjectRootsByLogicalIds(opts.svgMarkup.value, ids);
      if (next !== null) {
        opts.svgMarkup.value = next;
        opts.selectedIds.value = [];
      }
      return;
    }
    if (cmd === 'copy') {
      if (!ids.length) return;
      const json = serializeUisvgClipboard(opts.svgMarkup.value, ids);
      internalClipboard.value = json;
      void navigator.clipboard.writeText(json).catch(() => {});
      return;
    }
    if (cmd === 'paste') {
      void doPasteFromClipboard();
      return;
    }
    const mode = ALIGN_FROM_CMD[cmd];
    if (mode) {
      const dbg: AlignUisvgObjectRootsDebugOut = { text: '' };
      try {
        const next = alignUisvgObjectRoots(opts.svgMarkup.value, ids, mode, dbg);
        if (next) opts.svgMarkup.value = next;
      } finally {
        alignDebugInfo.value = `${dbg.text}`;
        alignDebugNonce.value += 1;
      }
    }
  }

  async function doPasteFromClipboard() {
    let text = internalClipboard.value;
    try {
      const c = await navigator.clipboard.readText();
      if (c && /^\s*\{/.test(c)) text = c;
    } catch {
      /* use internalClipboard */
    }
    const next = pasteUisvgClipboard(opts.svgMarkup.value, text);
    if (next) opts.svgMarkup.value = next;
  }

  function onSelectOutline(id: string) {
    opts.selectedIds.value = [id];
  }

  function onOutlineFrameInView(id: string) {
    opts.selectedIds.value = [id];
    nextTick(() => {
      opts.canvasRef.value?.frameOutlineIdInView(id);
    });
  }

  function onOutlineReparent(payload: { childId: string; parentId: string }) {
    if (opts.canvasRef.value?.reparentFromOutline(payload.childId, payload.parentId)) return;
    const next = reparentUisvgObjectInSvgString(opts.svgMarkup.value, payload.childId, payload.parentId);
    if (next) opts.svgMarkup.value = next;
  }

  function onCanvasPick(ids: string[]) {
    opts.selectedIds.value = [...ids];
  }

  function onCanvasUpdateSvg(s: string) {
    opts.svgMarkup.value = stripEditorCanvasChromeFromMarkup(s);
  }

  function onAddBasic(id: 'rect' | 'text' | 'frame') {
    if (id === 'rect') {
      const { w, h } = BASIC_PLACEMENT_SIZE.rect;
      const { svg, createdDomId } = appendRect(opts.svgMarkup.value, placementForNewItem(w, h));
      opts.svgMarkup.value = svg;
      selectCreatedObject(createdDomId);
    } else if (id === 'text') {
      const { w, h } = BASIC_PLACEMENT_SIZE.text;
      const { svg, createdDomId } = appendText(opts.svgMarkup.value, placementForNewItem(w, h));
      opts.svgMarkup.value = svg;
      selectCreatedObject(createdDomId);
    } else {
      const { w, h } = BASIC_PLACEMENT_SIZE.frame;
      const { svg, createdDomId } = appendFrame(opts.svgMarkup.value, placementForNewItem(w, h));
      opts.svgMarkup.value = svg;
      selectCreatedObject(createdDomId);
    }
  }

  function onAddWindows(controlId: string) {
    const sz = getWindowsControlPlacementSize(controlId);
    const { svg, createdDomId } = appendWindowsControl(
      opts.svgMarkup.value,
      controlId,
      placementForNewItem(sz.w, sz.h),
      getDefaultUiPropsRecordForWinControl(controlId),
    );
    opts.svgMarkup.value = svg;
    selectCreatedObject(createdDomId);
  }

  function applyCanvasSettingsFromDialog(s: CanvasSettings) {
    opts.svgMarkup.value = updateCanvasSettings(opts.svgMarkup.value, s);
  }

  function onDataSelectedId(id: string | null) {
    opts.selectedIds.value = id ? [id] : [];
  }

  function handleDockCommand(cmd: UiDesignDockCommand | null | undefined, lastCmdId: Ref<number>) {
    if (!cmd || cmd.id <= lastCmdId.value) return;
    lastCmdId.value = cmd.id;
    const p = cmd.payload ?? '';
    switch (cmd.action) {
      case 'outline-select':
        onSelectOutline(p);
        break;
      case 'outline-frame':
        onOutlineFrameInView(p);
        break;
      case 'outline-reparent':
        try {
          const o = JSON.parse(p) as { childId?: string; parentId?: string };
          if (o.childId && o.parentId) onOutlineReparent({ childId: o.childId, parentId: o.parentId });
        } catch {
          /* ignore */
        }
        break;
      case 'add-basic':
        if (p === 'rect' || p === 'text' || p === 'frame') onAddBasic(p);
        break;
      case 'add-windows':
        if (p) onAddWindows(p);
        break;
      case 'update-svg':
        opts.svgMarkup.value = stripEditorCanvasChromeFromMarkup(p);
        break;
      case 'update-selected-id':
        onDataSelectedId(p.trim() ? p : null);
        break;
      case 'canvas-command':
        if (isCanvasViewCommandName(p)) onCanvasCommand(p);
        break;
      default:
        break;
    }
  }

  function isEditableKeyTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    if (t.isContentEditable) return true;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function onDocumentKeydown(e: KeyboardEvent) {
    if (isEditableKeyTarget(e.target)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onCanvasCommand('delete');
      return;
    }
    if (mod && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      onCanvasCommand('copy');
      return;
    }
    if (mod && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      void doPasteFromClipboard();
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', onDocumentKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', onDocumentKeydown);
  });

  return {
    outlineNodes,
    internalClipboard,
    alignDebugInfo,
    alignDebugNonce,
    onPaletteDropWin,
    onCanvasCommand,
    onCanvasPick,
    onCanvasUpdateSvg,
    onSelectOutline,
    onOutlineFrameInView,
    onOutlineReparent,
    placementForNewItem,
    handleDockCommand,
    applyCanvasSettingsFromDialog,
    resetToEmpty: () => {
      opts.svgMarkup.value = createEmptyDocument();
      opts.selectedIds.value = [];
    },
  };
}
