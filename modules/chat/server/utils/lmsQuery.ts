/**
 * LMS 学习数据查询（供 lms_query 工具使用）
 *
 * 这里返回的都是**小数据**（每人最多几十条），所以直接给模型文本；
 * 章节正文那种大对象走引用模式（见 tools.ts 的 show_chapter），不进上下文。
 *
 * 注意：`*Cid` 字段是课程内编号，关联实体表时要 (courseId, cid) 成对匹配，
 * 不能拿主键 id 去连。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, asc, desc, inArray, sql } from 'drizzle-orm'

const MAX_ROWS = 50

function fmtDate(v: any): string {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function capRows(lines: string[]): string {
  if (lines.length <= MAX_ROWS) return lines.join('\n')
  return [...lines.slice(0, MAX_ROWS), `…共 ${lines.length} 条，仅显示前 ${MAX_ROWS} 条`].join('\n')
}

/** 课程关系：true=教师，false=学生，null=无关 */
async function courseRole(userId: number, courseId: number) {
  const [row] = await db
    .select({ isTeacher: schema.userCourses.isTeacher })
    .from(schema.userCourses)
    .where(and(
      eq(schema.userCourses.userId, userId),
      eq(schema.userCourses.courseId, courseId),
    ))
    .limit(1)
  if (!row) return null
  return !!row.isTeacher
}

// ===================== 概览 =====================
async function overview(userId: number) {
  const [courses] = await db
    .select({
      total: sql<number>`count(*)::int`,
      teaching: sql<number>`count(*) filter (where ${schema.userCourses.isTeacher})::int`,
    })
    .from(schema.userCourses)
    .where(eq(schema.userCourses.userId, userId))

  const [chapters] = await db
    .select({
      total: sql<number>`count(*)::int`,
      passed: sql<number>`count(*) filter (where ${schema.userChapters.isPass})::int`,
      avg: sql<number>`coalesce(avg(${schema.userChapters.score}), 0)::float`,
      readSec: sql<number>`coalesce(sum(${schema.userChapters.readTime}), 0)::int`,
    })
    .from(schema.userChapters)
    .where(eq(schema.userChapters.userId, userId))

  const [hw] = await db
    .select({
      total: sql<number>`count(*)::int`,
      excellent: sql<number>`count(*) filter (where ${schema.userHomeworks.excellent})::int`,
    })
    .from(schema.userHomeworks)
    .where(eq(schema.userHomeworks.userId, userId))

  const [qz] = await db
    .select({
      total: sql<number>`count(*)::int`,
      avg: sql<number>`coalesce(avg(${schema.userQuizzes.score}), 0)::float`,
    })
    .from(schema.userQuizzes)
    .where(eq(schema.userQuizzes.userId, userId))

  const [qs] = await db
    .select({
      total: sql<number>`count(*)::int`,
      answered: sql<number>`coalesce(sum(${schema.userQuestions.submitCount}), 0)::int`,
      wrong: sql<number>`coalesce(sum(${schema.userQuestions.wrongCount}), 0)::int`,
      avgRate: sql<number>`coalesce(avg(${schema.userQuestions.correctRate}), 0)::float`,
    })
    .from(schema.userQuestions)
    .where(eq(schema.userQuestions.userId, userId))

  const [cm] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.userComments)
    .where(eq(schema.userComments.userId, userId))

  const [rc] = await db
    .select({
      total: sql<number>`count(*)::int`,
      avg: sql<number>`coalesce(avg(${schema.userRaces.score}), 0)::float`,
    })
    .from(schema.userRaces)
    .where(eq(schema.userRaces.userId, userId))

  const [fl] = await db
    .select({
      total: sql<number>`count(*)::int`,
      bytes: sql<number>`coalesce(sum(${schema.files.size}), 0)::int`,
    })
    .from(schema.files)
    .where(and(eq(schema.files.userId, userId), sql`${schema.files.deletedAt} is null`))

  const lines = [
    `课程：${courses?.total ?? 0} 门${courses?.teaching ? `（其中教师 ${courses.teaching} 门）` : ''}`,
    `章节：${chapters?.total ?? 0} 条记录，通过 ${chapters?.passed ?? 0} / 未通过 ${(chapters?.total ?? 0) - (chapters?.passed ?? 0)}，平均分 ${(chapters?.avg ?? 0).toFixed(1)}，累计阅读 ${Math.round((chapters?.readSec ?? 0) / 60)} 分钟`,
    `作业：${hw?.total ?? 0} 份已提交${hw?.excellent ? `（${hw.excellent} 份优秀）` : ''}`,
    `测验：${qz?.total ?? 0} 次，平均 ${(qz?.avg ?? 0).toFixed(1)} 分`,
    `题目：${qs?.total ?? 0} 道有作答记录，累计作答 ${qs?.answered ?? 0} 次，错误 ${qs?.wrong ?? 0} 次，最近一次平均得分率 ${Math.round((qs?.avgRate ?? 0) * 100)}%`,
    `竞赛：${rc?.total ?? 0} 场${rc?.total ? `，平均 ${(rc?.avg ?? 0).toFixed(1)} 分` : ''}`,
    `评论：${cm?.total ?? 0} 条`,
    `网盘资料：${fl?.total ?? 0} 个文件，共 ${((fl?.bytes ?? 0) / 1024 / 1024).toFixed(1)} MB`,
  ]
  return lines.join('\n')
}

