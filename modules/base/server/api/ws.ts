/**
 * WebSocket endpoint: /api/ws (base generic version)
 *
 * base only handles registerUser + generic join/leave room;
 * other types are delegated to runWsServerHandlers (subsequent modules register via registerWsServerHandler).
 *
 * Message format (JSON):
 * Client → Server:
 *   { type: 'registerUser', userId, from }
 *   { type: 'join', room }
 *   { type: 'leave', room }
 *   { type: ...other } ← delegated to registered business handlers
 *
 * Server → Client:
 *   { type: 'joined', room }
 *   { type: 'site-config-changed' }  ← system-level broadcast: site config changed, frontend useSiteConfig auto refreshes
 *   { type: 'error', message }
 */
import {
  userPeers,
  trackPeer,
  untrackPeer,
  joinRoom,
  leaveRoom,
  cleanupPeerRooms,
} from '../utils/ws/state'
import { runWsServerHandlers, runWsServerCleanups } from '../utils/ws/registry'
export default defineWebSocketHandler({
  open(peer) {
    // Maintain full connection set (for system-level broadcasts, e.g. site-config-changed)
    trackPeer(peer)
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      const { type } = data
      const p = peer as any

      // User-level registration (private message push)
      if (type === 'registerUser') {
        const userId = Number(data.userId)
        if (!userId) return
        if (!userPeers.has(userId)) userPeers.set(userId, new Set())
        userPeers.get(userId)!.add(peer)
        p._userId = userId
        p._userName = String(data.from || 'anonymous')
        return
      }

      // Generic room join
      if (type === 'join' && data.room) {
        joinRoom(String(data.room), peer)
        peer.send(JSON.stringify({ type: 'joined', room: data.room }))
        return
      }

      // Generic room leave
      if (type === 'leave' && data.room) {
        leaveRoom(String(data.room), peer)
        return
      }

      // Delegate to registered business handlers (lms's class/race/group, etc.)
      runWsServerHandlers(peer, data)
    } catch {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  },

  close(peer) {
    const p = peer as any
    // Clean up full connection set
    untrackPeer(peer)
    // Clean up user-level connections
    const uid = p._userId
    if (uid && userPeers.has(uid)) {
      userPeers.get(uid)!.delete(peer)
      if (userPeers.get(uid)!.size === 0) userPeers.delete(uid)
    }
    // Clean up generic rooms
    cleanupPeerRooms(peer)
    // Delegate business cleanup
    runWsServerCleanups(peer)
  },

  error(_peer, error) {
    console.error('[ws] error:', error)
  },
})
