/**
 * LMS WS 竞赛（Race）消息处理器单元测试
 * @see modules/lms/server/utils/ws/race.ts
 * @see modules/lms/server/utils/ws/race-handlers/*.ts
 *
 * 覆盖：
 * - handleRaceMessage  dispatcher（type 路由 + 未知 type 返回 false）
 * - handleRaceJoin  加入 race 房间 + raceJoined 推送 + 在线用户广播
 * - handleRaceOnline  在线状态广播（身份取 WS 登录用户，不采信客户端 userId）
 * - handleRaceStart  教师鉴权 + DB 竞赛定义校验（questionIds 白名单）+ raceStart 广播
 * - handleRaceQuestion  教师鉴权 + 白名单校验 + raceQuestion 广播
 * - handleRaceAnswer  登录 + 本人身份 + 白名单 + 服务端判分（查无题目判 0 分）
 * - handleRaceQuestionEnd / handleRaceEnd  教师鉴权 + top3/leaderboard + 排名奖去重
 * - cleanupRacePeer  离开清理
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 服务端判分/竞赛定义引入 @nuxthub/db；默认 mock 为"查无数据"
vi.mock('@nuxthub/db', () => ({
  db: {
    query: {
      questions: { findFirst: vi.fn().mockResolvedValue(null) },
      races: { findFirst: vi.fn().mockResolvedValue(null) },
      userRaces: { findFirst: vi.fn().mockResolvedValue(null) },
    },
  },
  schema: {
    questions: { courseId: 'courseId', cid: 'cid' },
    races: { courseId: 'courseId', cid: 'cid' },
    userRaces: { userId: 'userId', courseId: 'courseId', raceCid: 'raceCid' },
  },
}))

// 竞赛控制教师鉴权依赖 isCourseTeacher（查 userCourses），单测中 mock 掉
vi.mock('../../server/utils/auth', async (importOriginal) => {
  const actual: any = await importOriginal()
  return { ...actual, isCourseTeacher: vi.fn().mockResolvedValue(true) }
})

// 排名奖励结算：addCourseScore / checkAndAwardMedals 变为 spy，便于断言
vi.mock('../../server/utils/userScore/course', () => ({
  addCourseScore: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../server/utils/medals/checker', () => ({
  checkAndAwardMedals: vi.fn().mockResolvedValue([]),
}))

import { makeMockPeer } from '../../../../test/setup/db-helpers'
import { db } from '@nuxthub/db'
import { isCourseTeacher } from '../../server/utils/auth'
import { raceRooms, raceStates } from '../../server/utils/ws/state'
import { handleRaceMessage, cleanupRacePeer } from '../../server/utils/ws/race'

const isCourseTeacherMock = vi.mocked(isCourseTeacher)

/** 等待异步 handler（鉴权/判分/结算）完成：多轮 macrotask flush */
const flushAsync = async () => {
  for (let i = 0; i < 10; i++) await new Promise(r => setTimeout(r, 0))
}

/** 课程教师 peer（isCourseTeacherMock 默认 true，登录用户即可通过课程教师校验） */
const teacher = () => makeMockPeer({ userId: 9, userName: 'teacher' })

/** 教师开启一场竞赛并等待状态就绪 */
async function startRace(pin = 'p1', opts: { raceCid?: number; courseId?: number } = {}) {
  handleRaceMessage(teacher(), {
    type: 'raceStart', pin, raceCid: opts.raceCid ?? 100, courseId: opts.courseId ?? 1, timeLimit: 30,
  })
  await flushAsync()
}

/** 教师推一道题并等待就绪 */
async function askQuestion(pin = 'p1', questionCid = 50, index = 0) {
  handleRaceMessage(teacher(), {
    type: 'raceQuestion', pin, questionCid, questionIndex: index, timeLimit: 30,
  })
  await flushAsync()
}

