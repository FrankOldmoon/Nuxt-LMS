/**
 * raceQuestionEnd / raceEnd：题结束/竞赛结束
 */
import { raceStates, broadcastToRace, computeRaceScores } from '../state'

/** raceQuestionEnd: 计算 top3 + 广播 raceQuestionEnd */
export function handleRaceQuestionEnd(_peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race || !race.activeQuestionCid) return
  const questionCid = race.activeQuestionCid
  const qAnswers = race.answers.get(questionCid)
  const results: any[] = []
  if (qAnswers) {
    for (const [uid, info] of qAnswers) {
      const timeUsed = Math.round((info.submittedAt - race.questionStartedAt) / 100) / 10
      results.push({ userId: uid, from: info.from, correct: info.correct, rate: info.rate, timeUsed })
    }
  }
  results.sort((a, b) => a.correct !== b.correct ? (a.correct ? -1 : 1) : a.timeUsed - b.timeUsed)
  const top3 = results.slice(0, 3)
  broadcastToRace(pin, JSON.stringify({
    type: 'raceQuestionEnd', raceCid: race.raceCid, questionCid, results, top3,
    answeredCount: qAnswers?.size || 0,
  }))
  race.activeQuestionCid = null
}

/** raceEnd: 计算总分 + 广播 raceEnd + 清理 raceStates */
export function handleRaceEnd(_peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race) return
  const summary = computeRaceScores(race)
  broadcastToRace(pin, JSON.stringify({
    type: 'raceEnd', raceCid: race.raceCid, leaderboard: summary, scores: summary,
  }))
  raceStates.delete(pin)
}
