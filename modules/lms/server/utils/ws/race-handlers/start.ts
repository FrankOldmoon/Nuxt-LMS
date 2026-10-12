/**
 * raceStart：初始化 raceStates[pin] 并广播 raceStart
 *
 * 安全策略（防伪造竞赛会话刷分）：
 *  - 仅课程教师/管理员/全局教师可发起竞赛
 *  - 竞赛定义以 DB 为准：races 行必须存在，courseId/raceCid/questionIds 采信服务端，
 *    questionIds 白名单供答题判分使用（白名单外题目一律忽略）
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { raceStates, broadcastToRace } from '../state'
import { requireWsRaceTeacher } from './auth'

export async function handleRaceStart(peer: any, data: any) {
  const pin = String(data.pin || ''); if (!pin) return
  const raceCid = Number(data.raceCid); const courseId = Number(data.courseId)
  if (!raceCid || !courseId) return

  // 教师鉴权：防止任何登录用户（或未登录 WS 客户端）自建竞赛会话向任意课程记分
  const teacher = await requireWsRaceTeacher(peer, courseId)
  if (!teacher) return

  // 竞赛定义校验：race 必须存在于该课程，questionIds 以 DB 为准
  let raceDef: any = null
  try {
    raceDef = await db.query.races.findFirst({
      where: and(eq(schema.races.courseId, courseId), eq(schema.races.cid, raceCid)),
    })
  } catch { raceDef = null }
  if (!raceDef) {
    try { peer.send(JSON.stringify({ type: 'error', message: 'race not found' })) } catch { /* 断开 */ }
    return
  }
  const questionIds: number[] = (Array.isArray(raceDef.questionIds) ? raceDef.questionIds : [])
    .map((id: any) => Number(id)).filter(Boolean)

  const totalQuestions = questionIds.length || Number(data.totalQuestions) || 0
  raceStates.set(pin, {
    raceCid, courseId, currentQuestion: -1, totalQuestions,
    activeQuestionCid: null, timeLimit: Number(data.timeLimit) || 30,
    questionStartedAt: 0, startedAt: Date.now(), answers: new Map(),
    questionPoints: new Map(), questionIds,
  })
  broadcastToRace(pin, JSON.stringify({ type: 'raceStart', raceCid, courseId,
    from: data.from || 'teacher', totalQuestions, timeLimit: Number(data.timeLimit) || 30 }))
}
