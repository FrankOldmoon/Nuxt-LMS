import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, '章节 ID 无效', false)
  }

  const chapter = await db.query.chapters.findFirst({
    where: eq(schema.chapters.id, id),
    with: {
      course: {
        with: { chapters: true },
      },
    },
  })

  if (!chapter) {
    return cResp(null, '章节不存在', false)
  }

  return cResp(normalizeChapterPageData(chapter, chapter.course))
})
