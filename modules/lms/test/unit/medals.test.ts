/**
 * LMS medals 工具测试
 * @see modules/lms/server/utils/medals.ts
 *
 * 测试 shouldAwardMedal（纯逻辑）/ collectUserMetrics / checkAndAwardMedals
 * Bug 5 回归：验证 isNull 导入后 checkAndAwardMedals 不抛 ReferenceError
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@nuxthub/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: vi.fn().mockReturnThis() })),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    query: {},
  },
  schema: {
    medals: { id: 'id', deletedAt: 'deletedAt', content: 'content', name: 'name' },
    userMedals: { userId: 'userId', medalId: 'medalId' },
    userCourses: { userId: 'userId', courseId: 'courseId', score: 'score', exp: 'exp', questionScore: 'questionScore', homeworkScore: 'homeworkScore', commentScore: 'commentScore', quizScore: 'quizScore' },
    userQuestions: { userId: 'userId', courseId: 'courseId' },
    userHomeworks: { userId: 'userId', courseId: 'courseId' },
    userComments: { userId: 'userId', courseId: 'courseId' },
    chapters: { id: 'id', courseId: 'courseId' },
    userChapters: { userId: 'userId', chapterId: 'chapterId', isPass: 'isPass' },
  },
}))

import { db } from '@nuxthub/db'
import { shouldAwardMedal, checkAndAwardMedals } from '../../server/utils/medals/checker'
import { collectUserMetrics } from '../../server/utils/medals/metrics'
import { DEFAULT_MEDALS } from '../../server/utils/medals/default-medals'
import type { MedalContent, UserMetrics } from '../../server/utils/medals/types'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

/** 创建 thenable 链式 mock：await chain 可直接获得 result */
function chainReturning(result: any = []) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  }
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  return chain
}

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

// ====================== shouldAwardMedal（纯逻辑） ======================

describe('server/utils/medals - shouldAwardMedal', () => {
  const baseMetrics: UserMetrics = {
    courseScore: 0, exp: 0, level: 1,
    questionScore: 0, homeworkScore: 0, commentScore: 0, quizScore: 0,
    questionCount: 0, homeworkCount: 0, commentCount: 0, chapterPassCount: 0,
  }

  it('空条件 → false', () => {
    const content: MedalContent = { icon: '', color: '', tier: 1, description: '', conditions: [], logic: 'all' }
    expect(shouldAwardMedal(content, baseMetrics)).toBe(false)
  })

  it('logic=all 全满足 → true', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [
        { metric: 'questionCount', op: '>=', value: 10 },
        { metric: 'exp', op: '>=', value: 100 },
      ],
      logic: 'all',
    }
    const metrics = { ...baseMetrics, questionCount: 15, exp: 200 }
    expect(shouldAwardMedal(content, metrics)).toBe(true)
  })

  it('logic=all 部分满足 → false', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [
        { metric: 'questionCount', op: '>=', value: 10 },
        { metric: 'exp', op: '>=', value: 100 },
      ],
      logic: 'all',
    }
    const metrics = { ...baseMetrics, questionCount: 15, exp: 50 }
    expect(shouldAwardMedal(content, metrics)).toBe(false)
  })

  it('logic=any 任一满足 → true', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [
        { metric: 'questionCount', op: '>=', value: 100 },
        { metric: 'exp', op: '>=', value: 50 },
      ],
      logic: 'any',
    }
    const metrics = { ...baseMetrics, questionCount: 5, exp: 60 }
    expect(shouldAwardMedal(content, metrics)).toBe(true)
  })

  it('logic=any 全不满足 → false', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [
        { metric: 'questionCount', op: '>=', value: 100 },
        { metric: 'exp', op: '>=', value: 500 },
      ],
      logic: 'any',
    }
    const metrics = { ...baseMetrics, questionCount: 5, exp: 60 }
    expect(shouldAwardMedal(content, metrics)).toBe(false)
  })

  it('运算符 > 正确判断', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [{ metric: 'level', op: '>', value: 5 }],
      logic: 'all',
    }
    expect(shouldAwardMedal(content, { ...baseMetrics, level: 6 })).toBe(true)
    expect(shouldAwardMedal(content, { ...baseMetrics, level: 5 })).toBe(false)
  })

  it('运算符 <= 正确判断', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [{ metric: 'level', op: '<=', value: 5 }],
      logic: 'all',
    }
    expect(shouldAwardMedal(content, { ...baseMetrics, level: 5 })).toBe(true)
    expect(shouldAwardMedal(content, { ...baseMetrics, level: 6 })).toBe(false)
  })

  it('运算符 < 正确判断', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [{ metric: 'level', op: '<', value: 5 }],
      logic: 'all',
    }
    expect(shouldAwardMedal(content, { ...baseMetrics, level: 4 })).toBe(true)
    expect(shouldAwardMedal(content, { ...baseMetrics, level: 5 })).toBe(false)
  })

  it('运算符 == 正确判断', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [{ metric: 'level', op: '==', value: 5 }],
      logic: 'all',
    }
    expect(shouldAwardMedal(content, { ...baseMetrics, level: 5 })).toBe(true)
    expect(shouldAwardMedal(content, { ...baseMetrics, level: 6 })).toBe(false)
  })

  it('metric 为 undefined → false', () => {
    const content: MedalContent = {
      icon: '', color: '', tier: 1, description: '',
      conditions: [{ metric: 'unknownMetric', op: '>=', value: 1 }],
      logic: 'all',
    }
    expect(shouldAwardMedal(content, baseMetrics)).toBe(false)
  })

  it('DEFAULT_MEDALS 包含 10 个默认奖章', () => {
    expect(DEFAULT_MEDALS).toHaveLength(10)
    expect(DEFAULT_MEDALS.every(m => m.content.conditions.length > 0)).toBe(true)
  })
})

