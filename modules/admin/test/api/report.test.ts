/**
 * Admin 平台报告：聚合 utils + API 测试
 * @see modules/admin/server/utils/report.ts
 * @see modules/admin/server/api/admin/report.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

/** 通用查询链：任意方法都返回自身，await 得到 []（用于形状/健壮性冒烟测试） */
function makeChain(): any {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    groupBy: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    innerJoin: () => chain,
    then: (resolve: any) => Promise.resolve([]).then(resolve),
  }
  return chain
}

const _mockDb = { select: vi.fn(() => makeChain()) }
const _mockSchema: Record<string, any> = new Proxy({}, {
  get: (_t, table: string) => new Proxy({}, { get: (_t2, col: string) => `${table}.${col}` }),
})

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
    eq: (col: any, val: any) => ({ op: 'eq', col, val }),
    and: (...conds: any[]) => ({ op: 'and', conds }),
    inArray: (col: any, vals: any[]) => ({ op: 'inArray', col, vals }),
    desc: (col: any) => ({ op: 'desc', col }),
  }
})

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _mockDb.select = vi.fn(() => makeChain()) as any
})

function makeEvent() {
  return { cookies: {}, params: {} } as any
}

describe('utils/report - 纯函数', () => {
  it('bandScore 分档', async () => {
    const { bandScore } = await import('../../server/utils/report')
    expect(bandScore(95)).toBe('90-100')
    expect(bandScore(85)).toBe('80-89')
    expect(bandScore(75)).toBe('70-79')
    expect(bandScore(65)).toBe('60-69')
    expect(bandScore(30)).toBe('0-59')
    expect(bandScore(0)).toBe('0-59')
  })

  it('bandProgress 分档', async () => {
    const { bandProgress } = await import('../../server/utils/report')
    expect(bandProgress(100)).toBe('90-100%')
    expect(bandProgress(80)).toBe('70-89%')
    expect(bandProgress(50)).toBe('40-69%')
    expect(bandProgress(10)).toBe('1-39%')
    expect(bandProgress(0)).toBe('0%')
  })

  it('recentDates 返回连续 N 天（含今天）', async () => {
    const { recentDates } = await import('../../server/utils/report')
    const dates = recentDates(7, new Date('2026-09-17T10:00:00Z'))
    expect(dates).toHaveLength(7)
    expect(dates[dates.length - 1]).toBe('2026-09-17')
    expect(dates[0]).toBe('2026-09-11')
  })
})

describe('utils/report - getPlatformReport 形状', () => {
  it('空库时返回完整结构且数值为 0（不抛错）', async () => {
    const { getPlatformReport } = await import('../../server/utils/report')
    const report = await getPlatformReport()

    expect(typeof report.generatedAt).toBe('string')
    // KPI 各组都存在且是数字
    expect(report.kpi.users.total).toBe(0)
    expect(report.kpi.courses.total).toBe(0)
    expect(report.kpi.contents.questions).toBe(0)
    expect(report.kpi.gamification.exp).toBe(0)
    expect(report.kpi.interaction.showcases).toBe(0)
    for (const v of Object.values(report.kpi.users)) {
      expect(Number.isFinite(v as number)).toBe(true)
    }
    // 固定长度序列
    expect(report.learningTrend).toHaveLength(14)
    expect(report.abilityRadar).toHaveLength(7)
    // 数组字段
    expect(Array.isArray(report.roleDistribution)).toBe(true)
    expect(Array.isArray(report.contentDistribution)).toBe(true)
    expect(report.contentDistribution).toHaveLength(8)
    expect(Array.isArray(report.scoreDistribution)).toBe(true)
    expect(Array.isArray(report.progressDistribution)).toBe(true)
    expect(Array.isArray(report.courseRanking)).toBe(true)
    expect(Array.isArray(report.topStudents)).toBe(true)
    expect(Array.isArray(report.atRiskStudents)).toBe(true)
    expect(report.analytics.avgScore).toBe(0)
    expect(report.analytics.avgProgress).toBe(0)
    expect(report.analytics.enrolledStudents).toBe(0)
    expect(Array.isArray(report.contentQuality.hardest)).toBe(true)
    expect(Array.isArray(report.contentQuality.easiest)).toBe(true)
    expect(report.contentQuality.quiz.avgScore).toBe(0)
    expect(report.contentQuality.homework.avgScore).toBe(0)
    expect(report.contentQuality.comments.pending).toBe(0)
  })
})

describe('API: admin/report.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    ;(globalThis as any).getPlatformReport = async () => ({ ok: true })
    const handler = (await import('../../server/api/admin/report.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('非管理员（教师）抛 403', async () => {
    setMockAuthState({ id: 2, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).getPlatformReport = async () => ({ ok: true })
    const handler = (await import('../../server/api/admin/report.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('管理员返回报告数据', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    ;(globalThis as any).getPlatformReport = async () => ({ generatedAt: 'x', kpi: { users: { total: 3 } } })
    const handler = (await import('../../server/api/admin/report.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.kpi.users.total).toBe(3)
  })
})
