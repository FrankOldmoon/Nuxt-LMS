/**
 * LMS Questions API 端点测试
 * @see modules/lms/server/api/questions/*.ts
 *
 * 包含 Bug 6 回归（update.post.ts 缺少 delete body.id）
 * 包含 Bug 7 回归（submit.post.ts 缺少 firstRight 更新）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    userQuestions: { findFirst: vi.fn(), findMany: vi.fn() },
    questions: { findFirst: vi.fn(), findMany: vi.fn() },
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
  questions: { courseId: 'courseId', cid: 'cid', answer: 'answer', deletedAt: 'deletedAt', name: 'name', type: 'type' },
  userQuestions: { userId: 'userId', courseId: 'courseId', questionCid: 'questionCid', score: 'score', wrongCount: 'wrongCount', submitCount: 'submitCount', firstRight: 'firstRight', updatedAt: 'updatedAt' },
  users: { id: 'id', defaultClass: 'defaultClass' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // 默认链式调用重置
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
    userQuestions: { findFirst: vi.fn(), findMany: vi.fn() },
    questions: { findFirst: vi.fn(), findMany: vi.fn() },
  }
  // LMS auto-import stubs（unit-shared.ts 未提供）
  ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({
    question: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10, maxSubmitCount: 999 },
    quiz: { submitExp: 3, passScore: 60, passBonusExp: 10 },
  })
  ;(globalThis as any).addChapterScore = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).addCourseScore = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).checkAndAwardMedals = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([])
})

function makeEvent(opts: { query?: Record<string, any>; body?: any; cookies?: Record<string, any> } = {}) {
  return { cookies: opts.cookies || {}, query: opts.query || {}, body: opts.body } as any
}

/**
 * 创建 thenable 链式 mock：await chain 可直接获得 result，
 * 同时 chain 上的 orderBy/limit/offset/where 等方法返回 chain 自身（支持继续链式调用）。
 * 用于 wrong-list.get.ts 中 `db.select().from().where()` (where 终端) 和
 * `db.select().from().where().orderBy().limit().offset()` (offset 终端) 共享 where 的场景。
 */
function chainThenable(result: any) {
  const chain: any = {
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    where: vi.fn(() => chain),
    from: vi.fn(() => chain),
  }
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  return chain
}

// ====================== show.ts ======================

describe('API: questions/show', () => {
  it('缺少 course_id 参数返回失败', async () => {
    const handler = (await import('../../server/api/questions/show')).default
    const result = await handler(makeEvent({ query: { cid: '1' } }))
    expect(result.success).toBe(false)
  })

  it('缺少 cid 参数返回失败', async () => {
    const handler = (await import('../../server/api/questions/show')).default
    const result = await handler(makeEvent({ query: { course_id: '1' } }))
    expect(result.success).toBe(false)
  })

  it('返回题目数据', async () => {
    _mockDb.query.questions.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, name: 'Q1', answer: ['A'] })
    const handler = (await import('../../server/api/questions/show')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Q1')
  })

  it('学生/未登录视角：answer 与 explanation 被剥离', async () => {
    setMockAuthState(null)
    _mockDb.query.questions.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, answer: ['A', 'B'], explanation: { type: 'doc' } })
    const handler = (await import('../../server/api/questions/show')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.answer).toBeUndefined()
    expect(result.data.explanation).toBeUndefined()
  })

  it('学生视角：composite 子题 answer 被剥离', async () => {
    setMockAuthState({ id: 2, username: 'stu', roles: ['student'], permissions: [] })
    _mockDb.query.questions.findFirst = vi.fn().mockResolvedValue({
      courseId: 1, cid: 1, type: 'composite',
      answer: [],
      content: [{ type: 'single', answer: [0] }, { type: 'judge', answer: [1] }],
    })
    const handler = (await import('../../server/api/questions/show')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.content[0].answer).toBeUndefined()
    expect(result.data.content[1].answer).toBeUndefined()
  })

  it('教师视角：answer/explanation 明文返回（编辑回填依赖）', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.query.questions.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, answer: ['A', 'B'], explanation: { type: 'doc' } })
    const handler = (await import('../../server/api/questions/show')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.answer).toEqual(['A', 'B'])
    expect(result.data.explanation).toEqual({ type: 'doc' })
  })
})

// ====================== submit.post.ts ======================

