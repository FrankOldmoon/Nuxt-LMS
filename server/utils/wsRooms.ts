/**
 * WebSocket 房间状态共享工具
 *
 * userPeers：用户级连接池，userId → Set<peer>
 * 供 ws.ts 和 HTTP handler 共享，实现私信实时推送
 */
export const userPeers = new Map<number, Set<any>>()

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
