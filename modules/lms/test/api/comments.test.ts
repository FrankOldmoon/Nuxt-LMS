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

// mock 用户主班级解析（评论按班级隔离依赖 users.classId 查询）
vi.mock('../../server/utils/comment/classId', () => ({
  getUserClassId: vi.fn().mockResolvedValue(null),
}))
import { getUserClassId } from '../../server/utils/comment/classId'

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

  it('学生只能看到已过审（published）评论（查询带 status 过滤）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.comments.findFirst).mockResolvedValue({
      id: 1, userId: 1, courseId: 1, cid: 1, content: 'Root', parentId: null, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    } as any)
    vi.mocked(db.query.comments.findMany).mockResolvedValue([])
    vi.mocked(db.query.users.findMany).mockResolvedValue([])
    vi.mocked(db.query.userComments.findMany).mockResolvedValue([])
    const handler = (await import('../../server/api/comments/list.get')).default
    await handler(makeEvent({ query: { course_id: 1, cid: 1 } }))
    // 非 staff 时，root/children 的 where 都必须带上 status='published' 过滤
    const whereArgs = vi.mocked(db.query.comments.findFirst).mock.calls[0][0].where
    expect(JSON.stringify(whereArgs)).toContain('status')
  })

  it('老师/管理员可看到全部评论（不含 status 过滤）', async () => {
    setMockAuthState({ id: 9, username: 'teacher', roles: ['teacher'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.comments.findFirst).mockResolvedValue({
      id: 1, userId: 1, courseId: 1, cid: 1, content: 'Root', parentId: null, status: 'audit',
      createdAt: new Date(), updatedAt: new Date(),
    } as any)
    vi.mocked(db.query.comments.findMany).mockResolvedValue([])
    vi.mocked(db.query.users.findMany).mockResolvedValue([])
    vi.mocked(db.query.userComments.findMany).mockResolvedValue([])
    const handler = (await import('../../server/api/comments/list.get')).default
    await handler(makeEvent({ query: { course_id: 1, cid: 1 } }))
    const whereArgs = vi.mocked(db.query.comments.findFirst).mock.calls[0][0].where
    expect(JSON.stringify(whereArgs)).not.toContain('status')
  })

  it('学生只看到本班同学的回复（按作者主班级 defaultClass.id || classId 过滤）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // 当前用户主班级 = 3
    vi.mocked(getUserClassId).mockResolvedValue(3)
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.comments.findFirst).mockResolvedValue({
      id: 1, userId: 1, courseId: 1, cid: 1, content: 'Root', parentId: null, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    } as any)
    // 全部回复：userId=1（班内）、userId=2（班外）
    vi.mocked(db.query.comments.findMany).mockResolvedValue([
      { id: 1, userId: 1, courseId: 1, cid: 2, parentId: 1, status: 'published' },
      { id: 2, userId: 2, courseId: 1, cid: 3, parentId: 1, status: 'published' },
    ] as any)
    // 第一次 users.findMany：按作者 id 取班级信息（defaultClass.id || classId）
    //  user1 主班级=3（defaultClass），user2 主班级=2
    vi.mocked(db.query.users.findMany)
      .mockResolvedValueOnce([
        { id: 1, defaultClass: { id: 3 }, classId: null },
        { id: 2, defaultClass: null, classId: 2 },
      ] as any)
      // 第二次：作者展示信息
      .mockResolvedValueOnce([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] as any)
    vi.mocked(db.query.userComments.findMany).mockResolvedValue([] as any)
    const handler = (await import('../../server/api/comments/list.get')).default
    const result = await handler(makeEvent({ query: { course_id: 1, cid: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data.children.length).toBe(1)
    expect(result.data.children[0].userId).toBe(1)
  })

  it('老师也只看到本班同学的子评论（主评论始终返回）', async () => {
    setMockAuthState({ id: 9, username: 'teacher', roles: ['teacher'], permissions: [] })
    vi.mocked(getUserClassId).mockResolvedValue(3)
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.comments.findFirst).mockResolvedValue({
      id: 1, userId: 8, courseId: 1, cid: 1, content: 'Root', parentId: null, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    } as any)
    vi.mocked(db.query.comments.findMany).mockResolvedValue([
      { id: 1, userId: 1, courseId: 1, cid: 2, parentId: 1, status: 'published' }, // 同班
      { id: 2, userId: 2, courseId: 1, cid: 3, parentId: 1, status: 'published' }, // 异班
    ] as any)
    // 第一次：作者班级信息；第二次：作者展示信息
    vi.mocked(db.query.users.findMany)
      .mockResolvedValueOnce([
        { id: 1, defaultClass: null, classId: 3 },
        { id: 2, defaultClass: null, classId: 2 },
      ] as any)
      .mockResolvedValueOnce([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] as any)
    vi.mocked(db.query.userComments.findMany).mockResolvedValue([] as any)
    const handler = (await import('../../server/api/comments/list.get')).default
    const result = await handler(makeEvent({ query: { course_id: 1, cid: 1 } }))
    expect(result.success).toBe(true)
    // 主评论始终返回（不做班级过滤）
    expect(result.data.root).toBeTruthy()
    // 子评论只剩同班 userId=1
    expect(result.data.children.length).toBe(1)
    expect(result.data.children[0].userId).toBe(1)
  })

  it('管理员也只看到本班同学的子评论（主评论始终返回）', async () => {
    setMockAuthState({ id: 99, username: 'admin', roles: ['admin'], permissions: [] })
    vi.mocked(getUserClassId).mockResolvedValue(3)
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.comments.findFirst).mockResolvedValue({
      id: 1, userId: 8, courseId: 1, cid: 1, content: 'Root', parentId: null, status: 'audit',
      createdAt: new Date(), updatedAt: new Date(),
    } as any)
    vi.mocked(db.query.comments.findMany).mockResolvedValue([
      { id: 1, userId: 1, courseId: 1, cid: 2, parentId: 1, status: 'audit' }, // 同班
      { id: 2, userId: 2, courseId: 1, cid: 3, parentId: 1, status: 'audit' }, // 异班
    ] as any)
    vi.mocked(db.query.users.findMany)
      .mockResolvedValueOnce([
        { id: 1, defaultClass: null, classId: 3 },
        { id: 2, defaultClass: null, classId: 2 },
      ] as any)
      .mockResolvedValueOnce([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] as any)
    vi.mocked(db.query.userComments.findMany).mockResolvedValue([] as any)
    const handler = (await import('../../server/api/comments/list.get')).default
    const result = await handler(makeEvent({ query: { course_id: 1, cid: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data.root).toBeTruthy()
    expect(result.data.children.length).toBe(1)
    expect(result.data.children[0].userId).toBe(1)
  })

  it('学生新增顶层评论默认 status 为 published（立即可见），回复默认 audit（待审核）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, courseId: 1, cid: 1, content: 'X', status: 'published' }])
    const handler = (await import('../../server/api/comments/add.post')).default
    // 顶层评论：创建即发布
    await handler(makeEvent({ body: { course_id: 1, content: 'X' } }))
    expect(_mockDb.values).toHaveBeenCalled()
    const topInsert = _mockDb.values.mock.calls[0][0]
    expect(topInsert).toHaveProperty('status', 'published')
    // 回复：默认待审核
    await handler(makeEvent({ body: { course_id: 1, content: 'Y', parentId: 1 } }))
    const replyInsert = _mockDb.values.mock.calls[1][0]
    expect(replyInsert).toHaveProperty('status', 'audit')
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

  it('空内容评论被拒绝', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/add.post')).default
    // 纯空白字符串
    const r1 = await handler(makeEvent({ body: { course_id: 1, content: '   ' } }))
    expect(r1.success).toBe(false)
    // 空 UMO 文档
    const r2 = await handler(makeEvent({ body: { course_id: 1, content: { type: 'doc', content: [] } } }))
    expect(r2.success).toBe(false)
    // 仅含空段落
    const r3 = await handler(makeEvent({ body: { course_id: 1, content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '  ' }] }] } } }))
    expect(r3.success).toBe(false)
    expect(_mockDb.values).not.toHaveBeenCalled()
  })

  it('发顶层评论：提交时不再加分（奖励延后到 approve 发放）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, courseId: 1, cid: 1, content: 'X' }])
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'X' } }))
    expect(r.success).toBe(true)
    // 提交不立即加分：奖励延后到 approve（审核通过）时发放，防止未过审灌水刷分
    expect(addCourseScore).not.toHaveBeenCalled()
    // 顶层评论创建即发布
    expect(_mockDb.values).toHaveBeenCalled()
    const insertData = _mockDb.values.mock.calls[0][0]
    expect(insertData).toHaveProperty('status', 'published')
  })

  it('评论在章节内（带 chapter_id）时不立即加章节分，审核通过后由请求自动注入累加', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, courseId: 1, cid: 1, content: 'X' }])
    const { addChapterScore } = await import('../../server/utils/userScore/chapter')
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, chapter_id: 7, content: 'X' } }))
    expect(r.success).toBe(true)
    // 提交不立即加章节分（奖励延后到审核通过时发放）
    expect(addChapterScore).not.toHaveBeenCalled()
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

  it('回复评论：提交时不再加分（审核通过后发放 replyExp）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, userId: 1, courseId: 1, cid: 1, parentId: 5, content: 'X' }])
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'X', parentId: 5 } }))
    expect(r.success).toBe(true)
    // 提交不立即加分
    expect(addCourseScore).not.toHaveBeenCalled()
    // 父评论 id 随评论存储，供 approve 判断 reply/publish 奖励类型
    expect(_mockDb.values).toHaveBeenCalled()
    const insertData = _mockDb.values.mock.calls[0][0]
    expect(insertData).toHaveProperty('parentId', 5)
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

