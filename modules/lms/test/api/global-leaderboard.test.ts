/**
 * courses/global-leaderboard.get.ts 端点测试：本课程全局得分前 10（排除教职工 teacher/admin）
 * @see modules/lms/server/api/courses/global-leaderboard.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  userCourses: {
    userId: 'userId', courseId: 'courseId', score: 'score', exp: 'exp',
    isTeacher: 'isTeacher', isEditor: 'isEditor', deletedAt: 'deletedAt',
  },
  userRoles: { userId: 'userId', roleId: 'roleId' },
  roles: { id: 'id', code: 'code' },
  users: { id: 'id', name: 'name', avatarImg: 'avatarImg', classId: 'classId', deletedAt: 'deletedAt' },
  classes: { id: 'id', name: 'name' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
})

// 依次 mock 2 次链式 where 查询：1) user_courses 选课  2) user_roles（teacher / admin 角色）
// getUserClassInfo 由 auto-import 桩提供（在 case 中按需覆盖）
function mockWhereSeq(results: any[][]) {
  let i = 0
  _mockDb.where = vi.fn().mockImplementation(() => Promise.resolve(results[i++]))
}

function mockClassInfo(entries: Array<[number, any]>) {
  installLmsAutoImports({
    getUserClassInfo: vi.fn().mockResolvedValue(new Map(entries)),
  })
}

describe('API: courses/global-leaderboard.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/courses/global-leaderboard.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1' } }))).rejects.toThrow()
  })

  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/global-leaderboard.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('无选课用户返回空 rows', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    mockWhereSeq([[]])
    const handler = (await import('../../server/api/courses/global-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.rows).toEqual([])
  })

  it('排除课程教师/编辑者与 teacher/admin 角色，按得分降序且带班级名称', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    mockClassInfo([
      [1, { classId: 10, className: 'ClassA', name: 'alice', avatarImg: null }],
      [2, { classId: 20, className: 'ClassB', name: 'bob', avatarImg: null }],
      [5, { classId: 10, className: 'ClassA', name: 'eve', avatarImg: null }],
    ])
    mockWhereSeq([
      // 1. 选课：user4 课程教师、user3 课程编辑者 → 排除；user5 见下（teacher 角色）
      [
        { userId: 1, score: '100', exp: '10', isTeacher: false, isEditor: false },
        { userId: 2, score: '80', exp: '20', isTeacher: false, isEditor: false },
        { userId: 3, score: '60', exp: '0', isTeacher: false, isEditor: true },
        { userId: 4, score: '999', exp: '0', isTeacher: true, isEditor: false },
        { userId: 5, score: '50', exp: '0', isTeacher: false, isEditor: false },
      ],
      // 2. teacher 角色：user5 拥有 teacher 角色 → 排除
      [{ userId: 5 }],
    ])
    const handler = (await import('../../server/api/courses/global-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    const rows = r.data.rows
    expect(rows.map((x: any) => x.userId)).toEqual([1, 2])
    expect(rows[0]).toMatchObject({ userId: 1, rank: 1, score: 100, className: 'ClassA', name: 'alice' })
    expect(rows[1]).toMatchObject({ userId: 2, rank: 2, score: 80, className: 'ClassB', name: 'bob' })
  })

  it('排除 admin 角色（不进入学生榜）', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    mockClassInfo([
      [1, { classId: 10, className: 'ClassA', name: 'stu', avatarImg: null }],
      [9, { classId: 10, className: 'ClassA', name: 'adm', avatarImg: null }],
    ])
    mockWhereSeq([
      [
        { userId: 1, score: '100', exp: '0', isTeacher: false, isEditor: false },
        { userId: 9, score: '999', exp: '0', isTeacher: false, isEditor: false },
      ],
      // admin 角色：SQL 已按 roles.code IN ('teacher','admin') 过滤出该用户
      [{ userId: 9 }],
    ])
    const handler = (await import('../../server/api/courses/global-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.rows.map((x: any) => x.userId)).toEqual([1])
  })

  it('超过10人时只取前10并带 rank', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    mockClassInfo(
      Array.from({ length: 12 }, (_, i) => [i + 1, { classId: 1, className: 'C', name: `u${i + 1}`, avatarImg: null }]) as any,
    )
    mockWhereSeq([
      Array.from({ length: 12 }, (_, i) => ({
        userId: i + 1, score: String(100 - i), exp: '0', isTeacher: false, isEditor: false,
      })),
      [],
    ])
    const handler = (await import('../../server/api/courses/global-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    const rows = r.data.rows
    expect(rows).toHaveLength(10)
    expect(rows[0].rank).toBe(1)
    expect(rows[9].rank).toBe(10)
    expect(rows[0].score).toBe(100)
    expect(rows[9].score).toBe(91)
  })
})