// ===================== 明细查询 =====================
async function myCourses(userId: number) {
  const rows = await db
    .select({
      id: schema.courses.id,
      name: schema.courses.name,
      code: schema.courses.code,
      isTeacher: schema.userCourses.isTeacher,
      isEditor: schema.userCourses.isEditor,
      score: schema.userCourses.score,
    })
    .from(schema.userCourses)
    .innerJoin(schema.courses, eq(schema.userCourses.courseId, schema.courses.id))
    .where(eq(schema.userCourses.userId, userId))
    .orderBy(asc(schema.courses.id))

  if (!rows.length) return '没有参与任何课程。'
  return capRows(rows.map((r) => {
    const roles = [r.isTeacher ? '教师' : '', r.isEditor ? '编辑' : ''].filter(Boolean).join('/')
    return `#${r.id} ${r.name}${r.code ? `（${r.code}）` : ''}${roles ? ` [${roles}]` : ''}${r.score != null ? ` 总分 ${r.score}` : ''}`
  }))
}

async function courseChapters(userId: number, courseId: number) {
  const role = await courseRole(userId, courseId)
  if (role === null) return '错误：你没有参与该课程，无权查看'

  const rows = await db
    .select({ id: schema.chapters.id, name: schema.chapters.name, isOpen: schema.chapters.isOpen })
    .from(schema.chapters)
    .where(eq(schema.chapters.courseId, courseId))
    .orderBy(asc(schema.chapters.id))

  if (!rows.length) return '该课程还没有章节。'
  return capRows(rows.map((r) => `#${r.id} ${r.name}${r.isOpen ? '' : ' [未开放]'}`))
}

async function myProgress(userId: number, courseId: number) {
  const conds: any[] = [eq(schema.userChapters.userId, userId)]
  if (courseId) {
    const chapters = await db
      .select({ id: schema.chapters.id })
      .from(schema.chapters)
      .where(eq(schema.chapters.courseId, courseId))
    if (!chapters.length) return '该课程没有章节。'
    conds.push(inArray(schema.userChapters.chapterId, chapters.map((c) => c.id)))
  }

  const rows = await db
    .select({
      chapterId: schema.userChapters.chapterId,
      score: schema.userChapters.score,
      isPass: schema.userChapters.isPass,
      readTime: schema.userChapters.readTime,
      chapterName: schema.chapters.name,
      courseName: schema.courses.name,
    })
    .from(schema.userChapters)
    .leftJoin(schema.chapters, eq(schema.userChapters.chapterId, schema.chapters.id))
    .leftJoin(schema.courses, eq(schema.chapters.courseId, schema.courses.id))
    .where(and(...conds))
    .orderBy(asc(schema.userChapters.chapterId))

  if (!rows.length) return '暂无章节学习记录。'
  return capRows(rows.map((r) =>
    `#${r.chapterId} ${r.chapterName || '(未知章节)'}${r.courseName ? ` · ${r.courseName}` : ''}｜${r.isPass ? '已通过' : '未通过'}｜${r.score ?? '-'} 分｜阅读 ${r.readTime ?? 0}s`,
  ))
}

