/**
 * 小组 WebSocket 消息处理
 *
 * 处理 type: joinGroup / groupChat / leaveGroup
 * 纯内存转发，不持久化任何消息。
 *
 * 房间表 / 广播函数 从 ./state 引入（统一显式 export）。
 */
import { groupRooms, broadcastToGroup, joinGroupRoom, leaveGroupRoom } from './state'

/** 返回 true 表示消息已被处理 */
export function handleGroupMessage(peer: any, data: any): boolean {
  const { type } = data
  switch (type) {
    case 'joinGroup': {
      const groupId = String(data.groupId || ''); if (!groupId) return true
      joinGroupRoom(groupId, peer)
      if (data.userId) peer._userId = Number(data.userId)
      if (data.from) peer._userName = String(data.from)
      peer.send(JSON.stringify({ type: 'joinedGroup', groupId }))
      return true
    }

    case 'groupChat': {
      const groupId = String(data.groupId || '')
      if (!groupId || !groupRooms.has(groupId)) return true
      const text = String(data.text || '').slice(0, 1000); if (!text) return true
      broadcastToGroup(groupId, JSON.stringify({
        type: 'groupChat', groupId,
        userId: Number(data.userId), from: String(data.from || 'anonymous'),
        avatarImg: data.avatarImg || null, avatarFrame: data.avatarFrame || null, text, ts: Date.now(),
      }))
      return true
    }

    case 'leaveGroup': {
      const groupId = String(data.groupId || ''); if (!groupId) return true
      leaveGroupRoom(groupId, peer)
      return true
    }
  }
  return false
}

/** 连接关闭时清理所有小组房间 */
export function cleanupGroupPeer(peer: any) {
  const groupIds: Set<string> | undefined = peer._groupIds
  if (!groupIds || groupIds.size === 0) return
  for (const groupId of groupIds) leaveGroupRoom(groupId, peer)
  groupIds.clear()
}
