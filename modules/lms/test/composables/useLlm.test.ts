/**
 * useLlm composable 测试
 * @see modules/lposables/useLlm.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  clearToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  clearToastCalls()
  // 桩 useAiConfig（auto-import from lms）— 默认返回空配置
  const aiConfigRef = ref<any>({})
  ;(globalThis as any).useAiConfig = () => ({
    aiConfig: aiConfigRef,
    isLoading: ref(false),
    refreshAiConfig: vi.fn(),
  })
  ;(globalThis as any).__aiConfigRef = aiConfigRef
})

function makeProps(overrides: any = {}) {
  return {
    showSettings: true,
    ...overrides,
  }
}

function makeEmit() {
  const calls: any[] = []
  const emit = (event: string, ...args: any[]) => {
    calls.push({ event, args })
  }
  return { emit, calls }
}

describe('composables/useLlm', () => {
  it('初始状态：showSettings=true，state.ready=false', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    expect(r.showSettings.value).toBe(true)
    expect(r.state.ready).toBe(false)
    expect(r.state.loading).toBe(false)
    expect(r.state.progress).toBe(0)
    expect(r.state.error).toBe('')
  })

  it('showSettings=false 时返回 false', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ showSettings: false }), emit as any)
    expect(r.showSettings.value).toBe(false)
  })

  it('cfgMode 默认为 DEFAULT_LLM_MODE (api)', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    expect(r.cfgMode.value).toBe('api')
  })

  it('cfgMode 从 props.mode 初始化', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'ollama' }), emit as any)
    expect(r.cfgMode.value).toBe('ollama')
  })

  it('cfgMode 从 aiConfig.mode 初始化（无 props.mode）', async () => {
    const aiConfigRef = (globalThis as any).__aiConfigRef
    aiConfigRef.value = { mode: 'local' }
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    expect(r.cfgMode.value).toBe('local')
  })

  it('cfgTtsGender 默认 female', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    expect(r.cfgTtsGender.value).toBe('female')
  })

  it('cfgTtsGender 从 props.ttsGender 初始化', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ ttsGender: 'male' }), emit as any)
    expect(r.cfgTtsGender.value).toBe('male')
  })

  it('modeOptions 有 3 项：local/api/ollama', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    expect(r.modeOptions.value.length).toBe(3)
    const values = r.modeOptions.value.map((o: any) => o.value)
    expect(values).toEqual(['local', 'api', 'ollama'])
  })

  it('genderOptions 有 2 项：female/male', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    expect(r.genderOptions.value.length).toBe(2)
    const values = r.genderOptions.value.map((o: any) => o.value)
    expect(values).toEqual(['female', 'male'])
  })

  it('LOCAL_LLM_MODELS 有模型列表', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    expect(r.LOCAL_LLM_MODELS.length).toBeGreaterThanOrEqual(1)
    expect(r.LOCAL_LLM_MODELS[0]).toHaveProperty('label')
    expect(r.LOCAL_LLM_MODELS[0]).toHaveProperty('value')
  })

  it('selectedLocalModel 默认为 DEFAULT_LLM_MODEL', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    // DEFAULT_LLM_MODEL = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC"
    expect(r.selectedLocalModel.value).toContain('Qwen2.5')
  })

  it('effMode：showSettings=true 时用 cfgMode', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api' }), emit as any)
    r.cfgMode.value = 'ollama'
    expect(r.effMode.value).toBe('ollama')
  })

  it('effMode：showSettings=false 时用 props.mode', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ showSettings: false, mode: 'ollama' }), emit as any)
    expect(r.effMode.value).toBe('ollama')
  })

  it('effTtsGender：showSettings=false 时用 props.ttsGender', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ showSettings: false, ttsGender: 'male' }), emit as any)
    expect(r.effTtsGender.value).toBe('male')
  })

  it('chatboxDisabled：local 模式且未就绪时 true', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'local' }), emit as any)
    expect(r.chatboxDisabled.value).toBe(true)
  })

  it('chatboxDisabled：api 模式时 false', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api' }), emit as any)
    expect(r.chatboxDisabled.value).toBe(false)
  })

  it('chatboxApiUrl：api 模式时返回 URL', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api' }), emit as any)
    expect(r.chatboxApiUrl.value).toBe('/api/aichat/chat')
  })

  it('chatboxApiUrl：api 模式时用 props.apiUrl 覆盖', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api', apiUrl: '/custom/api' }), emit as any)
    expect(r.chatboxApiUrl.value).toBe('/custom/api')
  })

  it('chatboxApiUrl：非 api 模式时 undefined', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'local' }), emit as any)
    expect(r.chatboxApiUrl.value).toBeUndefined()
  })

  it('chatboxModel：api 模式时返回模型名', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api', model: 'gpt-4' }), emit as any)
    expect(r.chatboxModel.value).toBe('gpt-4')
  })

  it('chatboxModel：非 api 模式时 undefined', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'local' }), emit as any)
    expect(r.chatboxModel.value).toBeUndefined()
  })

  it('chatboxThinking：api 模式时返回 thinking 值', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api', thinking: true }), emit as any)
    expect(r.chatboxThinking.value).toBe(true)
  })

  it('chatboxThinking：非 api 模式时 undefined', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'ollama' }), emit as any)
    expect(r.chatboxThinking.value).toBeUndefined()
  })

  it('chatboxCustomSend：ollama 模式时返回函数', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'ollama' }), emit as any)
    expect(typeof r.chatboxCustomSend.value).toBe('function')
  })

  it('chatboxCustomSend：api 模式时 undefined', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api' }), emit as any)
    expect(r.chatboxCustomSend.value).toBeUndefined()
  })

  it('chatboxCustomSend：local 模式未就绪时 undefined', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'local' }), emit as any)
    // state.ready=false → chatboxCustomSend 为 undefined
    expect(r.chatboxCustomSend.value).toBeUndefined()
  })

  it('chatboxTitle：有 props.title 时用 props.title', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ title: 'My Assistant' }), emit as any)
    expect(r.chatboxTitle.value).toBe('My Assistant')
  })

  it('chatboxTitle：无 title 时用 mode 对应默认值', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api', title: '' }), emit as any)
    // api 模式无 title → t('ueditor.aichat') = 'ueditor.aichat'
    expect(r.chatboxTitle.value).toBe('ueditor.aichat')
  })

  it('chatboxPreset：有 props.preset 时用 props.preset', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ preset: 'You are a tutor.' }), emit as any)
    expect(r.chatboxPreset.value).toBe('You are a tutor.')
  })

  it('chatboxPreset：api 模式无 preset 时用默认', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api', preset: '' }), emit as any)
    expect(r.chatboxPreset.value).toBe('You are a helpful assistant.')
  })

  it('onChunk 触发 emit chunk', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit, calls } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    r.onChunk('hello')
    expect(calls.some((c) => c.event === 'chunk' && c.args[0] === 'hello')).toBe(true)
  })

  it('onUserMessage 触发 emit user-message', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit, calls } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    r.onUserMessage('question')
    expect(calls.some((c) => c.event === 'user-message' && c.args[0] === 'question')).toBe(true)
  })

  it('onMessage 触发 emit message', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit, calls } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    r.onMessage({ role: 'assistant', content: 'reply' })
    expect(calls.some((c) => c.event === 'message')).toBe(true)
  })

  it('refreshMessages 委托给 chatboxRef', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    const spy = vi.fn()
    r.chatboxRef.value = { refreshMessages: spy }
    r.refreshMessages()
    expect(spy).toHaveBeenCalled()
  })

  it('getMessages 委托给 chatboxRef', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    const msgs = [{ role: 'user', content: 'hi' }]
    r.chatboxRef.value = { getMessages: () => msgs }
    expect(r.getMessages()).toBe(msgs)
  })

  it('loadSelected：WebGPU 不支持时不抛错（catch 内部错误）', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'local' }), emit as any)
    // happy-dom 无 navigator.gpu → loadLLM 抛 WebGPU 错误 → loadSelected catch
    // loadSelected 内部 try/catch 吞掉错误，不向外抛出
    await expect(r.loadSelected()).resolves.toBeUndefined()
  })

  it('unloadLLM 可调用且不抛错', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    await r.unloadLLM()
    expect(r.state.ready).toBe(false)
  })

  it('cfgOllamaUrl 默认 localhost:11434', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps(), emit as any)
    expect(r.cfgOllamaUrl.value).toBe('http://localhost:11434')
  })

  it('cfgApiModel：api 模式时从 props.model 初始化', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'api', model: 'gpt-4' }), emit as any)
    expect(r.cfgApiModel.value).toBe('gpt-4')
  })

  it('cfgApiModel：非 api 模式时为空字符串', async () => {
    const { useLlm } = await import('../../composables/useLlm')
    const { emit } = makeEmit()
    const r = useLlm(makeProps({ mode: 'local' }), emit as any)
    expect(r.cfgApiModel.value).toBe('')
  })
})
