import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, type, items } = body

  if (!course_id || !type || !Array.isArray(items)) {
    return cResp(null, '缺少 course_id、type 或 items 参数', false)
  }

  const tableMap = {
    question: schema.questions,
    homework: schema.homeworks,
    comment: schema.comments,
  }
  const table = tableMap[type]
  if (!table) {
    return cResp(null, '未知类型', false)
  }

  try {
    // 查询当前最大 cid
    const maxCidResult = await db.select({ cid: table.cid })
      .from(table)
      .where(eq(table.courseId, course_id))
      .orderBy(desc(table.cid))
      .limit(1)
    let cid = maxCidResult[0]?.cid ?? 0

    const results = []
    for (const item of items) {
      cid++
      const insertData = {
        ...item,
        courseId: course_id,
        cid,
      }
      const result = await db.insert(table).values(insertData).returning()
      if (result[0]) results.push(result[0])
    }

    return cResp({ imported: results.length, items: results })
  } catch (error: any) {
    console.error('批量导入失败:', error)
    return cResp(null, error.statusMessage || '导入失败', false)
  }
})
