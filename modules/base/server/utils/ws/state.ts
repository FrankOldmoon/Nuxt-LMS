/**
 * WebSocket 共享状态与工具函数
 *
 * base 只提供用户级连接池 + 通用房间。
 * lms 的 class/race/group 状态由 lms 自身维护（通过 ws/registry 注册 handler/cleanup）。
 */

// ====================== 用户级连接池（私信推送） ======================
export const userPeers = new Map<number, Set<any>>()

/** 所有活跃连接（用于系统级广播，如 site-config-changed） */
const allPeers = new Set<any>()

/** 注册活跃连接（ws open 时调用） */
export function trackPeer(peer: any) {
  allPeers.add(peer)
}

/** 注销活跃连接（ws close 时调用） */
export function untrackPeer(peer: any) {
  allPeers.delete(peer)
}

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

/** 广播到所有在线连接（系统级消息，如配置变更） */
export function broadcastToAll(msg: object) {
  const text = JSON.stringify(msg)
  for (const p of allPeers) {
    try {
      p.send(text)
    } catch {
      // 忽略
    }
  }
}

// ====================== 通用房间 ======================
/** roomId → 在线连接集合 */
export const rooms = new Map<string, Set<any>>()

/** 加入房间（同时记录 peer._rooms 以便关闭时高效清理） */
export function joinRoom(roomId: string, peer: any) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set())
  rooms.get(roomId)!.add(peer)
  if (!peer._rooms) peer._rooms = new Set<string>()
  peer._rooms.add(roomId)
}

/** 离开房间 */
export function leaveRoom(roomId: string, peer: any) {
  const room = rooms.get(roomId)
  if (!room) return
  room.delete(peer)
  if (room.size === 0) rooms.delete(roomId)
  if (peer._rooms) peer._rooms.delete(roomId)
}

/** 广播到房间 */
export function broadcastToRoom(roomId: string, msg: string) {
  const room = rooms.get(roomId)
  if (!room) return
  for (const p of room) {
    try {
      p.send(msg)
    } catch {
      // 忽略
    }
  }
}

/** 清理某 peer 所在的所有房间（连接关闭时调用） */
export function cleanupPeerRooms(peer: any) {
  const joined = peer._rooms as Set<string> | undefined
  if (!joined) return
  for (const roomId of joined) {
    const room = rooms.get(roomId)
    if (room) {
      room.delete(peer)
      if (room.size === 0) rooms.delete(roomId)
    }
  }
  joined.clear()
}
