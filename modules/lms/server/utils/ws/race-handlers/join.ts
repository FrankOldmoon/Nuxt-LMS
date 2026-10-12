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
  broadcastToRace(pin, JSON.stringify({ type: 'raceOnlineUpdate', pin, onlineUsers: getRaceOnlineUsers(pin) }))
}

/** raceOnline: 广播某用户在线状态变更（身份取 WS 登录用户，不采信客户端 userId/from） */
export function handleRaceOnline(peer: any, data: any) {
  const pin = String(data.pin || ''); if (!pin) return
  const userId = Number(peer?._authUserId) || 0
  if (!userId) return
  broadcastToRace(pin, JSON.stringify({
    type: 'raceOnlineUpdate', pin,
    userId, from: String(peer._authUserName || peer._userName || 'anonymous'),
    online: data.online !== false,
  }))
}
