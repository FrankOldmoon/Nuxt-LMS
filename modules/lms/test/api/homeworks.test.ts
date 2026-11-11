/**
 * Homework API 端点测试
 * @see modules/lms/server/api/homeworks/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
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
  query: { userHomeworks: { findFirst: vi.fn() }, homeworks: { findFirst: vi.fn() } },
}
const _mockSchema = {
  homeworks: {
    id: 'id', cid: 'cid', courseId: 'courseId', chapterId: 'chapterId', title: 'title', content: 'content',
    deadline: 'deadline', maxScore: 'maxScore', userId: 'userId', deletedAt: 'deletedAt',
  },
  homeworkRecords: { id: 'id', homeworkId: 'homeworkId', userId: 'userId', content: 'content', score: 'score', status: 'status' },
  homeworkFiles: { id: 'id', recordId: 'recordId', fileId: 'fileId' },
  files: { id: 'id', name: 'name', url: 'url' },
  users: { id: 'id', username: 'username', name: 'name' },
  userHomeworks: { userId: 'userId', courseId: 'courseId', homeworkCid: 'homeworkCid', files: 'files' },
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

describe('API: homeworks/submit.post', () => {
  beforeEach(resetChain)

  it('未登录不能提交', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/homeworks/submit.post')).default
    await expect(handler(makeEvent({ body: { homeworkId: 1, content: 'X' } }))).rejects.toThrow()
  })

  it('登录用户提交作业', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, homeworkId: 1, userId: 1, content: 'X' }])
    const handler = (await import('../../server/api/homeworks/submit.post')).default
    const result = await handler(makeEvent({ body: { homeworkId: 1, content: 'My Answer' } }))
    expect(result).toBeDefined()
  })
})

describe('API: homeworks/delete-file.post', () => {
  beforeEach(() => {
    resetChain()
    _mockDb.query.userHomeworks.findFirst.mockReset()
    _mockDb.query.homeworks.findFirst.mockReset().mockResolvedValue({ cid: 3 })
    _mockDb.returning = vi.fn().mockResolvedValue([{ files: [] }])
    ;(globalThis as any).isCourseStaff = async () => true
    setMockAuthState({ id: 9, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] })
  })

  it('教师从对应提交中移除指定附件并保留其他附件', async () => {
    const files = ['/a.pdf', { url: '/b.pdf', name: 'b.pdf' }]
    _mockDb.query.userHomeworks.findFirst.mockResolvedValue({ files })
    _mockDb.returning = vi.fn().mockResolvedValue([{ files: [files[1]] }])
    const handler = (await import('../../server/api/homeworks/delete-file.post')).default
    const result = await handler(makeEvent({ body: {
      course_id: 2, homework_cid: 3, user_id: 4, file_index: 0, file_url: '/a.pdf',
    } }))
    expect(_mockDb.set).toHaveBeenCalledWith({ files: [files[1]] })
    expect(result).toBeDefined()
  })

  it('附件 URL 与当前提交不匹配时不更新', async () => {
    _mockDb.query.userHomeworks.findFirst.mockResolvedValue({ files: ['/current.pdf'] })
    const handler = (await import('../../server/api/homeworks/delete-file.post')).default
    await handler(makeEvent({ body: {
      course_id: 2, homework_cid: 3, user_id: 4, file_index: 0, file_url: '/stale.pdf',
    } }))
    expect(_mockDb.update).not.toHaveBeenCalled()
  })

  it('非教师不能删除附件', async () => {
    setMockAuthState({ id: 4, username: 'student', name: 'Student', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/delete-file.post')).default
    await expect(handler(makeEvent({ body: {
      course_id: 2, homework_cid: 3, user_id: 4, file_index: 0, file_url: '/a.pdf',
    } }))).rejects.toThrow()
    expect(_mockDb.query.userHomeworks.findFirst).not.toHaveBeenCalled()
  })
})

describe('API: homeworks/score.post', () => {
  beforeEach(resetChain)

  it('未登录不能评分', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/homeworks/score.post')).default
    await expect(handler(makeEvent({ body: { recordId: 1, score: 90 } }))).rejects.toThrow()
  })

  it('非教师不能评分', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/score.post')).default
    // 可能返回 403 或 401
    await expect(handler(makeEvent({ body: { recordId: 1, score: 90 } }))).rejects.toThrow()
  })
})

describe('API: homeworks/record.get', () => {
  beforeEach(resetChain)

  it('未登录不能查看', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/homeworks/record.get')).default
    await expect(handler(makeEvent({ query: { homeworkId: 1 } }))).rejects.toThrow()
  })

  it('登录用户查询自己的记录', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, homeworkId: 1, userId: 1, content: 'X', score: 90 }])
    const handler = (await import('../../server/api/homeworks/record.get')).default
    const result = await handler(makeEvent({ query: { homeworkId: 1 } }))
    expect(result).toBeDefined()
  })
})

describe('API: homeworks/records.get', () => {
  beforeEach(resetChain)

  it('未登录不能查看', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/homeworks/records.get')).default
    await expect(handler(makeEvent({ query: { homeworkId: 1 } }))).rejects.toThrow()
  })
})
