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

// 竞赛数据：classId → raceState
// raceState: { raceCid, courseId, currentQuestion, totalQuestions, answers: Map<questionCid, Map<userId, {answer, from, rate, correct}>>, activeQuestionCid, timeLimit, startedAt }
interface RaceAnswer { answer: any; from: string; userId: number; rate: number; correct: boolean }
interface RaceState {
  raceCid: number
  courseId: number
  currentQuestion: number
  totalQuestions: number
  activeQuestionCid: number | null
  timeLimit: number
  startedAt: number
  // questionCid → (userId → answer info)
  answers: Map<number, Map<number, RaceAnswer>>
}
const raceStates = new Map<number, RaceState>()

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
      } else if (type === 'raceStart' && classId) {
        // 教师开始竞赛
        const cid = Number(classId)
        const raceCid = Number(data.raceCid)
        const courseId = Number(data.courseId)
        const totalQuestions = Number(data.totalQuestions) || 0
        raceStates.set(cid, {
          raceCid, courseId, currentQuestion: 0, totalQuestions,
          activeQuestionCid: null, timeLimit: Number(data.timeLimit) || 30,
          startedAt: Date.now(), answers: new Map(),
        })
        broadcastToClass(cid, JSON.stringify({
          type: 'raceStart', raceCid, courseId, from: data.from || 'teacher',
          totalQuestions, timeLimit: data.timeLimit || 30,
        }))
      } else if (type === 'raceQuestion' && classId) {
        // 教师推送题目
        const cid = Number(classId)
        const race = raceStates.get(cid)
        if (!race) return
        const questionCid = Number(data.questionCid)
        const questionIndex = Number(data.questionIndex) || 0
        race.currentQuestion = questionIndex
        race.activeQuestionCid = questionCid
        race.timeLimit = Number(data.timeLimit) || 30
        if (!race.answers.has(questionCid)) {
          race.answers.set(questionCid, new Map())
        }
        broadcastToClass(cid, JSON.stringify({
          type: 'raceQuestion',
          raceCid: race.raceCid,
          question: data.question || '',
          questionCid,
          questionIndex,
          totalQuestions: race.totalQuestions,
          timeLimit: race.timeLimit,
          options: data.options || [],
          qtype: data.qtype || 'single',
        }))
      } else if (type === 'raceAnswer' && classId) {
        // 学生提交答案
        const cid = Number(classId)
        const race = raceStates.get(cid)
        if (!race || !race.activeQuestionCid) return
        const userId = Number(data.userId)
        const from = String(data.from || 'anonymous')
        const questionCid = race.activeQuestionCid
        const qAnswers = race.answers.get(questionCid)
        if (!qAnswers || qAnswers.has(userId)) return
        qAnswers.set(userId, {
          answer: data.answer,
          from,
          userId,
          rate: Number(data.rate) || 0,
          correct: !!data.correct,
        })
        // 广播答题进度（不泄露答案）
        broadcastToClass(cid, JSON.stringify({
          type: 'raceAnswerUpdate',
          raceCid: race.raceCid,
          questionCid,
          answeredCount: qAnswers.size,
        }))
      } else if (type === 'raceQuestionEnd' && classId) {
        // 教师结束当前题目，展示结果
        const cid = Number(classId)
        const race = raceStates.get(cid)
        if (!race || !race.activeQuestionCid) return
        const questionCid = race.activeQuestionCid
        const qAnswers = race.answers.get(questionCid)
        const results: any[] = []
        if (qAnswers) {
          for (const [uid, info] of qAnswers) {
            results.push({ userId: uid, from: info.from, correct: info.correct, rate: info.rate })
          }
        }
        broadcastToClass(cid, JSON.stringify({
          type: 'raceQuestionEnd',
          raceCid: race.raceCid,
          questionCid,
          correctAnswer: data.correctAnswer || [],
          results,
          answeredCount: qAnswers?.size || 0,
        }))
        race.activeQuestionCid = null
      } else if (type === 'raceEnd' && classId) {
        // 教师结束竞赛
        const cid = Number(classId)
        const race = raceStates.get(cid)
        if (!race) return
        // 汇总所有题目结果
        const summary: any[] = []
        const userTotals = new Map<number, { from: string; score: number; correctCount: number }>()
        for (const [qCid, qAnswers] of race.answers) {
          for (const [uid, info] of qAnswers) {
            if (!userTotals.has(uid)) {
              userTotals.set(uid, { from: info.from, score: 0, correctCount: 0 })
            }
            const ut = userTotals.get(uid)!
            if (info.correct) ut.correctCount++
            ut.score += info.rate
          }
        }
        for (const [uid, info] of userTotals) {
          summary.push({ userId: uid, from: info.from, score: Math.round(info.score * 100) / 100, correctCount: info.correctCount })
        }
        summary.sort((a, b) => b.score - a.score)
        broadcastToClass(cid, JSON.stringify({
          type: 'raceEnd',
          raceCid: race.raceCid,
          leaderboard: summary,
        }))
        raceStates.delete(cid)
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
