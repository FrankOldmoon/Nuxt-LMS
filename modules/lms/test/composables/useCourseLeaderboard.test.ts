/**
 * useCourseLeaderboard composable 测试
 * @see modules/lms/composables/useCourseLeaderboard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  setMockAuthUser,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  const { useClassUsers } = await import('../../composables/useClassUsers')
  ;(globalThis as any).useClassUsers = useClassUsers
})

describe('composables/useCourseLeaderboard', () => {
  it('初始状态', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    expect(r.loading.value).toBe(false)
    expect(r.scoreRows.value).toEqual([])
    expect(r.myRank.value).toBeNull()
    expect(r.tableRows.value).toEqual([])
    expect(r.extraColumns.value).toHaveLength(1)
    expect(r.extraColumns.value[0].id).toBe('score')
  })

  it('loadData 无 courseId 时不加载', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 0, classId: 10 }, isOpen)
    await r.loadData()
    expect(called).toBe(false)
  })

  it('loadData 拉取 top10 排行榜', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return {
          data: [
            { id: 1, name: 'alice', isTeacher: false },
            { id: 2, name: 'bob', isTeacher: false },
          ],
          success: true,
          msg: '',
        }
      }
      if (url.includes('/api/courses/leaderboard')) {
        return {
          data: { top10: [{ userId: 1, score: 100 }, { userId: 2, score: 80 }] },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    await r.loadData()
    expect(r.scoreRows.value).toHaveLength(2)
    expect(r.scoreRows.value[0].score).toBe(100)
    expect(r.loading.value).toBe(false)
  })

  it('loadData 失败时不抛错', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    await expect(r.loadData()).resolves.toBeUndefined()
    expect(r.loading.value).toBe(false)
  })

  it('tableRows 合并 students 和 scores', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return {
          data: [
            { id: 1, name: 'alice', preferName: 'A', isTeacher: false },
            { id: 2, name: 'bob', preferName: 'B', isTeacher: false },
            { id: 3, name: 'carol', preferName: 'C', isTeacher: false },
          ],
          success: true,
          msg: '',
        }
      }
      if (url.includes('/api/courses/leaderboard')) {
        return {
          data: {
            top10: [
              { userId: 1, score: 100 },
              { userId: 2, score: 80 },
            ],
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    await r.loadData()
    expect(r.tableRows.value).toHaveLength(3)
    const byId = (id: number) => r.tableRows.value.find((row: any) => row.id === id)
    expect(byId(1).score).toBe(100)
    expect(byId(2).score).toBe(80)
    expect(byId(3).score).toBe(0) // 不在 scoreRows 中，默认 0
  })

  it('myRank 计算当前用户排名', async () => {
    setMockAuthUser({ id: 2, name: 'bob' })
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return { data: [{ id: 2, name: 'bob', isTeacher: false }], success: true, msg: '' }
      }
      if (url.includes('/api/courses/leaderboard')) {
        return {
          data: {
            top10: [
              { userId: 1, score: 100 },
              { userId: 2, score: 80 },
              { userId: 3, score: 60 },
            ],
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    await r.loadData()
    expect(r.myRank.value).toEqual({ rank: 2, userId: 2, score: 80 })
  })

  it('myRank 未登录时为 null', async () => {
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    expect(r.myRank.value).toBeNull()
  })

  it('myRank 用户不在排行中时为 null', async () => {
    setMockAuthUser({ id: 99, name: 'nobody' })
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return { data: [{ id: 99, name: 'nobody', isTeacher: false }], success: true, msg: '' }
      }
      if (url.includes('/api/courses/leaderboard')) {
        return {
          data: { top10: [{ userId: 1, score: 100 }] },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    await r.loadData()
    expect(r.myRank.value).toBeNull()
  })

  it('myStudent 返回当前用户的学生对象', async () => {
    setMockAuthUser({ id: 1, name: 'alice' })
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return { data: [{ id: 1, name: 'alice', isTeacher: false }], success: true, msg: '' }
      }
      if (url.includes('/api/courses/leaderboard')) {
        return { data: { top10: [] }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    await r.loadData()
    expect(r.myStudent.value?.name).toBe('alice')
  })

  it('isOpen 变 true 时触发 loadData', async () => {
    setMockAuthUser({ id: 1, name: 'alice' })
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/leaderboard')) {
        called = true
        return { data: { top10: [] }, success: true, msg: '' }
      }
      if (url.includes('/api/classes/users')) {
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    expect(called).toBe(false)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(called).toBe(true)
  })
})
