/**
 * Homework submission
 * POST /api/homeworks/submit
 * body: { course_id, chapter_id?, homework_cid, files?, content? }
 *
 * Anti-abuse strategy (see utils/submit/homework.ts for details):
 *  - First submission: gives submitExp exp
 *  - Resubmission: gives resubmitExp within the resubmitCount limit, gainedExp=0 after exceeding
 *  - Homework score is updated by the teacher via the score API after grading (only exp is updated here)
 *  - Submit count is recorded in the internal field userHomeworks.record._submitCount
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { parseSubmitContext } from '../../utils/submit/context'
import { findUserSubmitRecord } from '../../utils/submit/record'
import { notifyCourseProgress } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'

export default withSubmitHandler('Failed to submit homework', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'homework_cid',
    sectionKey: 'homework',
  })
  const { user, courseId, cid: homeworkCid, section: hConfig, body } = ctx

  const { files, content } = body
  const maxResubmitCount = Number(hConfig.maxResubmitCount ?? 3)

  // 1. Find existing record
  const existing = await findUserSubmitRecord(user.id, courseId, 'homework', homeworkCid)
  const recordMeta: any = (existing?.record && typeof existing.record === 'object') ? existing.record : {}
  const prevResubmitCount = Number(recordMeta._submitCount || 0)
  const nextResubmitCount = prevResubmitCount + 1

  // 2. Calculate exp + coin
  let gainedExp: number
  let gainedCoin: number
  if (!existing) {
    gainedExp = hConfig.submitExp
    gainedCoin = hConfig.submitCoin
  } else if (nextResubmitCount > maxResubmitCount) {
    gainedExp = 0
    gainedCoin = 0
  } else {
    gainedExp = hConfig.resubmitExp
    gainedCoin = hConfig.resubmitCoin
  }

  // 3. Write userHomeworks
  if (existing) {
    const newRecord = { ...recordMeta, _submitCount: nextResubmitCount }
    await db.update(schema.userHomeworks).set({
      files: files || null,
      content: content || null,
      record: newRecord,
    }).where(and(
      eq(schema.userHomeworks.userId, user.id),
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.homeworkCid, Number(homeworkCid)),
    ))
  } else {
    await db.insert(schema.userHomeworks).values({
      userId: user.id,
      courseId,
      homeworkCid: Number(homeworkCid),
      files: files || null,
      content: content || null,
      record: { _submitCount: 0 },
    })
  }

  // 4. Update userCourses.exp + coin (homework score = 0, exp/coin = gained) + medals
  await notifyCourseProgress({
    userId: user.id,
    courseId,
    score: 0,
    scoreKey: 'homeworkScore',
    exp: gainedExp,
    coin: gainedCoin,
  })

  // 5. Broadcast danmaku to the class room (fire-and-forget, does not affect response)
  void broadcastSubmitDanmaku({
    userId: user.id,
    kind: 'homework',
    gainedExp,
    gainedCoin,
  })

  return cResp({ gainedExp, gainedCoin })
})
