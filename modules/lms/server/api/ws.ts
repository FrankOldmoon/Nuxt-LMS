/**
 * WebSocket 端点：/api/ws
 *
 * 消息格式（JSON）：
 * 客户端 → 服务端：
 *   { type: 'registerUser', userId, from }
 *   { type: 'join', classId, userId?, from? }
 *   { type: 'invite', classId, courseId, chapterId, from }
 *   { type: 'danmaku', classId, text, from }
 *   { type: 'voteStart', classId, voteId, question, options }
 *   { type: 'voteSubmit', classId, voteId, optionIndex, from }
 *   { type: 'voteEnd', classId, voteId }
 *   { type: 'quickAnswerStart', classId, question }
 *   { type: 'quickAnswerSubmit', classId, from }
 *   { type: 'quickAnswerEnd', classId }
 *   { type: 'online', classId, userId, from, online }
 *   { type: 'raceJoin', pin }
 *   { type: 'raceOnline', pin, userId, from, online }
 *   { type: 'raceStart', pin, raceCid, courseId, totalQuestions, timeLimit, from }
 *   { type: 'raceQuestion', pin, raceCid, questionCid, questionIndex, totalQuestions, timeLimit }
 *   { type: 'raceAnswer', pin, raceCid, questionCid, answer, rate, correct, from, userId }
 *   { type: 'raceQuestionEnd', pin, raceCid }
 *   { type: 'raceEnd', pin, raceCid }
 *
 * 服务端 → 客户端：
 *   { type: 'joined', classId }
 *   { type: 'invite', courseId, chapterId, from }
 *   { type: 'danmaku', text, from }
 *   { type: 'voteStart', voteId, question, options }
 *   { type: 'voteUpdate', voteId, results, total }
 *   { type: 'voteEnd', voteId, results, total }
 *   { type: 'quickAnswerStart', question }
 *   { type: 'quickAnswerResult', winner }
 *   { type: 'quickAnswerEnd' }
 *   { type: 'onlineUpdate', classId?, userId, from, online }
 *   { type: 'raceJoined', pin }
 *   { type: 'raceStart', raceCid, courseId, from, totalQuestions, timeLimit }
 *   { type: 'raceQuestion', raceCid, questionCid, questionIndex, totalQuestions, timeLimit }
 *   { type: 'raceAnswerUpdate', raceCid, questionCid, answeredCount }
 *   { type: 'raceScores', raceCid, scores }
 *   { type: 'raceQuestionEnd', raceCid, questionCid, results, top3, answeredCount }
 *   { type: 'raceEnd', raceCid, leaderboard, scores }
 *   { type: 'raceOnlineUpdate', pin, userId, from, online }
 *   { type: 'chapterAccessUpdate', courseId, chapterId }  ← 章节开放状态变更通知
 *   { type: 'error', message }
 */
import { handleClassMessage, cleanupClassPeer } from '../utils/ws/class'
import { handleRaceMessage, cleanupRacePeer } from '../utils/ws/race'
import { handleGroupMessage, cleanupGroupPeer } from '../utils/ws/group'

export default defineWebSocketHandler({
  open() {
    // 连接建立时不自动加入任何房间，等待客户端发送 join
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      const { type } = data

      // 用户级注册（私信推送）
      if (type === 'registerUser') {
        const userId = Number(data.userId)
        if (!userId) return
        if (!userPeers.has(userId)) userPeers.set(userId, new Set())
        userPeers.get(userId)!.add(peer)
        peer._userId = userId
        peer._userName = String(data.from || 'anonymous')
        return
      }

      // 尝试班级消息 → 竞赛消息 → 小组消息
      if (handleClassMessage(peer, data)) return
      if (handleRaceMessage(peer, data)) return
      if (handleGroupMessage(peer, data)) return
    } catch {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  },

  close(peer) {
    // 清理班级房间
    cleanupClassPeer(peer)

    // 清理用户级连接
    const uid = peer._userId
    if (uid && userPeers.has(uid)) {
      userPeers.get(uid)!.delete(peer)
      if (userPeers.get(uid)!.size === 0) {
        userPeers.delete(uid)
      }
    }

    // 清理竞赛房间
    cleanupRacePeer(peer)

    // 清理小组房间
    cleanupGroupPeer(peer)
  },

  error(_peer, error) {
    console.error('[ws] error:', error)
  },
})
