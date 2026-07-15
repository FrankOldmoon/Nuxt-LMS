/**
 * navEditor/list.vue component test
 * @see modules/lms/components/navEditor/list.vue
 *
 * Nav list: draggable + add root-level button
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

// stub vuedraggable (external dependency, simplified in test environment)
vi.mock('vuedraggable', () => ({
  default: {
    name: 'Draggable',
    template: '<div class="draggable"><slot name="item" v-for="(item, idx) in modelValue" :key="item._key" :element="{ element: item, index: idx }" /></div>',
    props: ['modelValue', 'itemKey', 'handle', 'move', 'ghostClass', 'tag'],
  },
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useNavListEditor
  ;(globalThis as any).useNavListEditor = (_props: any, _emit: any) => ({
    visibleItems: ref([]),
    collapsedKeys: ref(new Set<string>()),
    hasChildren: (_key: string) => false,
    toggleCollapse: vi.fn(),
    originalIndex: (idx: number) => idx,
    onVisibleUpdate: vi.fn(),
    checkMove: () => true,
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    addRootItem: vi.fn(),
    addSibling: vi.fn(),
    addChild: vi.fn(),
    deleteItem: vi.fn(),
  })
})

const _globalStubs = {
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'label', 'block'],
  },
  NavEditorItem: { template: '<div class="nav-editor-item" />', props: ['item', 'index', 'maxDepth', 'hasChildren', 'collapsed'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('navEditor/list.vue', () => {
  const sampleItems = [
    { _key: 'k1', id: '1', label: '第一章', to: '/c/1/1', depth: 0, isNew: false },
    { _key: 'k2', id: '2', label: '第二章', to: '/c/1/2', depth: 0, isNew: false },
  ]

  it('渲染 draggable 容器', async () => {
    const { default: NavEditorList } = await import('../../../components/navEditor/list.vue')
    const wrapper = mount(NavEditorList, {
      props: { modelValue: sampleItems, maxDepth: 2, genKey: () => 0 },
      global: _globalConfig,
    })
    expect(wrapper.find('.draggable').exists()).toBe(true)
  })

  it('渲染添加根级按钮', async () => {
    const { default: NavEditorList } = await import('../../../components/navEditor/list.vue')
    const wrapper = mount(NavEditorList, {
      props: { modelValue: sampleItems, maxDepth: 2, genKey: () => 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('navEditor.addRoot')
  })

  it('点击添加根级按钮调用 addRootItem', async () => {
    const addRootMock = vi.fn()
    ;(globalThis as any).useNavListEditor = (_props: any, _emit: any) => ({
      visibleItems: ref([]), collapsedKeys: ref(new Set<string>()),
      hasChildren: () => false, toggleCollapse: vi.fn(), originalIndex: (idx: number) => idx,
      onVisibleUpdate: vi.fn(), checkMove: () => true, onDragStart: vi.fn(), onDragEnd: vi.fn(),
      addRootItem: addRootMock, addSibling: vi.fn(), addChild: vi.fn(), deleteItem: vi.fn(),
    })
    const { default: NavEditorList } = await import('../../../components/navEditor/list.vue')
    const wrapper = mount(NavEditorList, {
      props: { modelValue: sampleItems, maxDepth: 2, genKey: () => 0 },
      global: _globalConfig,
    })
    await wrapper.find('.ubutton').trigger('click')
    expect(addRootMock).toHaveBeenCalled()
  })

  it('正确接收 props', async () => {
    const { default: NavEditorList } = await import('../../../components/navEditor/list.vue')
    const wrapper = mount(NavEditorList, {
      props: { modelValue: sampleItems, maxDepth: 3, genKey: () => 1 },
      global: _globalConfig,
    })
    expect(wrapper.props('modelValue')).toEqual(sampleItems)
    expect(wrapper.props('maxDepth')).toBe(3)
  })

  it('空列表也能渲染', async () => {
    const { default: NavEditorList } = await import('../../../components/navEditor/list.vue')
    const wrapper = mount(NavEditorList, {
      props: { modelValue: [], maxDepth: 2, genKey: () => 0 },
      global: _globalConfig,
    })
    expect(wrapper.find('.draggable').exists()).toBe(true)
    expect(wrapper.find('.ubutton').exists()).toBe(true)
  })
})
