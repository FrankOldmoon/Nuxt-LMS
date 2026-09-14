/**
 * chapter/view/aiAssistant.vue 组件测试
 * @see modules/lms/components/chapter/view/aiAssistant.vue
 *
 * 右下角 Dify 悬浮聊天机器人（替换原 AI 章节助教 + VRM 数字人）。
 * 依赖 useChapterViewContext()，测试中 stub 该 composable。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

const SCRIPT_ID = 'dify-chatbot-script'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // 清理可能残留的脚本与全局配置
  document.getElementById(SCRIPT_ID)?.remove()
  document.getElementById('dify-chatbot-bubble-button')?.remove()
  document.getElementById('dify-chatbot-bubble-window')?.remove()
  delete (window as any).difyChatbotConfig
})

function mockViewContext(overrides: any = {}) {
  return {
    aiEnabled: ref(true),
    ...overrides,
  }
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
}

describe('chapter/view/aiAssistant.vue', () => {
  it('aiEnabled=true 时注入 Dify 嵌入脚本并写入全局配置', async () => {
    ;(globalThis as any).useChapterViewContext = () => mockViewContext({ aiEnabled: ref(true) })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    mount(AiAssistant, { global: _globalConfig })
    expect(document.getElementById(SCRIPT_ID)).toBeTruthy()
    expect((window as any).difyChatbotConfig?.baseUrl).toBe('http://10.28.1.153')
    expect((window as any).difyChatbotConfig?.token).toBe('REDACTED')
  })

  it('aiEnabled=false 时不注入脚本', async () => {
    ;(globalThis as any).useChapterViewContext = () => mockViewContext({ aiEnabled: ref(false) })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    mount(AiAssistant, { global: _globalConfig })
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    expect((window as any).difyChatbotConfig).toBeUndefined()
  })

  it('aiEnabled 由 true 变为 false 时清理脚本与配置', async () => {
    const aiEnabled = ref(true)
    ;(globalThis as any).useChapterViewContext = () => mockViewContext({ aiEnabled })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    mount(AiAssistant, { global: _globalConfig })
    expect(document.getElementById(SCRIPT_ID)).toBeTruthy()

    aiEnabled.value = false
    await nextTick()
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    expect((window as any).difyChatbotConfig).toBeUndefined()
  })

  it('重复挂载不重复注入脚本', async () => {
    ;(globalThis as any).useChapterViewContext = () => mockViewContext({ aiEnabled: ref(true) })
    const { default: AiAssistant } = await import('../../../../components/chapter/view/aiAssistant.vue')
    const wrapper = mount(AiAssistant, { global: _globalConfig })
    mount(AiAssistant, { global: _globalConfig })
    expect(document.querySelectorAll(`#${SCRIPT_ID}`).length).toBe(1)
    wrapper.unmount()
  })
})
