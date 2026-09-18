/**
 * 平台学习数据总览（admin 全局报告）
 *
 * 数据来源全部为现有表，无需改 schema：
 * - 规模：users / classes / courses / chapters / categories / 各内容表
 * - 参与：user_questions / user_homeworks / user_quizzes（提交量 + 按 updated_at 的每日趋势）
 * - 成绩：user_courses（总分 + 7 个分项 + records.progress 章节通过比）
 * - 游戏化：user_courses.exp / coin、user_medals
 * - 内容质量：questions.submit_count / correct_count（题目正确率）
 * - 互动：comments / user_comments / showcases / peer_reviews
 *
 * 注意（口径）：
 * - 无「行为事件流」表，故「每日学习行为」用各 user_*.updated_at 近似，
 *   且按 DB 会话时区切天（与 stats.ts 保持一致）。
 * - user_chapters.read_time 与 activities 表当前无写入方，未纳入指标。
 * - 软删除：统一过滤 deleted_at（showcase_likes / showcase_users 无该列，跳过）。
 */

import { db, schema } from '@nuxthub/db'
import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm'

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round2 = (v: number): number => Math.round(v * 100) / 100

/** 成绩分档标签（0~100 分） */
export function bandScore(score: number): string {
  if (score >= 90) return '90-100'
  if (score >= 80) return '80-89'
  if (score >= 70) return '70-79'
  if (score >= 60) return '60-69'
  return '0-59'
}

/** 学习进度分档标签（0~100%） */
export function bandProgress(progress: number): string {
  if (progress >= 90) return '90-100%'
  if (progress >= 70) return '70-89%'
  if (progress >= 40) return '40-69%'
  if (progress > 0) return '1-39%'
  return '0%'
}

/** 最近 days 天的日期序列（YYYY-MM-DD，UTC），用于补齐趋势图空缺日期 */
export function recentDates(days: number, now: Date = new Date()): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10))
  }
  return out
}

/** 未软删除行数统计（不传条件 = 全表） */
async function countRows(table: any, ...conds: any[]): Promise<number> {
  const rows: any[] = await db
    .select({ count: sql`count(*)`.as('count') })
    .from(table)
    .where(conds.length ? and(...conds) : undefined)
  return num(rows[0]?.count)
}

/** 某表按天聚合行数（dateColumn 通常为 updated_at） */
async function dailyCounts(table: any, dateColumn: any, since: Date): Promise<Map<string, number>> {
  const rows: any[] = await db
    .select({
      date: sql<string>`to_char(${dateColumn}::date, 'YYYY-MM-DD')`.as('date'),
      count: sql`count(*)`.as('count'),
    })
    .from(table)
    .where(and(isNull(table.deletedAt), gte(dateColumn, since)))
    .groupBy(sql`${dateColumn}::date`)
    .orderBy(sql`${dateColumn}::date`)
  const map = new Map<string, number>()
  for (const r of rows) map.set(String(r.date), num(r.count))
  return map
}

/** user_courses.records->>'progress' 的安全数值表达式（非 number 类型记为 0） */
const progressExpr = sql`(case when jsonb_typeof(${schema.userCourses.records} -> 'progress') = 'number' then (${schema.userCourses.records} ->> 'progress')::numeric else 0 end)`

/** 近 N 天日期范围起点 */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000)
}

/**
 * 平台全局总览数据
 */
