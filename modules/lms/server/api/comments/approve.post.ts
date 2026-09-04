import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"
import { getUserClassId } from "../../utils/comment/classId"
import { broadcastToClass } from "../../utils/ws/state"

// 审核评论：老师/管理员将待审核（audit）的评论置为已发布（published），随后对普通用户可见
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, cid } = body

  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // 查询该评论，获取作者与所在主题，用于审核通过后实时广播
  const commentRow = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid),
    ),
  })

  await db.update(schema.comments).set({ status: 'published' }).where(and(
    eq(schema.comments.courseId, courseId),
    eq(schema.comments.cid, commentCid),
  ))

  // 实时通知：广播到评论作者所在班级房间，前端收到 commentRefresh 后刷新对应主题的评论列表
  // fire-and-forget：不阻塞审核响应
  if (commentRow) {
    void (async () => {
      try {
        const authorClassId = await getUserClassId(commentRow.userId)
        if (!authorClassId) return
        const topicCid = Number(commentRow.parentId) || commentCid
        broadcastToClass(authorClassId, JSON.stringify({
          type: 'commentRefresh',
          courseId,
          topicCid,
        }))
      } catch (e) {
        console.error('[approve broadcast] failed:', e)
      }
    })()
  }

  return cResp({ approved: true })
})