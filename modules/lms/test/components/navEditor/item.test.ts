/**
 * navEditor/item.vue 组件测试
 * @see modules/lms/components/navEditor/item.vue
 *
 * 导航项行：折叠/展开 + 拖拽手柄 + 标签编辑 + 操作按钮
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" :data-name="name" />', props: ['name'] },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'size', 'placeholder'],
  },
  UButton: {
    template: '<button class="ubutton" :data-disabled="disabled" :title="title" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'variant', 'size', 'color', 'title', 'disabled'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('navEditor/item.vue', () => {
  const sampleItem = {
    _key: 'k1',
    id: '1',
    label: '第一章',
    to: '/course/1/1',
    depth: 0,
    isNew: false,
  }

  it('渲染标签', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: sampleItem, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    const input = wrapper.find('.uinput')
    expect(input.exists()).toBe(true)
    // UInput stub 渲染为原生 <input>，DOMWrapper 没有 .props()，用 element.value
    expect((input.element as HTMLInputElement).value).toBe('第一章')
  })

  it('depth 应用到 padding 样式', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: { ...sampleItem, depth: 2 }, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    const container = wrapper.find('.flex.items-center.gap-1')
    expect(container.exists()).toBe(true)
    // depth=2 → paddingLeft: 2*20+4 = 44px
    expect(container.attributes('style')).toContain('padding-left: 44px')
  })

  it('hasChildren=true 时渲染折叠按钮', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: sampleItem, index: 0, maxDepth: 2, hasChildren: true, collapsed: false },
      global: _globalConfig,
    })
    // 折叠按钮存在
    const collapseBtn = wrapper.find('button.shrink-0')
    expect(collapseBtn.exists()).toBe(true)
  })

  it('hasChildren=false 时不渲染折叠按钮', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: sampleItem, index: 0, maxDepth: 2, hasChildren: false },
      global: _globalConfig,
    })
    const collapseBtn = wrapper.find('button.shrink-0')
    expect(collapseBtn.exists()).toBe(false)
  })

  it('点击折叠按钮 emit toggleCollapse', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: sampleItem, index: 0, maxDepth: 2, hasChildren: true, collapsed: false },
      global: _globalConfig,
    })
    const collapseBtn = wrapper.find('button.shrink-0')
    await collapseBtn.trigger('click')
    expect(wrapper.emitted('toggleCollapse')).toBeTruthy()
  })

  it('点击添加子项按钮 emit addChild', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: sampleItem, index: 3, maxDepth: 2 },
      global: _globalConfig,
    })
    // 操作按钮区有 3 个按钮：addChild, addSibling, delete
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons.length).toBe(3)
    await buttons[0]!.trigger('click')
    expect(wrapper.emitted('addChild')).toBeTruthy()
    expect(wrapper.emitted('addChild')![0]).toEqual([3])
  })

  it('点击添加兄弟项按钮 emit addSibling', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: sampleItem, index: 3, maxDepth: 2 },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('addSibling')).toBeTruthy()
    expect(wrapper.emitted('addSibling')![0]).toEqual([3])
  })

  it('点击删除按钮 emit delete', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: sampleItem, index: 3, maxDepth: 2 },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    await buttons[2]!.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([3])
  })

  it('depth >= maxDepth 时不渲染添加子项按钮', async () => {
    const { default: NavEditorItem } = await import('../../../components/navEditor/item.vue')
    const wrapper = mount(NavEditorItem, {
      props: { item: { ...sampleItem, depth: 2 }, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    // depth=2, maxDepth=2 → 不渲染 addChild，只剩 addSibling + delete
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons.length).toBe(2)
  })
})
