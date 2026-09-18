/**
 * 定向通知（个人通知，读后硬删除）触发点测试
 * @see modules/lms/server/api/homeworks/score.post.ts
 * @see modules/lms/server/api/comments/approve.post.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb: any = {
  query: {
    userHomeworks: { findFirst: vi.fn() },
    homeworks: { findFirst: vi.fn() },
    comments: { findFirst: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
}
const _mockSchema: Record<string, any> = new Proxy({}, {
  get: (_t, table: string) => new Proxy({}, { get: (_t2, col: string) => `${table}.${col}` }),
})

vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))
vi.mock('../../server/utils/comment/classId', () => ({ getUserClassId: vi.fn() }))
vi.mock('../../server/utils/comment/reward', () => ({ grantCommentReward: vi.fn() }))

import { resetAllStubs, setMockAuthState, getNotifyCalls, clearNotifyCalls } from '../../../../test/setup/nuxt-stubs'
import { getUserClassId } from '../../server/utils/comment/classId'
import { grantCommentReward } from '../../server/utils/comment/reward'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  clearNotifyCalls()
  vi.mocked(getUserClassId).mockResolvedValue(null)
  vi.mocked(grantCommentReward).mockResolvedValue(undefined as any)
  // 预先存在的 auto-import 桩（原本由其它 api 测试注入）
  ;(globalThis as any).addChapterScore = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).addCourseScore = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).checkAndAwardMedals = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({ comment: { publishExp: 3, replyExp: 2 } })
  ;(globalThis as any).broadcastSubmitDanmaku = vi.fn().mockResolvedValue(undefined)
})

function makeEvent(body: any = {}, query: Record<string, any> = {}) {
  return { cookies: {}, query, body } as any
}

describe('定向通知：作业被评分', () => {
  it('分数变化时通知该学生（data.type=homeworkGraded）', async () => {
    setMockAuthState({ id: 9, username: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.userHomeworks.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, homeworkCid: 1, score: '50' })
    _mockDb.returning = vi.fn().mockResolvedValue([{ userId: 2, courseId: 1, homeworkCid: 1, score: '85' }])

    const handler = (await import('../../server/api/homeworks/score.post')).default
    const r = await handler(makeEvent({ course_id: 1, chapter_id: 0, homework_cid: 1, user_id: 2, score: 85 }))

    expect(r.success).toBe(true)
    const calls = getNotifyCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].userId).toBe(2)
    expect(calls[0].data).toMatchObject({ type: 'homeworkGraded', score: 85, courseId: 1, homeworkCid: 1 })
  })

  it('分数未变化时不通知', async () => {
    setMockAuthState({ id: 9, username: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.userHomeworks.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, homeworkCid: 1, score: '70' })
    _mockDb.returning = vi.fn().mockResolvedValue([{ userId: 2, courseId: 1, homeworkCid: 1, score: '70' }])

    const handler = (await import('../../server/api/homeworks/score.post')).default
    const r = await handler(makeEvent({ course_id: 1, homework_cid: 1, user_id: 2, score: 70 }))

    expect(r.success).toBe(true)
    expect(getNotifyCalls()).toHaveLength(0)
  })
})

describe('定向通知：评论通过审核', () => {
  it('首次过审通知作者（data.type=commentApproved）', async () => {
    setMockAuthState({ id: 9, username: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 7, courseId: 1, cid: 2, parentId: null, status: 'audit' })
    _mockDb.update = vi.fn().mockReturnThis()
    _mockDb.set = vi.fn().mockReturnThis()
    _mockDb.where = vi.fn().mockResolvedValue([])

    const handler = (await import('../../server/api/comments/approve.post')).default
    const r = await handler(makeEvent({ course_id: 1, cid: 2, chapter_id: 0 }))

    expect(r.success).toBe(true)
    const calls = getNotifyCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].userId).toBe(7)
    expect(calls[0].data).toMatchObject({ type: 'commentApproved', courseId: 1, cid: 2 })
  })

  it('重复审核（已是 published）不再通知', async () => {
    setMockAuthState({ id: 9, username: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 7, courseId: 1, cid: 2, parentId: null, status: 'published' })
    _mockDb.where = vi.fn().mockResolvedValue([])

    const handler = (await import('../../server/api/comments/approve.post')).default
    const r = await handler(makeEvent({ course_id: 1, cid: 2 }))

    expect(r.success).toBe(true)
    expect(getNotifyCalls()).toHaveLength(0)
  })
})
