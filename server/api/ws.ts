/**
 * WebSocket 端点：/api/ws
 *
 * 消息格式（JSON）：
 * 客户端 → 服务端：
 *   { type: 'join', classId: number }
 *   { type: 'invite', classId: number, courseId: number, chapterId: number, from: string }
 *   { type: 'danmaku', classId: number, text: string, from: string }
 *   { type: 'voteStart', classId: number, voteId: string, question: string, options: string[] }
 *   { type: 'voteSubmit', classId: number, voteId: string, optionIndex: number, from: string }
 *   { type: 'voteEnd', classId: number, voteId: string }
 *   { type: 'quickAnswerStart', classId: number, question: string }
 *   { type: 'quickAnswerSubmit', classId: number, from: string }
 *   { type: 'quickAnswerEnd', classId: number }
 *
 * 服务端 → 客户端：
 *   { type: 'joined', classId: number }
 *   { type: 'invite', courseId: number, chapterId: number, from: string }
 *   { type: 'danmaku', text: string, from: string }
 *   { type: 'voteStart', voteId: string, question: string, options: string[] }
 *   { type: 'voteUpdate', voteId: string, results: number[], total: number }
 *   { type: 'voteEnd', voteId: string, results: number[], total: number }
 *   { type: 'quickAnswerStart', question: string }
 *   { type: 'quickAnswerResult', winner: string | null }
 *   { type: 'quickAnswerEnd' }
 *   { type: 'error', message: string }
 */

// 按 classId 分组的连接池
const classRooms = new Map<number, Set<any>>()

// 投票数据：voteId → { results: number[], votedUsers: Set<string>, total: number }
const votes = new Map<string, { classId: number; question: string; options: string[]; results: number[]; votedUsers: Set<string> }>()

// 抢答数据：classId → { question, winner, submitted }
const quickAnswers = new Map<number, { question: string; winner: string | null; submitted: Set<string> }>()

function broadcastToClass(cid: number, msg: string) {
  const room = classRooms.get(cid)
  if (room) {
    for (const p of room) {
      p.send(msg)
    }
  }
}

export default defineWebSocketHandler({
  open(peer) {
    // 连接建立时不自动加入任何房间，等待客户端发送 join
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      const { type, classId } = data

      if (type === 'join' && classId) {
        const cid = Number(classId)
        if (!classRooms.has(cid)) {
          classRooms.set(cid, new Set())
        }
        classRooms.get(cid)!.add(peer)
        ;(peer as any)._classId = cid
        peer.send(JSON.stringify({ type: 'joined', classId: cid }))
      } else if (type === 'invite' && classId) {
        const cid = Number(classId)
        broadcastToClass(cid, JSON.stringify({
          type: 'invite',
          courseId: data.courseId,
          chapterId: data.chapterId,
          from: data.from || 'teacher',
        }))
      } else if (type === 'danmaku' && classId) {
        const cid = Number(classId)
        broadcastToClass(cid, JSON.stringify({
          type: 'danmaku',
          text: String(data.text || '').slice(0, 200),
          from: data.from || 'anonymous',
        }))
      } else if (type === 'voteStart' && classId) {
        const cid = Number(classId)
        const voteId = String(data.voteId || Date.now())
        const options: string[] = Array.isArray(data.options) ? data.options.slice(0, 10) : ['A', 'B']
        votes.set(voteId, { classId: cid, question: String(data.question || ''), options, results: new Array(options.length).fill(0), votedUsers: new Set() })
        broadcastToClass(cid, JSON.stringify({
          type: 'voteStart',
          voteId,
          question: data.question || '',
          options,
        }))
      } else if (type === 'voteSubmit' && classId) {
        const cid = Number(classId)
        const voteId = String(data.voteId)
        const vote = votes.get(voteId)
        if (!vote || vote.classId !== cid) return
        const from = String(data.from || 'anonymous')
        if (vote.votedUsers.has(from)) return
        const idx = Number(data.optionIndex)
        if (idx < 0 || idx >= vote.options.length) return
        vote.votedUsers.add(from)
        vote.results[idx]++
        broadcastToClass(cid, JSON.stringify({
          type: 'voteUpdate',
          voteId,
          results: vote.results,
          total: vote.votedUsers.size,
        }))
      } else if (type === 'voteEnd' && classId) {
        const cid = Number(classId)
        const voteId = String(data.voteId)
        const vote = votes.get(voteId)
        if (!vote || vote.classId !== cid) return
        broadcastToClass(cid, JSON.stringify({
          type: 'voteEnd',
          voteId,
          results: vote.results,
          total: vote.votedUsers.size,
        }))
        votes.delete(voteId)
      } else if (type === 'quickAnswerStart' && classId) {
        const cid = Number(classId)
        quickAnswers.set(cid, { question: String(data.question || ''), winner: null, submitted: new Set() })
        broadcastToClass(cid, JSON.stringify({
          type: 'quickAnswerStart',
          question: data.question || '',
        }))
      } else if (type === 'quickAnswerSubmit' && classId) {
        const cid = Number(classId)
        const qa = quickAnswers.get(cid)
        if (!qa || qa.winner) return
        const from = String(data.from || 'anonymous')
        if (qa.submitted.has(from)) return
        qa.submitted.add(from)
        qa.winner = from
        broadcastToClass(cid, JSON.stringify({
          type: 'quickAnswerResult',
          winner: from,
        }))
      } else if (type === 'quickAnswerEnd' && classId) {
        const cid = Number(classId)
        broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerEnd' }))
        quickAnswers.delete(cid)
      }
    } catch (e) {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  },

  close(peer) {
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
