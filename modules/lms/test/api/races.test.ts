/**
 * Races API 端点测试
 * @see modules/lms/server/api/races/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    classRaces: { findFirst: vi.fn() },
    races: { findFirst: vi.fn(), findMany: vi.fn() },
    raceParticipants: { findMany: vi.fn() },
    userRaces: { findFirst: vi.fn() },
    chapters: { findFirst: vi.fn() },
    questions: { findFirst: vi.fn(), findMany: vi.fn() },
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
  races: {
    id: 'id', cid: 'cid', courseId: 'courseId', chapterId: 'chapterId', title: 'title', description: 'description',
    startTime: 'startTime', endTime: 'endTime', status: 'status', maxParticipants: 'maxParticipants',
    deletedAt: 'deletedAt',
  },
  classRaces: {
    classId: 'classId', courseId: 'courseId', raceCid: 'raceCid', status: 'status',
  },
  raceParticipants: { raceId: 'raceId', userId: 'userId', score: 'score', finishedAt: 'finishedAt' },
  userRaces: { userId: 'userId', courseId: 'courseId', raceCid: 'raceCid', score: 'score' },
  chapters: { id: 'id', courseId: 'courseId' },
  questions: { courseId: 'courseId', cid: 'cid' },
  users: { id: 'id', username: 'username', name: 'name' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
    // 本文件的教师场景均假定为该课程的任课教师（requireCourseTeacher 守卫通过）
  ;(globalThis as any).isCourseTeacher = async () => true
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

describe('API: races/state.get', () => {
  beforeEach(resetChain)

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/races/state.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('登录后获取 race 状态', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.classRaces.findFirst).mockResolvedValue({
      classId: 1, courseId: 1, raceCid: 1, status: 'active',
    } as any)
    const handler = (await import('../../server/api/races/state.get')).default
    const result = await handler(makeEvent({ query: { class_id: 1, course_id: 1, race_cid: 1 } }))
    expect(result.success).toBe(true)
  })
})

describe('API: races/state.post', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/races/state.post')).default
    await expect(handler(makeEvent({ body: { raceId: 1, status: 'finished' } }))).rejects.toThrow()
  })
})

describe('API: races/submit.post', () => {
  beforeEach(resetChain)

  it('未登录不能提交', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/races/submit.post')).default
    await expect(handler(makeEvent({ body: { raceId: 1, score: 100 } }))).rejects.toThrow()
  })

  /** 竞赛提交公共 stub：课程 1 / 竞赛 cid 10 / 章节分 8 */
  function stubSubmit(opts: { existing?: any; chapter?: any } = {}) {
    ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({
      race: { participateExp: 5, chapterScore: 8 },
    })
    ;(globalThis as any).addChapterScore = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as any).addCourseScore = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as any).addCourseScoreMax = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as any).checkAndAwardMedals = vi.fn().mockResolvedValue(undefined)
    _mockDb.query.races.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 10, questionIds: [1] })
    _mockDb.query.userRaces.findFirst = vi.fn().mockResolvedValue(opts.existing ?? null)
    _mockDb.query.questions.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.chapters.findFirst = vi.fn().mockResolvedValue(opts.chapter ?? null)
    _mockDb.update = vi.fn().mockReturnThis()
    _mockDb.set = vi.fn().mockReturnThis()
    _mockDb.where = vi.fn().mockResolvedValue(undefined)
    _mockDb.insert = vi.fn().mockReturnThis()
    _mockDb.values = vi.fn().mockResolvedValue(undefined)
  }

  it('首次提交：章节分发放一次', async () => {
    setMockAuthState({ id: 1, username: 'stu', roles: ['student'], permissions: [] })
    stubSubmit({ chapter: { id: 5, courseId: 1 } })
    const handler = (await import('../../server/api/races/submit.post')).default
    const result = await handler(makeEvent({
      body: { course_id: 1, race_cid: 10, chapter_id: 5, records: [] },
    }))
    expect(result.success).toBe(true)
    expect(_mockDb.query.chapters.findFirst).toHaveBeenCalled()
    expect((globalThis as any).addChapterScore).toHaveBeenCalledWith(1, 5, 8)
  })

  it('重复提交：不再发放章节分（防循环提交刷分）', async () => {
    setMockAuthState({ id: 1, username: 'stu', roles: ['student'], permissions: [] })
    stubSubmit({
      existing: { userId: 1, courseId: 1, raceCid: 10, score: '5', records: [] },
      chapter: { id: 5, courseId: 1 },
    })
    const handler = (await import('../../server/api/races/submit.post')).default
    const result = await handler(makeEvent({
      body: { course_id: 1, race_cid: 10, chapter_id: 5, records: [] },
    }))
    expect(result.success).toBe(true)
    expect((globalThis as any).addChapterScore).not.toHaveBeenCalled()
  })

  it('chapter_id 不属于本课程：不发放章节分（防跨课程注入）', async () => {
    setMockAuthState({ id: 1, username: 'stu', roles: ['student'], permissions: [] })
    stubSubmit({ chapter: null }) // 查无该课程下的章节
    const handler = (await import('../../server/api/races/submit.post')).default
    const result = await handler(makeEvent({
      body: { course_id: 1, race_cid: 10, chapter_id: 999, records: [] },
    }))
    expect(result.success).toBe(true)
    expect((globalThis as any).addChapterScore).not.toHaveBeenCalled()
  })
})

