/**
 * WebSocket 回调注册表与消息分发
 *
 * 模块级回调数组，确保所有组件共享同一份（单例模式）。
 * 各功能模块通过 register* / on* 方法注册回调，
 * connection 模块收到消息后调用 dispatch 分发。
 */
import type {
  InviteCallback, DanmakuCallback,
  VoteStartCallback, VoteUpdateCallback, VoteEndCallback,
  QuickAnswerStartCallback, QuickAnswerResultCallback, QuickAnswerEndCallback,
  RaceJoinedCallback, RaceStartCallback, RaceQuestionCallback,
  RaceAnswerUpdateCallback, RaceScoresCallback, RaceQuestionEndCallback, RaceEndCallback,
  OnlineUpdateCallback, RaceOnlineUpdateCallback, MessageCallback,
} from './types'

// ====================== 回调数组 ======================
export const inviteCallbacks: InviteCallback[] = []
export const danmakuCallbacks: DanmakuCallback[] = []
export const voteStartCallbacks: VoteStartCallback[] = []
export const voteUpdateCallbacks: VoteUpdateCallback[] = []
export const voteEndCallbacks: VoteEndCallback[] = []
export const quickAnswerStartCallbacks: QuickAnswerStartCallback[] = []
export const quickAnswerResultCallbacks: QuickAnswerResultCallback[] = []
export const quickAnswerEndCallbacks: QuickAnswerEndCallback[] = []

export const raceJoinedCallbacks: RaceJoinedCallback[] = []
export const raceStartCallbacks: RaceStartCallback[] = []
export const raceQuestionCallbacks: RaceQuestionCallback[] = []
export const raceAnswerUpdateCallbacks: RaceAnswerUpdateCallback[] = []
export const raceScoresCallbacks: RaceScoresCallback[] = []
export const raceQuestionEndCallbacks: RaceQuestionEndCallback[] = []
export const raceEndCallbacks: RaceEndCallback[] = []

export const onlineUpdateCallbacks: OnlineUpdateCallback[] = []
export const raceOnlineUpdateCallbacks: RaceOnlineUpdateCallback[] = []
export const messageCallbacks: MessageCallback[] = []

/** 将收到的 WS 消息分发到对应回调数组 */
export function dispatch(type: string, data: any) {
  switch (type) {
    case 'invite': inviteCallbacks.forEach(cb => cb(data)); break
    case 'danmaku': danmakuCallbacks.forEach(cb => cb(data)); break
    case 'voteStart': voteStartCallbacks.forEach(cb => cb(data)); break
    case 'voteUpdate': voteUpdateCallbacks.forEach(cb => cb(data)); break
    case 'voteEnd': voteEndCallbacks.forEach(cb => cb(data)); break
    case 'quickAnswerStart': quickAnswerStartCallbacks.forEach(cb => cb(data)); break
    case 'quickAnswerResult': quickAnswerResultCallbacks.forEach(cb => cb(data)); break
    case 'quickAnswerEnd': quickAnswerEndCallbacks.forEach(cb => cb()); break
    case 'raceStart': raceStartCallbacks.forEach(cb => cb(data)); break
    case 'raceQuestion': raceQuestionCallbacks.forEach(cb => cb(data)); break
    case 'raceAnswerUpdate': raceAnswerUpdateCallbacks.forEach(cb => cb(data)); break
    case 'raceScores': raceScoresCallbacks.forEach(cb => cb(data)); break
    case 'raceQuestionEnd': raceQuestionEndCallbacks.forEach(cb => cb(data)); break
    case 'raceEnd': raceEndCallbacks.forEach(cb => cb(data)); break
    case 'raceJoined': raceJoinedCallbacks.forEach(cb => cb(data)); break
    case 'onlineUpdate': onlineUpdateCallbacks.forEach(cb => cb(data)); break
    case 'raceOnlineUpdate': raceOnlineUpdateCallbacks.forEach(cb => cb(data)); break
    case 'message': messageCallbacks.forEach(cb => cb(data)); break
  }
}
