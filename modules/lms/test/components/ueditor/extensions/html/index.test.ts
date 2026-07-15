/**
 * html/index.vue component test (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/html/index.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n, provide } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('html/index.vue', () => {
  it('mounts and sets meta title/icon/hasSettings', async () => {
    const { default: HtmlIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(HtmlIndex, {
      props: {
        node: { attrs: { content: '<p>hello</p>' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('HTML')
    expect(meta.icon).toBe('i-lucide-code')
    expect(meta.hasSettings).toBe(true)
  })

  it('renders the Render child component with iframe', async () => {
    const { default: HtmlIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(HtmlIndex, {
      props: {
        node: { attrs: { content: '<p>hello</p>' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
  })

  it('calls updateAttributes on config change', async () => {
    const { default: HtmlIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(HtmlIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange('<p>new</p>')
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: '<p>new</p>' })
  })
})
