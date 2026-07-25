/**
 * Admin Stats API + utils 测试
 * @see modules/admin/server/api/admin/stats.get.ts
 * @see modules/admin/server/utils/stats.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn(),
}
const _mockSchema = {
  users: { deletedAt: 'deletedAt', createdAt: 'createdAt' },
  courses: { deletedAt: 'deletedAt' },
  chapters: { deletedAt: 'deletedAt' },
  questions: { deletedAt: 'deletedAt' },
  homeworks: { deletedAt: 'deletedAt' },
  quizzes: { deletedAt: 'deletedAt' },
  races: { deletedAt: 'deletedAt' },
  comments: { deletedAt: 'deletedAt' },
  classes: { deletedAt: 'deletedAt' },
  roles: { name: 'name', id: 'id', deletedAt: 'deletedAt' },
  userRoles: { roleId: 'roleId', userId: 'userId', deletedAt: 'deletedAt' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))
vi.mock('drizzle-orm', () => {
  const sql = (strings: TemplateStringsArray, ...vals: any[]) => {
    const obj = { __sql: true, strings, vals, as: (alias: string) => ({ ...obj, alias }) }
    return obj
  }
  return {
    sql,
    isNull: (col: any) => ({ op: 'isNull', col }),
    gte: (col: any, val: any) => ({ op: 'gte', col, val }),
    and: (...conds: any[]) => ({ op: 'and', conds }),
  }
})

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

function makeEvent() {
  return { cookies: {}, params: {} } as any
}

/**
 * 构造 mock select 链：根据 select 参数的 key 区分不同查询
 * - {count} → countTable / r7 / r30：from().where() → [{count:N}]
 * - {date,count} → growthRows：from().where().groupBy().orderBy() → [{date,count}]
 * - {name,count} → roleRows：from().innerJoin().where().groupBy() → [{name,count}]
 */
function setupSelectMock(countVal = 5, growthRows: any[] = [], roleRows: any[] = []) {
  _mockDb.select = vi.fn((sel: any) => {
    const keys = sel ? Object.keys(sel) : []
    if (keys.includes('date')) {
      // growthRows: from().where().groupBy().orderBy()
      return {
        from: () => ({
          where: () => ({
            groupBy: () => ({ orderBy: () => Promise.resolve(growthRows) }),
          }),
        }),
      }
    }
    if (keys.includes('name')) {
      // roleRows: from().innerJoin().where().groupBy()
      return {
        from: () => ({
          innerJoin: () => ({
            where: () => ({ groupBy: () => Promise.resolve(roleRows) }),
          }),
        }),
      }
    }
    // countTable / r7 / r30: from().where() → [{count}]
    return {
      from: () => ({
        where: () => Promise.resolve([{ count: countVal }]),
      }),
    }
  }) as any
}

describe('utils/stats - getDashboardStats', () => {
  it('返回表计数 + 新用户 + 增长 + 角色分布', async () => {
    setupSelectMock(5, [{ date: '2026-07-01', count: 3 }], [{ name: 'admin', count: 2 }])
    const { getDashboardStats } = await import('../../server/utils/stats')
    const stats = await getDashboardStats()
    expect(stats.counts.users).toBe(5)
    expect(stats.counts.courses).toBe(5)
    expect(stats.newUsers7d).toBe(5)
    expect(stats.newUsers30d).toBe(5)
    expect(stats.userGrowth).toEqual([{ date: '2026-07-01', count: 3 }])
    expect(stats.roleDistribution).toEqual([{ name: 'admin', value: 2 }])
  })

  it('count 为 0 时正确处理', async () => {
    setupSelectMock(0, [], [])
    const { getDashboardStats } = await import('../../server/utils/stats')
    const stats = await getDashboardStats()
    expect(stats.counts.users).toBe(0)
    expect(stats.newUsers7d).toBe(0)
    expect(stats.userGrowth).toEqual([])
    expect(stats.roleDistribution).toEqual([])
  })
})

describe('API: admin/stats.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    setupSelectMock(0, [], [])
    const statsUtil = await import('../../server/utils/stats')
    ;(globalThis as any).getDashboardStats = statsUtil.getDashboardStats
    const handler = (await import('../../server/api/admin/stats.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('管理员返回统计数据', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    setupSelectMock(10, [{ date: '2026-07-01', count: 5 }], [{ name: 'student', count: 20 }])
    const statsUtil = await import('../../server/utils/stats')
    ;(globalThis as any).getDashboardStats = statsUtil.getDashboardStats
    const handler = (await import('../../server/api/admin/stats.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.counts.users).toBe(10)
    expect(result.data.roleDistribution).toEqual([{ name: 'student', value: 20 }])
  })
})
