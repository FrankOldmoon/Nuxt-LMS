/**
 * submitBroadcast 单元测试
 * @see modules/lms/server/utils/ws/submitBroadcast.ts
 *
 * 覆盖：
 * - per-kind 总开关（enableOn{Kind}）
 * - questionOnlyOnCorrect：答错题目不广播
 * - onlyOnReward：gainedExp=0 时不广播
 * - 文本生成（kind + isCorrect / isPassed / score）
 * - 端到端：仅当所有规则通过时才真正调用 broadcastToClass
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 用 vi.hoisted 提前声明（vi.mock 会被提升到顶部）
const mocks = vi.hoisted(() => {
  const _mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  }
  const _mockSchema = {
    users: { id: 'id', classId: 'classId', name: 'name', preferName: 'preferName', username: 'username' },
  }
  const _broadcastCalls: Array<{ classId: number; msg: string }> = []
  return { _mockDb, _mockSchema, _broadcastCalls }
})

vi.mock('@nuxthub/db', () => ({ db: mocks._mockDb, schema: mocks._mockSchema }))

// 拦截 broadcastToClass 记录调用
vi.mock('../../server/utils/ws/state', () => ({
  broadcastToClass: (classId: number, msg: string) => {
    mocks._broadcastCalls.push({ classId, msg })
  },
}))

import {
  resetAllStubs,
  setMockLmsConfig,
  getLmsConfigSync,
} from '../../../../test/setup/nuxt-stubs'
import { broadcastSubmitDanmaku } from '../../server/utils/ws/submitBroadcast'

beforeEach(() => {
  resetAllStubs()
  mocks._broadcastCalls.length = 0
  vi.clearAllMocks()
  // 默认 user 上下文：classId=5, name=alice
  mocks._mockDb.limit.mockResolvedValue([{
    classId: 5,
    name: 'alice',
    preferName: '',
    username: 'alice01',
  }])
  // 重置 lms config 为默认（含 danmaku 段）
  setMockLmsConfig({
    question: { submitExp: 2 },
    homework: { submitExp: 5 },
    comment: { publishExp: 3, replyExp: 2 },
    quiz: { passScore: 60 },
    danmaku: {
      enableOnQuestion: true,
      enableOnHomework: true,
      enableOnQuiz: true,
      enableOnComment: true,
      questionOnlyOnCorrect: true,
      onlyOnReward: true,
    },
  })
})

function lastBroadcast(): { classId: number; type: string; i18n: { key: string; params: any }; text: string; from: string } | null {
  const c = mocks._broadcastCalls[mocks._broadcastCalls.length - 1]
  if (!c) return null
  const m = JSON.parse(c.msg)
  return { classId: c.classId, ...m }
}

describe('submitBroadcast: per-kind 开关', () => {
  it('enableOnQuestion=false → 答对的题目也不广播', async () => {
    setMockLmsConfig({ ...getLmsConfigSync(), danmaku: { ...getLmsConfigSync().danmaku, enableOnQuestion: false } })
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: true, gainedExp: 7 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('enableOnHomework=false → 不广播', async () => {
    setMockLmsConfig({ ...getLmsConfigSync(), danmaku: { ...getLmsConfigSync().danmaku, enableOnHomework: false } })
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 5 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('enableOnQuiz=false → 不广播', async () => {
    setMockLmsConfig({ ...getLmsConfigSync(), danmaku: { ...getLmsConfigSync().danmaku, enableOnQuiz: false } })
    await broadcastSubmitDanmaku({ userId: 1, kind: 'quiz', score: 90, isPassed: true, gainedExp: 13 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('enableOnComment=false → 不广播', async () => {
    setMockLmsConfig({ ...getLmsConfigSync(), danmaku: { ...getLmsConfigSync().danmaku, enableOnComment: false } })
    await broadcastSubmitDanmaku({ userId: 1, kind: 'comment', gainedExp: 3 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })
})

describe('submitBroadcast: questionOnlyOnCorrect', () => {
  it('题目答错 + questionOnlyOnCorrect=true → 不广播', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: false, gainedExp: 2 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('题目答对 + questionOnlyOnCorrect=true → 广播', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: true, gainedExp: 17 })
    expect(mocks._broadcastCalls).toHaveLength(1)
    const m = lastBroadcast()!
    expect(m.i18n).toEqual({ key: 'danmaku.questionCorrect', params: { exp: 17 } })
  })

  it('questionOnlyOnCorrect=false → 答错也广播', async () => {
    setMockLmsConfig({ ...getLmsConfigSync(), danmaku: { ...getLmsConfigSync().danmaku, questionOnlyOnCorrect: false } })
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: false, gainedExp: 2 })
    expect(mocks._broadcastCalls).toHaveLength(1)
    const m = lastBroadcast()!
    expect(m.i18n).toEqual({ key: 'danmaku.questionSubmit', params: {} })
  })
})

describe('submitBroadcast: onlyOnReward', () => {
  it('question gainedExp=0 → 不广播（即使答对）', async () => {
    // 答对但超过 maxSubmitCount 后 gainedExp=0
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: true, gainedExp: 0 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('homework gainedExp=0（超重提交限额）→ 不广播', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 0 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('quiz gainedExp=0（已及格后重提）→ 不广播', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'quiz', score: 80, isPassed: true, gainedExp: 0 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('onlyOnReward=false → gainedExp=0 也广播', async () => {
    setMockLmsConfig({ ...getLmsConfigSync(), danmaku: { ...getLmsConfigSync().danmaku, onlyOnReward: false } })
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: true, gainedExp: 0 })
    expect(mocks._broadcastCalls).toHaveLength(1)
  })

  it('comment 不受 onlyOnReward 约束（即使 gainedExp=0）', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'comment', gainedExp: 0 })
    expect(mocks._broadcastCalls).toHaveLength(1)
  })
})

describe('submitBroadcast: 文本生成（i18n key + 参数）', () => {
  it('question 答对', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: true, gainedExp: 17 })
    expect(lastBroadcast()!.i18n).toEqual({ key: 'danmaku.questionCorrect', params: { exp: 17 } })
  })

  it('homework', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 5 })
    expect(lastBroadcast()!.i18n).toEqual({ key: 'danmaku.homeworkSubmit', params: { exp: 5 } })
  })

  it('quiz 及格', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'quiz', score: 85, isPassed: true, gainedExp: 13 })
    expect(lastBroadcast()!.i18n).toEqual({ key: 'danmaku.quizPassed', params: { score: 85 } })
  })

  it('quiz 未及格', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'quiz', score: 45, isPassed: false, gainedExp: 3 })
    expect(lastBroadcast()!.i18n).toEqual({ key: 'danmaku.quizFailed', params: { score: 45 } })
  })

  it('comment', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'comment', gainedExp: 3 })
    expect(lastBroadcast()!.i18n).toEqual({ key: 'danmaku.comment', params: {} })
  })
})

describe('submitBroadcast: 端到端', () => {
  it('从 from 字段读取用户显示名', async () => {
    mocks._mockDb.limit.mockResolvedValue([{ classId: 5, name: '', preferName: '老师', username: 't1' }])
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 5 })
    expect(lastBroadcast()!.from).toBe('老师')
  })

  it('用户无 classId → 静默跳过', async () => {
    mocks._mockDb.limit.mockResolvedValue([{ classId: null, name: 'alice' }])
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 5 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('用户查不到 → 静默跳过', async () => {
    mocks._mockDb.limit.mockResolvedValue([])
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 5 })
    expect(mocks._broadcastCalls).toHaveLength(0)
  })

  it('classId 5 时广播到 classId=5', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 5 })
    expect(mocks._broadcastCalls[0].classId).toBe(5)
  })

  it('classId 字符串（DB 来的 number）也能正确广播', async () => {
    mocks._mockDb.limit.mockResolvedValue([{ classId: '8', name: 'u' }])
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 5 })
    expect(mocks._broadcastCalls[0].classId).toBe(8)
  })
})
