/**
 * Announcements API 端点测试
 * @see modules/lms/server/api/announcements/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    announcements: { findFirst: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  announcements: {
    id: 'id', courseId: 'courseId', classId: 'classId', name: 'name', title: 'title',
    content: 'content', authorId: 'authorId', createdAt: 'createdAt', updatedAt: 'updatedAt',
  },
  classes: { id: 'id', name: 'name' },
  users: { id: 'id', classId: 'classId' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// Mock utils/lms so isCourseTeacher is predictable
vi.mock('../../../base/server/utils/lms', () => ({
  isCourseTeacher: async (_userId: number, _courseId: number) => false,
}))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

function makeEvent(opts: { query?: Record<string, any>; body?: any } = {}) {
  return { cookies: {}, query: opts.query || {}, body: opts.body } as any
}

function resetChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
  _mockDb.query.announcements.findFirst = vi.fn()
}

describe('API: announcements/list.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/announcements/list.get')).default
    await expect(handler(makeEvent({ query: { courseId: 1 } }))).rejects.toThrow()
  })

  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/announcements/list.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('学生：返回自己班级或全员的公告', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ classId: 5 }])
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 1, courseId: 1, classId: null, title: '全员公告' },
      { id: 2, courseId: 1, classId: 5, title: '本班公告' },
    ])
    const handler = (await import('../../server/api/announcements/list.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(true)
  })

  it('管理员：返回所有公告', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 1, courseId: 1, classId: 1, title: '班级1' },
      { id: 2, courseId: 1, classId: 2, title: '班级2' },
    ])
    const handler = (await import('../../server/api/announcements/list.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(true)
  })
})

describe('API: announcements/add.post', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/announcements/add.post')).default
    await expect(handler(makeEvent({ body: { courseId: 1, name: 'X' } }))).rejects.toThrow()
  })

  it('登录后创建公告', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, courseId: 1, name: 'New' }])
    const handler = (await import('../../server/api/announcements/add.post')).default
    const result = await handler(makeEvent({ body: { courseId: 1, name: 'New', content: 'Body' } }))
    expect(result.success).toBe(true)
  })

  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/announcements/add.post')).default
    const result = await handler(makeEvent({ body: { name: 'X' } }))
    expect(result.success).toBe(false)
  })

  it('缺少 name 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/announcements/add.post')).default
    const result = await handler(makeEvent({ body: { courseId: 1 } }))
    expect(result.success).toBe(false)
  })

  it('observer 只读：不能创建公告', async () => {
    setMockAuthState({ id: 9, username: 'observer', roles: ['observer'], permissions: [] })
    const handler = (await import('../../server/api/announcements/add.post')).default
    const result = await handler(makeEvent({ body: { courseId: 1, name: 'X', content: 'Body' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toContain('仅教师及以上')
  })

  it('observer 误挂 teacher 角色也不能创建公告', async () => {
    setMockAuthState({ id: 9, username: 'observer', roles: ['observer', 'teacher'], permissions: [] })
    const handler = (await import('../../server/api/announcements/add.post')).default
    const result = await handler(makeEvent({ body: { courseId: 1, name: 'X', content: 'Body' } }))
    expect(result.success).toBe(false)
  })
})

describe('API: announcements/delete.post', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/announcements/delete.post')).default
    await expect(handler(makeEvent({ body: { id: 1 } }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/announcements/delete.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
  })

  it('公告不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.announcements.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/announcements/delete.post')).default
    const result = await handler(makeEvent({ body: { id: 1 } }))
    expect(result.success).toBe(false)
  })

  it('登录后删除公告', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.announcements.findFirst).mockResolvedValue({ id: 1, courseId: 1 } as any)
    const handler = (await import('../../server/api/announcements/delete.post')).default
    const result = await handler(makeEvent({ body: { id: 1 } }))
    expect(result.success).toBe(true)
  })

  it('observer 只读：不能删除公告（即使挂了 teacher 角色）', async () => {
    setMockAuthState({ id: 9, username: 'observer', roles: ['observer', 'teacher'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.announcements.findFirst).mockResolvedValue({ id: 1, courseId: 1 } as any)
    const handler = (await import('../../server/api/announcements/delete.post')).default
    const result = await handler(makeEvent({ body: { id: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toContain('仅教师及以上')
  })
})
