/**
 * ueditor/render/nodes/inputs.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/inputs.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ClientOnly: { template: '<div><slot /></div>' },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'class'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: _globalStubs,
}

describe('ueditor/render/nodes/inputs.vue', () => {
  it('renders an input element', async () => {
    const { default: InputsView } = await import('../../../../../components/ueditor/render/nodes/inputs.vue')
    const wrapper = mount(InputsView, { props: { node: { type: 'inputs' } }, global: _globalConfig })
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('emits update event when input changes', async () => {
    const { default: InputsView } = await import('../../../../../components/ueditor/render/nodes/inputs.vue')
    const wrapper = mount(InputsView, { props: { node: { type: 'inputs' } }, global: _globalConfig })
    await wrapper.find('input').setValue('hello')
    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0]).toEqual(['hello'])
  })
})
