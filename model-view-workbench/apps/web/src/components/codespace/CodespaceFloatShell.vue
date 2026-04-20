<script setup lang="ts">
import { inject, useId } from 'vue';
import { CS_CANVAS_MSG_KEY } from '../../i18n/codespace-canvas-messages';

const csMsg = inject(CS_CANVAS_MSG_KEY)!;

defineProps<{
  open: boolean;
  title: string;
}>();

defineEmits<{
  close: [];
}>();

const titleId = `cs-float-title-${useId()}`;
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="cs-float-backdrop"
      role="presentation"
      tabindex="-1"
      @click.self="$emit('close')"
    >
      <div
        class="cs-float-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown.esc.prevent="$emit('close')"
      >
        <header class="cs-float-head">
          <h3 :id="titleId" class="cs-float-title">{{ title }}</h3>
          <button type="button" class="cs-float-close" :title="csMsg.floatCloseTitle" @click="$emit('close')">×</button>
        </header>
        <div class="cff-wrap">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cs-float-backdrop {
  position: fixed;
  inset: 0;
  z-index: 280;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 5vh 12px 24px;
  background: rgba(15, 23, 42, 0.35);
  overflow: auto;
}
.cs-float-panel {
  width: min(560px, 100%);
  max-height: min(82vh, 900px);
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px solid #94a3b8;
  background: #fff;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.22);
  outline: none;
}
.cs-float-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.cs-float-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}
.cs-float-close {
  border: none;
  background: #f1f5f9;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  color: #334155;
}
.cs-float-close:hover {
  background: #e2e8f0;
}
.cff-wrap {
  padding: 12px 14px 16px;
  overflow: auto;
  min-height: 0;
}
</style>

<style>
/* 悬浮窗内表单（与 CodespaceCanvasEditor 对齐，限定在 .cff-wrap 下） */
.cff-wrap .field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  max-width: 960px;
}
.cff-wrap .field span {
  font-size: 0.78rem;
  color: #64748b;
}
.cff-wrap .wide {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font: inherit;
}
.cff-wrap .payload-ta {
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
.cff-wrap .link-btn {
  border: none;
  background: none;
  color: #b91c1c;
  cursor: pointer;
  font-size: 0.78rem;
  text-decoration: underline;
}
.cff-wrap .add-row {
  margin-top: 12px;
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #64748b;
  background: #fff;
}
.cff-wrap .cs-subh {
  margin: 14px 0 6px;
  font-size: 0.82rem;
  color: #475569;
}
.cff-wrap .cs-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}
.cff-wrap .cs-danger {
  color: #b91c1c;
}
.cff-wrap .cs-rowline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.78rem;
}
.cff-wrap .cs-check {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cff-wrap .cs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  margin-bottom: 8px;
}
.cff-wrap .cs-table th,
.cff-wrap .cs-table td {
  border: 1px solid #e2e8f0;
  padding: 4px;
  vertical-align: middle;
}
.cff-wrap .cs-td-center {
  text-align: center;
}
</style>
