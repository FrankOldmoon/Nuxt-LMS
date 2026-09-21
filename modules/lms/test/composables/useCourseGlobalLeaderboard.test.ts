/**
 * useCourseGlobalLeaderboard composable 测试（全局排行）
 * @see modules/lms/composables/useCourseGlobalLeaderboard.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // stub useLmsPublicConfig（auto-import）
  ;(globalThis as any).useLmsPublicConfig = () => ({ levelStep: ref(100) })
  // expToLevel（auto-import util）—— 复用真实实现
  const { expToLevel } = await import('../../utils/expLevel')
  ;(globalThis as any).expToLevel = expToLevel
})

describe('composables/useCourseGlobalLeaderboard', () => {
  it('初始状态为空', async () => {
    const isOpen = ref(false)
    const { useCourseGlobalLeaderboard } = await import('../../composables/useCourseGlobalLeaderboard')
    const r = useCourseGlobalLeaderboard({ courseId: 1 }, isOpen)
    expect(r.loading.value).toBe(false)
    expect(r.rows.value).toEqual([])
  })

  it('loadData 拉取全局排行并换算等级（含班级名称）', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/global-leaderboard')) {
        return {
          data: {
            rows: [
              { userId: 1, rank: 1, name: 'alice', className: 'ClassA', score: 100, exp: 1200 },
              { userId: 2, rank: 2, name: 'bob', className: 'ClassB', score: 80, exp: 150 },
            ],
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGlobalLeaderboard } = await import('../../composables/useCourseGlobalLeaderboard')
    const r = useCourseGlobalLeaderboard({ courseId: 1 }, isOpen)
    await r.loadData()
    expect(r.rows.value).toHaveLength(2)
    expect(r.rows.value[0].className).toBe('ClassA')
    expect(r.rows.value[0].rank).toBe(1)
    // lv 由 exp 换算：exp=1200 → Lv.5（levelStep=100）
    expect(r.rows.value[0].lv).toBe(5)
    expect(r.rows.value[1].lv).toBe(2)
    expect(r.loading.value).toBe(false)
  })

  it('无 courseId 时不加载', async () => {
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGlobalLeaderboard } = await import('../../composables/useCourseGlobalLeaderboard')
    const r = useCourseGlobalLeaderboard({ courseId: 0 }, isOpen)
    await r.loadData()
    expect(called).toBe(false)
  })

  it('isOpen 变 true 时触发 loadData', async () => {
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/global-leaderboard')) {
        called = true
        return { data: { rows: [] }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGlobalLeaderboard } = await import('../../composables/useCourseGlobalLeaderboard')
    useCourseGlobalLeaderboard({ courseId: 1 }, isOpen)
    expect(called).toBe(false)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(called).toBe(true)
  })

  it('loadData 失败时不抛错', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const isOpen = ref(false)
    const { useCourseGlobalLeaderboard } = await import('../../composables/useCourseGlobalLeaderboard')
    const r = useCourseGlobalLeaderboard({ courseId: 1 }, isOpen)
    await expect(r.loadData()).resolves.toBeUndefined()
    expect(r.loading.value).toBe(false)
  })
})
