import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 id 参数', false)
  }

  const { homeworks } = schema

  const data = await db.query.homeworks.findFirst({
    where: and(
      eq(homeworks.courseId, Number(course_id)),
      eq(homeworks.cid, Number(cid))
    )
  })

  return cResp(data)
})
