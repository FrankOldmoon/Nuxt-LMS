/**
 * WebSocket shared state and utility functions
 *
 * base only provides user-level connection pool + generic rooms.
 * lms maintains its own class/race/group state (registers handler/cleanup via ws/registry).
 */

// ====================== User-level connection pool (private message push) ======================
export const userPeers = new Map<number, Set<any>>()

/** All active connections (for system-level broadcasts, e.g. site-config-changed) */
const allPeers = new Set<any>()

/** Register active connection (called on ws open) */
export function trackPeer(peer: any) {
  allPeers.add(peer)
}

/** Unregister active connection (called on ws close) */
export function untrackPeer(peer: any) {
  allPeers.delete(peer)
}

/** Push message to all online connections of the specified user */
export function sendToUser(userId: number, msg: object) {
  const peers = userPeers.get(userId)
  if (peers) {
    const text = JSON.stringify(msg)
    for (const p of peers) {
      try {
        p.send(text)
      } catch {
        // Connection disconnected, ignored
      }
    }
  }
}

/** Broadcast to all online connections (system-level messages, e.g. config changes) */
export function broadcastToAll(msg: object) {
  const text = JSON.stringify(msg)
  for (const p of allPeers) {
    try {
      p.send(text)
    } catch {
      // Ignored
    }
  }
}

// ====================== Generic rooms ======================
/** roomId → set of online connections */
export const rooms = new Map<string, Set<any>>()

/** Join room (also records peer._rooms for efficient cleanup on close) */
export function joinRoom(roomId: string, peer: any) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set())
  rooms.get(roomId)!.add(peer)
  if (!peer._rooms) peer._rooms = new Set<string>()
  peer._rooms.add(roomId)
}

/** Leave room */
export function leaveRoom(roomId: string, peer: any) {
  const room = rooms.get(roomId)
  if (!room) return
  room.delete(peer)
  if (room.size === 0) rooms.delete(roomId)
  if (peer._rooms) peer._rooms.delete(roomId)
}

/** Broadcast to room */
export function broadcastToRoom(roomId: string, msg: string) {
  const room = rooms.get(roomId)
  if (!room) return
  for (const p of room) {
    try {
      p.send(msg)
    } catch {
      // Ignored
    }
  }
}

/** Clean up all rooms a peer is in (called on connection close) */
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
