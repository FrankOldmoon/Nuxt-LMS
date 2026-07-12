/**
 * 提交竞赛成绩
 * POST /api/races/submit
 * body: { course_id, race_cid, records, total_score }
 * records: [{ questionCid, rate, point, answer }]
 *
 * 防刷策略（详见 utils/submit/race.ts）：
 *  - 已有记录：取最高分（不累加），不再给经验
 *  - 首次提交：给参与经验（participateExp）
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { parseSubmitContext } from '../../utils/submit/context'
import { findUserSubmitRecord } from '../../utils/submit/record'
import { notifyCourseProgressMax } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'

export default withSubmitHandler('提交竞赛成绩失败', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'race_cid',
    sectionKey: 'race',
  })
  const { user, courseId, cid: raceCid, section: rConfig, body } = ctx

  const records = body.records
  const score = Number(body.total_score) || 0
  const participationExp = rConfig.participateExp || rConfig.participationExp || 0

  // 1. 查找已有记录
  const existing = await findUserSubmitRecord(user.id, courseId, 'race', raceCid)
  const prevScore = Number(existing?.score) || 0
  const bestScore = Math.max(prevScore, score)
  const isFirstSubmit = !existing
  const gainedExp = isFirstSubmit ? participationExp : 0

  // 2. 写 userRaces（取最高分）
  if (existing) {
    await db.update(schema.userRaces).set({
      records,
      score: String(bestScore),
    }).where(and(
      eq(schema.userRaces.userId, user.id),
      eq(schema.userRaces.courseId, courseId),
      eq(schema.userRaces.raceCid, raceCid),
    ))
  } else {
    await db.insert(schema.userRaces).values({
      userId: user.id,
      courseId,
      raceCid,
      records,
      score: String(score),
    })
  }

  // 3. 更新 userCourses.raceScore（最高分模式 + 参与经验）
  await notifyCourseProgressMax({
    userId: user.id,
    courseId,
    score: bestScore,
    scoreKey: 'raceScore',
    exp: gainedExp,
  })

  return cResp({ gainedExp, score })
})
