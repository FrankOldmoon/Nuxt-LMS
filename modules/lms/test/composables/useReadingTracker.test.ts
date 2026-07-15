/**
 * useReadingTracker composable test
 * @see modules/lms/composables/useReadingTracker.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

function setupMockTracker(overrides: Partial<any> = {}) {
  const defaults = {
    isBlockRead: (_key: string) => false,
    blockHeadingOf: (_key: string) => null,
    isHeadingDone: (_headingId: string) => false,
    markBlockRead: vi.fn(),
  }
  const tracker = { ...defaults, ...overrides }
  ;(globalThis as any).useChapterTask = () => tracker
  return tracker
}

describe('composables/useReadingTracker', () => {
  it('visited 初始为 false', async () => {
    setupMockTracker()
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { visited } = useReadingTracker('1')
    expect(visited.value).toBe(false)
  })

  it('visited 为 true 当 tracker 标记已读', async () => {
    setupMockTracker({ isBlockRead: (key: string) => key === '1' })
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { visited } = useReadingTracker('1')
    expect(visited.value).toBe(true)
  })

  it('shouldHighlight 为 true 当已读且 heading 未完成', async () => {
    setupMockTracker({
      isBlockRead: () => true,
      blockHeadingOf: () => 'h1',
      isHeadingDone: () => false,
    })
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { shouldHighlight } = useReadingTracker('1')
    expect(shouldHighlight.value).toBe(true)
  })

  it('shouldHighlight 为 false 当 heading 已完成', async () => {
    setupMockTracker({
      isBlockRead: () => true,
      blockHeadingOf: () => 'h1',
      isHeadingDone: () => true,
    })
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { shouldHighlight } = useReadingTracker('1')
    expect(shouldHighlight.value).toBe(false)
  })

  it('shouldHighlight 为 false 当未读', async () => {
    setupMockTracker({
      isBlockRead: () => false,
      blockHeadingOf: () => null,
      isHeadingDone: () => false,
    })
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { shouldHighlight } = useReadingTracker('1')
    expect(shouldHighlight.value).toBe(false)
  })

  it('onEnter 3 秒后调用 markBlockRead', async () => {
    vi.useFakeTimers()
    const tracker = setupMockTracker({ markBlockRead: vi.fn() })
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { onEnter } = useReadingTracker('1')
    onEnter()
    expect(tracker.markBlockRead).not.toHaveBeenCalled()
    vi.advanceTimersByTime(3000)
    expect(tracker.markBlockRead).toHaveBeenCalledWith('1')
    vi.useRealTimers()
  })

  it('onEnter 已读时不启动计时器', async () => {
    vi.useFakeTimers()
    const tracker = setupMockTracker({
      isBlockRead: () => true,
      markBlockRead: vi.fn(),
    })
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { onEnter } = useReadingTracker('1')
    onEnter()
    vi.advanceTimersByTime(3000)
    expect(tracker.markBlockRead).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('onEnter heading 已完成时不启动计时器', async () => {
    vi.useFakeTimers()
    const tracker = setupMockTracker({
      blockHeadingOf: () => 'h1',
      isHeadingDone: () => true,
      markBlockRead: vi.fn(),
    })
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { onEnter } = useReadingTracker('1')
    onEnter()
    vi.advanceTimersByTime(3000)
    expect(tracker.markBlockRead).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('onLeave 清除计时器', async () => {
    vi.useFakeTimers()
    const tracker = setupMockTracker({ markBlockRead: vi.fn() })
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { onEnter, onLeave } = useReadingTracker('1')
    onEnter()
    onLeave()
    vi.advanceTimersByTime(3000)
    expect(tracker.markBlockRead).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('isHovering 初始为 false', async () => {
    setupMockTracker()
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { isHovering } = useReadingTracker('1')
    expect(isHovering.value).toBe(false)
  })

  it('onEnter 后 isHovering 变为 true', async () => {
    setupMockTracker()
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { isHovering, onEnter } = useReadingTracker('1')
    onEnter()
    expect(isHovering.value).toBe(true)
  })

  it('onLeave 后 isHovering 重置为 false', async () => {
    setupMockTracker()
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { isHovering, onEnter, onLeave } = useReadingTracker('1')
    onEnter()
    onLeave()
    expect(isHovering.value).toBe(false)
  })

  it('多次 enter/leave 切换 isHovering 状态正确', async () => {
    setupMockTracker()
    const { useReadingTracker } = await import('../../composables/useReadingTracker')
    const { isHovering, onEnter, onLeave } = useReadingTracker('1')
    onEnter()
    expect(isHovering.value).toBe(true)
    onLeave()
    expect(isHovering.value).toBe(false)
    onEnter()
    expect(isHovering.value).toBe(true)
    onLeave()
    expect(isHovering.value).toBe(false)
  })
})
