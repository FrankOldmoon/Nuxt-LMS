import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, comment_cid, like } = body

  if (!course_id || !comment_cid) {
    return cResp(null, '缺少参数', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(comment_cid)

  try {
    const existing = await db.query.userComments.findFirst({
      where: and(
        eq(schema.userComments.userId, user.id),
        eq(schema.userComments.courseId, courseId),
        eq(schema.userComments.commentCid, commentCid)
      )
    })

    if (existing) {
      // 更新点赞状态
      const result = await db.update(schema.userComments).set({
        like: like,
      }).where(and(
        eq(schema.userComments.userId, user.id),
        eq(schema.userComments.courseId, courseId),
        eq(schema.userComments.commentCid, commentCid)
      )).returning()
      return cResp(result[0])
    } else {
      // 新建记录
      const result = await db.insert(schema.userComments).values({
        userId: user.id,
        courseId,
        commentCid,
        like: like,
      }).returning()
      return cResp(result[0])
    }
  } catch (error: any) {
    console.error('点赞失败:', error)
    return cResp(null, error.message || '操作失败', false)
  }
})
