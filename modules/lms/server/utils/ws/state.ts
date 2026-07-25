/**
 * LMS WebSocket 共享状态与房间广播工具
 *
 * 修复 race.ts/class.ts/group.ts 中隐式全局未定义的 bug：
 *   classRooms / raceRooms / groupRooms / votes / quickAnswers / raceStates
 *   及其对应的 broadcast* / compute* 函数统一在此显式 export。
 *
 * base/ws/state.ts 仅提供 userPeers 与通用 rooms（系统级广播）。
 * 业务级 class/race/group 状态由本文件 + lms 自身维护。
 */

// ==================== 房间表（classId/pin/groupId → 在线连接集合） ====================
export const classRooms = new Map<number, Set<any>>()
export const raceRooms  = new Map<string, Set<any>>()
export const groupRooms = new Map<string, Set<any>>()

// ==================== 业务状态 ====================
export type VoteRecord = {
  classId: number; question: string; options: string[]
  results: number[]; votedUsers: Set<string>
}
export type QuickAnswerRecord = { question: string; winner: string | null; submitted: Set<string> }
export type RaceAnswerInfo = {
  answer: any; from: string; userId: number
  rate: number; correct: boolean; submittedAt: number
}
export type RaceState = {
  raceCid: number; courseId: number
  currentQuestion: number; totalQuestions: number
  activeQuestionCid: number | null
  timeLimit: number; questionStartedAt: number; startedAt: number
  answers: Map<number, Map<number, RaceAnswerInfo>>
}
export const votes        = new Map<string, VoteRecord>()
export const quickAnswers = new Map<number, QuickAnswerRecord>()
export const raceStates   = new Map<string, RaceState>()

// ==================== 广播工具 ====================
function safeSend(peer: any, msg: string) { try { peer.send(msg) } catch { /* 断开 */ } }

export function broadcastToClass(classId: number, msg: string) {
  const room = classRooms.get(classId); if (!room) return
  for (const p of room) safeSend(p, msg)
}
export function broadcastToRace(pin: string, msg: string) {
  const room = raceRooms.get(pin); if (!room) return
  for (const p of room) safeSend(p, msg)
}
export function broadcastToGroup(groupId: string, msg: string) {
  const room = groupRooms.get(groupId); if (!room) return
  for (const p of room) safeSend(p, msg)
}

// ==================== 房间 join/leave ====================
function addRoom(map: Map<any, Set<any>>, key: any, peer: any) {
  if (!map.has(key)) map.set(key, new Set())
  map.get(key)!.add(peer)
}
function dropRoom(map: Map<any, Set<any>>, key: any, peer: any) {
  const room = map.get(key); if (!room) return
  room.delete(peer); if (room.size === 0) map.delete(key)
}

export function joinClassRoom(classId: number, peer: any) {
  addRoom(classRooms, classId, peer); peer._classId = classId
}
export function leaveClassRoom(classId: number, peer: any) { dropRoom(classRooms, classId, peer) }
export function joinRaceRoom(pin: string, peer: any) {
  addRoom(raceRooms, pin, peer); peer._racePin = pin
}
export function leaveRaceRoom(pin: string, peer: any) { dropRoom(raceRooms, pin, peer) }
export function joinGroupRoom(groupId: string, peer: any) {
  addRoom(groupRooms, groupId, peer)
  if (!peer._groupIds) peer._groupIds = new Set<string>()
  peer._groupIds.add(groupId)
}
export function leaveGroupRoom(groupId: string, peer: any) {
  dropRoom(groupRooms, groupId, peer)
  if (peer._groupIds) peer._groupIds.delete(groupId)
}

// ==================== 竞赛计算 ====================
export function getRaceOnlineUsers(pin: string) {
  const room = raceRooms.get(pin); if (!room) return []
  const out: Array<{ userId: number; from: string }> = []
  for (const p of room) {
    if (p._userId) out.push({ userId: p._userId, from: p._userName || 'anonymous' })
  }
  return out
}
export function computeRaceScores(race: RaceState) {
  const totals = new Map<number, { userId: number; from: string; score: number }>()
  for (const answers of race.answers.values()) {
    for (const [uid, info] of answers) {
      const cur = totals.get(uid) || { userId: uid, from: info.from, score: 0 }
      cur.score += info.rate; totals.set(uid, cur)
    }
  }
  return [...totals.values()].sort((a, b) => b.score - a.score)
}
