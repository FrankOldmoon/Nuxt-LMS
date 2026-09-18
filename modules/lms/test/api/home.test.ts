/**
 * LMS Home API 端点测试
 * @see modules/lms/server/api/home.get.ts
 * @see modules/lms/server/utils/homeData.ts
 *
 * 首页聚合数据：分类 + 课程（章节数用 count 聚合 + 教师） + 站点配置
 * 注：未读通知/消息计数不在此端点（由 /api/notifications/unread 统一提供）
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
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

/**
 * 安装 select 链 mock：
 * - 章节数聚合查询（select 参数含 count）→ 以 groupBy 结束
 * - 教师查询 → 以 where 结束
 * 用 thenable 链让两种结尾都能被 await
 */
function setupSelect(chapterCounts: any[] = [], members: any[] = []) {
  _mockDb.select = vi.fn((sel: any) => {
    const isCount = !!sel && typeof sel === 'object' && 'count' in sel
    const target = isCount ? chapterCounts : members
    const chain: any = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      groupBy: () => Promise.resolve(target),
      then: (res: any) => Promise.resolve(target).then(res),
    }
    return chain
  }) as any
}

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  setupSelect()
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
  it('未登录用户：返回分类 + 课程（章节数来自 count 聚合）+ 配置', async () => {
    setMockAuthState(null)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(null)
    _mockDb.query.categories.findMany = vi.fn().mockResolvedValue([
      { id: 1, name: '分类A', order: 1 },
      { id: 2, name: '分类B', order: 2 },
    ])
    // 注意：课程查询不再 with chapters
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([
      { id: 10, name: '课程1', code: 'C1', categoryId: 1, tags: [], config: {} },
      { id: 11, name: '课程2', code: 'C2', categoryId: 2, tags: [], config: {} },
    ])
    setupSelect(
      [{ courseId: 10, count: 2 }], // 章节数聚合：课程 10 有 2 章；课程 11 无
      [{ courseId: 10, userId: 5, isTeacher: true, isEditor: false, username: 't1', name: '教师1', avatarImg: '' }],
    )
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue({ id: 'site_config', value: { title: 'MyLMS' } })

    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data.categories).toHaveLength(2)
    expect(r.data.courses).toHaveLength(2)
    expect(r.data.courses[0].title).toBe('课程1')
    expect(r.data.courses[0].chapterCount).toBe(2)
    expect(r.data.courses[1].chapterCount).toBe(0)
    expect(r.data.courses[0].teachers).toHaveLength(1)
    expect(r.data.courses[0].teachers[0].username).toBe('t1')
    expect(r.data.config).toEqual({ title: 'MyLMS' })
    // 不再返回未读计数（由 /api/notifications/unread 统一提供）
    expect(r.data.notifyUnread).toBeUndefined()
    expect(r.data.msgUnread).toBeUndefined()
  })

  it('已登录用户：正常返回分类/课程/配置', async () => {
    const mockUser = { id: 7, username: 'alice', name: 'Alice', roles: ['student'], permissions: [] }
    setMockAuthState(mockUser)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(mockUser)
    _mockDb.query.categories.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue(null)

    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data.categories).toEqual([])
    expect(r.data.courses).toEqual([])
    expect(r.data.config).toBeNull()
  })

  it('无课程时不查询章节数/教师（不做多余聚合查询）', async () => {
    setMockAuthState(null)
    ;(globalThis as any).getCurrentUser = vi.fn().mockResolvedValue(null)
    _mockDb.query.categories.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.courses.findMany = vi.fn().mockResolvedValue([])
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    // courseIds 为空 → 不调用 db.select（章节数 / 教师查询都跳过）
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
      { id: 10, name: 'C1', code: 'c1', categoryId: 1, tags: [], config: {} },
      { id: 20, name: 'C2', code: 'c2', categoryId: 1, tags: [], config: {} },
    ])
    setupSelect(
      [{ courseId: 10, count: 1 }, { courseId: 20, count: 3 }],
      [
        { courseId: 10, userId: 1, isTeacher: true, isEditor: false, username: 't1', name: 'T1', avatarImg: 'a' },
        { courseId: 10, userId: 2, isTeacher: false, isEditor: true, username: 'e1', name: 'E1', avatarImg: 'b' },
        { courseId: 20, userId: 3, isTeacher: true, isEditor: false, username: 't2', name: 'T2', avatarImg: 'c' },
      ],
    )
    _mockDb.query.configs.findFirst = vi.fn().mockResolvedValue(null)

    const handler = (await import('../../server/api/home.get')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data.courses[0].teachers).toHaveLength(2)
    expect(r.data.courses[1].teachers).toHaveLength(1)
    expect(r.data.courses[0].teachers[0].isTeacher).toBe(true)
    expect(r.data.courses[0].teachers[1].isEditor).toBe(true)
    expect(r.data.courses[0].chapterCount).toBe(1)
    expect(r.data.courses[1].chapterCount).toBe(3)
  })
})
