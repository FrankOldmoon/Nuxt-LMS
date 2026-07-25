import { db, schema } from "@nuxthub/db"
import { eq, and, inArray } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // 1. 查询该评论自身（root comment）
  const root = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid)
    )
  })

  if (!root) return cResp({ root: null, children: [] })

  // 2. 查询所有 parentId 为该 cid 的子评论
  const children = await db.query.comments.findMany({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.parentId, commentCid)
    )
  })

  // 3. 收集所有 userId，批量查询用户信息
  const allComments = [root, ...children]
  const userIds = [...new Set(allComments.map(c => c.userId))]
  const users = await db.query.users.findMany({
    where: inArray(schema.users.id, userIds),
  })
  const userMap = new Map(users.map(u => [u.id, u]))

  // 4. 查询所有 userComments（点赞记录，用于统计每条评论的赞数 + 当前用户点赞状态）
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

  // 每条评论的总赞数
  const likeCountMap = new Map()
  for (const uc of allUserComments) {
    likeCountMap.set(uc.commentCid, (likeCountMap.get(uc.commentCid) || 0) + 1)
  }

  // 当前用户的点赞状态
  const likedMap = new Map()
  for (const uc of allUserComments) {
    if (uc.userId === user.id) likedMap.set(uc.commentCid, true)
  }

  // 5. 组合：评论 + 用户信息 + 点赞状态 + 赞数
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

  // 6. 子评论排序：先按赞数降序，再按发表时间升序
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
