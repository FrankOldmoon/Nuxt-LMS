/**
 * Courses API 端点测试
 * @see modules/lms/server/api/courses/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  tokens: { name: 'name', userId: 'userId', deletedAt: 'deletedAt' },
  users: { id: 'id', username: 'username' },
  courses: { id: 'id', name: 'name', code: 'code', deletedAt: 'deletedAt' },
  userCourses: { userId: 'userId', courseId: 'courseId', score: 'score', exp: 'exp' },
  userChapters: { userId: 'userId', chapterId: 'chapterId', score: 'score' },
  chapters: { id: 'id', courseId: 'courseId' },
  configs: { id: 'id', value: 'value' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import {
  resetAllStubs,
  setMockAuthState,
  setMockQuery,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // 默认链式调用：select(...).from(...).where(...).limit(1) → []
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.selectDistinct = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.innerJoin = vi.fn().mockReturnThis()
  _mockDb.leftJoin = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
})

function makeEvent(opts: { cookies?: Record<string, any>; body?: any; query?: Record<string, any> } = {}) {
  return { cookies: opts.cookies || {}, body: opts.body, query: opts.query || {} } as any
}

describe('API: courses/me.get', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/courses/me.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('缺少 courseId 返回零值', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/me.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(true)
    expect(result.data.courseScore).toBe(0)
    expect(result.data.exp).toBe(0)
    expect(result.data.chapterScore).toBeNull()
  })

  it('有效 courseId 返回分数/经验', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ score: 85, exp: 120 }])
    const handler = (await import('../../server/api/courses/me.get')).default
    const result = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.courseScore).toBe(85)
    expect(result.data.exp).toBe(120)
  })

  it('指定 chapterId 且属于该课程时返回章节分数', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // 第一次 limit: userCourses → score/exp
    // 第二次 limit: chapters → 存在
    // 第三次 limit: userChapters → score
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ score: 80, exp: 50 }])  // userCourses
      .mockResolvedValueOnce([{ id: 10 }])             // chapters
      .mockResolvedValueOnce([{ score: 30 }])          // userChapters
    const handler = (await import('../../server/api/courses/me.get')).default
    const result = await handler(makeEvent({ query: { courseId: '1', chapterId: '10' } }))
    expect(result.success).toBe(true)
    expect(result.data.chapterScore).toBe(30)
  })

  it('chapterId 属于其他课程时 chapterScore 为 null', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ score: 80, exp: 50 }])
      .mockResolvedValueOnce([]) // chapters 查询为空 → 章节不属于该课程
    const handler = (await import('../../server/api/courses/me.get')).default
    const result = await handler(makeEvent({ query: { courseId: '1', chapterId: '999' } }))
    expect(result.success).toBe(true)
    expect(result.data.chapterScore).toBeNull()
  })
})
