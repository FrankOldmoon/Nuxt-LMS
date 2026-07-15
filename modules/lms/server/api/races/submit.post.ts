/**
 * Submit race score
 * POST /api/races/submit
 * body: { course_id, race_cid, records, total_score }
 * records: [{ questionCid, rate, point, answer }]
 *
 * Anti-abuse strategy (see utils/submit/race.ts for details):
 *  - Existing record: take the highest score (no accumulation), no more exp
 *  - First submission: give participation exp (participateExp)
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { parseSubmitContext } from '../../utils/submit/context'
import { findUserSubmitRecord } from '../../utils/submit/record'
import { notifyCourseProgressMax } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'

export default withSubmitHandler('Failed to submit race score', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'race_cid',
    sectionKey: 'race',
  })
  const { user, courseId, cid: raceCid, section: rConfig, body } = ctx

  const records = body.records
  const score = Number(body.total_score) || 0
  const participationExp = rConfig.participateExp || rConfig.participationExp || 0
  const participationCoin = rConfig.participateCoin || rConfig.participationCoin || 0

  // 1. Find existing record
  const existing = await findUserSubmitRecord(user.id, courseId, 'race', raceCid)
  const prevScore = Number(existing?.score) || 0
  const bestScore = Math.max(prevScore, score)
  const isFirstSubmit = !existing
  const gainedExp = isFirstSubmit ? participationExp : 0
  const gainedCoin = isFirstSubmit ? participationCoin : 0

  // 2. Write userRaces (take the highest score)
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

  // 3. Update userCourses.raceScore (highest score mode + participation exp)
  await notifyCourseProgressMax({
    userId: user.id,
    courseId,
    score: bestScore,
    scoreKey: 'raceScore',
    exp: gainedExp,
    coin: gainedCoin,
  })

  return cResp({ gainedExp, gainedCoin, score })
})
