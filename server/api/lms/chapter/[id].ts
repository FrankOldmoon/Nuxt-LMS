import { db, schema } from "@nuxthub/db";
import { eq } from "drizzle-orm";

export default eventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    return cResp(null, '章节 ID 无效', false)
  }

  // 查询章节（带所属课程及课程的章节列表，用于上下章导航）
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
});
