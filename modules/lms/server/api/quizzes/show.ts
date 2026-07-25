import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 id 参数', false)
  }

  const data = await db.query.quizzes.findFirst({
    where: and(
      eq(schema.quizzes.courseId, Number(course_id)),
      eq(schema.quizzes.cid, Number(cid))
    )
  })

  return cResp(data)
})
