/**
 * 鉴权工具测试（hashPassword / verifyPassword / requireAuth / requireRole / requireAdmin）
 * @see modules/base/server/utils/auth.ts
 *
 * mock @nuxthub/db 以避免实际数据库调用
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ====================== Mock @nuxthub/db ======================
// 必须 mock，否则测试启动时 @nuxthub/db 会尝试连接真实数据库
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
  users: { id: 'id', username: 'username', name: 'name' },
  roles: { id: 'id', code: 'code', deletedAt: 'deletedAt' },
  userRoles: { userId: 'userId', roleId: 'roleId' },
  permissions: { id: 'id', code: 'code' },
  rolePermissions: { roleId: 'roleId', permissionId: 'permissionId' },
  configs: { id: 'id', value: 'value' },
}
vi.mock('@nuxthub/db', () => ({
  db: _mockDb,
  schema: _mockSchema,
}))

// ====================== 引入测试目标 ======================
import {
  resetAllStubs,
  setMockCookie,
  clearMockCookies,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  clearMockCookies()
})

describe('server/utils/auth - hashPassword / verifyPassword', () => {
  it('hashPassword 生成 salt:key 格式', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const hash = await hashPassword('mypassword')
    expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/)
  })

  it('同一密码两次 hash 产生不同结果（salt 随机）', async () => {
    const { hashPassword } = await import('../../server/utils/auth')
    const h1 = await hashPassword('mypassword')
    const h2 = await hashPassword('mypassword')
    expect(h1).not.toBe(h2)
  })

  it('verifyPassword 对正确密码返回 true', async () => {
    const { hashPassword, verifyPassword } = await import('../../server/utils/auth')
    const hash = await hashPassword('mypassword')
    expect(await verifyPassword('mypassword', hash)).toBe(true)
  })

  it('verifyPassword 对错误密码返回 false', async () => {
    const { hashPassword, verifyPassword } = await import('../../server/utils/auth')
    const hash = await hashPassword('mypassword')
    expect(await verifyPassword('wrongpassword', hash)).toBe(false)
  })

  it('verifyPassword 对非法 hash 格式返回 false', async () => {
    const { verifyPassword } = await import('../../server/utils/auth')
    expect(await verifyPassword('x', 'no-colon')).toBe(false)
    expect(await verifyPassword('x', '')).toBe(false)
  })
})

describe('server/utils/auth - generateToken', () => {
  it('生成 64 字符十六进制 token', async () => {
    const { generateToken } = await import('../../server/utils/auth')
    const t1 = generateToken()
    const t2 = generateToken()
    expect(t1).toMatch(/^[0-9a-f]{64}$/)
    expect(t1).not.toBe(t2) // 随机
  })
})

describe('server/utils/auth - getCurrentUser', () => {
  it('未登录（无 cookie）返回 null', async () => {
    const { getCurrentUser } = await import('../../server/utils/auth')
    // 链式调用终结于 .limit(1).then(...) → 这里用 mockResolvedValue 模拟 Promise
    const finalLimit = vi.fn().mockResolvedValue([])
    _mockDb.limit = finalLimit
    const user = await getCurrentUser({} as any)
    expect(user).toBeNull()
  })

  it('token 不存在返回 null', async () => {
    const { getCurrentUser } = await import('../../server/utils/auth')
    setMockCookie('auth_token', 'invalid-token')
    // token 查询返回空
    const finalLimit = vi.fn().mockResolvedValueOnce([])
    _mockDb.limit = finalLimit
    const user = await getCurrentUser({} as any)
    expect(user).toBeNull()
  })

  it('token 有效时调用 getCurrentUser 不抛错', async () => {
    const { getCurrentUser } = await import('../../server/utils/auth')
    setMockCookie('auth_token', 'valid-token')
    // 链式 mock：所有终结（.limit() / 直接 await）都返回空数组
    _mockDb.limit = vi.fn().mockResolvedValue([])
    _mockDb.innerJoin = vi.fn().mockReturnThis()
    // 让 .where() 也支持作为终结符（返回 thenable）
    _mockDb.where = vi.fn(function () {
      const r: any = { ..._mockDb }
      r.then = (resolve: any) => resolve([])
      return r
    })
    // 不应抛错
    await expect(getCurrentUser({} as any)).resolves.toBeDefined()
  })
})

describe('server/utils/auth - requireAuth', () => {
  it('未登录抛 401', async () => {
    const { requireAuth } = await import('../../server/utils/auth')
    _mockDb.limit = vi.fn().mockResolvedValue([])
    await expect(requireAuth({} as any)).rejects.toThrow()
  })
})

describe('server/utils/auth - requireRole', () => {
  it('无角色时抛 403', async () => {
    const { requireRole } = await import('../../server/utils/auth')
    _mockDb.limit = vi.fn().mockResolvedValue([])
    await expect(requireRole({} as any, ['admin'])).rejects.toThrow()
  })
})

describe('server/utils/auth - requireAdmin', () => {
  it('要求 admin 角色', async () => {
    const { requireAdmin } = await import('../../server/utils/auth')
    _mockDb.limit = vi.fn().mockResolvedValue([])
    await expect(requireAdmin({} as any)).rejects.toThrow()
  })
})
