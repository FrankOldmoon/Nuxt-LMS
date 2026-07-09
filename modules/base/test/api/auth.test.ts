/**
 * Auth API 端点测试
 * @see modules/base/server/api/auth/*.ts
 *
 * 通过 mock @nuxthub/db 直接调用 handler 函数
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ====================== Mock @nuxthub/db ======================
const _mockDb = {
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  tokens: { name: 'name', userId: 'userId', deletedAt: 'deletedAt' },
  users: { id: 'id', username: 'username', name: 'name', password: 'password', email: 'email', avatarImg: 'avatarImg', preferName: 'preferName', englishName: 'englishName', gender: 'gender', rollNumber: 'rollNumber', classId: 'classId', telephone: 'telephone', defaultClass: 'defaultClass', defaultLocale: 'defaultLocale', loginAt: 'loginAt', loginIp: 'loginIp' },
  roles: { id: 'id', code: 'code', name: 'name', deletedAt: 'deletedAt' },
  userRoles: { userId: 'userId', roleId: 'roleId' },
  permissions: { id: 'id', code: 'code', name: 'name' },
  rolePermissions: { roleId: 'roleId', permissionId: 'permissionId' },
  configs: { id: 'id', value: 'value' },
}
vi.mock('@nuxthub/db', () => ({
  db: _mockDb,
  schema: _mockSchema,
}))

import {
  resetAllStubs,
  clearMockCookies,
  setMockConfigValue,
  setMockConfigStore,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  clearMockCookies()
})

/** 模拟一个 H3 event 对象 */
function makeEvent(opts: { cookies?: Record<string, any>; body?: any; query?: Record<string, any> } = {}) {
  return {
    cookies: opts.cookies || {},
    body: opts.body,
    query: opts.query || {},
  } as any
}

/** 重置 db mock 为链式调用 */
function resetDbChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.selectDistinct = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.innerJoin = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.returning = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
}

describe('API: auth/me.get', () => {
  it('无 token 返回未认证', async () => {
    resetDbChain()
    const handler = (await import('../../server/api/auth/me.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(false)
  })

  it('有效 token 返回用户/角色/权限', async () => {
    resetDbChain()
    // 1. token 查询 (select)
    // 2. user 查询 (select)
    // 3. role 查询 (select + innerJoin once)
    // 4. permission 查询 (selectDistinct + innerJoin twice)
    const roleRows: any[] = [{ code: 'admin', name: 'Admin' }]
    const permRows: any[] = [{ code: 'read', name: 'Read' }]
    let callIndex = 0
    _mockDb.select = vi.fn(() => {
      const idx = callIndex++
      return {
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(
              idx === 0 ? [{ name: 'valid-token', userId: 1 }] : [{ id: 1, username: 'alice', name: 'Alice' }]
            ),
          }),
          innerJoin: () => ({
            where: () => Promise.resolve(roleRows),
          }),
        }),
      }
    }) as any
    _mockDb.selectDistinct = vi.fn(() => ({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => Promise.resolve(permRows),
          }),
        }),
      }),
    })) as any
    const handler = (await import('../../server/api/auth/me.get')).default
    const result = await handler(makeEvent({ cookies: { auth_token: 'valid-token' } }))
    expect(result.success).toBe(true)
    expect(result.data.user.username).toBe('alice')
    expect(result.data.roles[0].code).toBe('admin')
    expect(result.data.permissions[0].code).toBe('read')
  })

  it('无效 token 返回失败', async () => {
    resetDbChain()
    _mockDb.limit = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/auth/me.get')).default
    const result = await handler(makeEvent({ cookies: { auth_token: 'invalid' } }))
    expect(result.success).toBe(false)
  })

  it('token 有效但 user 不存在', async () => {
    resetDbChain()
    let callCount = 0
    _mockDb.limit = vi.fn(() => Promise.resolve(
      callCount++ === 0 ? [{ name: 't', userId: 999 }] : []
    ))
    const handler = (await import('../../server/api/auth/me.get')).default
    const result = await handler(makeEvent({ cookies: { auth_token: 't' } }))
    expect(result.success).toBe(false)
  })
})

