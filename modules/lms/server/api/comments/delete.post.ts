import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, cid } = body

  if (!course_id || !cid) {
    return cResp(null, 'Missing parameters', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // Look up the comment and confirm it exists
  const existing = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid)
    )
  })

  if (!existing) {
    return cResp(null, 'Comment not found', false)
  }

  // Permission: the author themselves, or a teacher/admin
  const isOwner = existing.userId === user.id
  const isTeacher = user.roles?.some(r => ['teacher', 'admin'].includes(r))
  if (!isOwner && !isTeacher) {
    return cResp(null, 'No permission to delete this comment', false)
  }

  try {
    await db.delete(schema.comments).where(and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid)
    ))
    return cResp({ deleted: true })
  } catch (error: any) {
    console.error('Failed to delete comment:', error)
    return cResp(null, error.message || 'Delete failed', false)
  }
})
