import { db, schema } from "@nuxthub/db"
import { eq, and, desc, sql } from "drizzle-orm"
import { grantCommentReward } from "../../utils/comment/reward"
import { validateCommentContent } from "../../utils/comment/validate"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, content } = body

  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  // H3：富文本内容安全校验（禁止 iframe/script 等危险节点）
  const contentError = validateCommentContent(content)
  if (contentError) {
    return cResp(null, contentError, false)
  }

  try {
    // 评论所在章节（可选）：用于加分时累加章节总分
    const chapterId = Number(body.chapter_id) || 0
    // 父评论 id（回复的"主题"）：顶层评论 parentId 为空，不受此限制
    const parentId = body.parentId ? Number(body.parentId) : null

    // 每主题回复数上限（配置 maxCommentCount，默认 50）：
    // 限制"每个用户在同一个父 comment 下最多回复几条"，防止灌水刷回复奖励；
    // 顶层评论（新开主题）不限制
    const cfg = await getCourseLmsConfig(course_id).catch(() => null)
    const cConfig = cfg?.comment
    const maxCommentCount = Number(cConfig?.maxCommentCount) || 0
    if (maxCommentCount > 0 && parentId) {
      const countRows = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.comments)
        .where(and(
          eq(schema.comments.userId, user.id),
          eq(schema.comments.courseId, Number(course_id)),
          eq(schema.comments.parentId, parentId),
        ))
      if (Number(countRows[0]?.n) >= maxCommentCount) {
        return cResp(null, '评论数量已达上限', false)
      }
    }

    // 查询该课程中最大的 cid
    const maxCidResult = await db.select({ cid: schema.comments.cid })
      .from(schema.comments)
      .where(eq(schema.comments.courseId, course_id))
      .orderBy(desc(schema.comments.cid))
      .limit(1)

    const newCid = (maxCidResult[0]?.cid ?? 0) + 1

    const insertData = {
      courseId: course_id,
      cid: newCid,
      name: body.name || '',
      content: content || '',
      userId: user.id,
      parentId: body.parentId || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      // 安全：point/status 由服务端固定默认值，不接受客户端自设（防止自定分值/状态）
      point: 1,
      status: 'published',
    }

    const result = await db.insert(schema.comments).values(insertData).returning()

    // 发评论/回复奖励（顶层评论 → publishExp/publishCoin；回复 → replyExp/replyCoin）
    // 受 maxDailyExp / maxDailyCoin 每日上限约束；
    // 同时计入课程总分（commentScore）与章节总分（若有 chapter_id）
    let commentGainedExp: number | undefined
    let commentGainedCoin: number | undefined
    try {
      if (cConfig) {
        const kind = insertData.parentId ? 'reply' : 'publish'
        commentGainedExp = kind === 'publish' ? Number(cConfig.publishExp) || 0 : Number(cConfig.replyExp) || 0
        const granted = await grantCommentReward(user.id, Number(course_id), kind, cConfig, chapterId)
        commentGainedCoin = granted.coin
      }
    } catch { /* 配置不可用或加分失败时不阻塞提交 */ }

    // 检查并授予奖章
    await checkAndAwardMedals(user.id, Number(course_id))

    // 向班级房间广播 danmaku（fire-and-forget，不影响响应）
    void broadcastSubmitDanmaku({
      userId: user.id,
      kind: 'comment',
      gainedExp: commentGainedExp,
    })

    return cResp(result[0])
  } catch (error: any) {
    console.error('新增评论失败:', error)
    return cResp(null, error.message || '新增失败', false)
  }
})
