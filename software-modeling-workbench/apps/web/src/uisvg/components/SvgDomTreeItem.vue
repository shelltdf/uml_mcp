<script setup lang="ts">
import { ref } from 'vue'
import type { SvgDomTreeNode } from '../lib/uisvgDocument'
import SvgDomTreeItem from './SvgDomTreeItem.vue'

const props = defineProps<{
  node: SvgDomTreeNode
  depth: number
  resolvedDomId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const expanded = ref(true)

function onRowClick() {
  if (props.node.id) emit('select', props.node.id)
}

const isActive = () => Boolean(props.node.id && props.resolvedDomId === props.node.id)

function childKey(c: SvgDomTreeNode, i: number): string {
  return c.id ? `#${c.id}` : `${props.depth}-${i}-${c.tag}`
}
</script>

<template>
  <div class="tree-node">
    <div
      class="tree-row"
      :class="{
        active: isActive(),
        selectable: Boolean(node.id),
        muted: !node.id,
      }"
      :style="{ paddingLeft: `${8 + depth * 14}px` }"
      role="treeitem"
      :aria-selected="isActive()"
      @click="onRowClick"
    >
      <button
        v-if="node.children.length"
        type="button"
        class="twist"
        :title="expanded ? '折叠' : '展开'"
        aria-label="展开或折叠子节点"
        @click.stop="expanded = !expanded"
      >
        {{ expanded ? '▼' : '▶' }}
      </button>
      <span v-else class="twist-spacer" aria-hidden="true" />

      <span class="tree-label">
        <span class="tag">{{ node.tag }}</span>
        <span v-if="node.id" class="id-part">#{{ node.id }}</span>
        <span v-else class="no-id-hint">（无 id）</span>
      </span>
    </div>

    <div v-show="expanded && node.children.length" class="tree-children" role="group">
      <SvgDomTreeItem
        v-for="(c, i) in node.children"
        :key="childKey(c, i)"
        :node="c"
        :depth="depth + 1"
        :resolved-dom-id="resolvedDomId"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-row {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 22px;
  font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
  cursor: default;
  user-select: none;
}

.tree-row.selectable {
  cursor: pointer;
}

.tree-row.selectable:hover {
  background: var(--win-hover, #e5f3ff);
}

.tree-row.active {
  background: var(--win-active, #cce8ff);
}

.tree-row.muted .tag {
  color: #606060;
}

.twist {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 9px;
  line-height: 1;
  color: #505050;
}

.twist:hover {
  background: rgba(0, 0, 0, 0.06);
}

.twist-spacer {
  flex: 0 0 18px;
  width: 18px;
}

.tree-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag {
  color: #0d47a1;
}

.id-part {
  color: #1a1a1a;
  font-weight: 500;
}

.no-id-hint {
  font-size: 10px;
  color: #909090;
  font-style: italic;
}
</style>
