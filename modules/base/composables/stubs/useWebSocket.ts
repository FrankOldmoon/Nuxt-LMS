/**
 * WebSocket composable（base 连接层 stub）
 *
 * 仅管理连接/重连/消息分发。
 * 各 module（auth/doc/lms）通过 registerWsHandler 注册自己的消息回调：
 * - auth：onMessage（私信推送）
 * - doc：lockJoin/lockRelease（编辑锁）
 * - lms：invite/danmaku/vote/quickAnswer/race/groupChat/online（课堂互动）
 *
 * - connect()：连接 /api/ws，自动注册用户并重连
 * - joinClass(classId)：加入班级房间（lms 使用）
 * - onInvite(callback)：监听邀请跳转事件（lms 使用，base 提供通用注册）
 *
 * 注意：race/classroom/group 相关方法在此仅为 no-op stub，
 * 确保 doc 模块中的 race.vue / chatroom.vue 在 lms 未启用时不会崩溃。
 * lms 启用时，lms/composables/useWebSocket.ts 会覆盖本 composable，
 * 提供真正的 race/group/class 实现。
 *
 * 本文件位于 stubs/ 子目录，仅当 lms 模块未启用时由 base/index.ts 注册，
 * 避免与 lms 版本产生 "Duplicated imports" 警告。
 */
import { useWsConnection } from '../ws/connection'
import { registerWsHandler } from '../ws/callbacks'
import type { WsHandler } from '../ws/types'

// no-op stub：lms 未启用时避免 TypeError
const noop = () => {}
// no-op stub：注册回调返回清理函数
const noopUnsub = () => () => {}

export function useWebSocket() {
  const conn = useWsConnection()
  const { ws, wsConnected, joinedClassId, connect, disconnect, joinClass } = conn

  return {
    // 连接
    ws, wsConnected, joinedClassId, connect, disconnect, joinClass,
    // 通用回调注册（各 module 使用）
    registerWsHandler,
    // 便捷方法：监听私信推送（message 类型）
    onMessage: (cb: WsHandler) => registerWsHandler('message', cb),
    // 便捷方法：监听邀请跳转（invite 类型）
    onInvite: (cb: WsHandler) => registerWsHandler('invite', cb),

    // ===== race stubs（lms 启用时由 lms 覆盖）=====
    raceJoin: noop,
    onRaceJoined: noopUnsub,
    sendRaceStart: noop,
    onRaceStart: noopUnsub,
    sendRaceQuestion: noop,
    onRaceQuestion: noopUnsub,
    sendRaceAnswer: noop,
    onRaceAnswerUpdate: noopUnsub,
    onRaceScores: noopUnsub,
    sendRaceQuestionEnd: noop,
    onRaceQuestionEnd: noopUnsub,
    sendRaceEnd: noop,
    onRaceEnd: noopUnsub,
    sendRaceOnline: noop,
    onRaceOnlineUpdate: noopUnsub,

    // ===== class/chatroom stubs（lms 启用时由 lms 覆盖）=====
    sendDanmaku: noop,
    onDanmaku: noopUnsub,
    sendVoteStart: noop,
    onVoteStart: noopUnsub,
    sendVoteSubmit: noop,
    onVoteUpdate: noopUnsub,
    sendVoteEnd: noop,
    onVoteEnd: noopUnsub,
    sendQuickAnswerStart: noop,
    onQuickAnswerStart: noopUnsub,
    sendQuickAnswerSubmit: noop,
    onQuickAnswerResult: noopUnsub,
    sendQuickAnswerEnd: noop,
    onQuickAnswerEnd: noopUnsub,
    sendOnline: noop,
    onOnlineUpdate: noopUnsub,
    sendChatroom: noop,
    onChatroom: noopUnsub,

    // ===== group stubs（lms 启用时由 lms 覆盖）=====
    joinGroup: noop,
    leaveGroup: noop,
    sendGroupChat: noop,
    onGroupChat: noopUnsub,
  }
}
