/**
 * LMS WS Race message handler unit test
 * @see modules/lms/server/utils/ws/race.ts
 * @see modules/lms/server/utils/ws/race-handlers/*.ts
 *
 * Coverage:
 * - handleRaceMessage: dispatcher (type routing + unknown type returns false)
 * - handleRaceJoin: join race room + raceJoined push + online users broadcast
 * - handleRaceOnline: online status broadcast
 * - handleRaceStart: initialize raceStates + raceStart broadcast
 * - handleRaceQuestion: set current question + raceQuestion broadcast
 * - handleRaceAnswer: scoring (duplicate prevention) + raceAnswerUpdate / raceScores broadcast
 * - handleRaceQuestionEnd: push top3 + results
 * - handleRaceEnd: leaderboard broadcast + cleanup raceStates
 * - cleanupRacePeer: cleanup on leave
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { makeMockPeer } from '../../../../test/setup/db-helpers'
import { raceRooms, raceStates } from '../../server/utils/ws/state'
import { handleRaceMessage, cleanupRacePeer } from '../../server/utils/ws/race'

beforeEach(() => {
  raceRooms.clear()
  raceStates.clear()
})

function sendsOf(peer: any): any[] {
  return peer.send.mock.calls.map((c: any[]) => JSON.parse(c[0]))
}

describe('ws/race: handleRaceMessage dispatcher', () => {
  it('未知 type 返回 false', () => {
    expect(handleRaceMessage(makeMockPeer(), { type: 'unknown' })).toBe(false)
  })

  it('raceJoin 消息返回 true', () => {
    expect(handleRaceMessage(makeMockPeer(), { type: 'raceJoin', pin: 'p1' })).toBe(true)
  })

  it('raceOnline 消息返回 true', () => {
    expect(handleRaceMessage(makeMockPeer(), { type: 'raceOnline', pin: 'p1' })).toBe(true)
  })

  it('raceStart 消息返回 true', () => {
    expect(handleRaceMessage(makeMockPeer(), { type: 'raceStart', pin: 'p1' })).toBe(true)
  })

  it('raceQuestion 消息返回 true', () => {
    expect(handleRaceMessage(makeMockPeer(), { type: 'raceQuestion', pin: 'p1' })).toBe(true)
  })

  it('raceAnswer 消息返回 true', () => {
    expect(handleRaceMessage(makeMockPeer(), { type: 'raceAnswer', pin: 'p1' })).toBe(true)
  })

  it('raceQuestionEnd / raceEnd 消息返回 true', () => {
    expect(handleRaceMessage(makeMockPeer(), { type: 'raceQuestionEnd', pin: 'p1' })).toBe(true)
    expect(handleRaceMessage(makeMockPeer(), { type: 'raceEnd', pin: 'p1' })).toBe(true)
  })
})

describe('ws/race: join / online', () => {
  it('raceJoin 加入房间 + 推送 raceJoined', () => {
    const peer = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    expect(peer._racePin).toBe('p1')
    expect(raceRooms.get('p1')?.has(peer)).toBe(true)
    const sends = sendsOf(peer)
    expect(sends[0]).toEqual({ type: 'raceJoined', pin: 'p1' })
  })

  it('raceJoin 缺 pin 静默忽略', () => {
    const peer = makeMockPeer()
    expect(() => handleRaceMessage(peer, { type: 'raceJoin' })).not.toThrow()
    expect(peer.send).not.toHaveBeenCalled()
  })

  it('raceJoin 时若 race 已进行中，同步 raceStart/Question/Scores', () => {
    // Start first
    handleRaceMessage(makeMockPeer(), {
      type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1, totalQuestions: 5, timeLimit: 30,
    })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceQuestion', pin: 'p1', questionCid: 50, questionIndex: 0, timeLimit: 30,
    })
    // New peer joins
    const peer = makeMockPeer()
    handleRaceMessage(peer, { type: 'raceJoin', pin: 'p1' })
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'raceJoined', pin: 'p1' })
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceStart' }))
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceQuestion' }))
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceScores' }))
  })

  it('raceOnline 广播在线状态', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    const peer2 = makeMockPeer({ userId: 2, userName: 'b' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    handleRaceMessage(peer2, { type: 'raceJoin', pin: 'p1', userId: 2, from: 'b' })
    peer1.send.mockClear()
    peer2.send.mockClear()
    handleRaceMessage(makeMockPeer(), {
      type: 'raceOnline', pin: 'p1', userId: 5, from: 'u5', online: false,
    })
    const sends1 = sendsOf(peer1)
    expect(sends1).toContainEqual({
      type: 'raceOnlineUpdate', pin: 'p1', userId: 5, from: 'u5', online: false,
    })
  })
})

describe('ws/race: start / question / answer', () => {
  let peer1: any
  beforeEach(() => {
    peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
  })

  it('raceStart 初始化 raceStates + 广播 raceStart', () => {
    handleRaceMessage(makeMockPeer(), {
      type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1, totalQuestions: 5, timeLimit: 30, from: 'teacher',
    })
    expect(raceStates.has('p1')).toBe(true)
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual({
      type: 'raceStart', raceCid: 100, courseId: 1, from: 'teacher', totalQuestions: 5, timeLimit: 30,
    })
  })

  it('raceStart 缺 pin 静默忽略', () => {
    expect(() => handleRaceMessage(makeMockPeer(), { type: 'raceStart' })).not.toThrow()
  })

  it('raceQuestion 设置当前题 + 广播', () => {
    handleRaceMessage(makeMockPeer(), {
      type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1, totalQuestions: 5, timeLimit: 30,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer(), {
      type: 'raceQuestion', pin: 'p1', questionCid: 50, questionIndex: 0, timeLimit: 30,
    })
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual(expect.objectContaining({
      type: 'raceQuestion', raceCid: 100, questionCid: 50, questionIndex: 0, totalQuestions: 5, timeLimit: 30,
    }))
  })

  it('raceQuestion race 不存在时静默忽略', () => {
    expect(() => handleRaceMessage(makeMockPeer(), {
      type: 'raceQuestion', pin: 'missing', questionCid: 50,
    })).not.toThrow()
  })

  it('raceAnswer 计分 + 广播 raceAnswerUpdate / raceScores', () => {
    handleRaceMessage(makeMockPeer(), {
      type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1, totalQuestions: 5, timeLimit: 30,
    })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceQuestion', pin: 'p1', questionCid: 50, questionIndex: 0, timeLimit: 30,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer(), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: 'X', rate: 1, correct: true,
    })
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual(expect.objectContaining({
      type: 'raceAnswerUpdate', raceCid: 100, questionCid: 50, answeredCount: 1,
    }))
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceScores' }))
  })

  it('raceAnswer 同一用户不能重复答同一题', () => {
    handleRaceMessage(makeMockPeer(), {
      type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1, totalQuestions: 5, timeLimit: 30,
    })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceQuestion', pin: 'p1', questionCid: 50, questionIndex: 0, timeLimit: 30,
    })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: 'X', rate: 1, correct: true,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer(), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: 'Y', rate: 0, correct: false,
    })
    // The second answer should not produce a raceAnswerUpdate push
    const sends = sendsOf(peer1)
    const updates = sends.filter((m: any) => m.type === 'raceAnswerUpdate')
    expect(updates).toHaveLength(0)
  })

  it('raceAnswer race 不存在或无 active question 静默忽略', () => {
    handleRaceMessage(makeMockPeer(), {
      type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1, totalQuestions: 5, timeLimit: 30,
    })
    // No activeQuestionCid set
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer(), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: 'X', rate: 1, correct: true,
    })
    expect(peer1.send).not.toHaveBeenCalled()
  })
})

describe('ws/race: questionEnd / end', () => {
  it('raceQuestionEnd 推 top3 + results（按 correct/timeUsed 排序）', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    const peer2 = makeMockPeer({ userId: 2, userName: 'b' })
    const peer3 = makeMockPeer({ userId: 3, userName: 'c' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    handleRaceMessage(peer2, { type: 'raceJoin', pin: 'p1', userId: 2, from: 'b' })
    handleRaceMessage(peer3, { type: 'raceJoin', pin: 'p1', userId: 3, from: 'c' })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1, totalQuestions: 5, timeLimit: 30,
    })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceQuestion', pin: 'p1', questionCid: 50, questionIndex: 0, timeLimit: 30,
    })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: 'X', rate: 1, correct: true,
    })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceAnswer', pin: 'p1', userId: 2, from: 'b', answer: 'Y', rate: 0, correct: false,
    })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceAnswer', pin: 'p1', userId: 3, from: 'c', answer: 'Z', rate: 1, correct: true,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer(), { type: 'raceQuestionEnd', pin: 'p1' })
    const sends = sendsOf(peer1)
    const end = sends.find((m: any) => m.type === 'raceQuestionEnd')
    expect(end).toBeDefined()
    expect(end.results).toHaveLength(3)
    expect(end.top3).toHaveLength(3)
    // The first of top3 is the correct user1 or user3
    expect(end.top3[0].correct).toBe(true)
  })

  it('raceQuestionEnd race 不存在时静默忽略', () => {
    expect(() => handleRaceMessage(makeMockPeer(), { type: 'raceQuestionEnd', pin: 'missing' })).not.toThrow()
  })

  it('raceEnd 推 leaderboard + 清理 raceStates', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    handleRaceMessage(makeMockPeer(), {
      type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1, totalQuestions: 5, timeLimit: 30,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer(), { type: 'raceEnd', pin: 'p1' })
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceEnd' }))
    expect(raceStates.has('p1')).toBe(false)
  })

  it('raceEnd race 不存在时静默忽略', () => {
    expect(() => handleRaceMessage(makeMockPeer(), { type: 'raceEnd', pin: 'missing' })).not.toThrow()
  })
})

describe('ws/race: cleanupRacePeer', () => {
  it('离开时广播 offline + 离开 race 房间', () => {
    const peer1 = makeMockPeer({ userId: 5, userName: 'alice' })
    const peer2 = makeMockPeer({ userId: 6, userName: 'bob' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 5, from: 'alice' })
    handleRaceMessage(peer2, { type: 'raceJoin', pin: 'p1', userId: 6, from: 'bob' })
    peer2.send.mockClear()
    cleanupRacePeer(peer1)
    expect(raceRooms.get('p1')?.has(peer1)).toBe(false)
    const sends = sendsOf(peer2)
    expect(sends).toContainEqual({
      type: 'raceOnlineUpdate', pin: 'p1', userId: 5, from: 'alice', online: false,
    })
  })

  it('未加入 race 静默返回', () => {
    expect(() => cleanupRacePeer(makeMockPeer())).not.toThrow()
  })
})
