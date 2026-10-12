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
  // 鉴权/判分类 handler 为 async，统一捕获异常避免 unhandled rejection
  const run = (p: Promise<void>) => { p.catch((e) => console.error('[ws] race handler error:', e)) }
  switch (type) {
    case 'raceJoin':       handleRaceJoin(peer, data); return true
    case 'raceOnline':     handleRaceOnline(peer, data); return true
    case 'raceStart':      run(handleRaceStart(peer, data)); return true
    case 'raceQuestion':   run(handleRaceQuestion(peer, data)); return true
    case 'raceAnswer':     run(handleRaceAnswer(peer, data)); return true
    case 'raceQuestionEnd':run(handleRaceQuestionEnd(peer, data)); return true
    case 'raceEnd':        run(handleRaceEnd(peer, data)); return true
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
