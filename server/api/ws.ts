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

// 竞赛数据：pin → raceState，pin = `${classId}_${chapterId}`
interface RaceAnswer { answer: any; from: string; userId: number; rate: number; correct: boolean; submittedAt: number }
interface RaceState {
  raceCid: number
  courseId: number
  currentQuestion: number
  totalQuestions: number
  activeQuestionCid: number | null
  timeLimit: number
  questionStartedAt: number
  startedAt: number
  answers: Map<number, Map<number, RaceAnswer>>
}
const raceStates = new Map<string, RaceState>()

// race 房间：pin → Set<peer>
const raceRooms = new Map<string, Set<any>>()

function broadcastToRace(pin: string, msg: string) {
  const room = raceRooms.get(pin)
  if (room) {
    for (const p of room) {
      p.send(msg)
    }
  }
}

// 从 race answers 计算实时分数汇总
function computeRaceScores(race: RaceState) {
  const userTotals = new Map<number, { from: string; score: number; correctCount: number }>()
  for (const [, qAnswers] of race.answers) {
    for (const [uid, info] of qAnswers) {
      if (!userTotals.has(uid)) {
        userTotals.set(uid, { from: info.from, score: 0, correctCount: 0 })
      }
      const ut = userTotals.get(uid)!
      if (info.correct) ut.correctCount++
      ut.score += info.rate
    }
  }
  const summary: any[] = []
  for (const [uid, info] of userTotals) {
    summary.push({ userId: uid, from: info.from, score: Math.round(info.score * 100) / 100, correctCount: info.correctCount })
  }
  summary.sort((a, b) => b.score - a.score)
  return summary
}

