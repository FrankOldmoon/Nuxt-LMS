/**
 * raceQuestion：设置当前题 + 广播 raceQuestion
 */
import { raceStates, broadcastToRace } from '../state'

export function handleRaceQuestion(_peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race) return
  const questionCid = Number(data.questionCid)
  const questionIndex = Number(data.questionIndex) || 0
  race.currentQuestion = questionIndex
  race.activeQuestionCid = questionCid
  race.timeLimit = Number(data.timeLimit) || 30
  race.questionStartedAt = Date.now()
  if (!race.answers.has(questionCid)) race.answers.set(questionCid, new Map())
  broadcastToRace(pin, JSON.stringify({ type: 'raceQuestion', raceCid: race.raceCid,
    questionCid, questionIndex, totalQuestions: race.totalQuestions, timeLimit: race.timeLimit }))
}