beforeEach(() => {
  raceRooms.clear()
  raceStates.clear()
  // 竞赛排名奖励配置
  ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({
    race: { rank1Exp: 100, rank1Coin: 100, rank2Exp: 80, rank2Coin: 80, rank3Exp: 60, rank3Coin: 60 },
  })
  ;(db.query.questions.findFirst as any).mockReset().mockResolvedValue(null)
  ;(db.query.races.findFirst as any).mockReset().mockResolvedValue({
    courseId: 1, cid: 100, questionIds: [50, 51, 52, 53, 54],
  })
  ;(db.query.userRaces.findFirst as any).mockReset().mockResolvedValue(null)
  isCourseTeacherMock.mockReset().mockResolvedValue(true)
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
    const peer = makeMockPeer({ userId: 1 })
    expect(() => handleRaceMessage(peer, { type: 'raceJoin' })).not.toThrow()
    expect(peer.send).not.toHaveBeenCalled()
  })

  it('raceJoin 时若 race 已进行中，同步 raceStart/Question/Scores', async () => {
    await startRace('p1')
    await askQuestion('p1', 50, 0)
    // 新 peer 加入
    const peer = makeMockPeer({ userId: 2, userName: 'b' })
    handleRaceMessage(peer, { type: 'raceJoin', pin: 'p1' })
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'raceJoined', pin: 'p1' })
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceStart' }))
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceQuestion' }))
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceScores' }))
  })

  it('raceOnline 以 WS 登录身份广播在线状态', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    const peer2 = makeMockPeer({ userId: 2, userName: 'b' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    handleRaceMessage(peer2, { type: 'raceJoin', pin: 'p1', userId: 2, from: 'b' })
    peer1.send.mockClear()
    peer2.send.mockClear()
    // 客户端伪造 userId=5 / from='u5'：应以登录身份 userId=1 广播
    handleRaceMessage(peer1, { type: 'raceOnline', pin: 'p1', userId: 5, from: 'u5', online: false })
    const sends1 = sendsOf(peer1)
    expect(sends1).toContainEqual({
      type: 'raceOnlineUpdate', pin: 'p1', userId: 1, from: 'a', online: false,
    })
  })

  it('raceOnline 未登录不广播', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer(), { type: 'raceOnline', pin: 'p1', userId: 5, from: 'u5', online: false })
    expect(peer1.send).not.toHaveBeenCalled()
  })
})

describe('ws/race: start / question', () => {
  let peer1: any
  beforeEach(() => {
    peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
  })

  it('raceStart 教师初始化 raceStates + 广播 raceStart（totalQuestions 取 DB 白名单长度）', async () => {
    await startRace('p1')
    expect(raceStates.has('p1')).toBe(true)
    expect(raceStates.get('p1')!.questionIds).toEqual([50, 51, 52, 53, 54])
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual({
      type: 'raceStart', raceCid: 100, courseId: 1, from: 'teacher', totalQuestions: 5, timeLimit: 30,
    })
  })

  it('raceStart 未登录被拒', async () => {
    const sender = makeMockPeer()
    handleRaceMessage(sender, { type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1 })
    await flushAsync()
    expect(raceStates.has('p1')).toBe(false)
    expect(sendsOf(sender)).toContainEqual({ type: 'error', message: 'Unauthorized' })
  })

  it('raceStart 非课程教师被拒', async () => {
    isCourseTeacherMock.mockResolvedValue(false)
    const sender = makeMockPeer({ userId: 3, userName: 'student' })
    handleRaceMessage(sender, { type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1 })
    await flushAsync()
    expect(raceStates.has('p1')).toBe(false)
    expect(sendsOf(sender)).toContainEqual(expect.objectContaining({ type: 'error' }))
  })

  it('raceStart 竞赛不存在被拒', async () => {
    ;(db.query.races.findFirst as any).mockResolvedValue(null)
    const sender = teacher()
    handleRaceMessage(sender, { type: 'raceStart', pin: 'p1', raceCid: 100, courseId: 1 })
    await flushAsync()
    expect(raceStates.has('p1')).toBe(false)
    expect(sendsOf(sender)).toContainEqual({ type: 'error', message: 'race not found' })
  })

  it('raceStart 缺 pin 静默忽略', async () => {
    expect(() => handleRaceMessage(teacher(), { type: 'raceStart' })).not.toThrow()
    await flushAsync()
    expect(raceStates.has('p1')).toBe(false)
  })

  it('raceQuestion 教师设置当前题 + 广播', async () => {
    await startRace('p1')
    peer1.send.mockClear()
    await askQuestion('p1', 50, 0)
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual(expect.objectContaining({
      type: 'raceQuestion', raceCid: 100, questionCid: 50, questionIndex: 0, totalQuestions: 5, timeLimit: 30,
    }))
  })

  it('raceQuestion 白名单外题目忽略', async () => {
    await startRace('p1')
    peer1.send.mockClear()
    await askQuestion('p1', 999, 0)
    const sends = sendsOf(peer1)
    expect(sends.filter((m: any) => m.type === 'raceQuestion')).toHaveLength(0)
    expect(raceStates.get('p1')!.activeQuestionCid).toBeNull()
  })

  it('raceQuestion 非教师忽略', async () => {
    await startRace('p1')
    isCourseTeacherMock.mockResolvedValue(false)
    peer1.send.mockClear()
    await askQuestion('p1', 50, 0)
    expect(sendsOf(peer1).filter((m: any) => m.type === 'raceQuestion')).toHaveLength(0)
    expect(raceStates.get('p1')!.activeQuestionCid).toBeNull()
  })

  it('raceQuestion race 不存在时静默忽略', async () => {
    expect(() => handleRaceMessage(teacher(), {
      type: 'raceQuestion', pin: 'missing', questionCid: 50,
    })).not.toThrow()
    await flushAsync()
  })
})

