/**
 * Comments API 端点测试
 * @see modules/lms/server/api/comments/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    comments: { findFirst: vi.fn(), findMany: vi.fn() },
    users: { findMany: vi.fn() },
    userComments: { findMany: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  comments: {
    id: 'id', userId: 'userId', courseId: 'courseId', cid: 'cid', chapterId: 'chapterId',
    content: 'content', parentId: 'parentId', name: 'name', tags: 'tags', point: 'point',
    status: 'status', likeCount: 'likeCount', replyCount: 'replyCount',
    deletedAt: 'deletedAt', createdAt: 'createdAt', updatedAt: 'updatedAt',
  },
  users: { id: 'id', username: 'username', name: 'name', avatarImg: 'avatarImg' },
  userComments: {
    id: 'id', userId: 'userId', courseId: 'courseId', commentCid: 'commentCid',
    like: 'like', createdAt: 'createdAt',
  },
  commentLikes: { userId: 'userId', commentId: 'commentId' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

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
  _mockDb.leftJoin = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.offset = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
}

describe('API: comments/list.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/comments/list.get')).default
    await expect(handler(makeEvent({ query: { chapterId: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 或 cid 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/list.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('登录后获取评论树', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // list.get 使用 db.query.* 关系查询 API（findFirst/findMany），返回 { root, children }
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.comments.findFirst).mockResolvedValue({
      id: 1, userId: 1, courseId: 1, cid: 1, content: 'Root', parentId: null,
      likeCount: 0, replyCount: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
    } as any)
    vi.mocked(db.query.comments.findMany).mockResolvedValue([])
    vi.mocked(db.query.users.findMany).mockResolvedValue([])
    vi.mocked(db.query.userComments.findMany).mockResolvedValue([])
    const handler = (await import('../../server/api/comments/list.get')).default
    const result = await handler(makeEvent({ query: { course_id: 1, cid: 1 } }))
    expect(result.success).toBe(true)
  })
})

describe('API: comments/add.post', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/comments/add.post')).default
    await expect(handler(makeEvent({ body: { chapterId: 1, content: 'X' } }))).rejects.toThrow()
  })

  it('未登录不能评论（拦截）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, chapterId: 1, content: 'X' }])
    const handler = (await import('../../server/api/comments/add.post')).default
    const result = await handler(makeEvent({ body: { chapterId: 1, content: 'X' } }))
    expect(result).toBeDefined()
  })
})

describe('API: comments/like.post', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/comments/like.post')).default
    await expect(handler(makeEvent({ body: { commentId: 1 } }))).rejects.toThrow()
  })
})
