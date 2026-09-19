/**
 * 头像文件访问控制单元测试
 * @see modules/base/server/utils/files/avatarGuard.ts
 *
 * 规则：被 users.avatar_img 引用的上传文件视为「头像」，仅教师及以上
 * （admin / teacher / observer）可读；学生 / 未登录直接访问一律 403。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.mock 工厂会被提升到文件顶部，故用 vi.hoisted 一同提升 mock 依赖，避免 TDZ
const { _mockDb } = vi.hoisted(() => ({
  _mockDb: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
  },
}))
vi.mock('@nuxthub/db', () => ({
  db: _mockDb,
  schema: { users: { id: 'id', avatarImg: 'avatar_img' } },
}))

import { avatarPathnameOf, isAvatarPath, guardAvatarAccess, invalidateAvatarCache } from '../../server/utils/files/avatarGuard'
import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

const AVATAR_URL = '/api/files/serve?pathname=221%2Fhash.webp'

beforeEach(() => {
  resetAllStubs()
  _mockDb.select.mockReturnValue(_mockDb)
  _mockDb.from.mockReturnValue(_mockDb)
  _mockDb.where.mockResolvedValue([])
  invalidateAvatarCache()
})

describe('files/avatarGuard - avatarPathnameOf', () => {
  it('解析 /api/files/serve 的 pathname（URL 解码 + 去前导 /）', () => {
    expect(avatarPathnameOf(AVATAR_URL)).toBe('221/hash.webp')
    expect(avatarPathnameOf('/api/files/serve?pathname=%2F221%2Fa.png')).toBe('221/a.png')
  })

  it('非本 API 的头像值返回 null（静态路径 / 外链 / 空值）', () => {
    expect(avatarPathnameOf('/avatar.webp')).toBeNull()
    expect(avatarPathnameOf('https://cdn.example.com/a.png')).toBeNull()
    expect(avatarPathnameOf(null)).toBeNull()
    expect(avatarPathnameOf(undefined)).toBeNull()
  })
})

describe('files/avatarGuard - isAvatarPath', () => {
  it('命中用户头像路径返回 true，其它路径 false', async () => {
    _mockDb.where.mockResolvedValue([{ avatarImg: AVATAR_URL }])
    invalidateAvatarCache()
    expect(await isAvatarPath('221/hash.webp')).toBe(true)
    expect(await isAvatarPath('221/cover.webp')).toBe(false)
  })

  it('无任何头像时全部 false', async () => {
    expect(await isAvatarPath('221/hash.webp')).toBe(false)
  })
})

describe('files/avatarGuard - guardAvatarAccess', () => {
  beforeEach(() => {
    _mockDb.where.mockResolvedValue([{ userId: 5, avatarImg: AVATAR_URL }])
    invalidateAvatarCache()
  })

  it('学生访问他人头像 → 403', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    await expect(guardAvatarAccess({}, '221/hash.webp')).rejects.toThrow()
  })

  it('未登录访问头像 → 403', async () => {
    setMockAuthState(null)
    await expect(guardAvatarAccess({}, '221/hash.webp')).rejects.toThrow()
  })

  it('教师 / 管理员 / 观察者访问头像 → 放行', async () => {
    for (const role of ['teacher', 'admin', 'observer']) {
      setMockAuthState({ id: 2, username: 't', name: 'T', roles: [role], permissions: [] })
      expect(await guardAvatarAccess({}, '221/hash.webp')).toBe(true)
    }
  })

  it('学生访问「自己的头像」→ 放行（本人可查看）', async () => {
    setMockAuthState({ id: 5, username: 'me', name: 'Me', roles: ['student'], permissions: [] })
    expect(await guardAvatarAccess({}, '221/hash.webp')).toBe(true)
  })

  it('非头像文件 → 不做角色校验，直接放行（返回 false）', async () => {
    setMockAuthState(null) // 即使未登录
    expect(await guardAvatarAccess({}, '221/cover.webp')).toBe(false)
  })
})
