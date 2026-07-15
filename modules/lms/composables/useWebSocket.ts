/**
 * lms WebSocket aggregation entry
 *
 * Combines base connection layer (useWsConnection) + lms class/race/group features.
 * When lms is enabled, overrides base's useWebSocket auto-import, providing unified API for component calls.
 */
import { useWsClass } from './ws/class'
import { useWsRace } from './ws/race'
import { useWsGroup } from './ws/group'

export function useWebSocket() {
  const conn = useWsConnection()
  const { ws, wsConnected, joinedRooms, connect, disconnect, joinRoom, leaveRoom } = conn
  const classFeatures = useWsClass()
  const raceFeatures = useWsRace()
  const groupFeatures = useWsGroup()
  return {
    ws, wsConnected, joinedRooms, connect, disconnect, joinRoom, leaveRoom,
    ...classFeatures,
    ...raceFeatures,
    ...groupFeatures,
  }
}
