import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, content } = body

  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  try {
    // 查询该课程中最大的 cid
    const maxCidResult = await db.select({ cid: schema.comments.cid })
      .from(schema.comments)
      .where(eq(schema.comments.courseId, course_id))
      .orderBy(desc(schema.comments.cid))
      .limit(1)

    const newCid = (maxCidResult[0]?.cid ?? 0) + 1

    const insertData = {
      courseId: course_id,
      cid: newCid,
      name: body.name || '',
      content: content || '',
      userId: user.id,
      parentId: body.parentId || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      point: body.point ?? 1,
      status: body.status || 'published',
    }

    const result = await db.insert(schema.comments).values(insertData).returning()

    // 检查并授予奖章
    await checkAndAwardMedals(user.id, course_id)

    return cResp(result[0])
  } catch (error: any) {
    console.error('新增评论失败:', error)
    return cResp(null, error.message || '新增失败', false)
  }
})