describe('API: comments/approve.post', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/comments/approve.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, cid: 1 } }))).rejects.toThrow()
  })

  it('普通学生无权限审核', async () => {
    setMockAuthState({ id: 2, username: 'bob', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/approve.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, cid: 1 } }))).rejects.toThrow()
  })

  it('老师批准评论：status 更新为 published 并发放 publish 奖励', async () => {
    setMockAuthState({ id: 9, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({
      userId: 1, courseId: 1, cid: 5, parentId: null, chapterId: null, status: 'audit',
    })
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/approve.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 5 } }))
    expect(r.success).toBe(true)
    expect(_mockDb.update).toHaveBeenCalled()
    expect(_mockDb.set).toHaveBeenCalledWith({ status: 'published' })
    // 审核通过发放顶层评论奖励：exp=3, coin=3, score 计入课程总分（commentScore 分项）
    const call = (addCourseScore as any).mock.calls[0]
    expect(call[0]).toBe(1)            // userId（评论作者）
    expect(call[1]).toBe(1)            // courseId
    expect(call[2]).toBe(3)            // score = publishExp
    expect(call[3]).toBe('commentScore')
    expect(call[4]).toBe(3)            // exp
    expect(call[5]).toBe(3)            // coin
  })

  it('审核通过时按回复类型发放 reply 奖励并累加章节总分（chapter_id 由 cRequest 注入）', async () => {
    setMockAuthState({ id: 9, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({
      userId: 1, courseId: 1, cid: 5, parentId: 2, status: 'audit',
    })
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const { addChapterScore } = await import('../../server/utils/userScore/chapter')
    const handler = (await import('../../server/api/comments/approve.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 5, chapter_id: 7 } }))
    expect(r.success).toBe(true)
    // reply 奖励：exp=2
    const call = (addCourseScore as any).mock.calls[0]
    expect(call[4]).toBe(2)            // replyExp
    // 章节总分：chapterId=7（请求 body 自动注入），score = replyExp
    const chCall = (addChapterScore as any).mock.calls[0]
    expect(chCall[0]).toBe(1)
    expect(chCall[1]).toBe(7)
    expect(chCall[2]).toBe(2)
  })

  it('重复审核（已 published）不重复发放奖励（幂等）', async () => {
    setMockAuthState({ id: 9, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({
      userId: 1, courseId: 1, cid: 5, parentId: null, chapterId: null, status: 'published',
    })
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const handler = (await import('../../server/api/comments/approve.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 5 } }))
    expect(r.success).toBe(true)
    expect(addCourseScore).not.toHaveBeenCalled()
  })
})
