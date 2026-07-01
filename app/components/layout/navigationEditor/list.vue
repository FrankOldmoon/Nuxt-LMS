<template>
  <draggable
    :model-value="items"
    item-key="_key"
    handle=".drag-handle"
    :move="checkMove"
    ghost-class="ghost"
    tag="div"
    class="space-y-1.5"
    @update:model-value="$emit('update:modelValue', $event)"
    @start="onDragStart"
    @end="onDragEnd"
  >
    <template #item="{ element: item, index }">
      <NavigationEditorItem
        :item="item"
        :index="index"
        :max-depth="maxDepth"
        @add-child="addChild"
        @add-sibling="addSibling"
        @delete="deleteItem"
      />
    </template>
  </draggable>

  <!-- 添加根级目录 -->
  <UButton
    icon="i-lucide-plus"
    color="primary"
    variant="outline"
    size="xs"
    block
    @click="addRootItem"
  >
    {{ $t('navEditor.addRoot') }}
  </UButton>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import type { FlatNode } from './index.vue'
import NavigationEditorItem from './item.vue'

const props = defineProps<{
  modelValue: FlatNode[]
  maxDepth: number
  genKey: () => number
}>()

const emit = defineEmits<{
  'update:modelValue': [items: FlatNode[]]
}>()

const items = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// 拖拽时记录被拖拽元素的 _key，用于 end 事件中定位
let dragTargetKey: string | null = null

// ==================== 辅助函数 ====================

function getBlockEnd(startIdx: number): number {
  const depth = items.value[startIdx]!.depth
  let end = startIdx
  for (let i = startIdx + 1; i < items.value.length; i++) {
    if (items.value[i]!.depth <= depth) break
    end = i
  }
  return end
}

// ==================== 拖拽排序 ====================

function checkMove(evt: any): boolean {
  const draggedItem = evt.draggedContext.element as FlatNode
  const relatedItem = evt.relatedContext.element as FlatNode
  return draggedItem.depth === relatedItem.depth
}

function onDragStart(evt: any) {
  dragTargetKey = items.value[evt.oldIndex]!._key
}

function onDragEnd(evt: any) {
  const { oldIndex, newIndex } = evt
  if (oldIndex === undefined || newIndex === undefined) return
  if (oldIndex === newIndex) {
    dragTargetKey = null
    return
  }

  const list = items.value
  const movedDepth = list[newIndex]!.depth

  let childrenStart = newIndex > oldIndex ? oldIndex : oldIndex + 1
  let childCount = 0
  while (
    childrenStart + childCount < list.length &&
    list[childrenStart + childCount]!.depth > movedDepth
  ) {
    childCount++
  }

  if (childCount > 0) {
    const newItems = [...list]
    const children = newItems.splice(childrenStart, childCount)
    const parentIdx = newItems.findIndex((i) => i._key === dragTargetKey)
    if (parentIdx !== -1) {
      newItems.splice(parentIdx + 1, 0, ...children)
    }
    emit('update:modelValue', newItems)
  }

  dragTargetKey = null
}

// ==================== 增删操作 ====================

function createNewNode(depth: number): FlatNode {
  return {
    _key: 'k-' + props.genKey(),
    id: 'new-' + props.genKey(),
    label: '',
    to: '',
    depth,
    isNew: true,
  }
}

function addRootItem() {
  emit('update:modelValue', [...items.value, createNewNode(0)])
}

function addSibling(index: number) {
  const newItems = [...items.value]
  const depth = newItems[index]!.depth
  const blockEnd = getBlockEnd(index)
  newItems.splice(blockEnd + 1, 0, createNewNode(depth))
  emit('update:modelValue', newItems)
}

function addChild(index: number) {
  const newItems = [...items.value]
  const depth = newItems[index]!.depth
  if (depth >= props.maxDepth) return
  const blockEnd = getBlockEnd(index)
  newItems.splice(blockEnd + 1, 0, createNewNode(depth + 1))
  emit('update:modelValue', newItems)
}

function deleteItem(index: number) {
  const newItems = [...items.value]
  const blockEnd = getBlockEnd(index)
  const count = blockEnd - index + 1
  newItems.splice(index, count)
  emit('update:modelValue', newItems)
}
</script>

<style scoped>
:deep(.ghost) {
  opacity: 0.5;
  background: #c8ebfb;
}
</style>
