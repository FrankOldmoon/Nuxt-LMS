/**
 * raceAnswer：记录单用户答案 + 广播 raceAnswerUpdate / raceScores
 */
import { raceStates, broadcastToRace, computeRaceScores } from '../state'

export function handleRaceAnswer(_peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race || !race.activeQuestionCid) return
  const userId = Number(data.userId)
  const questionCid = race.activeQuestionCid
  const qAnswers = race.answers.get(questionCid)
  if (!qAnswers || qAnswers.has(userId)) return
  qAnswers.set(userId, {
    answer: data.answer, from: String(data.from || 'anonymous'), userId,
    rate: Number(data.rate) || 0, correct: !!data.correct, submittedAt: Date.now(),
  })
  broadcastToRace(pin, JSON.stringify({ type: 'raceAnswerUpdate',
    raceCid: race.raceCid, questionCid, answeredCount: qAnswers.size }))
  broadcastToRace(pin, JSON.stringify({ type: 'raceScores',
    raceCid: race.raceCid, scores: computeRaceScores(race) }))
}
