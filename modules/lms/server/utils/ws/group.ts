/**
 * 小组 WebSocket 消息处理
 *
 * 处理 type: joinGroup / groupChat / leaveGroup
 * 纯内存转发，不持久化任何消息。
 */

/** 返回 true 表示消息已被处理 */
export function handleGroupMessage(peer: any, data: any): boolean {
  const { type } = data

  switch (type) {
    case 'joinGroup': {
      const groupId = String(data.groupId || '')
      if (!groupId) return true
      if (!groupRooms.has(groupId)) groupRooms.set(groupId, new Set())
      groupRooms.get(groupId)!.add(peer)
      // 一个连接可能加入多个小组房间，用数组记录
      if (!peer._groupIds) peer._groupIds = new Set<string>()
      peer._groupIds.add(groupId)
      if (data.userId) peer._userId = Number(data.userId)
      if (data.from) peer._userName = String(data.from)
      peer.send(JSON.stringify({ type: 'joinedGroup', groupId }))
      return true
    }

    case 'groupChat': {
      const groupId = String(data.groupId || '')
      if (!groupId || !groupRooms.has(groupId)) return true
      const userId = Number(data.userId)
      const from = String(data.from || 'anonymous')
      const avatarImg = data.avatarImg || null
      const text = String(data.text || '').slice(0, 1000)
      if (!text) return true
      broadcastToGroup(groupId, JSON.stringify({
        type: 'groupChat',
        groupId,
        userId,
        from,
        avatarImg,
        text,
        ts: Date.now(),
      }))
      return true
    }

    case 'leaveGroup': {
      const groupId = String(data.groupId || '')
      if (!groupId) return true
      if (groupRooms.has(groupId)) {
        groupRooms.get(groupId)!.delete(peer)
        if (groupRooms.get(groupId)!.size === 0) {
          groupRooms.delete(groupId)
        }
      }
      if (peer._groupIds) peer._groupIds.delete(groupId)
      return true
    }
  }

  return false
}

/** 连接关闭时清理所有小组房间 */
export function cleanupGroupPeer(peer: any) {
  const groupIds: Set<string> | undefined = peer._groupIds
  if (!groupIds || groupIds.size === 0) return
  for (const groupId of groupIds) {
    const room = groupRooms.get(groupId)
    if (room) {
      room.delete(peer)
      if (room.size === 0) {
        groupRooms.delete(groupId)
      }
    }
  }
  groupIds.clear()
}
