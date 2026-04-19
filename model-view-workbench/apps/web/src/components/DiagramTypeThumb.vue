<script setup lang="ts">
import { ref } from 'vue';

/** 插入代码块对话框用：示意性缩略图（非真实渲染） */
defineProps<{ variant: string }>();
/** 避免同页多个 SVG 的 marker id 冲突 */
const markerId = ref(`dtt-arr-${Math.random().toString(36).slice(2, 11)}`);
</script>

<template>
  <svg class="dtt" viewBox="0 0 88 52" aria-hidden="true" focusable="false">
    <!-- mv-model-sql：多表 Model 组 -->
    <g v-if="variant === 'mv-model-sql'">
      <rect x="6" y="10" width="34" height="28" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="1" />
      <line x1="6" y1="17" x2="40" y2="17" stroke="#64748b" stroke-width="0.8" />
      <line x1="20" y1="10" x2="20" y2="38" stroke="#94a3b8" stroke-width="0.6" />
      <rect x="48" y="10" width="34" height="28" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="1" />
      <line x1="48" y1="17" x2="82" y2="17" stroke="#64748b" stroke-width="0.8" />
      <line x1="62" y1="10" x2="62" y2="38" stroke="#94a3b8" stroke-width="0.6" />
    </g>
    <!-- mv-model-kv：文档卡片叠放 -->
    <g v-else-if="variant === 'mv-model-kv'">
      <rect x="12" y="8" width="56" height="22" rx="2" fill="#ecfdf5" stroke="#059669" stroke-width="1" />
      <rect x="18" y="14" width="56" height="22" rx="2" fill="#d1fae5" stroke="#047857" stroke-width="1" />
      <text x="46" y="28" text-anchor="middle" font-size="9" fill="#065f46" font-family="system-ui,sans-serif">KV</text>
    </g>
    <!-- mv-model-struct：树块 -->
    <g v-else-if="variant === 'mv-model-struct'">
      <rect x="36" y="6" width="40" height="14" rx="2" fill="#fef3c7" stroke="#b45309" stroke-width="1" />
      <rect x="10" y="26" width="32" height="14" rx="2" fill="#fffbeb" stroke="#d97706" stroke-width="1" />
      <rect x="48" y="26" width="32" height="14" rx="2" fill="#fffbeb" stroke="#d97706" stroke-width="1" />
      <path d="M56 20 L56 24 M26 26 L26 24 M64 26 L64 24" stroke="#b45309" stroke-width="1" fill="none" />
    </g>
    <!-- mv-model-codespace：根目录 + 子文件夹 -->
    <g v-else-if="variant === 'mv-model-codespace'">
      <rect x="30" y="4" width="52" height="12" rx="1" fill="#e0e7ff" stroke="#4338ca" stroke-width="1" />
      <text x="56" y="12" text-anchor="middle" font-size="6" fill="#312e81" font-family="system-ui,sans-serif">root</text>
      <rect x="8" y="22" width="34" height="22" rx="2" fill="#eef2ff" stroke="#6366f1" stroke-width="1" />
      <rect x="46" y="22" width="34" height="22" rx="2" fill="#eef2ff" stroke="#6366f1" stroke-width="1" />
      <path d="M44 16 L26 22 M44 16 L62 22" stroke="#4338ca" stroke-width="0.8" fill="none" />
    </g>
    <!-- mv-model-interface：Client — API → Server -->
    <g v-else-if="variant === 'mv-model-interface'">
      <defs>
        <marker :id="markerId" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#0d9488" />
        </marker>
      </defs>
      <rect x="6" y="14" width="28" height="24" rx="2" fill="#ecfdf5" stroke="#059669" stroke-width="1" />
      <text x="20" y="28" text-anchor="middle" font-size="7" fill="#065f46" font-family="system-ui,sans-serif">C</text>
      <rect x="54" y="14" width="28" height="24" rx="2" fill="#fff7ed" stroke="#ea580c" stroke-width="1" />
      <text x="68" y="28" text-anchor="middle" font-size="7" fill="#9a3412" font-family="system-ui,sans-serif">S</text>
      <path
        :marker-end="`url(#${markerId})`"
        d="M34 26 L54 26"
        stroke="#0d9488"
        stroke-width="1.4"
        fill="none"
      />
      <text x="44" y="22" text-anchor="middle" font-size="6" fill="#115e59" font-family="system-ui,sans-serif">API</text>
    </g>
    <!-- mermaid-*：共用示意（类框 + 连线） -->
    <g v-else-if="variant.startsWith('mermaid-')">
      <rect x="8" y="8" width="32" height="22" rx="2" fill="#dbeafe" stroke="#2563eb" stroke-width="1" />
      <rect x="48" y="22" width="32" height="22" rx="2" fill="#dbeafe" stroke="#2563eb" stroke-width="1" />
      <path :marker-end="`url(#${markerId})`" d="M40 19 L48 33" stroke="#2563eb" stroke-width="1.5" fill="none" />
      <defs>
        <marker :id="markerId" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#2563eb" />
        </marker>
      </defs>
    </g>
    <!-- mindmap：中心 + 分支 -->
    <g v-else-if="variant === 'mindmap-ui'">
      <circle cx="44" cy="26" r="10" fill="#fef3c7" stroke="#d97706" stroke-width="1.2" />
      <line x1="44" y1="16" x2="44" y2="6" stroke="#d97706" stroke-width="1.5" />
      <line x1="52" y1="26" x2="78" y2="20" stroke="#d97706" stroke-width="1.5" />
      <line x1="36" y1="26" x2="10" y2="32" stroke="#d97706" stroke-width="1.5" />
      <circle cx="44" cy="4" r="3" fill="#fde68a" stroke="#b45309" />
      <circle cx="80" cy="18" r="3" fill="#fde68a" stroke="#b45309" />
    </g>
    <!-- uml-class -->
    <g v-else-if="variant === 'uml-class'">
      <rect x="14" y="8" width="28" height="36" rx="1" fill="#fff" stroke="#0f172a" stroke-width="1.2" />
      <line x1="14" y1="18" x2="42" y2="18" stroke="#0f172a" />
      <line x1="14" y1="24" x2="42" y2="24" stroke="#94a3b8" stroke-dasharray="2 1" />
      <rect x="50" y="14" width="26" height="24" rx="1" fill="#fff" stroke="#0f172a" stroke-width="1" />
      <path d="M42 26 L50 26" stroke="#0f172a" stroke-width="1" />
    </g>
    <!-- uml-sequence：竖生命线 -->
    <g v-else-if="variant === 'uml-sequence'">
      <rect x="8" y="6" width="18" height="8" rx="1" fill="#e0e7ff" stroke="#4338ca" />
      <rect x="52" y="6" width="18" height="8" rx="1" fill="#e0e7ff" stroke="#4338ca" />
      <line x1="17" y1="14" x2="17" y2="44" stroke="#6366f1" stroke-dasharray="3 2" />
      <line x1="61" y1="14" x2="61" y2="44" stroke="#6366f1" stroke-dasharray="3 2" />
      <path d="M17 22 Q38 28 61 24" stroke="#4338ca" stroke-width="1.2" fill="none" />
    </g>
    <!-- uml-activity：泳道/菱形感 -->
    <g v-else-if="variant === 'uml-activity'">
      <circle cx="44" cy="10" r="3" fill="#22c55e" />
      <rect x="38" y="16" width="12" height="10" rx="1" fill="#dcfce7" stroke="#15803d" />
      <path d="M44 26 L44 32" stroke="#15803d" stroke-width="1.2" />
      <polygon points="44,36 50,44 38,44" fill="#fef9c3" stroke="#a16207" stroke-width="1" />
      <circle cx="44" cy="48" r="3" fill="#ef4444" />
    </g>
    <!-- uml-diagram 通用 -->
    <g v-else-if="variant === 'uml-diagram'">
      <rect x="6" y="6" width="76" height="40" rx="3" fill="#faf5ff" stroke="#7c3aed" stroke-width="1" />
      <text x="44" y="32" text-anchor="middle" font-size="11" fill="#6b21a8" font-family="system-ui,sans-serif">UML</text>
    </g>
    <!-- ui-design：线框矩形 -->
    <g v-else-if="variant === 'ui-design'">
      <rect x="8" y="8" width="72" height="36" rx="2" fill="#fff" stroke="#0ea5e9" stroke-width="1.2" />
      <rect x="12" y="12" width="24" height="6" rx="1" fill="#bae6fd" />
      <rect x="40" y="12" width="36" height="28" rx="1" fill="#f0f9ff" stroke="#38bdf8" />
      <rect x="44" y="18" width="28" height="4" rx="0.5" fill="#e0f2fe" />
      <rect x="44" y="26" width="20" height="4" rx="0.5" fill="#e0f2fe" />
    </g>
    <g v-else>
      <rect x="8" y="10" width="72" height="32" rx="4" fill="#f1f5f9" stroke="#64748b" />
    </g>
  </svg>
</template>

<style scoped>
.dtt {
  display: block;
  width: 100%;
  max-height: 52px;
}
</style>
