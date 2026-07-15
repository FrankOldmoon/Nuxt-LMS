/**
 * Race WebSocket message handling
 *
 * Handles type: raceJoin / raceStart / raceQuestion / raceAnswer /
 *           raceQuestionEnd / raceEnd / raceOnline
 *
 * The room table / state table / broadcast functions / race calculations are all imported from ./state (unified explicit export).
 * The case bodies are split into race-handlers/*.ts by type; this file only does dispatch.
 */
import { raceRooms, broadcastToRace, leaveRaceRoom } from './state'
import { handleRaceJoin, handleRaceOnline } from './race-handlers/join'
import { handleRaceStart } from './race-handlers/start'
import { handleRaceQuestion } from './race-handlers/question'
import { handleRaceAnswer } from './race-handlers/answer'
import { handleRaceQuestionEnd, handleRaceEnd } from './race-handlers/end'

/** Returns true to indicate the message has been handled */
export function handleRaceMessage(peer: any, data: any): boolean {
  const { type } = data
  switch (type) {
    case 'raceJoin':       return handleRaceJoin(peer, data), true
    case 'raceOnline':     return handleRaceOnline(peer, data), true
    case 'raceStart':      return handleRaceStart(peer, data), true
    case 'raceQuestion':   return handleRaceQuestion(peer, data), true
    case 'raceAnswer':     return handleRaceAnswer(peer, data), true
    case 'raceQuestionEnd':return handleRaceQuestionEnd(peer, data), true
    case 'raceEnd':        return handleRaceEnd(peer, data), true
  }
  return false
}

/** Clean up race room when connection closes */
export function cleanupRacePeer(peer: any) {
  const pin = peer._racePin; if (!pin || !raceRooms.has(pin)) return
  const uid = peer._userId
  if (uid) {
    broadcastToRace(pin, JSON.stringify({ type: 'raceOnlineUpdate', pin,
      userId: uid, from: peer._userName || 'anonymous', online: false }))
  }
  leaveRaceRoom(pin, peer)
}
