import { db, schema } from "@nuxthub/db"
import { eq, and, inArray } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, 'Missing course_id or cid parameter', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // 1. Query the comment itself (root comment)
  const root = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid)
    )
  })

  if (!root) return cResp({ root: null, children: [] })

  // 2. Query all child comments with parentId equal to this cid
  const children = await db.query.comments.findMany({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.parentId, commentCid)
    )
  })

  // 3. Collect all userIds and batch query user information
  const allComments = [root, ...children]
  const userIds = [...new Set(allComments.map(c => c.userId))]
  const users = await db.query.users.findMany({
    where: inArray(schema.users.id, userIds),
  })
  const userMap = new Map(users.map(u => [u.id, u]))

  // 4. Query all userComments (like records) to count the total likes for each comment + current user's like status
  const commentCids = [root.cid, ...children.map(c => c.cid)]
  const allUserComments = commentCids.length > 0
    ? await db.query.userComments.findMany({
        where: and(
          eq(schema.userComments.courseId, courseId),
          inArray(schema.userComments.commentCid, commentCids),
          eq(schema.userComments.like, true)
        )
      })
    : []

  // Total like count for each comment
  const likeCountMap = new Map()
  for (const uc of allUserComments) {
    likeCountMap.set(uc.commentCid, (likeCountMap.get(uc.commentCid) || 0) + 1)
  }

  // Current user's like status
  const likedMap = new Map()
  for (const uc of allUserComments) {
    if (uc.userId === user.id) likedMap.set(uc.commentCid, true)
  }

  // 5. Combine: comment + user info + like status + like count
  const combine = (c: any) => {
    const u = userMap.get(c.userId)
    return {
      ...c,
      userName: u?.name || '',
      avatarImg: u?.avatarImg || null,
      liked: likedMap.get(c.cid) === true,
      likeCount: likeCountMap.get(c.cid) || 0,
    }
  }

  // 6. Sort child comments: by like count desc first, then by post time asc
  const sortedChildren = (children as any[])
    .map(combine)
    .sort((a, b) => {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })

  return cResp({
    root: combine(root),
    children: sortedChildren,
  })
})
