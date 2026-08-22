import type { FlatNode } from './useNavEditor'

interface NavListEditorProps {
  modelValue: FlatNode[]
  maxDepth: number
  genKey: () => number
}

interface MoveInfo {
  relatedKey: string
  willInsertAfter: boolean
}

/**
 * 导航列表编辑器：扁平树拖拽排序 + 折叠 + 增删节点
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

  // 只沿真正的祖先链判断：任一祖先被折叠才隐藏（不能扫描全部前置节点）
  const visibleItems = computed(() => {
    const result: FlatNode[] = []
    const ancestors: FlatNode[] = []
    for (const item of items.value) {
      while (ancestors.length > 0 && ancestors[ancestors.length - 1]!.depth >= item.depth) {
        ancestors.pop()
      }
      const hidden = ancestors.some((a) => collapsedKeys.value.has(a._key))
      if (!hidden) {
        result.push(item)
        ancestors.push(item)
      }
    }
    return result
  })

  function originalIndex(visibleIdx: number): number {
    const visible = visibleItems.value
    if (visibleIdx >= visible.length) return visibleIdx
    return items.value.findIndex((i) => i._key === visible[visibleIdx]?._key)
  }

  // ==================== 拖拽 ====================

  // 拖拽中的节点 key（start 事件记录，end 事件清除）
  let dragTargetKey: string | null = null
  // 最后一次被允许的落点（checkMove 返回 true 时记录，即最终 DOM 落点）
  let lastMoveInfo: MoveInfo | null = null

  function getBlockEnd(list: FlatNode[], startIdx: number): number {
    const depth = list[startIdx]!.depth
    let end = startIdx
    for (let i = startIdx + 1; i < list.length; i++) {
      if (list[i]!.depth <= depth) break
      end = i
    }
    return end
  }

  function checkMove(evt: any): boolean {
    const draggedItem = evt.draggedContext?.element as FlatNode | undefined
    const relatedItem = evt.relatedContext?.element as FlatNode | undefined
    if (!draggedItem || !relatedItem) return false
    // 只允许同级排序
    if (draggedItem.depth !== relatedItem.depth) return false
    // 插入到 related 之后且 related 展开并有子节点时，落点会落在 related 与其子节点之间，
    // 导致子节点被挂到被拖节点名下，禁止
    if (evt.willInsertAfter && !collapsedKeys.value.has(relatedItem._key) && hasChildren(relatedItem._key)) {
      return false
    }
    dragTargetKey = draggedItem._key
    lastMoveInfo = { relatedKey: relatedItem._key, willInsertAfter: !!evt.willInsertAfter }
    return true
  }

  function onDragStart(evt: any) {
    // evt.oldIndex 是可见列表的下标，必须从 visibleItems 取
    const item = visibleItems.value[evt.oldIndex]
    dragTargetKey = item ? item._key : null
    lastMoveInfo = null
  }

  function onVisibleUpdate(newVisible: FlatNode[]) {
    const old = items.value
    const dragIdx = dragTargetKey ? old.findIndex((i) => i._key === dragTargetKey) : -1

    if (dragIdx !== -1) {
      // 被拖节点的整棵子树（含折叠隐藏的子节点）作为整体移动
      const blockEnd = getBlockEnd(old, dragIdx)
      const block = old.slice(dragIdx, blockEnd + 1)
      const rest = old.slice(0, dragIdx).concat(old.slice(blockEnd + 1))

      let insertAt = -1
      if (lastMoveInfo) {
        const relatedIdx = rest.findIndex((i) => i._key === lastMoveInfo.relatedKey)
        if (relatedIdx !== -1) {
          // 插到 related 前；或插到 related 整棵子树之后（作为其下一个同级）
          insertAt = lastMoveInfo.willInsertAfter ? getBlockEnd(rest, relatedIdx) + 1 : relatedIdx
        }
      }
      if (insertAt === -1) {
        // 兜底：按新可见顺序中前一项的子树末尾插入
        const newIdx = newVisible.findIndex((v) => v._key === dragTargetKey)
        if (newIdx === 0) {
          insertAt = 0
        } else if (newIdx > 0) {
          const prevIdx = rest.findIndex((i) => i._key === newVisible[newIdx - 1]!._key)
          if (prevIdx !== -1) insertAt = getBlockEnd(rest, prevIdx) + 1
        }
      }
      if (insertAt >= 0 && insertAt <= rest.length) {
        emit('update:modelValue', rest.slice(0, insertAt).concat(block, rest.slice(insertAt)))
        return
      }
    }

    // 无法计算时还原原顺序（重新 emit 触发重渲染，回滚拖拽的 DOM 变化）
    emit('update:modelValue', [...old])
  }

  function onDragEnd() {
    dragTargetKey = null
    lastMoveInfo = null
  }

  // ==================== 增删 ====================

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
    const blockEnd = getBlockEnd(newItems, index)
    newItems.splice(blockEnd + 1, 0, createNewNode(depth))
    emit('update:modelValue', newItems)
  }

  function addChild(index: number) {
    const newItems = [...items.value]
    const node = newItems[index]!
    if (node.depth >= props.maxDepth) return
    const blockEnd = getBlockEnd(newItems, index)
    newItems.splice(blockEnd + 1, 0, createNewNode(node.depth + 1))
    emit('update:modelValue', newItems)
    // 父节点处于折叠状态时自动展开，让新子节点立即可见
    if (collapsedKeys.value.has(node._key)) {
      const next = new Set(collapsedKeys.value)
      next.delete(node._key)
      collapsedKeys.value = next
    }
  }

  function deleteItem(index: number) {
    const newItems = [...items.value]
    const blockEnd = getBlockEnd(newItems, index)
    const removed = newItems.splice(index, blockEnd - index + 1)
    if (removed.length > 0 && collapsedKeys.value.size > 0) {
      const next = new Set(collapsedKeys.value)
      for (const r of removed) next.delete(r._key)
      collapsedKeys.value = next
    }
    emit('update:modelValue', newItems)
  }

  return {
    visibleItems, collapsedKeys,
    hasChildren, toggleCollapse, originalIndex, onVisibleUpdate,
    checkMove, onDragStart, onDragEnd,
    addRootItem, addSibling, addChild, deleteItem,
  }
}
