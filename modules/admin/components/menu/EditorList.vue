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
import MenuEditorItem from './EditorItem.vue'

const props = defineProps<{
  modelValue: FlatMenuItem[]
  maxDepth: number
  genKey: () => number
}>()

const emit = defineEmits<{
  'update:modelValue': [items: FlatMenuItem[]]
  openEdit: [index: number]
}>()

const { t } = useI18n()

const items = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// ==================== 折叠状态 ====================
const collapsedKeys = ref<Set<number>>(new Set())

function hasChildren(key: number): boolean {
  const idx = items.value.findIndex((i) => i._key === key)
  if (idx === -1 || idx >= items.value.length - 1) return false
  return items.value[idx + 1]!.depth > items.value[idx]!.depth
}

function toggleCollapse(key: number) {
  const next = new Set(collapsedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedKeys.value = next
}

/** 过滤掉被折叠父节点的子项 */
const visibleItems = computed(() => {
  const result: FlatMenuItem[] = []
  for (const item of items.value) {
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
  if (visibleIdx >= visible.length) return -1
  return items.value.findIndex((i) => i._key === visible[visibleIdx]?._key)
}

// ==================== 辅助：子树结束下标（exclusive） ====================
function getBlockEnd(startIdx: number): number {
  const depth = items.value[startIdx]!.depth
  let end = startIdx
  for (let i = startIdx + 1; i < items.value.length; i++) {
    if (items.value[i]!.depth <= depth) break
    end = i
  }
  return end
}

// ==================== 拖拽排序（仅同层级；end 时把子节点跟随父节点重排） ====================
function checkMove(evt: any): boolean {
  const dragged = evt.draggedContext.element as FlatMenuItem
  const related = evt.relatedContext.element as FlatMenuItem
  return dragged.depth === related.depth
}

let dragTargetKey: number | null = null

function onDragStart(evt: any) {
  dragTargetKey = items.value[evt.oldIndex]!._key
}

function onVisibleUpdate(newVisible: FlatMenuItem[]) {
  // 把可见列表顺序映射回原始列表
  const keyOrder = newVisible.map((v) => v._key)
  const newItems = [...items.value]
  newItems.sort((a, b) => keyOrder.indexOf(a._key) - keyOrder.indexOf(b._key))
  emit('update:modelValue', newItems)
}

function onDragEnd(evt: any) {
  const { oldIndex, newIndex } = evt
  if (oldIndex === undefined || newIndex === undefined) {
    dragTargetKey = null
    return
  }
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

// ==================== 增删 / 修改 ====================
function createNewNode(depth: number): FlatMenuItem {
  return {
    _key: props.genKey(),
    label: '',
    visible: true,
    depth,
  }
}

function addRootItem() {
  emit('update:modelValue', [...items.value, createNewNode(0)])
}

function addSibling(index: number) {
  if (index < 0 || index >= items.value.length) return
  const newItems = [...items.value]
  const depth = newItems[index]!.depth
  const blockEnd = getBlockEnd(index)
  newItems.splice(blockEnd + 1, 0, createNewNode(depth))
  emit('update:modelValue', newItems)
}

function addChild(index: number) {
  if (index < 0 || index >= items.value.length) return
  const newItems = [...items.value]
  const depth = newItems[index]!.depth
  if (depth >= props.maxDepth) return
  const blockEnd = getBlockEnd(index)
  newItems.splice(blockEnd + 1, 0, createNewNode(depth + 1))
  emit('update:modelValue', newItems)
}

function deleteItem(index: number) {
  if (index < 0 || index >= items.value.length) return
  const newItems = [...items.value]
  const blockEnd = getBlockEnd(index)
  const count = blockEnd - index + 1
  newItems.splice(index, count)
  emit('update:modelValue', newItems)
}

function updateVisible(index: number, v: boolean) {
  if (index < 0 || index >= items.value.length) return
  const newItems = [...items.value]
  newItems[index] = { ...newItems[index]!, visible: v }
  emit('update:modelValue', newItems)
}
</script>

<style scoped>
:deep(.ghost) {
  opacity: 0.5;
  background: #c8ebfb;
}
</style>
