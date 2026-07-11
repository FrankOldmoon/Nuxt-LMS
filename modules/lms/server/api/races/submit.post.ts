import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 提交竞赛成绩
 * body: course_id, race_cid, records, total_score
 * records: [{ questionCid, rate, point, answer }]
 * 将成绩存入 userRaces 表，并更新 userCourses.raceScore
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, race_cid, records, total_score } = body

  if (!course_id || !race_cid) {
    return cResp(null, '缺少参数', false)
  }

  const courseId = Number(course_id)
  const raceCid = Number(race_cid)
  const score = Number(total_score) || 0

  // 读取 LMS 配置
  const config = await getCourseLmsConfig(courseId)
  const rConfig = config.race

  // 计算经验值（按排名需要在 race 结束后统一计算，这里给参与经验）
  const gainedExp = rConfig.participateExp || rConfig.participationExp || 0

  const existing = await db.query.userRaces.findFirst({
    where: and(
      eq(schema.userRaces.userId, user.id),
      eq(schema.userRaces.courseId, courseId),
      eq(schema.userRaces.raceCid, raceCid)
    )
  })

  try {
    if (existing) {
      // 已有记录：取最高分
      const prevScore = Number(existing.score) || 0
      const bestScore = Math.max(prevScore, score)
      await db.update(schema.userRaces).set({
        records,
        score: String(bestScore),
      }).where(and(
        eq(schema.userRaces.userId, user.id),
        eq(schema.userRaces.courseId, courseId),
        eq(schema.userRaces.raceCid, raceCid)
      ))
      if (score > prevScore) {
        await addCourseScore(user.id, courseId, score - prevScore, 'raceScore', 0)
      }
    } else {
      await db.insert(schema.userRaces).values({
        userId: user.id,
        courseId,
        raceCid,
        records,
        score: String(score),
      })
      await addCourseScore(user.id, courseId, score, 'raceScore', gainedExp)
    }

    return cResp({ gainedExp, score })
  } catch (error: any) {
    console.error('提交竞赛成绩失败:', error)
    return cResp(null, error.message || '提交失败', false)
  }
})
