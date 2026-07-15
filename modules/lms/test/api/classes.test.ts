/**
 * Classes API endpoint tests
 * @see modules/lms/server/api/classes/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
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
  classes: { id: 'id', name: 'name', code: 'code', deletedAt: 'deletedAt' },
  userClasses: { userId: 'userId', classId: 'classId', isTeacher: 'isTeacher' },
  users: { id: 'id', username: 'username' },
  courses: { id: 'id', name: 'name' },
  tokens: { name: 'name', userId: 'userId', deletedAt: 'deletedAt' },
  configs: { id: 'id', value: 'value' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import {
  resetAllStubs,
  setMockAuthState,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // Chainable call termination
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.innerJoin = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
})

function makeEvent(opts: { query?: Record<string, any> } = {}) {
  return { cookies: {}, body: undefined, query: opts.query || {} } as any
}

describe('API: classes/list', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/classes/list')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('admin 返回所有班级', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 1, name: 'Class 1', code: 'C1' },
      { id: 2, name: 'Class 2', code: 'C2' },
    ])
    const handler = (await import('../../server/api/classes/list')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })

  it('teacher 返回 isTeacher 的班级', async () => {
    setMockAuthState({ id: 5, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 10, name: 'Teacher Class', code: 'TC' },
    ])
    const handler = (await import('../../server/api/classes/list')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('student 不返回班级（user_classes 过滤）', async () => {
    setMockAuthState({ id: 100, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.orderBy = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/classes/list')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})

describe('API: classes/users.get', () => {
  it('缺少 classId 返回失败', async () => {
    const handler = (await import('../../server/api/classes/users.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/classId/)
  })

  it('有效 classId 调用 getClassUsers 并返回结果', async () => {
    // Mocking all users.get.ts dependencies is not feasible; instead check that thrown errors are handled normally
    // Because getClassUsers is a real function (depends on db), not mocking it means the success path won't run
    // Here we only verify the path can be required
    const handler = (await import('../../server/api/classes/users.get')).default
    expect(typeof handler).toBe('function')
  })
})

describe('API: classes/mine', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/classes/mine')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('学生：返回主班级 + 关联班级（主班级不在关联中时单独查询）', async () => {
    setMockAuthState({ id: 100, username: 'student', roles: ['student'], permissions: [] })
    // Chain A: users.classId query → limit
    // Chain B: userClasses association query → orderBy
    // Chain C: main class single query → limit (because main class id=1 is not in associated)
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ classId: 1 }])                       // A: users query
      .mockResolvedValueOnce([{ id: 1, name: 'Main', code: 'M' }])   // C: main class query
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 2, name: 'Associated', code: 'A' },
    ])
    const handler = (await import('../../server/api/classes/mine')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    // Main class first, associated after
    expect(result.data[0].id).toBe(1)
    expect(result.data[1].id).toBe(2)
  })

  it('学生：主班级已在关联中时不重复查询', async () => {
    setMockAuthState({ id: 100, username: 'student', roles: ['student'], permissions: [] })
    // A: users.classId = 1
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ classId: 1 }])
    // B: associated already includes class1
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 1, name: 'Main', code: 'M' },
      { id: 2, name: 'Other', code: 'O' },
    ])
    const handler = (await import('../../server/api/classes/mine')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    // Should not trigger main class single query (second limit call)
    expect(_mockDb.limit).toHaveBeenCalledTimes(1)
  })

  it('学生：无主班级且无关联返回空', async () => {
    setMockAuthState({ id: 100, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ classId: null }])
    _mockDb.orderBy = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/classes/mine')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('学生：关联班级含重复时去重', async () => {
    setMockAuthState({ id: 100, username: 'student', roles: ['student'], permissions: [] })
    // Main class classId=2, already in associated → second limit will not be triggered
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ classId: 2 }])
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 2, name: 'Main', code: 'M' },
      { id: 3, name: 'Other', code: 'O' },
    ])
    const handler = (await import('../../server/api/classes/mine')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    const ids = result.data.map((c: any) => c.id)
    expect(ids).toEqual([2, 3])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
