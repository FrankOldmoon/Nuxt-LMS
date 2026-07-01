import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 管理员或章节所属课程的编辑者可查看历史版本
  await requireChapterTeacher(event, id)

  const versions = await db
    .select({
      id: schema.chapterVersions.id,
      content: schema.chapterVersions.content,
      createdAt: schema.chapterVersions.createdAt,
    })
    .from(schema.chapterVersions)
    .where(eq(schema.chapterVersions.chapterId, id))
    .orderBy(desc(schema.chapterVersions.id))

  return cResp(versions)
})
