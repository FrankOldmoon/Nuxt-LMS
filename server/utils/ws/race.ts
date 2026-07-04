/**
 * 竞赛（Race）WebSocket 消息处理
 *
 * 处理 type: raceJoin / raceStart / raceQuestion / raceAnswer /
 *           raceQuestionEnd / raceEnd / raceOnline
 */
import {
  raceRooms, raceStates,
  broadcastToRace, computeRaceScores, getRaceOnlineUsers,
  type RaceState,
} from './state'

/** 返回 true 表示消息已被处理 */
export function handleRaceMessage(peer: any, data: any): boolean {
  const { type } = data

  switch (type) {
    case 'raceJoin': {
      const pin = String(data.pin || '')
      if (!pin) return true
      if (!raceRooms.has(pin)) raceRooms.set(pin, new Set())
      raceRooms.get(pin)!.add(peer)
      peer._racePin = pin
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
        peer.send(JSON.stringify({
          type: 'raceScores',
          raceCid: race.raceCid,
          scores: computeRaceScores(race),
        }))
      }
      // 广播在线状态到 race 房间（新成员加入）
      const onlineUsers = getRaceOnlineUsers(pin)
      broadcastToRace(pin, JSON.stringify({ type: 'onlineUpdate', pin, onlineUsers }))
      return true
    }

    case 'raceOnline': {
      const pin = String(data.pin || '')
      if (!pin) return true
      const userId = Number(data.userId)
      const from = String(data.from || 'anonymous')
      const online = data.online !== false
      broadcastToRace(pin, JSON.stringify({
        type: 'raceOnlineUpdate', pin, userId, from, online,
      }))
      return true
    }

    case 'raceStart': {
      const pin = String(data.pin || '')
      if (!pin) return true
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
      return true
    }

    case 'raceQuestion': {
      const pin = String(data.pin || '')
      const race = raceStates.get(pin)
      if (!race) return true
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
        raceCid: race.raceCid, questionCid, questionIndex,
        totalQuestions: race.totalQuestions, timeLimit: race.timeLimit,
      }))
      return true
    }

    case 'raceAnswer': {
      const pin = String(data.pin || '')
      const race = raceStates.get(pin)
      if (!race || !race.activeQuestionCid) return true
      const userId = Number(data.userId)
      const from = String(data.from || 'anonymous')
      const questionCid = race.activeQuestionCid
      const qAnswers = race.answers.get(questionCid)
      if (!qAnswers || qAnswers.has(userId)) return true
      qAnswers.set(userId, {
        answer: data.answer,
        from, userId,
        rate: Number(data.rate) || 0,
        correct: !!data.correct,
        submittedAt: Date.now(),
      })
      broadcastToRace(pin, JSON.stringify({
        type: 'raceAnswerUpdate',
        raceCid: race.raceCid, questionCid, answeredCount: qAnswers.size,
      }))
      broadcastToRace(pin, JSON.stringify({
        type: 'raceScores',
        raceCid: race.raceCid, scores: computeRaceScores(race),
      }))
      return true
    }

    case 'raceQuestionEnd': {
      const pin = String(data.pin || '')
      const race = raceStates.get(pin)
      if (!race || !race.activeQuestionCid) return true
      const questionCid = race.activeQuestionCid
      const qAnswers = race.answers.get(questionCid)
      const results: any[] = []
      if (qAnswers) {
        for (const [uid, info] of qAnswers) {
          const timeUsed = Math.round((info.submittedAt - race.questionStartedAt) / 100) / 10
          results.push({ userId: uid, from: info.from, correct: info.correct, rate: info.rate, timeUsed })
        }
      }
      results.sort((a, b) => {
        if (a.correct !== b.correct) return a.correct ? -1 : 1
        return a.timeUsed - b.timeUsed
      })
      const top3 = results.slice(0, 3)
      broadcastToRace(pin, JSON.stringify({
        type: 'raceQuestionEnd',
        raceCid: race.raceCid, questionCid, results, top3,
        answeredCount: qAnswers?.size || 0,
      }))
      race.activeQuestionCid = null
      return true
    }

    case 'raceEnd': {
      const pin = String(data.pin || '')
      const race = raceStates.get(pin)
      if (!race) return true
      const summary = computeRaceScores(race)
      broadcastToRace(pin, JSON.stringify({
        type: 'raceEnd',
        raceCid: race.raceCid, leaderboard: summary, scores: summary,
      }))
      raceStates.delete(pin)
      return true
    }
  }

  return false
}

/** 连接关闭时清理 race 房间 */
export function cleanupRacePeer(peer: any) {
  const pin = peer._racePin
  if (!pin || !raceRooms.has(pin)) return
  const uid = peer._userId
  const from = peer._userName
  if (uid) {
    broadcastToRace(pin, JSON.stringify({ type: 'raceOnlineUpdate', pin, userId: uid, from: from || 'anonymous', online: false }))
  }
  raceRooms.get(pin)!.delete(peer)
  if (raceRooms.get(pin)!.size === 0) {
    raceRooms.delete(pin)
  }
}
