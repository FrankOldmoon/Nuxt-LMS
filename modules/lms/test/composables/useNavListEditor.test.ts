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
})
