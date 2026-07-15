/**
 * ai/chatbox/inputBar.vue component test
 * @see modules/lms/components/ai/chatbox/inputBar.vue
 *
 * Input bar: text input + voice input/output buttons + send button.
 * Depends on useChatboxContext() to inject context, stubs the composable to return mock object in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

/** The object returned by mock useChatboxContext */
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
    // Send button always exists (voice button depends on supported=false, not rendered)
    expect(wrapper.findAll('button').length).toBeGreaterThanOrEqual(1)
  })

  it('asrSupported=true 时渲染语音输入按钮', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext({ asrSupported: ref(true) })
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, {
      props: { enableVoiceInput: true },
      global: _globalConfig,
    })
    // Voice input button + send button = 2
    expect(wrapper.findAll('button').length).toBe(2)
  })

  it('ttsSupported=true 时渲染语音输出按钮', async () => {
    ;(globalThis as any).useChatboxContext = () => mockChatboxContext({ ttsSupported: ref(true) })
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, {
      props: { enableVoiceOutput: true },
      global: _globalConfig,
    })
    // Voice output button + send button = 2
    expect(wrapper.findAll('button').length).toBe(2)
  })

  it('点击发送按钮调用 handleSend', async () => {
    const ctx = mockChatboxContext({ inputText: ref('hello') })
    ;(globalThis as any).useChatboxContext = () => ctx
    const { default: InputBar } = await import('../../../../components/ai/chatbox/inputBar.vue')
    const wrapper = mount(InputBar, { global: _globalConfig })
    // The last button is the send button
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
