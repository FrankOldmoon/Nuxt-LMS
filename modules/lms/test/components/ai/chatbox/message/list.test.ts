/**
 * ai/chatbox/message/list.vue 组件测试
 * @see modules/lms/components/ai/chatbox/message/list.vue
 *
 * 消息列表：遍历 messages 渲染 Item，loading 时显示"思考中"占位。
 * 依赖 useChatboxContext() 注入上下文，测试中 stub 该 composable。
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
    msgListRef: ref(null),
    messages: ref<any[]>([]),
    loading: ref(false),
    onScroll: vi.fn(),
    ...overrides,
  }
}

const _globalStubs = {
  AiChatboxMessageItem: {
    template: '<div class="msg-item">{{ msg.content }}</div>',
    props: ['msg', 'idx'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('ai/chatbox/message/list.vue', () => {
  it('默认渲染空列表（无 loading 占位）', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext()
    const { default: MsgList } = await import('../../../../../components/ai/chatbox/message/list.vue')
    const wrapper = mount(MsgList, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findAll('.msg-item').length).toBe(0)
    // loading=false 不显示思考中占位
    expect(wrapper.text()).not.toContain('ueditor.aichatThinking')
  })

  it('messages 非空时渲染对应数量的消息项', async () => {
    ;(globalThis as any).useChatboxContext = () =>
      mockChatboxContext({
        messages: ref([
          { role: 'user', content: '问题' },
          { role: 'assistant', content: '回答' },
        ]),
      })
    const { default: MsgList } = await import('../../../../../components/ai/chatbox/message/list.vue')
    const wrapper = mount(MsgList, { global: _globalConfig })
    expect(wrapper.findAll('.msg-item').length).toBe(2)
    expect(wrapper.text()).toContain('问题')
    expect(wrapper.text()).toContain('回答')
  })

  it('loading=true 时显示思考中占位', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext({ loading: ref(true) })
    const { default: MsgList } = await import('../../../../../components/ai/chatbox/message/list.vue')
    const wrapper = mount(MsgList, { global: _globalConfig })
    expect(wrapper.text()).toContain('ueditor.aichatThinking')
  })

  it('loading=false 时不显示思考中占位', async () => {
    ;(globalThis as any).useChatboxContext = () =>
      mockChatboxContext({ loading: ref(false), messages: ref([{ role: 'user', content: 'x' }]) })
    const { default: MsgList } = await import('../../../../../components/ai/chatbox/message/list.vue')
    const wrapper = mount(MsgList, { global: _globalConfig })
    expect(wrapper.text()).not.toContain('ueditor.aichatThinking')
  })

  it('滚动时调用 onScroll', async () => {
    const ctx = mockChatboxContext()
    ;(globalThis as any).useChatboxContext = () => ctx
    const { default: MsgList } = await import('../../../../../components/ai/chatbox/message/list.vue')
    const wrapper = mount(MsgList, { global: _globalConfig })
    await wrapper.find('.overflow-y-auto').trigger('scroll')
    expect(ctx.onScroll).toHaveBeenCalled()
  })
})