describe('API: questions/submit', () => {
  // 服务端判分：submit 会从 questions 表加载题目定义（type/answer/point）
  beforeEach(() => {
    // 默认题目：单选，answer=['A']，point=10 → user_answer ['A'] rate=1，['B'] rate=0
    _mockDb.query.questions.findFirst = vi.fn().mockResolvedValue({
      courseId: 1, cid: 1, type: 'single', answer: ['A'], point: 10,
    })
  })

  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/questions/submit.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, question_cid: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/questions/submit.post')).default
    const result = await handler(makeEvent({ body: { question_cid: 1 } }))
    expect(result.success).toBe(false)
  })

  it('缺少 question_cid 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/questions/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('题目不存在时拒绝计分', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.questions.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/questions/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, question_cid: 999, correct_rate: 1, point: 999, user_answer: ['A'] } }))
    expect(result.success).toBe(false)
  })

  it('伪造 correct_rate/point 无效：服务端按 DB 题目判分', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.userQuestions.findFirst = vi.fn().mockResolvedValue(null)
    _mockDb.returning = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/questions/submit.post')).default
    // 客户端声称 rate=1 point=9999，但 user_answer ['B'] 与 DB answer ['A'] 不符 → 判错
    const result = await handler(makeEvent({ body: { course_id: 1, question_cid: 1, correct_rate: 1, point: 9999, user_answer: ['B'] } }))
    expect(result.success).toBe(true)
    expect(result.data.score).toBe(0)
    // 答对时 point 取 DB 值 10，而非客户端 9999
    const result2 = await handler(makeEvent({ body: { course_id: 1, question_cid: 1, correct_rate: 1, point: 9999, user_answer: ['A'] } }))
    expect(result2.success).toBe(true)
    expect(result2.data.score).toBe(10)
  })

  it('新记录：插入并返回经验值和分数', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.userQuestions.findFirst = vi.fn().mockResolvedValue(null)
    _mockDb.returning = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/questions/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, question_cid: 1, chapter_id: 1, correct_rate: 1, point: 10, user_answer: ['A'] } }))
    expect(result.success).toBe(true)
    // 答对：submitExp(2) + correctBonusExp(5) + firstCorrectBonusExp(10) = 17
    expect(result.data.gainedExp).toBe(17)
    expect(result.data.score).toBe(10)
    // 验证 insert 被调用
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('已答对的题目再次提交不给经验', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.userQuestions.findFirst = vi.fn().mockResolvedValue({ firstRight: true, score: '10', submitCount: 1, wrongCount: 0 })
    _mockDb.returning = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/questions/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, question_cid: 1, correct_rate: 1, point: 10, user_answer: ['A'] } }))
    expect(result.success).toBe(true)
    // 已 firstRight=true，再次答对不再给任何经验
    expect(result.data.gainedExp).toBe(0)
    // 验证 update 被调用，insert 未被调用
    expect(_mockDb.update).toHaveBeenCalled()
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })

  it('Bug 7 回归：已有记录更新时 firstRight 字段被更新', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.userQuestions.findFirst = vi.fn().mockResolvedValue({ firstRight: false, score: '0', submitCount: 0, wrongCount: 1 })
    _mockDb.returning = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/questions/submit.post')).default
    await handler(makeEvent({ body: { course_id: 1, question_cid: 1, correct_rate: 1, point: 10, user_answer: ['A'] } }))
    // 验证 update.set 包含 firstRight
    const setArg = _mockDb.set.mock.calls[0][0]
    expect(setArg).toHaveProperty('firstRight')
    expect(setArg.firstRight).toBe(true) // existing.firstRight(false) || isCorrect(true) = true
  })

  it('答错时不给 correctBonusExp 和 firstCorrectBonusExp', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.userQuestions.findFirst = vi.fn().mockResolvedValue(null)
    _mockDb.returning = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/questions/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, question_cid: 1, correct_rate: 0, point: 10, user_answer: ['B'] } }))
    expect(result.success).toBe(true)
    // 答错：只有 submitExp(2)
    expect(result.data.gainedExp).toBe(2)
    expect(result.data.score).toBe(0)
  })

  it('超过 maxSubmitCount 时经验为 0', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({
      question: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10, maxSubmitCount: 1 },
    })
    _mockDb.query.userQuestions.findFirst = vi.fn().mockResolvedValue({ firstRight: false, score: '5', submitCount: 1, wrongCount: 0 })
    _mockDb.returning = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/questions/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, question_cid: 1, correct_rate: 1, point: 10, user_answer: ['A'] } }))
    expect(result.success).toBe(true)
    // newSubmitCount=2 > maxSubmitCount=1 → gainedExp=0
    expect(result.data.gainedExp).toBe(0)
  })

  it('分数增量只取比上次更好的（scoreDelta >= 0）', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    // 多选题：answer=['A','B']，user_answer ['A'] → matching=1/2 → 服务端 rate=0.5
    _mockDb.query.questions.findFirst = vi.fn().mockResolvedValue({
      courseId: 1, cid: 1, type: 'multiple', answer: ['A', 'B'], point: 10,
    })
    _mockDb.query.userQuestions.findFirst = vi.fn().mockResolvedValue({ firstRight: true, score: '8', submitCount: 1, wrongCount: 0 })
    _mockDb.returning = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/questions/submit.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, question_cid: 1, correct_rate: 0.5, point: 10, user_answer: ['A'] } }))
    expect(result.success).toBe(true)
    // 本次 score=5 < prevScore=8 → scoreDelta=0
    expect(result.data.scoreDelta).toBe(0)
    expect(result.data.score).toBe(5)
  })
})

