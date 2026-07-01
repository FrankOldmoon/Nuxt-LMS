import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

export default eventHandler(async (event) => {
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, '课程 ID 无效', false)
  }

  // ← 可调用工具函数获取基础记录
  const base = await showTable('courses', id)
  if (!base) {
    return cResp(null, '课程不存在', false)
  }

  // ← 自定义增强：关联查询章节
  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.id, id),
    with: { chapters: true },
  })

  if (!course) {
    return cResp(null, '课程不存在', false)
  }

  // ← 自定义增强：归一化为前端结构
  return cResp(normalizeCourseDetail(course))
})
