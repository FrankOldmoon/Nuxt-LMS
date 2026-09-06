import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { course_id } = body

  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  // 仅管理员或该课程的教师/编辑者可新增
  await requireCourseTeacher(event, Number(course_id))

  try {
    const maxCidResult = await db.select({ cid: schema.races.cid })
      .from(schema.races)
      .where(eq(schema.races.courseId, course_id))
      .orderBy(desc(schema.races.cid))
      .limit(1)

    const newCid = (maxCidResult[0]?.cid ?? 0) + 1

    const insertData = {
      ...body,
      courseId: course_id,
      cid: newCid,
    }
    delete insertData.course_id

    const result = await db.insert(schema.races).values(insertData).returning()
    return cResp(result[0])
  } catch (error: any) {
    console.error('新增竞赛失败:', error)
    return cResp(null, error.message || '新增失败', false)
  }
})
