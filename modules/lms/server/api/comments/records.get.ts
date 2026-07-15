import { db, schema } from "@nuxthub/db"
import { eq, and, inArray, sql } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, 'Missing course_id or cid parameter', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // 1. Get the current user's defaultClass to determine the query scope
  const userRow = await db.select({ defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const classId = (userRow[0]?.defaultClass as any)?.id
  if (!classId) {
    return cResp([])
  }

  // 2. Get student userIds in this class (only used to determine the query scope)
  const classUsers = await getClassUsers(classId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)

  if (studentIds.length === 0) {
    return cResp([])
  }

  // 3. Query this root comment + all child comments
  const allComments = await db.query.comments.findMany({
    where: and(
      eq(schema.comments.courseId, courseId),
      sql`(${schema.comments.cid} = ${commentCid} OR ${schema.comments.parentId} = ${commentCid})`
    )
  })

  // 4. Query all userComments (like records)
  const commentCids = allComments.map(c => c.cid)
  const allUserComments = commentCids.length > 0
    ? await db.query.userComments.findMany({
        where: and(
          eq(schema.userComments.courseId, courseId),
          inArray(schema.userComments.commentCid, commentCids),
          eq(schema.userComments.like, true)
        )
      })
    : []

  // Group by user: which comments each user posted and how many likes received
  const userCommentMap = new Map()
  for (const c of allComments) {
    if (!userCommentMap.has(c.userId)) {
      userCommentMap.set(c.userId, { comments: [], likeCount: 0 })
    }
    userCommentMap.get(c.userId).comments.push(c)
  }

  // Count the total likes received by each user
  for (const uc of allUserComments) {
    const comment = allComments.find(c => c.cid === uc.commentCid)
    if (comment && userCommentMap.has(comment.userId)) {
      userCommentMap.get(comment.userId).likeCount++
    }
  }

  // 5. Only return the { userId, record } list for class students who have comments
  const result = studentIds
    .filter(id => userCommentMap.has(id))
    .map(id => {
      const data = userCommentMap.get(id)
      return {
        userId: id,
        record: {
          comments: data.comments.map((c: any) => ({
            cid: c.cid,
            content: c.content,
            createdAt: c.createdAt,
            isRoot: c.cid === commentCid,
          })),
          likeCount: data.likeCount,
        },
      }
    })

  return cResp(result)
})