// ====================== add.post.ts ======================

describe('API: questions/add', () => {
  it('未登录（无 teacher/admin 权限）抛错', async () => {
    const handler = (await import('../../server/api/questions/add.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/questions/add.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
  })

  it('cid 自增（maxCid+1）', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ cid: 5 }])
    _mockDb.returning = vi.fn().mockResolvedValue([{ courseId: 1, cid: 6, name: 'New Q' }])
    const handler = (await import('../../server/api/questions/add.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, name: 'New Q' } }))
    expect(result.success).toBe(true)
    expect(result.data.cid).toBe(6)
    // 验证 insert.values 被调用时包含 cid: 6
    const valuesArg = _mockDb.values.mock.calls[0][0]
    expect(valuesArg.cid).toBe(6)
    expect(valuesArg.courseId).toBe(1)
  })

  it('无记录时 cid=1', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([])
    _mockDb.returning = vi.fn().mockResolvedValue([{ courseId: 1, cid: 1, name: 'First Q' }])
    const handler = (await import('../../server/api/questions/add.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, name: 'First Q' } }))
    expect(result.success).toBe(true)
    expect(result.data.cid).toBe(1)
  })
})

// ====================== update.post.ts ======================

describe('API: questions/update', () => {
  it('未登录（无 teacher/admin 权限）抛错', async () => {
    const handler = (await import('../../server/api/questions/update.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, id: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/questions/update.post')).default
    const result = await handler(makeEvent({ body: { id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('缺少 id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/questions/update.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('Bug 6 回归：update 时 body.id/course_id/cid 被删除，不传入 db.update.set', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 1 })
    const handler = (await import('../../server/api/questions/update.post')).default
    await handler(makeEvent({ body: { course_id: 1, id: 1, cid: 1, title: 'updated', name: 'New Name' } }))
    // 验证 set 被调用时参数不含 id/course_id/cid
    const setArg = _mockDb.set.mock.calls[0][0]
    expect(setArg).not.toHaveProperty('id')
    expect(setArg).not.toHaveProperty('course_id')
    expect(setArg).not.toHaveProperty('cid')
    expect(setArg.title).toBe('updated')
    expect(setArg.name).toBe('New Name')
  })

  it('正常更新返回成功', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 1 })
    const handler = (await import('../../server/api/questions/update.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, id: 1, title: 'updated' } }))
    expect(result.success).toBe(true)
  })
})

// ====================== batch.post.ts ======================

describe('API: questions/batch', () => {
  it('未登录（无 admin 权限）抛错', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/questions/batch.post')).default
    await expect(handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'delete' } }))).rejects.toThrow()
  })

  it('空 rows 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/questions/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [], action: 'delete' } }))
    expect(result.success).toBe(false)
  })

  it('无效 action 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/questions/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'invalid' } }))
    expect(result.success).toBe(false)
  })

  it('delete 操作：软删除（设置 deletedAt）', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 2 })
    const handler = (await import('../../server/api/questions/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }, { courseId: 1, cid: 2 }], action: 'delete' } }))
    expect(result.success).toBe(true)
    expect(result.data.count).toBe(2)
    // 验证 update.set 被调用且 deletedAt 是 Date
    const setArg = _mockDb.set.mock.calls[0][0]
    expect(setArg.deletedAt).toBeInstanceOf(Date)
  })

  it('remove 操作：硬删除', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 1 })
    const handler = (await import('../../server/api/questions/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'remove' } }))
    expect(result.success).toBe(true)
    // 验证 delete 被调用
    expect(_mockDb.delete).toHaveBeenCalled()
  })

  it('restore 操作：恢复（deletedAt = null）', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue({ rowCount: 1 })
    const handler = (await import('../../server/api/questions/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'restore' } }))
    expect(result.success).toBe(true)
    // 验证 update.set 被调用且 deletedAt 是 null
    const setArg = _mockDb.set.mock.calls[0][0]
    expect(setArg.deletedAt).toBeNull()
  })
})

