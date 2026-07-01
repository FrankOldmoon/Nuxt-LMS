import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 管理员或课程编辑者可查看历史版本
  await requireCourseTeacher(event, id)

  const versions = await db
    .select({
      id: schema.courseVersions.id,
      content: schema.courseVersions.content,
      createdAt: schema.courseVersions.createdAt,
    })
    .from(schema.courseVersions)
    .where(eq(schema.courseVersions.courseId, id))
    .orderBy(desc(schema.courseVersions.id))

  return cResp(versions)
})