async function myHomeworks(userId: number, courseId: number, onlyUnscored: boolean) {
  const conds: any[] = [eq(schema.userHomeworks.userId, userId)]
  if (courseId) conds.push(eq(schema.userHomeworks.courseId, courseId))

  const rows = await db
    .select({
      cid: schema.userHomeworks.homeworkCid,
      courseId: schema.userHomeworks.courseId,
      score: schema.userHomeworks.score,
      excellent: schema.userHomeworks.excellent,
      createdAt: schema.userHomeworks.createdAt,
      name: schema.homeworks.name,
      point: schema.homeworks.point,
      deadline: schema.homeworks.deadline,
      courseName: schema.courses.name,
    })
    .from(schema.userHomeworks)
    .leftJoin(schema.homeworks, and(
      eq(schema.homeworks.courseId, schema.userHomeworks.courseId),
      eq(schema.homeworks.cid, schema.userHomeworks.homeworkCid),
    ))
    .leftJoin(schema.courses, eq(schema.courses.id, schema.userHomeworks.courseId))
    .where(and(...conds))
    .orderBy(desc(schema.userHomeworks.createdAt))

  if (!rows.length) return '没有作业提交记录。'
  const list = onlyUnscored ? rows.filter((r) => r.score == null) : rows
  if (!list.length) return '所有作业都已评分。'
  return capRows(list.map((r) => {
    const graded = r.score != null ? `${r.score}/${r.point ?? '-'} 分` : '待评分'
    return `第${r.cid}份 ${r.name || '(未知作业)'}${r.courseName ? ` @${r.courseName}` : ''}｜${graded}${r.excellent ? ' ⭐优秀' : ''}｜提交 ${fmtDate(r.createdAt)}`
  }))
}

async function myQuizzes(userId: number, courseId: number) {
  const conds: any[] = [eq(schema.userQuizzes.userId, userId)]
  if (courseId) conds.push(eq(schema.userQuizzes.courseId, courseId))

  const rows = await db
    .select({
      cid: schema.userQuizzes.quizCid,
      score: schema.userQuizzes.score,
      submitCount: schema.userQuizzes.submitCount,
      startedAt: schema.userQuizzes.startedAt,
      submittedAt: schema.userQuizzes.submitedAt,
      name: schema.quizzes.name,
      point: schema.quizzes.point,
      courseName: schema.courses.name,
    })
    .from(schema.userQuizzes)
    .leftJoin(schema.quizzes, and(
      eq(schema.quizzes.courseId, schema.userQuizzes.courseId),
      eq(schema.quizzes.cid, schema.userQuizzes.quizCid),
    ))
    .leftJoin(schema.courses, eq(schema.courses.id, schema.userQuizzes.courseId))
    .where(and(...conds))
    .orderBy(desc(schema.userQuizzes.submitedAt))

  if (!rows.length) return '没有测验记录。'
  return capRows(rows.map((r) =>
    `第${r.cid}次 ${r.name || '(未知测验)'}${r.courseName ? ` @${r.courseName}` : ''}｜${r.score ?? '-'}/${r.point ?? '-'} 分｜提交 ${r.submitCount ?? 0} 次｜最近提交 ${fmtDate(r.submitedAt || r.startedAt)}`,
  ))
}

