/**
 * lms WebSocket 聚合入口
 *
 * 组合 base 连接层（useWsConnection）+ lms 班级/竞赛/小组功能。
 * lms 启用时覆盖 base 的 useWebSocket 自动导入，供组件调用统一 API。
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
