import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const data = await db.query.userQuestions.findFirst({
    where: and(
      eq(schema.userQuestions.userId, user.id),
      eq(schema.userQuestions.courseId, Number(course_id)),
      eq(schema.userQuestions.questionCid, Number(cid))
    )
  })

  return cResp(data)
})