async function myQuestions(userId: number, courseId: number, onlyWrong: boolean) {
  const conds: any[] = [eq(schema.userQuestions.userId, userId)]
  if (courseId) conds.push(eq(schema.userQuestions.courseId, courseId))

  const rows = await db
    .select({
      cid: schema.userQuestions.questionCid,
      score: schema.userQuestions.score,
      correctRate: schema.userQuestions.correctRate,
      wrongCount: schema.userQuestions.wrongCount,
      submitCount: schema.userQuestions.submitCount,
      name: schema.questions.name,
      type: schema.questions.type,
      difficulty: schema.questions.difficulty,
      point: schema.questions.point,
      courseName: schema.courses.name,
    })
    .from(schema.userQuestions)
    .leftJoin(schema.questions, and(
      eq(schema.questions.courseId, schema.userQuestions.courseId),
      eq(schema.questions.cid, schema.userQuestions.questionCid),
    ))
    .leftJoin(schema.courses, eq(schema.courses.id, schema.userQuestions.courseId))
    .where(and(...conds))
    .orderBy(desc(schema.userQuestions.wrongCount))

  if (!rows.length) return '没有题目作答记录。'
  const list = onlyWrong ? rows.filter((r) => (r.wrongCount ?? 0) > 0) : rows
  if (!list.length) return '没有做错过的题。'

  const lines = list.map((r) => {
    // correct_rate 是「最近一次提交的得分率」（0~1），不是历史正确率；
    // 历史表现要看 wrongCount / submitCount，两者一起给才不会误导
    const rate = Math.round((r.correctRate ?? 0) * 100)
    return `第${r.cid}题 ${(r.name || '(未知题目)').slice(0, 60)}${r.courseName ? ` @${r.courseName}` : ''}｜最近得分率 ${rate}%｜错 ${r.wrongCount ?? 0} 次 / 共 ${r.submitCount ?? 0} 次｜${r.score ?? '-'}/${r.point ?? '-'} 分`
  })
  return capRows(lines)
}

async function myComments(userId: number, courseId: number) {
  const conds: any[] = [eq(schema.userComments.userId, userId)]
  if (courseId) conds.push(eq(schema.userComments.courseId, courseId))

  const rows = await db
    .select({
      cid: schema.userComments.commentCid,
      like: schema.userComments.like,
      createdAt: schema.userComments.createdAt,
      name: schema.comments.name,
      courseName: schema.courses.name,
    })
    .from(schema.userComments)
    .leftJoin(schema.comments, and(
      eq(schema.comments.courseId, schema.userComments.courseId),
      eq(schema.comments.cid, schema.userComments.commentCid),
    ))
    .leftJoin(schema.courses, eq(schema.courses.id, schema.userComments.courseId))
    .where(and(...conds))
    .orderBy(desc(schema.userComments.createdAt))

  if (!rows.length) return '没有发表过讨论。'
  return capRows(rows.map((r) =>
    `第${r.cid}个 ${r.name || '(未知讨论)'}${r.courseName ? ` @${r.courseName}` : ''}｜获赞 ${r.like ?? 0}｜${fmtDate(r.createdAt)}`,
  ))
}

async function myRaces(userId: number, courseId: number) {
  const conds: any[] = [eq(schema.userRaces.userId, userId)]
  if (courseId) conds.push(eq(schema.userRaces.courseId, courseId))

  const rows = await db
    .select({
      cid: schema.userRaces.raceCid,
      score: schema.userRaces.score,
      createdAt: schema.userRaces.createdAt,
      name: schema.races.name,
      point: schema.races.point,
      courseName: schema.courses.name,
    })
    .from(schema.userRaces)
    .leftJoin(schema.races, and(
      eq(schema.races.courseId, schema.userRaces.courseId),
      eq(schema.races.cid, schema.userRaces.raceCid),
    ))
    .leftJoin(schema.courses, eq(schema.courses.id, schema.userRaces.courseId))
    .where(and(...conds))
    .orderBy(desc(schema.userRaces.createdAt))

  if (!rows.length) return '没有竞赛记录。'
  return capRows(rows.map((r) =>
    `第${r.cid}场 ${r.name || '(未知竞赛)'}${r.courseName ? ` @${r.courseName}` : ''}｜${r.score ?? '-'}/${r.point ?? '-'} 分｜${fmtDate(r.createdAt)}`,
  ))
}

async function myFiles(userId: number) {
  const rows = await db
    .select({
      name: schema.files.name,
      size: schema.files.size,
      group: schema.files.group,
      createdAt: schema.files.createdAt,
    })
    .from(schema.files)
    .where(and(eq(schema.files.userId, userId), sql`${schema.files.deletedAt} is null`))
    .orderBy(desc(schema.files.createdAt))

  if (!rows.length) return '网盘里没有文件。'
  const lines = rows.map((r) => {
    const kb = ((r.size ?? 0) / 1024).toFixed(0)
    return `${r.name}｜${kb} KB${r.group ? `｜${r.group}` : ''}｜${fmtDate(r.createdAt)}`
  })
  return capRows(lines)
}

