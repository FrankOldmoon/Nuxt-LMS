/**
 * courses/class-leaderboard.get.ts 端点测试：各班在本课程的生均得分排行
 * @see modules/lms/server/api/courses/class-leaderboard.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  userCourses: { userId: 'userId', courseId: 'courseId', score: 'score', deletedAt: 'deletedAt' },
  userClasses: { userId: 'userId', classId: 'classId', isTeacher: 'isTeacher', deletedAt: 'deletedAt' },
  users: { id: 'id', classId: 'classId', deletedAt: 'deletedAt' },
  classes: { id: 'id', name: 'name', code: 'code' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
})

// 依次 mock 4 次链式 where 查询的结果：
// 1) user_courses 选课  2) user_classes 成员  3) users 直接归属  4) classes 班级名
function mockWhereSeq(results: any[][]) {
  let i = 0
  _mockDb.where = vi.fn().mockImplementation(() => Promise.resolve(results[i++]))
}

describe('API: courses/class-leaderboard.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/courses/class-leaderboard.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1' } }))).rejects.toThrow()
  })

  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/class-leaderboard.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('无选课用户返回空 rows', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    mockWhereSeq([[]])
    const handler = (await import('../../server/api/courses/class-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.rows).toEqual([])
  })

  it('按生均分降序排序，教师不计入', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    // class1：12 名学生（user1-12）各 90 分；class2：11 名学生（user13-23）各 60 分
    const c1 = Array.from({ length: 12 }, (_, i) => i + 1)
    const c2 = Array.from({ length: 11 }, (_, i) => i + 13)
    mockWhereSeq([
      // 1. 选课：含 class1 教师（user99，999 分，不计入）
      [
        ...c1.map(userId => ({ userId, score: '90' })),
        ...c2.map(userId => ({ userId, score: '60' })),
        { userId: 99, score: '999' },
      ],
      // 2. user_classes 成员：user99 为 class1 教师（排除）
      [
        ...c1.map(userId => ({ userId, classId: 1, isTeacher: false })),
        ...c2.map(userId => ({ userId, classId: 2, isTeacher: false })),
        { userId: 99, classId: 1, isTeacher: true },
      ],
      // 3. users 直接归属（已在 user_classes 中的不重复计数）
      [
        ...c1.map(id => ({ id, classId: 1 })),
        ...c2.map(id => ({ id, classId: 2 })),
        { id: 99, classId: 1 }, // teacher 的直接归属被排除
      ],
      // 4. classes 名称
      [
        { id: 1, name: 'ClassA' },
        { id: 2, name: 'ClassB' },
      ],
    ])
    const handler = (await import('../../server/api/courses/class-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    const rows = r.data.rows
    expect(rows).toHaveLength(2)
    // class1：12 名学生各 90 → 生均 90（user99 教师 999 不计入）
    expect(rows[0]).toMatchObject({ classId: 1, name: 'ClassA', studentCount: 12, avg: 90, scoreSum: 1080 })
    expect(rows[0].rank).toBe(1)
    // class2：11 名学生各 60 → 生均 60
    expect(rows[1]).toMatchObject({ classId: 2, name: 'ClassB', studentCount: 11, avg: 60, scoreSum: 660 })
    expect(rows[1].rank).toBe(2)
  })

  it('学生人数不超过 10 的班级不参与排名', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    // class1：10 人（不参与），class2：11 人（参与）
    const c1 = Array.from({ length: 10 }, (_, i) => i + 1)
    const c2 = Array.from({ length: 11 }, (_, i) => i + 11)
    mockWhereSeq([
      [...c1.map(userId => ({ userId, score: '100' })), ...c2.map(userId => ({ userId, score: '50' }))],
      [
        ...c1.map(userId => ({ userId, classId: 1, isTeacher: false })),
        ...c2.map(userId => ({ userId, classId: 2, isTeacher: false })),
      ],
      [
        ...c1.map(id => ({ id, classId: 1 })),
        ...c2.map(id => ({ id, classId: 2 })),
      ],
      [{ id: 1, name: 'ClassA' }, { id: 2, name: 'ClassB' }],
    ])
    const handler = (await import('../../server/api/courses/class-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    const rows = r.data.rows
    // 仅 11 人的 ClassB 参与排名，10 人的 ClassA 被剔除
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ classId: 2, name: 'ClassB', studentCount: 11, avg: 50, rank: 1 })
  })

  it('同班多用户取平均分', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    // class1：11 人（100 + 10×89 = 990 → 生均 90）；class2：11 人各 60
    const c1 = Array.from({ length: 11 }, (_, i) => i + 1)
    const c2 = Array.from({ length: 11 }, (_, i) => i + 12)
    mockWhereSeq([
      [
        { userId: 1, score: '100' },
        ...c1.slice(1).map(userId => ({ userId, score: '89' })),
        ...c2.map(userId => ({ userId, score: '60' })),
      ],
      [
        ...c1.map(userId => ({ userId, classId: 1, isTeacher: false })),
        ...c2.map(userId => ({ userId, classId: 2, isTeacher: false })),
      ],
      [
        ...c1.map(id => ({ id, classId: 1 })),
        ...c2.map(id => ({ id, classId: 2 })),
      ],
      [{ id: 1, name: 'ClassA' }, { id: 2, name: 'ClassB' }],
    ])
    const handler = (await import('../../server/api/courses/class-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    const rows = r.data.rows
    // class1 生均 (100+89×10)/11 = 90，class2 生均 60
    expect(rows[0].classId).toBe(1)
    expect(rows[0].avg).toBe(90)
    expect(rows[0].scoreSum).toBe(990)
    expect(rows[0].studentCount).toBe(11)
    expect(rows[1].classId).toBe(2)
    expect(rows[1].avg).toBe(60)
  })

  it('教师/测试/观察者系统班级不参与排名', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    // 5 个班各 11 名学生：class1(ClassA)、class5(10V) 参与排名，2-4 为系统班级
    const mk = (classId: number, score: number) => Array.from({ length: 11 }, (_, i) => ({ userId: (classId - 1) * 11 + i + 1, classId, isTeacher: false, score: String(score) }))
    const all = [mk(1, 100), mk(2, 200), mk(3, 300), mk(4, 400), mk(5, 50)]
    mockWhereSeq([
      all.flatMap(g => g.map(({ userId, score }) => ({ userId, score }))),
      all.flatMap(g => g.map(({ userId, classId, isTeacher }) => ({ userId, classId, isTeacher }))),
      all.flatMap(g => g.map(({ userId, classId }) => ({ id: userId, classId }))),
      [
        { id: 1, name: 'ClassA', code: 'classa' },
        { id: 2, name: 'teacher', code: 'teacher' },
        { id: 3, name: 'test', code: 'test' },
        { id: 4, name: 'observer', code: 'observer' },
        { id: 5, name: '10V', code: '10v' },
      ],
    ])
    const handler = (await import('../../server/api/courses/class-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    const rows = r.data.rows
    // 仅保留 ClassA 与 10V，teacher/test/observer 三个班被剔除
    expect(rows.map((x: any) => x.classId)).toEqual([1, 5])
    expect(rows.map((x: any) => x.rank)).toEqual([1, 2])
    expect(rows[0]).toMatchObject({ classId: 1, name: 'ClassA', avg: 100 })
    expect(rows[1]).toMatchObject({ classId: 5, name: '10V', avg: 50 })
  })
})