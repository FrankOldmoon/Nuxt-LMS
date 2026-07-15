/**
 * Chapters API endpoint test (classes.get chapter class open control)
 * @see modules/lms/server/api/chapters/classes.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  chapters: { id: 'id', courseId: 'courseId', deletedAt: 'deletedAt' },
  classes: { id: 'id', name: 'name' },
  classChapters: { classId: 'classId', chapterId: 'chapterId', open: 'open' },
  courses: { id: 'id', name: 'name' },
  userCourses: { userId: 'userId', courseId: 'courseId', isTeacher: 'isTeacher' },
  users: { id: 'id', username: 'username' },
  configs: { id: 'id', value: 'value' },
  tokens: { name: 'name', userId: 'userId', deletedAt: 'deletedAt' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import {
  resetAllStubs,
  setMockAuthState,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.innerJoin = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
})

function makeEvent(opts: { query?: Record<string, any> } = {}) {
  return { cookies: {}, body: undefined, query: opts.query || {} } as any
}

describe('API: chapters/classes.get', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/chapters/classes.get')).default
    await expect(handler(makeEvent({ query: { chapterId: '1' } }))).rejects.toThrow()
  })

  it('缺少 chapterId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/chapters/classes.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/chapterId/)
  })

  it('章节不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([])
    const handler = (await import('../../server/api/chapters/classes.get')).default
    const result = await handler(makeEvent({ query: { chapterId: '999' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/不存在/)
  })

  it('admin 返回班级开放状态', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    // First select + limit: chapter lookup
    // Second select: all classes
    // Third select: classChapters
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ courseId: 100 }])
    let selectCount = 0
    _mockDb.select = vi.fn(() => {
      selectCount++
      if (selectCount === 1) {
        return { from: () => ({ where: () => ({ limit: () => Promise.resolve([{ courseId: 100 }]) }) }) }
      }
      if (selectCount === 2) {
        return { from: () => Promise.resolve([{ id: 1, name: 'Class A' }, { id: 2, name: 'Class B' }]) }
      }
      return { from: () => ({ where: () => Promise.resolve([{ classId: 1, open: true }]) }) }
    }) as any
    const handler = (await import('../../server/api/chapters/classes.get')).default
    const result = await handler(makeEvent({ query: { chapterId: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ classId: 1, name: 'Class A', open: true })
    expect(result.data[1]).toEqual({ classId: 2, name: 'Class B', open: false })
  })
})
