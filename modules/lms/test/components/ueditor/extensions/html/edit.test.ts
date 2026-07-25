/**
 * html/edit.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/html/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('html/edit.vue', () => {
  it('mounts with empty config', async () => {
    const { default: HtmlEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/edit.vue'
    )
    const wrapper = mount(HtmlEdit, {
      props: { config: '' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.monaco-stub').exists()).toBe(true)
  })

  it('mounts with html config', async () => {
    const { default: HtmlEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/edit.vue'
    )
    const wrapper = mount(HtmlEdit, {
      props: { config: '<p>hello</p>' },
      global: _globalConfig,
    })
    expect(wrapper.find('.monaco-stub').exists()).toBe(true)
  })

  it('emits close when save button clicked', async () => {
    const { default: HtmlEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/edit.vue'
    )
    const wrapper = mount(HtmlEdit, {
      props: { config: '<p>hello</p>' },
      global: _globalConfig,
    })
    await flushPromises()
    const button = wrapper.find('button')
    await button.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
