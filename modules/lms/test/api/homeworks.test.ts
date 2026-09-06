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
}
const _mockSchema = {
  homeworks: {
    id: 'id', chapterId: 'chapterId', title: 'title', content: 'content',
    deadline: 'deadline', maxScore: 'maxScore', userId: 'userId', deletedAt: 'deletedAt',
  },
  homeworkRecords: { id: 'id', homeworkId: 'homeworkId', userId: 'userId', content: 'content', score: 'score', status: 'status' },
  homeworkFiles: { id: 'id', recordId: 'recordId', fileId: 'fileId' },
  files: { id: 'id', name: 'name', url: 'url' },
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
