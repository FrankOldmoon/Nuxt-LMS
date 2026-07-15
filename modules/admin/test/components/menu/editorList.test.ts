/**
 * menu/EditorList.vue component tests
 * @see modules/admin/components/menu/EditorList.vue
 *
 * Menu edit list: drag sorting + add/delete/modify + add root items
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useMenuListEditor
  ;(globalThis as any).useMenuListEditor = (
    _modelValue: () => any[],
    _update: (items: any[]) => void,
    _genKey: () => number,
    _maxDepth: () => number,
  ) => {
    const items = ref(_modelValue())
    const collapsedKeys = ref(new Set<number>())
    const visibleItems = ref(items.value)

    function hasChildren(_key: number) { return false }
    function toggleCollapse(key: number) {
      const next = new Set(collapsedKeys.value)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      collapsedKeys.value = next
    }
    function originalIndex(visibleIdx: number) { return visibleIdx }
    function checkMove() { return true }
    function onDragStart() {}
    function onVisibleUpdate(newVisible: any[]) { _update(newVisible) }
    function onDragEnd() {}
    function addRootItem() {
      const newItems = [...items.value, { _key: _genKey(), label: '', visible: true, depth: 0 }]
      _update(newItems)
    }
    function addSibling(_index: number) {}
    function addChild(_index: number) {}
    function deleteItem(index: number) {
      const newItems = items.value.filter((_, i) => i !== index)
      _update(newItems)
    }
    function updateVisible(index: number, v: boolean) {
      const newItems = [...items.value]
      newItems[index] = { ...newItems[index], visible: v }
      _update(newItems)
    }

    return {
      items, visibleItems, collapsedKeys, hasChildren, toggleCollapse,
      originalIndex, checkMove, onDragStart, onVisibleUpdate, onDragEnd,
      addRootItem, addSibling, addChild, deleteItem, updateVisible,
    }
  }
})

const _globalStubs = {
  draggable: {
    template: '<div class="draggable"><slot name="item" v-for="(item, index) in modelValue" :key="item._key" :element="item" :index="index" /></div>',
    props: ['modelValue', 'itemKey', 'handle', 'move', 'ghostClass', 'tag'],
  },
  MenuEditorItem: { template: '<div class="menu-editor-item">{{ item.label }}</div>', props: ['item', 'index', 'maxDepth', 'hasChildren', 'collapsed'] },
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'label', 'block'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('menu/EditorList.vue', () => {
  const sampleItems = [
    { _key: 0, table: 'users', label: 'Users', visible: true, depth: 0 },
    { _key: 1, table: 'courses', label: 'Courses', visible: true, depth: 0 },
  ]

  it('渲染菜单项列表', async () => {
    const { default: EditorList } = await import('../../../components/menu/EditorList.vue')
    const wrapper = mount(EditorList, {
      props: { modelValue: sampleItems, maxDepth: 2, genKey: () => 0 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.findAll('.menu-editor-item').length).toBe(2)
  })

  it('渲染添加根级项按钮', async () => {
    const { default: EditorList } = await import('../../../components/menu/EditorList.vue')
    const wrapper = mount(EditorList, {
      props: { modelValue: sampleItems, maxDepth: 2, genKey: () => 0 },
      global: _globalConfig,
    })
    await flushPromises()
    const addBtn = wrapper.findAll('.ubutton').find(b => b.text().includes('admin.menu.addRoot'))
    expect(addBtn).toBeTruthy()
  })

  it('点击添加根级项按钮触发 update:modelValue', async () => {
    const { default: EditorList } = await import('../../../components/menu/EditorList.vue')
    const wrapper = mount(EditorList, {
      props: { modelValue: sampleItems, maxDepth: 2, genKey: () => 99 },
      global: _globalConfig,
    })
    await flushPromises()
    const addBtn = wrapper.findAll('.ubutton').find(b => b.text().includes('admin.menu.addRoot'))
    await addBtn!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue')!
    const newItems = emitted[emitted.length - 1]![0] as any[]
    expect(newItems.length).toBe(3)
  })

  it('空列表也能挂载', async () => {
    const { default: EditorList } = await import('../../../components/menu/EditorList.vue')
    const wrapper = mount(EditorList, {
      props: { modelValue: [], maxDepth: 2, genKey: () => 0 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.findAll('.menu-editor-item').length).toBe(0)
    // Still has add button
    expect(wrapper.findAll('.ubutton').find(b => b.text().includes('admin.menu.addRoot'))).toBeTruthy()
  })

  it('正确接收 props', async () => {
    const { default: EditorList } = await import('../../../components/menu/EditorList.vue')
    const wrapper = mount(EditorList, {
      props: { modelValue: sampleItems, maxDepth: 3, genKey: () => 0 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('maxDepth')).toBe(3)
    expect(wrapper.props('modelValue')).toStrictEqual(sampleItems)
  })
})
