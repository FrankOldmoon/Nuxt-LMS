/**
 * WebSocket 端点：/api/ws（base 通用版）
 *
 * base 只处理 registerUser + 通用 join/leave room；
 * 其余 type 委托 runWsServerHandlers（后续模块通过 registerWsServerHandler 注册）。
 *
 * 消息格式（JSON）：
 * 客户端 → 服务端：
 *   { type: 'registerUser', userId, from }
 *   { type: 'join', room }
 *   { type: 'leave', room }
 *   { type: ...其它 } ← 委托给注册的业务 handler
 *
 * 服务端 → 客户端：
 *   { type: 'joined', room }
 *   { type: 'site-config-changed' }  ← 系统级广播：站点配置变更，前端 useSiteConfig 自动 refresh
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
import { resolveWsAuthUser } from '../utils/ws/auth'

export default defineWebSocketHandler({
  async open(peer) {
    // 维护全连接集合（用于系统级广播，如 site-config-changed）
    trackPeer(peer)
    // 解析 WS 连接对应的登录用户（未登录为 null）
    await resolveWsAuthUser(peer)
  },

  async message(peer, message) {
    try {
      // 兜底：open 时未解析完则在此补解析（防止首条消息竞态）
      if (!peer._authResolved) await resolveWsAuthUser(peer)
      const data = JSON.parse(message.text())
      const { type } = data
      const p = peer as any

      // 用户级注册（私信推送）
      if (type === 'registerUser') {
        const userId = Number(data.userId)
        if (!userId) return
        // 安全：仅允许注册为自己的身份，防止冒充他人接收私信
        if (!p._authUserId || p._authUserId !== userId) {
          p.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
          return
        }
        if (!userPeers.has(userId)) userPeers.set(userId, new Set())
        userPeers.get(userId)!.add(peer)
        p._userId = userId
        p._userName = String(data.from || 'anonymous')
        return
      }

      // 通用房间加入（仅登录用户）
      if (type === 'join' && data.room) {
        if (!p._authUserId) {
          p.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
          return
        }
        joinRoom(String(data.room), peer)
        peer.send(JSON.stringify({ type: 'joined', room: data.room }))
        return
      }

      // 通用房间离开
      if (type === 'leave' && data.room) {
        leaveRoom(String(data.room), peer)
        return
      }

      // 委托给注册的业务 handler（lms 的 class/race/group 等）
      runWsServerHandlers(peer, data)
    } catch {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  },

  close(peer) {
    const p = peer as any
    // 清理全连接集合
    untrackPeer(peer)
    // 清理用户级连接
    const uid = p._userId
    if (uid && userPeers.has(uid)) {
      userPeers.get(uid)!.delete(peer)
      if (userPeers.get(uid)!.size === 0) userPeers.delete(uid)
    }
    // 清理通用房间
    cleanupPeerRooms(peer)
    // 委托业务清理
    runWsServerCleanups(peer)
  },

  error(_peer, error) {
    console.error('[ws] error:', error)
  },
})
