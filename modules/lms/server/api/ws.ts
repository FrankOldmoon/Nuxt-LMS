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
 *   { type: 'raceAnswerCorrect', raceCid, questionCid, userId, from, gain }  ← 答对者弹幕（房间广播，含其他学生）
 *   { type: 'raceAnswerResult', raceCid, questionCid, rate, correct, answer, explanation }  ← 答完私发答题者（揭示正确答案）
 *   { type: 'raceQuestionEnd', raceCid, questionCid, results, top3, answeredCount }
 *   { type: 'raceEnd', raceCid, leaderboard, scores }
 *   { type: 'raceOnlineUpdate', pin, userId, from, online }
 *   { type: 'chapterAccessUpdate', courseId, chapterId }  ← 章节开放状态变更通知
 *   { type: 'error', message }
 */
import { handleClassMessage, cleanupClassPeer } from '../utils/ws/class'
import { handleRaceMessage, cleanupRacePeer } from '../utils/ws/race'
import { handleGroupMessage, cleanupGroupPeer } from '../utils/ws/group'
import { resolveWsAuthUser } from '../../../base/server/utils/ws/auth'

export default defineWebSocketHandler({
  async open(peer) {
    // 解析 WS 连接对应的登录用户（未登录为 null），供 registerUser / join 鉴权
    await resolveWsAuthUser(peer)
  },

  async message(peer, message) {
    try {
      // 兜底：open 时未解析完则在此补解析（防止首条消息竞态）
      if (!peer._authResolved) await resolveWsAuthUser(peer)
      const data = JSON.parse(message.text())
      const { type } = data
      //console.log('[ws] received:', type, 'data:', JSON.stringify(data).slice(0, 200))

      // 用户级注册（私信推送）
      if (type === 'registerUser') {
        const userId = Number(data.userId)
        if (!userId) return
        // 安全：仅允许注册为自己的身份，防止冒充他人接收私信
        if (!peer._authUserId || peer._authUserId !== userId) {
          peer.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
          return
        }
        if (!userPeers.has(userId)) userPeers.set(userId, new Set())
        userPeers.get(userId)!.add(peer)
        peer._userId = userId
        peer._userName = String(data.from || 'anonymous')
        return
      }

      // 班级房间加入 / 小组房间加入：仅登录用户可进入，防止未授权窃听
      if ((type === 'join' || type === 'joinGroup') && !peer._authUserId) {
        peer.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
        return
      }

      // 尝试班级消息 → 竞赛消息 → 小组消息
      try {
        if (handleClassMessage(peer, data)) return
      } catch (e) { console.error('[ws] class handler error:', e); peer.send(JSON.stringify({ type: 'error', message: 'class handler error' })); return }
      try {
        if (handleRaceMessage(peer, data)) return
      } catch (e) { console.error('[ws] race handler error:', e); peer.send(JSON.stringify({ type: 'error', message: 'race handler error' })); return }
      try {
        if (handleGroupMessage(peer, data)) return
      } catch (e) { console.error('[ws] group handler error:', e); peer.send(JSON.stringify({ type: 'error', message: 'group handler error' })); return }
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
