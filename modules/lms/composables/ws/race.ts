/**
 * WebSocket Race feature methods
 *
 * Join room / start race / push question / submit answer /
 * end question / end race / race online status
 *
 * Connection layer and callback registry provided by base (useWsConnection / registerWsHandler).
 */
export function useWsRace() {
  const { send } = useWsConnection()

  function raceJoin(pin: string) {
    send({ type: 'raceJoin', pin })
  }
  function onRaceJoined(callback: (data: any) => void) {
    return registerWsHandler('raceJoined', callback)
  }

  function sendRaceStart(pin: string, raceCid: number, courseId: number, totalQuestions: number, timeLimit: number, from: string = 'teacher') {
    send({ type: 'raceStart', pin, raceCid, courseId, totalQuestions, timeLimit, from })
  }
  function onRaceStart(callback: (data: any) => void) {
    return registerWsHandler('raceStart', callback)
  }

  function sendRaceQuestion(pin: string, raceCid: number, questionCid: number, questionIndex: number, totalQuestions: number, timeLimit: number) {
    send({ type: 'raceQuestion', pin, raceCid, questionCid, questionIndex, totalQuestions, timeLimit })
  }
  function onRaceQuestion(callback: (data: any) => void) {
    return registerWsHandler('raceQuestion', callback)
  }

  function sendRaceAnswer(pin: string, raceCid: number, questionCid: number, answer: any, rate: number, correct: boolean, from: string, userId: number) {
    send({ type: 'raceAnswer', pin, raceCid, questionCid, answer, rate, correct, from, userId })
  }
  function onRaceAnswerUpdate(callback: (data: any) => void) {
    return registerWsHandler('raceAnswerUpdate', callback)
  }
  function onRaceScores(callback: (data: any) => void) {
    return registerWsHandler('raceScores', callback)
  }

  function sendRaceQuestionEnd(pin: string, raceCid: number) {
    send({ type: 'raceQuestionEnd', pin, raceCid })
  }
  function onRaceQuestionEnd(callback: (data: any) => void) {
    return registerWsHandler('raceQuestionEnd', callback)
  }

  function sendRaceEnd(pin: string, raceCid: number) {
    send({ type: 'raceEnd', pin, raceCid })
  }
  function onRaceEnd(callback: (data: any) => void) {
    return registerWsHandler('raceEnd', callback)
  }

  function sendRaceOnline(pin: string, userId: number, from: string, online: boolean) {
    send({ type: 'raceOnline', pin, userId, from, online })
  }
  function onRaceOnlineUpdate(callback: (data: any) => void) {
    return registerWsHandler('raceOnlineUpdate', callback)
  }

  return {
    raceJoin, onRaceJoined,
    sendRaceStart, onRaceStart,
    sendRaceQuestion, onRaceQuestion,
    sendRaceAnswer, onRaceAnswerUpdate, onRaceScores,
    sendRaceQuestionEnd, onRaceQuestionEnd,
    sendRaceEnd, onRaceEnd,
    sendRaceOnline, onRaceOnlineUpdate,
  }
}