// ====================== races/add.post ======================

describe('API: races/add.post', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/races/add.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/races/add.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
  })

  it('教师成功新增竞赛（自动分配 cid）', async () => {
    setMockAuthState({ id: 1, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] })
    // maxCid 查询返回 [{cid: 5}]
    _mockDb.limit = vi.fn().mockResolvedValue([{ cid: 5 }])
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 10, cid: 6, courseId: 1, title: 'Race1' }])
    const handler = (await import('../../server/api/races/add.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, title: 'Race1' } }))
    expect(result.success).toBe(true)
    expect(result.data.cid).toBe(6)
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('无已有 cid 时从 1 开始', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([])
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, cid: 1, courseId: 1 }])
    const handler = (await import('../../server/api/races/add.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, title: 'First' } }))
    expect(result.success).toBe(true)
    expect(result.data.cid).toBe(1)
  })
})

// ====================== races/batch.post ======================

describe('API: races/batch.post', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/races/batch.post')).default
    await expect(handler(makeEvent({ body: { rows: [], action: 'delete' } }))).rejects.toThrow()
  })

  it('rows 为空返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/races/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [], action: 'delete' } }))
    expect(result.success).toBe(false)
  })

  it('无效 action 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/races/batch.post')).default
    const result = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'invalid' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/action/)
  })

  it('delete 操作软删除', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/races/batch.post')).default
    const result = await handler(makeEvent({
      body: { rows: [{ courseId: 1, cid: 1 }, { courseId: 1, cid: 2 }], action: 'delete' },
    }))
    expect(result.success).toBe(true)
    expect(result.data.count).toBe(2)
    expect(_mockDb.update).toHaveBeenCalled()
  })

  it('remove 操作物理删除', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/races/batch.post')).default
    const result = await handler(makeEvent({
      body: { rows: [{ courseId: 1, cid: 1 }], action: 'remove' },
    }))
    expect(result.success).toBe(true)
    expect(_mockDb.delete).toHaveBeenCalled()
  })

  it('restore 操作恢复', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/races/batch.post')).default
    const result = await handler(makeEvent({
      body: { rows: [{ courseId: 1, cid: 1 }], action: 'restore' },
    }))
    expect(result.success).toBe(true)
    expect(_mockDb.update).toHaveBeenCalled()
  })
})

// ====================== races/update.post ======================

describe('API: races/update.post', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/races/update.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, id: 1 } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/races/update.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('教师成功更新竞赛', async () => {
    setMockAuthState({ id: 1, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/races/update.post')).default
    const result = await handler(makeEvent({ body: { course_id: 1, id: 1, title: 'Updated' } }))
    expect(result.success).toBe(true)
    expect(_mockDb.update).toHaveBeenCalled()
  })
})
