/**
 * useCourseClassLeaderboard composable 测试
 * @see modules/lms/composables/useCourseClassLeaderboard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useCourseClassLeaderboard', () => {
  it('初始状态', async () => {
    const isOpen = ref(false)
    const { useCourseClassLeaderboard } = await import('../../composables/useCourseClassLeaderboard')
    const r = useCourseClassLeaderboard({ courseId: 1 }, isOpen)
    expect(r.loading.value).toBe(false)
    expect(r.rows.value).toEqual([])
  })

  it('loadData 无 courseId 时不加载', async () => {
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseClassLeaderboard } = await import('../../composables/useCourseClassLeaderboard')
    const r = useCourseClassLeaderboard({ courseId: 0 }, isOpen)
    await r.loadData()
    expect(called).toBe(false)
  })

  it('loadData 拉取各班生均分排行', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/class-leaderboard')) {
        return {
          data: {
            rows: [{ classId: 1, name: 'ClassA', studentCount: 5, scoreSum: 450, avg: 90, rank: 1 }],
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseClassLeaderboard } = await import('../../composables/useCourseClassLeaderboard')
    const r = useCourseClassLeaderboard({ courseId: 1 }, isOpen)
    await r.loadData()
    expect(r.rows.value).toHaveLength(1)
    expect(r.rows.value[0].avg).toBe(90)
    expect(r.loading.value).toBe(false)
  })

  it('loadData 失败时不抛错', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const isOpen = ref(false)
    const { useCourseClassLeaderboard } = await import('../../composables/useCourseClassLeaderboard')
    const r = useCourseClassLeaderboard({ courseId: 1 }, isOpen)
    await expect(r.loadData()).resolves.toBeUndefined()
    expect(r.loading.value).toBe(false)
  })

  it('isOpen 变 true 时触发 loadData', async () => {
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/class-leaderboard')) {
        called = true
        return { data: { rows: [] }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseClassLeaderboard } = await import('../../composables/useCourseClassLeaderboard')
    const r = useCourseClassLeaderboard({ courseId: 1 }, isOpen)
    expect(called).toBe(false)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(called).toBe(true)
  })
})