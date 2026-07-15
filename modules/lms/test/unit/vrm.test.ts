/**
 * VRM digital human voice state singleton test
 * @see modules/lms/utils/vrm.ts
 *
 * Note: vrm.ts is a module-level singleton, each test needs vi.resetModules() to reset
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(async () => {
  resetAllStubs()
  vi.resetModules() // Reset vrm.ts singleton state
})

describe('utils/vrm - text channel (feedVrmText / consumeVrmChars / clearVrmSpeech)', () => {
  it('feedVrmText 启动说话并设置 isSpeaking=true', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech() // Cleanup
    vrm.feedVrmText('你好')
    const state = vrm.getVrmSpeechState()
    expect(state.isSpeaking).toBe(true)
    expect(state.pendingText).toBe('你好')
  })

  it('持续 feedVrmText 追加到 pendingText 末尾', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech()
    vrm.feedVrmText('你好')
    vrm.feedVrmText('世界')
    expect(vrm.getVrmSpeechState().pendingText).toBe('你好世界')
  })

  it('feedVrmText 在未说话时重置文本（清空旧文本）', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.feedVrmText('旧')
    vrm.consumeVrmChars(100) // After consumption → isSpeaking=false
    vrm.feedVrmText('新文本')
    expect(vrm.getVrmSpeechState().pendingText).toBe('新文本')
  })

  it('空字符串 feedVrmText 不会改变状态', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech()
    vrm.feedVrmText('hello')
    vrm.feedVrmText('') // Empty string
    expect(vrm.getVrmSpeechState().pendingText).toBe('hello')
  })

  it('consumeVrmChars 消费指定字符数', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech()
    vrm.feedVrmText('abcdef')
    const consumed = vrm.consumeVrmChars(3)
    expect(consumed).toBe('abc')
    expect(vrm.getVrmSpeechState().pendingText).toBe('def')
    expect(vrm.getVrmSpeechState().isSpeaking).toBe(true)
  })

  it('消费完时自动置 isSpeaking=false', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech()
    vrm.feedVrmText('ab')
    vrm.consumeVrmChars(10)
    expect(vrm.getVrmSpeechState().isSpeaking).toBe(false)
    expect(vrm.getVrmSpeechState().pendingText).toBe('')
  })

  it('consumeVrmChars(0) 或负数返回空', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech()
    vrm.feedVrmText('x')
    expect(vrm.consumeVrmChars(0)).toBe('')
    expect(vrm.consumeVrmChars(-5)).toBe('')
  })

  it('clearVrmSpeech 清空文本流', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.feedVrmText('some text')
    vrm.clearVrmSpeech()
    const state = vrm.getVrmSpeechState()
    expect(state.isSpeaking).toBe(false)
    expect(state.pendingText).toBe('')
  })

  it('subscribeVrmSpeech 接收状态变化', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech()
    const listener = vi.fn()
    const unsubscribe = vrm.subscribeVrmSpeech(listener)
    expect(listener).toHaveBeenCalledTimes(1) // Triggered immediately
    vrm.feedVrmText('x')
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    vrm.feedVrmText('y')
    expect(listener).toHaveBeenCalledTimes(2) // Unsubscribed
  })
})

describe('utils/vrm - audio channel (feedVrmAudio / consumeVrmAudioChars / clearVrmAudio)', () => {
  it('feedVrmAudio 启动音频通道', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmAudio()
    vrm.feedVrmAudio('TTS audio')
    const state = vrm.getVrmSpeechState()
    expect(state.audioSpeaking).toBe(true)
    expect(state.audioText).toBe('TTS audio')
  })

  it('feedVrmAudio 重置之前的音频文本', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmAudio()
    vrm.feedVrmAudio('old')
    vrm.feedVrmAudio('new')
    expect(vrm.getVrmSpeechState().audioText).toBe('new')
  })

  it('consumeVrmAudioChars 消费音频字符', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmAudio()
    vrm.feedVrmAudio('hello world')
    const consumed = vrm.consumeVrmAudioChars(5)
    expect(consumed).toBe('hello')
    expect(vrm.getVrmSpeechState().audioText).toBe(' world')
    // Audio channel does not change audioSpeaking (unless clear)
    expect(vrm.getVrmSpeechState().audioSpeaking).toBe(true)
  })

  it('consumeVrmAudioChars(0) 或负数返回空', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmAudio()
    vrm.feedVrmAudio('x')
    expect(vrm.consumeVrmAudioChars(0)).toBe('')
    expect(vrm.consumeVrmAudioChars(-1)).toBe('')
  })

  it('clearVrmAudio 停止音频通道', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.feedVrmAudio('speaking')
    vrm.clearVrmAudio()
    const state = vrm.getVrmSpeechState()
    expect(state.audioSpeaking).toBe(false)
    expect(state.audioText).toBe('')
  })
})

describe('utils/vrm - channels isolation', () => {
  it('文本通道与音频通道互不干扰', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech()
    vrm.clearVrmAudio()
    vrm.feedVrmText('text-channel')
    // feedVrmText does not affect audioText
    expect(vrm.getVrmSpeechState().audioText).toBe('')
    expect(vrm.getVrmSpeechState().pendingText).toBe('text-channel')
    vrm.feedVrmAudio('audio-channel')
    // feedVrmAudio does not affect pendingText (two channels are independent)
    expect(vrm.getVrmSpeechState().pendingText).toBe('text-channel')
    expect(vrm.getVrmSpeechState().audioText).toBe('audio-channel')
  })
})
