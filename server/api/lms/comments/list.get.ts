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

  // 4. 查询当前用户的 userComments（点赞状态）
  const userComments = await db.query.userComments.findMany({
    where: and(
      eq(schema.userComments.userId, user.id),
      eq(schema.userComments.courseId, courseId),
    )
  })
  const likeMap = new Map(userComments.map(uc => [uc.commentCid, uc.like]))

  // 5. 组合：评论 + 用户信息 + 点赞状态
  const combine = (c) => {
    const u = userMap.get(c.userId)
    return {
      ...c,
      userName: u?.name || '',
      avatarImg: u?.avatarImg || null,
      liked: likeMap.get(c.cid) === true,
    }
  }

  return cResp({
    root: combine(root),
    children: children.map(combine),
  })
})
