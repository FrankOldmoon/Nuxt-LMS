/**
 * Group WebSocket message handling
 *
 * Handles type: joinGroup / groupChat / leaveGroup
 * Pure in-memory forwarding, does not persist any messages.
 *
 * The room table / broadcast functions are imported from ./state (unified explicit export).
 */
import { groupRooms, broadcastToGroup, joinGroupRoom, leaveGroupRoom } from './state'

/** Returns true to indicate the message has been handled */
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
        avatarImg: data.avatarImg || null, text, ts: Date.now(),
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

/** Clean up all group rooms when the connection closes */
export function cleanupGroupPeer(peer: any) {
  const groupIds: Set<string> | undefined = peer._groupIds
  if (!groupIds || groupIds.size === 0) return
  for (const groupId of groupIds) leaveGroupRoom(groupId, peer)
  groupIds.clear()
}
