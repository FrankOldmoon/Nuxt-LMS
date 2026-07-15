/**
 * ai/llm/index.client.vue component test
 * @see modules/lms/components/ai/llm/index.client.vue
 *
 * LLM AI assistant container: settings panel + local model loading progress + chat interface.
 * Logic provided by useLlm() composable, imports real composable + useAiConfig in tests.
 * focus: can mount, accept props, expose refreshMessages/getMessages.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'
import { useLlm } from '../../../../composables/useLlm'
import { useAiConfig } from '../../../../composables/useAiConfig'

;(globalThis as any).useLlm = useLlm
;(globalThis as any).useAiConfig = useAiConfig

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  AiLlmSettingsPanel: { template: '<div class="settings-panel" />' },
  aiChatbox: {
    template: '<div class="chatbox" :data-title="title" :data-api-url="apiUrl" />',
    props: ['title', 'opening', 'preset', 'customSend', 'model', 'thinking', 'apiUrl', 'ttsGender', 'disabled', 'heightClass'],
    emits: ['chunk', 'user-message', 'message'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('ai/llm/index.client.vue', () => {
  it('默认 mount（showSettings=true 渲染设置面板 + 聊天界面）', async () => {
    const { default: Llm } = await import('../../../../components/ai/llm/index.client.vue')
    const wrapper = mount(Llm, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.settings-panel').exists()).toBe(true)
    expect(wrapper.find('.chatbox').exists()).toBe(true)
  })

  it('showSettings=false 时不渲染设置面板', async () => {
    const { default: Llm } = await import('../../../../components/ai/llm/index.client.vue')
    const wrapper = mount(Llm, {
      props: { showSettings: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.settings-panel').exists()).toBe(false)
    // Chat interface still renders
    expect(wrapper.find('.chatbox').exists()).toBe(true)
  })

  it('接受 mode prop', async () => {
    const { default: Llm } = await import('../../../../components/ai/llm/index.client.vue')
    const wrapper = mount(Llm, {
      props: { mode: 'api' },
      global: _globalConfig,
    })
    expect(wrapper.props('mode')).toBe('api')
  })

  it('接受 title prop 并透传给 chatbox', async () => {
    const { default: Llm } = await import('../../../../components/ai/llm/index.client.vue')
    const wrapper = mount(Llm, {
      props: { title: '我的助手' },
      global: _globalConfig,
    })
    expect(wrapper.find('.chatbox').attributes('data-title')).toBe('我的助手')
  })

  it('暴露 refreshMessages / getMessages 方法', async () => {
    const { default: Llm } = await import('../../../../components/ai/llm/index.client.vue')
    const wrapper = mount(Llm, { global: _globalConfig })
    const vm: any = wrapper.vm
    expect(typeof vm.refreshMessages).toBe('function')
    expect(typeof vm.getMessages).toBe('function')
  })

  it('apiUrl prop 透传给 chatbox（api 模式）', async () => {
    const { default: Llm } = await import('../../../../components/ai/llm/index.client.vue')
    const wrapper = mount(Llm, {
      props: { mode: 'api', apiUrl: '/api/custom-chat' },
      global: _globalConfig,
    })
    expect(wrapper.find('.chatbox').attributes('data-api-url')).toBe('/api/custom-chat')
  })
})
