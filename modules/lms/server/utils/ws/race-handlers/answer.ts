/**
 * raceAnswer：记录单用户答案 + 广播 raceAnswerUpdate / raceScores
 *
 * 判分安全：
 *  - rate/correct 不信任客户端（show 不再下发答案，客户端本也算不出）。
 *    服务端按 questions 表定义重算（与 /api/questions/submit 同一判分逻辑）。
 *  - 答题者身份强制取 WS 登录用户（peer._authUserId），客户端传的 userId 一律忽略，
 *    防止冒充他人答题；未登录不允许答题。
 *  - 题目必须在本场竞赛白名单内（raceStart 时从 DB 载入），白名单外题目忽略。
 *  - 题目在 DB 中不存在时判 0 分（不再回退客户端 rate），杜绝伪造题 id 得满分。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { raceStates, broadcastToRace, computeRaceScores } from '../state'
import { computeServerRate } from '../../submit/verify'

export async function handleRaceAnswer(peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race || !race.activeQuestionCid) return

  // 身份校验：必须登录，且只能以本人身份答题（客户端 data.userId 一律忽略）
  const userId = Number(peer?._authUserId) || 0
  if (!userId) {
    try { peer?.send(JSON.stringify({ type: 'error', message: 'Unauthorized' })) } catch { /* 断开 */ }
    return
  }

  const questionCid = race.activeQuestionCid
  const qAnswers = race.answers.get(questionCid)
  if (!qAnswers || qAnswers.has(userId)) return

  // 题目必须属于本场竞赛（raceStart 时从 DB 载入的白名单）
  if (!race.questionIds.includes(Number(questionCid))) return

  // 服务端判分：按题目定义重算；查不到题目一律 0 分（不采信客户端 rate/correct）
  let rate = 0
  let correct = false
  // 正确答案 / 解析：判分时一并取出，答完私发给答题者本人（不向房间广播，避免泄露给未作答学生）
  let correctAnswer: any = null
  let explanation: any = null
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
      correctAnswer = (question as any).answer ?? null
      explanation = (question as any).explanation ?? null
    }
  } catch { /* 判分异常按 0 分处理 */ }

  qAnswers.set(userId, {
    answer: data.answer, from: String(peer._authUserName || data.from || 'anonymous'), userId,
    avatarImg: data.avatarImg || null, avatarFrame: data.avatarFrame || null,
    rate, correct, submittedAt: Date.now(),
  })
  broadcastToRace(pin, JSON.stringify({ type: 'raceAnswerUpdate',
    raceCid: race.raceCid, questionCid, answeredCount: qAnswers.size }))
  broadcastToRace(pin, JSON.stringify({ type: 'raceScores',
    raceCid: race.raceCid, scores: computeRaceScores(race) }))

  // 答完即把「正误 + 正确答案/解析」私发给答题者本人（该用户本场该题已锁定，无法再答）
  try {
    peer.send(JSON.stringify({
      type: 'raceAnswerResult',
      raceCid: race.raceCid,
      questionCid,
      rate,
      correct,
      answer: correctAnswer,
      explanation,
    }))
  } catch { /* peer 已断开 */ }

  // 答对者弹幕：向竞赛房间广播（竞赛参与者均可收到，含学生端）
  if (correct) {
    const point = race.questionPoints.get(questionCid) || 1
    broadcastToRace(pin, JSON.stringify({
      type: 'raceAnswerCorrect',
      raceCid: race.raceCid,
      questionCid,
      userId,
      from: String(peer._authUserName || data.from || 'anonymous'),
      gain: Math.round(rate * point * 100) / 100,
    }))
  }
}
