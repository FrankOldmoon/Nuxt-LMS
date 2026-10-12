/**
 * raceQuestionEnd / raceEnd：题结束/竞赛结束
 *
 * 安全策略：
 *  - 客户端发送的 raceQuestionEnd / raceEnd 仅课程教师/管理员可执行
 *    （服务端自动收题定时器以 peer=null 内部调用，不走鉴权）；
 *    防止任意用户提前收题/触发结算干扰竞赛。
 *  - 排名奖（rank1/2/3 exp/coin）按 (courseId, raceCid, userId) 内存去重，
 *    防止重启竞赛会话反复结算刷排名奖励。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'
import { raceStates, raceAutoEndTimers, broadcastToRace, computeRaceScores } from '../state'
import { addCourseScore } from '../../userScore/course'
import { checkAndAwardMedals } from '../../medals/checker'
import { findUserSubmitRecord } from '../../submit/record'
import { notifyCourseProgressMax } from '../../submit/progress'
import { requireWsRaceTeacher } from './auth'
import { clearRaceAutoEnd, setRaceQuestionEndFn } from './question'

/** 排名奖励内存去重：`${courseId}:${raceCid}:${userId}` 已发放过则不再发（进程级） */
const rankRewarded = new Set<string>()

/** raceQuestionEnd: 计算 top3 + 广播 raceQuestionEnd */
export async function handleRaceQuestionEnd(peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race || !race.activeQuestionCid) return
  // 客户端触发的收题需教师鉴权（peer=null 为服务端定时器内部调用，跳过）
  if (peer) {
    const teacher = await requireWsRaceTeacher(peer, race.courseId)
    if (!teacher) return
  }
  clearRaceAutoEnd(pin)
  const questionCid = race.activeQuestionCid
  const qAnswers = race.answers.get(questionCid)
  const results: any[] = []
  if (qAnswers) {
    for (const [uid, info] of qAnswers) {
      const timeUsed = Math.round((info.submittedAt - race.questionStartedAt) / 100) / 10
      results.push({ userId: uid, from: info.from, avatarImg: info.avatarImg || null, avatarFrame: info.avatarFrame || null, correct: info.correct, rate: info.rate, timeUsed })
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

/** 服务端自动收题：timeLimit 到后触发（由 question.ts 的定时器回调调用，peer 无意义） */
setRaceQuestionEndFn((pin: string) => {
  handleRaceQuestionEnd(null, { pin }).catch((e) => console.error('[ws] race auto end error:', e))
})

/** raceEnd: 计算总分 + 广播 raceEnd + 落库成绩/参与奖/排名奖 + 清理 raceStates */
export async function handleRaceEnd(peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race) return
  // 客户端触发的结束需教师鉴权（防任意用户触发结算刷排名奖）
  if (peer) {
    const teacher = await requireWsRaceTeacher(peer, race.courseId)
    if (!teacher) return
  }
  clearRaceAutoEnd(pin)
  const summary = computeRaceScores(race)
  broadcastToRace(pin, JSON.stringify({
    type: 'raceEnd', raceCid: race.raceCid, leaderboard: summary, scores: summary,
  }))
  // fire-and-forget；raceStates 随后删除，重复 raceEnd 不会重发
  void settleRace(race, summary)
  raceStates.delete(pin)
}

/**
 * 竞赛结算：
 *  1. 按学生聚合本场所有作答，写入 userRaces（取该生最高分）
 *  2. 首次参与发放 participateExp / participateCoin
 *  3. userCourses.questionScore 最高分模式更新
 *  4. 前 3 名发排名奖励 rank1/2/3 exp/coin
 * 各段独立容错：成绩落库失败不影响排名奖励发放。
 */
async function settleRace(race: any, summary: any[]) {
  try {
    // getCourseLmsConfig 通过 Nuxt auto-import 引入
    const config = await getCourseLmsConfig(race.courseId)
    const rConfig = config?.race || {}

    // 1. 聚合每个学生的作答（按题答案 Map 转 user → 每题明细）
    const perUser = new Map<number, { from: string; answers: any[] }>()
    for (const [questionCid, answers] of race.answers) {
      for (const [uid, info] of answers) {
        const cur = perUser.get(uid) || { from: info.from, answers: [] }
        cur.answers.push({
          questionCid: Number(questionCid),
          answer: info.answer,
          rate: info.rate,
          correct: info.correct,
        })
        perUser.set(uid, cur)
      }
    }
    if (perUser.size === 0) return

    // 题目分值（与实时计分 computeRaceScores 对齐：Σ(rate * point)）
    const questionIds = [...race.answers.keys()]
    const pointMap = new Map<number, number>()
    try {
      const qrows = questionIds.length
        ? await db.query.questions.findMany({
            where: and(eq(schema.questions.courseId, race.courseId), inArray(schema.questions.cid, questionIds)),
          })
        : []
      for (const q of qrows) pointMap.set(Number(q.cid), Number(q.point) || 1)
    } catch { /* 题目分值加载失败回退每题 1 分 */ }

    // 2/3. 逐学生落库 + questionScore/参与奖（单个失败不影响其他学生）
    for (const [uid, d] of perUser) {
      try {
        let score = 0
        const records = d.answers.map((a: any) => {
          const point = pointMap.get(a.questionCid) || 1
          score += a.rate * point
          return { ...a, point }
        })
        score = Math.round(score * 100) / 100

        const existing = await findUserSubmitRecord(uid, race.courseId, 'race', race.raceCid)
        const prevScore = Number(existing?.score) || 0
        const bestScore = Math.max(prevScore, score)
        const isFirstSubmit = !existing
        const exp = isFirstSubmit ? (rConfig.participateExp || rConfig.participationExp || 0) : 0
        const coin = isFirstSubmit ? (rConfig.participateCoin || rConfig.participationCoin || 0) : 0

        if (existing) {
          await db.update(schema.userRaces).set({
            records,
            score: String(bestScore),
          }).where(and(
            eq(schema.userRaces.userId, uid),
            eq(schema.userRaces.courseId, race.courseId),
            eq(schema.userRaces.raceCid, race.raceCid),
          ))
        } else {
          await db.insert(schema.userRaces).values({
            userId: uid,
            courseId: race.courseId,
            raceCid: race.raceCid,
            records,
            score: String(score),
          })
        }

        // questionScore 最高分模式 + 参与经验/金币
        await notifyCourseProgressMax({
          userId: uid,
          courseId: race.courseId,
          score: bestScore,
          scoreKey: 'questionScore',
          exp,
          coin,
        })
      } catch { /* 单个学生结算失败静默 */ }
    }

    // 4. 排名奖励（前 3 名按最终成绩）— 只加经验金币，不改 questionScore 分项。
    //    防刷：同一 (courseId, raceCid, userId) 只发一次（内存去重，防止重启会话反复结算刷奖）。
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
      const rewardKey = `${race.courseId}:${race.raceCid}:${entry.userId}`
      if (rankRewarded.has(rewardKey)) continue
      await addCourseScore(entry.userId, race.courseId, 0, 'questionScore', exp, coin)
      rankRewarded.add(rewardKey)
      await checkAndAwardMedals(entry.userId, race.courseId)
    }
  } catch { /* 结算失败静默，不影响广播 */ }
}