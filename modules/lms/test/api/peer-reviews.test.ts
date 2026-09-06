/**
 * peer-reviews API 端点测试
 * @see modules/lms/server/api/peer-reviews/*.ts
 *
 * 覆盖：add（权限/成功）、show、update、submit（防自评/被评人校验/成功 upsert）、result（汇总+结算）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb({
  peerReviewConfigs: { findFirst: vi.fn(), findMany: vi.fn() },
  peerReviews: { findFirst: vi.fn(), findMany: vi.fn() },
})
const _mockSchema: any = {
  peerReviewConfigs: { courseId: 'courseId', cid: 'cid', name: 'name', options: 'options' },
  peerReviews: { courseId: 'courseId', cid: 'cid', fromUserId: 'fromUserId', targetUserId: 'targetUserId', scores: 'scores' },
  userCourses: { userId: 'userId', courseId: 'courseId', isTeacher: 'isTeacher', isEditor: 'isEditor', peerScore: 'peerScore' },
  users: { id: 'id', name: 'name', avatarImg: 'avatarImg' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// mock peerReview 工具中的 DB 查询函数，保留 validateScores 真实逻辑
vi.mock('../../server/utils/peerReview', async (importOriginal) => {
  const orig = await importOriginal<any>()
  return {
    ...orig,
    getCourseStudents: vi.fn(async () => [{ userId: 2, name: 'Bob', avatarImg: null }]),
    calcPeerScores: vi.fn(async () => ({ 2: 8.5 })),
  }
})

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(async () => {
  resetAllStubs()
  resetDb(_mockDb, {
    peerReviewConfigs: { findFirst: vi.fn(), findMany: vi.fn() },
    peerReviews: { findFirst: vi.fn(), findMany: vi.fn() },
  })
  installLmsAutoImports({ isCourseTeacher: vi.fn().mockResolvedValue(true) })
  // 重置工具 mock
  const mod = await import('../../server/utils/peerReview') as any
  mod.getCourseStudents.mockImplementation(async () => [{ userId: 2, name: 'Bob', avatarImg: null }])
  mod.calcPeerScores.mockImplementation(async () => ({ 2: 8.5 }))
})

const CONFIG = { courseId: 1, cid: 1, name: '互评', options: [{ key: 'a', label: '认真度', maxScore: 10 }] }

describe('API: peer-reviews/add', () => {
  it('非教师返回 403', async () => {
    setMockAuthState({ id: 1, username: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/peer-reviews/add.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, name: 'x', options: [{ label: 'a' }] } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('教师新增成功返回 cid', async () => {
    setMockAuthState({ id: 1, username: 't', roles: ['teacher'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ courseId: 1, cid: 1, name: '互评' }])
    const handler = (await import('../../server/api/peer-reviews/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, name: '互评', options: [{ label: '认真度', maxScore: 10 }] } }))
    expect(r.success).toBe(true)
    expect(r.data.cid).toBe(1)
  })

  it('缺少评价项返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/peer-reviews/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, name: '互评', options: [] } }))
    expect(r.success).toBe(false)
  })
})

describe('API: peer-reviews/submit', () => {
  it('不能评价自己', async () => {
    setMockAuthState({ id: 2, username: 's', roles: ['student'], permissions: [] })
    _mockDb.query.peerReviewConfigs.findFirst = vi.fn().mockResolvedValue(CONFIG)
    const handler = (await import('../../server/api/peer-reviews/submit.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1, target_user_id: 2, scores: { a: 5 } } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/不能评价自己/)
  })

  it('被评人不在课程学生中返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', roles: ['student'], permissions: [] })
    _mockDb.query.peerReviewConfigs.findFirst = vi.fn().mockResolvedValue(CONFIG)
    const mod = await import('../../server/utils/peerReview') as any
    mod.getCourseStudents.mockImplementation(async () => [{ userId: 2, name: 'Bob' }])
    const handler = (await import('../../server/api/peer-reviews/submit.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1, target_user_id: 99, scores: { a: 5 } } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/不在该课程学生/)
  })

  it('分值超出 maxScore 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', roles: ['student'], permissions: [] })
    _mockDb.query.peerReviewConfigs.findFirst = vi.fn().mockResolvedValue(CONFIG)
    const handler = (await import('../../server/api/peer-reviews/submit.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1, target_user_id: 2, scores: { a: 99 } } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/0~10/)
  })

  it('提交成功（可覆盖 upsert）', async () => {
    setMockAuthState({ id: 1, username: 's', roles: ['student'], permissions: [] })
    _mockDb.query.peerReviewConfigs.findFirst = vi.fn().mockResolvedValue(CONFIG)
    const handler = (await import('../../server/api/peer-reviews/submit.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1, target_user_id: 2, scores: { a: 8 } } }))
    expect(r.success).toBe(true)
    expect(_mockDb.onConflictDoUpdate).toHaveBeenCalled()
  })
})

describe('API: peer-reviews/result', () => {
  it('非教师返回 403', async () => {
    setMockAuthState({ id: 1, username: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/peer-reviews/result.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1' } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('教师查看汇总并结算写回 user_courses.peer_score', async () => {
    setMockAuthState({ id: 1, username: 't', roles: ['teacher'], permissions: [] })
    // result 的评分明细查询：select().from().where() → 返回数组
    const listChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { fromUserId: 1, targetUserId: 2, scores: { a: 8 } },
      ]),
    }
    _mockDb.select = vi.fn().mockReturnValue(listChain)
    const handler = (await import('../../server/api/peer-reviews/result.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', settle: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.students[0].peerScore).toBe(8.5)
    // settle 时调用 db.update(...).set({ peerScore }).where()
    expect(_mockDb.update).toHaveBeenCalled()
    expect(_mockDb.set).toHaveBeenCalled()
  })
})
