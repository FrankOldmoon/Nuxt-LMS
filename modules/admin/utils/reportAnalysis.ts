/**
 * /report 页面的「分析层」纯函数
 *
 * 只对 getPlatformReport 返回的原始计数做二次加工，不引入新的数据来源：
 * - 环比增长：最近 N 天 vs 前 N 天
 * - 平台健康度：活跃 / 完成 / 达标 / 发布 / 互动 五项加权评分
 * - 成绩结构：优秀 / 良好 / 及格 / 不及格 占比
 * - 风险提示：由关键指标派生待处理项
 *
 * 均为无副作用纯函数，便于单测（test/unit/reportAnalysis.test.ts）。
 */

export type InsightLevel = 'good' | 'warning' | 'danger'

export interface InsightMetric {
  key: string
  /** 指标当前值（百分比，0-100，1 位小数） */
  value: number
  /** 归一化得分（0-100），决定进度条宽度与加权 */
  score: number
  level: InsightLevel
}

export interface AlertItem {
  key: string
  level: InsightLevel
  /** i18n 插值参数 */
  params?: Record<string, number>
}

/** 数值保留 1 位小数 */
const round1 = (v: number): number => Math.round(v * 10) / 10

/** 限制在 0-100 区间 */
const clamp100 = (v: number): number => Math.max(0, Math.min(100, round1(v)))

const SEVERITY: Record<InsightLevel, number> = { danger: 0, warning: 1, good: 2 }

/** 占比（0-100，1 位小数）；分母非正时返回 0 */
export function percentOf(part: number, total: number): number {
  if (!total || total <= 0) return 0
  return round1((part / total) * 100)
}

/** 环比增长率（%，1 位小数）；基数为 0 时返回 null（无基线） */
export function growthRate(current: number, previous: number): number | null {
  if (!previous || previous <= 0) return null
  return round1(((current - previous) / previous) * 100)
}

/** 按阈值给出等级：>=75 良好 / >=50 关注 / 其余预警 */
export function levelOf(score: number): InsightLevel {
  if (score >= 75) return 'good'
  if (score >= 50) return 'warning'
  return 'danger'
}

/** 取数组末尾 window 段之和；offset=window 即上一段（用于环比） */
export function sumWindow<T>(rows: T[], window: number, pick: (row: T) => number, offset = 0): number {
  const end = rows.length - offset
  const start = Math.max(0, end - window)
  let sum = 0
  for (let i = start; i < end; i++) sum += pick(rows[i]) || 0
  return sum
}

/** 环比：最近 window 段 vs 前一段 */
export function periodGrowth<T>(
  rows: T[],
  window: number,
  pick: (row: T) => number,
): { current: number; previous: number; rate: number | null } {
  const current = sumWindow(rows, window, pick)
  const previous = sumWindow(rows, window, pick, window)
  return { current, previous, rate: growthRate(current, previous) }
}

/** 峰值项（最大值所在行）；空数组返回 null */
export function peakOf<T>(rows: T[], pick: (row: T) => number): { row: T; value: number } | null {
  if (!rows.length) return null
  let best = rows[0]
  let bestVal = pick(best) || 0
  for (const row of rows) {
    const v = pick(row) || 0
    if (v > bestVal) {
      best = row
      bestVal = v
    }
  }
  return { row: best, value: bestVal }
}

export interface HealthInput {
  /** 学生总数 */
  students: number
  /** 近 30 天登录学生数 */
  active30d: number
  /** 平台平均章节进度（%） */
  avgProgress: number
  /** 成绩及格率（%） */
  passRate: number
  /** 课程总数 */
  coursesTotal: number
  /** 已发布课程数 */
  coursesPublished: number
  /** 在读（有选课记录）学生数 */
  enrolledStudents: number
  /** 评论获赞总数 */
  commentLikes: number
  /** 评论回复总数 */
  commentReplies: number
}

/** 互动活跃度目标：在读学生人均 3 次互动记满分 */
const INTERACTION_TARGET_PER_STUDENT = 3

