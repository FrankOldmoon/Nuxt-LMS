/**
 * LMS 其它业务端点测试
 * @see modules/lms/server/api/{classes,homeworks,races,questions,lms-config}/*.ts
 *
 * 覆盖：
 * - classes/{add,list,mine,update,users.get,users.post}   6 个
 * - homeworks/{add,batch,update,submit,score,record.get,records.get,show} 8 个
 * - races/{show,state.get,state.post}                       3 个
 * - questions/wrong-list.get.ts                            1 个
 * - lms-config/update.post.ts                              1 个
 *
 * submit.post.ts 内部使用 withSubmitHandler，本文件通过 vi.mock 简化包装
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb({
  classRaces: { findFirst: vi.fn(), findMany: vi.fn() },
})
const _mockSchema: any = {
  classes: { id: 'id', name: 'name', code: 'code', deletedAt: 'deletedAt' },
  userClasses: { userId: 'userId', classId: 'classId', isTeacher: 'isTeacher' },
  users: { id: 'id', name: 'name', classId: 'classId', defaultClass: 'defaultClass' },
  homeworks: { id: 'id', courseId: 'courseId', cid: 'cid', name: 'name', content: 'content' },
  userHomeworks: { userId: 'userId', courseId: 'courseId', homeworkCid: 'homeworkCid', score: 'score', record: 'record', files: 'files' },
  races: { id: 'id', courseId: 'courseId', cid: 'cid', name: 'name', content: 'content' },
  classRaces: { classId: 'classId', courseId: 'courseId', raceCid: 'raceCid', currentIndex: 'currentIndex', lastQuestionStartedAt: 'lastQuestionStartedAt' },
  userQuestions: { userId: 'userId', courseId: 'courseId', questionCid: 'questionCid', wrongCount: 'wrongCount', submitCount: 'submitCount', firstRight: 'firstRight', updatedAt: 'updatedAt' },
  questions: { id: 'id', courseId: 'courseId', cid: 'cid', name: 'name', type: 'type', content: 'content' },
  configs: { id: 'id', value: 'value' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// mock submit handler — 直接执行内部函数
vi.mock('../../server/utils/submit/handler', () => ({
  withSubmitHandler: (_label: string, fn: any) => fn,
}))

import { resetAllStubs, setMockAuthState, getWsBroadcasts, clearWsBroadcasts } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb, {
    classRaces: { findFirst: vi.fn(), findMany: vi.fn() },
  })
  installLmsAutoImports()
  clearWsBroadcasts()
  // 默认 orderBy 链：返回 orderBy 函数，orderBy 又返回 Promise<[]>
  // 这样 .where().orderBy() 或 .from().where().orderBy() 链都能解析
  _mockDb.orderBy = vi.fn().mockResolvedValue([])
})

// ====================== classes/* ======================

describe('API: classes/add', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/classes/add.post')).default
    await expect(handler(makeEvent({ body: { name: 'C1' } }))).rejects.toThrow()
  })

  it('教师新增班级成功', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/classes/add.post')).default
    const r = await handler(makeEvent({ body: { name: 'C1', code: 'C1' } }))
    expect(r.success).toBe(true)
  })
})

describe('API: classes/list', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/classes/list')).default
    await expect(handler(makeEvent({}))).rejects.toThrow()
  })

  it('admin 返回所有班级', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValueOnce([{ id: 1, name: 'A', code: 'A' }, { id: 2, name: 'B', code: 'B' }]) })
    const handler = (await import('../../server/api/classes/list')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
  })

  it('教师只返回自己作为教师的班级', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.where = vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValueOnce([{ id: 1, name: 'A', code: 'A' }]) })
    const handler = (await import('../../server/api/classes/list')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(1)
  })
})

describe('API: classes/mine', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/classes/mine')).default
    await expect(handler(makeEvent({}))).rejects.toThrow()
  })

  it('返回关联班级 + 主班级', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    // 1st query: select().from().where().limit(1) - 1st where call
    // 2nd query: select().from().innerJoin().where().orderBy() - 2nd where call
    // 3rd query: select().from().where().limit(1) - 3rd where call
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(() => {
      whereCall++
      if (whereCall === 1) {
        // 1st query → .limit(1) is terminal
        return { limit: vi.fn().mockResolvedValueOnce([{ classId: 100 }]) }
      }
      if (whereCall === 2) {
        // 2nd query → .orderBy() is terminal
        return { orderBy: vi.fn().mockResolvedValueOnce([{ id: 200, name: 'assoc', code: 'A' }]) }
      }
      // 3rd query → .limit(1) is terminal
      return { limit: vi.fn().mockResolvedValueOnce([{ id: 100, name: 'main', code: 'M' }]) }
    })
    const handler = (await import('../../server/api/classes/mine')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(true)
    expect(r.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('API: classes/update', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/classes/update.post')).default
    await expect(handler(makeEvent({ body: { id: 1, name: 'x' } }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/classes/update.post')).default
    const r = await handler(makeEvent({ body: { name: 'x' } }))
    expect(r.success).toBe(false)
  })

  it('教师更新成功', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/classes/update.post')).default
    const r = await handler(makeEvent({ body: { id: 1, name: 'New' } }))
    expect(r.success).toBe(true)
  })
})

describe('API: classes/users.get', () => {
  it('缺少 classId 返回失败', async () => {
    const handler = (await import('../../server/api/classes/users.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('返回班级用户列表', async () => {
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ])
    const handler = (await import('../../server/api/classes/users.get')).default
    const r = await handler(makeEvent({ query: { classId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
  })
})

describe('API: classes/users.post', () => {
  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/classes/users.post')).default
    const r = await handler(makeEvent({ body: { classId: 1 } }))
    expect(r.success).toBe(false)
  })

  it('非管理员被拒', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/classes/users.post')).default
    await expect(handler(makeEvent({ body: { classId: 1, userIds: [2] } }))).rejects.toThrow()
  })

  it('管理员批量添加用户（isTeacher=true 分配角色）', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/classes/users.post')).default
    const r = await handler(makeEvent({ body: { classId: 1, userIds: [2, 3], isTeacher: true } }))
    expect(r.success).toBe(true)
    expect(r.data.added).toBe(2)
  })

  it('isTeacher=false 不分配角色', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/classes/users.post')).default
    const r = await handler(makeEvent({ body: { classId: 1, userIds: [2], isTeacher: false } }))
    expect(r.success).toBe(true)
  })
})

// ====================== homeworks/* ======================

describe('API: homeworks/add', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/add.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, name: 'HW' } }))).rejects.toThrow()
  })

  it('缺少 course_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/add.post')).default
    const r = await handler(makeEvent({ body: { name: 'HW' } }))
    expect(r.success).toBe(false)
  })

  it('教师新增作业成功', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    // chain: where().orderBy().limit(1) → 返回 max cid
    _mockDb.where = vi.fn().mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValueOnce([{ cid: 3 }]),
      }),
    })
    const handler = (await import('../../server/api/homeworks/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, name: 'HW' } }))
    expect(r.success).toBe(true)
  })
})

describe('API: homeworks/batch', () => {
  it('非管理员被拒', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/batch.post')).default
    await expect(handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'delete' } }))).rejects.toThrow()
  })

  it('无效 action 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/batch.post')).default
    const r = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'invalid' } }))
    expect(r.success).toBe(false)
  })

  it('action=delete 软删除', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/batch.post')).default
    const r = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'delete' } }))
    expect(r.success).toBe(true)
  })
})

describe('API: homeworks/update', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/update.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, id: 1, name: 'x' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/update.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('教师更新作业成功', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/update.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, id: 1, name: 'Updated' } }))
    expect(r.success).toBe(true)
  })
})

describe('API: homeworks/submit', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/homeworks/submit.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, homework_cid: 1 } }))).rejects.toThrow()
  })

  it('首次提交获得 submitExp', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userHomeworks.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/homeworks/submit.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, homework_cid: 1, content: 'answer' } }))
    expect(r.success).toBe(true)
    expect(r.data.gainedExp).toBeGreaterThan(0)
  })

  it('已有记录时按 resubmitExp 计算', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userHomeworks.findFirst = vi.fn().mockResolvedValue({ record: { _submitCount: 0 } })
    const handler = (await import('../../server/api/homeworks/submit.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, homework_cid: 1, content: 'resub' } }))
    expect(r.success).toBe(true)
  })
})

describe('API: homeworks/score', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/score.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, homework_cid: 1, user_id: 2, score: 90 } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/score.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('教师打分成功', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.userHomeworks.findFirst = vi.fn().mockResolvedValue(null)
    _mockDb.returning = vi.fn().mockResolvedValueOnce([{ userId: 2, courseId: 1, homeworkCid: 1, score: '85' }])
    const handler = (await import('../../server/api/homeworks/score.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, homework_cid: 1, user_id: 2, score: 85 } }))
    expect(r.success).toBe(true)
  })
})

describe('API: homeworks/record.get', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/homeworks/record.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1', cid: '1' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/record.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('返回个人作业记录', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userHomeworks.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, score: 80 })
    const handler = (await import('../../server/api/homeworks/record.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.score).toBe(80)
  })
})

describe('API: homeworks/records.get', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/homeworks/records.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1', cid: '1' } }))).rejects.toThrow()
  })

  it('无 defaultClass 返回空数组', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ defaultClass: null }])
    const handler = (await import('../../server/api/homeworks/records.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })

  it('返回班级学生记录', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ defaultClass: { id: 5 } }])
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 100, isTeacher: false },
      { id: 200, isTeacher: false },
    ])
    _mockDb.query.userHomeworks.findMany = vi.fn().mockResolvedValue([
      { userId: 100, courseId: 1, homeworkCid: 1, score: '90' },
    ])
    const handler = (await import('../../server/api/homeworks/records.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(1)
    expect(r.data[0].userId).toBe(100)
  })
})

describe('API: homeworks/show', () => {
  it('缺少参数返回失败', async () => {
    const handler = (await import('../../server/api/homeworks/show')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('返回作业详情', async () => {
    _mockDb.query.homeworks.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, name: 'HW' })
    const handler = (await import('../../server/api/homeworks/show')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.name).toBe('HW')
  })
})

// ====================== races/* ======================

describe('API: races/show', () => {
  it('缺少参数返回失败', async () => {
    const handler = (await import('../../server/api/races/show')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('返回 race 详情', async () => {
    _mockDb.query.races.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, name: 'R1' })
    const handler = (await import('../../server/api/races/show')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.name).toBe('R1')
  })
})

describe('API: races/state.get', () => {
  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/races/state.get')).default
    const r = await handler(makeEvent({ query: { class_id: '1' } }))
    expect(r.success).toBe(false)
  })

  it('返回班级竞赛状态', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.classRaces.findFirst = vi.fn().mockResolvedValue({ classId: 1, raceCid: 1, currentIndex: 3 })
    const handler = (await import('../../server/api/races/state.get')).default
    const r = await handler(makeEvent({ query: { class_id: '1', course_id: '1', race_cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.currentIndex).toBe(3)
  })
})

describe('API: races/state.post', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/races/state.post')).default
    await expect(handler(makeEvent({ body: { class_id: 1, course_id: 1, race_cid: 1 } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/races/state.post')).default
    const r = await handler(makeEvent({ body: { class_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('更新已存在状态', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.classRaces.findFirst = vi.fn().mockResolvedValue({ classId: 1, raceCid: 1, currentIndex: 0 })
    const handler = (await import('../../server/api/races/state.post')).default
    const r = await handler(makeEvent({ body: { class_id: 1, course_id: 1, race_cid: 1, current_index: 2 } }))
    expect(r.success).toBe(true)
  })

  it('插入新状态', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.classRaces.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/races/state.post')).default
    const r = await handler(makeEvent({ body: { class_id: 1, course_id: 1, race_cid: 1, current_index: 0 } }))
    expect(r.success).toBe(true)
  })
})

// ====================== questions/wrong-list.get ======================

describe('API: questions/wrong-list.get', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/questions/wrong-list.get')).default
    await expect(handler(makeEvent({ query: {} }))).rejects.toThrow()
  })

  it('返回错题列表（无错题）', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    // 第 1 次 where: count 查询 → total = 0
    // 第 2 次 where: list 查询（错误列表） → 返回空（长度 0 → 早返回）
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(() => {
      whereCall++
      if (whereCall === 1) return Promise.resolve([{ count: 0 }])
      return {
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      }
    })
    const handler = (await import('../../server/api/questions/wrong-list.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(true)
    expect(r.data.items).toEqual([])
    expect(r.data.total).toBe(0)
  })

  it('返回错题列表（带分页）', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    // 1st query: count
    // 2nd query: list → where().orderBy().limit().offset()
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(() => {
      whereCall++
      if (whereCall === 1) return Promise.resolve([{ count: 1 }])
      return {
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValueOnce([{ courseId: 1, questionCid: 1, wrongCount: 2, submitCount: 3, firstRight: false, updatedAt: '2024-01-01' }]),
          }),
        }),
      }
    })
    _mockDb.query.questions.findMany = vi.fn().mockResolvedValue([
      { courseId: 1, cid: 1, name: 'Q1', type: 'single', content: '{}' },
    ])
    const handler = (await import('../../server/api/questions/wrong-list.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', page: '1', pageSize: '10' } }))
    expect(r.success).toBe(true)
    expect(r.data.total).toBe(1)
    expect(r.data.items).toHaveLength(1)
  })
})

// ====================== lms-config/update ======================

describe('API: lms-config/update', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/lms-config/update.post')).default
    await expect(handler(makeEvent({ body: { ai: { mode: 'api' } } }))).rejects.toThrow()
  })

  it('无效 body 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/lms-config/update.post')).default
    const r = await handler(makeEvent({ body: 'invalid' }))
    expect(r.success).toBe(false)
  })

  it('成功更新并广播 lms-config-changed', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    // reloadLmsConfig 调用 db.select().from().where() 返回 configs 行
    _mockDb.where = vi.fn().mockResolvedValueOnce([])
    const handler = (await import('../../server/api/lms-config/update.post')).default
    const r = await handler(makeEvent({ body: { ai: { mode: 'api', model: 'gpt-4' } } }))
    expect(r.success).toBe(true)
    expect(getWsBroadcasts().some((m: any) => m.type === 'lms-config-changed')).toBe(true)
  })
})
