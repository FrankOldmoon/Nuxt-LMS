/**
 * AI 服务 composable 测试（TTS / ASR，使用 happy-dom 提供 window）
 * @see modules/lms/utils/ai
 *
 * TTS 现通过服务端 edge-tts API 实现，客户端用 HTMLAudioElement 播放
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/ai - TTS service (happy-dom env)', () => {
  it('isSupported 在客户端返回 true', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    expect(svc.isSupported()).toBe(true)
  })

  it('getVoices 返回 edge-tts 语音列表', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    const voices = svc.getVoices()
    expect(Array.isArray(voices)).toBe(true)
    expect(voices.length).toBeGreaterThan(0)
  })

  it('getVoicesByLanguage 按语言筛选', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    const voices = svc.getVoicesByLanguage('en')
    expect(Array.isArray(voices)).toBe(true)
    expect(voices.length).toBeGreaterThan(0)
  })

  it('stop / pause / resume 不抛错', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    expect(() => svc.stop()).not.toThrow()
    expect(() => svc.pause()).not.toThrow()
    expect(() => svc.resume()).not.toThrow()
  })
})

describe('utils/ai - ASR service (happy-dom env)', () => {
  it('isSupported 返回 boolean（happy-dom 无 SpeechRecognition）', async () => {
    const { createASRService } = await import('../../utils/ai')
    const svc = createASRService()
    expect(svc.isSupported()).toBe(false)
  })

  it('isListening 初始为 false', async () => {
    const { createASRService } = await import('../../utils/ai')
    const svc = createASRService()
    expect(svc.isListening()).toBe(false)
  })

  it('stop / abort 不抛错', async () => {
    const { createASRService } = await import('../../utils/ai')
    const svc = createASRService()
    expect(() => svc.stop()).not.toThrow()
    expect(() => svc.abort()).not.toThrow()
  })
})
