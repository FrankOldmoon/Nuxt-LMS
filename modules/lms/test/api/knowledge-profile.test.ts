/**
 * API: courses/knowledge-profile.get.ts
 * @see modules/lms/server/api/courses/knowledge-profile.get.ts
 *
 * 按内容标签聚合学生知识能力画像：
 * - 鉴权：学生查自己；教师/管理员可查他人；否则 403
 * - 掌握度：题目/作业/测验/练习/阅读/讨论 六维 + 标签掌握度
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  courses: { id: 'id', courseId: 'courseId' },
  questions: { courseId: 'courseId', cid: 'cid', tags: 'tags', point: 'point' },
  homeworks: { courseId: 'courseId', cid: 'cid', tags: 'tags', point: 'point' },
  quizzes: { courseId: 'courseId', cid: 'cid', tags: 'tags' },
  races: { courseId: 'courseId', cid: 'cid', tags: 'tags' },
  comments: { courseId: 'courseId', cid: 'cid', parentId: 'parentId', userId: 'userId', tags: 'tags' },
  chapters: { courseId: 'courseId', id: 'id', tags: 'tags' },
  userQuestions: { courseId: 'courseId', userId: 'userId', questionCid: 'questionCid', correctRate: 'correctRate', score: 'score' },
  userHomeworks: { courseId: 'courseId', userId: 'userId', homeworkCid: 'homeworkCid', score: 'score', record: 'record' },
  userQuizzes: { courseId: 'courseId', userId: 'userId', quizCid: 'quizCid', records: 'records' },
  userRaces: { courseId: 'courseId', userId: 'userId', raceCid: 'raceCid', records: 'records' },
  userChapters: { userId: 'userId', chapterId: 'chapterId', isPass: 'isPass' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

/** 按表分发查询结果（覆盖 db.select().from().where() 链） */
function installProfileDb(rowsByTable: Record<string, any[]>) {
  _mockDb.select = vi.fn().mockImplementation(() => ({
    from: (table: any) => ({
      where: () => {
        for (const [key, rows] of Object.entries(rowsByTable)) {
          if (table === (_mockSchema as any)[key]) return rows
        }
        return []
      },
    }),
  }))
}

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports({ isCourseTeacher: vi.fn().mockResolvedValue(false) })
})

describe('API: courses/knowledge-profile', () => {
  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/courses/knowledge-profile.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/courses/knowledge-profile.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1' } }))).rejects.toThrow()
  })

  it('传 userId 时非教师被拒（403）', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    const handler = (await import('../../server/api/courses/knowledge-profile.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1', userId: '99' } }))).rejects.toThrow()
  })

  it('按标签聚合六维掌握度与知识点掌握度', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    installProfileDb({
      questions: [{ cid: 1, tags: ['函数'], point: 10 }],
      homeworks: [{ cid: 1, tags: ['函数'], point: 100 }],
      quizzes: [{ cid: 1, tags: ['循环'] }],
      races: [{ cid: 1, tags: ['循环'] }],
      comments: [{ cid: 1, parentId: null, userId: 1, tags: ['函数'] }],
      chapters: [{ id: 1, tags: ['函数'] }],
      userQuestions: [{ cid: 1, score: '8', rate: '0.8' }],
      userHomeworks: [{ cid: 1, score: '90', record: '{}' }],
      userQuizzes: [{ cid: 1, records: [{ rate: 1 }, { rate: 0.5 }] }],
      userRaces: [{ cid: 1, records: [{ rate: 1 }] }],
      userChapters: [{ chapterId: 1, isPass: true }],
    })
    const handler = (await import('../../server/api/courses/knowledge-profile.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)

    const dims = Object.fromEntries(r.data.dimensions.map((d: any) => [d.key, d.value]))
    expect(dims.question).toBe(80)   // 0.8
    expect(dims.homework).toBe(90)   // 90 / 100
    expect(dims.quiz).toBe(75)       // (1 + 0.5) / 2
    expect(dims.practice).toBe(100)  // 1
    expect(dims.reading).toBe(100)   // 已通过
    expect(dims.comment).toBe(100)   // 参与 1/1 主题

    // 综合掌握度 = 六个有数据维度的均值
    expect(r.data.overall).toBe(Math.round((80 + 90 + 75 + 100 + 100 + 100) / 6))

    // 标签掌握度：函数 = (0.8 + 0.9 + 1 + 1) / 4 = 92.5 → 93；循环 = (0.75 + 1) / 2 = 87.5 → 88
    const tagMap = Object.fromEntries(r.data.tags.map((t: any) => [t.tag, t]))
    expect(tagMap['函数'].mastery).toBe(93)
    expect(tagMap['函数'].sources.sort()).toEqual(['comment', 'homework', 'question', 'reading'])
    expect(tagMap['循环'].mastery).toBe(88)
    expect(r.data.taggedCount).toBe(2)
    expect(r.data.strengths).toEqual(['函数', '循环'])
  })

  it('无标签数据时返回空画像（不报错）', async () => {
    setMockAuthState({ id: 7, username: 's', name: 's', roles: ['student'], permissions: [] })
    installProfileDb({})
    const handler = (await import('../../server/api/courses/knowledge-profile.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.tags).toEqual([])
    expect(r.data.taggedCount).toBe(0)
    expect(r.data.overall).toBe(0)
    expect(r.data.dimensions.every((d: any) => d.count === 0)).toBe(true)
  })

  it('教师可查询指定学生的画像', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    installProfileDb({
      questions: [{ cid: 1, tags: ['A'], point: 10 }],
      userQuestions: [{ cid: 1, score: '10', rate: '1' }],
    })
    const handler = (await import('../../server/api/courses/knowledge-profile.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1', userId: '99' } }))
    expect(r.success).toBe(true)
    expect(r.data.tags[0].tag).toBe('A')
    expect(r.data.tags[0].mastery).toBe(100)
  })
})
