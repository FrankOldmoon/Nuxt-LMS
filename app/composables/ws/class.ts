/**
 * WebSocket 班级功能方法
 *
 * 邀请跳转 / 弹幕 / 投票 / 抢答 / 在线状态 / 私信监听
 */
import type {
  InviteCallback, DanmakuCallback,
  VoteStartCallback, VoteUpdateCallback, VoteEndCallback,
  QuickAnswerStartCallback, QuickAnswerResultCallback, QuickAnswerEndCallback,
  OnlineUpdateCallback, MessageCallback, ChatroomCallback,
} from './types'
import {
  inviteCallbacks, danmakuCallbacks,
  voteStartCallbacks, voteUpdateCallbacks, voteEndCallbacks,
  quickAnswerStartCallbacks, quickAnswerResultCallbacks, quickAnswerEndCallbacks,
  onlineUpdateCallbacks, messageCallbacks, chatroomCallbacks,
} from './callbacks'
import type { useWsConnection } from './connection'

export function useWsClass(conn: ReturnType<typeof useWsConnection>) {
  const { send } = conn

  // ====================== 邀请 ======================
  function sendInvite(classId: number, courseId: number, chapterId: number, from: string = 'teacher') {
    send({ type: 'invite', classId, courseId, chapterId, from })
  }
  function onInvite(callback: InviteCallback) {
    inviteCallbacks.push(callback)
  }

  // ====================== 弹幕 ======================
  function sendDanmaku(classId: number, text: string, from: string = 'anonymous') {
    send({ type: 'danmaku', classId, text: text.slice(0, 200), from })
  }
  function onDanmaku(callback: DanmakuCallback) {
    danmakuCallbacks.push(callback)
  }

  // ====================== 投票 ======================
  function sendVoteStart(classId: number, voteId: string, question: string, options: string[]) {
    send({ type: 'voteStart', classId, voteId, question, options })
  }
  function onVoteStart(callback: VoteStartCallback) {
    voteStartCallbacks.push(callback)
  }
  function sendVoteSubmit(classId: number, voteId: string, optionIndex: number, from: string) {
    send({ type: 'voteSubmit', classId, voteId, optionIndex, from })
  }
  function onVoteUpdate(callback: VoteUpdateCallback) {
    voteUpdateCallbacks.push(callback)
  }
  function sendVoteEnd(classId: number, voteId: string) {
    send({ type: 'voteEnd', classId, voteId })
  }
  function onVoteEnd(callback: VoteEndCallback) {
    voteEndCallbacks.push(callback)
  }

  // ====================== 抢答 ======================
  function sendQuickAnswerStart(classId: number, question: string) {
    send({ type: 'quickAnswerStart', classId, question })
  }
  function onQuickAnswerStart(callback: QuickAnswerStartCallback) {
    quickAnswerStartCallbacks.push(callback)
  }
  function sendQuickAnswerSubmit(classId: number, from: string) {
    send({ type: 'quickAnswerSubmit', classId, from })
  }
  function onQuickAnswerResult(callback: QuickAnswerResultCallback) {
    quickAnswerResultCallbacks.push(callback)
  }
  function sendQuickAnswerEnd(classId: number) {
    send({ type: 'quickAnswerEnd', classId })
  }
  function onQuickAnswerEnd(callback: QuickAnswerEndCallback) {
    quickAnswerEndCallbacks.push(callback)
  }

  // ====================== 在线状态 ======================
  function sendOnline(classId: number, userId: number, from: string, online: boolean) {
    send({ type: 'online', classId, userId, from, online })
  }
  function onOnlineUpdate(callback: OnlineUpdateCallback) {
    onlineUpdateCallbacks.push(callback)
  }

  // ====================== 私信推送 ======================
  function onMessage(callback: MessageCallback) {
    messageCallbacks.push(callback)
  }

  // ====================== 班级聊天室 ======================
  function sendChatroom(classId: number, userId: number, from: string, avatarImg: string | null, text: string) {
    send({ type: 'chatroom', classId, userId, from, avatarImg, text })
  }
  function onChatroom(callback: ChatroomCallback) {
    chatroomCallbacks.push(callback)
  }

  return {
    sendInvite, onInvite,
    sendDanmaku, onDanmaku,
    sendVoteStart, onVoteStart, sendVoteSubmit, onVoteUpdate, sendVoteEnd, onVoteEnd,
    sendQuickAnswerStart, onQuickAnswerStart, sendQuickAnswerSubmit, onQuickAnswerResult, sendQuickAnswerEnd, onQuickAnswerEnd,
    sendOnline, onOnlineUpdate,
    onMessage,
    sendChatroom, onChatroom,
  }
}
