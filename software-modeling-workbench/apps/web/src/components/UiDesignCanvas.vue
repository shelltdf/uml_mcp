<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import CanvasView from '../uisvg/components/CanvasView.vue';
import { formatSvgXmlForSave, stripEditorCanvasChromeFromMarkup } from '../uisvg/lib/uisvgDocument';
import { normalizeUiDesignPayloadFromFence } from '../uisvg/uiDesignPayload';
import { useUisvgCanvasHost } from '../uisvg/composables/useUisvgCanvasHost';
import type { UiDesignDockCommand, UiDesignDockState } from '../uisvg/uiDesignDockTypes';

export type { UiDesignDockCommand, UiDesignDockState };

const props = defineProps<{
  modelValue: string;
  canvasId: string;
  dockCommand?: UiDesignDockCommand | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'ui-design-dock-state': [ctx: UiDesignDockState];
}>();

const svgMarkup = ref('');
const selectedIds = ref<string[]>([]);
const canvasRef = ref<InstanceType<typeof CanvasView> | null>(null);
const syncingFromProp = ref(false);

const lastDockCmdId = ref(0);

const host = useUisvgCanvasHost({
  svgMarkup,
  selectedIds,
  canvasRef,
});

const {
  alignDebugInfo,
  alignDebugNonce,
  outlineNodes,
  onCanvasPick,
  onCanvasUpdateSvg,
  onCanvasCommand,
  onPaletteDropWin,
} = host;

watch(
  () => props.modelValue,
  (v) => {
    const normalized = normalizeUiDesignPayloadFromFence(v);
    if (normalized === svgMarkup.value) return;
    syncingFromProp.value = true;
    svgMarkup.value = normalized;
    selectedIds.value = [];
    void nextTick(() => {
      canvasRef.value?.resetView?.();
      syncingFromProp.value = false;
    });
  },
  { immediate: true },
);

watch(svgMarkup, (v) => {
  if (syncingFromProp.value) return;
  const stripped = stripEditorCanvasChromeFromMarkup(v);
  const clean = formatSvgXmlForSave(stripped);
  if (clean === normalizeUiDesignPayloadFromFence(props.modelValue)) return;
  emit('update:modelValue', clean);
});

watch(
  () => ({
    svg: svgMarkup.value,
    ids: selectedIds.value.slice(),
    nodes: outlineNodes.value,
  }),
  ({ svg, ids, nodes }) => {
    emit('ui-design-dock-state', {
      svgMarkup: svg,
      selectedIds: [...ids],
      outlineNodes: nodes,
    });
  },
  { deep: true, immediate: true },
);

watch(
  () => props.dockCommand,
  (cmd) => host.handleDockCommand(cmd ?? null, lastDockCmdId),
  { deep: true },
);
</script>

<template>
  <div class="ui-design-canvas">
    <CanvasView
      ref="canvasRef"
      :svg-markup="svgMarkup"
      :selected-ids="selectedIds"
      :show-selection-debug="false"
      :align-debug-info="alignDebugInfo"
      :align-debug-nonce="alignDebugNonce"
      @pick="onCanvasPick"
      @update-svg="onCanvasUpdateSvg"
      @canvas-command="onCanvasCommand"
      @palette-drop-win="onPaletteDropWin"
    />
  </div>
</template>

<style scoped>
.ui-design-canvas {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #e8ecf4;
}

.ui-design-canvas :deep(.canvas-viewport) {
  flex: 1;
  min-height: 0;
}
</style>
