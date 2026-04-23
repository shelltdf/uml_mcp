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
    <!-- uml-object：对象实例框 -->
    <g v-else-if="variant === 'uml-object'">
      <rect x="10" y="10" width="28" height="20" rx="1" fill="#fff" stroke="#334155" />
      <line x1="10" y1="16" x2="38" y2="16" stroke="#334155" />
      <rect x="50" y="20" width="28" height="20" rx="1" fill="#fff" stroke="#334155" />
      <line x1="50" y1="26" x2="78" y2="26" stroke="#334155" />
      <line x1="38" y1="20" x2="50" y2="30" stroke="#334155" />
    </g>
    <!-- uml-package：包文件夹 -->
    <g v-else-if="variant === 'uml-package'">
      <rect x="10" y="14" width="30" height="22" rx="2" fill="#f5f3ff" stroke="#6d28d9" />
      <rect x="12" y="10" width="14" height="6" rx="1" fill="#ede9fe" stroke="#7c3aed" />
      <rect x="48" y="14" width="30" height="22" rx="2" fill="#f5f3ff" stroke="#6d28d9" />
      <rect x="50" y="10" width="14" height="6" rx="1" fill="#ede9fe" stroke="#7c3aed" />
      <line x1="40" y1="25" x2="48" y2="25" stroke="#7c3aed" stroke-dasharray="2 1" />
    </g>
    <!-- uml-composite-structure：整体-部件 -->
    <g v-else-if="variant === 'uml-composite-structure'">
      <rect x="16" y="8" width="56" height="34" rx="2" fill="#fff" stroke="#0f766e" />
      <rect x="24" y="16" width="16" height="12" rx="1" fill="#ccfbf1" stroke="#0f766e" />
      <rect x="48" y="16" width="16" height="12" rx="1" fill="#ccfbf1" stroke="#0f766e" />
      <line x1="40" y1="22" x2="48" y2="22" stroke="#0f766e" />
      <circle cx="44" cy="22" r="1.8" fill="#0f766e" />
    </g>
    <!-- uml-component：组件块+接口棒棒糖 -->
    <g v-else-if="variant === 'uml-component'">
      <rect x="14" y="12" width="28" height="24" rx="2" fill="#eef2ff" stroke="#3730a3" />
      <rect x="18" y="16" width="6" height="4" fill="#c7d2fe" stroke="#3730a3" />
      <rect x="18" y="22" width="6" height="4" fill="#c7d2fe" stroke="#3730a3" />
      <rect x="52" y="14" width="22" height="20" rx="2" fill="#eef2ff" stroke="#3730a3" />
      <circle cx="49" cy="24" r="3" fill="#fff" stroke="#3730a3" />
      <line x1="42" y1="24" x2="46" y2="24" stroke="#3730a3" />
    </g>
    <!-- uml-deployment：节点+数据库 -->
    <g v-else-if="variant === 'uml-deployment'">
      <rect x="10" y="10" width="24" height="18" rx="1" fill="#ecfeff" stroke="#0e7490" />
      <rect x="16" y="6" width="24" height="18" rx="1" fill="#cffafe" stroke="#0e7490" />
      <rect x="48" y="8" width="26" height="20" rx="1" fill="#ecfeff" stroke="#0e7490" />
      <ellipse cx="61" cy="36" rx="12" ry="4" fill="#cffafe" stroke="#0e7490" />
      <rect x="49" y="36" width="24" height="8" fill="#cffafe" stroke="#0e7490" />
      <ellipse cx="61" cy="44" rx="12" ry="4" fill="#cffafe" stroke="#0e7490" />
      <line x1="40" y1="20" x2="48" y2="18" stroke="#0e7490" />
    </g>
    <!-- uml-profile：构造型标签 -->
    <g v-else-if="variant === 'uml-profile'">
      <rect x="14" y="10" width="28" height="20" rx="1" fill="#fff7ed" stroke="#c2410c" />
      <text x="28" y="22" text-anchor="middle" font-size="6" fill="#9a3412" font-family="system-ui,sans-serif">&lt;&lt;S&gt;&gt;</text>
      <rect x="48" y="22" width="26" height="20" rx="1" fill="#fff7ed" stroke="#c2410c" />
      <text x="61" y="34" text-anchor="middle" font-size="6" fill="#9a3412" font-family="system-ui,sans-serif">&lt;&lt;T&gt;&gt;</text>
      <line x1="42" y1="20" x2="48" y2="28" stroke="#c2410c" />
    </g>
    <!-- uml-usecase：参与者+椭圆 -->
    <g v-else-if="variant === 'uml-usecase'">
      <circle cx="18" cy="12" r="3" fill="#334155" />
      <line x1="18" y1="15" x2="18" y2="25" stroke="#334155" />
      <line x1="13" y1="20" x2="23" y2="20" stroke="#334155" />
      <line x1="18" y1="25" x2="14" y2="31" stroke="#334155" />
      <line x1="18" y1="25" x2="22" y2="31" stroke="#334155" />
      <ellipse cx="56" cy="24" rx="20" ry="10" fill="#f5f3ff" stroke="#7c3aed" />
      <line x1="22" y1="20" x2="36" y2="24" stroke="#334155" />
    </g>
    <!-- uml-state-machine：状态节点 -->
    <g v-else-if="variant === 'uml-state-machine'">
      <circle cx="12" cy="26" r="3" fill="#111827" />
      <rect x="24" y="16" width="18" height="12" rx="6" fill="#dcfce7" stroke="#166534" />
      <rect x="54" y="16" width="22" height="12" rx="6" fill="#dcfce7" stroke="#166534" />
      <circle cx="78" cy="26" r="4" fill="#fff" stroke="#111827" />
      <circle cx="78" cy="26" r="2.3" fill="#111827" />
      <line x1="15" y1="26" x2="24" y2="22" stroke="#166534" />
      <line x1="42" y1="22" x2="54" y2="22" stroke="#166534" />
      <line x1="76" y1="22" x2="74" y2="22" stroke="#166534" />
    </g>
    <!-- uml-communication：对象连线+编号 -->
    <g v-else-if="variant === 'uml-communication'">
      <rect x="10" y="10" width="20" height="12" rx="1" fill="#fff" stroke="#1e293b" />
      <rect x="58" y="10" width="20" height="12" rx="1" fill="#fff" stroke="#1e293b" />
      <rect x="34" y="30" width="20" height="12" rx="1" fill="#fff" stroke="#1e293b" />
      <line x1="30" y1="16" x2="58" y2="16" stroke="#1e293b" />
      <line x1="20" y1="22" x2="38" y2="30" stroke="#1e293b" />
      <line x1="68" y1="22" x2="50" y2="30" stroke="#1e293b" />
      <text x="44" y="14" text-anchor="middle" font-size="6" fill="#334155" font-family="system-ui,sans-serif">1</text>
    </g>
    <!-- uml-timing：时间轴与状态线 -->
    <g v-else-if="variant === 'uml-timing'">
      <line x1="10" y1="38" x2="78" y2="38" stroke="#0f172a" />
      <line x1="18" y1="10" x2="18" y2="42" stroke="#64748b" stroke-dasharray="2 2" />
      <line x1="52" y1="10" x2="52" y2="42" stroke="#64748b" stroke-dasharray="2 2" />
      <path d="M18 28 H36 V20 H52 V30 H70" fill="none" stroke="#2563eb" stroke-width="1.4" />
    </g>
    <!-- uml-interaction-overview：活动+交互引用 -->
    <g v-else-if="variant === 'uml-interaction-overview'">
      <circle cx="12" cy="26" r="3" fill="#22c55e" />
      <rect x="22" y="18" width="18" height="12" rx="1" fill="#ecfeff" stroke="#0891b2" />
      <rect x="48" y="18" width="22" height="12" rx="1" fill="#ede9fe" stroke="#7c3aed" />
      <text x="59" y="26" text-anchor="middle" font-size="6" fill="#6b21a8" font-family="system-ui,sans-serif">ref</text>
      <circle cx="78" cy="26" r="3" fill="#ef4444" />
      <line x1="15" y1="26" x2="22" y2="24" stroke="#334155" />
      <line x1="40" y1="24" x2="48" y2="24" stroke="#334155" />
      <line x1="70" y1="24" x2="75" y2="24" stroke="#334155" />
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
