/**
 * WebSocket 消息回调类型定义
 */

export type InviteCallback = (data: { courseId: number; chapterId: number; from: string }) => void
export type DanmakuCallback = (data: { text: string; from: string }) => void
export type VoteStartCallback = (data: { voteId: string; question: string; options: string[] }) => void
export type VoteUpdateCallback = (data: { voteId: string; results: number[]; total: number }) => void
export type VoteEndCallback = (data: { voteId: string; results: number[]; total: number }) => void
export type QuickAnswerStartCallback = (data: { question: string }) => void
export type QuickAnswerResultCallback = (data: { winner: string | null }) => void
export type QuickAnswerEndCallback = () => void

// Race 回调类型
export type RaceJoinedCallback = (data: { pin: string }) => void
export type RaceStartCallback = (data: { raceCid: number; courseId: number; from: string; totalQuestions: number; timeLimit: number }) => void
export type RaceQuestionCallback = (data: { raceCid: number; questionCid: number; questionIndex: number; totalQuestions: number; timeLimit: number }) => void
export type RaceAnswerUpdateCallback = (data: { raceCid: number; questionCid: number; answeredCount: number }) => void
export type RaceScoresCallback = (data: { raceCid: number; scores: any[] }) => void
export type RaceQuestionEndCallback = (data: { raceCid: number; questionCid: number; results: any[]; top3: any[]; answeredCount: number }) => void
export type RaceEndCallback = (data: { raceCid: number; leaderboard: any[]; scores: any[] }) => void

// 在线状态回调
export type OnlineUpdateCallback = (data: { classId?: number; userId: number; from: string; online: boolean }) => void
export type RaceOnlineUpdateCallback = (data: { pin: string; userId: number; from: string; online: boolean }) => void

// 私信回调
export type MessageCallback = (data: { message: any }) => void
