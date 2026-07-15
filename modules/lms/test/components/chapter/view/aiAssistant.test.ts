/**
 * chapter/view/aiAssistant.vue component test
 * @see modules/lms/components/chapter/view/aiAssistant.vue
 *
 * Bottom-right AI chapter assistant button + VRM digital human + LLM chat panel.
 * Depends on useChapterViewContext(), stubs the composable in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

function mockViewContext(overrides: any = {}) {
  return {
    aiEnabled: ref(true),
    aiConfig: ref({}),
    assistantOpen: ref(false),
    vrmVisible: ref(false),
    aiLlmRef: ref(null),
    assistantPreset: ref(''),
    assistantOpening: ref(''),
    toggleAssistant: vi.fn(),
    onAssistantChunk: vi.fn(),
    onAssistantUserMessage: vi.fn(),
    onAssistantMessage: vi.fn(),
    ...overrides,
  }
}

const _globalStubs = {
  UButton: {
    template: '<button class="ubtn" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'size', 'title', 'ariaLabel', 'label'],
  },
  ClientOnly: { template: '<div class="client-only"><slot /></div>' },
  AiVrm: { template: '<div class="ai-vrm" />', emits: ['close'] },
  AiLlm: {
    template: '<div class="ai-llm" />',
    props: ['showSettings', 'title', 'preset', 'opening', 'aiConfig'],
    emits: ['chunk', 'user-message', 'message'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/view/aiAssistant.vue', () => {
  it('aiEnabled=true 时渲染助教按钮', async () => {
    ;(globalThis as any).useChapterViewContext = () => mockViewContext({ aiEnabled: ref(true) })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    const wrapper = mount(AiAssistant, { global: _globalConfig })
    expect(wrapper.find('.ubtn').exists()).toBe(true)
  })

  it('aiEnabled=false 时不渲染', async () => {
    ;(globalThis as any).useChapterViewContext = () => mockViewContext({ aiEnabled: ref(false) })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    const wrapper = mount(AiAssistant, { global: _globalConfig })
    expect(wrapper.find('.ubtn').exists()).toBe(false)
  })

  it('assistantOpen=false 时不渲染聊天面板', async () => {
    ;(globalThis as any).useChapterViewContext = () => mockViewContext({ assistantOpen: ref(false) })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    const wrapper = mount(AiAssistant, { global: _globalConfig })
    expect(wrapper.find('.ai-llm').exists()).toBe(false)
  })

  it('assistantOpen=true 时渲染 AiLlm 聊天面板', async () => {
    ;(globalThis as any).useChapterViewContext = () => mockViewContext({ assistantOpen: ref(true) })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    const wrapper = mount(AiAssistant, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.ai-llm').exists()).toBe(true)
  })

  it('点击助教按钮调用 toggleAssistant', async () => {
    const ctx = mockViewContext()
    ;(globalThis as any).useChapterViewContext = () => ctx
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    const wrapper = mount(AiAssistant, { global: _globalConfig })
    await wrapper.find('.ubtn').trigger('click')
    expect(ctx.toggleAssistant).toHaveBeenCalled()
  })

  it('assistantOpen=true vrmVisible=true 时渲染 AiVrm', async () => {
    ;(globalThis as any).useChapterViewContext = () =>
      mockViewContext({ assistantOpen: ref(true), vrmVisible: ref(true) })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    const wrapper = mount(AiAssistant, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.ai-vrm').exists()).toBe(true)
  })
})
