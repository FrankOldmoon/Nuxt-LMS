import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, 'Missing id parameter', false)
  }

  const data = await db.query.races.findFirst({
    where: and(
      eq(schema.races.courseId, Number(course_id)),
      eq(schema.races.cid, Number(cid))
    )
  })

  return cResp(data)
})
