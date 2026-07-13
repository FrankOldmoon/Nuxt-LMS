/**
 * LMS Home API 端点测试
 * @see modules/lms/server/api/home.get.ts
 *
 * 首页聚合端点：分类 + 课程（含教师） + 站点配置 + 未读计数
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  categories: { id: 'id', name: 'name', order: 'order' },
  courses: { id: 'id', name: 'name', code: 'code', categoryId: 'categoryId', tags: 'tags', config: 'config' },
  chapters: { id: 'id', courseId: 'courseId' },
  userCourses: { courseId: 'courseId', userId: 'userId', isTeacher: 'isTeacher', isEditor: 'isEditor', deletedAt: 'deletedAt' },
  users: { id: 'id', username: 'username', name: 'name', avatarImg: 'avatarImg' },
  configs: { id: 'id', value: 'value' },
  notifys: { userId: 'userId', readAt: 'readAt' },
  messages: { receiverUserId: 'receiverUserId', readAt: 'readAt', deletedAt: 'deletedAt' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
  // normalizeCategory / normalizeCourseSummary 是 lms auto-import，注入简单桩
  ;(globalThis as any).normalizeCategory = (cat: any) => ({
    id: cat.id, name: cat.name, order: cat.order || 0,
  })
  ;(globalThis as any).normalizeCourseSummary = (course: any, chapterCount?: number, teachers: any[] = []) => ({
    id: course.id, title: course.name, code: course.code,
    chapterCount: chapterCount ?? 0, teachers,
  })
})

// ====================== home.get.ts ======================

describe('API: home.get', () => {
  it('未登录用户：返回分类+课程+配置，未读数为 0', async () => {
    setMockAuthState(null)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(null)
    _mockDb.query.categories.findMany = vi.fn().mockResolvedValue([
      { id: 1, name: '分类A', order: 1 },
      { id: 2, name: '分类B', order: 2 },
    ])
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([
      { id: 10, name: '课程1', code: 'C1', categoryId: 1, tags: [], config: {}, chapters: [{ id: 100 }, { id: 101 }] },
      { id: 11, name: '课程2', code: 'C2', categoryId: 2, tags: [], config: {}, chapters: [] },
    ])
    // 教师查询：where 是终端
    _mockDb.where = vi.fn().mockResolvedValue([
      { courseId: 10, userId: 5, isTeacher: true, isEditor: false, username: 't1', name: '教师1', avatarImg: '' },
    ])
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue({ id: 'site_config', value: { title: 'MyLMS' } })

    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data.categories).toHaveLength(2)
    expect(r.data.courses).toHaveLength(2)
    expect(r.data.courses[0].title).toBe('课程1')
    expect(r.data.courses[0].chapterCount).toBe(2)
    expect(r.data.courses[0].teachers).toHaveLength(1)
    expect(r.data.courses[0].teachers[0].username).toBe('t1')
    expect(r.data.config).toEqual({ title: 'MyLMS' })
    expect(r.data.notifyUnread).toBe(0)
    expect(r.data.msgUnread).toBe(0)
  })

  it('已登录用户：返回未读通知数和消息数', async () => {
    const mockUser = { id: 7, username: 'alice', name: 'Alice', roles: ['student'], permissions: [] }
    setMockAuthState(mockUser)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(mockUser)
    _mockDb.query.categories.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue(null)
    // 无课程时 allMembers 不查询（courseIds 为空）
    // 未读计数：2 次 where（notify + msg）
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(function () {
      whereCall++
      if (whereCall === 1) return [{ count: 3 }]  // notify 未读
      return [{ count: 5 }]                         // msg 未读
    })
    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data.notifyUnread).toBe(3)
    expect(r.data.msgUnread).toBe(5)
    expect(r.data.categories).toEqual([])
    expect(r.data.courses).toEqual([])
    expect(r.data.config).toBeNull()
  })

  it('无课程时不查询教师列表', async () => {
    setMockAuthState(null)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(null)
    _mockDb.query.categories.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    // courseIds 为空 → 不调用 db.select 教师查询
    expect(_mockDb.select).not.toHaveBeenCalled()
  })

  it('站点配置为 null 时 config 返回 null', async () => {
    setMockAuthState(null)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(null)
    _mockDb.query.categories.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data.config).toBeNull()
  })

  it('多个教师被正确分组到对应课程', async () => {
    setMockAuthState(null)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(null)
    _mockDb.query.categories.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([
      { id: 10, name: 'C1', code: 'c1', categoryId: 1, tags: [], config: {}, chapters: [] },
      { id: 20, name: 'C2', code: 'c2', categoryId: 1, tags: [], config: {}, chapters: [] },
    ])
    _mockDb.where = vi.fn().mockResolvedValue([
      { courseId: 10, userId: 1, isTeacher: true, isEditor: false, username: 't1', name: 'T1', avatarImg: 'a' },
      { courseId: 10, userId: 2, isTeacher: false, isEditor: true, username: 'e1', name: 'E1', avatarImg: 'b' },
      { courseId: 20, userId: 3, isTeacher: true, isEditor: false, username: 't2', name: 'T2', avatarImg: 'c' },
    ])
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data.courses[0].teachers).toHaveLength(2)
    expect(r.data.courses[1].teachers).toHaveLength(1)
    expect(r.data.courses[0].teachers[0].isTeacher).toBe(true)
    expect(r.data.courses[0].teachers[1].isEditor).toBe(true)
  })
})
