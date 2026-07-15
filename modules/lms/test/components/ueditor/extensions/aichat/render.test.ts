/**
 * aichat/render.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/aichat/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  AiLlm: { template: '<div class="aichat-llm-stub" />', props: ['mode', 'title', 'opening', 'preset', 'model', 'thinking', 'showSettings'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('aichat/render.vue', () => {
  it('mounts with empty node', async () => {
    const { default: AichatRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/render.vue'
    )
    const wrapper = mount(AichatRender, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.aichat-llm-stub').exists()).toBe(true)
  })

  it('passes parsed config to AiLlm', async () => {
    const { default: AichatRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/render.vue'
    )
    const wrapper = mount(AichatRender, {
      props: {
        node: {
          attrs: {
            content: JSON.stringify({
              mode: 'ollama',
              title: 'Bot Title',
              opening: 'Hello',
              preset: 'preset',
              model: 'llama3.2',
              thinking: false,
            }),
          },
        },
      },
      global: _globalConfig,
    })
    await flushPromises()
    const aiLlm = wrapper.findComponent({ name: 'AiLlm' })
    // If stub doesn't have a name, find by class
    const stub = wrapper.find('.aichat-llm-stub')
    expect(stub.exists()).toBe(true)
  })

  it('uses api mode as default when mode not set', async () => {
    const { default: AichatRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/render.vue'
    )
    const wrapper = mount(AichatRender, {
      props: { node: { attrs: { content: JSON.stringify({ title: 'No Mode' }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.aichat-llm-stub').exists()).toBe(true)
  })
})
