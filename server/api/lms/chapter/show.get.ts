import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

export default eventHandler(async (event) => {
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, '章节 ID 无效', false)
  }

  // ← 可调用工具函数获取基础记录
  const base = await showTable('chapters', id)
  if (!base) {
    return cResp(null, '章节不存在', false)
  }

  // ← 自定义增强：关联查询课程 + 课程下的章节列表（用于上下章导航）
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

  // ← 自定义增强：归一化为前端页面数据结构
  return cResp(normalizeChapterPageData(chapter, chapter.course))
})
