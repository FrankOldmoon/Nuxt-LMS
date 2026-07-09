/**
 * LMS Medals API 端点测试
 * @see modules/lms/server/api/medals/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  medals: { id: 'id', code: 'code', name: 'name', description: 'description', icon: 'icon', points: 'points', userId: 'userId' },
  userMedals: { userId: 'userId', medalId: 'medalId', awardedAt: 'awardedAt' },
  users: { id: 'id', username: 'username', name: 'name' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

function makeEvent(opts: { query?: Record<string, any>; body?: any; cookies?: Record<string, any> } = {}) {
  return { cookies: opts.cookies || {}, query: opts.query || {}, body: opts.body } as any
}

function resetChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
}

describe('API: medals/list.get', () => {
  beforeEach(resetChain)

  it('返回所有奖章', async () => {
    const sample = [
      { id: 1, code: 'first-login', name: '首次登录', description: '...', icon: 'i-lucide-award', points: 10 },
    ]
    // db.select().from() 应该返回奖章数组
    _mockDb.from = vi.fn().mockResolvedValue(sample)
    const handler = (await import('../../server/api/medals/list.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toEqual(sample)
  })

  it('无奖章返回空数组', async () => {
    _mockDb.from = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/medals/list.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})

describe('API: medals/my.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/medals/my.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('返回当前用户的奖章', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([
      { id: 1, code: 'first-login', name: '首次登录', awardedAt: new Date() },
    ])
    const handler = (await import('../../server/api/medals/my.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
  })
})

describe('API: medals/check.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/medals/check.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('返回未读奖章状态', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ count: 3 }])
    const handler = (await import('../../server/api/medals/check.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
  })
})
