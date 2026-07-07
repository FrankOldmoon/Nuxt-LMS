import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id } = body

  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  try {
    const maxCidResult = await db.select({ cid: schema.quizzes.cid })
      .from(schema.quizzes)
      .where(eq(schema.quizzes.courseId, course_id))
      .orderBy(desc(schema.quizzes.cid))
      .limit(1)

    const newCid = (maxCidResult[0]?.cid ?? 0) + 1

    const insertData = {
      ...body,
      courseId: course_id,
      cid: newCid,
    }
    delete insertData.course_id

    const result = await db.insert(schema.quizzes).values(insertData).returning()
    return cResp(result[0])
  } catch (error: any) {
    console.error('新增测验失败:', error)
    return cResp(null, error.statusMessage || '新增失败', false)
  }
})
