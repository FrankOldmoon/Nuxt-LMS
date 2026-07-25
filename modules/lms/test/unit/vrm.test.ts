/**
 * VRM 数字人语音状态单例测试
 * @see modules/lms/utils/vrm.ts
 *
 * 注意：vrm.ts 是模块级单例，每次测试需要 vi.resetModules() 重置
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(async () => {
  resetAllStubs()
  vi.resetModules() // 重置 vrm.ts 单例状态
})

describe('utils/vrm - text channel (feedVrmText / consumeVrmChars / clearVrmSpeech)', () => {
  it('feedVrmText 启动说话并设置 isSpeaking=true', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech() // 清理
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
    vrm.consumeVrmChars(100) // 消费完 → isSpeaking=false
    vrm.feedVrmText('新文本')
    expect(vrm.getVrmSpeechState().pendingText).toBe('新文本')
  })

  it('空字符串 feedVrmText 不会改变状态', async () => {
    const vrm = await import('../../utils/vrm')
    vrm.clearVrmSpeech()
    vrm.feedVrmText('hello')
    vrm.feedVrmText('') // 空字符串
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
    expect(listener).toHaveBeenCalledTimes(1) // 立即触发
    vrm.feedVrmText('x')
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    vrm.feedVrmText('y')
    expect(listener).toHaveBeenCalledTimes(2) // 已退订
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
    // 音频通道不改变 audioSpeaking（除非 clear）
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
    // feedVrmText 不影响 audioText
    expect(vrm.getVrmSpeechState().audioText).toBe('')
    expect(vrm.getVrmSpeechState().pendingText).toBe('text-channel')
    vrm.feedVrmAudio('audio-channel')
    // feedVrmAudio 不影响 pendingText（两个通道独立）
    expect(vrm.getVrmSpeechState().pendingText).toBe('text-channel')
    expect(vrm.getVrmSpeechState().audioText).toBe('audio-channel')
  })
})
