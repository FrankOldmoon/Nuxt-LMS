/**
 * useMenuListEditor composable 测试
 * @see modules/admin/composables/useMenuListEditor.ts
 *
 * 菜单列表编辑：折叠状态、拖拽排序、增删改
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

type FlatMenuItem = {
  _key: number
  label: string
  visible: boolean
  depth: number
  table?: string
  icon?: string
  to?: string
}

function makeItems(): FlatMenuItem[] {
  return [
    { _key: 0, label: 'A', visible: true, depth: 0, table: 'a' },
    { _key: 1, label: 'A1', visible: true, depth: 1, table: 'a1' },
    { _key: 2, label: 'A2', visible: true, depth: 1, table: 'a2' },
    { _key: 3, label: 'B', visible: true, depth: 0, table: 'b' },
  ]
}

function setup(items: FlatMenuItem[] = makeItems()) {
  let current = [...items]
  const update = vi.fn((newItems: FlatMenuItem[]) => { current = newItems })
  let keyCounter = 100
  const genKey = () => keyCounter++
  return {
    getModelValue: () => current,
    update,
    genKey,
  }
}

describe('composables/useMenuListEditor', () => {
  it('items 反映 modelValue', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { items } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    expect(items.value).toHaveLength(4)
  })

  it('hasChildren: 最后一项无子节点', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { hasChildren } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    expect(hasChildren(0)).toBe(true)  // A 有 A1/A2
    expect(hasChildren(1)).toBe(false) // A1 无子节点
    expect(hasChildren(3)).toBe(false) // B（最后一项）无子节点
  })

  it('toggleCollapse 切换折叠状态', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { toggleCollapse, visibleItems } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    expect(visibleItems.value).toHaveLength(4)
    toggleCollapse(0) // 折叠 A 的子项
    expect(visibleItems.value).toHaveLength(2) // 只剩 A 和 B
    toggleCollapse(0) // 展开
    expect(visibleItems.value).toHaveLength(4)
  })

  it('addRootItem 添加 depth=0 的新项', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { addRootItem } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    addRootItem()
    expect(ctx.update).toHaveBeenCalled()
    const newItems = ctx.update.mock.calls[0][0]
    expect(newItems).toHaveLength(5)
    expect(newItems[4].depth).toBe(0)
    expect(newItems[4]._key).toBeGreaterThanOrEqual(100)
  })

  it('addSibling 在同级添加兄弟项', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { addSibling } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    addSibling(1) // A1 的兄弟
    const newItems = ctx.update.mock.calls[0][0]
    expect(newItems).toHaveLength(5)
    // 新项 depth 应与 A1 相同（=1）
    const newItem = newItems.find((i: FlatMenuItem) => i._key >= 100)
    expect(newItem!.depth).toBe(1)
  })

  it('addChild 在子级添加子项', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { addChild } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    addChild(0) // A 的子项
    const newItems = ctx.update.mock.calls[0][0]
    expect(newItems).toHaveLength(5)
    const newItem = newItems.find((i: FlatMenuItem) => i._key >= 100)
    expect(newItem!.depth).toBe(1)
  })

  it('addChild 超过 maxDepth 时不添加', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { addChild } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 1)
    addChild(1) // A1 depth=1, maxDepth=1 → 不添加
    expect(ctx.update).not.toHaveBeenCalled()
  })

  it('deleteItem 删除项及其子树', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { deleteItem } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    deleteItem(0) // 删除 A 及其子项 A1/A2
    const newItems = ctx.update.mock.calls[0][0]
    expect(newItems).toHaveLength(1) // 只剩 B
    expect(newItems[0].label).toBe('B')
  })

  it('updateVisible 更新指定项的 visible', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { updateVisible } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    updateVisible(0, false)
    const newItems = ctx.update.mock.calls[0][0]
    expect(newItems[0].visible).toBe(false)
  })

  it('checkMove: 只允许同 depth 拖拽', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { checkMove } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    expect(checkMove({ draggedContext: { element: { depth: 0 } }, relatedContext: { element: { depth: 0 } } })).toBe(true)
    expect(checkMove({ draggedContext: { element: { depth: 0 } }, relatedContext: { element: { depth: 1 } } })).toBe(false)
  })

  it('onVisibleUpdate 按可见顺序重排原始列表', async () => {
    const { useMenuListEditor } = await import('../../composables/useMenuListEditor')
    const ctx = setup()
    const { onVisibleUpdate } = useMenuListEditor(ctx.getModelValue, ctx.update, ctx.genKey, () => 3)
    const items = ctx.getModelValue()
    // 反转顺序
    const reversed = [...items].reverse()
    onVisibleUpdate(reversed)
    const newItems = ctx.update.mock.calls[0][0]
    expect(newItems[0].label).toBe('B')
    expect(newItems[3].label).toBe('A')
  })
})
