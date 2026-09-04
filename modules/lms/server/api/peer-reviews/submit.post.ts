import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"
import { getCourseStudents, validateScores } from "../../utils/peerReview"

/**
 * 提交/覆盖对某位同学的评价
 * POST /api/peer-reviews/submit
 * body: { course_id, cid, target_user_id, scores: { key: value } }
 * 权限：登录学生（可覆盖修改）
 *
 * 服务端强校验：活动存在、被评人为学生、不能自评、分值合法。
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const courseId = Number(body?.course_id)
  const peerCid = Number(body?.cid)
  const targetUserId = Number(body?.target_user_id)
  if (!courseId || !peerCid || !targetUserId) {
    return cResp(null, '缺少必要参数', false)
  }
  if (targetUserId === user.id) {
    return cResp(null, '不能评价自己', false)
  }

  // 活动配置
  const config = await db.query.peerReviewConfigs.findFirst({
    where: and(
      eq(schema.peerReviewConfigs.courseId, courseId),
      eq(schema.peerReviewConfigs.cid, peerCid),
    ),
  })
  if (!config) return cResp(null, '活动不存在', false)

  // 被评人必须是该课程的学生
  const students = await getCourseStudents(courseId)
  if (!students.some((s) => s.userId === targetUserId)) {
    return cResp(null, '被评价人不在该课程学生中', false)
  }

  // 校验分值
  const options = (config.options || []) as { key: string; label: string; maxScore: number }[]
  const scores = (body.scores || {}) as Record<string, number>
  const err = validateScores(scores, options)
  if (err) return cResp(null, err, false)

  // upsert：可覆盖修改
  await db.insert(schema.peerReviews)
    .values({ courseId, cid: peerCid, fromUserId: user.id, targetUserId, scores })
    .onConflictDoUpdate({
      target: [
        schema.peerReviews.courseId,
        schema.peerReviews.cid,
        schema.peerReviews.fromUserId,
        schema.peerReviews.targetUserId,
      ],
      set: { scores },
    })

  // 提交互评奖励（给评价者）：exp/coin + 章节分 + 课程分（peerScore 分项），可调参数 peerReview.*
  try {
    const cfg = await getCourseLmsConfig(courseId)
    const pConfig = cfg?.peerReview || {}
    const exp = Number(pConfig.exp) || 0
    const coin = Number(pConfig.coin) || 0
    const score = Number(pConfig.score) || 0
    if (score > 0 || exp > 0 || coin > 0) {
      await addCourseScore(user.id, courseId, score, 'peerScore', exp, coin)
      const chapterId = Number(body.chapter_id) || 0
      if (chapterId && score > 0) {
        await addChapterScore(user.id, chapterId, score)
      }
    }
  } catch (e) {
    // 奖励发放失败不阻塞评价提交
    console.error('[peer-review] 奖励发放失败:', e)
  }

  return cResp(null, '评价已提交', true)
})
