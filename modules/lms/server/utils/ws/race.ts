/**
 * 竞赛（Race）WebSocket 消息处理
 *
 * 处理 type: raceJoin / raceStart / raceQuestion / raceAnswer /
 *           raceQuestionEnd / raceEnd / raceOnline
 *
 * 房间表 / 状态表 / 广播函数 / 竞赛计算 全部从 ./state 引入（统一显式 export）。
 * case 体按 type 拆到 race-handlers/*.ts，本文件仅做 dispatch。
 */
import { raceRooms, broadcastToRace, leaveRaceRoom } from './state'
import { handleRaceJoin, handleRaceOnline } from './race-handlers/join'
import { handleRaceStart } from './race-handlers/start'
import { handleRaceQuestion } from './race-handlers/question'
import { handleRaceAnswer } from './race-handlers/answer'
import { handleRaceQuestionEnd, handleRaceEnd } from './race-handlers/end'

/** 返回 true 表示消息已被处理 */
export function handleRaceMessage(peer: any, data: any): boolean {
  const { type } = data
  switch (type) {
    case 'raceJoin':       return handleRaceJoin(peer, data), true
    case 'raceOnline':     return handleRaceOnline(peer, data), true
    case 'raceStart':      return handleRaceStart(peer, data), true
    case 'raceQuestion':   return handleRaceQuestion(peer, data), true
    case 'raceAnswer':     return handleRaceAnswer(peer, data), true
    case 'raceQuestionEnd':return handleRaceQuestionEnd(peer, data), true
    case 'raceEnd':        return handleRaceEnd(peer, data), true
  }
  return false
}

/** 连接关闭时清理 race 房间 */
export function cleanupRacePeer(peer: any) {
  const pin = peer._racePin; if (!pin || !raceRooms.has(pin)) return
  const uid = peer._userId
  if (uid) {
    broadcastToRace(pin, JSON.stringify({ type: 'raceOnlineUpdate', pin,
      userId: uid, from: peer._userName || 'anonymous', online: false }))
  }
  leaveRaceRoom(pin, peer)
}
