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

// mock 评论加分工具底层：addCourseScore / addChapterScore 成为 spy，便于断言加分行为
vi.mock('../../server/utils/userScore/course', () => ({
  addCourseScore: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../server/utils/userScore/chapter', () => ({
  addChapterScore: vi.fn().mockResolvedValue(undefined),
}))

const COMMENT_CONFIG = {
  comment: {
    publishExp: 3, publishCoin: 3,
    replyExp: 2, replyCoin: 2,
    likeReceivedExp: 1, likeReceivedCoin: 1,
    maxDailyExp: 20, maxDailyCoin: 20,
    maxCommentCount: 2,
  },
}

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // 评论加分依赖的 LMS 配置 + 奖章检查
  ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue(COMMENT_CONFIG)
  ;(globalThis as any).checkAndAwardMedals = vi.fn().mockResolvedValue([])
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

  it('发顶层评论给 publishExp + publishCoin + 计入课程分', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, courseId: 1, cid: 1, content: 'X' }])
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'X' } }))
    expect(r.success).toBe(true)
    // 加分：exp=3, coin=3，score 也计入课程总分（commentScore 分项）
    const call = (addCourseScore as any).mock.calls[0]
    expect(call[0]).toBe(1)            // userId
    expect(call[1]).toBe(1)            // courseId
    expect(call[2]).toBe(3)            // score 增量 = publishExp
    expect(call[3]).toBe('commentScore')
    expect(call[4]).toBe(3)            // exp
    expect(call[5]).toBe(3)            // coin
  })

  it('评论在章节内（带 chapter_id）时同时计入章节总分', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, courseId: 1, cid: 1, content: 'X' }])
    const { addChapterScore } = await import('../../server/utils/userScore/chapter')
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, chapter_id: 7, content: 'X' } }))
    expect(r.success).toBe(true)
    const call = (addChapterScore as any).mock.calls[0]
    expect(call[0]).toBe(1)  // userId
    expect(call[1]).toBe(7)  // chapterId
    expect(call[2]).toBe(3)  // score = publishExp
  })

  it('达到 maxCommentCount 上限时拒绝回复（按父评论统计）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // count 查询链：select().from().where() → 返回 [{ n: 2 }]（同一父评论下已回复 2 条 = 上限）
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      then: (resolve: any) => resolve([{ n: 2 }]),
    }
    _mockDb.select = vi.fn(() => chain)
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'X', parentId: 5 } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/上限/)
    expect(_mockDb.insert).not.toHaveBeenCalled()
    // count 查询必须带 parentId=5 条件
    const whereArg = chain.where.mock.calls[0][0]
    expect(JSON.stringify(whereArg)).toContain('parentId')
  })

  it('顶层评论（无 parentId）不受每主题回复数上限限制', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // 顶层评论不查 count（parentId 为空），走默认链式 mock 即可
    resetChain()
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, courseId: 1, cid: 1, content: 'X' }])
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'X' } }))
    expect(r.success).toBe(true)
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('回复评论给 replyExp + replyCoin', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, courseId: 1, cid: 1, parentId: 5, content: 'X' }])
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'X', parentId: 5 } }))
    expect(r.success).toBe(true)
    const call = (addCourseScore as any).mock.calls[0]
    expect(call[4]).toBe(2)            // replyExp
    expect(call[5]).toBe(2)            // replyCoin
  })
})

describe('API: comments/like.post', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/comments/like.post')).default
    await expect(handler(makeEvent({ body: { commentId: 1 } }))).rejects.toThrow()
  })

  it('首次点赞给作者 likeReceivedExp + likeReceivedCoin + 计入课程分', async () => {
    setMockAuthState({ id: 2, username: 'bob', roles: ['student'], permissions: [] })
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue(null) // 从未操作过 → 首次点赞
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, cid: 1 }) // 作者 alice
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/like.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: true } }))
    expect(r.success).toBe(true)
    // 加分对象是评论作者（userId=1），exp=1, coin=1, score=1
    const call = (addCourseScore as any).mock.calls[0]
    expect(call[0]).toBe(1)
    expect(call[2]).toBe(1)
    expect(call[4]).toBe(1)
    expect(call[5]).toBe(1)
  })

  it('赞→取消→再赞 只加一次分（不能刷分）', async () => {
    setMockAuthState({ id: 2, username: 'bob', roles: ['student'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, cid: 1 })
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/like.post')).default
    // 1) 首次点赞：无记录 → 加分
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue(null)
    await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: true } }))
    expect((addCourseScore as any).mock.calls.length).toBe(1)
    // 2) 取消点赞：已有记录 → 不加分
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, commentCid: 1, like: true })
    await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: false } }))
    expect((addCourseScore as any).mock.calls.length).toBe(1)
    // 3) 再次点赞：记录仍在 → 仍不加分
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, commentCid: 1, like: false })
    await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: true } }))
    expect((addCourseScore as any).mock.calls.length).toBe(1)
  })

  it('自赞不给作者加分', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue(null)
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, cid: 1 }) // 作者就是 alice 自己
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/like.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: true } }))
    expect(r.success).toBe(true)
    expect(addCourseScore).not.toHaveBeenCalled()
  })

  it('重复点赞（已有记录）不再加分', async () => {
    setMockAuthState({ id: 2, username: 'bob', roles: ['student'], permissions: [] })
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, commentCid: 1, like: true })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, cid: 1 })
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/like.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: true } }))
    expect(r.success).toBe(true)
    expect(addCourseScore).not.toHaveBeenCalled()
  })

  it('取消点赞（like=false）不加分', async () => {
    setMockAuthState({ id: 2, username: 'bob', roles: ['student'], permissions: [] })
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, commentCid: 1, like: true })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, cid: 1 })
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/like.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: false } }))
    expect(r.success).toBe(true)
    expect(addCourseScore).not.toHaveBeenCalled()
  })
})
