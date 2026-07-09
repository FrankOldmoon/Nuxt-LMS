/**
 * 课程学习统计：返回当前用户在该课程的各项学习行为数量
 * GET /api/courses/stats?courseId=1
 *
 * 面向学生端"我的学习数据"展示，任何登录用户均可查询自己的统计。
 * 不依赖 classId，仅按 (userId, courseId) 统计。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, count } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp(null, '缺少 courseId', false)

  const uid = user.id

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
