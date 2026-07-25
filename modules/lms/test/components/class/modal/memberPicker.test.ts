/**
 * class/modal/memberPicker.vue 组件测试
 * @see modules/lms/components/class/modal/memberPicker.vue
 *
 * 纯展示+事件组件：搜索框 + 结果列表 + 已选标签 + 添加按钮。
 * 验证 props 传递、事件触发、选中状态渲染。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" />',
    props: ['modelValue', 'placeholder', 'icon', 'size', 'loading'],
  },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
    props: ['label', 'icon', 'size', 'color', 'variant', 'loading', 'disabled'],
  },
  UAvatar: {
    template: '<span class="avatar">{{ alt || text }}</span>',
    props: ['src', 'alt', 'text', 'size'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UBadge: {
    template: '<span class="badge"><slot name="leading" /><slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('class/modal/memberPicker.vue', () => {
  const sampleUser = { id: 1, name: 'Alice', avatarImg: null }
  const sampleUser2 = { id: 2, name: 'Bob', avatarImg: null }

  const baseProps = {
    search: '',
    searching: false,
    results: [] as any[],
    selected: [] as any[],
    adding: false,
    placeholder: 'Search...',
    addLabel: 'Add',
    addIcon: 'i-lucide-plus',
    addColor: 'primary' as const,
    badgeColor: 'info' as const,
  }

  it('渲染搜索输入框', async () => {
    const { default: MemberPicker } = await import('../../../../components/class/modal/memberPicker.vue')
    const wrapper = mount(MemberPicker, {
      props: baseProps,
      global: _globalConfig,
    })
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('渲染添加按钮（带 label）', async () => {
    const { default: MemberPicker } = await import('../../../../components/class/modal/memberPicker.vue')
    const wrapper = mount(MemberPicker, {
      props: baseProps,
      global: _globalConfig,
    })
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Add')
  })

  it('selected 为空时添加按钮禁用', async () => {
    const { default: MemberPicker } = await import('../../../../components/class/modal/memberPicker.vue')
    const wrapper = mount(MemberPicker, {
      props: { ...baseProps, selected: [] },
      global: _globalConfig,
    })
    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('selected 有数据时添加按钮启用', async () => {
    const { default: MemberPicker } = await import('../../../../components/class/modal/memberPicker.vue')
    const wrapper = mount(MemberPicker, {
      props: { ...baseProps, selected: [sampleUser] },
      global: _globalConfig,
    })
    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('输入时 emit update:search 和 search-input', async () => {
    const { default: MemberPicker } = await import('../../../../components/class/modal/memberPicker.vue')
    const wrapper = mount(MemberPicker, {
      props: baseProps,
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('test')
    expect(wrapper.emitted('update:search')).toBeTruthy()
    expect(wrapper.emitted('update:search')![0]).toEqual(['test'])
    expect(wrapper.emitted('search-input')).toBeTruthy()
  })

  it('点击结果项 emit toggle 事件', async () => {
    const { default: MemberPicker } = await import('../../../../components/class/modal/memberPicker.vue')
    const wrapper = mount(MemberPicker, {
      props: { ...baseProps, results: [sampleUser, sampleUser2] },
      global: _globalConfig,
    })
    // 找到结果列表中的可点击 div
    const resultItems = wrapper.findAll('.cursor-pointer')
    expect(resultItems.length).toBeGreaterThanOrEqual(2)
    await resultItems[0].trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')![0]).toEqual([sampleUser])
  })

  it('点击添加按钮 emit add 事件', async () => {
    const { default: MemberPicker } = await import('../../../../components/class/modal/memberPicker.vue')
    const wrapper = mount(MemberPicker, {
      props: { ...baseProps, selected: [sampleUser] },
      global: _globalConfig,
    })
    const btn = wrapper.find('button')
    await btn.trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
  })

  it('已选标签渲染', async () => {
    const { default: MemberPicker } = await import('../../../../components/class/modal/memberPicker.vue')
    const wrapper = mount(MemberPicker, {
      props: { ...baseProps, selected: [sampleUser, sampleUser2] },
      global: _globalConfig,
    })
    const badges = wrapper.findAll('.badge')
    expect(badges.length).toBe(2)
  })
})
