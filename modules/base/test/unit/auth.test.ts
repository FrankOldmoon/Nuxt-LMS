/**
 * Auth utility tests (hashPassword / verifyPassword / requireAuth / requireRole / requireAdmin)
 * @see modules/base/server/utils/auth.ts
 *
 * Mock @nuxthub/db to avoid actual database calls
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ====================== Mock @nuxthub/db ======================
// Must mock, otherwise @nuxthub/db will try to connect to a real database on test startup
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

// ====================== Import test target ======================
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
    expect(t1).not.toBe(t2) // random
  })
})

describe('server/utils/auth - getCurrentUser', () => {
  it('未登录（无 cookie）返回 null', async () => {
    const { getCurrentUser } = await import('../../server/utils/auth')
    // Chain call terminates at .limit(1).then(...) → use mockResolvedValue to simulate Promise here
    const finalLimit = vi.fn().mockResolvedValue([])
    _mockDb.limit = finalLimit
    const user = await getCurrentUser({} as any)
    expect(user).toBeNull()
  })

  it('token 不存在返回 null', async () => {
    const { getCurrentUser } = await import('../../server/utils/auth')
    setMockCookie('auth_token', 'invalid-token')
    // Token query returns empty
    const finalLimit = vi.fn().mockResolvedValueOnce([])
    _mockDb.limit = finalLimit
    const user = await getCurrentUser({} as any)
    expect(user).toBeNull()
  })

  it('token 有效时调用 getCurrentUser 不抛错', async () => {
    const { getCurrentUser } = await import('../../server/utils/auth')
    setMockCookie('auth_token', 'valid-token')
    // Chainable mock: all terminators (.limit() / direct await) return empty arrays
    _mockDb.limit = vi.fn().mockResolvedValue([])
    _mockDb.innerJoin = vi.fn().mockReturnThis()
    // Make .where() also support being a terminator (return thenable)
    _mockDb.where = vi.fn(function () {
      const r: any = { ..._mockDb }
      r.then = (resolve: any) => resolve([])
      return r
    })
    // Should not throw
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
