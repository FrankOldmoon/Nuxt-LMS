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
  // stub useLmsPublicConfig（auto-import）
  ;(globalThis as any).useLmsPublicConfig = () => ({ levelStep: ref(100) })
  // stub expToLevel（auto-import util）—— 直接复用真实实现
  const { expToLevel } = await import('../../utils/expLevel')
  ;(globalThis as any).expToLevel = expToLevel
})

describe('composables/useCourseLeaderboard', () => {
  it('初始状态', async () => {
    // 未登录：无用户、无数据 → 表格为空
    const isOpen = ref(false)
    const { useCourseLeaderboard } = await import('../../composables/useCourseLeaderboard')
    const r = useCourseLeaderboard({ courseId: 1, classId: 10 }, isOpen)
    expect(r.loading.value).toBe(false)
    expect(r.scoreRows.value).toEqual([])
    expect(r.myRank.value).toBeNull()
    expect(r.tableRows.value).toEqual([])
    expect(r.extraColumns.value).toHaveLength(3)
    expect(r.extraColumns.value[0].id).toBe('class')
    expect(r.extraColumns.value[1].id).toBe('lv')
    expect(r.extraColumns.value[2].id).toBe('score')
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

  it('tableRows 只含前10 + 自己（自己不在前10时追加）', async () => {
    // 当前用户 carol(id=3) 不在前10 → 表格 = 前10 + carol
    setMockAuthUser({ id: 3, name: 'carol' })
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
              { userId: 1, score: 100, exp: 1200, classId: 10, className: 'ClassA' },
              { userId: 2, score: 80, exp: 150 },
            ],
            myRank: 3,
            myInfo: { userId: 3, score: 60, exp: 0, classId: 10, className: 'ClassA' },
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
    // 前10（1,2）+ 自己（3，不在前10追加）
    expect(r.tableRows.value).toHaveLength(3)
    const byId = (id: number) => r.tableRows.value.find((row: any) => row.id === id)
    expect(byId(1).score).toBe(100)
    expect(byId(2).score).toBe(80)
    expect(byId(3).score).toBe(60) // 自己的行使用 myInfo.score
    // 班级名称（来自 users.class_id，由后端返回）
    expect(byId(1).className).toBe('ClassA')
    expect(byId(3).className).toBe('ClassA')
    // lv 由 exp 换算：exp=1200 → Lv.5（levelStep=100）
    expect(byId(1).lv).toBe(5)
    expect(byId(1).exp).toBe(1200)
    expect(byId(2).lv).toBe(2)
    expect(byId(3).lv).toBe(1)
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
              { userId: 1, score: 100, exp: 1200 },
              { userId: 2, score: 80, exp: 150 },
              { userId: 3, score: 60, exp: 0 },
            ],
            myRank: 2,
            myInfo: { userId: 2, score: 80, exp: 150 },
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
    expect(r.myRank.value).toEqual({ rank: 2, userId: 2, score: 80, exp: 150, classId: null, className: '' })
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
