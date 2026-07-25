<template>
  <div>
    <draggable
      :model-value="visibleItems"
      item-key="_key"
      handle=".drag-handle"
      :move="checkMove"
      ghost-class="ghost"
      tag="div"
      class="space-y-0.5"
      @update:model-value="onVisibleUpdate"
      @start="onDragStart"
      @end="onDragEnd"
    >
      <template #item="{ element: item, index }">
        <MenuEditorItem
          :item="item"
          :index="originalIndex(index)"
          :max-depth="maxDepth"
          :has-children="hasChildren(item._key)"
          :collapsed="collapsedKeys.has(item._key)"
          @open-edit="$emit('openEdit', $event)"
          @add-child="addChild"
          @add-sibling="addSibling"
          @delete="deleteItem"
          @toggle-collapse="toggleCollapse(item._key)"
          @update:visible="(v: boolean) => updateVisible(originalIndex(index), v)"
        />
      </template>
    </draggable>

    <!-- 添加根级项 -->
    <UButton
      icon="i-lucide-plus"
      color="primary"
      variant="outline"
      size="xs"
      block
      class="mt-2"
      :label="$t('admin.menu.addRoot')"
      @click="addRootItem"
    />
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import type { FlatMenuItem } from './EditorItem.vue'

const props = defineProps<{
  modelValue: FlatMenuItem[]
  maxDepth: number
  genKey: () => number
}>()

const emit = defineEmits<{
  'update:modelValue': [items: FlatMenuItem[]]
  openEdit: [index: number]
}>()

const {
  visibleItems,
  collapsedKeys,
  hasChildren,
  toggleCollapse,
  originalIndex,
  checkMove,
  onDragStart,
  onVisibleUpdate,
  onDragEnd,
  addRootItem,
  addSibling,
  addChild,
  deleteItem,
  updateVisible,
} = useMenuListEditor(
  () => props.modelValue,
  (items) => emit('update:modelValue', items),
  props.genKey,
  () => props.maxDepth,
)
</script>

<style scoped>
:deep(.ghost) {
  opacity: 0.5;
  background: #c8ebfb;
}
</style>
