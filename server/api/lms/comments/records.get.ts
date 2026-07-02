import { db, schema } from "@nuxthub/db"
import { eq, and, inArray, sql } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // 1. 获取当前用户的 defaultClass
  const userRow = await db.select({ defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const classId = userRow[0]?.defaultClass?.id
  if (!classId) {
    return cResp([])
  }

  // 2. 获取该班级所有学生
  const classUsers = await getClassUsers(classId)
  const students = classUsers.filter(u => !u.isTeacher)

  if (students.length === 0) {
    return cResp([])
  }

  // 3. 查询该 root comment + 所有子评论
  const allComments = await db.query.comments.findMany({
    where: and(
      eq(schema.comments.courseId, courseId),
      sql`(${schema.comments.cid} = ${commentCid} OR ${schema.comments.parentId} = ${commentCid})`
    )
  })

  // 4. 查询所有 userComments（点赞记录）
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

  // 按用户分组：每个用户发了哪些评论、被赞了多少
  const userCommentMap = new Map() // userId -> { comments: [], likeCount: number }
  for (const c of allComments) {
    if (!userCommentMap.has(c.userId)) {
      userCommentMap.set(c.userId, { comments: [], likeCount: 0 })
    }
    const entry = userCommentMap.get(c.userId)
    entry.comments.push(c)
  }

  // 统计每个用户收到的总赞数
  for (const uc of allUserComments) {
    const comment = allComments.find(c => c.cid === uc.commentCid)
    if (comment && userCommentMap.has(comment.userId)) {
      userCommentMap.get(comment.userId).likeCount++
    }
  }

  // 5. 组合：学生信息 + 评论记录
  const studentMap = new Map(students.map(s => [s.id, s]))
  const result = []
  for (const [userId, data] of userCommentMap) {
    const s = studentMap.get(userId)
    if (!s) continue // 非本班学生跳过
    result.push({
      id: s.id,
      name: s.name,
      preferName: s.preferName,
      rollNumber: s.rollNumber,
      avatarImg: s.avatarImg,
      record: {
        comments: data.comments.map(c => ({
          cid: c.cid,
          content: c.content,
          createdAt: c.createdAt,
          isRoot: c.cid === commentCid,
        })),
        likeCount: data.likeCount,
      },
    })
  }

  // 有评论的排前面
  return cResp(result.sort((a, b) => {
    const aHas = a.record ? 1 : 0
    const bHas = b.record ? 1 : 0
    return bHas - aHas
  }))
})
