/**
 * useChatbox composable 测试
 * @see modules/lms/composables/useChatbox.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockAuthUser,
  getToastCalls,
  clearToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // useChatbox 依赖 createASRService / createTTSService / feedVrmAudio / clearVrmAudio
  const { createASRService, createTTSService } = await import('../../utils/ai')
  ;(globalThis as any).createASRService = createASRService
  ;(globalThis as any).createTTSService = createTTSService
  const { feedVrmAudio, clearVrmAudio } = await import('../../utils/vrm')
  ;(globalThis as any).feedVrmAudio = feedVrmAudio
  ;(globalThis as any).clearVrmAudio = clearVrmAudio
})

function makeProps(overrides: any = {}) {
  return {
    title: 'Test',
    placeholder: 'Type...',
    preset: 'You are helpful.',
    model: 'gpt-3.5',
    thinking: false,
    apiUrl: '/api/aichat/chat',
    enableVoiceInput: false,
    enableVoiceOutput: false,
    voiceLang: 'en-US',
    ttsGender: 'female',
    disabled: false,
    heightClass: 'h-[400px]',
    ...overrides,
  }
}

describe('composables/useChatbox', () => {
  it('初始状态', async () => {
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    expect(r.inputText.value).toBe('')
    expect(r.loading.value).toBe(false)
    expect(r.messages.value).toEqual([])
    expect(r.asrSupported.value).toBe(false) // onMounted 未执行
    expect(r.ttsSupported.value).toBe(false)
  })

  it('renderContent 转义 HTML', async () => {
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    const rendered = r.renderContent('<script>alert(1)</script>')
    expect(rendered).toContain('&lt;script&gt;')
    expect(rendered).not.toContain('<script>')
  })

  it('renderContent 处理代码块', async () => {
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    const rendered = r.renderContent('```js\nconsole.log(1)\n```')
    expect(rendered).toContain('<pre')
    expect(rendered).toContain('<code>')
  })

  it('renderContent 处理行内代码', async () => {
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    const rendered = r.renderContent('Hello `code` world')
    expect(rendered).toContain('<code')
  })

  it('renderContent 空字符串返回空', async () => {
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    expect(r.renderContent('')).toBe('')
  })

  it('handleSend 空文本不发送', async () => {
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    await r.handleSend('')
    expect(r.messages.value.length).toBe(0)
    expect(r.loading.value).toBe(false)
  })

  it('handleSend 未登录时 toast 警告', async () => {
    setMockAuthUser(null as any)
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    await r.handleSend('hello')
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'warning')).toBe(true)
    expect(r.messages.value.length).toBe(0)
  })

  it('handleSend disabled 时不发送', async () => {
    setMockAuthUser({ id: 1, name: 'u' })
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps({ disabled: true }), () => {})
    await r.handleSend('hello')
    expect(r.messages.value.length).toBe(0)
  })

  it('handleSend 已登录时添加 user 消息并 emit user-message', async () => {
    setMockAuthUser({ id: 1, name: 'u' })
    let emitted = ''
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps({
      customSend: async () => { return { content: 'response' } },
    }), (event, ...args) => {
      if (event === 'user-message') emitted = args[0]
    })
    await r.handleSend('hello')
    // user + assistant
    expect(r.messages.value.length).toBe(2)
    expect(r.messages.value[0].role).toBe('user')
    expect(r.messages.value[0].content).toBe('hello')
    expect(emitted).toBe('hello')
  })

  it('handleSend 通过 customSend 流式返回', async () => {
    setMockAuthUser({ id: 1, name: 'u' })
    const chunks: string[] = []
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps({
      customSend: async (messages, onChunk) => {
        onChunk('Hello ')
        onChunk('world!')
        return { content: 'Hello world!' }
      },
    }), (event, ...args) => {
      if (event === 'chunk') chunks.push(args[0])
    })
    await r.handleSend('hi')
    // messages: user + assistant
    expect(r.messages.value.length).toBe(2)
    expect(r.messages.value[1].role).toBe('assistant')
    expect(r.messages.value[1].content).toBe('Hello world!')
    expect(chunks).toEqual(['Hello ', 'world!'])
  })

  it('handleSend customSend 错误时添加 error 消息', async () => {
    setMockAuthUser({ id: 1, name: 'u' })
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps({
      customSend: async () => {
        throw new Error('boom')
      },
    }), () => {})
    await r.handleSend('hi')
    // user + empty assistant (pushed before customSend) + error assistant (from catch)
    expect(r.messages.value.length).toBe(3)
    expect(r.messages.value[2].content).toContain('Error: boom')
  })

  it('effectiveVoiceLang 默认从 locale 推导', async () => {
    setMockI18n({ locale: ref('zh-CN'), t: (k: string) => k, d: (v: any) => String(v) })
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    // effectiveVoiceLang 是内部 computed，不直接暴露
    // 通过 toggleVoiceInput 间接验证不抛错
    expect(() => r.toggleVoiceInput()).not.toThrow()
  })

  it('canSpeak 判断是否可朗读', async () => {
    setMockAuthUser({ id: 1, name: 'u' })
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps({ enableVoiceOutput: true }), () => {})
    // ttsSupported=false（onMounted 未执行），canSpeak 应返回 false
    expect(r.canSpeak({ role: 'assistant', content: 'hello' })).toBe(false)
  })

  it('toggleVoiceOutput 切换 voiceOutputEnabled', async () => {
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    expect(r.voiceOutputEnabled.value).toBe(false)
    r.toggleVoiceOutput()
    expect(r.voiceOutputEnabled.value).toBe(true)
    r.toggleVoiceOutput()
    expect(r.voiceOutputEnabled.value).toBe(false)
  })

  it('toggleReasoning 切换 _reasoningExpanded', async () => {
    const { useChatbox } = await import('../../composables/useChatbox')
    const r = useChatbox(makeProps(), () => {})
    r.messages.value = [{ role: 'assistant', content: 'test', reasoning: 'thoughts', _reasoningExpanded: false }]
    r.toggleReasoning(0)
    expect(r.messages.value[0]._reasoningExpanded).toBe(true)
  })
})
