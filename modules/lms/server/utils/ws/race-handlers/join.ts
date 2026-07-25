/**
 * raceJoin / raceOnline：加入/在线状态
 */
import {
  raceStates, broadcastToRace,
  joinRaceRoom, getRaceOnlineUsers, computeRaceScores,
} from '../state'

/** raceJoin: 加入 race 房间；若竞赛进行中则同步 raceStart/Question/Scores */
export function handleRaceJoin(peer: any, data: any) {
  const pin = String(data.pin || ''); if (!pin) return
  joinRaceRoom(pin, peer)
  peer.send(JSON.stringify({ type: 'raceJoined', pin }))
  const race = raceStates.get(pin)
  if (race) {
    peer.send(JSON.stringify({ type: 'raceStart', raceCid: race.raceCid,
      courseId: race.courseId, from: 'system',
      totalQuestions: race.totalQuestions, timeLimit: race.timeLimit }))
    if (race.activeQuestionCid) {
      peer.send(JSON.stringify({ type: 'raceQuestion', raceCid: race.raceCid,
        questionCid: race.activeQuestionCid, questionIndex: race.currentQuestion,
        totalQuestions: race.totalQuestions, timeLimit: race.timeLimit }))
    }
    peer.send(JSON.stringify({ type: 'raceScores', raceCid: race.raceCid,
      scores: computeRaceScores(race) }))
  }
  broadcastToRace(pin, JSON.stringify({ type: 'onlineUpdate', pin, onlineUsers: getRaceOnlineUsers(pin) }))
}

/** raceOnline: 广播某用户在线状态变更 */
export function handleRaceOnline(_peer: any, data: any) {
  const pin = String(data.pin || ''); if (!pin) return
  broadcastToRace(pin, JSON.stringify({
    type: 'raceOnlineUpdate', pin,
    userId: Number(data.userId), from: String(data.from || 'anonymous'),
    online: data.online !== false,
  }))
}
