/**
 * LMS Users API 端点测试
 * @see modules/lms/server/api/users/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn(),
}
const _mockSchema = {
  users: {
    id: 'id', username: 'username', name: 'name', preferName: 'preferName',
    avatarImg: 'avatarImg', rollNumber: 'rollNumber', deletedAt: 'deletedAt',
  },
  userRoles: { userId: 'userId', roleId: 'roleId' },
  roles: { id: 'id', code: 'code' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// drizzle-orm operators 被 students.get.ts 显式 import
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: any, b: any) => ({ op: 'eq', field: a, value: b })),
  and: vi.fn((...args: any[]) => ({ op: 'and', args })),
  isNull: vi.fn((a: any) => ({ op: 'isNull', field: a })),
}))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

function makeEvent(opts: { query?: Record<string, any>; body?: any } = {}) {
  return { cookies: {}, query: opts.query || {}, body: opts.body } as any
}

function resetChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.innerJoin = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn()
}

// ====================== users/students.get ======================

describe('API: users/students.get', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/users/students.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('非管理员抛 403', async () => {
    setMockAuthState({ id: 1, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/users/students.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('学生无权访问抛 403', async () => {
    setMockAuthState({ id: 1, username: 'alice', name: 'Alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/users/students.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('管理员成功返回学生列表', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const students = [
      { id: 1, username: 'alice', name: 'Alice', preferName: 'A', avatarImg: '', rollNumber: '001' },
      { id: 2, username: 'bob', name: 'Bob', preferName: 'B', avatarImg: '', rollNumber: '002' },
    ]
    _mockDb.orderBy = vi.fn().mockResolvedValue(students)
    const handler = (await import('../../server/api/users/students.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].username).toBe('alice')
    expect(_mockDb.select).toHaveBeenCalled()
    expect(_mockDb.from).toHaveBeenCalledWith(_mockSchema.userRoles)
    expect(_mockDb.innerJoin).toHaveBeenCalledTimes(2)
  })

  it('无学生时返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.orderBy = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/users/students.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})
