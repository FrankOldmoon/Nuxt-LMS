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
  tokens: { id: 'id', name: 'name', userId: 'userId', deletedAt: 'deletedAt', createdAt: 'createdAt' },
  users: { id: 'id', username: 'username', name: 'name', password: 'password', email: 'email', avatarImg: 'avatarImg', preferName: 'preferName', englishName: 'englishName', gender: 'gender', rollNumber: 'rollNumber', classId: 'classId', telephone: 'telephone', defaultClass: 'defaultClass', defaultLocale: 'defaultLocale', loginAt: 'loginAt', loginIp: 'loginIp', failedAttempts: 'failedAttempts', lockedUntil: 'lockedUntil' },
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
  setMockAuthState,
  setMockSendMailResult,
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
      { id: 1, username: 'alice', name: 'Alice', password: hashed, email: 'a@b.c', avatarImg: null, failedAttempts: 0, lockedUntil: null },
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

describe('API: auth/login.post 暴力破解防护', () => {
  beforeEach(() => {
    resetDbChain()
    setMockConfigStore({
      'site:loginMaxAttempts': 3,
      'site:loginLockoutMinutes': 15,
    })
  })

  it('账号锁定时返回锁定提示', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-pwd')
    _mockDb.limit = vi.fn().mockResolvedValue([{
      id: 1, username: 'alice', name: 'Alice', password: hashed,
      email: 'a@b.c', avatarImg: null,
      failedAttempts: 0,
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 分钟后
    }])
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: { username: 'alice', password: 'correct-pwd' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/锁定/)
    expect(_mockDb.update).not.toHaveBeenCalled()
  })

  it('密码错误时累加失败次数', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-pwd')
    _mockDb.limit = vi.fn().mockResolvedValue([{
      id: 1, username: 'alice', name: 'Alice', password: hashed,
      email: 'a@b.c', avatarImg: null,
      failedAttempts: 1, lockedUntil: null,
    }])
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: { username: 'alice', password: 'wrong-pwd' } }))
    expect(result.success).toBe(false)
    expect(_mockDb.set.mock.calls[0][0]).toEqual({ failedAttempts: 2 })
  })

  it('达到最大尝试次数时锁定账号', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-pwd')
    _mockDb.limit = vi.fn().mockResolvedValue([{
      id: 1, username: 'alice', name: 'Alice', password: hashed,
      email: 'a@b.c', avatarImg: null,
      failedAttempts: 2, lockedUntil: null, // 第 3 次失败 → 锁定
    }])
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: { username: 'alice', password: 'wrong-pwd' } }))
    expect(result.success).toBe(false)
    const setCall = _mockDb.set.mock.calls[0][0]
    expect(setCall.failedAttempts).toBe(0)
    expect(setCall.lockedUntil).toBeInstanceOf(Date)
    expect(setCall.lockedUntil.getTime()).toBeGreaterThan(Date.now())
  })

  it('登录成功时重置失败计数', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-pwd')
    _mockDb.limit = vi.fn().mockResolvedValue([{
      id: 1, username: 'alice', name: 'Alice', password: hashed,
      email: 'a@b.c', avatarImg: null,
      failedAttempts: 2, lockedUntil: null,
    }])
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: { username: 'alice', password: 'correct-pwd' } }))
    expect(result.success).toBe(true)
    // 第一次 set 是重置 failedAttempts/lockedUntil
    expect(_mockDb.set.mock.calls[0][0]).toEqual({ failedAttempts: 0, lockedUntil: null })
  })

  it('锁定过期后允许登录并重置', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-pwd')
    _mockDb.limit = vi.fn().mockResolvedValue([{
      id: 1, username: 'alice', name: 'Alice', password: hashed,
      email: 'a@b.c', avatarImg: null,
      failedAttempts: 0,
      lockedUntil: new Date(Date.now() - 60 * 1000), // 1 分钟前已过期
    }])
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: { username: 'alice', password: 'correct-pwd' } }))
    expect(result.success).toBe(true)
    // 第一次 set 是清除过期锁定
    expect(_mockDb.set.mock.calls[0][0]).toEqual({ failedAttempts: 0, lockedUntil: null })
  })

  it('maxAttempts=0 时不进行失败计数', async () => {
    setMockConfigValue('site:loginMaxAttempts', 0)
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-pwd')
    _mockDb.limit = vi.fn().mockResolvedValue([{
      id: 1, username: 'alice', name: 'Alice', password: hashed,
      email: 'a@b.c', avatarImg: null,
      failedAttempts: 0, lockedUntil: null,
    }])
    const handler = (await import('../../server/api/auth/login.post')).default
    const result = await handler(makeEvent({ body: { username: 'alice', password: 'wrong-pwd' } }))
    expect(result.success).toBe(false)
    // 失败时不累加计数（maxAttempts=0 跳过）
    expect(_mockDb.update).not.toHaveBeenCalled()
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

describe('API: auth/change-password.post', () => {
  beforeEach(() => resetDbChain())

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/auth/change-password.post')).default
    await expect(handler(makeEvent({ body: { oldPassword: 'a', newPassword: 'b' } }))).rejects.toThrow()
  })

  it('缺少旧密码或新密码返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/auth/change-password.post')).default
    const result = await handler(makeEvent({ body: { oldPassword: 'old' } }))
    expect(result.success).toBe(false)
  })

  it('新密码长度不足 6 位返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/auth/change-password.post')).default
    const result = await handler(makeEvent({ body: { oldPassword: 'old123', newPassword: '123' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/至少6/)
  })

  it('旧密码不正确返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-old')
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, password: hashed }])
    const handler = (await import('../../server/api/auth/change-password.post')).default
    const result = await handler(makeEvent({ body: { oldPassword: 'wrong-old', newPassword: 'newpass123' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/旧密码/)
  })

  it('旧密码正确则更新成功', async () => {
    setMockAuthState({ id: 1, username: 'alice', name: 'Alice', roles: ['student'], permissions: [] })
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-old')
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, password: hashed }])
    const handler = (await import('../../server/api/auth/change-password.post')).default
    const result = await handler(makeEvent({ body: { oldPassword: 'correct-old', newPassword: 'newpass123' } }))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/成功/)
    expect(_mockDb.update).toHaveBeenCalled()
  })

  it('改密后失效其他会话 token', async () => {
    setMockAuthState({ id: 1, username: 'alice', name: 'Alice', roles: ['student'], permissions: [] })
    const { hashPassword } = await import('../../server/utils/auth')
    const hashed = await hashPassword('correct-old')
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, password: hashed }])
    const handler = (await import('../../server/api/auth/change-password.post')).default
    const event = makeEvent({ cookies: { auth_token: 'current-session' }, body: { oldPassword: 'correct-old', newPassword: 'newpass123' } })
    const result = await handler(event)
    expect(result.success).toBe(true)
    // 第二次 set 是 token 失效（deletedAt）
    const tokenSetCall = _mockDb.set.mock.calls[1][0]
    expect(tokenSetCall.deletedAt).toBeInstanceOf(Date)
  })

  it('用户不存在返回失败', async () => {
    setMockAuthState({ id: 999, username: 'ghost', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/auth/change-password.post')).default
    const result = await handler(makeEvent({ body: { oldPassword: 'old', newPassword: 'newpass123' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/用户不存在/)
  })
})

describe('API: auth/forgot-password.post', () => {
  beforeEach(() => {
    resetDbChain()
    setMockConfigStore({
      'site:allowForgotPassword': true,
      'site:mail.host': 'smtp.test',
      'site:mail.siteUrl': 'https://test',
    })
  })

  it('功能未开启返回失败', async () => {
    setMockConfigValue('site:allowForgotPassword', false)
    const handler = (await import('../../server/api/auth/forgot-password.post')).default
    const result = await handler(makeEvent({ body: { email: 'a@b.c' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/disabled/i)
  })

  it('缺少邮箱返回失败', async () => {
    const handler = (await import('../../server/api/auth/forgot-password.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
  })

  it('用户不存在仍返回成功（防枚举）', async () => {
    _mockDb.limit = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/auth/forgot-password.post')).default
    const result = await handler(makeEvent({ body: { email: 'nobody@test' } }))
    expect(result.success).toBe(true)
  })

  it('邮件服务未配置返回失败', async () => {
    setMockConfigValue('site:mail.host', '')
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, name: 'Alice', email: 'a@b.c' }])
    const handler = (await import('../../server/api/auth/forgot-password.post')).default
    const result = await handler(makeEvent({ body: { email: 'a@b.c' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/邮件服务/)
  })

  it('成功发送重置邮件', async () => {
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, name: 'Alice', email: 'a@b.c' }])
    setMockSendMailResult(true)
    const handler = (await import('../../server/api/auth/forgot-password.post')).default
    const result = await handler(makeEvent({ body: { email: 'a@b.c' } }))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/已发送/)
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('邮件发送失败返回失败', async () => {
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, name: 'Alice', email: 'a@b.c' }])
    setMockSendMailResult(false)
    const handler = (await import('../../server/api/auth/forgot-password.post')).default
    const result = await handler(makeEvent({ body: { email: 'a@b.c' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/发送失败/)
  })
})

describe('API: auth/reset-password.post', () => {
  beforeEach(() => resetDbChain())

  it('缺少 token 或新密码返回失败', async () => {
    const handler = (await import('../../server/api/auth/reset-password.post')).default
    const result = await handler(makeEvent({ body: { token: 'reset_x' } }))
    expect(result.success).toBe(false)
  })

  it('新密码太短返回失败', async () => {
    const handler = (await import('../../server/api/auth/reset-password.post')).default
    const result = await handler(makeEvent({ body: { token: 'reset_x', newPassword: '123' } }))
    expect(result.success).toBe(false)
  })

  it('token 不以 reset_ 开头返回失败', async () => {
    const handler = (await import('../../server/api/auth/reset-password.post')).default
    const result = await handler(makeEvent({ body: { token: 'bad_token', newPassword: 'newpass123' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/token/)
  })

  it('token 不存在返回失败', async () => {
    _mockDb.limit = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/auth/reset-password.post')).default
    const result = await handler(makeEvent({ body: { token: 'reset_notfound', newPassword: 'newpass123' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/无效/)
  })

  it('token 已过期返回失败并软删除 token', async () => {
    const expired = new Date(Date.now() - 60 * 60 * 1000) // 1 小时前
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, userId: 1, createdAt: expired }])
    const handler = (await import('../../server/api/auth/reset-password.post')).default
    const result = await handler(makeEvent({ body: { token: 'reset_expired', newPassword: 'newpass123' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/过期/)
    expect(_mockDb.update).toHaveBeenCalled()
  })

  it('token 有效则重置密码成功', async () => {
    const recent = new Date() // 刚创建
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, userId: 1, createdAt: recent }])
    const handler = (await import('../../server/api/auth/reset-password.post')).default
    const result = await handler(makeEvent({ body: { token: 'reset_valid', newPassword: 'newpass123' } }))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/成功/)
    expect(_mockDb.update).toHaveBeenCalledTimes(3) // update users + update tokens(reset) + update tokens(session)
  })
})

describe('API: auth/impersonate.post', () => {
  /** impersonate 查询：token / caller roles / target user / target roles（非 admin 时）
   *  token 与 target user 走 select().from().where().limit()
   *  roles 走 select().from().innerJoin().where()（无 limit）
   *  用 callIndex 区分 limit 查询，innerJoinCount 区分两次角色查询 */
  function setupImpersonateDb(opts: { tokenRows?: any[]; roleRows?: any[]; targetRows?: any[]; targetRoleRows?: any[] }) {
    let callIndex = 0
    let innerJoinCount = 0
    const tokenRows = opts.tokenRows ?? [{ userId: 1 }]
    const roleRows = opts.roleRows ?? [{ code: 'teacher' }]
    const targetRows = opts.targetRows ?? [{ id: 2, name: 'Student1' }]
    const targetRoleRows = opts.targetRoleRows ?? []
    _mockDb.select = vi.fn(() => {
      const idx = callIndex++
      return {
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(
              idx === 0 ? tokenRows : targetRows
            ),
          }),
          innerJoin: () => ({
            where: () => Promise.resolve(
              innerJoinCount++ === 0 ? roleRows : targetRoleRows
            ),
          }),
        }),
      }
    }) as any
    _mockDb.insert = vi.fn().mockReturnThis()
  }

  it('无 token 抛 401', async () => {
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    await expect(handler(makeEvent({ body: { userId: 2 } }))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('当前 token 无效抛 401', async () => {
    setupImpersonateDb({ tokenRows: [] })
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    await expect(handler(makeEvent({ cookies: { auth_token: 'bad' }, body: { userId: 2 } }))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('非教师/管理员抛 403', async () => {
    setupImpersonateDb({ tokenRows: [{ userId: 1 }], roleRows: [{ code: 'student' }] })
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    await expect(handler(makeEvent({ cookies: { auth_token: 'valid' }, body: { userId: 2 } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('缺少 userId 返回失败', async () => {
    setupImpersonateDb({ tokenRows: [{ userId: 1 }], roleRows: [{ code: 'teacher' }] })
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    const result = await handler(makeEvent({ cookies: { auth_token: 'valid' }, body: {} }))
    expect(result.success).toBe(false)
  })

  it('目标用户不存在返回失败', async () => {
    setupImpersonateDb({ tokenRows: [{ userId: 1 }], roleRows: [{ code: 'admin' }], targetRows: [] })
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    const result = await handler(makeEvent({ cookies: { auth_token: 'valid' }, body: { userId: 999 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/不存在/)
  })

  it('教师成功切换身份并设置 cookie', async () => {
    setupImpersonateDb({ tokenRows: [{ userId: 1 }], roleRows: [{ code: 'teacher' }], targetRows: [{ id: 2, name: 'Student1' }], targetRoleRows: [{ code: 'student' }] })
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    const event = makeEvent({ cookies: { auth_token: 'valid' }, body: { userId: 2 } })
    const result = await handler(event)
    expect(result.success).toBe(true)
    expect(result.data.userId).toBe(2)
    expect(result.data.impersonatedBy).toBe(1)
    expect(event.cookies.auth_token).toMatch(/^[0-9a-f]{64}$/)
    expect(event.cookies.original_token).toBe('valid') // 保存原始 token
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('教师不能切换到教师/管理员账号（防提权）', async () => {
    setupImpersonateDb({ tokenRows: [{ userId: 1 }], roleRows: [{ code: 'teacher' }], targetRows: [{ id: 2, name: 'Admin1' }], targetRoleRows: [{ code: 'admin' }] })
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    const event = makeEvent({ cookies: { auth_token: 'valid' }, body: { userId: 2 } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(_mockDb.insert).not.toHaveBeenCalled() // 未生成新 token
  })

  it('管理员可切换到教师/管理员账号', async () => {
    setupImpersonateDb({ tokenRows: [{ userId: 1 }], roleRows: [{ code: 'admin' }], targetRows: [{ id: 2, name: 'Teacher1' }], targetRoleRows: [{ code: 'teacher' }] })
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    const event = makeEvent({ cookies: { auth_token: 'valid' }, body: { userId: 2 } })
    const result = await handler(event)
    expect(result.success).toBe(true)
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('已有 original_token 时不覆盖（连续切换）', async () => {
    setupImpersonateDb({ tokenRows: [{ userId: 1 }], roleRows: [{ code: 'admin' }], targetRows: [{ id: 3, name: 'Student2' }] })
    const handler = (await import('../../server/api/auth/impersonate.post')).default
    const event = makeEvent({ cookies: { auth_token: 'current', original_token: 'original' }, body: { userId: 3 } })
    const result = await handler(event)
    expect(result.success).toBe(true)
    expect(event.cookies.original_token).toBe('original') // 不覆盖
    expect(event.cookies.auth_token).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('API: auth/me.put', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/auth/me.put')).default
    await expect(handler(makeEvent({ body: { name: 'New' } }))).rejects.toThrow()
  })

  it('没有可更新字段返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/auth/me.put')).default
    const result = await handler(makeEvent({ body: { notAField: 'x' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/没有/)
  })

  it('成功更新白名单字段', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/auth/me.put')).default
    const result = await handler(makeEvent({ body: { name: 'NewName', email: 'new@test', telephone: '123' } }))
    expect(result.success).toBe(true)
  })

  it('忽略非白名单字段（如 password/role）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/auth/me.put')).default
    const result = await handler(makeEvent({ body: { password: 'hack', id: 999 } }))
    expect(result.success).toBe(false) // 只有非白名单字段 → 没有可更新字段
  })
})

describe('API: auth/restore.post', () => {
  it('无 original_token 返回无需恢复', async () => {
    const handler = (await import('../../server/api/auth/restore.post')).default
    const result = await handler(makeEvent({ cookies: {} }))
    expect(result.success).toBe(true)
    expect(result.data.restored).toBe(false)
  })

  it('有 original_token + auth_token 则恢复原始身份', async () => {
    const handler = (await import('../../server/api/auth/restore.post')).default
    const event = makeEvent({ cookies: { auth_token: 'impersonating', original_token: 'original-token' } })
    const result = await handler(event)
    expect(result.success).toBe(true)
    expect(result.data.restored).toBe(true)
    expect(event.cookies.auth_token).toBe('original-token')
    expect(event.cookies.original_token).toBeUndefined()
  })

  it('仅有 original_token 无 auth_token 返回无需恢复', async () => {
    const handler = (await import('../../server/api/auth/restore.post')).default
    const result = await handler(makeEvent({ cookies: { original_token: 'original' } }))
    expect(result.data.restored).toBe(false)
  })
})
