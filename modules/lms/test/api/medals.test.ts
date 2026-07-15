/**
 * LMS Medals API endpoint tests
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
  medals: { id: 'id', code: 'code', name: 'name', content: 'content', description: 'description', icon: 'icon', points: 'points', userId: 'userId' },
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
    // db.select().from() should return medal array
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

// ====================== medals/add.post ======================

describe('API: medals/add.post', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/medals/add.post')).default
    await expect(handler(makeEvent({ body: { name: 'Medal1' } }))).rejects.toThrow()
  })

  it('非管理员返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', name: 'Alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/medals/add.post')).default
    const result = await handler(makeEvent({ body: { name: 'Medal1' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/无权限/)
  })

  it('缺少 name 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/medals/add.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/name/)
  })

  it('管理员成功新增奖章', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, name: 'First Medal', content: { desc: 'hello' } }])
    const handler = (await import('../../server/api/medals/add.post')).default
    const result = await handler(makeEvent({ body: { name: 'First Medal', content: { desc: 'hello' } } }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('First Medal')
    expect(_mockDb.insert).toHaveBeenCalled()
  })
})

// ====================== medals/delete.post ======================

describe('API: medals/delete.post', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/medals/delete.post')).default
    await expect(handler(makeEvent({ body: { id: 1 } }))).rejects.toThrow()
  })

  it('非管理员返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', name: 'Alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/medals/delete.post')).default
    const result = await handler(makeEvent({ body: { id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/medals/delete.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
  })

  it('管理员成功删除奖章', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/medals/delete.post')).default
    const result = await handler(makeEvent({ body: { id: 5 } }))
    expect(result.success).toBe(true)
    expect(_mockDb.delete).toHaveBeenCalled()
  })
})

// ====================== medals/update.post ======================

describe('API: medals/update.post', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/medals/update.post')).default
    await expect(handler(makeEvent({ body: { id: 1, name: 'New' } }))).rejects.toThrow()
  })

  it('非管理员返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', name: 'Alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/medals/update.post')).default
    const result = await handler(makeEvent({ body: { id: 1, name: 'New' } }))
    expect(result.success).toBe(false)
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/medals/update.post')).default
    const result = await handler(makeEvent({ body: { name: 'New' } }))
    expect(result.success).toBe(false)
  })

  it('管理员成功更新奖章名称', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, name: 'Updated', content: {} }])
    const handler = (await import('../../server/api/medals/update.post')).default
    const result = await handler(makeEvent({ body: { id: 1, name: 'Updated' } }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Updated')
    expect(_mockDb.update).toHaveBeenCalled()
  })

  it('管理员成功更新奖章内容', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, name: 'Medal', content: { desc: 'new' } }])
    const handler = (await import('../../server/api/medals/update.post')).default
    const result = await handler(makeEvent({ body: { id: 1, content: { desc: 'new' } } }))
    expect(result.success).toBe(true)
  })
})
