/**
 * raceAnswer：记录单用户答案 + 广播 raceAnswerUpdate / raceScores
 *
 * 判分安全：rate/correct 不信任客户端（show 不再下发答案，客户端本也算不出）。
 * 服务端按 questions 表定义重算（与 /api/questions/submit 同一判分逻辑），
 * 用重算结果覆盖后存储与广播。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { raceStates, broadcastToRace, computeRaceScores } from '../state'
import { computeServerRate } from '../../submit/verify'

export async function handleRaceAnswer(_peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race || !race.activeQuestionCid) return
  const userId = Number(data.userId)
  const questionCid = race.activeQuestionCid
  const qAnswers = race.answers.get(questionCid)
  if (!qAnswers || qAnswers.has(userId)) return

  // 服务端判分：按题目定义重算（客户端传的 rate/correct 仅作参考，不采信）
  let rate = Math.max(0, Math.min(1, Number(data.rate) || 0))
  let correct = !!data.correct
  try {
    const question = await db.query.questions.findFirst({
      where: and(
        eq(schema.questions.courseId, race.courseId),
        eq(schema.questions.cid, questionCid),
      ),
    })
    if (question) {
      rate = computeServerRate(question, data.answer)
      correct = rate > 0
      race.questionPoints.set(questionCid, Number(question.point) || 1)
    }
  } catch { /* 判分失败退回客户端值 */ }

  qAnswers.set(userId, {
    answer: data.answer, from: String(data.from || 'anonymous'), userId,
    avatarImg: data.avatarImg || null, avatarFrame: data.avatarFrame || null,
    rate, correct, submittedAt: Date.now(),
  })
  broadcastToRace(pin, JSON.stringify({ type: 'raceAnswerUpdate',
    raceCid: race.raceCid, questionCid, answeredCount: qAnswers.size }))
  broadcastToRace(pin, JSON.stringify({ type: 'raceScores',
    raceCid: race.raceCid, scores: computeRaceScores(race) }))
}
