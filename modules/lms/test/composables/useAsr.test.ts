/**
 * useAsr composable 测试
 * @see modules/lms/composables/useAsr.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useAsr', () => {
  it('初始状态：未监听、空文本、isSupported 为 boolean', async () => {
    const { useAsr } = await import('../../composables/useAsr')
    const r = useAsr()
    expect(r.isListening.value).toBe(false)
    expect(r.finalTranscript.value).toBe('')
    expect(r.interimTranscript.value).toBe('')
    expect(r.error.value).toBe('')
    expect(typeof r.isSupported).toBe('boolean')
    expect(r.selectedLang.value).toBe('zh-CN')
    expect(r.continuous.value).toBe(false)
    expect(r.interimResults.value).toBe(true)
  })

  it('handleClear 清空 transcript', async () => {
    const { useAsr } = await import('../../composables/useAsr')
    const r = useAsr()
    r.finalTranscript.value = 'hello'
    r.interimTranscript.value = 'world'
    r.handleClear()
    expect(r.finalTranscript.value).toBe('')
    expect(r.interimTranscript.value).toBe('')
  })

  it('handleCopy 空 transcript 时不抛错', async () => {
    const { useAsr } = await import('../../composables/useAsr')
    const r = useAsr()
    await expect(r.handleCopy()).resolves.toBeUndefined()
    expect(r.error.value).toBe('')
  })

  it('handleCopy 有 transcript 时调用 clipboard.writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const { useAsr } = await import('../../composables/useAsr')
    const r = useAsr()
    r.finalTranscript.value = 'hello world'
    await r.handleCopy()
    expect(writeText).toHaveBeenCalledWith('hello world')
  })

  it('handleCopy clipboard 抛错且降级也失败时设置 error', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    Object.defineProperty(document, 'execCommand', { value: vi.fn().mockReturnValue(false), configurable: true })
    const { useAsr } = await import('../../composables/useAsr')
    const r = useAsr()
    r.finalTranscript.value = 'hello'
    await r.handleCopy()
    expect(r.error.value).toBe('复制失败')
  })

  it('handleCopy 非安全上下文（clipboard 不可用）时降级到 execCommand', async () => {
    // 模拟非 HTTPS 等 insecure context：clipboard 不存在
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })
    const execSpy = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: execSpy, configurable: true })
    const { useAsr } = await import('../../composables/useAsr')
    const r = useAsr()
    r.finalTranscript.value = 'hello'
    await r.handleCopy()
    expect(execSpy).toHaveBeenCalledWith('copy')
    expect(r.error.value).toBe('')
  })

  it('languageMap 是一个对象', async () => {
    const { useAsr } = await import('../../composables/useAsr')
    const r = useAsr()
    expect(r.languageMap).toBeDefined()
    expect(typeof r.languageMap).toBe('object')
  })
})
