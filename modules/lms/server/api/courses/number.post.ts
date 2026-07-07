import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, user_id, number, group } = body

  if (!course_id || !user_id) {
    return cResp(null, '缺少 course_id 或 user_id 参数', false)
  }

  const courseId = Number(course_id)
  const userId = Number(user_id)

  try {
    // 查询是否已有记录
    const existing = await db.query.userCourses.findFirst({
      where: and(
        eq(schema.userCourses.userId, userId),
        eq(schema.userCourses.courseId, courseId),
      ),
    })

    if (existing) {
      // 已有记录：更新
      const updateData: any = {}
      if (number !== undefined) updateData.number = number || null
      if (group !== undefined) updateData.group = group || null

      const result = await db.update(schema.userCourses).set(updateData).where(and(
        eq(schema.userCourses.userId, userId),
        eq(schema.userCourses.courseId, courseId),
      )).returning()
      return cResp(result[0] || null)
    } else {
      // 无记录：插入
      const insertData: any = {
        userId,
        courseId,
      }
      if (number !== undefined) insertData.number = number || null
      if (group !== undefined) insertData.group = group || null

      const result = await db.insert(schema.userCourses).values(insertData).returning()
      return cResp(result[0] || null)
    }
  } catch (error: any) {
    console.error('更新编号失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
