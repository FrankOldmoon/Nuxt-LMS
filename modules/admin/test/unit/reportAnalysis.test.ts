/**
 * reportAnalysis 工具测试
 * @see modules/admin/utils/reportAnalysis.ts
 */
import { describe, it, expect } from 'vitest'
import {
  percentOf,
  growthRate,
  levelOf,
  sumWindow,
  periodGrowth,
  peakOf,
  buildHealth,
  scoreStructure,
  buildAlerts,
} from '../../utils/reportAnalysis'

describe('utils/reportAnalysis - percentOf', () => {
  it('返回 0-100 占比并保留 1 位小数', () => {
    expect(percentOf(30, 100)).toBe(30)
    expect(percentOf(1, 3)).toBe(33.3)
    expect(percentOf(2, 3)).toBe(66.7)
  })

  it('分母非正时返回 0', () => {
    expect(percentOf(5, 0)).toBe(0)
    expect(percentOf(5, -1)).toBe(0)
  })
})

describe('utils/reportAnalysis - growthRate', () => {
  it('计算环比增长率', () => {
    expect(growthRate(150, 100)).toBe(50)
    expect(growthRate(50, 100)).toBe(-50)
    expect(growthRate(100, 100)).toBe(0)
  })

  it('基数为 0 时返回 null（无基线）', () => {
    expect(growthRate(10, 0)).toBeNull()
    expect(growthRate(0, 0)).toBeNull()
  })
})

describe('utils/reportAnalysis - levelOf', () => {
  it('按阈值分三级', () => {
    expect(levelOf(75)).toBe('good')
    expect(levelOf(90)).toBe('good')
    expect(levelOf(50)).toBe('warning')
    expect(levelOf(74.9)).toBe('warning')
    expect(levelOf(49.9)).toBe('danger')
  })
})

describe('utils/reportAnalysis - sumWindow / periodGrowth', () => {
  const rows = [1, 2, 3, 4, 5, 6, 7]

  it('sumWindow 取末尾 N 段与上一段', () => {
    expect(sumWindow(rows, 3, (v) => v)).toBe(18)
    expect(sumWindow(rows, 3, (v) => v, 3)).toBe(9)
  })

  it('periodGrowth 比较相邻两段', () => {
    expect(periodGrowth(rows, 3, (v) => v)).toEqual({ current: 18, previous: 9, rate: 100 })
  })

  it('数据不足 window*2 时上一段自动收缩', () => {
    expect(periodGrowth([1, 2, 3], 3, (v) => v)).toEqual({ current: 6, previous: 0, rate: null })
  })
})

describe('utils/reportAnalysis - peakOf', () => {
  it('返回最大值所在行', () => {
    const rows = [{ v: 1 }, { v: 9 }, { v: 4 }]
    expect(peakOf(rows, (r) => r.v)).toEqual({ row: rows[1], value: 9 })
  })

  it('空数组返回 null', () => {
    expect(peakOf([], (r: any) => r.v)).toBeNull()
  })
})

describe('utils/reportAnalysis - buildHealth', () => {
  it('五项指标加权得到健康度', () => {
    const { score, level, metrics } = buildHealth({
      students: 100,
      active30d: 80,
      avgProgress: 60,
      passRate: 70,
      coursesTotal: 10,
      coursesPublished: 8,
      enrolledStudents: 50,
      commentLikes: 80,
      commentReplies: 70,
    })
    expect(score).toBe(76)
    expect(level).toBe('good')
    expect(metrics.map((m) => m.key)).toEqual(['active', 'completion', 'pass', 'publish', 'interaction'])
    expect(metrics[0]).toMatchObject({ value: 80, score: 80, level: 'good' })
    expect(metrics[3]).toMatchObject({ value: 80, level: 'good' })
    expect(metrics[4].value).toBe(100)
  })

  it('全为 0 时不抛错且评估为预警', () => {
    const { score, level, metrics } = buildHealth({
      students: 0,
      active30d: 0,
      avgProgress: 0,
      passRate: 0,
      coursesTotal: 0,
      coursesPublished: 0,
      enrolledStudents: 0,
      commentLikes: 0,
      commentReplies: 0,
    })
    expect(score).toBe(0)
    expect(level).toBe('danger')
    for (const m of metrics) expect(m.score).toBe(0)
  })
})

describe('utils/reportAnalysis - scoreStructure', () => {
  it('按分档汇总优秀/良好/及格/不及格', () => {
    const s = scoreStructure([
      { band: '90-100', count: 2 },
      { band: '80-89', count: 3 },
      { band: '70-79', count: 4 },
      { band: '60-69', count: 1 },
      { band: '0-59', count: 10 },
    ])
    expect(s).toMatchObject({ total: 20, excellent: 5, good: 4, pass: 1, fail: 10 })
    expect(s.excellentRate).toBe(25)
    expect(s.passRate).toBe(50)
    expect(s.failRate).toBe(50)
  })

  it('忽略未知分档且空输入返回 0', () => {
    const s = scoreStructure([{ band: 'unknown', count: 99 }])
    expect(s.total).toBe(0)
    expect(s.passRate).toBe(0)
  })
})

describe('utils/reportAnalysis - buildAlerts', () => {
  const empty = {
    showcasesPending: 0,
    pendingComments: 0,
    unansweredQuestions: 0,
    draftCourses: 0,
    activeRate: 0,
    passRate: 0,
    atRisk: 0,
    learningRate: null,
  }

  it('无风险返回空数组', () => {
    expect(buildAlerts(empty)).toEqual([])
  })

  it('按严重程度排序且插值参数正确', () => {
    const alerts = buildAlerts({
      showcasesPending: 2,
      pendingComments: 1,
      unansweredQuestions: 5,
      draftCourses: 4,
      activeRate: 30,
      passRate: 50,
      atRisk: 3,
      learningRate: -20,
    })
    expect(alerts).toHaveLength(8)
    expect(alerts[0]).toMatchObject({ key: 'lowPass', level: 'danger', params: { n: 50 } })
    const atRisk = alerts.find((a) => a.key === 'atRisk')
    expect(atRisk).toMatchObject({ level: 'warning', params: { n: 3 } })
    const down = alerts.find((a) => a.key === 'learningDown')
    expect(down).toMatchObject({ params: { n: 20 } })
  })

  it('环比为正不产生下降告警', () => {
    expect(buildAlerts({ ...empty, learningRate: 12 })).toEqual([])
  })
})
