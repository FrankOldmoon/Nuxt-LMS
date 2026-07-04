/**
 * WebSocket 共享状态与工具函数
 *
 * 所有房间、投票、抢答、竞赛状态集中管理，
 * 供 ws.ts 主处理器与各功能模块（class / race）共享。
 */

// ====================== 用户级连接池（私信推送） ======================
export const userPeers = new Map<number, Set<any>>()

/** 向指定用户的所有在线连接推送消息 */
export function sendToUser(userId: number, msg: object) {
  const peers = userPeers.get(userId)
  if (peers) {
    const text = JSON.stringify(msg)
    for (const p of peers) {
      try {
        p.send(text)
      } catch {
        // 连接已断开，忽略
      }
    }
  }
}

// ====================== 班级房间 ======================
export const classRooms = new Map<number, Set<any>>()

export function broadcastToClass(cid: number, msg: string) {
  const room = classRooms.get(cid)
  if (room) {
    for (const p of room) {
      p.send(msg)
    }
  }
}

// ====================== 投票 / 抢答 ======================
export const votes = new Map<string, { classId: number; question: string; options: string[]; results: number[]; votedUsers: Set<string> }>()

export const quickAnswers = new Map<number, { question: string; winner: string | null; submitted: Set<string> }>()

// ====================== 竞赛 ======================
export interface RaceAnswer {
  answer: any
  from: string
  userId: number
  rate: number
  correct: boolean
  submittedAt: number
}

export interface RaceState {
  raceCid: number
  courseId: number
  currentQuestion: number
  totalQuestions: number
  activeQuestionCid: number | null
  timeLimit: number
  questionStartedAt: number
  startedAt: number
  answers: Map<number, Map<number, RaceAnswer>>
}

/** pin = `${classId}_${chapterId}` → RaceState */
export const raceStates = new Map<string, RaceState>()

/** pin → Set<peer> */
export const raceRooms = new Map<string, Set<any>>()

export function broadcastToRace(pin: string, msg: string) {
  const room = raceRooms.get(pin)
  if (room) {
    for (const p of room) {
      p.send(msg)
    }
  }
}

/** 从 race answers 计算实时分数汇总 */
export function computeRaceScores(race: RaceState) {
  const userTotals = new Map<number, { from: string; score: number; correctCount: number }>()
  for (const [, qAnswers] of race.answers) {
    for (const [uid, info] of qAnswers) {
      if (!userTotals.has(uid)) {
        userTotals.set(uid, { from: info.from, score: 0, correctCount: 0 })
      }
      const ut = userTotals.get(uid)!
      if (info.correct) ut.correctCount++
      ut.score += info.rate
    }
  }
  const summary: any[] = []
  for (const [uid, info] of userTotals) {
    summary.push({ userId: uid, from: info.from, score: Math.round(info.score * 100) / 100, correctCount: info.correctCount })
  }
  summary.sort((a, b) => b.score - a.score)
  return summary
}

/** 获取 race 房间内所有在线用户 */
export function getRaceOnlineUsers(pin: string): { userId: number; from: string }[] {
  const room = raceRooms.get(pin)
  if (!room) return []
  const users: { userId: number; from: string }[] = []
  for (const p of room) {
    const uid = (p as any)._userId
    const from = (p as any)._userName
    if (uid) users.push({ userId: uid, from: from || 'anonymous' })
  }
  return users
}
