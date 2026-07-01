import { db, schema } from "@nuxthub/db";
import { eq } from "drizzle-orm";

export default eventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    return cResp(null, '课程 ID 无效', false)
  }

  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.id, id),
    with: { chapters: true },
  })

  if (!course) {
    return cResp(null, '课程不存在', false)
  }

  return cResp(normalizeCourseDetail(course))
});
