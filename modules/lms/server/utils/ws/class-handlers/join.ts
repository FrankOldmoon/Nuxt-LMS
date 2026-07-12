/**
 * 班级消息：join / invite / danmaku / online / chatroom
 */
import { broadcastToClass, joinClassRoom } from '../state'

/** join: 加入班级房间 */
export function handleClassJoin(peer: any, data: any) {
  const cid = Number(data.classId)
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

/** danmaku: 弹幕广播 */
export function handleClassDanmaku(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  broadcastToClass(cid, JSON.stringify({
    type: 'danmaku',
    text: String(data.text || '').slice(0, 200),
    from: data.from || 'anonymous',
  }))
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