// 获取 race 房间内所有在线用户
function getRaceOnlineUsers(pin: string): { userId: number; from: string }[] {
  const room = raceRooms.get(pin)
  if (!room) return []
  const users: { userId: number; from: string }[] = []
  for (const p of room) {
    const uid = (p as any)._userId
    const from = (p as any)._userName
    if (uid) users.push({ userId: uid, from: from || 'anonymous' })
  }
  return users
}

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
          ; (peer as any)._classId = cid
        // 保存用户信息用于在线状态
        if (data.userId) (peer as any)._userId = Number(data.userId)
        if (data.from) (peer as any)._userName = String(data.from)
        peer.send(JSON.stringify({ type: 'joined', classId: cid }))
        // 广播在线状态
        if (data.userId) {
          broadcastToClass(cid, JSON.stringify({ type: 'onlineUpdate', classId: cid, userId: Number(data.userId), from: data.from || 'anonymous', online: true }))
        }
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
      } else if (type === 'raceJoin') {
        // 加入 race 房间，pin = classId_chapterId
        const pin = String(data.pin || '')
        if (!pin) return
        if (!raceRooms.has(pin)) raceRooms.set(pin, new Set())
        raceRooms.get(pin)!.add(peer)
          ; (peer as any)._racePin = pin
        peer.send(JSON.stringify({ type: 'raceJoined', pin }))
        // 如果竞赛进行中，返回当前状态
        const race = raceStates.get(pin)
        if (race) {
          peer.send(JSON.stringify({
            type: 'raceStart',
            raceCid: race.raceCid,
            courseId: race.courseId,
            from: 'system',
            totalQuestions: race.totalQuestions,
            timeLimit: race.timeLimit,
          }))
          if (race.activeQuestionCid) {
            peer.send(JSON.stringify({
              type: 'raceQuestion',
              raceCid: race.raceCid,
              questionCid: race.activeQuestionCid,
              questionIndex: race.currentQuestion,
              totalQuestions: race.totalQuestions,
              timeLimit: race.timeLimit,
            }))
          }
          // 返回实时分数
          peer.send(JSON.stringify({
            type: 'raceScores',
            raceCid: race.raceCid,
            scores: computeRaceScores(race),
          }))
        }
        // 广播在线状态到 race 房间（新成员加入）
        const onlineUsers = getRaceOnlineUsers(pin)
        broadcastToRace(pin, JSON.stringify({ type: 'onlineUpdate', pin, onlineUsers }))
      } else if (type === 'online') {
        // 在线状态广播（classId 房间）
        const cid = Number(classId)
        if (!cid) return
        const userId = Number(data.userId)
        const from = String(data.from || 'anonymous')
        const online = data.online !== false
        broadcastToClass(cid, JSON.stringify({
          type: 'onlineUpdate',
          classId: cid,
          userId,
          from,
          online,
        }))
      } else if (type === 'raceOnline') {
        // race 在线状态广播（pin 房间）
        const pin = String(data.pin || '')
        if (!pin) return
        const userId = Number(data.userId)
        const from = String(data.from || 'anonymous')
        const online = data.online !== false
        // 广播到 race 房间
        broadcastToRace(pin, JSON.stringify({
          type: 'raceOnlineUpdate',
          pin,
          userId,
          from,
          online,
        }))
      } else if (type === 'raceStart') {
        // 教师开始竞赛，pin 房间
        const pin = String(data.pin || '')
        if (!pin) return
        const raceCid = Number(data.raceCid)
        const courseId = Number(data.courseId)
        const totalQuestions = Number(data.totalQuestions) || 0
        raceStates.set(pin, {
          raceCid, courseId, currentQuestion: -1, totalQuestions,
          activeQuestionCid: null, timeLimit: Number(data.timeLimit) || 30,
          questionStartedAt: 0, startedAt: Date.now(), answers: new Map(),
        })
        broadcastToRace(pin, JSON.stringify({
          type: 'raceStart', raceCid, courseId, from: data.from || 'teacher',
          totalQuestions, timeLimit: data.timeLimit || 30,
        }))
      } else if (type === 'raceQuestion') {
        // 教师推送题目，广播到 pin 房间
        const pin = String(data.pin || '')
        const race = raceStates.get(pin)
        if (!race) return
        const questionCid = Number(data.questionCid)
        const questionIndex = Number(data.questionIndex) || 0
        race.currentQuestion = questionIndex
        race.activeQuestionCid = questionCid
        race.timeLimit = Number(data.timeLimit) || 30
        race.questionStartedAt = Date.now()
        if (!race.answers.has(questionCid)) {
          race.answers.set(questionCid, new Map())
        }
        broadcastToRace(pin, JSON.stringify({
          type: 'raceQuestion',
          raceCid: race.raceCid,
          questionCid,
          questionIndex,
          totalQuestions: race.totalQuestions,
          timeLimit: race.timeLimit,
        }))
      } else if (type === 'raceAnswer') {
        // 学生提交答案
        const pin = String(data.pin || '')
        const race = raceStates.get(pin)
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
          submittedAt: Date.now(),
        })
        // 广播答题进度 + 实时分数
        broadcastToRace(pin, JSON.stringify({
          type: 'raceAnswerUpdate',
          raceCid: race.raceCid,
          questionCid,
          answeredCount: qAnswers.size,
        }))
        broadcastToRace(pin, JSON.stringify({
          type: 'raceScores',
          raceCid: race.raceCid,
          scores: computeRaceScores(race),
        }))
      } else if (type === 'raceQuestionEnd') {
        // 教师结束当前题目，展示结果
        const pin = String(data.pin || '')
        const race = raceStates.get(pin)
        if (!race || !race.activeQuestionCid) return
        const questionCid = race.activeQuestionCid
        const qAnswers = race.answers.get(questionCid)
        const results: any[] = []
        if (qAnswers) {
          for (const [uid, info] of qAnswers) {
            const timeUsed = Math.round((info.submittedAt - race.questionStartedAt) / 100) / 10
            results.push({ userId: uid, from: info.from, correct: info.correct, rate: info.rate, timeUsed })
          }
        }
        // 按正确+速度排序：答对在前，用时短在前
        results.sort((a, b) => {
          if (a.correct !== b.correct) return a.correct ? -1 : 1
          return a.timeUsed - b.timeUsed
        })
        const top3 = results.slice(0, 3)
        broadcastToRace(pin, JSON.stringify({
          type: 'raceQuestionEnd',
          raceCid: race.raceCid,
          questionCid,
          results,
          top3,
          answeredCount: qAnswers?.size || 0,
        }))
        race.activeQuestionCid = null
      } else if (type === 'raceEnd') {
        // 教师结束竞赛
        const pin = String(data.pin || '')
        const race = raceStates.get(pin)
        if (!race) return
        const summary = computeRaceScores(race)
        broadcastToRace(pin, JSON.stringify({
          type: 'raceEnd',
          raceCid: race.raceCid,
          leaderboard: summary,
          scores: summary,
        }))
        raceStates.delete(pin)
      }
    } catch (e) {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  },

  close(peer) {
    const cid = (peer as any)._classId
    const uid = (peer as any)._userId
    const from = (peer as any)._userName
    if (cid && classRooms.has(cid)) {
      // 广播离线
      if (uid) {
        broadcastToClass(cid, JSON.stringify({ type: 'onlineUpdate', classId: cid, userId: uid, from: from || 'anonymous', online: false }))
      }
      classRooms.get(cid)!.delete(peer)
      if (classRooms.get(cid)!.size === 0) {
        classRooms.delete(cid)
      }
    }
    const racePin = (peer as any)._racePin
    if (racePin && raceRooms.has(racePin)) {
      // 广播 race 离线
      if (uid) {
        broadcastToRace(racePin, JSON.stringify({ type: 'raceOnlineUpdate', pin: racePin, userId: uid, from: from || 'anonymous', online: false }))
      }
      raceRooms.get(racePin)!.delete(peer)
      if (raceRooms.get(racePin)!.size === 0) {
        raceRooms.delete(racePin)
      }
    }
  },

  error(peer, error) {
    console.error('[ws] error:', error)
  },
})
