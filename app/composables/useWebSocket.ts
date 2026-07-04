/**
 * WebSocket composable：管理班级内实时通信
 *
 * 组合入口，将连接管理（connection）、班级功能（class）、竞赛功能（race）
 * 合并返回统一 API，供各组件调用。
 *
 * - 自动连接 /api/ws
 * - joinClass(classId)：加入班级房间
 * - onInvite(callback)：监听邀请跳转事件
 * - sendInvite(classId, courseId, chapterId)：广播邀请
 * - sendDanmaku(classId, text, from)：发送弹幕
 * - onDanmaku(callback)：监听弹幕事件
 * - sendVoteStart / onVoteStart：发起/监听投票
 * - sendVoteSubmit / onVoteUpdate：提交投票/监听投票更新
 * - sendVoteEnd / onVoteEnd：结束投票/监听投票结束
 * - sendQuickAnswerStart / onQuickAnswerStart：发起/监听抢答
 * - sendQuickAnswerSubmit / onQuickAnswerResult：抢答/监听抢答结果
 * - sendQuickAnswerEnd / onQuickAnswerEnd：结束抢答/监听抢答结束
 * - raceJoin / onRaceJoined / sendRaceStart / onRaceStart ...
 */
import { useWsConnection } from './ws/connection'
import { useWsClass } from './ws/class'
import { useWsRace } from './ws/race'

export function useWebSocket() {
  const conn = useWsConnection()
  const classFeatures = useWsClass(conn)
  const raceFeatures = useWsRace(conn)

  const { ws, wsConnected, joinedClassId, connect, disconnect, joinClass } = conn

  return {
    // 连接
    ws, wsConnected, joinedClassId, connect, disconnect, joinClass,
    // 班级功能
    ...classFeatures,
    // 竞赛功能
    ...raceFeatures,
  }
}
