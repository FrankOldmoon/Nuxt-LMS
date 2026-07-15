/**
 * Class messages: join / invite / danmaku / online / chatroom
 */
import { broadcastToClass, joinClassRoom } from '../state'

/** join: join a class room
 * Compatible with two field names:
 *   - data.classId: field explicitly sent by the lms business layer (e.g. sendDanmaku, sendOnline)
 *   - data.room: generic room field sent by the base layer useWsConnection().joinRoom()
 * Bug fix: the client useWsConnection().joinRoom() actually sends { type: 'join', room: <id> },
 *   but this function originally only read data.classId, causing join to silently fail and classRooms to always be empty,
 *   so all class broadcasts (danmaku / online / chatroom / vote / quickAnswer / submitBroadcast / invite) were dropped.
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

/** invite: teacher invites students to a course chapter */
export function handleClassInvite(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  broadcastToClass(cid, JSON.stringify({
    type: 'invite',
    courseId: data.courseId, chapterId: data.chapterId,
    from: data.from || 'teacher',
  }))
}

/** danmaku: danmaku broadcast */
export function handleClassDanmaku(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  broadcastToClass(cid, JSON.stringify({
    type: 'danmaku',
    text: String(data.text || '').slice(0, 200),
    from: data.from || 'anonymous',
  }))
}

/** online: user online status change */
export function handleClassOnline(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  broadcastToClass(cid, JSON.stringify({
    type: 'onlineUpdate', classId: cid,
    userId: Number(data.userId), from: String(data.from || 'anonymous'),
    online: data.online !== false,
  }))
}

/** chatroom: class chatroom broadcast (not persisted) */
export function handleClassChatroom(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  const text = String(data.text || '').slice(0, 1000); if (!text) return
  broadcastToClass(cid, JSON.stringify({
    type: 'chatroom', classId: cid,
    userId: Number(data.userId), from: String(data.from || 'anonymous'),
    avatarImg: data.avatarImg || null, text, ts: Date.now(),
  }))
}
