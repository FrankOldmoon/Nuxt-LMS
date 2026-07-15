/**
 * ai/chatbox/message/item.vue component test
 * @see modules/lms/components/ai/chatbox/message/item.vue
 *
 * Single message: avatar + thinking process collapse + message content + read aloud button.
 * Depends on useChatboxContext() to inject context, stubs the composable in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

function mockChatboxContext(overrides: any = {}) {
  return {
    renderContent: (text: string) => text,
    toggleReasoning: vi.fn(),
    canSpeak: () => false,
    toggleSpeakMessage: vi.fn(),
    speakingIdx: ref(-1),
    ...overrides,
  }
}

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  ueditorRender: { template: '<div class="ueditor-render">{{ JSON.stringify(json) }}</div>', props: ['json'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('ai/chatbox/message/item.vue', () => {
  it('渲染 user 消息', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext()
    const { default: MsgItem } = await import('../../../../../components/ai/chatbox/message/item.vue')
    const wrapper = mount(MsgItem, {
      props: { msg: { role: 'user', content: '你好' }, idx: 0 },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('你好')
  })

  it('渲染 assistant 消息', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext()
    const { default: MsgItem } = await import('../../../../../components/ai/chatbox/message/item.vue')
    const wrapper = mount(MsgItem, {
      props: { msg: { role: 'assistant', content: '我是助手' }, idx: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('我是助手')
  })

  it('msg.reasoning 存在时渲染思考过程区', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext()
    const { default: MsgItem } = await import('../../../../../components/ai/chatbox/message/item.vue')
    const wrapper = mount(MsgItem, {
      props: {
        msg: { role: 'assistant', content: '答案', reasoning: '思考中...', _reasoningExpanded: false },
        idx: 0,
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('ueditor.aichatReasoning')
    // Collapsed state does not directly show reasoning text (v-if=_reasoningExpanded)
    expect(wrapper.text()).not.toContain('思考中...')
  })

  it('_reasoningExpanded=true 时显示思考过程内容', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext()
    const { default: MsgItem } = await import('../../../../../components/ai/chatbox/message/item.vue')
    const wrapper = mount(MsgItem, {
      props: {
        msg: { role: 'assistant', content: '答案', reasoning: '思考展开', _reasoningExpanded: true },
        idx: 0,
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('思考展开')
  })

  it('canSpeak(msg)=true 时显示朗读按钮', async () => {
    ;(globalThis as any).useChatboxContext = () =>
      mockChatboxContext({ canSpeak: () => true, speakingIdx: ref(0) })
    const { default: MsgItem } = await import('../../../../../components/ai/chatbox/message/item.vue')
    const wrapper = mount(MsgItem, {
      props: { msg: { role: 'assistant', content: '朗读我' }, idx: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('ai.stopSpeaking')
  })

  it('点击思考过程标题调用 toggleReasoning', async () => {
    const ctx = mockChatboxContext()
    ;(globalThis as any).useChatboxContext = () => ctx
    const { default: MsgItem } = await import('../../../../../components/ai/chatbox/message/item.vue')
    const wrapper = mount(MsgItem, {
      props: {
        msg: { role: 'assistant', content: '答案', reasoning: '思考', _reasoningExpanded: false },
        idx: 2,
      },
      global: _globalConfig,
    })
    // The thinking process title is a div with cursor-pointer, click it
    const clickable = wrapper.find('.cursor-pointer')
    await clickable.trigger('click')
    expect(ctx.toggleReasoning).toHaveBeenCalledWith(2)
  })
})
