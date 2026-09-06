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
    // 查询该课程中最大的 cid
    const maxCidResult = await db.select({ cid: schema.questions.cid })
      .from(schema.questions)
      .where(eq(schema.questions.courseId, course_id))
      .orderBy(desc(schema.questions.cid))
      .limit(1)

    // 生成新的 cid（如果不存在则默认为 1）
    const maxCid = maxCidResult[0]?.cid ?? 0
    const newCid = maxCid + 1

    // 准备插入的数据
    const insertData = {
      ...body,
      courseId: course_id,
      cid: newCid,
    }

    // 删除不需要的字段
    delete insertData.course_id

    // 插入新记录
    const result = await db.insert(schema.questions).values(insertData).returning()
    // 返回新插入的记录（包含 cid）
    return cResp(result[0])
  } catch (error: any) {
    console.error('新增题目失败:', error)
    return cResp(null, error.message || '新增失败', false)
  }
})
