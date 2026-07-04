/**
 * WebSocket 端点：/api/ws
 *
 * 消息格式（JSON）：
 * 客户端 → 服务端：
 *   { type: 'join', classId: number }
 *   { type: 'invite', classId: number, courseId: number, chapterId: number, from: string }
 *
 * 服务端 → 客户端：
 *   { type: 'joined', classId: number }
 *   { type: 'invite', courseId: number, chapterId: number, from: string }
 *   { type: 'error', message: string }
 */

// 按 classId 分组的连接池
const classRooms = new Map<number, Set<any>>()

export default defineWebSocketHandler({
  open(peer) {
    // 连接建立时不自动加入任何房间，等待客户端发送 join
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      const { type, classId } = data

      if (type === 'join' && classId) {
        // 加入班级房间
        const cid = Number(classId)
        if (!classRooms.has(cid)) {
          classRooms.set(cid, new Set())
        }
        classRooms.get(cid)!.add(peer)
        // 在 peer 上记录所属班级（用于断开时清理）
        ;(peer as any)._classId = cid
        peer.send(JSON.stringify({ type: 'joined', classId: cid }))
      } else if (type === 'invite' && classId) {
        // 广播邀请到同班级的所有连接
        const cid = Number(classId)
        const room = classRooms.get(cid)
        if (room) {
          const msg = JSON.stringify({
            type: 'invite',
            courseId: data.courseId,
            chapterId: data.chapterId,
            from: data.from || 'teacher',
          })
          for (const p of room) {
            p.send(msg)
          }
        }
      }
    } catch (e) {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  },

  close(peer) {
    // 断开时从班级房间移除
    const cid = (peer as any)._classId
    if (cid && classRooms.has(cid)) {
      classRooms.get(cid)!.delete(peer)
      if (classRooms.get(cid)!.size === 0) {
        classRooms.delete(cid)
      }
    }
  },

  error(peer, error) {
    console.error('[ws] error:', error)
  },
})
