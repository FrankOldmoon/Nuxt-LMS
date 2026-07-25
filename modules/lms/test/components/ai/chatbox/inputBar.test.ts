/**
 * ai/chatbox/inputBar.vue 组件测试
 * @see modules/lms/components/ai/chatbox/inputBar.vue
 *
 * 输入栏：文本输入 + 语音输入/输出按钮 + 发送按钮。
 * 依赖 useChatboxContext() 注入上下文，测试中 stub 该 composable 返回 mock 对象。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

/** mock useChatboxContext 返回的对象 */
function mockChatboxContext(overrides: any = {}) {
  const inputText = ref('')
  const loading = ref(false)
  return {
    inputText,
    loading,
    asrSupported: ref(false),
    ttsSupported: ref(false),
    isListening: ref(false),
    interimText: ref(''),
    voiceError: ref(''),
    voiceOutputEnabled: ref(false),
    toggleVoiceInput: vi.fn(),
    toggleVoiceOutput: vi.fn(),
    handleSend: vi.fn(),
    ...overrides,
  }
}

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'keydown.enter\', $event)" :disabled="disabled" />',
    props: ['modelValue', 'placeholder', 'size', 'disabled', 'icon'],
  },
  UButton: {
    template: '<button :disabled="loading || disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'disabled', 'title', 'label'],
  },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('ai/chatbox/inputBar.vue', () => {
  it('默认渲染输入框 + 发送按钮', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext()
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, { global: _globalConfig })
    expect(wrapper.find('input').exists()).toBe(true)
    // 发送按钮一定存在（语音按钮依赖 supported=false 不渲染）
    expect(wrapper.findAll('button').length).toBeGreaterThanOrEqual(1)
  })

  it('asrSupported=true 时渲染语音输入按钮', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext({ asrSupported: ref(true) })
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, {
      props: { enableVoiceInput: true },
      global: _globalConfig,
    })
    // 语音输入按钮 + 发送按钮 = 2 个
    expect(wrapper.findAll('button').length).toBe(2)
  })

  it('ttsSupported=true 时渲染语音输出按钮', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext({ ttsSupported: ref(true) })
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, {
      props: { enableVoiceOutput: true },
      global: _globalConfig,
    })
    // 语音输出按钮 + 发送按钮 = 2 个
    expect(wrapper.findAll('button').length).toBe(2)
  })

  it('点击发送按钮调用 handleSend', async () => {
    const ctx = mockChatboxContext({ inputText: ref('hello') })
    ;(globalThis as any).useChatboxContext = () => ctx
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, { global: _globalConfig })
    // 最后一个 button 是发送按钮
    const sendBtn = wrapper.findAll('button').at(-1)!
    await sendBtn.trigger('click')
    expect(ctx.handleSend).toHaveBeenCalled()
  })

  it('loading=true 时发送按钮 disabled', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext({ loading: ref(true) })
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, { global: _globalConfig })
    const sendBtn = wrapper.findAll('button').at(-1)!
    expect((sendBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('disabled prop 透传到输入框', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext()
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, {
      props: { disabled: true },
      global: _globalConfig,
    })
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true)
  })

  it('isListening 时显示监听状态', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext({ isListening: ref(true) })
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('ai.listening')
  })
})
