<script setup lang="ts">
import { computed } from 'vue'
import SvgDomTreeItem from './SvgDomTreeItem.vue'
import { parseSvgDomTree, resolveDomElementId } from '../lib/uisvgDocument'

const props = defineProps<{
  svgMarkup: string
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const tree = computed(() => parseSvgDomTree(props.svgMarkup))
const resolvedDomId = computed(() => resolveDomElementId(props.svgMarkup, props.selectedId))
</script>

<template>
  <div class="svg-dom-tree" role="tree" aria-label="SVG 文档结构">
    <div v-if="!tree" class="tree-empty">无法解析 SVG</div>
    <SvgDomTreeItem
      v-else
      :node="tree"
      :depth="0"
      :resolved-dom-id="resolvedDomId"
      @select="emit('select', $event)"
    />
  </div>
</template>

<style scoped>
.svg-dom-tree {
  font-size: 11px;
}

.tree-empty {
  padding: 8px;
  color: #707070;
  font-size: 12px;
}
</style>
