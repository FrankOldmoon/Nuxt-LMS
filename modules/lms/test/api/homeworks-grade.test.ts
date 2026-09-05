/**
 * 作业评语 / 优秀作业 / 优秀作业列表接口测试
 * @see modules/lms/server/api/homeworks/grade.post.ts
 * @see modules/lms/server/api/homeworks/featured.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _query = {
  userHomeworks: { findMany: vi.fn() },
  users: { findMany: vi.fn() },
}
const _mockDb = {
  query: _query,
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}
const _mockSchema = {
  userHomeworks: { userId: 'userId', courseId: 'courseId', homeworkCid: 'homeworkCid', comment: 'comment', excellent: 'excellent' },
  users: { id: 'id', name: 'name', preferName: 'preferName', avatarImg: 'avatarImg' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))
vi.mock('../../server/utils/comment/classId', () => ({
  getUserClassId: vi.fn(),
}))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'
import { getUserClassId } from '../../server/utils/comment/classId'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  vi.mocked(getUserClassId).mockResolvedValue(null)
})

function makeEvent(opts: { query?: Record<string, any>; body?: any } = {}) {
  return { cookies: {}, query: opts.query || {}, body: opts.body } as any
}

// ====================== grade.post.ts ======================
describe('API: homeworks/grade.post', () => {
  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/homeworks/grade.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, homework_cid: 1, user_id: 1 } }))).rejects.toThrow()
  })

  it('学生无权限打分/评语/标优', async () => {
    setMockAuthState({ id: 2, username: 'bob', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/grade.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, homework_cid: 1, user_id: 1, comment: 'ok' } }))).rejects.toThrow()
  })

  it('教师写评语 + 标为优秀', async () => {
    setMockAuthState({ id: 9, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ userId: 1, courseId: 1, homeworkCid: 1, comment: '很棒', excellent: true }])
    const handler = (await import('../../server/api/homeworks/grade.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, homework_cid: 1, user_id: 1, comment: '很棒', excellent: true } }))
    expect(r.success).toBe(true)
    expect(_mockDb.set).toHaveBeenCalledWith({ comment: '很棒', excellent: true })
  })

  it('无字段时不更新', async () => {
    setMockAuthState({ id: 9, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/grade.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, homework_cid: 1, user_id: 1 } }))
    expect(r.success).toBe(false)
  })
})

// ====================== featured.get.ts ======================
describe('API: homeworks/featured.get', () => {
  it('返回当前班级被标优的作业（含作者完整信息）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(getUserClassId).mockResolvedValue(5)
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([{ id: 1, isTeacher: false }])
    vi.mocked(_query.userHomeworks.findMany).mockResolvedValue([
      { userId: 1, courseId: 1, homeworkCid: 1, content: '优秀答案', files: [], score: '95', comment: '出色', excellent: true },
    ] as any)
    vi.mocked(_query.users.findMany).mockResolvedValue([
      { id: 1, name: 'Alice', preferName: 'Al', username: 'alice01', rollNumber: 'R001', avatarImg: null },
    ] as any)
    const handler = (await import('../../server/api/homeworks/featured.get')).default
    const r = await handler(makeEvent({ query: { course_id: 1, homework_cid: 1 } }))
    expect(r.success).toBe(true)
    expect(r.data.length).toBe(1)
    // 作者字段与 LmsClassUser 对齐（name 主标签 / username 副标签）
    expect(r.data[0].name).toBe('Alice')
    expect(r.data[0].preferName).toBe('Al')
    expect(r.data[0].username).toBe('alice01')
    expect(r.data[0].rollNumber).toBe('R001')
    expect(r.data[0].content).toBe('优秀答案')
    // 只查标优的作业
    const where = _query.userHomeworks.findMany.mock.calls[0][0].where
    expect(JSON.stringify(where)).toContain('excellent')
  })

  it('无主班级时返回空', async () => {
    setMockAuthState({ id: 2, username: 'bob', roles: ['student'], permissions: [] })
    vi.mocked(getUserClassId).mockResolvedValue(null)
    const handler = (await import('../../server/api/homeworks/featured.get')).default
    const r = await handler(makeEvent({ query: { course_id: 1, homework_cid: 1 } }))
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })
})