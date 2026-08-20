import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"
import { getCourseStudents } from "../../utils/peerReview"

/**
 * 获取同伴互评活动详情
 * GET /api/peer-reviews/show?course_id=&cid=
 * 权限：登录用户
 *
 * 返回：
 * - config: 活动配置（name + options）
 * - students: 课程学生列表
 * - myScores: 当前用户已提交的评价（targetUserId → scores）
 * - isTeacher: 当前用户是否为该课程教师/管理员
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const { course_id, cid } = getQuery(event)
  const courseId = Number(course_id)
  const peerCid = Number(cid)
  if (!courseId || !peerCid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const [config, students, myScores] = await Promise.all([
    db.query.peerReviewConfigs.findFirst({
      where: and(
        eq(schema.peerReviewConfigs.courseId, courseId),
        eq(schema.peerReviewConfigs.cid, peerCid),
      ),
    }),
    getCourseStudents(courseId),
    db
      .select({
        targetUserId: schema.peerReviews.targetUserId,
        scores: schema.peerReviews.scores,
      })
      .from(schema.peerReviews)
      .where(
        and(
          eq(schema.peerReviews.courseId, courseId),
          eq(schema.peerReviews.cid, peerCid),
          eq(schema.peerReviews.fromUserId, user.id),
        ),
      ),
  ])

  if (!config) {
    return cResp(null, '活动不存在', false)
  }

  const myMap: Record<number, Record<string, number>> = {}
  for (const r of myScores) {
    myMap[r.targetUserId] = (r.scores || {}) as Record<string, number>
  }

  return cResp({
    config: {
      cid: config.cid,
      name: config.name,
      options: (config.options || []) as any,
    },
    students,
    myScores: myMap,
    isTeacher: user.roles.includes('admin') || user.roles.includes('teacher'),
  })
})
