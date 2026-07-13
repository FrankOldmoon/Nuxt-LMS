/**
 * 课程学习统计：返回指定用户在该课程的各项学习行为数量
 * GET /api/courses/stats?courseId=1[&userId=2]
 *
 * - 不传 userId：返回当前登录用户自己的统计（学生端"我的学习数据"展示）
 * - 传 userId  且当前用户是课程教师 / 管理员：返回该 userId 的统计（教师查看学生学习情况）
 * - 传 userId  但权限不足：返回 403
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, count } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp(null, '缺少 courseId', false)

  const queryUserId = Number(getQuery(event).userId) || 0
  let uid = user.id
  if (queryUserId && queryUserId !== user.id) {
    // 仅课程教师 / 管理员可查询其他用户的统计
    const isTeacher = await isCourseTeacher(user.id, courseId)
    if (!isTeacher && !user.roles?.includes('admin')) {
      throw createError({ statusCode: 403, statusMessage: '无权查看该学生的统计' })
    }
    uid = queryUserId
  }

  // 各分项完成数量（按用户+课程）
  const [q] = await db
    .select({ n: count() })
    .from(schema.userQuestions)
    .where(and(eq(schema.userQuestions.userId, uid), eq(schema.userQuestions.courseId, courseId)))

  const [h] = await db
    .select({ n: count() })
    .from(schema.userHomeworks)
    .where(and(eq(schema.userHomeworks.userId, uid), eq(schema.userHomeworks.courseId, courseId)))

  const [qz] = await db
    .select({ n: count() })
    .from(schema.userQuizzes)
    .where(and(eq(schema.userQuizzes.userId, uid), eq(schema.userQuizzes.courseId, courseId)))

  const [r] = await db
    .select({ n: count() })
    .from(schema.userRaces)
    .where(and(eq(schema.userRaces.userId, uid), eq(schema.userRaces.courseId, courseId)))

  const [c] = await db
    .select({ n: count() })
    .from(schema.comments)
    .where(and(eq(schema.comments.userId, uid), eq(schema.comments.courseId, courseId)))

  return cResp({
    questionCount: Number(q?.n) || 0,
    homeworkCount: Number(h?.n) || 0,
    quizCount: Number(qz?.n) || 0,
    raceCount: Number(r?.n) || 0,
    commentCount: Number(c?.n) || 0,
  })
})
