/**
 * 班级 WebSocket 消息处理
 *
 * 处理 type: join / invite / danmaku /
 *           voteStart / voteSubmit / voteEnd /
 *           quickAnswerStart / quickAnswerSubmit / quickAnswerEnd /
 *           online
 */
import {
  classRooms, votes, quickAnswers,
  broadcastToClass,
} from './state'

/** 返回 true 表示消息已被处理 */
export function handleClassMessage(peer: any, data: any): boolean {
  const { type, classId } = data
  if (!classId && type !== 'join') return false

  const cid = Number(classId)

  switch (type) {
    case 'join': {
      if (!classId) return true
      if (!classRooms.has(cid)) classRooms.set(cid, new Set())
      classRooms.get(cid)!.add(peer)
      peer._classId = cid
      if (data.userId) peer._userId = Number(data.userId)
      if (data.from) peer._userName = String(data.from)
      peer.send(JSON.stringify({ type: 'joined', classId: cid }))
      if (data.userId) {
        broadcastToClass(cid, JSON.stringify({ type: 'onlineUpdate', classId: cid, userId: Number(data.userId), from: data.from || 'anonymous', online: true }))
      }
      return true
    }

    case 'invite': {
      broadcastToClass(cid, JSON.stringify({
        type: 'invite',
        courseId: data.courseId,
        chapterId: data.chapterId,
        from: data.from || 'teacher',
      }))
      return true
    }

    case 'danmaku': {
      broadcastToClass(cid, JSON.stringify({
        type: 'danmaku',
        text: String(data.text || '').slice(0, 200),
        from: data.from || 'anonymous',
      }))
      return true
    }

    case 'voteStart': {
      const voteId = String(data.voteId || Date.now())
      const options: string[] = Array.isArray(data.options) ? data.options.slice(0, 10) : ['A', 'B']
      votes.set(voteId, { classId: cid, question: String(data.question || ''), options, results: new Array(options.length).fill(0), votedUsers: new Set() })
      broadcastToClass(cid, JSON.stringify({
        type: 'voteStart', voteId, question: data.question || '', options,
      }))
      return true
    }

    case 'voteSubmit': {
      const voteId = String(data.voteId)
      const vote = votes.get(voteId)
      if (!vote || vote.classId !== cid) return true
      const from = String(data.from || 'anonymous')
      if (vote.votedUsers.has(from)) return true
      const idx = Number(data.optionIndex)
      if (idx < 0 || idx >= vote.options.length) return true
      vote.votedUsers.add(from)
      vote.results[idx]++
      broadcastToClass(cid, JSON.stringify({
        type: 'voteUpdate', voteId, results: vote.results, total: vote.votedUsers.size,
      }))
      return true
    }

    case 'voteEnd': {
      const voteId = String(data.voteId)
      const vote = votes.get(voteId)
      if (!vote || vote.classId !== cid) return true
      broadcastToClass(cid, JSON.stringify({
        type: 'voteEnd', voteId, results: vote.results, total: vote.votedUsers.size,
      }))
      votes.delete(voteId)
      return true
    }

    case 'quickAnswerStart': {
      quickAnswers.set(cid, { question: String(data.question || ''), winner: null, submitted: new Set() })
      broadcastToClass(cid, JSON.stringify({
        type: 'quickAnswerStart', question: data.question || '',
      }))
      return true
    }

    case 'quickAnswerSubmit': {
      const qa = quickAnswers.get(cid)
      if (!qa || qa.winner) return true
      const from = String(data.from || 'anonymous')
      if (qa.submitted.has(from)) return true
      qa.submitted.add(from)
      qa.winner = from
      broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerResult', winner: from }))
      return true
    }

    case 'quickAnswerEnd': {
      broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerEnd' }))
      quickAnswers.delete(cid)
      return true
    }

    case 'online': {
      if (!cid) return true
      const userId = Number(data.userId)
      const from = String(data.from || 'anonymous')
      const online = data.online !== false
      broadcastToClass(cid, JSON.stringify({
        type: 'onlineUpdate', classId: cid, userId, from, online,
      }))
      return true
    }

    // 班级在线聊天室：广播到同班级房间（不持久化）
    case 'chatroom': {
      const userId = Number(data.userId)
      const from = String(data.from || 'anonymous')
      const avatarImg = data.avatarImg || null
      const text = String(data.text || '').slice(0, 1000)
      if (!text) return true
      broadcastToClass(cid, JSON.stringify({
        type: 'chatroom',
        classId: cid,
        userId,
        from,
        avatarImg,
        text,
        ts: Date.now(),
      }))
      return true
    }
  }

  return false
}

/** 连接关闭时清理班级房间 */
export function cleanupClassPeer(peer: any) {
  const cid = peer._classId
  if (!cid || !classRooms.has(cid)) return
  const uid = peer._userId
  const from = peer._userName
  if (uid) {
    broadcastToClass(cid, JSON.stringify({ type: 'onlineUpdate', classId: cid, userId: uid, from: from || 'anonymous', online: false }))
  }
  classRooms.get(cid)!.delete(peer)
  if (classRooms.get(cid)!.size === 0) {
    classRooms.delete(cid)
  }
}
