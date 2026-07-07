import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const data = await db.query.userHomeworks.findFirst({
    where: and(
      eq(schema.userHomeworks.userId, user.id),
      eq(schema.userHomeworks.courseId, Number(course_id)),
      eq(schema.userHomeworks.homeworkCid, Number(cid))
    )
  })

  return cResp(data)
})