describe('ws/race: answer', () => {
  let peer1: any
  beforeEach(async () => {
    peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    await startRace('p1')
    await askQuestion('p1', 50, 0)
  })

  it('raceAnswer 计分 + 广播 raceAnswerUpdate / raceScores', async () => {
    ;(db.query.questions.findFirst as any).mockResolvedValueOnce({
      courseId: 1, cid: 50, type: 'single', answer: [0], point: 1,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true,
    })
    await flushAsync()
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual(expect.objectContaining({
      type: 'raceAnswerUpdate', raceCid: 100, questionCid: 50, answeredCount: 1,
    }))
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceScores' }))
  })

  it('raceAnswer 未登录被拒', async () => {
    const sender = makeMockPeer()
    handleRaceMessage(sender, {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true,
    })
    await flushAsync()
    expect(sendsOf(sender)).toContainEqual({ type: 'error', message: 'Unauthorized' })
    // 未记录任何作答
    expect(raceStates.get('p1')!.answers.get(50)!.size).toBe(0)
  })

  it('raceAnswer 冒充他人被拒：data.userId 被忽略，按登录身份记录', async () => {
    ;(db.query.questions.findFirst as any).mockResolvedValueOnce({
      courseId: 1, cid: 50, type: 'single', answer: [0], point: 1,
    })
    peer1.send.mockClear()
    // peer 是 user 2，却声称 userId=1（冒充 user 1）
    handleRaceMessage(makeMockPeer({ userId: 2, userName: 'b' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true,
    })
    await flushAsync()
    const scores = sendsOf(peer1).filter((m: any) => m.type === 'raceScores').pop()
    expect(scores.scores[0]).toEqual(expect.objectContaining({ userId: 2 }))
    expect(scores.scores.map((s: any) => s.userId)).not.toContain(1)
  })

  it('raceAnswer 答对时广播 raceAnswerCorrect（供竞赛内答对者弹幕）', async () => {
    ;(db.query.questions.findFirst as any).mockResolvedValueOnce({
      courseId: 1, cid: 50, type: 'single', answer: [0], point: 1,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true,
    })
    await flushAsync()
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual({
      type: 'raceAnswerCorrect', raceCid: 100, questionCid: 50, userId: 1, from: 'a', gain: 1,
    })
  })

  it('raceAnswer 答错时不广播 raceAnswerCorrect', async () => {
    ;(db.query.questions.findFirst as any).mockResolvedValueOnce({
      courseId: 1, cid: 50, type: 'single', answer: [0], point: 1,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [1], rate: 1, correct: true,
    })
    await flushAsync()
    const sends = sendsOf(peer1)
    expect(sends.filter((m: any) => m.type === 'raceAnswerCorrect')).toHaveLength(0)
  })

  it('raceAnswer 题目查不到时判 0 分（不采信客户端 rate）', async () => {
    // questions.findFirst 默认返回 null
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: 'X', rate: 1, correct: true,
    })
    await flushAsync()
    const scores = sendsOf(peer1).filter((m: any) => m.type === 'raceScores').pop()
    expect(scores.scores[0]).toEqual(expect.objectContaining({ userId: 1, score: 0, correctCount: 0 }))
    expect(sendsOf(peer1).filter((m: any) => m.type === 'raceAnswerCorrect')).toHaveLength(0)
  })

  it('raceAnswer 题目不在本场白名单内时忽略', async () => {
    // 模拟旧状态/越权推题：activeQuestionCid 指向白名单外的题（并 seeding answers map 使其通过前置检查）
    const race = raceStates.get('p1')!
    race.activeQuestionCid = 999
    race.answers.set(999, new Map())
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true,
    })
    await flushAsync()
    expect(peer1.send).not.toHaveBeenCalled()
  })

  it('raceAnswer 答完私发 raceAnswerResult（含正确答案/解析）给答题者', async () => {
    ;(db.query.questions.findFirst as any).mockResolvedValueOnce({
      courseId: 1, cid: 50, type: 'single', answer: [0], explanation: '解析A', point: 10,
    })
    // 答题者本人（未加入房间，私发只发给该 peer）
    const answerer = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(answerer, {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 0, correct: false,
    })
    await flushAsync()
    const result = sendsOf(answerer).find((m: any) => m.type === 'raceAnswerResult')
    expect(result).toBeTruthy()
    expect(result.raceCid).toBe(100)
    expect(result.questionCid).toBe(50)
    expect(result.correct).toBe(true)
    expect(result.rate).toBe(1)
    expect(result.answer).toEqual([0])
    expect(result.explanation).toBe('解析A')
  })

  it('raceScores 携带 correctCount（答对数）', async () => {
    ;(db.query.questions.findFirst as any).mockResolvedValueOnce({
      courseId: 1, cid: 50, type: 'single', answer: [0], point: 1,
    })
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true,
    })
    await flushAsync()
    const scores = sendsOf(peer1).filter((m: any) => m.type === 'raceScores').pop()
    expect(scores).toBeDefined()
    expect(scores.scores[0]).toEqual(expect.objectContaining({ userId: 1, score: 1, correctCount: 1 }))
  })

  it('raceAnswer 同一用户不能重复答同一题', async () => {
    ;(db.query.questions.findFirst as any).mockResolvedValue({
      courseId: 1, cid: 50, type: 'single', answer: [0], point: 1,
    })
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true,
    })
    await flushAsync()
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [1], rate: 0, correct: false,
    })
    await flushAsync()
    // 第二次 answer 不应该产生 raceAnswerUpdate 推送
    const sends = sendsOf(peer1)
    const updates = sends.filter((m: any) => m.type === 'raceAnswerUpdate')
    expect(updates).toHaveLength(0)
  })

  it('raceAnswer race 不存在或无 active question 静默忽略', async () => {
    await startRace('p1')
    // 没设 activeQuestionCid
    peer1.send.mockClear()
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), {
      type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true,
    })
    await flushAsync()
    expect(peer1.send).not.toHaveBeenCalled()
  })
})

