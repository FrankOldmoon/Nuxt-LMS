/**
 * submitBroadcast unit test
 * @see modules/lms/server/utils/ws/submitBroadcast.ts
 *
 * Coverage:
 * - per-kind master switch (enableOn{Kind})
 * - questionOnlyOnCorrect: do not broadcast when question is answered incorrectly
 * - onlyOnReward: do not broadcast when gainedExp=0
 * - text generation (kind + isCorrect / isPassed / score)
 * - end-to-end: only actually calls broadcastToClass when all rules pass
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Declare in advance with vi.hoisted (vi.mock will be hoisted to the top)
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

// Intercept broadcastToClass to record calls
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
  // Default user context: classId=5, name=alice
  mocks._mockDb.limit.mockResolvedValue([{
    classId: 5,
    name: 'alice',
    preferName: '',
    username: 'alice01',
  }])
  // Reset lms config to default (including danmaku section)
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

function lastBroadcast(): { classId: number; type: string; text: string; from: string } | null {
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
    expect(m.text).toBe('🎉 答对了题目 (+17经验)')
  })

  it('questionOnlyOnCorrect=false → 答错也广播', async () => {
    setMockLmsConfig({ ...getLmsConfigSync(), danmaku: { ...getLmsConfigSync().danmaku, questionOnlyOnCorrect: false } })
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: false, gainedExp: 2 })
    expect(mocks._broadcastCalls).toHaveLength(1)
    const m = lastBroadcast()!
    expect(m.text).toBe('💪 提交了题目')
  })
})

describe('submitBroadcast: onlyOnReward', () => {
  it('question gainedExp=0 → 不广播（即使答对）', async () => {
    // Correct but exceeds maxSubmitCount, gainedExp=0
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

describe('submitBroadcast: 文本生成', () => {
  it('question 答对', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'question', isCorrect: true, gainedExp: 17 })
    expect(lastBroadcast()!.text).toBe('🎉 答对了题目 (+17经验)')
  })

  it('homework', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'homework', gainedExp: 5 })
    expect(lastBroadcast()!.text).toBe('📚 提交了作业 (+5经验)')
  })

  it('quiz 及格', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'quiz', score: 85, isPassed: true, gainedExp: 13 })
    expect(lastBroadcast()!.text).toBe('🎊 完成了测验 (85分)')
  })

  it('quiz 未及格', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'quiz', score: 45, isPassed: false, gainedExp: 3 })
    expect(lastBroadcast()!.text).toBe('📝 完成了测验 (45分)')
  })

  it('comment', async () => {
    await broadcastSubmitDanmaku({ userId: 1, kind: 'comment', gainedExp: 3 })
    expect(lastBroadcast()!.text).toBe('💬 发表了评论')
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
