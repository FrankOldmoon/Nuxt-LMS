<template>
  <draggable :model-value="visibleItems" item-key="_key" handle=".drag-handle" :move="checkMove" ghost-class="ghost" tag="div"
    class="space-y-0.5" @update:model-value="onVisibleUpdate" @start="onDragStart" @end="onDragEnd">
    <template #item="{ element: item, index }">
      <NavEditorItem :item="item" :index="originalIndex(index)" :max-depth="maxDepth"
        :has-children="hasChildren(item._key)" :collapsed="collapsedKeys.has(item._key)"
        @add-child="addChild" @add-sibling="addSibling" @delete="deleteItem"
        @toggle-collapse="toggleCollapse(item._key)" />
    </template>
  </draggable>

  <!-- 添加根级目录 -->
  <UButton icon="i-lucide-plus" color="primary" variant="outline" size="xs" block @click="addRootItem">
    {{ $t('navEditor.addRoot') }}
  </UButton>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import type { FlatNode } from '../../composables/useNavEditor'
import NavEditorItem from './item.vue'

const props = defineProps<{
  modelValue: FlatNode[]
  maxDepth: number
  genKey: () => number
}>()

const emit = defineEmits<{
  'update:modelValue': [items: FlatNode[]]
}>()

const {
  visibleItems, collapsedKeys,
  hasChildren, toggleCollapse, originalIndex, onVisibleUpdate,
  checkMove, onDragStart, onDragEnd,
  addRootItem, addSibling, addChild, deleteItem,
} = useNavListEditor(props, emit)
</script>

<style scoped>
:deep(.ghost) {
  opacity: 0.5;
  background: #c8ebfb;
}
</style>