/** 某课程提供了哪些可做的材料（作业/测验/题目/竞赛清单） */
async function courseResources(userId: number, courseId: number) {
  const role = await courseRole(userId, courseId)
  if (role === null) return '错误：你没有参与该课程，无权查看'

  const [course] = await db
    .select({ name: schema.courses.name })
    .from(schema.courses)
    .where(eq(schema.courses.id, courseId))
    .limit(1)

  const [chapters, homeworks, quizzes, questions, races] = await Promise.all([
    db.select({ cid: schema.chapters.id, name: schema.chapters.name })
      .from(schema.chapters).where(eq(schema.chapters.courseId, courseId)).orderBy(asc(schema.chapters.id)),
    db.select({ cid: schema.homeworks.cid, name: schema.homeworks.name, point: schema.homeworks.point })
      .from(schema.homeworks).where(eq(schema.homeworks.courseId, courseId)).orderBy(asc(schema.homeworks.cid)),
    db.select({ cid: schema.quizzes.cid, name: schema.quizzes.name, point: schema.quizzes.point })
      .from(schema.quizzes).where(eq(schema.quizzes.courseId, courseId)).orderBy(asc(schema.quizzes.cid)),
    db.select({ cid: schema.questions.cid, name: schema.questions.name, type: schema.questions.type })
      .from(schema.questions).where(eq(schema.questions.courseId, courseId)).orderBy(asc(schema.questions.cid)),
    db.select({ cid: schema.races.cid, name: schema.races.name })
      .from(schema.races).where(eq(schema.races.courseId, courseId)).orderBy(asc(schema.races.cid)),
  ])

  const out: string[] = [`《${course?.name || courseId}》的课程材料：`]
  out.push(`\n章节 ${chapters.length} 个：` + (chapters.length
    ? chapters.map((c) => `#${c.cid} ${c.name}`).join('；')
    : '无'))
  out.push(`\n作业 ${homeworks.length} 份：` + (homeworks.length
    ? homeworks.map((h) => `第${h.cid}份 ${h.name}（${h.point ?? '-'} 分）`).join('；')
    : '无'))
  out.push(`\n测验 ${quizzes.length} 次：` + (quizzes.length
    ? quizzes.map((q) => `第${q.cid}次 ${q.name}（${q.point ?? '-'} 分）`).join('；')
    : '无'))
  out.push(`\n题目 ${questions.length} 道：` + (questions.length
    ? questions.slice(0, MAX_ROWS).map((q) => `第${q.cid}题 ${q.name}`).join('；')
    : '无'))
  out.push(`\n竞赛 ${races.length} 场：` + (races.length
    ? races.map((r) => `第${r.cid}场 ${r.name}`).join('；')
    : '无'))
  return out.join('')
}

// ===================== 入口 =====================
export async function lmsQuery(userId: number, args: any): Promise<string> {
  const kind = String(args?.kind || '')
  const courseId = Number(args?.course_id) || 0

  switch (kind) {
    case 'overview':
      return await overview(userId)
    case 'my_courses':
      return await myCourses(userId)
    case 'course_chapters':
      if (!courseId) return '错误：course_chapters 需要 course_id'
      return await courseChapters(userId, courseId)
    case 'course_resources':
      if (!courseId) return '错误：course_resources 需要 course_id'
      return await courseResources(userId, courseId)
    case 'my_progress':
      return await myProgress(userId, courseId)
    case 'my_homeworks':
      return await myHomeworks(userId, courseId, !!args?.only_unscored)
    case 'my_quizzes':
      return await myQuizzes(userId, courseId)
    case 'my_questions':
      return await myQuestions(userId, courseId, !!args?.only_wrong)
    case 'my_comments':
      return await myComments(userId, courseId)
    case 'my_races':
      return await myRaces(userId, courseId)
    case 'my_files':
      return await myFiles(userId)
    default:
      return `错误：未知的 kind=${kind}。可用：overview / my_courses / course_chapters / course_resources / my_progress / my_homeworks / my_quizzes / my_questions / my_comments / my_races / my_files`
  }
}
