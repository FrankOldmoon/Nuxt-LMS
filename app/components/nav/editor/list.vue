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
import type { FlatNode } from './index.vue'
import NavEditorItem from './item.vue'

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

// ==================== 折叠状态 ====================

const collapsedKeys = ref(new Set<string>())

/** 判断某节点是否有子节点（下一项 depth 更深） */
function hasChildren(key: string): boolean {
  const idx = items.value.findIndex((i) => i._key === key)
  if (idx === -1 || idx >= items.value.length - 1) return false
  return items.value[idx + 1]!.depth > items.value[idx]!.depth
}

function toggleCollapse(key: string) {
  const next = new Set(collapsedKeys.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  collapsedKeys.value = next
}

/** 过滤掉被折叠父节点的子项 */
const visibleItems = computed(() => {
  const result: FlatNode[] = []
  for (const item of items.value) {
    // 检查是否在某折叠节点的后代中
    let hidden = false
    for (let i = result.length - 1; i >= 0; i--) {
      const ancestor = result[i]!
      if (ancestor.depth < item.depth && collapsedKeys.value.has(ancestor._key)) {
        hidden = true
        break
      }
    }
    if (!hidden) result.push(item)
  }
  return result
})

/** 可见列表索引 → 原始列表索引 */
function originalIndex(visibleIdx: number): number {
  const visible = visibleItems.value
  if (visibleIdx >= visible.length) return visibleIdx
  return items.value.findIndex((i) => i._key === visible[visibleIdx]?._key)
}

/** 拖拽更新：将可见列表的变更映射回原始列表 */
function onVisibleUpdate(newVisible: FlatNode[]) {
  const newItems = [...items.value]
  // 用 _key 匹配，按可见列表顺序重排
  const keyOrder = newVisible.map((v) => v._key)
  newItems.sort((a, b) => keyOrder.indexOf(a._key) - keyOrder.indexOf(b._key))
  emit('update:modelValue', newItems)
}

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
