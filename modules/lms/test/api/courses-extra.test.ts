/**
 * LMS Courses 端点测试（除已覆盖的 show / list / add / update / grades / leaderboard / me / number 之外）
 * @see modules/lms/server/api/courses/*.ts
 *
 * 覆盖：
 * - content.get.ts     课程内容列表（按 type 筛选 5 个表）
 * - members.get.ts     课程成员列表
 * - members.post.ts    课程成员添加/移除
 * - groups.get.ts      课程分组信息
 * - groups.post.ts     课程分组更新
 * - marks.post.ts      课程加减分
 * - progress.get.ts    课程学习进度
 * - restore.post.ts    课程版本恢复
 * - versions.get.ts    课程版本列表
 * - stats.get.ts       课程学习统计
 * - delete.post.ts     课程内容删除
 * - export.get.ts      课程导出
 * - import.post.ts     课程导入
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  courses: { id: 'id', name: 'name', code: 'code', categoryId: 'categoryId', content: 'content', orders: 'orders', gradeCriteria: 'gradeCriteria', tags: 'tags', config: 'config' },
  chapters: { id: 'id', courseId: 'courseId', name: 'name', code: 'code', content: 'content', tags: 'tags', questionIds: 'questionIds', homeworkIds: 'homeworkIds', commentIds: 'commentIds', quizIds: 'quizIds', objectives: 'objectives', tasks: 'tasks', isOpen: 'isOpen' },
  questions: { courseId: 'courseId', cid: 'cid', name: 'name', content: 'content', tags: 'tags', point: 'point', type: 'type', options: 'options', answer: 'answer' },
  homeworks: { courseId: 'courseId', cid: 'cid', name: 'name', content: 'content', tags: 'tags', point: 'point', code: 'code', explanation: 'explanation' },
  comments: { courseId: 'courseId', cid: 'cid', name: 'name', content: 'content', tags: 'tags', point: 'point', userId: 'userId', parentId: 'parentId', status: 'status' },
  quizzes: { courseId: 'courseId', cid: 'cid', name: 'name', content: 'content', tags: 'tags', point: 'point', questions: 'questions', timeLimit: 'timeLimit', submitLimit: 'submitLimit', startAt: 'startAt', endAt: 'endAt' },
  races: { courseId: 'courseId', cid: 'cid', name: 'name', content: 'content', tags: 'tags', point: 'point', questionIds: 'questionIds', gapTime: 'gapTime' },
  userCourses: { userId: 'userId', courseId: 'courseId', group: 'group', score: 'score', marksScore: 'marksScore', isTeacher: 'isTeacher' },
  userQuestions: { userId: 'userId', courseId: 'courseId' },
  userHomeworks: { userId: 'userId', courseId: 'courseId' },
  userQuizzes: { userId: 'userId', courseId: 'courseId' },
  userRaces: { userId: 'userId', courseId: 'courseId' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// mock courseProgress utils (progress.get.ts imports from query + access + assemble)
vi.mock('../../server/utils/courseProgress/query', () => ({
  queryQuestionStatus: vi.fn().mockResolvedValue({}),
  queryHomeworkStatus: vi.fn().mockResolvedValue({}),
  queryCommentStatus: vi.fn().mockResolvedValue({}),
  queryUserChapterScores: vi.fn().mockResolvedValue({ scoreMap: {}, passMap: {} }),
}))
vi.mock('../../server/utils/courseProgress/access', () => ({
  computeChapterAccessibility: vi.fn().mockResolvedValue(new Set()),
}))
vi.mock('../../server/utils/courseProgress/assemble', () => ({
  collectAllItemCids: vi.fn().mockReturnValue({ allQuestionCids: [], allHomeworkCids: [], allCommentCids: [] }),
  assembleProgress: vi.fn().mockReturnValue([]),
}))

// mock courseImport utils (import.post.ts imports from category + entities + comments + chapters + orders)
vi.mock('../../server/utils/courseImport/category', () => ({
  resolveCategory: vi.fn().mockResolvedValue(1),
  createCourse: vi.fn().mockResolvedValue(10),
}))
vi.mock('../../server/utils/courseImport/entities', () => ({
  importQuestions: vi.fn().mockResolvedValue(new Map()),
  importHomeworks: vi.fn().mockResolvedValue(new Map()),
  importQuizzes: vi.fn().mockResolvedValue(new Map()),
  importRaces: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('../../server/utils/courseImport/comments', () => ({
  importComments: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('../../server/utils/courseImport/chapters', () => ({
  importChapters: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('../../server/utils/courseImport/orders', () => ({
  remapOrders: vi.fn().mockReturnValue([]),
  updateCourseOrders: vi.fn().mockResolvedValue(undefined),
}))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
  // 默认可访问的 db 事务：直接执行回调
  _mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => fn(_mockDb))
})

// ====================== content.get.ts ======================

describe('API: courses/content', () => {
  it('缺少 course_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/content.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('非教师/管理员被拒', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'stu', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/content.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1' } }))).rejects.toThrow()
  })

  it('type=question 只返回 questions', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.questions.findMany = vi.fn().mockResolvedValue([
      { courseId: 1, cid: 1, name: 'Q1', content: '{}', tags: [], point: 10, type: 'single', options: [], answer: 'A', createdAt: null, updatedAt: null },
    ])
    const handler = (await import('../../server/api/courses/content.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', type: 'question' } }))
    expect(r.success).toBe(true)
    expect(r.data.every((x: any) => x.type === 'question')).toBe(true)
  })

  it('type 不传时合并 5 个表并按 type+cid 排序', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.questions.findMany = vi.fn().mockResolvedValue([{ courseId: 1, cid: 2, name: 'Q2', content: '{}', tags: [], point: 1, type: 's', options: [], answer: '', createdAt: null, updatedAt: null }])
    _mockDb.query.homeworks.findMany = vi.fn().mockResolvedValue([{ courseId: 1, cid: 1, name: 'H1', content: '{}', tags: [], point: 1, code: '', explanation: '', createdAt: null, updatedAt: null }])
    _mockDb.query.comments.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.quizzes.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.races.findMany = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/courses/content.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.length).toBe(2)
    // 排序：comment(0) < homework(0) < question(0) < quiz(0) < race(0)；同 type 按 cid
    expect(r.data[0].type).toBe('homework')
    expect(r.data[1].type).toBe('question')
  })
})

// ====================== members.get.ts ======================

describe('API: courses/members', () => {
  it('缺少 id 参数返回失败', async () => {
    const handler = (await import('../../server/api/courses/members.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('getCourseMembers 返回空数组', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    ;(globalThis as any).getCourseMembers = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/courses/members.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })

  it('getCourseMembers 返回成员列表', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    ;(globalThis as any).getCourseMembers = vi.fn().mockResolvedValue([
      { userId: 1, role: 'teacher' },
      { userId: 2, role: 'editor' },
    ])
    const handler = (await import('../../server/api/courses/members.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
  })
})

// ====================== members.post.ts ======================

describe('API: courses/members POST', () => {
  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/members.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1 } }))
    expect(r.success).toBe(false)
  })

  it('role 非法返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/members.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1, userId: 2, role: 'admin', action: 'add' } }))
    expect(r.success).toBe(false)
  })

  it('非管理员被拒', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/members.post')).default
    await expect(handler(makeEvent({ body: { courseId: 1, userId: 2, role: 'teacher', action: 'add' } }))).rejects.toThrow()
  })

  it('add teacher 同步分配角色', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).updateCourseMember = vi.fn().mockResolvedValue(undefined)
    const handler = (await import('../../server/api/courses/members.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1, userId: 2, role: 'teacher', action: 'add' } }))
    expect(r.success).toBe(true)
    const { getAssignedRoles } = await import('../../../../test/setup/nuxt-stubs')
    expect(getAssignedRoles().some((a: any) => a.userId === 2 && a.roleCode === 'teacher')).toBe(true)
  })

  it('add editor 不分配角色', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).updateCourseMember = vi.fn().mockResolvedValue(undefined)
    const handler = (await import('../../server/api/courses/members.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1, userId: 2, role: 'editor', action: 'add' } }))
    expect(r.success).toBe(true)
    const { getAssignedRoles } = await import('../../../../test/setup/nuxt-stubs')
    expect(getAssignedRoles().some((a: any) => a.userId === 2 && a.roleCode === 'teacher')).toBe(false)
  })

  it('updateCourseMember 抛错时返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).updateCourseMember = vi.fn().mockRejectedValue(new Error('db error'))
    const handler = (await import('../../server/api/courses/members.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1, userId: 2, role: 'teacher', action: 'add' } }))
    expect(r.success).toBe(false)
  })
})

// ====================== groups.get.ts ======================

describe('API: courses/groups GET', () => {
  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/groups.get')).default
    const r = await handler(makeEvent({ query: { classId: '1' } }))
    expect(r.success).toBe(false)
  })

  it('缺少 classId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/groups.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(false)
  })

  it('班级无学生返回空数组', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/courses/groups.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', classId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })

  it('返回分组+得分', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 1, isTeacher: false },
      { id: 2, isTeacher: false },
    ])
    _mockDb.where = vi.fn().mockResolvedValue([
      { userId: 1, group: 'c_g1', score: '90' },
      { userId: 2, group: 'g1', score: '80' },
    ])
    const handler = (await import('../../server/api/courses/groups.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', classId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
    expect(r.data[0].score).toBe(90)
  })
})

// ====================== groups.post.ts ======================

describe('API: courses/groups POST', () => {
  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/groups.post')).default
    const r = await handler(makeEvent({ body: { groups: {} } }))
    expect(r.success).toBe(false)
  })

  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    const handler = (await import('../../server/api/courses/groups.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1, groups: {} } }))
    expect(r.success).toBe(false)
  })

  it('管理员可更新分组', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/groups.post')).default
    const r = await handler(makeEvent({
      body: { courseId: 1, groups: { group1: [{ userId: 2 }, { userId: 3 }] } },
    }))
    expect(r.success).toBe(true)
  })

  it('教师可更新分组（isCourseTeacher true）', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    const handler = (await import('../../server/api/courses/groups.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1, groups: { g1: [{ userId: 2 }] } } }))
    expect(r.success).toBe(true)
  })
})

// ====================== marks.post.ts ======================

describe('API: courses/marks', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/marks.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, user_ids: [2], delta: 5 } }))).rejects.toThrow()
  })

  it('缺少 course_id 或 user_ids 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/marks.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('delta=0 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/marks.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, user_ids: [2], delta: 0 } }))
    expect(r.success).toBe(false)
  })

  it('delta 非数字返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/marks.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, user_ids: [2], delta: 'abc' } }))
    expect(r.success).toBe(false)
  })

  it('正常加减分返回成功', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.select = vi.fn().mockReturnThis()
    _mockDb.from = vi.fn().mockReturnThis()
    _mockDb.where = vi.fn().mockResolvedValue([]) // 没有 existing → 走 insert 路径
    const handler = (await import('../../server/api/courses/marks.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, user_ids: [2, 3], delta: 5 } }))
    expect(r.success).toBe(true)
    expect(r.data.delta).toBe(5)
  })
})

// ====================== progress.get.ts ======================

describe('API: courses/progress', () => {
  it('缺少 courseId 返回空数组', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/progress.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/courses/progress.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1' } }))).rejects.toThrow()
  })

  it('已登录时调用 assembleProgress', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue([]) // 章节列表
    const { assembleProgress } = await import('../../server/utils/courseProgress/assemble')
    ;(assembleProgress as any).mockReturnValue([{ chapterId: 1, score: 80 }])
    const handler = (await import('../../server/api/courses/progress.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(1)
  })
})

// ====================== restore.post.ts ======================

describe('API: courses/restore', () => {
  it('缺少 versionId 返回失败', async () => {
    const handler = (await import('../../server/api/courses/restore.post')).default
    const r = await handler(makeEvent({ body: {} }))
    expect(r.success).toBe(false)
  })

  it('版本不存在返回失败', async () => {
    ;(globalThis as any).getContentVersion = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/courses/restore.post')).default
    const r = await handler(makeEvent({ body: { versionId: 1 } }))
    expect(r.success).toBe(false)
  })

  it('恢复成功', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).getContentVersion = vi.fn().mockResolvedValue({ courseId: 5, content: '{}' })
    ;(globalThis as any).restoreContentVersion = vi.fn().mockResolvedValue(undefined)
    const handler = (await import('../../server/api/courses/restore.post')).default
    const r = await handler(makeEvent({ body: { versionId: 1 } }))
    expect(r.success).toBe(true)
  })

  it('restoreContentVersion 抛错返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).getContentVersion = vi.fn().mockResolvedValue({ courseId: 5, content: '{}' })
    ;(globalThis as any).restoreContentVersion = vi.fn().mockRejectedValue(new Error('db error'))
    const handler = (await import('../../server/api/courses/restore.post')).default
    const r = await handler(makeEvent({ body: { versionId: 1 } }))
    expect(r.success).toBe(false)
  })
})

// ====================== versions.get.ts ======================

describe('API: courses/versions', () => {
  it('缺少 id 返回失败', async () => {
    const handler = (await import('../../server/api/courses/versions.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('返回版本列表', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).listContentVersions = vi.fn().mockResolvedValue([
      { id: 1, createdAt: '2024-01-01' },
      { id: 2, createdAt: '2024-01-02' },
    ])
    const handler = (await import('../../server/api/courses/versions.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
  })
})

// ====================== stats.get.ts ======================

describe('API: courses/stats', () => {
  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/stats.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/courses/stats.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1' } }))).rejects.toThrow()
  })

  it('返回 5 项统计', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    let callCount = 0
    _mockDb.where = vi.fn().mockImplementation(() => {
      callCount++
      return [{ n: callCount * 10 }]
    })
    const handler = (await import('../../server/api/courses/stats.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveProperty('questionCount')
    expect(r.data).toHaveProperty('homeworkCount')
    expect(r.data).toHaveProperty('quizCount')
    expect(r.data).toHaveProperty('raceCount')
    expect(r.data).toHaveProperty('commentCount')
  })
})

// ====================== delete.post.ts ======================

describe('API: courses/delete', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/delete.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, cid: 1, type: 'question' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('未知 type 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1, type: 'invalid' } }))
    expect(r.success).toBe(false)
  })

  it('成功删除 question', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1, type: 'question' } }))
    expect(r.success).toBe(true)
    expect(r.data.deleted).toBe(true)
  })

  it('成功删除 homework', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1, type: 'homework' } }))
    expect(r.success).toBe(true)
  })
})

// ====================== export.get.ts ======================

describe('API: courses/export', () => {
  it('缺少 id 返回失败', async () => {
    const handler = (await import('../../server/api/courses/export.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('课程不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.query.courses.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/courses/export.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(false)
  })

  it('返回完整导出 JSON', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.query.courses.findFirst = vi.fn().mockResolvedValue({
      id: 1, name: 'C1', code: 'C1', categoryId: 1, content: '{}', orders: [],
      gradeCriteria: '{}', tags: [], config: '{}',
    })
    // 第一处 where 是 chapters.where().orderBy() 链；第二处是 race 查询
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(() => {
      whereCall++
      if (whereCall === 1) {
        // chapters 链：where 后还接 orderBy，然后 resolve
        const chain: any = { orderBy: vi.fn().mockResolvedValue([]) }
        return chain
      }
      return []
    })
    const handler = (await import('../../server/api/courses/export.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.version).toBe(1)
    expect(r.data.course.name).toBe('C1')
    expect(r.data.chapters).toEqual([])
  })
})

// ====================== import.post.ts ======================

describe('API: courses/import', () => {
  it('非管理员被拒', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/courses/import.post')).default
    await expect(handler(makeEvent({ body: { data: { version: 1, course: {}, chapters: [] } } }))).rejects.toThrow()
  })

  it('无效数据格式返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/import.post')).default
    const r = await handler(makeEvent({ body: { data: { version: 1 } } }))
    expect(r.success).toBe(false)
  })

  it('不支持的版本返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/import.post')).default
    const r = await handler(makeEvent({ body: { data: { version: 99, course: {}, chapters: [] } } }))
    expect(r.success).toBe(false)
  })

  it('成功导入并广播 home-changed', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const { getWsBroadcasts, clearWsBroadcasts } = await import('../../../../test/setup/nuxt-stubs')
    clearWsBroadcasts()
    const handler = (await import('../../server/api/courses/import.post')).default
    const r = await handler(makeEvent({ body: { data: { version: 1, course: { name: 'X' }, chapters: [] } } }))
    expect(r.success).toBe(true)
    expect(r.data.courseId).toBe(10)
    expect(getWsBroadcasts().some((m: any) => m.type === 'home-changed')).toBe(true)
  })
})
