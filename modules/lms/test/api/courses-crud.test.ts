/**
 * LMS Courses CRUD + 成绩相关端点测试
 * @see modules/lms/server/api/courses/*.ts
 *
 * 覆盖：
 * - add.post.ts        新增课程（管理员）
 * - list.ts            课程列表（公开）
 * - batch.post.ts      批量操作课程（管理员）
 * - update.post.ts     更新课程（课程教师）
 * - show.get.ts        课程详情（含教师/学生人数/章节可访问性/isPass）
 * - grades.get.ts      课程成绩（学生看自己/教师看全班）
 * - extra-score.post.ts 额外分设置（教师/管理员）
 * - leaderboard.get.ts 排行榜
 * - members-search.get.ts 成员搜索
 * - number.post.ts     设置学号/分组
 * - numbers.get.ts     批量获取学号
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  courses: { id: 'id', name: 'name', code: 'code', content: 'content', orders: 'orders', gradeCriteria: 'gradeCriteria', categoryId: 'categoryId', tags: 'tags', config: 'config' },
  chapters: { id: 'id', courseId: 'courseId', name: 'name', isOpen: 'isOpen', updatedAt: 'updatedAt' },
  userCourses: {
    userId: 'userId', courseId: 'courseId', score: 'score',
    questionScore: 'questionScore', homeworkScore: 'homeworkScore', quizScore: 'quizScore',
    commentScore: 'commentScore', attitudeScore: 'attitudeScore',
    externalScore: 'externalScore', records: 'records', group: 'group', number: 'number',
    isTeacher: 'isTeacher', isEditor: 'isEditor', deletedAt: 'deletedAt',
  },
  userClasses: { userId: 'userId', classId: 'classId' },
  users: { id: 'id', name: 'name', username: 'username', classId: 'classId', deletedAt: 'deletedAt' },
  classChapters: { classId: 'classId', chapterId: 'chapterId', open: 'open' },
  userChapters: { userId: 'userId', chapterId: 'chapterId', isPass: 'isPass' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import {
  resetAllStubs, setMockAuthState, getWsBroadcasts, clearWsBroadcasts,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
  clearWsBroadcasts()
})

// ====================== add.post.ts ======================

describe('API: courses/add.post', () => {
  it('非管理员抛 403', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/add.post')).default
    await expect(handler(makeEvent({ body: { name: 'C1' } }))).rejects.toThrow()
  })

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/courses/add.post')).default
    await expect(handler(makeEvent({ body: { name: 'C1' } }))).rejects.toThrow()
  })

  it('管理员成功新增并广播 home-changed', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/add.post')).default
    const r = await handler(makeEvent({ body: { name: 'New Course', code: 'CS101' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(1)
    expect(r.data[0].name).toBe('New Course')
    expect(getWsBroadcasts().some((m: any) => m.type === 'home-changed')).toBe(true)
  })
})

// ====================== list.ts ======================

describe('API: courses/list', () => {
  it('公开端点返回课程列表', async () => {
    // list API 直接读 db.query.courses.findMany
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([{ id: 1, name: 'C1' }, { id: 2, name: 'C2' }])
    const handler = (await import('../../server/api/courses/list')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
  })

  it('无课程返回空数组', async () => {
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/courses/list')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })
})

// ====================== batch.post.ts ======================

describe('API: courses/batch.post', () => {
  it('非管理员抛 403', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/batch.post')).default
    await expect(handler(makeEvent({ body: { ids: [1], action: 'delete' } }))).rejects.toThrow()
  })

  it('管理员批量删除并广播', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/batch.post')).default
    const r = await handler(makeEvent({ body: { ids: [1, 2, 3], action: 'delete' } }))
    expect(r.success).toBe(true)
    expect(getWsBroadcasts().some((m: any) => m.type === 'home-changed')).toBe(true)
  })

  it('batchTable 抛错返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    ;(globalThis as any).batchTable = vi.fn().mockRejectedValue(new Error('db down'))
    const handler = (await import('../../server/api/courses/batch.post')).default
    const r = await handler(makeEvent({ body: { ids: [1], action: 'delete' } }))
    expect(r.success).toBe(false)
  })
})

// ====================== update.post.ts ======================

describe('API: courses/update.post', () => {
  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/update.post')).default
    const r = await handler(makeEvent({ body: { name: 'New' } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/id/)
  })

  it('非课程教师抛 403', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/update.post')).default
    await expect(handler(makeEvent({ body: { id: 1, name: 'New' } }))).rejects.toThrow()
  })

  it('管理员成功更新（无 content 变更）并广播', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/update.post')).default
    const r = await handler(makeEvent({ body: { id: 1, name: 'Updated' } }))
    expect(r.success).toBe(true)
    expect(getWsBroadcasts().some((m: any) => m.type === 'home-changed')).toBe(true)
  })

  it('更新 content 且与旧值不同时保存版本快照', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    let savedVersion = false
    ;(globalThis as any).showTable = vi.fn().mockResolvedValue({ id: 1, content: { old: true } })
    ;(globalThis as any).saveContentVersion = vi.fn().mockImplementation(async () => { savedVersion = true })
    const handler = (await import('../../server/api/courses/update.post')).default
    const r = await handler(makeEvent({ body: { id: 1, content: { new: true } } }))
    expect(r.success).toBe(true)
    expect(savedVersion).toBe(true)
  })

  it('更新 content 与旧值相同时不保存版本', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    let savedVersion = false
    ;(globalThis as any).showTable = vi.fn().mockResolvedValue({ id: 1, content: { same: true } })
    ;(globalThis as any).saveContentVersion = vi.fn().mockImplementation(async () => { savedVersion = true })
    const handler = (await import('../../server/api/courses/update.post')).default
    const r = await handler(makeEvent({ body: { id: 1, content: { same: true } } }))
    expect(r.success).toBe(true)
    expect(savedVersion).toBe(false)
  })

  it('更新 orders 时同步章节名称', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/update.post')).default
    const r = await handler(makeEvent({
      body: { id: 1, orders: [{ id: '10', label: '第一章' }, { id: 'custom-x', label: 'skip' }, { id: 'course', label: 'skip' }] },
    }))
    expect(r.success).toBe(true)
    // chapters.update 应被调用（仅 id=10 这条；custom-/course 被过滤）
    expect(_mockDb.update).toHaveBeenCalled()
  })

  it('updateTable 抛错返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    ;(globalThis as any).updateTable = vi.fn().mockRejectedValue(new Error('db error'))
    const handler = (await import('../../server/api/courses/update.post')).default
    const r = await handler(makeEvent({ body: { id: 1, name: 'X' } }))
    expect(r.success).toBe(false)
  })
})

// ====================== show.get.ts ======================

describe('API: courses/show.get', () => {
  it('缺少 id 返回失败', async () => {
    const handler = (await import('../../server/api/courses/show.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/ID/)
  })

  it('课程不存在返回失败', async () => {
    _mockDb.query.courses.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/courses/show.get')).default
    const r = await handler(makeEvent({ query: { id: '999' } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/不存在/)
  })

  it('管理员看到所有章节可访问', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.query.courses.findFirst = vi.fn().mockResolvedValue({
      id: 1, name: 'C1', description: 'd', content: {},
      chapters: [{ id: 10, name: 'Ch1', isOpen: false }, { id: 11, name: 'Ch2', isOpen: true }],
    })
    ;(globalThis as any).getCourseMembers = vi.fn().mockResolvedValue([{ userId: 2, username: 't', name: 'T', isTeacher: true }])
    // studentCount 查询 + userChapters 查询：两次 where 终端
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(function () {
      whereCall++
      if (whereCall === 1) return [{ count: 5 }]       // studentCount
      return []                                          // userChapters
    })
    const handler = (await import('../../server/api/courses/show.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.chapters).toHaveLength(2)
    expect(r.data.chapters.every((c: any) => c.accessible === true)).toBe(true)
    expect(r.data.studentCount).toBe(5)
    expect(r.data.teachers).toHaveLength(1)
  })

  it('学生仅看到 isOpen 的章节', async () => {
    setMockAuthState({ id: 5, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.query.courses.findFirst = vi.fn().mockResolvedValue({
      id: 1, name: 'C1', description: 'd', content: {},
      chapters: [{ id: 10, name: 'Ch1', isOpen: false }, { id: 11, name: 'Ch2', isOpen: true }],
    })
    ;(globalThis as any).getCourseMembers = vi.fn().mockResolvedValue([])
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    // 5 次 where：studentCount / userClasses / users(直接归属) / classChapters / userChapters
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(function () {
      whereCall++
      if (whereCall === 1) return [{ count: 3 }]        // studentCount
      if (whereCall === 2) return []                    // userClasses（学生未在 user_classes）
      if (whereCall === 3) return [{ classId: 1 }]      // users.classId 直接归属（修复核心）
      if (whereCall === 4) return [{ chapterId: 11 }]   // classChapters (open)
      return [{ chapterId: 11, isPass: true }]           // userChapters
    })
    const handler = (await import('../../server/api/courses/show.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    const ch10 = r.data.chapters.find((c: any) => c.id === 10)
    const ch11 = r.data.chapters.find((c: any) => c.id === 11)
    expect(ch10.accessible).toBe(false)
    expect(ch11.accessible).toBe(true)
    expect(ch11.isPass).toBe(true)
    expect(ch10.isPass).toBe(false)
  })

  it('未登录用户仍可查看但无 isPass', async () => {
    setMockAuthState(null)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(null)
    _mockDb.query.courses.findFirst = vi.fn().mockResolvedValue({
      id: 1, name: 'C1', description: 'd', content: {},
      chapters: [{ id: 10, name: 'Ch1', isOpen: true }],
    })
    ;(globalThis as any).getCourseMembers = vi.fn().mockResolvedValue([])
    _mockDb.where = vi.fn().mockResolvedValue([{ count: 0 }]) // studentCount
    const handler = (await import('../../server/api/courses/show.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.chapters[0].accessible).toBe(true)
    expect(r.data.chapters[0].isPass).toBeUndefined()
  })
})

// ====================== grades.get.ts ======================

describe('API: courses/grades.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/courses/grades.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1', classId: '2' } }))).rejects.toThrow()
  })

  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/grades.get')).default
    const r = await handler(makeEvent({ query: { classId: '2' } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/courseId/)
  })

  it('教师缺少 classId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/grades.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/classId/)
  })

  it('学生无 classId 也能查看自己的成绩（未分班）', async () => {
    setMockAuthState({ id: 5, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(function (this: any) {
      whereCall++
      if (whereCall === 1) {
        return [{
          userId: 5, score: '85', questionScore: '20', homeworkScore: '20', quizScore: '20',
          commentScore: '10', attitudeScore: '10', externalScore: '0',
          records: { progress: 80 }, group: 'g1',
        }]
      }
      return this
    })
    _mockDb.limit = vi.fn().mockResolvedValue([{ gradeCriteria: { levels: [{ letter: 'A', min: 90 }] } }])
    const handler = (await import('../../server/api/courses/grades.get')).default
    // 不传 classId（学生未分班）时，学生自我查询应成功
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.grades).toHaveLength(1)
    expect(r.data.grades[0].userId).toBe(5)
    expect(r.data.grades[0].score).toBe(85)
    expect(r.data.grades[0].progress).toBe(80)
    expect(r.data.gradeCriteria).toBeDefined()
  })

  it('学生只返回自己的成绩', async () => {
    setMockAuthState({ id: 5, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    // 第 1 次 where：myGrade（终端）；第 2 次 where 返回 this 给 limit
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(function (this: any) {
      whereCall++
      if (whereCall === 1) {
        return [{
          userId: 5, score: '85', questionScore: '20', homeworkScore: '20', quizScore: '20',
          commentScore: '10', attitudeScore: '10', externalScore: '0',
          records: { progress: 80 }, group: 'g1',
        }]
      }
      return this // 第 2 次给 limit 链
    })
    _mockDb.limit = vi.fn().mockResolvedValue([{ gradeCriteria: { levels: [{ letter: 'A', min: 90 }] } }])
    const handler = (await import('../../server/api/courses/grades.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', classId: '2' } }))
    expect(r.success).toBe(true)
    expect(r.data.grades).toHaveLength(1)
    expect(r.data.grades[0].userId).toBe(5)
    expect(r.data.grades[0].score).toBe(85)
    expect(r.data.grades[0].progress).toBe(80)
    expect(r.data.gradeCriteria).toBeDefined()
  })

  it('教师返回全班成绩并按分数降序', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 2, isTeacher: false },
      { id: 3, isTeacher: false },
    ])
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(function (this: any) {
      whereCall++
      if (whereCall === 1) {
        return [
          { userId: 2, score: '70', questionScore: '10', homeworkScore: '10', quizScore: '10', commentScore: '10', attitudeScore: '10', externalScore: '10', records: { progress: 50 }, group: 'g1' },
          { userId: 3, score: '90', questionScore: '20', homeworkScore: '20', quizScore: '20', commentScore: '10', attitudeScore: '10', externalScore: '0', records: { progress: 90 }, group: 'g2' },
        ]
      }
      return this
    })
    _mockDb.limit = vi.fn().mockResolvedValue([{ gradeCriteria: null }])
    const handler = (await import('../../server/api/courses/grades.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', classId: '2' } }))
    expect(r.success).toBe(true)
    expect(r.data.grades).toHaveLength(2)
    expect(r.data.grades[0].userId).toBe(3) // 90 分在前
    expect(r.data.grades[1].userId).toBe(2) // 70 分在后
  })

  it('班级无学生返回空数组', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/courses/grades.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', classId: '2' } }))
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })
})

// ====================== extra-score.post.ts ======================

describe('API: courses/extra-score.post', () => {
  it('非教师/管理员抛 403', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/extra-score.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, user_id: 2, extra_score: 5 } }))).rejects.toThrow()
  })

  it('缺少 course_id 或 user_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/extra-score.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, extra_score: 5 } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/course_id|user_id/)
  })

  it('extra_score 非数字返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/extra-score.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, user_id: 2, extra_score: 'abc' } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/extra_score/)
  })

  it('教师成功设置额外分', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    _mockDb.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
    const handler = (await import('../../server/api/courses/extra-score.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, user_id: 2, extra_score: 5 } }))
    expect(r.success).toBe(true)
    expect(r.data.externalScore).toBe(5)
    expect(_mockDb.insert).toHaveBeenCalled()
  })
})

// ====================== leaderboard.get.ts ======================

describe('API: courses/leaderboard.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/courses/leaderboard.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1', classId: '2' } }))).rejects.toThrow()
  })

  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/leaderboard.get')).default
    const r = await handler(makeEvent({ query: { classId: '2' } }))
    expect(r.success).toBe(false)
  })

  it('班级无学生返回空 top10', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/courses/leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', classId: '2' } }))
    expect(r.success).toBe(true)
    expect(r.data.top10).toEqual([])
    expect(r.data.myRank).toBeNull()
  })

  it('返回排序后的排行榜与当前用户排名', async () => {
    setMockAuthState({ id: 3, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 2, isTeacher: false },
      { id: 3, isTeacher: false },
      { id: 4, isTeacher: false },
    ])
    _mockDb.where = vi.fn().mockResolvedValue([
      { userId: 2, score: '70', exp: 500 },
      { userId: 3, score: '90', exp: 1200 },
      { userId: 4, score: '80', exp: 150 },
    ])
    const handler = (await import('../../server/api/courses/leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', classId: '2' } }))
    expect(r.success).toBe(true)
    expect(r.data.top10).toHaveLength(3)
    expect(r.data.top10[0].userId).toBe(3)   // 90 分第一
    expect(r.data.top10[0].exp).toBe(1200)   // 携带经验值
    expect(r.data.top10[1].userId).toBe(4)   // 80 分第二
    expect(r.data.myRank).toBe(1)            // 当前用户第 1 名
    expect(r.data.myInfo.score).toBe(90)
    expect(r.data.myInfo.exp).toBe(1200)
  })
})

// ====================== members-search.get.ts ======================

describe('API: courses/members-search.get', () => {
  it('空关键字返回空数组', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    const handler = (await import('../../server/api/courses/members-search.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', keyword: '' } }))
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })

  it('传 courseId 时需要课程教师权限', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    const handler = (await import('../../server/api/courses/members-search.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1', keyword: 'alice' } }))).rejects.toThrow()
  })

  it('无 courseId 时仅需登录', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    ;(globalThis as any).searchUsers = vi.fn().mockResolvedValue([{ id: 2, username: 'alice' }])
    const handler = (await import('../../server/api/courses/members-search.get')).default
    const r = await handler(makeEvent({ query: { keyword: 'alice' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(1)
  })

  it('教师成功搜索用户', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    ;(globalThis as any).searchUsers = vi.fn().mockResolvedValue([
      { id: 2, username: 'alice', name: 'Alice' },
      { id: 3, username: 'bob', name: 'Bob' },
    ])
    const handler = (await import('../../server/api/courses/members-search.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', keyword: 'a' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
  })
})

// ====================== number.post.ts ======================

describe('API: courses/number.post', () => {
  it('非教师/管理员抛 403', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/number.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, user_id: 2, number: '001' } }))).rejects.toThrow()
  })

  it('缺少 course_id 或 user_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/number.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('已有记录时更新学号', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    _mockDb.query.userCourses.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, number: '001' })
    _mockDb.returning = vi.fn().mockResolvedValue([{ userId: 2, courseId: 1, number: '002', group: 'g1' }])
    const handler = (await import('../../server/api/courses/number.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, user_id: 2, number: '002', group: 'g1' } }))
    expect(r.success).toBe(true)
    expect(r.data.number).toBe('002')
    expect(_mockDb.update).toHaveBeenCalled()
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })

  it('无记录时插入新学号', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    _mockDb.query.userCourses.findFirst = vi.fn().mockResolvedValue(null)
    _mockDb.returning = vi.fn().mockResolvedValue([{ userId: 2, courseId: 1, number: '001', group: null }])
    const handler = (await import('../../server/api/courses/number.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, user_id: 2, number: '001' } }))
    expect(r.success).toBe(true)
    expect(r.data.number).toBe('001')
    expect(_mockDb.insert).toHaveBeenCalled()
  })
})

// ====================== numbers.get.ts ======================

describe('API: courses/numbers.get', () => {
  it('非教师/管理员抛 403', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/numbers.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1' } }))).rejects.toThrow()
  })

  it('缺少 course_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/numbers.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/course_id/)
  })

  it('返回 { userId: number } 映射', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    _mockDb.query.userCourses.findMany = vi.fn().mockResolvedValue([
      { userId: 2, number: '001' },
      { userId: 3, number: '002' },
      { userId: 4, number: '' },
    ])
    const handler = (await import('../../server/api/courses/numbers.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data[2]).toBe('001')
    expect(r.data[3]).toBe('002')
    expect(r.data[4]).toBe('')
  })
})
