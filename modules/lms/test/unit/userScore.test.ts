/**
 * LMS userScore 工具测试
 * @see modules/lms/server/utils/userScore.ts
 *
 * 测试 addChapterScore / addCourseScore
 * 使用内联 mock 工厂（不引用外部变量）避免 vi.mock 提升导致的 TDZ
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@nuxthub/db', () => ({
  db: {
    query: {
      userChapters: { findFirst: vi.fn() },
      userCourses: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
  schema: {
    userChapters: { userId: 'userId', chapterId: 'chapterId', score: 'score' },
    userCourses: { userId: 'userId', courseId: 'courseId', score: 'score', exp: 'exp', questionScore: 'questionScore' },
  },
}))

import { db } from '@nuxthub/db'
import { addChapterScore, addCourseScore } from '../../server/utils/userScore'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  // clearAllMocks 清除调用记录但不重置 mockReturnThis 实现
  vi.clearAllMocks()
})

describe('server/utils/userScore - addChapterScore', () => {
  it('chapterId=0 提前返回（无 db 调用）', async () => {
    await addChapterScore(1, 0, 10)
    expect(db.query.userChapters.findFirst).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('score=0 提前返回（无 db 调用）', async () => {
    await addChapterScore(1, 5, 0)
    expect(db.query.userChapters.findFirst).not.toHaveBeenCalled()
  })

  it('已有记录 → update 累加分数', async () => {
    vi.mocked(db.query.userChapters.findFirst).mockResolvedValue({ score: '30' } as any)
    await addChapterScore(1, 5, 10)
    expect(db.query.userChapters.findFirst).toHaveBeenCalledTimes(1)
    expect(db.update).toHaveBeenCalledTimes(1)
    expect(db.set).toHaveBeenCalledWith({ score: '40' })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('已有记录且 score 为 null → 视为 0 累加', async () => {
    vi.mocked(db.query.userChapters.findFirst).mockResolvedValue({ score: null } as any)
    await addChapterScore(1, 5, 10)
    expect(db.set).toHaveBeenCalledWith({ score: '10' })
  })

  it('无记录 → insert 新记录', async () => {
    vi.mocked(db.query.userChapters.findFirst).mockResolvedValue(undefined as any)
    await addChapterScore(1, 5, 10)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.values).toHaveBeenCalledWith({
      userId: 1,
      chapterId: 5,
      score: '10',
    })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('负分也能正确累加', async () => {
    vi.mocked(db.query.userChapters.findFirst).mockResolvedValue({ score: '50' } as any)
    await addChapterScore(1, 5, -10)
    expect(db.set).toHaveBeenCalledWith({ score: '40' })
  })
})

describe('server/utils/userScore - addCourseScore', () => {
  it('courseId=0 提前返回', async () => {
    await addCourseScore(1, 0, 10, 'questionScore', 5)
    expect(db.query.userCourses.findFirst).not.toHaveBeenCalled()
  })

  it('已有记录 → update score + scoreKey + exp', async () => {
    vi.mocked(db.query.userCourses.findFirst).mockResolvedValue({
      score: '100', questionScore: '50', exp: 20,
    } as any)
    await addCourseScore(1, 3, 10, 'questionScore', 5)
    expect(db.update).toHaveBeenCalledTimes(1)
    const setArg = vi.mocked(db.set).mock.calls[0][0]
    expect(setArg.score).toBe('110')
    expect(setArg.questionScore).toBe('60')
    expect(setArg.exp).toBe(25)
  })

  it('无记录 → insert', async () => {
    vi.mocked(db.query.userCourses.findFirst).mockResolvedValue(undefined as any)
    await addCourseScore(1, 3, 10, 'questionScore', 5)
    expect(db.insert).toHaveBeenCalledTimes(1)
    const valsArg = vi.mocked(db.values).mock.calls[0][0]
    expect(valsArg.userId).toBe(1)
    expect(valsArg.courseId).toBe(3)
    expect(valsArg.score).toBe('10')
    expect(valsArg.questionScore).toBe('10')
    expect(valsArg.exp).toBe(5)
  })

  it('scoreDelta=0 → 跳过 score 字段但仍更新 exp', async () => {
    vi.mocked(db.query.userCourses.findFirst).mockResolvedValue({
      score: '100', questionScore: '50', exp: 20,
    } as any)
    await addCourseScore(1, 3, 0, 'questionScore', 5)
    expect(db.update).toHaveBeenCalledTimes(1)
    const setArg = vi.mocked(db.set).mock.calls[0][0]
    expect(setArg.score).toBeUndefined()
    expect(setArg.questionScore).toBeUndefined()
    expect(setArg.exp).toBe(25)
  })

  it('expDelta=0 → 跳过 exp 字段但仍更新 score', async () => {
    vi.mocked(db.query.userCourses.findFirst).mockResolvedValue({
      score: '100', questionScore: '50', exp: 20,
    } as any)
    await addCourseScore(1, 3, 10, 'questionScore', 0)
    const setArg = vi.mocked(db.set).mock.calls[0][0]
    expect(setArg.score).toBe('110')
    expect(setArg.questionScore).toBe('60')
    expect(setArg.exp).toBeUndefined()
  })

  it('scoreDelta=0 且 expDelta=0 → 不调用 update', async () => {
    vi.mocked(db.query.userCourses.findFirst).mockResolvedValue({
      score: '100', questionScore: '50', exp: 20,
    } as any)
    await addCourseScore(1, 3, 0, 'questionScore', 0)
    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('无记录且 scoreDelta=0 → insert 仅含 exp', async () => {
    vi.mocked(db.query.userCourses.findFirst).mockResolvedValue(undefined as any)
    await addCourseScore(1, 3, 0, 'questionScore', 5)
    expect(db.insert).toHaveBeenCalledTimes(1)
    const valsArg = vi.mocked(db.values).mock.calls[0][0]
    expect(valsArg.score).toBeUndefined()
    expect(valsArg.questionScore).toBeUndefined()
    expect(valsArg.exp).toBe(5)
  })

  it('不同 scoreKey 写入不同字段', async () => {
    vi.mocked(db.query.userCourses.findFirst).mockResolvedValue({
      score: '100', homeworkScore: '30', exp: 20,
    } as any)
    await addCourseScore(1, 3, 10, 'homeworkScore', 5)
    const setArg = vi.mocked(db.set).mock.calls[0][0]
    expect(setArg.score).toBe('110')
    expect(setArg.homeworkScore).toBe('40')
    expect(setArg.questionScore).toBeUndefined()
  })
})
