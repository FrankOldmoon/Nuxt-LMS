/**
 * submit utility module unit test
 * @see modules/lms/server/utils/submit/
 *
 * Covers pure computation functions + generic record lookup (mocked)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Uses vi.hoisted to make mock object accessible during vi.mock hoisting
const mocks = vi.hoisted(() => ({
  db: {
    query: {
      userQuestions: { findFirst: vi.fn() },
      userHomeworks: { findFirst: vi.fn() },
      userQuizzes: { findFirst: vi.fn() },
      userRaces: { findFirst: vi.fn() },
    },
  },
  schema: {
    userQuestions: { userId: 'userId', courseId: 'courseId', questionCid: 'questionCid' },
    userHomeworks: { userId: 'userId', courseId: 'courseId', homeworkCid: 'homeworkCid' },
    userQuizzes: { userId: 'userId', courseId: 'courseId', quizCid: 'quizCid' },
    userRaces: { userId: 'userId', courseId: 'courseId', raceCid: 'raceCid' },
  },
}))

vi.mock('@nuxthub/db', () => mocks)

import { calcQuestionGainedExp, calcQuestionScoreDelta } from '../../server/utils/submit/questions/calc'
import { findUserSubmitRecord } from '../../server/utils/submit/record'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // Reset mock state
  mocks.db.query.userQuestions.findFirst.mockReset()
  mocks.db.query.userHomeworks.findFirst.mockReset()
  mocks.db.query.userQuizzes.findFirst.mockReset()
  mocks.db.query.userRaces.findFirst.mockReset()
})

describe('server/utils/submit/questions - calcQuestionGainedExp', () => {
  it('首次提交：给基础经验', () => {
    const gainedExp = calcQuestionGainedExp({
      qConfig: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10 },
      isCorrect: false,
      isFirstSubmit: true,
      newSubmitCount: 1,
    })
    expect(gainedExp).toBe(2)
  })

  it('首次答对：基础 + 答对奖励 + 首次答对奖励', () => {
    const gainedExp = calcQuestionGainedExp({
      qConfig: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10 },
      isCorrect: true,
      isFirstSubmit: true,
      newSubmitCount: 1,
    })
    expect(gainedExp).toBe(2 + 5 + 10)
  })

  it('非首次提交：gainedExp=0', () => {
    const gainedExp = calcQuestionGainedExp({
      qConfig: { submitExp: 2 },
      isCorrect: true,
      isFirstSubmit: false,
      newSubmitCount: 2,
    })
    expect(gainedExp).toBe(0)
  })

  it('超过 maxSubmitCount：gainedExp=0', () => {
    const gainedExp = calcQuestionGainedExp({
      qConfig: { submitExp: 2, maxSubmitCount: 1 },
      isCorrect: true,
      isFirstSubmit: true,
      newSubmitCount: 2,
    })
    expect(gainedExp).toBe(0)
  })

  it('配置缺字段：默认 0，不抛错', () => {
    const gainedExp = calcQuestionGainedExp({
      qConfig: {},
      isCorrect: true,
      isFirstSubmit: true,
      newSubmitCount: 1,
    })
    expect(gainedExp).toBe(0)
  })
})

describe('server/utils/submit/questions - calcQuestionScoreDelta', () => {
  it('isCorrect=true && wasFirstRight=false：返回 score', () => {
    expect(calcQuestionScoreDelta({ score: 10, isCorrect: true, wasFirstRight: false })).toBe(10)
  })

  it('isCorrect=true && wasFirstRight=true：返回 0', () => {
    expect(calcQuestionScoreDelta({ score: 10, isCorrect: true, wasFirstRight: true })).toBe(0)
  })

  it('isCorrect=false：返回 0', () => {
    expect(calcQuestionScoreDelta({ score: 10, isCorrect: false, wasFirstRight: false })).toBe(0)
  })
})

describe('server/utils/submit/record - findUserSubmitRecord', () => {
  it('未知 type 抛错', async () => {
    await expect(
      findUserSubmitRecord(1, 1, 'unknown' as any, 1),
    ).rejects.toThrow()
  })

  it('question 类型：调用 userQuestions.findFirst', async () => {
    mocks.db.query.userQuestions.findFirst.mockResolvedValue({ id: 1 })
    const result = await findUserSubmitRecord(1, 2, 'question', 3)
    expect(result).toEqual({ id: 1 })
    expect(mocks.db.query.userQuestions.findFirst).toHaveBeenCalled()
  })

  it('homework 类型：调用 userHomeworks.findFirst', async () => {
    mocks.db.query.userHomeworks.findFirst.mockResolvedValue({ id: 2 })
    const result = await findUserSubmitRecord(1, 2, 'homework', 3)
    expect(result).toEqual({ id: 2 })
    expect(mocks.db.query.userHomeworks.findFirst).toHaveBeenCalled()
  })

  it('quiz 类型：调用 userQuizzes.findFirst', async () => {
    mocks.db.query.userQuizzes.findFirst.mockResolvedValue({ id: 3 })
    const result = await findUserSubmitRecord(1, 2, 'quiz', 3)
    expect(result).toEqual({ id: 3 })
  })

  it('race 类型：调用 userRaces.findFirst', async () => {
    mocks.db.query.userRaces.findFirst.mockResolvedValue({ id: 4 })
    const result = await findUserSubmitRecord(1, 2, 'race', 3)
    expect(result).toEqual({ id: 4 })
  })

  it('找不到时返回 undefined（drizzle 默认行为）', async () => {
    mocks.db.query.userQuestions.findFirst.mockResolvedValue(undefined)
    const result = await findUserSubmitRecord(1, 2, 'question', 3)
    expect(result).toBeUndefined()
  })
})
