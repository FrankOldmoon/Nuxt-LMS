/**
 * 班级 WebSocket 消息处理
 *
 * 处理 type: join / invite / danmaku /
 *           voteStart / voteSubmit / voteEnd /
 *           quickAnswerStart / quickAnswerSubmit / quickAnswerEnd /
 *           online / chatroom
 *
 * case 体按 type 拆到 class-handlers/*.ts，本文件仅做 dispatch + cleanup。
 */
import { classRooms, broadcastToClass, leaveClassRoom } from './state'
import { handleClassJoin, handleClassInvite, handleClassDanmaku, handleClassOnline, handleClassChatroom } from './class-handlers/join'
import { handleClassVoteStart, handleClassVoteSubmit, handleClassVoteEnd } from './class-handlers/vote'
import { handleClassQuickAnswerStart, handleClassQuickAnswerSubmit, handleClassQuickAnswerEnd } from './class-handlers/quickAnswer'

/** 返回 true 表示消息已被处理 */
export function handleClassMessage(peer: any, data: any): boolean {
  const { type, classId } = data
  if (!classId && type !== 'join') return false
  switch (type) {
    case 'join':              return handleClassJoin(peer, data), true
    case 'invite':            return handleClassInvite(peer, data), true
    case 'danmaku':           return handleClassDanmaku(peer, data), true
    case 'online':            return handleClassOnline(peer, data), true
    case 'chatroom':          return handleClassChatroom(peer, data), true
    case 'voteStart':         return handleClassVoteStart(peer, data), true
    case 'voteSubmit':        return handleClassVoteSubmit(peer, data), true
    case 'voteEnd':           return handleClassVoteEnd(peer, data), true
    case 'quickAnswerStart':  return handleClassQuickAnswerStart(peer, data), true
    case 'quickAnswerSubmit': return handleClassQuickAnswerSubmit(peer, data), true
    case 'quickAnswerEnd':    return handleClassQuickAnswerEnd(peer, data), true
  }
  return false
}

/** 连接关闭时清理班级房间 */
export function cleanupClassPeer(peer: any) {
  const cid = peer._classId; if (!cid || !classRooms.has(cid)) return
  const uid = peer._userId
  if (uid) {
    broadcastToClass(cid, JSON.stringify({ type: 'onlineUpdate', classId: cid,
      userId: uid, from: peer._userName || 'anonymous', online: false }))
  }
  leaveClassRoom(cid, peer)
}
