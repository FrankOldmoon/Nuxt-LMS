/**
 * AI service utility test (TTS / ASR / LLM state machine)
 * @see modules/lms/utils/ai.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  // vitest's define replaces import.meta.client with "true", but production code uses property access,
  // Here use defineProperty to override once, ensuring ai.ts's import.meta.client detection is true
  try {
    Object.defineProperty(import.meta, 'client', { value: true, configurable: true, writable: true })
    Object.defineProperty(import.meta, 'server', { value: false, configurable: true, writable: true })
  } catch { /* ignore */ }
})

describe('utils/ai - languageMap', () => {
  it('包含常见语言映射', async () => {
    const { languageMap } = await import('../../utils/ai')
    // Quantity is not fixed, mainly verify key mappings like zh / en / ja
    expect(Object.keys(languageMap).length).toBeGreaterThan(0)
    expect(languageMap['zh-CN']).toBe('中文（简体）')
    expect(languageMap['en-US']).toBe('英语（美国）')
    expect(languageMap['ja-JP']).toBe('日语')
    expect(languageMap['ko-KR']).toBe('韩语')
  })
})

describe('utils/ai - DEFAULT_LLM_MODEL / DEFAULT_LLM_MODE', () => {
  it('默认模型为 Qwen2.5-0.5B 系列', async () => {
    const { DEFAULT_LLM_MODEL } = await import('../../utils/ai')
    expect(DEFAULT_LLM_MODEL).toContain('Qwen2.5-0.5B')
  })

  it('默认模式为 api（非 local）', async () => {
    const { DEFAULT_LLM_MODE } = await import('../../utils/ai')
    expect(DEFAULT_LLM_MODE).toBe('api')
  })

  it('LOCAL_LLM_MODELS 至少包含 2 个模型', async () => {
    const { LOCAL_LLM_MODELS } = await import('../../utils/ai')
    expect(LOCAL_LLM_MODELS.length).toBeGreaterThanOrEqual(2)
    LOCAL_LLM_MODELS.forEach((m) => {
      expect(m).toHaveProperty('label')
      expect(m).toHaveProperty('value')
    })
  })
})

describe('utils/ai - LLM state subscribers', () => {
  it('subscribeLLMState 立即触发当前状态', async () => {
    const ai = await import('../../utils/ai')
    const listener = vi.fn()
    const unsubscribe = ai.subscribeLLMState(listener)
    expect(listener).toHaveBeenCalledTimes(1)
    const state = listener.mock.calls[0][0]
    expect(state).toHaveProperty('ready')
    expect(state).toHaveProperty('loading')
    expect(state).toHaveProperty('progress')
    unsubscribe()
  })

  it('subscribeLLMState 返回退订函数', async () => {
    const ai = await import('../../utils/ai')
    const listener = vi.fn()
    const unsubscribe = ai.subscribeLLMState(listener)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    expect(listener).toHaveBeenCalledTimes(1) // Not triggered again
  })

  it('getLLMState 返回状态快照', async () => {
    const ai = await import('../../utils/ai')
    const state = ai.getLLMState()
    expect(state).toHaveProperty('ready')
    expect(state).toHaveProperty('supported')
  })
})

describe('utils/ai - checkWebGPU', () => {
  it('无 navigator.gpu 时返回 false', async () => {
    const ai = await import('../../utils/ai')
    // Our nuxt-stubs already defines navigator.gpu = undefined
    const result = await ai.checkWebGPU()
    expect(result).toBe(false)
  })
})

describe('utils/ai - TTS service (unit env, API-based)', () => {
  it('isSupported 在 node 环境（无 window）返回 false', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    expect(svc.isSupported()).toBe(false)
  })

  it('getVoices 返回 edge-tts 语音列表（非空）', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    const voices = svc.getVoices()
    expect(Array.isArray(voices)).toBe(true)
    expect(voices.length).toBeGreaterThan(0)
    // Each voice has name / lang / voiceURI
    voices.forEach(v => {
      expect(v).toHaveProperty('name')
      expect(v).toHaveProperty('lang')
      expect(v).toHaveProperty('voiceURI')
    })
  })

  it('getVoicesByLanguage 按语言筛选', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    const zh = svc.getVoicesByLanguage('zh-CN')
    expect(zh.length).toBeGreaterThan(0)
    expect(zh.every(v => v.lang.startsWith('zh-CN'))).toBe(true)
  })

  it('getVoicesByLanguage 按性别筛选', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    const female = svc.getVoicesByLanguage('zh-CN', 'female')
    const male = svc.getVoicesByLanguage('zh-CN', 'male')
    expect(female.length).toBeGreaterThan(0)
    expect(male.length).toBeGreaterThan(0)
  })

  it('getVoicesByLanguage 不传 gender 与传 undefined 一致', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    expect(svc.getVoicesByLanguage('en')).toEqual(svc.getVoicesByLanguage('en', undefined as any))
  })

  it('speak 在 API 不可用时 rejects', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    // node environment has no server → fetch fails
    await expect(svc.speak({ text: 'hello' })).rejects.toThrow()
  })

  it('speak 返回 Promise', async () => {
    const ai = await import('../../utils/ai')
    const svc = ai.createTTSService()
    const p = svc.speak({ text: 'test' })
    p.catch(() => {})
    expect(p).toBeInstanceOf(Promise)
  })

  it('stop / pause / resume 不抛错', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    expect(() => svc.stop()).not.toThrow()
    expect(() => svc.pause()).not.toThrow()
    expect(() => svc.resume()).not.toThrow()
  })
})

describe('utils/ai - ASR service', () => {
  it('isSupported 在无 SpeechRecognition 时返回 false', async () => {
    const { createASRService } = await import('../../utils/ai')
    const svc = createASRService()
    expect(svc.isSupported()).toBe(false) // happy-dom has no SpeechRecognition
  })

  it('start 在不支持时抛错', async () => {
    const { createASRService } = await import('../../utils/ai')
    const svc = createASRService()
    await expect(svc.start()).rejects.toThrow('当前浏览器不支持语音识别')
  })

  it('isListening / stop / abort 不抛错', async () => {
    const { createASRService } = await import('../../utils/ai')
    const svc = createASRService()
    expect(svc.isListening()).toBe(false)
    expect(() => svc.stop()).not.toThrow()
    expect(() => svc.abort()).not.toThrow()
  })
})
