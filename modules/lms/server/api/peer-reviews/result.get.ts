import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"
import { getCourseStudents, calcPeerScores } from "../../utils/peerReview"

/**
 * 同伴互评结果汇总 / 结算
 * GET /api/peer-reviews/result?course_id=&settle=1
 * 权限：教师/管理员
 *
 * settle=1 时：把每个学生的 peer_score 均分写回 user_courses.peer_score（方案 B：教师手动结算）
 * 返回：
 * - students: [{ userId, name, avatarImg, receivedCount, peerScore }]
 * - details: 评价矩阵明细 [{ fromUserId, fromName, targetUserId, targetName, scores }]
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const { course_id, settle } = getQuery(event)
  const courseId = Number(course_id)
  if (!courseId) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  const [students, rows] = await Promise.all([
    getCourseStudents(courseId),
    db
      .select({
        fromUserId: schema.peerReviews.fromUserId,
        targetUserId: schema.peerReviews.targetUserId,
        scores: schema.peerReviews.scores,
      })
      .from(schema.peerReviews)
      .where(
        and(
          eq(schema.peerReviews.courseId, courseId),
          isNull(schema.peerReviews.deletedAt),
        ),
      ),
  ])

  const nameMap = new Map<number, { name: string; avatarImg: string | null }>()
  for (const s of students) nameMap.set(s.userId, { name: s.name, avatarImg: s.avatarImg })

  // 每个被评学生收到的记录数
  const receivedCountMap = new Map<number, number>()
  for (const r of rows) {
    receivedCountMap.set(r.targetUserId, (receivedCountMap.get(r.targetUserId) || 0) + 1)
  }

  // 结算：写回 user_courses.peer_score
  if (settle === '1' || settle === 'true') {
    const peerScores = await calcPeerScores(courseId)
    for (const [userId, score] of Object.entries(peerScores)) {
      await db.update(schema.userCourses)
        .set({ peerScore: String(score) })
        .where(and(
          eq(schema.userCourses.courseId, courseId),
          eq(schema.userCourses.userId, Number(userId)),
        ))
    }
  }

  // 汇总列表（含结算后的均分）
  const peerScores = await calcPeerScores(courseId)
  const resultStudents = students.map((s) => ({
    userId: s.userId,
    name: s.name,
    avatarImg: s.avatarImg,
    receivedCount: receivedCountMap.get(s.userId) || 0,
    peerScore: peerScores[s.userId] ?? 0,
  }))

  // 评价矩阵明细
  const details = rows.map((r) => ({
    fromUserId: r.fromUserId,
    fromName: nameMap.get(r.fromUserId)?.name || `#${r.fromUserId}`,
    targetUserId: r.targetUserId,
    targetName: nameMap.get(r.targetUserId)?.name || `#${r.targetUserId}`,
    scores: r.scores || {},
  }))

  return cResp({ students: resultStudents, details })
})
