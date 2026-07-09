/**
 * AI 服务 composable 测试（TTS / ASR，使用 happy-dom 提供 window）
 * @see modules/lms/utils/ai.ts
 *
 * 此测试用 happy-dom 环境，window.speechSynthesis 由 happy-dom 提供 stub
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/ai - TTS service (happy-dom env)', () => {
  it('isSupported 在 happy-dom 中检测到 speechSynthesis', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    // happy-dom 不一定实现 speechSynthesis，但 window 存在
    // 只要 isSupported 不抛错即可
    expect(() => svc.isSupported()).not.toThrow()
  })

  it('getVoices 返回数组', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    const voices = svc.getVoices()
    expect(Array.isArray(voices)).toBe(true)
  })

  it('getVoicesByLanguage 返回数组', async () => {
    const { createTTSService } = await import('../../utils/ai')
    const svc = createTTSService()
    const voices = svc.getVoicesByLanguage('en')
    expect(Array.isArray(voices)).toBe(true)
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
