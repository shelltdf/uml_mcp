<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  /** 光标在 Markdown 源码中的字符偏移（用于联动属性 Dock） */
  (e: 'caretOffset', offset: number): void;
}>();

const host = ref<HTMLDivElement | null>(null);
let vditor: Vditor | null = null;
let rafCaret = 0;
let onSelChange: (() => void) | null = null;
/** 挂载时绑定的 wysiwyg 根，供卸载时移除监听（destroy 后 DOM 可能已无效） */
let wysiwygBoundRoot: HTMLElement | null = null;

function getWysiwygRoot(): HTMLElement | null {
  return host.value?.querySelector('.vditor-wysiwyg') ?? null;
}

function emitCaretOffsetFromWysiwyg() {
  if (!vditor || !host.value) return;
  const root = getWysiwygRoot();
  if (!root) return;
  const sel = document.getSelection();
  if (!sel?.rangeCount || !sel.anchorNode || !root.contains(sel.anchorNode)) {
    return;
  }
  const internal = vditor as unknown as {
    vditor?: { lute?: { VditorDOM2Md: (html: string) => string } };
  };
  const lute = internal.vditor?.lute;
  if (!lute?.VditorDOM2Md) return;
  try {
    const liveRange = sel.getRangeAt(0);
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(liveRange.startContainer, liveRange.startOffset);
    const frag = range.cloneContents();
    const wrap = document.createElement('div');
    wrap.appendChild(frag);
    let prefixLen = lute.VditorDOM2Md(wrap.innerHTML).length;
    const full = vditor.getValue();
    if (prefixLen > full.length) prefixLen = full.length;
    emit('caretOffset', prefixLen);
  } catch {
    /* VditorDOM2Md 在部分 DOM 片段上可能失败，忽略本次 */
  }
}

function scheduleEmitCaretOffset() {
  cancelAnimationFrame(rafCaret);
  rafCaret = requestAnimationFrame(() => {
    rafCaret = 0;
    emitCaretOffsetFromWysiwyg();
  });
}

onMounted(() => {
  void nextTick(() => {
    if (!host.value) return;
    vditor = new Vditor(host.value, {
      mode: 'wysiwyg',
      value: props.modelValue,
      lang: 'zh_CN',
      cache: { enable: false, id: `smw-vditor-${Date.now()}` },
      minHeight: 280,
      height: '100%',
      placeholder: '在此编辑 Markdown（所见即所得）…',
      resize: { enable: true, position: 'bottom' },
      input: (v) => {
        emit('update:modelValue', v);
        scheduleEmitCaretOffset();
      },
      toolbar: [
        'emoji',
        'headings',
        'bold',
        'italic',
        'strike',
        'link',
        '|',
        'list',
        'ordered-list',
        'check',
        'outdent',
        'indent',
        '|',
        'quote',
        'line',
        'code',
        'inline-code',
        'insert-before',
        'insert-after',
        '|',
        'table',
        '|',
        'undo',
        'redo',
      '|',
      'fullscreen',
      ],
    });
    void nextTick(() => {
      wysiwygBoundRoot = getWysiwygRoot();
      if (wysiwygBoundRoot) {
        wysiwygBoundRoot.addEventListener('keyup', scheduleEmitCaretOffset);
        wysiwygBoundRoot.addEventListener('mouseup', scheduleEmitCaretOffset);
        wysiwygBoundRoot.addEventListener('click', scheduleEmitCaretOffset);
      }
      onSelChange = () => scheduleEmitCaretOffset();
      document.addEventListener('selectionchange', onSelChange);
      scheduleEmitCaretOffset();
    });
  });
});

watch(
  () => props.modelValue,
  (md) => {
    if (!vditor) return;
    try {
      if (vditor.getValue() === md) return;
      vditor.setValue(md, true);
    } catch {
      /* 销毁过程中可能抛错 */
    }
    void nextTick(() => scheduleEmitCaretOffset());
  },
);

onBeforeUnmount(() => {
  if (onSelChange) document.removeEventListener('selectionchange', onSelChange);
  onSelChange = null;
  cancelAnimationFrame(rafCaret);
  if (wysiwygBoundRoot) {
    wysiwygBoundRoot.removeEventListener('keyup', scheduleEmitCaretOffset);
    wysiwygBoundRoot.removeEventListener('mouseup', scheduleEmitCaretOffset);
    wysiwygBoundRoot.removeEventListener('click', scheduleEmitCaretOffset);
    wysiwygBoundRoot = null;
  }
  try {
    vditor?.destroy();
  } catch {
    /* noop */
  }
  vditor = null;
});

/** 在光标处插入 Markdown（wysiwyg）；由主窗口「插入代码块」等调用 */
function insertMarkdown(fragment: string) {
  if (!vditor || !fragment) return;
  try {
    vditor.insertValue(fragment);
    emit('update:modelValue', vditor.getValue());
  } catch {
    /* 销毁或未就绪 */
  }
}

defineExpose({ insertMarkdown });
</script>

<template>
  <div ref="host" class="vditor-host" />
</template>

<style scoped>
.vditor-host {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.vditor-host :deep(.vditor) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.vditor-host :deep(.vditor-toolbar) {
  flex-shrink: 0;
}

.vditor-host :deep(.vditor-content) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* Vditor 默认给 wysiwyg 下围栏 pre 设 height:100%，在 flex 里会把块压扁并出现块内滚动条；改为随内容增高，由 .vditor-content 统一滚动 */
.vditor-host :deep(.vditor-wysiwyg > .vditor-reset) {
  overflow: visible !important;
}
.vditor-host :deep(.vditor-wysiwyg pre.vditor-reset > code),
.vditor-host :deep(.vditor-wysiwyg__block pre > code) {
  overflow: visible !important;
  max-height: none !important;
}

/* 围栏代码块：明显边界，便于识别与点击选择（wysiwyg 下块级 pre） */
.vditor-host :deep(.vditor-wysiwyg pre.vditor-reset) {
  height: auto !important;
  min-height: 0;
  overflow: visible !important;
  border: 2px solid #64748b;
  border-radius: 8px;
  padding: 10px 12px !important;
  margin: 14px 0 !important;
  background: #f1f5f9 !important;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
  box-sizing: border-box;
}

.vditor-host :deep(.vditor-wysiwyg pre.vditor-reset:focus),
.vditor-host :deep(.vditor-wysiwyg pre.vditor-reset:focus-within) {
  border-color: #2563eb;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.22);
}

.vditor-host :deep(.vditor-wysiwyg pre.vditor-reset[contenteditable='false']) {
  border-color: #94a3b8;
  border-style: dashed;
  opacity: 0.85;
}
</style>
