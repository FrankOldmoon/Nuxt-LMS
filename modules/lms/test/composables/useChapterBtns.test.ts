/**
 * useChapterBtns composable 测试
 * @see modules/lms/composables/useChapterBtns.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockLayoutState,
  setMockRoute,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // useChapterBtns 需要 setLayout
  setMockLayoutState({
    setLayout: vi.fn(),
    notifyCourseNavUpdate: vi.fn(),
  })
  setMockRoute({ path: '/course/1/2', params: {}, query: {} })
})

describe('composables/useChapterBtns', () => {
  it('初始 playFullscreen=false', async () => {
    const { useChapterBtns } = await import('../../composables/useChapterBtns')
    const { playFullscreen } = useChapterBtns()
    expect(playFullscreen.value).toBe(false)
  })

  it('togglePlay 切换为 true 后再切回 false', async () => {
    const { useChapterBtns } = await import('../../composables/useChapterBtns')
    const { playFullscreen, togglePlay } = useChapterBtns()
    togglePlay()
    expect(playFullscreen.value).toBe(true)
    togglePlay()
    expect(playFullscreen.value).toBe(false)
  })

  it('exitPlay 在非全屏时不改变状态', async () => {
    const { useChapterBtns } = await import('../../composables/useChapterBtns')
    const { playFullscreen, exitPlay } = useChapterBtns()
    exitPlay()
    expect(playFullscreen.value).toBe(false)
  })

  it('exitPlay 在全屏时退出', async () => {
    const { useChapterBtns } = await import('../../composables/useChapterBtns')
    const { playFullscreen, togglePlay, exitPlay } = useChapterBtns()
    togglePlay()
    expect(playFullscreen.value).toBe(true)
    exitPlay()
    expect(playFullscreen.value).toBe(false)
  })

  it('跨调用共享同一 playFullscreen state', async () => {
    const { useChapterBtns } = await import('../../composables/useChapterBtns')
    const a = useChapterBtns()
    const b = useChapterBtns()
    expect(a.playFullscreen.value).toBe(b.playFullscreen.value)
    a.togglePlay()
    expect(b.playFullscreen.value).toBe(true)
  })
})
