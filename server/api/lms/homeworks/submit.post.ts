import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, homework_cid, files, content } = body

  if (!course_id || !homework_cid) {
    return cResp(null, '缺少 course_id 或 homework_cid 参数', false)
  }

  try {
    // 查找是否已有提交记录（upsert 语义）
    const existing = await db.query.userHomeworks.findFirst({
      where: and(
        eq(schema.userHomeworks.userId, user.id),
        eq(schema.userHomeworks.courseId, Number(course_id)),
        eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
      )
    })

    if (existing) {
      // 已有记录：更新
      const result = await db.update(schema.userHomeworks).set({
        files: files || null,
        content: content || null,
      }).where(and(
        eq(schema.userHomeworks.userId, user.id),
        eq(schema.userHomeworks.courseId, Number(course_id)),
        eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
      )).returning()
      return cResp(result[0])
    } else {
      // 新记录：插入
      const result = await db.insert(schema.userHomeworks).values({
        userId: user.id,
        courseId: Number(course_id),
        homeworkCid: Number(homework_cid),
        files: files || null,
        content: content || null,
      }).returning()
      return cResp(result[0])
    }
  } catch (error: any) {
    console.error('提交作业失败:', error)
    return cResp(null, error.statusMessage || '提交失败', false)
  }
})
