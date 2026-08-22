/**
 * useNavListEditor composable 测试
 * @see modules/lms/composables/useNavListEditor.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

function makeFlatNode(_key: string, id: string, label: string, to: string, depth: number, isNew = false) {
  return { _key, id, label, to, depth, isNew }
}

describe('composables/useNavListEditor', () => {
  it('visibleItems 初始返回全部 items', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'B', '/b', 1),
      makeFlatNode('k2', '3', 'C', '/c', 0),
    ])
    const emit = () => {}
    const { visibleItems } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 0 }, emit)
    expect(visibleItems.value).toHaveLength(3)
  })

  it('toggleCollapse 切换折叠状态', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'B', '/b', 1),
    ])
    const { collapsedKeys, toggleCollapse, visibleItems } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 0 }, () => {})
    expect(visibleItems.value).toHaveLength(2)
    toggleCollapse('k0')
    expect(collapsedKeys.value.has('k0')).toBe(true)
    // 折叠后子项隐藏
    expect(visibleItems.value).toHaveLength(1)
    expect(visibleItems.value[0]._key).toBe('k0')
    toggleCollapse('k0')
    expect(collapsedKeys.value.has('k0')).toBe(false)
    expect(visibleItems.value).toHaveLength(2)
  })

  it('hasChildren 检测是否有子节点', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'B', '/b', 1),
      makeFlatNode('k2', '3', 'C', '/c', 0),
    ])
    const { hasChildren } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 0 }, () => {})
    expect(hasChildren('k0')).toBe(true)
    expect(hasChildren('k1')).toBe(false)
    expect(hasChildren('k2')).toBe(false)
  })

  it('addRootItem 添加根节点', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref<any[]>([
      makeFlatNode('k0', '1', 'A', '/a', 0),
    ])
    let emitted: any[] = []
    const { addRootItem } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 1 }, (e, val) => { emitted = val })
    addRootItem()
    expect(emitted).toHaveLength(2)
    expect(emitted[1].depth).toBe(0)
    expect(emitted[1].isNew).toBe(true)
  })

  it('addChild 在指定节点后添加子节点', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref< any[]>([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'B', '/b', 0),
    ])
    let emitted: any[] = []
    const { addChild } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 1 }, (e, val) => { emitted = val })
    addChild(0)
    expect(emitted).toHaveLength(3)
    expect(emitted[1].depth).toBe(1)
    expect(emitted[1].isNew).toBe(true)
  })

  it('deleteItem 删除节点及其子节点', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref<any[]>([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'B', '/b', 1),
      makeFlatNode('k2', '3', 'C', '/c', 0),
    ])
    let emitted: any[] = []
    const { deleteItem } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 0 }, (e, val) => { emitted = val })
    deleteItem(0)
    // 删除 k0 及其子节点 k1
    expect(emitted).toHaveLength(1)
    expect(emitted[0]._key).toBe('k2')
  })

  it('originalIndex 映射 visible 到原始 index', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'B', '/b', 1),
      makeFlatNode('k2', '3', 'C', '/c', 0),
    ])
    const { originalIndex, toggleCollapse } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 0 }, () => {})
    toggleCollapse('k0')
    // visibleItems: [k0, k2] → originalIndex(0) = 0, originalIndex(1) = 2
    expect(originalIndex(0)).toBe(0)
    expect(originalIndex(1)).toBe(2)
  })

  it('折叠前面的兄弟节点不影响后面节点的子节点显示（修复：点击展开无效）', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'A.1', '/a1', 1),
      makeFlatNode('k2', '3', 'B', '/b', 0),
      makeFlatNode('k3', '4', 'B.1', '/b1', 1),
    ])
    const { visibleItems, toggleCollapse } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 0 }, () => {})
    toggleCollapse('k0')
    // 只隐藏 A 的子节点 A.1，B.1 依然可见
    expect(visibleItems.value.map((i) => i._key)).toEqual(['k0', 'k2', 'k3'])
    // 再折叠 B，B.1 才隐藏
    toggleCollapse('k2')
    expect(visibleItems.value.map((i) => i._key)).toEqual(['k0', 'k2'])
  })

  it('嵌套层级：折叠中间层只隐藏其后代', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'A.1', '/a1', 1),
      makeFlatNode('k2', '3', 'A.1.1', '/a11', 2),
      makeFlatNode('k3', '4', 'A.2', '/a2', 1),
      makeFlatNode('k4', '5', 'B', '/b', 0),
    ])
    const { visibleItems, toggleCollapse } = useNavListEditor({ modelValue: items.value, maxDepth: 3, genKey: () => 0 }, () => {})
    toggleCollapse('k1')
    expect(visibleItems.value.map((i) => i._key)).toEqual(['k0', 'k1', 'k3', 'k4'])
  })

  describe('checkMove', () => {
    it('只允许同级拖拽', async () => {
      const { useNavListEditor } = await import('../../composables/useNavListEditor')
      const items = ref([
        makeFlatNode('k0', '1', 'A', '/a', 0),
        makeFlatNode('k1', '2', 'A.1', '/a1', 1),
        makeFlatNode('k2', '3', 'B', '/b', 0),
      ])
      const { checkMove } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 0 }, () => {})
      const mk = (dragged: any, related: any, willInsertAfter = false) => ({
        draggedContext: { element: dragged },
        relatedContext: { element: related },
        willInsertAfter,
      })
      expect(checkMove(mk(items.value[0], items.value[2]))).toBe(true)
      expect(checkMove(mk(items.value[0], items.value[1]))).toBe(false)
      expect(checkMove(mk(items.value[1], items.value[2]))).toBe(false)
      expect(checkMove({ draggedContext: {}, relatedContext: {} })).toBe(false)
    })

    it('禁止插入到展开的父子节点之间（避免子节点被抢走）', async () => {
      const { useNavListEditor } = await import('../../composables/useNavListEditor')
      const items = ref([
        makeFlatNode('k0', '1', 'A', '/a', 0),
        makeFlatNode('k1', '2', 'A.1', '/a1', 1),
        makeFlatNode('k2', '3', 'B', '/b', 0),
      ])
      const { checkMove, toggleCollapse } = useNavListEditor({ modelValue: items.value, maxDepth: 2, genKey: () => 0 }, () => {})
      const mk = (dragged: any, related: any, willInsertAfter: boolean) => ({
        draggedContext: { element: dragged },
        relatedContext: { element: related },
        willInsertAfter,
      })
      // A 展开且有子节点：插到 A 之后被禁止
      expect(checkMove(mk(items.value[2], items.value[0], true))).toBe(false)
      // A 折叠后：插到 A 之后允许（作为 A 的下一个同级）
      toggleCollapse('k0')
      expect(checkMove(mk(items.value[2], items.value[0], true))).toBe(true)
    })
  })

  describe('拖拽整体移动', () => {
    it('拖拽父节点时整棵子树一起移动', async () => {
      const { useNavListEditor } = await import('../../composables/useNavListEditor')
      const items = ref([
        makeFlatNode('k0', '1', 'A', '/a', 0),
        makeFlatNode('k1', '2', 'A.1', '/a1', 1),
        makeFlatNode('k2', '3', 'B', '/b', 0),
        makeFlatNode('k3', '4', 'B.1', '/b1', 1),
      ])
      let emitted: any[] = []
      const { onDragStart, checkMove, onVisibleUpdate, onDragEnd } = useNavListEditor(
        { modelValue: items.value, maxDepth: 2, genKey: () => 0 },
        (e, val) => { emitted = val },
      )
      // 把 B（含子节点 B.1）拖到 A 前面：可见下标 2 → 0
      onDragStart({ oldIndex: 2 })
      expect(checkMove({
        draggedContext: { element: items.value[2] },
        relatedContext: { element: items.value[0] },
        willInsertAfter: false,
      })).toBe(true)
      onVisibleUpdate([items.value[2], items.value[0], items.value[1], items.value[3]])
      expect(emitted.map((i: any) => i._key)).toEqual(['k2', 'k3', 'k0', 'k1'])
      onDragEnd()
    })

    it('存在折叠节点时，隐藏子节点不会跳到列表开头', async () => {
      const { useNavListEditor } = await import('../../composables/useNavListEditor')
      const items = ref([
        makeFlatNode('k0', '1', 'A', '/a', 0),
        makeFlatNode('k1', '2', 'A.1', '/a1', 1),
        makeFlatNode('k2', '3', 'B', '/b', 0),
        makeFlatNode('k3', '4', 'B.1', '/b1', 1),
        makeFlatNode('k4', '5', 'C', '/c', 0),
      ])
      let emitted: any[] = []
      const { onDragStart, checkMove, onVisibleUpdate, toggleCollapse } = useNavListEditor(
        { modelValue: items.value, maxDepth: 2, genKey: () => 0 },
        (e, val) => { emitted = val },
      )
      toggleCollapse('k0') // A.1 隐藏
      // 把 C（可见下标 3）拖到 B 前面
      onDragStart({ oldIndex: 3 })
      expect(checkMove({
        draggedContext: { element: items.value[4] },
        relatedContext: { element: items.value[2] },
        willInsertAfter: false,
      })).toBe(true)
      onVisibleUpdate([items.value[0], items.value[4], items.value[2], items.value[3]])
      // A.1 保持在 A 之后，而不是跳到列表开头
      expect(emitted.map((i: any) => i._key)).toEqual(['k0', 'k1', 'k4', 'k2', 'k3'])
    })

    it('拖拽折叠的父节点时，隐藏子节点跟随移动', async () => {
      const { useNavListEditor } = await import('../../composables/useNavListEditor')
      const items = ref([
        makeFlatNode('k0', '1', 'A', '/a', 0),
        makeFlatNode('k1', '2', 'A.1', '/a1', 1),
        makeFlatNode('k2', '3', 'B', '/b', 0),
      ])
      let emitted: any[] = []
      const { onDragStart, checkMove, onVisibleUpdate, toggleCollapse, collapsedKeys } = useNavListEditor(
        { modelValue: items.value, maxDepth: 2, genKey: () => 0 },
        (e, val) => { emitted = val },
      )
      toggleCollapse('k0') // A 折叠，A.1 隐藏
      // 把 A 拖到 B 之后（B 是叶子，允许）
      onDragStart({ oldIndex: 0 })
      expect(checkMove({
        draggedContext: { element: items.value[0] },
        relatedContext: { element: items.value[2] },
        willInsertAfter: true,
      })).toBe(true)
      onVisibleUpdate([items.value[2], items.value[0]])
      expect(emitted.map((i: any) => i._key)).toEqual(['k2', 'k0', 'k1'])
      // 折叠状态保持
      expect(collapsedKeys.value.has('k0')).toBe(true)
    })

    it('无拖拽状态时还原原顺序', async () => {
      const { useNavListEditor } = await import('../../composables/useNavListEditor')
      const items = ref([
        makeFlatNode('k0', '1', 'A', '/a', 0),
        makeFlatNode('k1', '2', 'B', '/b', 0),
      ])
      let emitted: any[] = []
      const { onVisibleUpdate } = useNavListEditor(
        { modelValue: items.value, maxDepth: 2, genKey: () => 0 },
        (e, val) => { emitted = val },
      )
      onVisibleUpdate([items.value[1], items.value[0]])
      expect(emitted.map((i: any) => i._key)).toEqual(['k0', 'k1'])
    })
  })

  it('addChild 对折叠父节点自动展开', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref<any[]>([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'A.1', '/a1', 1),
      makeFlatNode('k2', '3', 'B', '/b', 0),
    ])
    let emitted: any[] = []
    const { addChild, toggleCollapse, collapsedKeys } = useNavListEditor(
      { modelValue: items.value, maxDepth: 2, genKey: () => 9 },
      (e, val) => { emitted = val },
    )
    toggleCollapse('k0')
    addChild(0)
    // 新子节点插在 A 的子节点末尾
    expect(emitted.map((i: any) => i._key)).toEqual(['k0', 'k1', 'k-9', 'k2'])
    expect(emitted[2].depth).toBe(1)
    // A 被自动展开
    expect(collapsedKeys.value.has('k0')).toBe(false)
  })

  it('deleteItem 清理被删节点的折叠状态', async () => {
    const { useNavListEditor } = await import('../../composables/useNavListEditor')
    const items = ref<any[]>([
      makeFlatNode('k0', '1', 'A', '/a', 0),
      makeFlatNode('k1', '2', 'A.1', '/a1', 1),
      makeFlatNode('k2', '3', 'B', '/b', 0),
    ])
    let emitted: any[] = []
    const { deleteItem, toggleCollapse, collapsedKeys } = useNavListEditor(
      { modelValue: items.value, maxDepth: 2, genKey: () => 0 },
      (e, val) => { emitted = val },
    )
    toggleCollapse('k0')
    deleteItem(0)
    expect(emitted.map((i: any) => i._key)).toEqual(['k2'])
    expect(collapsedKeys.value.has('k0')).toBe(false)
  })
})
