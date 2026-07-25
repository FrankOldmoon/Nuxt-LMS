import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

/** 获取当前用户在指定课程的 coin 余额 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId) || 0
  if (!courseId) return cResp(null, '缺少 courseId 参数', false)

  const rows = await db
    .select({ coin: schema.userCourses.coin })
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, courseId)))
    .limit(1)

  return cResp({ coin: rows[0]?.coin || 0 })
})