describe('API: auth/login.post', () => {
  beforeEach(() => {
    resetDbChain()
  })

  it('缺少用户名/密码返回失败', async () => {
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/required/i)
  })

  it('用户不存在返回失败', async () => {
    _mockDb.limit = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: { username: 'nobody', password: 'x' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/Invalid/)
  })

  it('错误密码返回失败', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-pwd')
    _mockDb.limit = vi.fn().mockResolvedValue([
      { id: 1, username: 'alice', name: 'Alice', password: hashed, email: 'a@b.c', avatarImg: null },
    ])
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: { username: 'alice', password: 'wrong-pwd' } }))
    expect(result.success).toBe(false)
  })

  it('正确凭据返回成功并设置 cookie', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-pwd')
    _mockDb.limit = vi.fn().mockResolvedValue([
      { id: 1, username: 'alice', name: 'Alice', password: hashed, email: 'a@b.c', avatarImg: null },
    ])
    const handler = (await import('../../server/api/auth/login.post')).default
    const event = makeEvent({ body: { username: 'alice', password: 'correct-pwd' } })
    const result = await handler(event)
    expect(result.success).toBe(true)
    expect(result.data.user.username).toBe('alice')
    expect(result.data.token).toMatch(/^[0-9a-f]{64}$/)
    expect(event.cookies.auth_token).toBe(result.data.token)
  })
})

describe('API: auth/logout.post', () => {
  beforeEach(() => resetDbChain())

  it('有 token 时软删除 token 并清 cookie', async () => {
    const handler = (await import('../../server/api/auth/logout.post')).default
    const event = makeEvent({ cookies: { auth_token: 't' } })
    const result = await handler(event)
    expect(result.success).toBe(true)
    expect(event.cookies.auth_token).toBeUndefined()
  })

  it('无 token 也成功', async () => {
    const handler = (await import('../../server/api/auth/logout.post')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
  })
})

describe('API: auth/register.post', () => {
  beforeEach(() => {
    resetDbChain()
    setMockConfigStore({
      'site:allowRegistration': true,
      'site:passwordMinLength': 6,
      'site:defaultUserRole': 'student',
    })
  })

  it('注册关闭时返回失败', async () => {
    setMockConfigValue('site:allowRegistration', false)
    const handler = (await import('../../server/api/auth/register.post')).default
    const result = await handler(makeEvent({ body: { username: 'bob', password: '123456', name: 'Bob' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/disabled/i)
  })

  it('缺少必填字段返回失败', async () => {
    const handler = (await import('../../server/api/auth/register.post')).default
    const result = await handler(makeEvent({ body: { username: 'bob' } }))
    expect(result.success).toBe(false)
  })

  it('密码太短返回失败', async () => {
    setMockConfigValue('site:passwordMinLength', 8)
    const handler = (await import('../../server/api/auth/register.post')).default
    const result = await handler(makeEvent({ body: { username: 'bob', password: '123', name: 'Bob' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/at least/)
  })

  it('用户名已存在返回失败', async () => {
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ id: 99 }])
    const handler = (await import('../../server/api/auth/register.post')).default
    const result = await handler(makeEvent({ body: { username: 'existing', password: '123456', name: 'Bob' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/exists/i)
  })

  it('成功注册新用户', async () => {
    _mockDb.limit = vi.fn().mockResolvedValueOnce([])
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, username: 'bob', name: 'Bob', email: null, avatarImg: null }])
    const handler = (await import('../../server/api/auth/register.post')).default
    const event = makeEvent({ body: { username: 'bob', password: '123456', name: 'Bob', email: 'b@c.d' } })
    const result = await handler(event)
    expect(result.success).toBe(true)
    expect(result.data.user.username).toBe('bob')
    expect(event.cookies.auth_token).toMatch(/^[0-9a-f]{64}$/)
  })
})
