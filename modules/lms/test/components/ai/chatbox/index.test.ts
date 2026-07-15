/**
 * ai/chatbox/index.vue component test
 * @see modules/lms/components/ai/chatbox/index.vue
 *
 * Chatbox container: title + message list + input bar. Logic provided by useChatbox(),
 * Injects context to child components via provideChatbox. Imports real composable in tests.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../test/setup/nuxt-stubs'
import { useChatbox, provideChatbox } from '../../../../composables/useChatbox'

;(globalThis as any).useChatbox = useChatbox
;(globalThis as any).provideChatbox = provideChatbox

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockAuthUser({ id: 1, name: 'tester', username: 'tester' }, [{ code: 'student' }], [])
})

const _globalStubs = {
  AiChatboxMessageList: { template: '<div class="msg-list" />' },
  AiChatboxInputBar: {
    template: '<div class="input-bar" :data-placeholder="placeholder" :data-disabled="disabled" />',
    props: ['placeholder', 'enableVoiceInput', 'enableVoiceOutput', 'disabled'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('ai/chatbox/index.vue', () => {
  it('默认渲染容器 + 子组件（消息列表 + 输入栏）', async () => {
    const { default: Chatbox } = await import('../../../../components/ai/chatbox/index.vue')
    const wrapper = mount(Chatbox, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.msg-list').exists()).toBe(true)
    expect(wrapper.find('.input-bar').exists()).toBe(true)
  })

  it('传入 title prop 时渲染标题区', async () => {
    const { default: Chatbox } = await import('../../../../components/ai/chatbox/index.vue')
    const wrapper = mount(Chatbox, {
      props: { title: 'AI 助手' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('AI 助手')
  })

  it('不传 title 时不渲染标题区', async () => {
    const { default: Chatbox } = await import('../../../../components/ai/chatbox/index.vue')
    const wrapper = mount(Chatbox, { global: _globalConfig })
    // When there is no title, the title area is not shown (i-lucide-bot icon only appears in the title area)
    expect(wrapper.find('.uicon').exists()).toBe(false)
  })

  it('placeholder prop 透传给输入栏', async () => {
    const { default: Chatbox } = await import('../../../../components/ai/chatbox/index.vue')
    const wrapper = mount(Chatbox, {
      props: { placeholder: '请输入问题' },
      global: _globalConfig,
    })
    expect(wrapper.find('.input-bar').attributes('data-placeholder')).toBe('请输入问题')
  })

  it('disabled prop 透传给输入栏', async () => {
    const { default: Chatbox } = await import('../../../../components/ai/chatbox/index.vue')
    const wrapper = mount(Chatbox, {
      props: { disabled: true },
      global: _globalConfig,
    })
    expect(wrapper.find('.input-bar').attributes('data-disabled')).toBe('true')
  })

  it('heightClass prop 默认为 h-[450px]', async () => {
    const { default: Chatbox } = await import('../../../../components/ai/chatbox/index.vue')
    const wrapper = mount(Chatbox, { global: _globalConfig })
    expect(wrapper.props('heightClass')).toBe('h-[450px]')
  })

  it('heightClass prop 可自定义', async () => {
    const { default: Chatbox } = await import('../../../../components/ai/chatbox/index.vue')
    const wrapper = mount(Chatbox, {
      props: { heightClass: 'h-[200px]' },
      global: _globalConfig,
    })
    expect(wrapper.props('heightClass')).toBe('h-[200px]')
  })

  it('暴露 addMessage/clearMessages/getMessages/send 方法', async () => {
    const { default: Chatbox } = await import('../../../../components/ai/chatbox/index.vue')
    const wrapper = mount(Chatbox, { global: _globalConfig })
    const vm: any = wrapper.vm
    expect(typeof vm.addMessage).toBe('function')
    expect(typeof vm.clearMessages).toBe('function')
    expect(typeof vm.getMessages).toBe('function')
    expect(typeof vm.send).toBe('function')
  })
})
