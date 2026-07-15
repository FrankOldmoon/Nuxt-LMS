/**
 * InputIcon component tests
 * @see modules/base/components/form/input-icon.vue
 *
 * Icon picker: popover + search + pagination + selection
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'
import { useIconPicker } from '../../../composables/useIconPicker'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useIconPicker = useIconPicker
})

const _globalStubs = {
  UPopover: {
    template: '<div><slot /><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['color', 'variant', 'size', 'loading', 'label', 'icon', 'disabled'],
    emits: ['click'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'keydown.enter\')" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
    emits: ['update:modelValue', 'keydown.enter'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('form/input-icon.vue', () => {
  it('默认渲染（无值时显示 placeholder）', async () => {
    const { default: InputIcon } = await import('../../../components/form/input-icon.vue')
    const wrapper = mount(InputIcon, {
      props: { modelValue: '', placeholder: '选择图标' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('选择图标')
  })

  it('无 placeholder 时显示默认文案', async () => {
    const { default: InputIcon } = await import('../../../components/form/input-icon.vue')
    const wrapper = mount(InputIcon, {
      props: { modelValue: '' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('formIcon.selectIcon')
  })

  it('有 modelValue 时显示图标名', async () => {
    const { default: InputIcon } = await import('../../../components/form/input-icon.vue')
    const wrapper = mount(InputIcon, {
      props: { modelValue: 'home' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('home')
  })

  it('接受 pageSize prop', async () => {
    const { default: InputIcon } = await import('../../../components/form/input-icon.vue')
    const wrapper = mount(InputIcon, {
      props: { modelValue: '', pageSize: 20 },
      global: _globalConfig,
    })
    expect(wrapper.props('pageSize')).toBe(20)
  })

  it('接受 iconColor prop', async () => {
    const { default: InputIcon } = await import('../../../components/form/input-icon.vue')
    const wrapper = mount(InputIcon, {
      props: { modelValue: 'home', iconColor: 'text-red-500' },
      global: _globalConfig,
    })
    expect(wrapper.props('iconColor')).toBe('text-red-500')
  })

  it('更新 modelValue 后 innerValue 同步', async () => {
    const { default: InputIcon } = await import('../../../components/form/input-icon.vue')
    const wrapper = mount(InputIcon, {
      props: { modelValue: 'home' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('home')
    await wrapper.setProps({ modelValue: 'user' })
    expect(wrapper.text()).toContain('user')
  })
})