// ====================== record.get.ts ======================

describe('API: questions/record', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/questions/record.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1', cid: '1' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/questions/record.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('返回用户题目记录', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.query.userQuestions.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, questionCid: 1, score: '80', submitCount: 2 })
    const handler = (await import('../../server/api/questions/record.get')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.score).toBe('80')
  })
})

// ====================== records.get.ts ======================

describe('API: questions/records', () => {
  it('未登录（无 teacher/admin 权限）抛错', async () => {
    const handler = (await import('../../server/api/questions/records.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1', cid: '1' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/questions/records.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('无 defaultClass 返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ defaultClass: null }])
    const handler = (await import('../../server/api/questions/records.get')).default
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
    _mockDb.query.userQuestions.findMany = vi.fn().mockResolvedValue([
      { userId: 100, courseId: 1, questionCid: 1, score: '80' },
      { userId: 101, courseId: 1, questionCid: 1, score: '90' },
    ])
    const handler = (await import('../../server/api/questions/records.get')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].userId).toBe(100)
  })

  it('无学生提交记录返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ defaultClass: { id: 10 } }])
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 100, isTeacher: false },
    ])
    _mockDb.query.userQuestions.findMany = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/questions/records.get')).default
    const result = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})

// ====================== wrong-list.get.ts ======================

describe('API: questions/wrong-list', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/questions/wrong-list.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1' } }))).rejects.toThrow()
  })

  it('无错题返回空列表', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    // count 查询：db.select().from().where() → where 终端，返回 thenable 解析为 [{count:0}]
    // wrongRows 查询：db.select().from().where().orderBy().limit().offset() → offset 终端，返回 thenable 解析为 []
    _mockDb.select = vi.fn()
      .mockReturnValueOnce(chainThenable([{ count: 0 }]))
      .mockReturnValueOnce(chainThenable([]))
    const handler = (await import('../../server/api/questions/wrong-list.get')).default
    const result = await handler(makeEvent({ query: { course_id: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data.items).toEqual([])
    expect(result.data.total).toBe(0)
  })

  it('返回分页错题列表', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    const wrongRows = [
      { courseId: 1, questionCid: 1, wrongCount: 2, submitCount: 3, firstRight: false, updatedAt: new Date() },
    ]
    // 第一次 select → count 查询（where 终端）
    _mockDb.select = vi.fn()
      .mockReturnValueOnce(chainThenable([{ count: 1 }]))
      .mockReturnValueOnce(chainThenable(wrongRows))
    // query.questions.findMany 返回题目详情
    _mockDb.query.questions.findMany = vi.fn().mockResolvedValue([
      { courseId: 1, cid: 1, name: 'Q1', type: 'choice' },
    ])
    const handler = (await import('../../server/api/questions/wrong-list.get')).default
    const result = await handler(makeEvent({ query: { course_id: '1', page: '1', pageSize: '10' } }))
    expect(result.success).toBe(true)
    expect(result.data.total).toBe(1)
    expect(result.data.items).toHaveLength(1)
    expect(result.data.items[0].name).toBe('Q1')
    expect(result.data.items[0].wrongCount).toBe(2)
  })

  it('分页参数默认值处理', async () => {
    setMockAuthState({ id: 1, username: 'student', roles: ['student'], permissions: [] })
    _mockDb.select = vi.fn()
      .mockReturnValueOnce(chainThenable([{ count: 0 }]))
      .mockReturnValueOnce(chainThenable([]))
    const handler = (await import('../../server/api/questions/wrong-list.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(true)
    expect(result.data.page).toBe(1)
    expect(result.data.pageSize).toBe(10)
  })
})
