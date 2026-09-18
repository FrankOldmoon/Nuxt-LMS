/**
 * LMS Quizzes API 端点测试
 * @see modules/lms/server/api/quizzes/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    quizzes: { findFirst: vi.fn(), findMany: vi.fn() },
    questions: { findFirst: vi.fn(), findMany: vi.fn() },
    userQuizzes: { findFirst: vi.fn(), findMany: vi.fn() },
    userCourses: { findFirst: vi.fn(), findMany: vi.fn() },
  } as any,
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}
const _mockSchema = {
  quizzes: { courseId: 'courseId', cid: 'cid', deletedAt: 'deletedAt', submitLimit: 'submitLimit', submitCount: 'submitCount' },
  questions: { courseId: 'courseId', cid: 'cid', type: 'type', answer: 'answer', point: 'point' },
  userQuizzes: { userId: 'userId', courseId: 'courseId', quizCid: 'quizCid', score: 'score', submitCount: 'submitCount', startedAt: 'startedAt', submitedAt: 'submitedAt', records: 'records' },
  userCourses: { userId: 'userId', courseId: 'courseId', score: 'score', exp: 'exp', quizScore: 'quizScore' },
  users: { id: 'id', defaultClass: 'defaultClass' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
    // 本文件的教师场景均假定为该课程的任课教师（requireCourseTeacher 守卫通过）
  ;(globalThis as any).isCourseTeacher = async () => true
resetAllStubs()
  vi.clearAllMocks()
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.selectDistinct = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.innerJoin = vi.fn().mockReturnThis()
  _mockDb.leftJoin = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.offset = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
  _mockDb.returning = vi.fn().mockResolvedValue([])
  _mockDb.query = {
    quizzes: { findFirst: vi.fn(), findMany: vi.fn() },
    questions: { findFirst: vi.fn(), findMany: vi.fn() },
    userQuizzes: { findFirst: vi.fn(), findMany: vi.fn() },
    userCourses: { findFirst: vi.fn(), findMany: vi.fn() },
  }
  // LMS auto-import stubs
  ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({
    quiz: { submitExp: 3, passScore: 60, passBonusExp: 10 },
  })
  ;(globalThis as any).addChapterScore = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).addCourseScore = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).addCourseScoreMax = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).checkAndAwardMedals = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([])
})

function makeEvent(opts: { query?: Record<string, any>; body?: any; cookies?: Record<string, any> } = {}) {
  return { cookies: opts.cookies || {}, query: opts.query || {}, body: opts.body } as any
}

// ====================== show.ts ======================

describe('API: quizzes/show', () => {
  it('缺少 course_id 参数返回失败', async () => {
    const handler = (await import('../../server/api/quizzes/show')).default
    const result = await handler(makeEvent({ query: { cid: '1' } }))
    expect(result.success).toBe(false)
  })

  it('缺少 cid 参数返回失败', async () => {
    const handler = (await import('../../server/api/quizzes/show')).default
    const result = await handler(makeEvent({ query: { course_id: '1' } }))
    expect(result.success).toBe(false)
  })

  it('返回测验数据', async () => {
    _mockDb.query.quizzes.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, name: 'Quiz 1', submitLimit: 3 })
    const handler = (await import('../../server/api/quizzes/show')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Quiz 1')
  })
})

// ====================== submit.post.ts ======================

describe('API: quizzes/submit', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, quiz_cid: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { quiz_cid: 1 } }))
    expect(result.success).toBe(false)
  })

  it('测验不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.quizzes.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1 } }))
    expect(result.success).toBe(false)
  })

  it('start_only 模式：新建进行中记录', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.quizzes.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, submitLimit: 1 })
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, start_only: true } }))
    expect(result.success).toBe(true)
    expect(result.data.startedAt).toBeTruthy()
    // 验证 insert 被调用
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('start_only 模式：已有进行中记录不覆盖 startedAt', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    const existingStartedAt = new Date('2026-01-01')
    _mockDb.query.quizzes.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, submitLimit: 1 })
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({ startedAt: existingStartedAt, submitedAt: null })
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, start_only: true } }))
    expect(result.success).toBe(true)
    // 返回已有的 startedAt，不覆盖
    expect(result.data.startedAt).toEqual(existingStartedAt)
    // 不应调用 insert 或 update
    expect(_mockDb.insert).not.toHaveBeenCalled()
    expect(_mockDb.update).not.toHaveBeenCalled()
  })

  it('达到最大提交次数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.quizzes.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, submitLimit: 1 })
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({ submitCount: 1, score: '50' })
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, records: [] } }))
    expect(result.success).toBe(false)
    expect(result.code).toBe('quiz_submit_limit')
  })

  it('超过答题时限提交返回 quiz_time_up（含 30s 宽限）', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.quizzes.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, submitLimit: 3, timeLimit: 60 })
    // 已用 200s > 60s + 30s 宽限 → 判定超时
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({
      submitCount: 0, startedAt: new Date(Date.now() - 200_000), submitedAt: null,
    })
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, records: [] } }))
    expect(result.success).toBe(false)
    expect(result.code).toBe('quiz_time_up')
  })

  it('宽限期内提交不判定超时', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    setupQuizDefs(
      { courseId: 1, cid: 1, timeLimit: 60 },
      [{ courseId: 1, cid: 1, type: 'single', answer: ['A'], point: 100 }],
    )
    // 已用 80s，落在 60s + 30s 宽限内 → 正常判分
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({
      submitCount: 0, startedAt: new Date(Date.now() - 80_000), submitedAt: null,
    })
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({
      body: { course_id: 1, quiz_cid: 1, records: [{ questionCid: 1, rate: 1, point: 100, answer: ['A'] }] },
    }))
    expect(result.success).toBe(true)
    expect(result.data.score).toBe(100)
  })

  it('start_only：进行中记录已超时则重置 startedAt', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    const oldStartedAt = new Date(Date.now() - 200_000)
    _mockDb.query.quizzes.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, submitLimit: 3, timeLimit: 60 })
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({ startedAt: oldStartedAt, submitedAt: null, submitCount: 0 })
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, start_only: true } }))
    expect(result.success).toBe(true)
    expect(result.data.startedAt).not.toEqual(oldStartedAt)
    expect(_mockDb.update).toHaveBeenCalled()
  })

  // 服务端判分辅助：quiz 定义带 questions id 列表，questions.findMany 返回题目定义
  function setupQuizDefs(quizRow: any, questionDefs: any[]) {
    _mockDb.query.quizzes.findFirst = vi.fn().mockResolvedValue({
      submitLimit: 3, submitCount: 0,
      ...quizRow,
      questions: quizRow.questions ?? questionDefs.map(q => q.cid),
    })
    _mockDb.query.questions.findMany = vi.fn().mockResolvedValue(questionDefs)
  }

  it('新记录提交：及格获得 passBonusExp', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    setupQuizDefs(
      { courseId: 1, cid: 1 },
      [
        { courseId: 1, cid: 1, type: 'single', answer: ['A'], point: 50 },
        { courseId: 1, cid: 2, type: 'single', answer: ['B'], point: 50 },
      ],
    )
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue(null)
    // records: 2 题全对（user answer 与 DB answer 相符 → 服务端重算 rate=1）→ totalScore=100 ≥ 60 及格
    const records = [
      { questionCid: 1, rate: 1, point: 50, answer: ['A'] },
      { questionCid: 2, rate: 1, point: 50, answer: ['B'] },
    ]
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, records } }))
    expect(result.success).toBe(true)
    // submitExp(3) + passBonusExp(10) = 13
    expect(result.data.gainedExp).toBe(13)
    expect(result.data.score).toBe(100)
    expect(result.data.isPassed).toBe(true)
    expect(result.data.correctCount).toBe(2)
  })

  it('伪造 rate 无效：服务端按 DB 题目重算', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    setupQuizDefs(
      { courseId: 1, cid: 1 },
      [
        { courseId: 1, cid: 1, type: 'single', answer: ['A'], point: 50 },
        { courseId: 1, cid: 2, type: 'single', answer: ['B'], point: 50 },
      ],
    )
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue(null)
    // 客户端声称 2 题全对 rate=1，但题 2 作答与 DB answer 不符 → 服务端判 0
    const records = [
      { questionCid: 1, rate: 1, point: 50, answer: ['A'] },
      { questionCid: 2, rate: 1, point: 50, answer: ['X'] },
    ]
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, records } }))
    expect(result.success).toBe(true)
    expect(result.data.score).toBe(50)
    expect(result.data.correctCount).toBe(1)
  })

  it('新记录提交：不及格不给 passBonusExp', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    setupQuizDefs(
      { courseId: 1, cid: 1 },
      [
        { courseId: 1, cid: 1, type: 'single', answer: ['A'], point: 30 },
        { courseId: 1, cid: 2, type: 'single', answer: ['C'], point: 30 },
      ],
    )
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue(null)
    // records: 1 题对 1 题错 → totalScore=30 < 60 不及格
    const records = [
      { questionCid: 1, rate: 1, point: 30, answer: ['A'] },
      { questionCid: 2, rate: 0, point: 30, answer: ['B'] },
    ]
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, records } }))
    expect(result.success).toBe(true)
    // 只有 submitExp(3)
    expect(result.data.gainedExp).toBe(3)
    expect(result.data.isPassed).toBe(false)
  })

  it('已有记录更新：取最高分', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    setupQuizDefs(
      { courseId: 1, cid: 1, submitCount: 1 },
      [
        // 题1 全对 50；题2 multiple 半对 25 → 本次 75 < 已有 80
        { courseId: 1, cid: 1, type: 'single', answer: ['A'], point: 50 },
        { courseId: 1, cid: 2, type: 'multiple', answer: ['A', 'B'], point: 50 },
      ],
    )
    // 已有记录 score=80
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({ submitCount: 1, score: '80', startedAt: new Date() })
    const records = [
      { questionCid: 1, rate: 1, point: 50, answer: ['A'] },
      { questionCid: 2, rate: 0.5, point: 50, answer: ['A'] },
    ]
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, records } }))
    expect(result.success).toBe(true)
    expect(result.data.score).toBe(75)
    // 验证 userQuizzes.update 中 score 是最高分 80
    // 注：分数走 addCourseScoreMax（最高分模式），不写 userQuizzes 的 set
    // 找到 set 调用中包含 userQuizzes 字段的那一次
    const setCalls = _mockDb.set.mock.calls.map(c => c[0])
    const userQuizUpdate = setCalls.find((s: any) => 'records' in s || 'submitedAt' in s)
    expect(userQuizUpdate).toBeDefined()
    expect(userQuizUpdate.score).toBe('80')
    // 75 < 80 → 不给经验，gainedExp=0（已存在记录防刷）
    expect(result.data.gainedExp).toBe(0)
    // 走的是 addCourseScoreMax 最高分模式
    expect((globalThis as any).addCourseScoreMax).toHaveBeenCalled()
  })

  it('已有记录更新：分数提高给经验', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    setupQuizDefs(
      { courseId: 1, cid: 1, submitCount: 1 },
      [
        // 题1 全对 40；题2 multiple 半对 50 → 本次 90 > 已有 50
        { courseId: 1, cid: 1, type: 'single', answer: ['A'], point: 40 },
        { courseId: 1, cid: 2, type: 'multiple', answer: ['A', 'B'], point: 100 },
      ],
    )
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({ submitCount: 1, score: '50', startedAt: new Date() })
    const records = [
      { questionCid: 1, rate: 1, point: 40, answer: ['A'] },
      { questionCid: 2, rate: 0.5, point: 100, answer: ['A'] },
    ]
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, records } }))
    expect(result.success).toBe(true)
    expect(result.data.score).toBe(90)
    // 验证 addCourseScoreMax 被调用（最高分模式）
    expect((globalThis as any).addCourseScoreMax).toHaveBeenCalled()
    // 50 < 60 未及格，本次 90 >= 60 及格：gainedExp = submitExp(3) + passBonusExp(10) = 13
    expect(result.data.gainedExp).toBe(13)
  })

  it('已及格的测验再次提交时不发放任何经验（防刷）', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    setupQuizDefs(
      { courseId: 1, cid: 1, submitCount: 1 },
      [
        { courseId: 1, cid: 1, type: 'single', answer: ['A'], point: 40 },
        { courseId: 1, cid: 2, type: 'multiple', answer: ['A', 'B'], point: 100 },
      ],
    )
    // 已有记录 score=80（已及格，80 >= 60）
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({ submitCount: 1, score: '80', startedAt: new Date() })
    // 本次 score=90 > 80 → 分数提高，但已及格过且已有记录：gainedExp=0（防刷）
    const records = [
      { questionCid: 1, rate: 1, point: 40, answer: ['A'] },
      { questionCid: 2, rate: 0.5, point: 100, answer: ['A'] },
    ]
    const handler = (await import('../../server/api/quizzes/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, quiz_cid: 1, records } }))
    expect(result.success).toBe(true)
    // 已及格过 + 已有记录：gainedExp=0（彻底防刷，不发放 submitExp 与 passBonusExp）
    expect(result.data.gainedExp).toBe(0)
  })
})

// ====================== add.post.ts ======================

describe('API: quizzes/add', () => {
  it('未登录（无 teacher/admin 权限）抛错', async () => {
    const handler = (await import('../../server/api/quizzes/add.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/add.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
  })

  it('cid 自增（maxCid+1）', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ cid: 3 }])
    _mockDb.returning = vi.fn().mockResolvedValue([{ courseId: 1, cid: 4, name: 'New Quiz' }])
    const handler = (await import('../../server/api/quizzes/add.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, name: 'New Quiz' } }))
    expect(result.success).toBe(true)
    expect(result.data.cid).toBe(4)
    const valuesArg = _mockDb.values.mock.calls[0][0]
    expect(valuesArg.cid).toBe(4)
    expect(valuesArg.courseId).toBe(1)
  })

  it('无记录时 cid=1', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([])
    _mockDb.returning = vi.fn().mockResolvedValue([{ courseId: 1, cid: 1, name: 'First Quiz' }])
    const handler = (await import('../../server/api/quizzes/add.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, name: 'First Quiz' } }))
    expect(result.success).toBe(true)
    expect(result.data.cid).toBe(1)
  })
})

// ====================== update.post.ts ======================

describe('API: quizzes/update', () => {
  it('未登录（无 teacher/admin 权限）抛错', async () => {
    const handler = (await import('../../server/api/quizzes/update.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, id: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/update.post')).default
    const result = await handler(makeEvent({ body: { id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('缺少 id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/update.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('正常更新：body.id/course_id/cid 被删除', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 1 })
    const handler = (await import('../../server/api/quizzes/update.post')).default
    await handler(makeEvent({ body: { course_id: 1, id: 1, cid: 1, name: 'Updated' } }))
    const setArg = _mockDb.set.mock.calls[0][0]
    expect(setArg).not.toHaveProperty('id')
    expect(setArg).not.toHaveProperty('course_id')
    expect(setArg).not.toHaveProperty('cid')
    expect(setArg.name).toBe('Updated')
  })
})

// ====================== batch.post.ts ======================

describe('API: quizzes/batch', () => {
  it('未登录（无 admin 权限）抛错', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/batch.post')).default
    await expect(handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'delete' } }))).rejects.toThrow()
  })

  it('空 rows 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [], action: 'delete' } }))
    expect(result.success).toBe(false)
  })

  it('无效 action 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'invalid' } }))
    expect(result.success).toBe(false)
  })

  it('delete 操作：软删除', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 1 })
    const handler = (await import('../../server/api/quizzes/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'delete' } }))
    expect(result.success).toBe(true)
    const setArg = _mockDb.set.mock.calls[0][0]
    expect(setArg.deletedAt).toBeInstanceOf(Date)
  })

  it('remove 操作：硬删除', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 1 })
    const handler = (await import('../../server/api/quizzes/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'remove' } }))
    expect(result.success).toBe(true)
    expect(_mockDb.delete).toHaveBeenCalled()
  })

  it('restore 操作：恢复', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 1 })
    const handler = (await import('../../server/api/quizzes/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'restore' } }))
    expect(result.success).toBe(true)
    const setArg = _mockDb.set.mock.calls[0][0]
    expect(setArg.deletedAt).toBeNull()
  })
})

// ====================== record.get.ts ======================

describe('API: quizzes/record', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/quizzes/record.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1', cid: '1' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/record.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('返回用户测验记录', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.userQuizzes.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, quizCid: 1, score: '85', submitCount: 1 })
    const handler = (await import('../../server/api/quizzes/record.get')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.score).toBe('85')
  })
})

// ====================== records.get.ts ======================

describe('API: quizzes/records', () => {
  it('未登录（无 teacher/admin 权限）抛错', async () => {
    const handler = (await import('../../server/api/quizzes/records.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1', cid: '1' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/quizzes/records.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('无 defaultClass 返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ defaultClass: null }])
    const handler = (await import('../../server/api/quizzes/records.get')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('有学生记录返回列表', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ defaultClass: { id: 10 } }])
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 100, isTeacher: false },
      { id: 101, isTeacher: false },
      { id: 200, isTeacher: true },
    ])
    _mockDb.query.userQuizzes.findMany = vi.fn().mockResolvedValue([
      { userId: 100, courseId: 1, quizCid: 1, score: '80' },
      { userId: 101, courseId: 1, quizCid: 1, score: '90' },
    ])
    const handler = (await import('../../server/api/quizzes/records.get')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].userId).toBe(100)
  })
})
