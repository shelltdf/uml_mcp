<script setup lang="ts">
import type { DiagramThumbnailId } from '../lib/diagramTemplates';

defineProps<{
  diagramId: DiagramThumbnailId;
}>();
</script>

<template>
  <!-- 简约示意缩略图：与 Mermaid 图类特征对应，非真实渲染 -->
  <svg
    v-if="diagramId === 'umlSync'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="7" y="5" width="34" height="38" rx="2" stroke="currentColor" stroke-width="1.4" />
    <path d="M11 11h8M11 14h8" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" opacity="0.85" />
    <path d="M11 20h22M11 24h18M11 28h14" stroke="currentColor" stroke-width="1.1" opacity="0.45" />
    <path d="M11 34h20M11 38h16" stroke="currentColor" stroke-width="1.1" opacity="0.35" />
    <circle cx="36" cy="12" r="3" stroke="currentColor" stroke-width="1.2" opacity="0.55" />
    <path d="M34 12h4M36 10v4" stroke="currentColor" stroke-width="0.9" opacity="0.55" />
  </svg>

  <svg
    v-else-if="diagramId === 'flowchart'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4" y="17" width="11" height="14" rx="2" stroke="currentColor" stroke-width="1.5" />
    <path d="M15 24h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M21 24l-3-2.5v5l3-2.5" fill="currentColor" />
    <path
      d="M24 17h14l3 7-3 7H24z"
      stroke="currentColor"
      stroke-width="1.5"
      fill="none"
      stroke-linejoin="round"
    />
    <path d="M41 24h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M38 24l3-2.5v5l-3-2.5" fill="currentColor" />
    <rect x="4" y="36" width="20" height="8" rx="2" stroke="currentColor" stroke-width="1.2" opacity="0.65" />
  </svg>

  <svg
    v-else-if="diagramId === 'sequenceDiagram'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <line x1="12" y1="8" x2="12" y2="40" stroke="currentColor" stroke-width="1.5" />
    <line x1="36" y1="8" x2="36" y2="40" stroke="currentColor" stroke-width="1.5" />
    <rect x="8" y="6" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.2" />
    <rect x="32" y="6" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.2" />
    <path d="M12 16h20M12 16l4 3M32 16l-4 3" stroke="currentColor" stroke-width="1.3" />
    <path d="M32 24H12M32 24l-4 3M12 24l4 3" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2" />
    <path d="M12 32h18" stroke="currentColor" stroke-width="1.2" />
  </svg>

  <svg
    v-else-if="diagramId === 'classDiagram'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="8" y="10" width="32" height="28" rx="2" stroke="currentColor" stroke-width="1.5" />
    <line x1="8" y1="18" x2="40" y2="18" stroke="currentColor" stroke-width="1.2" />
    <line x1="8" y1="26" x2="40" y2="26" stroke="currentColor" stroke-width="1.2" />
    <line x1="14" y1="22" x2="26" y2="22" stroke="currentColor" stroke-width="1" opacity="0.6" />
    <line x1="14" y1="30" x2="22" y2="30" stroke="currentColor" stroke-width="1" opacity="0.6" />
    <path d="M24 38v4M20 42h8" stroke="currentColor" stroke-width="1.2" />
  </svg>

  <svg
    v-else-if="diagramId === 'stateDiagram'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="14" cy="24" r="8" stroke="currentColor" stroke-width="1.5" />
    <path d="M22 24h10l6-8h8v16h-8l-6-8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round" />
    <circle cx="38" cy="24" r="6" stroke="currentColor" stroke-width="1.5" />
    <path d="M22 28c4 6 10 8 14 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none" />
  </svg>

  <svg
    v-else-if="diagramId === 'erDiagram'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="6" y="12" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.5" />
    <line x1="9" y1="18" x2="17" y2="18" stroke="currentColor" stroke-width="1" />
    <line x1="9" y1="22" x2="17" y2="22" stroke="currentColor" stroke-width="1" />
    <path d="M20 21h8l4-4v8l-4-4h-8" stroke="currentColor" stroke-width="1.3" fill="none" />
    <rect x="32" y="14" width="12" height="16" rx="2" stroke="currentColor" stroke-width="1.5" />
    <line x1="34" y1="20" x2="42" y2="20" stroke="currentColor" stroke-width="1" />
  </svg>

  <svg
    v-else-if="diagramId === 'journey'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M8 32 Q16 12 24 28 T40 20"
      stroke="currentColor"
      stroke-width="1.8"
      fill="none"
      stroke-linecap="round"
    />
    <circle cx="8" cy="32" r="3" fill="currentColor" />
    <circle cx="24" cy="22" r="3" fill="currentColor" opacity="0.85" />
    <circle cx="40" cy="20" r="3" fill="currentColor" opacity="0.7" />
    <path d="M12 36h26" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity="0.5" />
  </svg>

  <svg
    v-else-if="diagramId === 'gantt'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <line x1="8" y1="12" x2="8" y2="36" stroke="currentColor" stroke-width="1" opacity="0.4" />
    <line x1="8" y1="12" x2="42" y2="12" stroke="currentColor" stroke-width="1" opacity="0.4" />
    <rect x="10" y="14" width="28" height="5" rx="1" fill="currentColor" opacity="0.35" />
    <rect x="10" y="22" width="18" height="5" rx="1" fill="currentColor" opacity="0.5" />
    <rect x="22" y="30" width="18" height="5" rx="1" fill="currentColor" opacity="0.65" />
    <line x1="14" y1="10" x2="14" y2="38" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 3" opacity="0.35" />
  </svg>

  <svg
    v-else-if="diagramId === 'pie'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.5" />
    <path
      d="M24 24 L24 10 A14 14 0 0 1 35 30 Z"
      fill="currentColor"
      opacity="0.4"
    />
    <path
      d="M24 24 L35 30 A14 14 0 0 1 14 38 Z"
      fill="currentColor"
      opacity="0.65"
    />
    <path d="M24 24 L14 38 A14 14 0 0 1 24 10 Z" fill="currentColor" opacity="0.25" />
  </svg>

  <svg
    v-else-if="diagramId === 'gitGraph'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" stroke-width="2" />
    <circle cx="24" cy="12" r="3.5" fill="currentColor" />
    <circle cx="24" cy="24" r="3.5" fill="currentColor" opacity="0.85" />
    <circle cx="24" cy="36" r="3.5" fill="currentColor" opacity="0.7" />
    <path d="M24 24 Q16 20 12 16M24 24 Q32 28 36 32" stroke="currentColor" stroke-width="1.5" fill="none" />
    <circle cx="12" cy="16" r="2.5" fill="currentColor" opacity="0.8" />
    <circle cx="36" cy="32" r="2.5" fill="currentColor" opacity="0.8" />
  </svg>

  <svg
    v-else-if="diagramId === 'mindmap'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="24" cy="24" r="10" stroke="currentColor" stroke-width="1.8" />
    <path d="M24 14v-6M24 34v6M14 24h-6M34 24h6" stroke="currentColor" stroke-width="1.4" />
    <circle cx="24" cy="6" r="3" fill="currentColor" opacity="0.7" />
    <circle cx="24" cy="42" r="3" fill="currentColor" opacity="0.7" />
    <circle cx="6" cy="24" r="3" fill="currentColor" opacity="0.7" />
    <circle cx="42" cy="24" r="3" fill="currentColor" opacity="0.7" />
  </svg>

  <svg
    v-else-if="diagramId === 'timeline'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <line x1="16" y1="8" x2="16" y2="40" stroke="currentColor" stroke-width="2" />
    <circle cx="16" cy="12" r="4" fill="currentColor" />
    <circle cx="16" cy="24" r="4" fill="currentColor" opacity="0.75" />
    <circle cx="16" cy="36" r="4" fill="currentColor" opacity="0.55" />
    <line x1="20" y1="12" x2="38" y2="10" stroke="currentColor" stroke-width="1.2" />
    <line x1="20" y1="24" x2="38" y2="26" stroke="currentColor" stroke-width="1.2" />
    <line x1="20" y1="36" x2="38" y2="34" stroke="currentColor" stroke-width="1.2" />
  </svg>

  <svg
    v-else-if="diagramId === 'quadrantChart'"
    class="diagram-thumb-svg"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="1.2" />
    <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" stroke-width="1.2" />
    <rect x="10" y="10" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1" opacity="0.45" />
    <rect x="26" y="10" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1" opacity="0.65" />
    <rect x="10" y="26" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1" opacity="0.35" />
    <rect x="26" y="26" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1" opacity="0.55" />
  </svg>

  <svg v-else class="diagram-thumb-svg" viewBox="0 0 48 48" aria-hidden="true">
    <rect x="10" y="10" width="28" height="28" rx="4" stroke="currentColor" stroke-width="1.5" fill="none" />
  </svg>
</template>

<style scoped>
.diagram-thumb-svg {
  display: block;
  width: 44px;
  height: 44px;
  color: inherit;
}
</style>