// ====================== collectUserMetrics（db mock） ======================

describe('server/utils/medals - collectUserMetrics', () => {
  it('正常返回各项指标 + level 计算', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([{ score: '500', exp: 300, questionScore: '100', homeworkScore: '80', commentScore: '40', quizScore: '90' }])) // userCourses
      .mockReturnValueOnce(chainReturning([{ c: 15 }]))  // questionCount
      .mockReturnValueOnce(chainReturning([{ c: 5 }]))   // homeworkCount
      .mockReturnValueOnce(chainReturning([{ c: 20 }]))  // commentCount
      .mockReturnValueOnce(chainReturning([{ id: 1 }, { id: 2 }])) // chapterIds
      .mockReturnValueOnce(chainReturning([{ c: 1 }]))   // passCount

    const metrics = await collectUserMetrics(1, 1)
    expect(metrics.courseScore).toBe(500)
    expect(metrics.exp).toBe(300)
    // level = floor((1 + sqrt(1 + 8*300/100)) / 2) = floor((1 + sqrt(25)) / 2) = floor(3) = 3
    expect(metrics.level).toBe(3)
    expect(metrics.questionCount).toBe(15)
    expect(metrics.homeworkCount).toBe(5)
    expect(metrics.commentCount).toBe(20)
    expect(metrics.chapterPassCount).toBe(1)
  })

  it('无 userCourses 行 → 全零 + level=1', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([]))   // userCourses 空行
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([]))   // chapterIds 空 → 不查 passCount

    const metrics = await collectUserMetrics(1, 1)
    expect(metrics.courseScore).toBe(0)
    expect(metrics.exp).toBe(0)
    expect(metrics.level).toBe(1)
    expect(metrics.chapterPassCount).toBe(0)
  })

  it('exp=100 → level=1（50*(l-1)*l <= exp 公式）', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([{ score: '0', exp: 100 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([]))

    const metrics = await collectUserMetrics(1, 1)
    // level = floor((1 + sqrt(1 + 8*100/100)) / 2) = floor((1 + sqrt(9)) / 2) = floor(2) = 2
    expect(metrics.level).toBe(2)
  })
})

// ====================== checkAndAwardMedals（db mock） ======================

describe('server/utils/medals - checkAndAwardMedals', () => {
  it('无奖章 → 返回空数组', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([]))  // allMedals 空
    // collectUserMetrics 的调用不会发生（allMedals.length === 0 → 提前返回）

    const result = await checkAndAwardMedals(1, 1)
    expect(result).toEqual([])
  })

  it('全部已拥有 → 返回空数组', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([{ id: 1, content: DEFAULT_MEDALS[0].content }]))  // allMedals
      .mockReturnValueOnce(chainReturning([{ medalId: 1 }]))  // owned
      // collectUserMetrics 调用
      .mockReturnValueOnce(chainReturning([{ score: '0', exp: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([]))

    const result = await checkAndAwardMedals(1, 1)
    expect(result).toEqual([])
  })

  it('满足条件 → insert 新奖章并返回 ID', async () => {
    const medal = { id: 5, content: { ...DEFAULT_MEDALS[0].content } } // questionCount >= 1
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([medal]))           // allMedals
      .mockReturnValueOnce(chainReturning([]))                 // owned 空
      // collectUserMetrics
      .mockReturnValueOnce(chainReturning([{ score: '10', exp: 5 }]))
      .mockReturnValueOnce(chainReturning([{ c: 3 }]))         // questionCount=3 >= 1
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([]))

    const result = await checkAndAwardMedals(1, 1)
    expect(result).toEqual([5])
    expect(db.insert).toHaveBeenCalledTimes(1)
  })

  it('不满足条件 → 不 insert', async () => {
    const medal = { id: 5, content: { ...DEFAULT_MEDALS[1].content } } // questionCount >= 50
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([medal]))
      .mockReturnValueOnce(chainReturning([]))
      .mockReturnValueOnce(chainReturning([{ score: '0', exp: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 3 }]))  // questionCount=3 < 50
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([{ c: 0 }]))
      .mockReturnValueOnce(chainReturning([]))

    const result = await checkAndAwardMedals(1, 1)
    expect(result).toEqual([])
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('Bug 5 回归：不抛 ReferenceError（isNull 已导入）', async () => {
    // Bug 5: medals.ts 曾缺少 isNull import，导致 checkAndAwardMedals 抛 ReferenceError
    // 修复后 isNull 已导入，查询 medals 表时使用 isNull(schema.medals.deletedAt) 过滤软删除
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([]))

    // 不应抛出 ReferenceError: isNull is not defined
    await expect(checkAndAwardMedals(1, 1)).resolves.toEqual([])
  })
})
