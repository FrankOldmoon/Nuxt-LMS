/**
 * raceQuestionEnd / raceEnd：题结束/竞赛结束
 */
import { raceStates, broadcastToRace, computeRaceScores } from '../state'
import { addCourseScore } from '../../userScore/course'
import { checkAndAwardMedals } from '../../medals/checker'

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

/** raceEnd: 计算总分 + 广播 raceEnd + 结算排名奖励 + 清理 raceStates */
export function handleRaceEnd(_peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race) return
  const summary = computeRaceScores(race)
  broadcastToRace(pin, JSON.stringify({
    type: 'raceEnd', raceCid: race.raceCid, leaderboard: summary, scores: summary,
  }))
  // 结算排名奖励（fire-and-forget；raceStates 随后删除，重复 raceEnd 不会重发）
  void settleRaceRankRewards(race, summary)
  raceStates.delete(pin)
}

/**
 * 竞赛排名奖励：按最终成绩（rate 累计）前 3 名发放 rank1/2/3 的 exp/coin。
 * 只加经验金币，不改变 raceScore 分项与课程总分（排名奖是额外激励，非竞赛分）。
 */
async function settleRaceRankRewards(race: any, summary: any[]) {
  try {
    // getCourseLmsConfig 通过 Nuxt auto-import 引入
    const config = await getCourseLmsConfig(race.courseId)
    const rConfig = config?.race || {}
    const ranks = [
      { exp: rConfig.rank1Exp, coin: rConfig.rank1Coin },
      { exp: rConfig.rank2Exp, coin: rConfig.rank2Coin },
      { exp: rConfig.rank3Exp, coin: rConfig.rank3Coin },
    ]
    for (let i = 0; i < ranks.length; i++) {
      const entry = summary[i]
      if (!entry) break
      const exp = Number(ranks[i].exp) || 0
      const coin = Number(ranks[i].coin) || 0
      if (exp <= 0 && coin <= 0) continue
      await addCourseScore(entry.userId, race.courseId, 0, 'raceScore', exp, coin)
      await checkAndAwardMedals(entry.userId, race.courseId)
    }
  } catch { /* 结算失败静默，不影响广播 */ }
}
