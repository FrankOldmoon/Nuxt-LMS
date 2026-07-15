/**
 * WebSocket endpoint: /api/ws
 *
 * Message format (JSON):
 * Client → Server:
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
 * Server → Client:
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
 *   { type: 'chapterAccessUpdate', courseId, chapterId }  ← Chapter access status change notification
 *   { type: 'error', message }
 */
import { handleClassMessage, cleanupClassPeer } from '../utils/ws/class'
import { handleRaceMessage, cleanupRacePeer } from '../utils/ws/race'
import { handleGroupMessage, cleanupGroupPeer } from '../utils/ws/group'

export default defineWebSocketHandler({
  open() {
    // When a connection is established, do not automatically join any room; wait for the client to send join
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      const { type } = data
      //console.log('[ws] received:', type, 'data:', JSON.stringify(data).slice(0, 200))

      // User-level registration (private message push)
      if (type === 'registerUser') {
        const userId = Number(data.userId)
        if (!userId) return
        if (!userPeers.has(userId)) userPeers.set(userId, new Set())
        userPeers.get(userId)!.add(peer)
        peer._userId = userId
        peer._userName = String(data.from || 'anonymous')
        return
      }

      // Try class message → race message → group message
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
    // Clean up class room
    cleanupClassPeer(peer)

    // Clean up user-level connections
    const uid = peer._userId
    if (uid && userPeers.has(uid)) {
      userPeers.get(uid)!.delete(peer)
      if (userPeers.get(uid)!.size === 0) {
        userPeers.delete(uid)
      }
    }

    // Clean up race room
    cleanupRacePeer(peer)

    // Clean up group room
    cleanupGroupPeer(peer)
  },

  error(_peer, error) {
    console.error('[ws] error:', error)
  },
})
