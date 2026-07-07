import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 id 参数', false)
  }

  const record = await db.query.userQuizzes.findFirst({
    where: and(
      eq(schema.userQuizzes.userId, user.id),
      eq(schema.userQuizzes.courseId, Number(course_id)),
      eq(schema.userQuizzes.quizCid, Number(cid))
    )
  })

  return cResp(record)
})
