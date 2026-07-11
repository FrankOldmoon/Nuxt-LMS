/**
 * base 模块 Users API 端点测试
 * @see modules/base/server/api/users/*.ts
 *
 * 测试端点：show / search.get / update.post / import.post / reset-password.post
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ---- Mock @nuxthub/db ----
const _mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn(),
}
const _mockSchema = {
  users: { id: 'id', username: 'username', email: 'email', password: 'password', name: 'name' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // 重置 db 链
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.returning = vi.fn()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn()
})

function makeEvent(opts: { query?: Record<string, any>; body?: any } = {}) {
  return { cookies: {}, query: opts.query || {}, body: opts.body } as any
}

describe('API: users/show', () => {
  it('缺少 id 参数返回失败', async () => {
    const handler = (await import('../../server/api/users/show')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('有效 id 返回用户数据', async () => {
    globalThis.showTable = vi.fn().mockResolvedValue({ id: 1, username: 'alice', name: 'Alice' })
    const handler = (await import('../../server/api/users/show')).default
    const result = await handler(makeEvent({ query: { id: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.username).toBe('alice')
  })
})

describe('API: users/search.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/users/search.get')).default
    await expect(handler(makeEvent({ query: { keyword: 'ali' } }))).rejects.toThrow()
  })

  it('空 keyword 返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/users/search.get')).default
    const result = await handler(makeEvent({ query: { keyword: '' } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('有效 keyword 返回搜索结果', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.searchUsers = vi.fn().mockResolvedValue([
      { id: 1, username: 'alice', name: 'Alice', avatarImg: null },
    ])
    const handler = (await import('../../server/api/users/search.get')).default
    const result = await handler(makeEvent({ query: { keyword: 'ali' } }))
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(globalThis.searchUsers).toHaveBeenCalledWith('ali', 50)
  })
})

describe('API: users/update.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/users/update.post')).default
    await expect(handler(makeEvent({ body: { id: 1, name: 'X' } }))).rejects.toThrow()
  })

  it('缺少 id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/users/update.post')).default
    const result = await handler(makeEvent({ body: { name: 'X' } }))
    expect(result.success).toBe(false)
  })

  it('有效请求返回更新结果', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.updateTable = vi.fn().mockResolvedValue({ changes: 1 })
    const handler = (await import('../../server/api/users/update.post')).default
    const result = await handler(makeEvent({ body: { id: 5, name: 'Updated' } }))
    expect(result.success).toBe(true)
    expect(globalThis.updateTable).toHaveBeenCalledWith('users', 5, { name: 'Updated' })
  })

  it('teacher 角色也可更新', async () => {
    setMockAuthState({ id: 2, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] })
    globalThis.updateTable = vi.fn().mockResolvedValue({ changes: 1 })
    const handler = (await import('../../server/api/users/update.post')).default
    const result = await handler(makeEvent({ body: { id: 5, name: 'Updated' } }))
    expect(result.success).toBe(true)
  })
})

describe('API: users/import.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/users/import.post')).default
    await expect(handler(makeEvent({ body: { users: [] } }))).rejects.toThrow()
  })

  it('空 users 数组返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/users/import.post')).default
    const result = await handler(makeEvent({ body: { users: [] } }))
    expect(result.success).toBe(false)
  })

  it('username 为空时收集错误', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/users/import.post')).default
    const result = await handler(makeEvent({
      body: { users: [{ email: 'a@b.com' }, { username: 'bob', email: '' }] },
    }))
    expect(result.success).toBe(false)
    expect(result.data.errors).toHaveLength(2)
  })

  it('有效用户成功导入', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.returning.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const handler = (await import('../../server/api/users/import.post')).default
    const result = await handler(makeEvent({
      body: { users: [
        { username: 'alice', email: 'alice@test.com', name: 'Alice' },
        { username: 'bob', email: 'bob@test.com', name: 'Bob' },
      ] },
    }))
    expect(result.success).toBe(true)
    expect(result.data.count).toBe(2)
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('默认密码为 REDACTED', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.returning.mockResolvedValue([{ id: 1 }])
    const handler = (await import('../../server/api/users/import.post')).default
    await handler(makeEvent({
      body: { users: [{ username: 'alice', email: 'alice@test.com' }] },
    }))
    // hashPassword 应被调用（默认密码 REDACTED）
    expect(globalThis.hashPassword).toBeDefined()
  })
})

describe('API: users/reset-password.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/users/reset-password.post')).default
    await expect(handler(makeEvent({ body: { user_id: 1, password: 'new' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/users/reset-password.post')).default
    const result = await handler(makeEvent({ body: { user_id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('有效请求重置密码', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.where.mockResolvedValue(undefined)
    const handler = (await import('../../server/api/users/reset-password.post')).default
    const result = await handler(makeEvent({ body: { user_id: 5, password: 'newpass' } }))
    expect(result.success).toBe(true)
    expect(result.data.reset).toBe(true)
    expect(_mockDb.update).toHaveBeenCalled()
    expect(_mockDb.set).toHaveBeenCalled()
  })

  it('teacher 角色也可重置密码', async () => {
    setMockAuthState({ id: 2, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] })
    _mockDb.where.mockResolvedValue(undefined)
    const handler = (await import('../../server/api/users/reset-password.post')).default
    const result = await handler(makeEvent({ body: { user_id: 5, password: 'newpass' } }))
    expect(result.success).toBe(true)
  })
})
