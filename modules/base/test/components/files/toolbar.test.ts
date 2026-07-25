/**
 * FilesToolbar 组件测试
 * @see modules/base/components/files/toolbar.vue
 *
 * 文件列表工具栏：搜索 + 排序 + 刷新
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'keydown.enter\')" />',
    props: ['modelValue', 'placeholder', 'icon', 'size'],
    emits: ['update:modelValue', 'keydown.enter'],
  },
  USelect: {
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
    emits: ['update:modelValue'],
  },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['icon', 'color', 'variant', 'size', 'label'],
    emits: ['click'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

const _sortOptions = [
  { label: '时间', value: 'createdAt' },
  { label: '大小', value: 'size' },
  { label: '名称', value: 'name' },
]

describe('files/toolbar.vue', () => {
  it('渲染搜索框、排序选择和按钮', async () => {
    const { default: FilesToolbar } = await import('../../../components/files/toolbar.vue')
    const wrapper = mount(FilesToolbar, {
      props: { keyword: '', sortBy: 'createdAt', sortOptions: _sortOptions, orderIcon: 'i-lucide-arrow-down' },
      global: _globalConfig,
    })
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.findAll('button').length).toBe(2) // order + refresh
  })

  it('渲染排序选项', async () => {
    const { default: FilesToolbar } = await import('../../../components/files/toolbar.vue')
    const wrapper = mount(FilesToolbar, {
      props: { keyword: '', sortBy: 'createdAt', sortOptions: _sortOptions, orderIcon: 'i-lucide-arrow-down' },
      global: _globalConfig,
    })
    expect(wrapper.findAll('option').length).toBe(3)
  })

  it('搜索框显示 keyword 值', async () => {
    const { default: FilesToolbar } = await import('../../../components/files/toolbar.vue')
    const wrapper = mount(FilesToolbar, {
      props: { keyword: 'test', sortBy: 'createdAt', sortOptions: _sortOptions, orderIcon: 'i-lucide-arrow-down' },
      global: _globalConfig,
    })
    expect(wrapper.find('input').element.value).toBe('test')
  })

  it('点击排序方向按钮 emit toggleOrder', async () => {
    const { default: FilesToolbar } = await import('../../../components/files/toolbar.vue')
    const wrapper = mount(FilesToolbar, {
      props: { keyword: '', sortBy: 'createdAt', sortOptions: _sortOptions, orderIcon: 'i-lucide-arrow-down' },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('toggleOrder')).toBeTruthy()
  })

  it('点击刷新按钮 emit refresh', async () => {
    const { default: FilesToolbar } = await import('../../../components/files/toolbar.vue')
    const wrapper = mount(FilesToolbar, {
      props: { keyword: '', sortBy: 'createdAt', sortOptions: _sortOptions, orderIcon: 'i-lucide-arrow-down' },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('搜索框输入 emit update:keyword', async () => {
    const { default: FilesToolbar } = await import('../../../components/files/toolbar.vue')
    const wrapper = mount(FilesToolbar, {
      props: { keyword: '', sortBy: 'createdAt', sortOptions: _sortOptions, orderIcon: 'i-lucide-arrow-down' },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('new keyword')
    expect(wrapper.emitted('update:keyword')).toBeTruthy()
    expect(wrapper.emitted('update:keyword')![0]).toEqual(['new keyword'])
  })
})
