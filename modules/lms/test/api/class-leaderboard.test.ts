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
  classes: { id: 'id', name: 'name' },
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
    mockWhereSeq([
      // 1. 选课：user1=100, user2=80（class1）, user3=60（class2）, user4=999（class1 教师）
      [
        { userId: 1, score: '100' },
        { userId: 2, score: '80' },
        { userId: 3, score: '60' },
        { userId: 4, score: '999' },
      ],
      // 2. user_classes 成员：user4 为 class1 教师（排除）
      [
        { userId: 1, classId: 1, isTeacher: false },
        { userId: 2, classId: 1, isTeacher: false },
        { userId: 3, classId: 2, isTeacher: false },
        { userId: 4, classId: 1, isTeacher: true },
      ],
      // 3. users 直接归属
      [
        { id: 1, classId: 1 },
        { id: 2, classId: null },
        { id: 3, classId: 2 },
        { id: 4, classId: 1 }, // teacher 的直接归属被排除
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
    // class1：user1+user2 → 生均 90（user4 教师 999 不计入）
    expect(rows[0]).toMatchObject({ classId: 1, name: 'ClassA', studentCount: 2, avg: 90, scoreSum: 180 })
    expect(rows[0].rank).toBe(1)
    // class2：user3 → 生均 60
    expect(rows[1]).toMatchObject({ classId: 2, name: 'ClassB', studentCount: 1, avg: 60 })
    expect(rows[1].rank).toBe(2)
  })

  it('同班多用户取平均分', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    mockWhereSeq([
      [{ userId: 1, score: '95' }, { userId: 2, score: '85' }, { userId: 3, score: '60' }],
      [
        { userId: 1, classId: 1, isTeacher: false },
        { userId: 2, classId: 1, isTeacher: false },
        { userId: 3, classId: 2, isTeacher: false },
      ],
      [
        { id: 1, classId: 1 },
        { id: 2, classId: 1 },
        { id: 3, classId: 2 },
      ],
      [{ id: 1, name: 'ClassA' }, { id: 2, name: 'ClassB' }],
    ])
    const handler = (await import('../../server/api/courses/class-leaderboard.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    const rows = r.data.rows
    // class1 生均 (95+85)/2 = 90，class2 生均 60
    expect(rows[0].classId).toBe(1)
    expect(rows[0].avg).toBe(90)
    expect(rows[0].scoreSum).toBe(180)
    expect(rows[0].studentCount).toBe(2)
    expect(rows[1].classId).toBe(2)
    expect(rows[1].avg).toBe(60)
  })
})