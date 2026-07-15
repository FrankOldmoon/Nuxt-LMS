/**
 * raceStart: initialize raceStates[pin] and broadcast raceStart
 */
import { raceStates, broadcastToRace } from '../state'

export function handleRaceStart(_peer: any, data: any) {
  const pin = String(data.pin || ''); if (!pin) return
  const raceCid = Number(data.raceCid); const courseId = Number(data.courseId)
  const totalQuestions = Number(data.totalQuestions) || 0
  raceStates.set(pin, {
    raceCid, courseId, currentQuestion: -1, totalQuestions,
    activeQuestionCid: null, timeLimit: Number(data.timeLimit) || 30,
    questionStartedAt: 0, startedAt: Date.now(), answers: new Map(),
  })
  broadcastToRace(pin, JSON.stringify({ type: 'raceStart', raceCid, courseId,
    from: data.from || 'teacher', totalQuestions, timeLimit: data.timeLimit || 30 }))
}
