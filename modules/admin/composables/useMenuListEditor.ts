import type { FlatMenuItem } from '../components/menu/EditorItem.vue'

/**
 * Menu list editing: manages collapse state, drag sorting, add/delete/modify of flat list
 * All based on "flat array + depth" model, notifies parent via update callback
 */
export function useMenuListEditor(
  modelValue: () => FlatMenuItem[],
  update: (items: FlatMenuItem[]) => void,
  genKey: () => number,
  maxDepth: () => number,
) {
  const items = computed(modelValue)

  // ==================== Collapse state ====================
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

  /** Filter out child items of collapsed parent nodes */
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

  /** Visible list index → original list index */
  function originalIndex(visibleIdx: number): number {
    const visible = visibleItems.value
    if (visibleIdx >= visible.length) return -1
    return items.value.findIndex((i) => i._key === visible[visibleIdx]?._key)
  }

  // ==================== Helper: subtree end index (exclusive) ====================
  function getBlockEnd(startIdx: number): number {
    const depth = items.value[startIdx]!.depth
    let end = startIdx
    for (let i = startIdx + 1; i < items.value.length; i++) {
      if (items.value[i]!.depth <= depth) break
      end = i
    }
    return end
  }

  // ==================== Drag sorting (same level only; rearrange children to follow parent on end) ====================
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
    const keyOrder = newVisible.map((v) => v._key)
    const newItems = [...items.value]
    newItems.sort((a, b) => keyOrder.indexOf(a._key) - keyOrder.indexOf(b._key))
    update(newItems)
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
      update(newItems)
    }

    dragTargetKey = null
  }

  // ==================== Add/delete / modify ====================
  function createNewNode(depth: number): FlatMenuItem {
    return {
      _key: genKey(),
      label: '',
      visible: true,
      depth,
    }
  }

  function addRootItem() {
    update([...items.value, createNewNode(0)])
  }

  function addSibling(index: number) {
    if (index < 0 || index >= items.value.length) return
    const newItems = [...items.value]
    const depth = newItems[index]!.depth
    const blockEnd = getBlockEnd(index)
    newItems.splice(blockEnd + 1, 0, createNewNode(depth))
    update(newItems)
  }

  function addChild(index: number) {
    if (index < 0 || index >= items.value.length) return
    const depth = items.value[index]!.depth
    if (depth >= maxDepth()) return
    const newItems = [...items.value]
    const blockEnd = getBlockEnd(index)
    newItems.splice(blockEnd + 1, 0, createNewNode(depth + 1))
    update(newItems)
  }

  function deleteItem(index: number) {
    if (index < 0 || index >= items.value.length) return
    const newItems = [...items.value]
    const blockEnd = getBlockEnd(index)
    const count = blockEnd - index + 1
    newItems.splice(index, count)
    update(newItems)
  }

  function updateVisible(index: number, v: boolean) {
    if (index < 0 || index >= items.value.length) return
    const newItems = [...items.value]
    newItems[index] = { ...newItems[index]!, visible: v }
    update(newItems)
  }

  return {
    items,
    visibleItems,
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
  }
}
