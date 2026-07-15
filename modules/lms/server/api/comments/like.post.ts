import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, comment_cid, like } = body

  if (!course_id || !comment_cid) {
    return cResp(null, 'Missing parameters', false)
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
      // Update the like status
      const result = await db.update(schema.userComments).set({
        like: like,
      }).where(and(
        eq(schema.userComments.userId, user.id),
        eq(schema.userComments.courseId, courseId),
        eq(schema.userComments.commentCid, commentCid)
      )).returning()
      return cResp(result[0])
    } else {
      // Create a new record
      const result = await db.insert(schema.userComments).values({
        userId: user.id,
        courseId,
        commentCid,
        like: like,
      }).returning()
      return cResp(result[0])
    }
  } catch (error: any) {
    console.error('Like failed:', error)
    return cResp(null, error.message || 'Operation failed', false)
  }
})