export async function getPlatformReport() {
  const d7 = daysAgo(7)
  const d14 = daysAgo(14)
  const d30 = daysAgo(30)

  // ── 1. 规模计数（并发） ──
  const [
    usersTotal, newUsers7d, newUsers30d, active7d, active30d,
    classesTotal,
    coursesTotal, coursesPublished, coursesDraft, coursesArchived,
    categoriesTotal, chaptersTotal,
    questionsTotal, homeworksTotal, quizzesTotal, racesTotal, commentsTotal,
    peerReviewsTotal, announcementsTotal,
    medalsTotal, medalsAwarded, goodsTotal,
    showcasesTotal, showcasesApproved, showcasesPending, showcaseLikesTotal,
  ] = await Promise.all([
    countRows(schema.users, isNull(schema.users.deletedAt)),
    countRows(schema.users, isNull(schema.users.deletedAt), gte(schema.users.createdAt, d7)),
    countRows(schema.users, isNull(schema.users.deletedAt), gte(schema.users.createdAt, d30)),
    countRows(schema.users, isNull(schema.users.deletedAt), gte(schema.users.loginAt, d7)),
    countRows(schema.users, isNull(schema.users.deletedAt), gte(schema.users.loginAt, d30)),
    countRows(schema.classes, isNull(schema.classes.deletedAt)),
    countRows(schema.courses, isNull(schema.courses.deletedAt)),
    countRows(schema.courses, isNull(schema.courses.deletedAt), eq(schema.courses.status, 'published')),
    countRows(schema.courses, isNull(schema.courses.deletedAt), eq(schema.courses.status, 'draft')),
    countRows(schema.courses, isNull(schema.courses.deletedAt), eq(schema.courses.status, 'archived')),
    countRows(schema.categories, isNull(schema.categories.deletedAt)),
    countRows(schema.chapters, isNull(schema.chapters.deletedAt)),
    countRows(schema.questions, isNull(schema.questions.deletedAt)),
    countRows(schema.homeworks, isNull(schema.homeworks.deletedAt)),
    countRows(schema.quizzes, isNull(schema.quizzes.deletedAt)),
    countRows(schema.races, isNull(schema.races.deletedAt)),
    countRows(schema.comments, isNull(schema.comments.deletedAt)),
    countRows(schema.peerReviews, isNull(schema.peerReviews.deletedAt)),
    countRows(schema.announcements, isNull(schema.announcements.deletedAt)),
    countRows(schema.medals, isNull(schema.medals.deletedAt)),
    countRows(schema.userMedals, isNull(schema.userMedals.deletedAt)),
    countRows(schema.goods, isNull(schema.goods.deletedAt)),
    countRows(schema.showcases, isNull(schema.showcases.deletedAt)),
    countRows(schema.showcases, isNull(schema.showcases.deletedAt), eq(schema.showcases.status, 'approved')),
    countRows(schema.showcases, isNull(schema.showcases.deletedAt), eq(schema.showcases.status, 'pending')),
    countRows(schema.showcaseLikes),
  ])

  // ── 2. 角色分布（user_roles × roles） ──
  const roleRows: any[] = await db
    .select({
      code: schema.roles.code,
      name: schema.roles.name,
      count: sql`count(*)`.as('count'),
    })
    .from(schema.userRoles)
    .innerJoin(schema.roles, sql`${schema.userRoles.roleId} = ${schema.roles.id}`)
    .where(and(isNull(schema.userRoles.deletedAt), isNull(schema.roles.deletedAt)))
    .groupBy(schema.roles.code, schema.roles.name)
  const roleDistribution = roleRows.map((r) => ({ name: String(r.name), value: num(r.count) }))
  const roleCount = (code: string) => num(roleRows.find((r) => r.code === code)?.count)
  const students = roleCount('student')
  const teachers = roleCount('teacher')
  const admins = roleCount('admin')

  // ── 3. 用户增长（30 天按天） ──
  const userGrowthRows: any[] = await db
    .select({
      date: sql<string>`to_char(${schema.users.createdAt}::date, 'YYYY-MM-DD')`.as('date'),
      count: sql`count(*)`.as('count'),
    })
    .from(schema.users)
    .where(and(isNull(schema.users.deletedAt), gte(schema.users.createdAt, d30)))
    .groupBy(sql`${schema.users.createdAt}::date`)
    .orderBy(sql`${schema.users.createdAt}::date`)
  const userGrowth = userGrowthRows.map((r) => ({ date: String(r.date), count: num(r.count) }))

  // ── 4. 每日学习行为（近 14 天，按 updated_at 近似） ──
  const [qDaily, hDaily, zDaily] = await Promise.all([
    dailyCounts(schema.userQuestions, schema.userQuestions.updatedAt, d14),
    dailyCounts(schema.userHomeworks, schema.userHomeworks.updatedAt, d14),
    dailyCounts(schema.userQuizzes, schema.userQuizzes.updatedAt, d14),
  ])
  const learningTrend = recentDates(14).map((date) => {
    const question = qDaily.get(date) || 0
    const homework = hDaily.get(date) || 0
    const quiz = zDaily.get(date) || 0
    return { date, question, homework, quiz, total: question + homework + quiz }
  })

  // ── 5. 平台能力均分（7 个分项） ──
  const [abilityRow]: any[] = await db
    .select({
      question: sql`coalesce(avg(${schema.userCourses.questionScore}), 0)`.as('question'),
      homework: sql`coalesce(avg(${schema.userCourses.homeworkScore}), 0)`.as('homework'),
      quiz: sql`coalesce(avg(${schema.userCourses.quizScore}), 0)`.as('quiz'),
      comment: sql`coalesce(avg(${schema.userCourses.commentScore}), 0)`.as('comment'),
      attitude: sql`coalesce(avg(${schema.userCourses.attitudeScore}), 0)`.as('attitude'),
      peer: sql`coalesce(avg(${schema.userCourses.peerScore}), 0)`.as('peer'),
      external: sql`coalesce(avg(${schema.userCourses.externalScore}), 0)`.as('external'),
    })
    .from(schema.userCourses)
    .where(isNull(schema.userCourses.deletedAt))
  const abilityRadar = [
    { key: 'question', value: round2(num(abilityRow?.question)) },
    { key: 'homework', value: round2(num(abilityRow?.homework)) },
    { key: 'quiz', value: round2(num(abilityRow?.quiz)) },
    { key: 'comment', value: round2(num(abilityRow?.comment)) },
    { key: 'attitude', value: round2(num(abilityRow?.attitude)) },
    { key: 'peer', value: round2(num(abilityRow?.peer)) },
    { key: 'external', value: round2(num(abilityRow?.external)) },
  ]

  // ── 6. 成绩 / 进度分布 ──
  const scoreBandExpr = sql<string>`case
    when ${schema.userCourses.score} >= 90 then '90-100'
    when ${schema.userCourses.score} >= 80 then '80-89'
    when ${schema.userCourses.score} >= 70 then '70-79'
    when ${schema.userCourses.score} >= 60 then '60-69'
    else '0-59' end`
  const scoreRows: any[] = await db
    .select({ band: scoreBandExpr.as('band'), count: sql`count(*)`.as('count') })
    .from(schema.userCourses)
    .where(isNull(schema.userCourses.deletedAt))
    .groupBy(scoreBandExpr)

  const progressBandExpr = sql<string>`case
    when ${progressExpr} >= 90 then '90-100%'
    when ${progressExpr} >= 70 then '70-89%'
    when ${progressExpr} >= 40 then '40-69%'
    when ${progressExpr} > 0 then '1-39%'
    else '0%' end`
  const progressRows: any[] = await db
    .select({ band: progressBandExpr.as('band'), count: sql`count(*)`.as('count') })
    .from(schema.userCourses)
    .where(isNull(schema.userCourses.deletedAt))
    .groupBy(progressBandExpr)

  // ── 7. 游戏化资产 ──
  const [assetRow]: any[] = await db
    .select({
      exp: sql`coalesce(sum(${schema.userCourses.exp}), 0)`.as('exp'),
      coin: sql`coalesce(sum(${schema.userCourses.coin}), 0)`.as('coin'),
      enrollments: sql`count(*)`.as('enrollments'),
    })
    .from(schema.userCourses)
    .where(isNull(schema.userCourses.deletedAt))

  // ── 7b. 全局均分 / 在读规模（供分析洞察：达标率、完成度、人均互动） ──
  const [analyticsRow]: any[] = await db
    .select({
      avgScore: sql`coalesce(avg(${schema.userCourses.score}), 0)`.as('avg_score'),
      avgProgress: sql`coalesce(avg(${progressExpr}), 0)`.as('avg_progress'),
      enrolledStudents: sql`count(distinct ${schema.userCourses.userId})`.as('enrolled_students'),
    })
    .from(schema.userCourses)
    .where(isNull(schema.userCourses.deletedAt))

  // ── 8. 课程排行（按选课人数） ──
  const courseRows: any[] = await db
    .select({
      courseId: schema.userCourses.courseId,
      students: sql`count(*)`.as('students'),
      avgScore: sql`coalesce(avg(${schema.userCourses.score}), 0)`.as('avg_score'),
      avgProgress: sql`coalesce(avg(${progressExpr}), 0)`.as('avg_progress'),
      avgExp: sql`coalesce(avg(${schema.userCourses.exp}), 0)`.as('avg_exp'),
    })
    .from(schema.userCourses)
    .where(isNull(schema.userCourses.deletedAt))
    .groupBy(schema.userCourses.courseId)
    .orderBy(sql`count(*) desc`)
    .limit(8)
  const courseIds = courseRows.map((r) => num(r.courseId)).filter((id) => id > 0)
  const courseNameRows: any[] = courseIds.length
    ? await db
      .select({ id: schema.courses.id, name: schema.courses.name })
      .from(schema.courses)
      .where(inArray(schema.courses.id, courseIds))
    : []
  const courseNames = new Map(courseNameRows.map((r) => [num(r.id), String(r.name)]))
  const courseRanking = courseRows.map((r) => ({
    courseId: num(r.courseId),
    name: courseNames.get(num(r.courseId)) || `#${num(r.courseId)}`,
    students: num(r.students),
    avgScore: round2(num(r.avgScore)),
    avgProgress: round2(num(r.avgProgress)),
    avgExp: round2(num(r.avgExp)),
  }))

  // ── 9. 学生排行（全平台累计分 / 经验） ──
  const studentRows: any[] = await db
    .select({
      userId: schema.userCourses.userId,
      name: schema.users.name,
      classId: schema.users.classId,
      score: sql`coalesce(sum(${schema.userCourses.score}), 0)`.as('score'),
      exp: sql`coalesce(sum(${schema.userCourses.exp}), 0)`.as('exp'),
      coin: sql`coalesce(sum(${schema.userCourses.coin}), 0)`.as('coin'),
    })
    .from(schema.userCourses)
    .innerJoin(schema.users, eq(schema.users.id, schema.userCourses.userId))
    .where(isNull(schema.userCourses.deletedAt))
    .groupBy(schema.userCourses.userId, schema.users.name, schema.users.classId)
    .orderBy(sql`coalesce(sum(${schema.userCourses.score}), 0) desc`)
    .limit(10)

  // ── 9b. 学困生预警（累计分最低的在读学生，用于提前干预） ──
  const riskRows: any[] = await db
    .select({
      userId: schema.userCourses.userId,
      name: schema.users.name,
      classId: schema.users.classId,
      score: sql`coalesce(sum(${schema.userCourses.score}), 0)`.as('score'),
      avgProgress: sql`coalesce(avg(${progressExpr}), 0)`.as('avg_progress'),
      exp: sql`coalesce(sum(${schema.userCourses.exp}), 0)`.as('exp'),
    })
    .from(schema.userCourses)
    .innerJoin(schema.users, eq(schema.users.id, schema.userCourses.userId))
    .where(isNull(schema.userCourses.deletedAt))
    .groupBy(schema.userCourses.userId, schema.users.name, schema.users.classId)
    .orderBy(sql`coalesce(sum(${schema.userCourses.score}), 0) asc`)
    .limit(10)

  const classIds = [...new Set(
    [...studentRows, ...riskRows].map((r) => num(r.classId)).filter((id) => id > 0),
  )]
  const classNameRows: any[] = classIds.length
    ? await db
      .select({ id: schema.classes.id, name: schema.classes.name })
      .from(schema.classes)
      .where(inArray(schema.classes.id, classIds))
    : []
  const classNames = new Map(classNameRows.map((r) => [num(r.id), String(r.name)]))
  const topStudents = studentRows.map((r, idx) => ({
    rank: idx + 1,
    userId: num(r.userId),
    name: String(r.name || `#${num(r.userId)}`),
    className: classNames.get(num(r.classId)) || '—',
    score: round2(num(r.score)),
    exp: num(r.exp),
    coin: num(r.coin),
  }))
  const atRiskStudents = riskRows.map((r, idx) => ({
    rank: idx + 1,
    userId: num(r.userId),
    name: String(r.name || `#${num(r.userId)}`),
    className: classNames.get(num(r.classId)) || '—',
    score: round2(num(r.score)),
    avgProgress: round2(num(r.avgProgress)),
    exp: num(r.exp),
  }))

  // ── 10. 内容质量 ──
  const questionBase = {
    courseId: schema.questions.courseId,
    cid: schema.questions.cid,
    name: schema.questions.name,
    submitCount: schema.questions.submitCount,
    correctCount: schema.questions.correctCount,
    difficulty: schema.questions.difficulty,
  }
  const [hardestRows, easiestRows, unansweredQuestions] = await Promise.all([
    db
      .select(questionBase)
      .from(schema.questions)
      .where(and(isNull(schema.questions.deletedAt), sql`coalesce(${schema.questions.submitCount}, 0) > 0`))
      .orderBy(sql`${schema.questions.correctCount}::numeric / nullif(${schema.questions.submitCount}, 0) asc`)
      .limit(5) as Promise<any[]>,
    db
      .select(questionBase)
      .from(schema.questions)
      .where(and(isNull(schema.questions.deletedAt), sql`coalesce(${schema.questions.submitCount}, 0) > 0`))
      .orderBy(sql`${schema.questions.correctCount}::numeric / nullif(${schema.questions.submitCount}, 0) desc`)
      .limit(5) as Promise<any[]>,
    countRows(schema.questions, isNull(schema.questions.deletedAt), sql`coalesce(${schema.questions.submitCount}, 0) = 0`),
  ])
  const mapQuestion = (r: any) => {
    const submitCount = num(r.submitCount)
    const correctCount = num(r.correctCount)
    return {
      courseId: num(r.courseId),
      cid: num(r.cid),
      name: String(r.name || `#${num(r.cid)}`),
      submitCount,
      correctCount,
      correctRate: submitCount > 0 ? round2((correctCount / submitCount) * 100) : 0,
    }
  }

  const [quizQuality]: any[] = await db
    .select({
      submissions: sql`count(*)`.as('submissions'),
      students: sql`count(distinct ${schema.userQuizzes.userId})`.as('students'),
      avgScore: sql`coalesce(avg(${schema.userQuizzes.score}), 0)`.as('avg_score'),
    })
    .from(schema.userQuizzes)
    .where(isNull(schema.userQuizzes.deletedAt))
  const [homeworkQuality]: any[] = await db
    .select({
      submissions: sql`count(${schema.userHomeworks.score})`.as('submissions'),
      avgScore: sql`coalesce(avg(${schema.userHomeworks.score}), 0)`.as('avg_score'),
      excellent: sql`count(*) filter (where ${schema.userHomeworks.excellent} = true)`.as('excellent'),
    })
    .from(schema.userHomeworks)
    .where(isNull(schema.userHomeworks.deletedAt))
  const [commentQuality]: any[] = await db
    .select({
      pending: sql`count(*) filter (where ${schema.comments.status} = 'audit')`.as('pending'),
      replies: sql`count(*) filter (where ${schema.comments.parentId} is not null)`.as('replies'),
    })
    .from(schema.comments)
    .where(isNull(schema.comments.deletedAt))
  const commentLikes = await countRows(
    schema.userComments,
    isNull(schema.userComments.deletedAt),
    eq(schema.userComments.like, true),
  )

  // ── 11. 内容分布（柱状） ──
  const contentDistribution = [
    { key: 'courses', value: coursesTotal },
    { key: 'chapters', value: chaptersTotal },
    { key: 'questions', value: questionsTotal },
    { key: 'homeworks', value: homeworksTotal },
    { key: 'quizzes', value: quizzesTotal },
    { key: 'races', value: racesTotal },
    { key: 'comments', value: commentsTotal },
    { key: 'showcases', value: showcasesTotal },
  ]

  return {
    generatedAt: new Date().toISOString(),
    kpi: {
      users: { total: usersTotal, students, teachers, admins, new7d: newUsers7d, new30d: newUsers30d, active7d, active30d },
      classes: classesTotal,
      courses: { total: coursesTotal, published: coursesPublished, draft: coursesDraft, archived: coursesArchived },
      contents: {
        categories: categoriesTotal,
        chapters: chaptersTotal,
        questions: questionsTotal,
        homeworks: homeworksTotal,
        quizzes: quizzesTotal,
        races: racesTotal,
        comments: commentsTotal,
        peerReviews: peerReviewsTotal,
        announcements: announcementsTotal,
      },
      gamification: {
        exp: num(assetRow?.exp),
        coin: num(assetRow?.coin),
        enrollments: num(assetRow?.enrollments),
        medals: medalsTotal,
        medalsAwarded,
        goods: goodsTotal,
      },
      interaction: {
        showcases: showcasesTotal,
        showcasesApproved,
        showcasesPending,
        showcaseLikes: showcaseLikesTotal,
        commentLikes,
        commentReplies: num(commentQuality?.replies),
      },
    },
    roleDistribution,
    contentDistribution,
    userGrowth,
    learningTrend,
    abilityRadar,
    scoreDistribution: scoreRows.map((r) => ({ band: String(r.band), count: num(r.count) })),
    progressDistribution: progressRows.map((r) => ({ band: String(r.band), count: num(r.count) })),
    courseRanking,
    topStudents,
    atRiskStudents,
    analytics: {
      avgScore: round2(num(analyticsRow?.avgScore)),
      avgProgress: round2(num(analyticsRow?.avgProgress)),
      enrolledStudents: num(analyticsRow?.enrolledStudents),
    },
    contentQuality: {
      hardest: hardestRows.map(mapQuestion),
      easiest: easiestRows.map(mapQuestion),
      unansweredQuestions,
      quiz: {
        submissions: num(quizQuality?.submissions),
        students: num(quizQuality?.students),
        avgScore: round2(num(quizQuality?.avgScore)),
      },
      homework: {
        submissions: num(homeworkQuality?.submissions),
        avgScore: round2(num(homeworkQuality?.avgScore)),
        excellent: num(homeworkQuality?.excellent),
      },
      comments: {
        pending: num(commentQuality?.pending),
        replies: num(commentQuality?.replies),
        likes: commentLikes,
      },
    },
  }
}

export type PlatformReport = Awaited<ReturnType<typeof getPlatformReport>>