/** 平台健康度：五项指标归一化后加权求和（活跃 .2 / 完成 .25 / 达标 .25 / 发布 .15 / 互动 .15） */
export function buildHealth(input: HealthInput): {
  score: number
  level: InsightLevel
  metrics: InsightMetric[]
} {
  const active = clamp100(percentOf(input.active30d, input.students))
  const completion = clamp100(input.avgProgress)
  const pass = clamp100(input.passRate)
  const publish = clamp100(percentOf(input.coursesPublished, input.coursesTotal))
  const perStudent = input.enrolledStudents > 0
    ? (input.commentLikes + input.commentReplies) / input.enrolledStudents
    : 0
  const interaction = clamp100(percentOf(perStudent, INTERACTION_TARGET_PER_STUDENT))

  const metrics: InsightMetric[] = [
    { key: 'active', value: active, score: active, level: levelOf(active) },
    { key: 'completion', value: completion, score: completion, level: levelOf(completion) },
    { key: 'pass', value: pass, score: pass, level: levelOf(pass) },
    { key: 'publish', value: publish, score: publish, level: levelOf(publish) },
    { key: 'interaction', value: interaction, score: interaction, level: levelOf(interaction) },
  ]

  const weights: Record<string, number> = {
    active: 0.2,
    completion: 0.25,
    pass: 0.25,
    publish: 0.15,
    interaction: 0.15,
  }
  const score = Math.round(metrics.reduce((acc, m) => acc + m.score * (weights[m.key] ?? 0), 0))
  return { score, level: levelOf(score), metrics }
}

export interface ScoreStructure {
  total: number
  excellent: number
  good: number
  pass: number
  fail: number
  excellentRate: number
  passRate: number
  failRate: number
}

const BAND_EXCELLENT = ['90-100', '80-89']
const BAND_GOOD = ['70-79']
const BAND_PASS = ['60-69']
const BAND_FAIL = ['0-59']

/** 由成绩分档分布计算优秀 / 良好 / 及格 / 不及格结构（及格 = 总分 >=60） */
export function scoreStructure(distribution: { band: string; count: number }[]): ScoreStructure {
  const lookup = new Map(distribution.map((d) => [d.band, Number(d.count) || 0]))
  const sum = (bands: string[]) => bands.reduce((acc, b) => acc + (lookup.get(b) ?? 0), 0)
  const excellent = sum(BAND_EXCELLENT)
  const good = sum(BAND_GOOD)
  const pass = sum(BAND_PASS)
  const fail = sum(BAND_FAIL)
  const total = excellent + good + pass + fail
  const passed = excellent + good + pass
  return {
    total,
    excellent,
    good,
    pass,
    fail,
    excellentRate: percentOf(excellent, total),
    passRate: percentOf(passed, total),
    failRate: percentOf(fail, total),
  }
}

export interface AlertInput {
  showcasesPending: number
  pendingComments: number
  unansweredQuestions: number
  draftCourses: number
  /** 学生活跃率（%） */
  activeRate: number
  /** 成绩及格率（%） */
  passRate: number
  /** 学困生数量 */
  atRisk: number
  /** 学习行为环比（%），null 表示无基线 */
  learningRate: number | null
}

/** 由关键指标派生风险提示，按严重程度排序（danger 优先） */
export function buildAlerts(input: AlertInput): AlertItem[] {
  const alerts: AlertItem[] = []
  if (input.passRate > 0 && input.passRate < 60) {
    alerts.push({ key: 'lowPass', level: 'danger', params: { n: Math.round(input.passRate) } })
  }
  if (input.atRisk > 0) {
    alerts.push({ key: 'atRisk', level: 'warning', params: { n: input.atRisk } })
  }
  if (input.learningRate !== null && input.learningRate < 0) {
    alerts.push({ key: 'learningDown', level: 'warning', params: { n: Math.abs(Math.round(input.learningRate)) } })
  }
  if (input.activeRate > 0 && input.activeRate < 40) {
    alerts.push({ key: 'lowActive', level: 'warning', params: { n: Math.round(input.activeRate) } })
  }
  if (input.showcasesPending > 0) {
    alerts.push({ key: 'showcasesPending', level: 'warning', params: { n: input.showcasesPending } })
  }
  if (input.pendingComments > 0) {
    alerts.push({ key: 'pendingComments', level: 'warning', params: { n: input.pendingComments } })
  }
  if (input.unansweredQuestions > 0) {
    alerts.push({ key: 'unanswered', level: 'warning', params: { n: input.unansweredQuestions } })
  }
  if (input.draftCourses > 0) {
    alerts.push({ key: 'draftCourses', level: 'warning', params: { n: input.draftCourses } })
  }
  return alerts.sort((a, b) => SEVERITY[a.level] - SEVERITY[b.level])
}
