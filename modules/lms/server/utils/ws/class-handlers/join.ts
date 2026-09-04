/**
 * 班级消息：join / invite / danmaku / online / chatroom
 */
import { broadcastToClass, joinClassRoom } from '../state'
import { isStaffUser } from '../staff'

/** join: 加入班级房间
 * 兼容两种字段名：
 *   - data.classId：lms 业务层（如 sendDanmaku、sendOnline）显式发送的字段
 *   - data.room：base 层 useWsConnection().joinRoom() 发送的通用房间字段
 * 修复 bug：客户端 useWsConnection().joinRoom() 实际发送 { type: 'join', room: <id> }，
 *   但本函数原本只读 data.classId，导致 join 静默失败、classRooms 始终为空，
 *   进而所有班级广播（danmaku / online / chatroom / vote / quickAnswer / submitBroadcast / invite）落空。
 */
export function handleClassJoin(peer: any, data: any) {
  const cid = Number(data.room ?? data.classId)
  if (!cid) return
  joinClassRoom(cid, peer)
  if (data.userId) peer._userId = Number(data.userId)
  if (data.from) peer._userName = String(data.from)
  peer.send(JSON.stringify({ type: 'joined', classId: cid }))
  if (data.userId) {
    broadcastToClass(cid, JSON.stringify({ type: 'onlineUpdate', classId: cid,
      userId: Number(data.userId), from: data.from || 'anonymous', online: true }))
  }
}

/** invite: 教师邀请学生进入课程章节 */
export function handleClassInvite(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  broadcastToClass(cid, JSON.stringify({
    type: 'invite',
    courseId: data.courseId, chapterId: data.chapterId,
    from: data.from || 'teacher',
  }))
}

/** danmaku: 弹幕广播（鉴权：课程级总开关 + 学生发送权限） */
export function handleClassDanmaku(peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  void (async () => {
    try {
      const courseId = Number(data.courseId) || 0
      const cfg = courseId
        ? await getCourseLmsConfig(courseId).catch(() => null)
        : (getLmsConfigSync() || null)
      const d = (cfg?.danmaku && typeof cfg.danmaku === 'object') ? cfg.danmaku : {}
      // 弹幕收发总开关关闭 → 不发送
      if (d.enableDanmaku === false) return
      // 学生发送权限关闭 → 仅教师/管理员可发送
      if (d.studentCanSend === false) {
        const senderId = Number(data.userId) || Number(peer?._userId || peer?._authUserId)
        if (!senderId || !(await isStaffUser(senderId))) return
      }
      broadcastToClass(cid, JSON.stringify({
        type: 'danmaku',
        text: String(data.text || '').slice(0, 200),
        from: data.from || 'anonymous',
      }))
    } catch (e) {
      console.error('[danmaku] broadcast failed:', e)
    }
  })()
}

/** online: 用户在线状态变更 */
export function handleClassOnline(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  broadcastToClass(cid, JSON.stringify({
    type: 'onlineUpdate', classId: cid,
    userId: Number(data.userId), from: String(data.from || 'anonymous'),
    online: data.online !== false,
  }))
}

/** chatroom: 班级聊天室广播（不持久化） */
export function handleClassChatroom(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  const text = String(data.text || '').slice(0, 1000); if (!text) return
  broadcastToClass(cid, JSON.stringify({
    type: 'chatroom', classId: cid,
    userId: Number(data.userId), from: String(data.from || 'anonymous'),
    avatarImg: data.avatarImg || null, text, ts: Date.now(),
  }))
}
