/**
 * showcase API 测试：上传/编辑/删除仅管理员 + 作品多对多参与用户
 * @see modules/lms/server/api/showcase/index.post.ts
 * @see modules/lms/server/api/showcase/update.post.ts
 * @see modules/lms/server/api/showcase/delete.post.ts
 * @see modules/lms/server/api/showcase/show.get.ts
 * @see modules/lms/server/utils/db/showcaseMembers.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { createMockDb, resetDb, makeEvent } from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb({
  showcases: { findFirst: vi.fn(), findMany: vi.fn() },
  showcaseLikes: { findFirst: vi.fn(), findMany: vi.fn() },
})
const _mockSchema: any = {
  showcases: {
    id: 'id', userId: 'userId', title: 'title', category: 'category', cover: 'cover',
    content: 'content', tags: 'tags', status: 'status', likeCount: 'likeCount',
    createdAt: 'createdAt', deletedAt: 'deletedAt',
  },
  showcaseUsers: { showcaseId: 'showcaseId', userId: 'userId', createdAt: 'createdAt' },
  showcaseLikes: { showcaseId: 'showcaseId', userId: 'userId', like: 'like' },
  users: { id: 'id' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

const ADMIN = { id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] }
const TEACHER = { id: 2, username: 't', name: 'T', roles: ['teacher'], permissions: [] }

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
})

describe('showcase: 权限（仅管理员可增/改/删）', () => {
  it('创建：未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/showcase/index.post')).default
    await expect(handler(makeEvent({ body: { title: 'x' } }))).rejects.toThrow()
  })

  it('创建：教师（非管理员）被拒 403', async () => {
    setMockAuthState(TEACHER)
    const handler = (await import('../../server/api/showcase/index.post')).default
    await expect(handler(makeEvent({ body: { title: 'x' } }))).rejects.toThrow()
  })

  it('创建：缺少标题返回失败', async () => {
    setMockAuthState(ADMIN)
    const handler = (await import('../../server/api/showcase/index.post')).default
    const r = await handler(makeEvent({ body: { title: '   ' } }))
    expect(r.success).toBe(false)
  })

  it('创建：管理员成功且写入参与用户（去重/过滤非法值）', async () => {
    setMockAuthState(ADMIN)
    _mockDb.returning.mockResolvedValue([{ id: 5, status: 'pending' }])
    const handler = (await import('../../server/api/showcase/index.post')).default
    const r = await handler(makeEvent({ body: { title: 'Robot', userIds: [2, 2, '3', 0, -1, 'abc'] } }))
    expect(r.success).toBe(true)
    expect(r.data).toMatchObject({ id: 5, status: 'pending', userIds: [2, 3] })
    // values 第二次调用写入 showcase_users 关联行
    const userLinkCall = _mockDb.values.mock.calls[1][0]
    expect(userLinkCall).toEqual([
      { showcaseId: 5, userId: 2 },
      { showcaseId: 5, userId: 3 },
    ])
  })

  it('更新：教师（非管理员）被拒 403', async () => {
    setMockAuthState(TEACHER)
    const handler = (await import('../../server/api/showcase/update.post')).default
    await expect(handler(makeEvent({ body: { id: 1, title: 'x' } }))).rejects.toThrow()
  })

  it('删除：教师（非管理员）被拒 403', async () => {
    setMockAuthState(TEACHER)
    const handler = (await import('../../server/api/showcase/delete.post')).default
    await expect(handler(makeEvent({ body: { id: 1 } }))).rejects.toThrow()
  })
})

describe('showcase: 多对多参与用户', () => {
  it('详情返回参与用户列表（按加入顺序）', async () => {
    setMockAuthState(null)
    _mockDb.query.showcases.findFirst.mockResolvedValue({
      id: 1, userId: 9, status: 'approved', content: {}, tags: [], likeCount: 0,
    })
    _mockDb.query.users.findFirst.mockResolvedValue({ id: 9, name: 'Owner', avatarImg: null, avatarFrame: null })
    _mockDb.where.mockResolvedValue([
      { showcaseId: 1, userId: 3, createdAt: new Date('2026-01-02T00:00:00Z') },
      { showcaseId: 1, userId: 2, createdAt: new Date('2026-01-01T00:00:00Z') },
    ])
    _mockDb.query.users.findMany.mockResolvedValue([
      { id: 2, name: 'Bob', username: 'bob', avatarImg: 'b.webp', avatarFrame: null },
      { id: 3, name: 'Cara', username: 'cara', avatarImg: null, avatarFrame: null },
    ])
    _mockDb.query.showcaseLikes.findFirst.mockResolvedValue(null)

    const handler = (await import('../../server/api/showcase/show.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.members.map((m: any) => m.name)).toEqual(['Bob', 'Cara'])
    expect(r.data.members[0]).toMatchObject({ id: 2, username: 'bob', avatarImg: 'b.webp' })
  })

  it('normalizeShowcaseUserIds：去重、忽略非法值、保留顺序', async () => {
    const { normalizeShowcaseUserIds } = await import('../../server/utils/db/showcaseMembers')
    expect(normalizeShowcaseUserIds([3, '2', 3, 0, -5, 'x', null, 7])).toEqual([3, 2, 7])
    expect(normalizeShowcaseUserIds('not-array')).toEqual([])
    expect(normalizeShowcaseUserIds(undefined)).toEqual([])
  })
})
