import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"
import { grantCommentReward } from "../../utils/comment/reward"
import { getUserClassId } from "../../utils/comment/classId"
import { broadcastToClass } from "../../utils/ws/state"

// 审核评论：老师/管理员将待审核（audit）的评论置为已发布（published），随后对普通用户可见；
// 奖励（publish/reply 的 exp/coin + 课程分 + 章节分）仅在"审核通过"这一刻发放一次（幂等）。
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, cid } = body

  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // 查询该评论，获取作者、主题、章节与当前状态（用于审核通过后发奖励 + 实时广播）
  const commentRow = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid),
    ),
  })
  if (!commentRow) {
    return cResp(null, '评论不存在', false)
  }

  // 幂等：已是 published（重复审核/重复点击）不再重复发放奖励
  const wasPending = commentRow.status !== 'published'

  await db.update(schema.comments).set({ status: 'published' }).where(and(
    eq(schema.comments.courseId, courseId),
    eq(schema.comments.cid, commentCid),
  ))

  // 审核通过发放评论/回复奖励（仅第一次过审时发放）
  let commentGainedExp = 0
  if (wasPending) {
    try {
      const cfg = await getCourseLmsConfig(courseId).catch(() => null)
      const cConfig = cfg?.comment
      if (cConfig) {
        const kind = commentRow.parentId ? 'reply' : 'publish'
        commentGainedExp = kind === 'publish' ? Number(cConfig.publishExp) || 0 : Number(cConfig.replyExp) || 0
        // 章节 id 由 cRequest 自动注入到请求 body（chapter_id），用于累加章节总分
        const chapterId = Number(body.chapter_id) || 0
        await grantCommentReward(commentRow.userId, courseId, kind, cConfig, chapterId)
      }
      // 检查并授予奖章
      await checkAndAwardMedals(commentRow.userId, courseId)
    } catch { /* 加分失败不阻塞审核 */ }

    // 向班级房间广播 danmaku（fire-and-forget）
    void broadcastSubmitDanmaku({
      userId: commentRow.userId,
      kind: 'comment',
      gainedExp: commentGainedExp,
    })
  }

  // 实时通知：广播到评论作者所在班级房间，前端收到 commentRefresh 后刷新对应主题的评论列表
  // fire-and-forget：不阻塞审核响应
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

  return cResp({ approved: true })
})
