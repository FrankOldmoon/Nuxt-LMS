/**
 * Condition check API 端点测试
 * @see modules/lms/server/api/condition/check.post.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  users: { id: 'id', classId: 'classId', defaultClass: 'defaultClass' },
  userClasses: { userId: 'userId', classId: 'classId', deletedAt: 'deletedAt' },
  userQuestions: { userId: 'userId', questionCid: 'questionCid' },
  userHomeworks: { userId: 'userId', homeworkCid: 'homeworkCid' },
  userComments: { userId: 'userId', commentCid: 'commentCid' },
  userQuizzes: { userId: 'userId', quizCid: 'quizCid' },
  userRaces: { userId: 'userId', raceCid: 'raceCid' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
})

function makeEvent(body: any = undefined) {
  return { cookies: {}, body, query: {} } as any
}

describe('API: condition/check.post', () => {
  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/condition/check.post')).default
    await expect(handler(makeEvent({ conditions: [] }))).rejects.toThrow()
  })

  it('无 conditions 默认满足', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [] }))
    expect(result.success).toBe(true)
    expect(result.data.met).toBe(true)
  })

  it('role 条件：匹配返回 met=true', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'role', value: 'teacher' }] }))
    expect(result.success).toBe(true)
    expect(result.data.met).toBe(true)
    expect(result.data.details[0].met).toBe(true)
  })

  it('role 条件：teacher/admin 互通过（admin 满足 teacher 条件）', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'role', value: 'teacher' }] }))
    expect(result.data.met).toBe(true)
  })

  it('role 条件：不匹配返回 met=false', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'role', value: 'admin' }] }))
    expect(result.data.met).toBe(false)
  })

  it('class 条件：userClasses 关联命中返回 met=true', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // 第 1 次 limit：users 主班级查询（无主班级）；第 2 次 limit：userClasses 关联命中
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ classId: null, defaultClass: null }])
      .mockResolvedValueOnce([{ userId: 1 }])
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'class', value: 5 }] }))
    expect(result.data.met).toBe(true)
  })

  it('class 条件：仅设 users.classId 主班级也命中（无需 userClasses 关联行）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ classId: 5, defaultClass: null }])
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'class', value: 5 }] }))
    expect(result.data.met).toBe(true)
  })

  it('class 条件：仅设 users.defaultClass.id 当前班级也命中', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ classId: null, defaultClass: { id: 5, name: '5A' } }])
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'class', value: '5' }] }))
    expect(result.data.met).toBe(true)
  })

  it('class 条件：不属于该班级返回 met=false', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ classId: 9, defaultClass: null }])
      .mockResolvedValueOnce([])
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'class', value: 5 }] }))
    expect(result.data.met).toBe(false)
  })

  it('question 条件：全部完成返回 met=true', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue([{ questionCid: 1 }, { questionCid: 2 }])
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'question', value: [1, 2] }] }))
    expect(result.data.met).toBe(true)
  })

  it('question 条件：部分完成返回 met=false', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue([{ questionCid: 1 }])
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'question', value: [1, 2] }] }))
    expect(result.data.met).toBe(false)
  })

  it('homework 条件：未完成返回 met=false', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'homework', value: [1] }] }))
    expect(result.data.met).toBe(false)
  })

  it('未知 type 返回 met=false', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/condition/check.post')).default
    const result = await handler(makeEvent({ conditions: [{ type: 'unknown', value: 'x' }] }))
    expect(result.data.met).toBe(false)
  })
})
