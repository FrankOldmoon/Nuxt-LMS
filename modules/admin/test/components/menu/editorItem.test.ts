/**
 * menu/EditorItem.vue 组件测试
 * @see modules/admin/components/menu/EditorItem.vue
 *
 * 菜单编辑器单行：折叠/展开 + 拖拽手柄 + 标签预览 + 可见开关 + 操作按钮
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  USwitch: {
    template: '<div class="uswitch" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
    props: ['modelValue', 'title'],
  },
  MenuEditorItemActions: { template: '<div class="menu-editor-item-actions" />', props: ['item', 'index', 'maxDepth'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('menu/EditorItem.vue', () => {
  const sampleItem = {
    _key: 0,
    table: 'users',
    label: 'Users',
    visible: true,
    icon: 'i-lucide-users',
    depth: 0,
  }

  it('渲染标签', async () => {
    const { default: EditorItem } = await import('../../../components/menu/EditorItem.vue')
    const wrapper = mount(EditorItem, {
      props: { item: sampleItem, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Users')
  })

  it('depth 应用到 padding 样式', async () => {
    const { default: EditorItem } = await import('../../../components/menu/EditorItem.vue')
    const wrapper = mount(EditorItem, {
      props: { item: { ...sampleItem, depth: 2 }, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    const container = wrapper.find('.flex.items-center.gap-1')
    expect(container.attributes('style')).toContain('padding-left: 44px')
  })

  it('hasChildren=true 时渲染折叠按钮', async () => {
    const { default: EditorItem } = await import('../../../components/menu/EditorItem.vue')
    const wrapper = mount(EditorItem, {
      props: { item: sampleItem, index: 0, maxDepth: 2, hasChildren: true },
      global: _globalConfig,
    })
    // 折叠按钮是 <button> 元素（带 title 属性）
    const collapseBtn = wrapper.find('button[title]')
    expect(collapseBtn.exists()).toBe(true)
  })

  it('hasChildren=false 时不渲染折叠按钮', async () => {
    const { default: EditorItem } = await import('../../../components/menu/EditorItem.vue')
    const wrapper = mount(EditorItem, {
      props: { item: sampleItem, index: 0, maxDepth: 2, hasChildren: false },
      global: _globalConfig,
    })
    // 无子节点时折叠按钮位置是 <span class="shrink-0 w-4" />
    const spacer = wrapper.find('span.shrink-0.w-4')
    expect(spacer.exists()).toBe(true)
  })

  it('点击标签按钮 emit openEdit', async () => {
    const { default: EditorItem } = await import('../../../components/menu/EditorItem.vue')
    const wrapper = mount(EditorItem, {
      props: { item: sampleItem, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    // 标签预览是第二个 <button>（flex-1 min-w-0 text-left truncate）
    const labelBtn = wrapper.find('button.flex-1')
    await labelBtn.trigger('click')
    expect(wrapper.emitted('openEdit')).toBeTruthy()
    expect(wrapper.emitted('openEdit')![0]).toEqual([0])
  })

  it('label 为空时显示占位文本', async () => {
    const { default: EditorItem } = await import('../../../components/menu/EditorItem.vue')
    const wrapper = mount(EditorItem, {
      props: { item: { ...sampleItem, label: '' }, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.menu.placeholder')
  })

  it('visible=false 时标签带 line-through 样式', async () => {
    const { default: EditorItem } = await import('../../../components/menu/EditorItem.vue')
    const wrapper = mount(EditorItem, {
      props: { item: { ...sampleItem, visible: false }, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    const labelBtn = wrapper.find('button.flex-1')
    expect(labelBtn.classes()).toContain('line-through')
  })
})
