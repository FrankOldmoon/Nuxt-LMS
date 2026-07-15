import type { FlatNode } from './useNavEditor'

interface NavListEditorProps {
  modelValue: FlatNode[]
  maxDepth: number
  genKey: () => number
}

/**
 * Navigation list editor: flat tree drag-and-drop sorting + collapse + add/delete nodes
 */
export function useNavListEditor(props: NavListEditorProps, emit: (e: 'update:modelValue', items: FlatNode[]) => void) {
  const items = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val),
  })

  const collapsedKeys = ref(new Set<string>())

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

  const visibleItems = computed(() => {
    const result: FlatNode[] = []
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

  function originalIndex(visibleIdx: number): number {
    const visible = visibleItems.value
    if (visibleIdx >= visible.length) return visibleIdx
    return items.value.findIndex((i) => i._key === visible[visibleIdx]?._key)
  }

  function onVisibleUpdate(newVisible: FlatNode[]) {
    const newItems = [...items.value]
    const keyOrder = newVisible.map((v) => v._key)
    newItems.sort((a, b) => keyOrder.indexOf(a._key) - keyOrder.indexOf(b._key))
    emit('update:modelValue', newItems)
  }

  let dragTargetKey: string | null = null

  function getBlockEnd(startIdx: number): number {
    const depth = items.value[startIdx]!.depth
    let end = startIdx
    for (let i = startIdx + 1; i < items.value.length; i++) {
      if (items.value[i]!.depth <= depth) break
      end = i
    }
    return end
  }

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

  return {
    visibleItems, collapsedKeys,
    hasChildren, toggleCollapse, originalIndex, onVisibleUpdate,
    checkMove, onDragStart, onDragEnd,
    addRootItem, addSibling, addChild, deleteItem,
  }
}
