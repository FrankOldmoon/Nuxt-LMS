/**
 * raceQuestion：设置当前题 + 广播 raceQuestion + 服务端自动收题 + 进度持久化
 *
 * 安全策略：仅课程教师/管理员可推进题目；questionCid 必须在本场竞赛白名单内
 * （raceStart 时从 DB 载入），防止伪造 questionCid 引入白名单外题目计分。
 */
import { raceStates, broadcastToRace, raceAutoEndTimers } from '../state'
import { requireWsRaceTeacher } from './auth'

export async function handleRaceQuestion(peer: any, data: any) {
  const pin = String(data.pin || '')
  const race = raceStates.get(pin); if (!race) return

  // 教师鉴权：推题属于教师控制消息
  const teacher = await requireWsRaceTeacher(peer, race.courseId)
  if (!teacher) return

  const questionCid = Number(data.questionCid)
  // 题目必须属于本场竞赛（白名单校验）
  if (!race.questionIds.includes(questionCid)) return
  const questionIndex = Number(data.questionIndex) || 0
  race.currentQuestion = questionIndex
  race.activeQuestionCid = questionCid
  race.timeLimit = Number(data.timeLimit) || 30
  race.questionStartedAt = Date.now()
  if (!race.answers.has(questionCid)) race.answers.set(questionCid, new Map())
  broadcastToRace(pin, JSON.stringify({ type: 'raceQuestion', raceCid: race.raceCid,
    questionCid, questionIndex, totalQuestions: race.totalQuestions, timeLimit: race.timeLimit }))

  // 进度持久化到 classRaces（教师刷新/进程重启后可按 currentIndex 续控；fire-and-forget）
  persistRaceProgress(pin, race, questionIndex)

  // 自动收题：timeLimit 后自动 raceQuestionEnd（教师提前结束会由 end 清理定时器）
  clearRaceAutoEnd(pin)
  raceAutoEndTimers.set(pin, setTimeout(() => {
    raceAutoEndTimers.delete(pin)
    handleRaceQuestionEndSafe(pin)
  }, race.timeLimit * 1000))
}

/** 教师进度快照到 classRaces（幂等 upsert） */
async function persistRaceProgress(pin: string, race: any, currentIndex: number) {
  try {
    const { db, schema } = await import('@nuxthub/db')
    const { and, eq } = await import('drizzle-orm')
    const classId = Number(String(pin).split('_')[0]) || 0
    if (!classId) return
    const existing = await db.query.classRaces.findFirst({
      where: and(
        eq(schema.classRaces.classId, classId),
        eq(schema.classRaces.courseId, race.courseId),
        eq(schema.classRaces.raceCid, race.raceCid),
      ),
    })
    const data = { currentIndex, lastQuestionStartedAt: new Date() }
    if (existing) {
      await db.update(schema.classRaces).set(data).where(and(
        eq(schema.classRaces.classId, classId),
        eq(schema.classRaces.courseId, race.courseId),
        eq(schema.classRaces.raceCid, race.raceCid),
      ))
    } else {
      await db.insert(schema.classRaces).values({
        classId, courseId: race.courseId, raceCid: race.raceCid,
        currentIndex, lastQuestionStartedAt: new Date(),
      })
    }
  } catch { /* 持久化失败静默 */ }
}

/** 由 end.ts 导出，避免循环依赖：清掉该竞赛自动收题定时器 */
export function clearRaceAutoEnd(pin: string) {
  const t = raceAutoEndTimers.get(pin)
  if (t) { clearTimeout(t); raceAutoEndTimers.delete(pin) }
}

/** 延迟引用 handleRaceQuestionEnd，避免与 end.ts 循环依赖 */
let _endFn: (pin: string) => void | null = null
export function setRaceQuestionEndFn(fn: (pin: string) => void) { _endFn = fn }
function handleRaceQuestionEndSafe(pin: string) { _endFn?.(pin) }