describe('ws/race: questionEnd / end', () => {
  it('raceQuestionEnd 教师推 top3 + results（按 correct/timeUsed 排序）', async () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    const peer2 = makeMockPeer({ userId: 2, userName: 'b' })
    const peer3 = makeMockPeer({ userId: 3, userName: 'c' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    handleRaceMessage(peer2, { type: 'raceJoin', pin: 'p1', userId: 2, from: 'b' })
    handleRaceMessage(peer3, { type: 'raceJoin', pin: 'p1', userId: 3, from: 'c' })
    await startRace('p1')
    await askQuestion('p1', 50, 0)
    ;(db.query.questions.findFirst as any).mockResolvedValue({
      courseId: 1, cid: 50, type: 'single', answer: [0], point: 1,
    })
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), { type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true })
    handleRaceMessage(makeMockPeer({ userId: 2, userName: 'b' }), { type: 'raceAnswer', pin: 'p1', userId: 2, from: 'b', answer: [1], rate: 0, correct: false })
    handleRaceMessage(makeMockPeer({ userId: 3, userName: 'c' }), { type: 'raceAnswer', pin: 'p1', userId: 3, from: 'c', answer: [0], rate: 1, correct: true })
    // 等待异步判分（服务端判分 fire-and-forget）落库后再结束本题
    await flushAsync()
    peer1.send.mockClear()
    handleRaceMessage(teacher(), { type: 'raceQuestionEnd', pin: 'p1' })
    await flushAsync()
    const sends = sendsOf(peer1)
    const end = sends.find((m: any) => m.type === 'raceQuestionEnd')
    expect(end).toBeDefined()
    expect(end.results).toHaveLength(3)
    expect(end.top3).toHaveLength(3)
    // top3 第一位是答对的 user1 或 user3
    expect(end.top3[0].correct).toBe(true)
  })

  it('raceQuestionEnd 非教师忽略', async () => {
    await startRace('p1')
    await askQuestion('p1', 50, 0)
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), { type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: [0], rate: 1, correct: true })
    await flushAsync()
    isCourseTeacherMock.mockResolvedValue(false)
    handleRaceMessage(makeMockPeer({ userId: 2, userName: 'b' }), { type: 'raceQuestionEnd', pin: 'p1' })
    await flushAsync()
    // 未收题：activeQuestionCid 仍在
    expect(raceStates.get('p1')!.activeQuestionCid).toBe(50)
  })

  it('raceQuestionEnd race 不存在时静默忽略', async () => {
    expect(() => handleRaceMessage(teacher(), { type: 'raceQuestionEnd', pin: 'missing' })).not.toThrow()
    await flushAsync()
  })

  it('raceEnd 教师推 leaderboard + 清理 raceStates', async () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    await startRace('p1')
    peer1.send.mockClear()
    handleRaceMessage(teacher(), { type: 'raceEnd', pin: 'p1' })
    await flushAsync()
    const sends = sendsOf(peer1)
    expect(sends).toContainEqual(expect.objectContaining({ type: 'raceEnd' }))
    expect(raceStates.has('p1')).toBe(false)
  })

  it('raceEnd 非教师被拒且不触发结算', async () => {
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    await startRace('p1')
    isCourseTeacherMock.mockResolvedValue(false)
    handleRaceMessage(makeMockPeer({ userId: 2, userName: 'b' }), { type: 'raceEnd', pin: 'p1' })
    await flushAsync()
    expect(sendsOf(peer1).filter((m: any) => m.type === 'raceEnd')).toHaveLength(0)
    expect(raceStates.has('p1')).toBe(true)
    expect((addCourseScore as any).mock.calls.length).toBe(0)
  })

  it('raceEnd 按最终成绩结算前3名排名奖励', async () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    const peer2 = makeMockPeer({ userId: 2, userName: 'b' })
    const peer3 = makeMockPeer({ userId: 3, userName: 'c' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p1', userId: 1, from: 'a' })
    handleRaceMessage(peer2, { type: 'raceJoin', pin: 'p1', userId: 2, from: 'b' })
    handleRaceMessage(peer3, { type: 'raceJoin', pin: 'p1', userId: 3, from: 'c' })
    await startRace('p1')
    await askQuestion('p1', 50, 0)
    // 填空题 5 空：3 人 rate 分别为 1 / 0.2 / 0（服务端判分）
    ;(db.query.questions.findFirst as any).mockResolvedValue({
      courseId: 1, cid: 50, type: 'fill', answer: ['a', 'b', 'c', 'd', 'e'], options: [], point: 10,
    })
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), { type: 'raceAnswer', pin: 'p1', userId: 1, from: 'a', answer: ['a', 'b', 'c', 'd', 'e'], rate: 1, correct: true })
    handleRaceMessage(makeMockPeer({ userId: 2, userName: 'b' }), { type: 'raceAnswer', pin: 'p1', userId: 2, from: 'b', answer: ['a'], rate: 0.5, correct: true })
    handleRaceMessage(makeMockPeer({ userId: 3, userName: 'c' }), { type: 'raceAnswer', pin: 'p1', userId: 3, from: 'c', answer: [], rate: 0.2, correct: false })
    await flushAsync()
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    ;(addCourseScore as any).mockClear()
    handleRaceMessage(teacher(), { type: 'raceEnd', pin: 'p1' })
    // 等待结算微任务
    await flushAsync()
    // 前3名各发对应 rank 奖励（只加 exp/coin，score 增量为 0）
    const calls = (addCourseScore as any).mock.calls
    expect(calls.length).toBe(3)
    const byUser = new Map(calls.map((c: any[]) => [c[0], c]))
    expect(byUser.get(1)![4]).toBe(100) // rank1
    expect(byUser.get(2)![4]).toBe(80)  // rank2
    expect(byUser.get(3)![4]).toBe(60)  // rank3
    // 结算不改变 questionScore 分项与总分（score 增量为 0）
    for (const c of calls) expect(c[2]).toBe(0)
    // raceStates 已清理，重复 raceEnd 不会重发奖励
    ;(addCourseScore as any).mockClear()
    handleRaceMessage(teacher(), { type: 'raceEnd', pin: 'p1' })
    await flushAsync()
    expect((addCourseScore as any).mock.calls.length).toBe(0)
  })

  it('raceEnd 排名奖去重：重启会话重复结算不重复发放', async () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    handleRaceMessage(peer1, { type: 'raceJoin', pin: 'p2', userId: 1, from: 'a' })
    // 第一场：courseId 1 / raceCid 200
    handleRaceMessage(teacher(), { type: 'raceStart', pin: 'p2', raceCid: 200, courseId: 1, timeLimit: 30 })
    await flushAsync()
    await askQuestion('p2', 50, 0)
    ;(db.query.questions.findFirst as any).mockResolvedValue({
      courseId: 1, cid: 50, type: 'single', answer: [0], point: 1,
    })
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), { type: 'raceAnswer', pin: 'p2', userId: 1, from: 'a', answer: [0], rate: 1, correct: true })
    await flushAsync()
    const { addCourseScore } = await import('../../server/utils/userScore/course')
    handleRaceMessage(teacher(), { type: 'raceEnd', pin: 'p2' })
    await flushAsync()
    expect((addCourseScore as any).mock.calls.length).toBe(1)
    expect((addCourseScore as any).mock.calls[0][4]).toBe(100)

    // 教师重启同一竞赛（同 courseId/raceCid）再次结算：排名奖不重复发放
    handleRaceMessage(teacher(), { type: 'raceStart', pin: 'p3', raceCid: 200, courseId: 1, timeLimit: 30 })
    await flushAsync()
    await askQuestion('p3', 50, 0)
    handleRaceMessage(makeMockPeer({ userId: 1, userName: 'a' }), { type: 'raceAnswer', pin: 'p3', userId: 1, from: 'a', answer: [0], rate: 1, correct: true })
    await flushAsync()
    ;(addCourseScore as any).mockClear()
    handleRaceMessage(teacher(), { type: 'raceEnd', pin: 'p3' })
    await flushAsync()
    expect((addCourseScore as any).mock.calls.length).toBe(0)
  })

  it('raceEnd race 不存在时静默忽略', async () => {
    expect(() => handleRaceMessage(teacher(), { type: 'raceEnd', pin: 'missing' })).not.toThrow()
    await flushAsync()
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
