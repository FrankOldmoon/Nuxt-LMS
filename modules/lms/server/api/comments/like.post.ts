import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"
import { grantCommentReward } from "../../utils/comment/reward"

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

    // 是否为"首次点赞"：userComments 无记录（即从未操作过）
    const isFirstLike = like === true && !existing

    if (existing) {
      // 更新点赞状态
      const result = await db.update(schema.userComments).set({
        like: like,
      }).where(and(
        eq(schema.userComments.userId, user.id),
        eq(schema.userComments.courseId, courseId),
        eq(schema.userComments.commentCid, commentCid)
      )).returning()
      await grantLikeReward(isFirstLike, courseId, commentCid, user.id)
      return cResp(result[0])
    } else {
      // 新建记录
      const result = await db.insert(schema.userComments).values({
        userId: user.id,
        courseId,
        commentCid,
        like: like,
      }).returning()
      await grantLikeReward(isFirstLike, courseId, commentCid, user.id)
      return cResp(result[0])
    }
  } catch (error: any) {
    console.error('点赞失败:', error)
    return cResp(null, error.message || '操作失败', false)
  }
})

/**
 * 首次点赞时给评论作者发 likeReceivedExp/Coin。
 * 防刷：
 *  - 仅"从未点赞过"（userComments 无记录）那一次加分，反复 赞→取消→赞 不重复加
 *  - 不能给自己点赞加分（评论作者 === 点赞者时不发）
 *  - 每日上限 maxDailyExp / maxDailyCoin 由 grantCommentReward 统一约束
 */
async function grantLikeReward(isFirstLike: boolean, courseId: number, commentCid: number, likerId: number) {
  if (!isFirstLike) return
  try {
    // 查评论作者
    const comment = await db.query.comments.findFirst({
      where: and(
        eq(schema.comments.courseId, courseId),
        eq(schema.comments.cid, commentCid)
      )
    })
    if (!comment || comment.userId === likerId) return // 评论不存在或自赞不发
    const cfg = await getCourseLmsConfig(courseId)
    if (!cfg?.comment) return
    await grantCommentReward(comment.userId, courseId, 'likeReceived', cfg.comment)
    // 奖章检查（exp 变化可能满足条件）
    await checkAndAwardMedals(comment.userId, courseId)
  } catch { /* 加分失败静默，不影响点赞 */ }
}
