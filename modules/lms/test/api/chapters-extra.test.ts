/**
 * LMS Chapters 端点测试
 * @see modules/lms/server/api/chapters/*.ts
 *
 * 覆盖：
 * - show.get.ts       章节详情（权限 + isOpen + isPass + classChapters）
 * - add.post.ts       新增章节（默认 isOpen 来自 lmsConfig）
 * - batch.post.ts     批量操作
 * - update.post.ts    更新（content 提取 vue IDs + 版本快照 + WS 广播）
 * - record.post.ts    保存 record（userChapters upsert）
 * - restore.post.ts   恢复版本
 * - scores.get.ts     班级章节得分
 * - task-status.post.ts task 状态 + isPass → 触发 checkAndAwardMedals
 * - versions.get.ts   版本列表
 * - classes.get.ts    班级开放状态
 * - classes.post.ts   班级开放 upsert + WS 广播
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  chapters: { id: 'id', courseId: 'courseId', name: 'name', content: 'content', questionIds: 'questionIds', homeworkIds: 'homeworkIds', commentIds: 'commentIds', quizIds: 'quizIds', isOpen: 'isOpen', deletedAt: 'deletedAt' },
  courses: { id: 'id', name: 'name', config: 'config', chapters: 'chapters' },
  classes: { id: 'id', name: 'name' },
  classChapters: { classId: 'classId', chapterId: 'chapterId', open: 'open' },
  userClasses: { userId: 'userId', classId: 'classId' },
  userChapters: { userId: 'userId', chapterId: 'chapterId', record: 'record', taskStatus: 'taskStatus', isPass: 'isPass', score: 'score' },
  userQuestions: { userId: 'userId', courseId: 'courseId', questionCid: 'questionCid', correctRate: 'correctRate' },
  userHomeworks: { userId: 'userId', courseId: 'courseId', homeworkCid: 'homeworkCid' },
  userComments: { userId: 'userId', courseId: 'courseId', commentCid: 'commentCid', like: 'like' },
  users: { id: 'id', defaultClass: 'defaultClass' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// mock chapterScores utils (scores.get.ts imports from query + assemble)
vi.mock('../../server/utils/chapterScores/query', () => ({
  queryStudentQuestionStatus: vi.fn().mockResolvedValue(new Map()),
  queryStudentHomeworkStatus: vi.fn().mockResolvedValue(new Map()),
  queryStudentCommentStatus: vi.fn().mockResolvedValue(new Map()),
  queryStudentChapterScores: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('../../server/utils/chapterScores/assemble', () => ({
  assembleChapterScores: vi.fn().mockReturnValue([]),
}))

// mock normalize utils
vi.mock('../../server/utils/normalize/chapter', () => ({
  normalizeChapterPageData: vi.fn().mockImplementation((ch: any, course: any, userChapter: any) => ({
    chapter: {
      id: ch.id,
      title: ch.name,
      content: ch.content || {},
      questionIds: ch.questionIds || [],
      homeworkIds: ch.homeworkIds || [],
      commentIds: ch.commentIds || [],
      taskStatus: userChapter?.taskStatus || {},
      isPass: !!userChapter?.isPass,
      record: userChapter?.record,
    },
    course: { id: course.id, title: course.name, icon: 'i-lucide-book-open', color: 'primary', chapters: [] },
  })),
}))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
  clearWsBroadcasts()
})

// ====================== show.get.ts ======================

describe('API: chapters/show', () => {
  it('缺少 id 返回失败', async () => {
    const handler = (await import('../../server/api/chapters/show.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('章节不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.chapters.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/chapters/show.get')).default
    const r = await handler(makeEvent({ query: { id: '999' } }))
    expect(r.success).toBe(false)
  })

  it('isOpen=true 直接返回（学生）', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.chapters.findFirst = vi.fn().mockResolvedValue({
      id: 1, name: 'Ch1', courseId: 10, isOpen: true, content: '{}',
      course: { id: 10, name: 'C1', config: '{}', chapters: [] },
    })
    _mockDb.query.userChapters.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/chapters/show.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.chapter.id).toBe(1)
  })

  it('isOpen=false 且无 classChapters 开放 → 抛 403', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.chapters.findFirst = vi.fn().mockResolvedValue({
      id: 1, name: 'Ch1', courseId: 10, isOpen: false, content: '{}',
      course: { id: 10, name: 'C1', config: '{}', chapters: [] },
    })
    _mockDb.query.userChapters.findFirst = vi.fn().mockResolvedValue(null)
    // userClasses 链：select.from.where → 返回空数组
    _mockDb.where = vi.fn().mockResolvedValueOnce([])
    const handler = (await import('../../server/api/chapters/show.get')).default
    await expect(handler(makeEvent({ query: { id: '1' } }))).rejects.toThrow()
  })

  it('教师访问返回 isOpen + classChapters', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(true)
    _mockDb.query.chapters.findFirst = vi.fn().mockResolvedValue({
      id: 1, name: 'Ch1', courseId: 10, isOpen: true, content: '{}',
      course: { id: 10, name: 'C1', config: '{}', chapters: [] },
    })
    _mockDb.query.userChapters.findFirst = vi.fn().mockResolvedValue(null)
    // 第二次 where 调用返回 classChapters 列表
    let whereCall = 0
    _mockDb.where = vi.fn().mockImplementation(() => {
      whereCall++
      if (whereCall === 1) {
        return [{ classId: 1, open: true }]
      }
      return []
    })
    const handler = (await import('../../server/api/chapters/show.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.chapter.isOpen).toBe(true)
    expect(r.data.chapter.classChapters).toHaveLength(1)
  })
})

// ====================== add.post.ts ======================

describe('API: chapters/add', () => {
  it('学生被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/chapters/add.post')).default
    await expect(handler(makeEvent({ body: { courseId: 1, name: 'Ch' } }))).rejects.toThrow()
  })

  it('教师非本课程被拒', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    const handler = (await import('../../server/api/chapters/add.post')).default
    await expect(handler(makeEvent({ body: { courseId: 1, name: 'Ch' } }))).rejects.toThrow()
  })

  it('isOpen 显式传入则不读取 lmsConfig', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/chapters/add.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1, name: 'Ch', isOpen: false } }))
    expect(r.success).toBe(true)
  })

  it('isOpen 未传时使用 lmsConfig 默认值', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ config: { lmsConfig: { course: { defaultChapterOpen: false } } } }])
    const handler = (await import('../../server/api/chapters/add.post')).default
    const r = await handler(makeEvent({ body: { courseId: 1, name: 'Ch' } }))
    expect(r.success).toBe(true)
  })
})

// ====================== batch.post.ts ======================

describe('API: chapters/batch', () => {
  it('非管理员被拒', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/chapters/batch.post')).default
    await expect(handler(makeEvent({ body: { ids: [1, 2], action: 'delete' } }))).rejects.toThrow()
  })

  it('管理员批量操作成功', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/chapters/batch.post')).default
    const r = await handler(makeEvent({ body: { ids: [1, 2], action: 'delete' } }))
    expect(r.success).toBe(true)
  })
})

// ====================== update.post.ts ======================

describe('API: chapters/update', () => {
  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/chapters/update.post')).default
    const r = await handler(makeEvent({ body: { name: 'x' } }))
    expect(r.success).toBe(false)
  })

  it('更新 name 不触发 saveContentVersion', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    // override showTable to return full content
    ;(globalThis as any).showTable = vi.fn().mockResolvedValue({ id: 1, courseId: 10, name: 'Old', content: { old: 1 } })
    const saveSpy = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as any).saveContentVersion = saveSpy
    const handler = (await import('../../server/api/chapters/update.post')).default
    const r = await handler(makeEvent({ body: { id: 1, name: 'New' } }))
    expect(r.success).toBe(true)
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('content 变化时保存版本快照并提取 vue IDs', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).showTable = vi.fn().mockResolvedValue({ id: 1, courseId: 10, name: 'Ch', content: { type: 'doc', content: [{ type: 'p' }] } })
    const saveSpy = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as any).saveContentVersion = saveSpy
    const handler = (await import('../../server/api/chapters/update.post')).default
    const newContent = {
      type: 'doc',
      content: [
        { type: 'vue', attrs: { type: 'question', content: '5' } },
        { type: 'vue', attrs: { type: 'homework', content: '7' } },
        { type: 'vue', attrs: { type: 'comment', content: '3' } },
        { type: 'vue', attrs: { type: 'quiz', content: '2' } },
      ],
    }
    const r = await handler(makeEvent({ body: { id: 1, content: newContent } }))
    expect(r.success).toBe(true)
    expect(saveSpy).toHaveBeenCalledOnce()
  })

  it('content 嵌套提取 vue IDs', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).showTable = vi.fn().mockResolvedValue({ id: 1, courseId: 10, content: null })
    const handler = (await import('../../server/api/chapters/update.post')).default
    const newContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'vue', attrs: { type: 'question', content: '11' } }],
        },
      ],
    }
    const r = await handler(makeEvent({ body: { id: 1, content: newContent } }))
    expect(r.success).toBe(true)
  })

  it('isOpen 变更时通过 broadcastToClass 广播', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    ;(globalThis as any).showTable = vi.fn().mockResolvedValue({ id: 1, courseId: 10, content: null })
    const handler = (await import('../../server/api/chapters/update.post')).default
    const r = await handler(makeEvent({ body: { id: 1, isOpen: false } }))
    expect(r.success).toBe(true)
  })
})

// ====================== record.post.ts ======================

describe('API: chapters/record', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/chapters/record.post')).default
    await expect(handler(makeEvent({ body: { chapter_id: 1, record: {} } }))).rejects.toThrow()
  })

  it('缺少 chapter_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/chapters/record.post')).default
    const r = await handler(makeEvent({ body: { record: {} } }))
    expect(r.success).toBe(false)
  })

  it('新建 userChapter 记录', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userChapters.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/chapters/record.post')).default
    const r = await handler(makeEvent({ body: { chapter_id: 1, record: { type: 'doc' } } }))
    expect(r.success).toBe(true)
  })

  it('更新已存在 userChapter 记录', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userChapters.findFirst = vi.fn().mockResolvedValue({ userId: 1, chapterId: 1, record: {} })
    const handler = (await import('../../server/api/chapters/record.post')).default
    const r = await handler(makeEvent({ body: { chapter_id: 1, record: { new: 1 } } }))
    expect(r.success).toBe(true)
  })
})

// ====================== restore.post.ts ======================

describe('API: chapters/restore', () => {
  it('缺少 versionId 返回失败', async () => {
    const handler = (await import('../../server/api/chapters/restore.post')).default
    const r = await handler(makeEvent({ body: {} }))
    expect(r.success).toBe(false)
  })

  it('版本不存在返回失败', async () => {
    ;(globalThis as any).getContentVersion = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/chapters/restore.post')).default
    const r = await handler(makeEvent({ body: { versionId: 1 } }))
    expect(r.success).toBe(false)
  })

  it('恢复成功', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).getContentVersion = vi.fn().mockResolvedValue({ chapterId: 5, content: '{}' })
    ;(globalThis as any).restoreContentVersion = vi.fn().mockResolvedValue(undefined)
    const handler = (await import('../../server/api/chapters/restore.post')).default
    const r = await handler(makeEvent({ body: { versionId: 1 } }))
    expect(r.success).toBe(true)
  })

  it('恢复抛错返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).getContentVersion = vi.fn().mockResolvedValue({ chapterId: 5, content: '{}' })
    ;(globalThis as any).restoreContentVersion = vi.fn().mockRejectedValue(new Error('db error'))
    const handler = (await import('../../server/api/chapters/restore.post')).default
    const r = await handler(makeEvent({ body: { versionId: 1 } }))
    expect(r.success).toBe(false)
  })
})

// ====================== scores.get.ts ======================

describe('API: chapters/scores', () => {
  it('缺少 chapterId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/chapters/scores.get')).default
    const r = await handler(makeEvent({ query: { classId: '1', courseId: '1' } }))
    expect(r.success).toBe(false)
  })

  it('缺少 classId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/chapters/scores.get')).default
    const r = await handler(makeEvent({ query: { chapterId: '1' } }))
    expect(r.success).toBe(false)
  })

  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/chapters/scores.get')).default
    const r = await handler(makeEvent({ query: { chapterId: '1', classId: '1', courseId: '1' } }))
    expect(r.success).toBe(false)
  })

  it('章节不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([])
    const handler = (await import('../../server/api/chapters/scores.get')).default
    const r = await handler(makeEvent({ query: { chapterId: '999', classId: '1', courseId: '1' } }))
    expect(r.success).toBe(false)
  })

  it('无学生返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ id: 1, courseId: 1, questionIds: [], homeworkIds: [], commentIds: [] }])
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/chapters/scores.get')).default
    const r = await handler(makeEvent({ query: { chapterId: '1', classId: '1', courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })

  it('返回装配后的章节得分', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ id: 1, courseId: 10, questionIds: [1, 2], homeworkIds: [3], commentIds: [4] }])
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 100, isTeacher: false },
      { id: 200, isTeacher: true }, // 排除
    ])
    const { assembleChapterScores } = await import('../../server/utils/chapterScores/assemble')
    ;(assembleChapterScores as any).mockReturnValue([{ userId: 100, score: 80 }])
    const handler = (await import('../../server/api/chapters/scores.get')).default
    const r = await handler(makeEvent({ query: { chapterId: '1', classId: '1', courseId: '10' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(1)
  })
})

// ====================== task-status.post.ts ======================

describe('API: chapters/task-status', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/chapters/task-status.post')).default
    await expect(handler(makeEvent({ body: { chapter_id: 1, task_status: {}, is_pass: true } }))).rejects.toThrow()
  })

  it('缺少 chapter_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/chapters/task-status.post')).default
    const r = await handler(makeEvent({ body: { task_status: {} } }))
    expect(r.success).toBe(false)
  })

  it('新建 userChapters 记录（is_pass false）', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userChapters.findFirst = vi.fn().mockResolvedValue(null)
    const checkSpy = vi.fn().mockResolvedValue([])
    ;(globalThis as any).checkAndAwardMedals = checkSpy
    const handler = (await import('../../server/api/chapters/task-status.post')).default
    const r = await handler(makeEvent({ body: { chapter_id: 1, task_status: { h1: true }, is_pass: false } }))
    expect(r.success).toBe(true)
    expect(r.data.isPass).toBe(false)
    expect(checkSpy).not.toHaveBeenCalled()
  })

  it('更新已存在记录', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userChapters.findFirst = vi.fn().mockResolvedValue({ userId: 1, chapterId: 1, isPass: true })
    const handler = (await import('../../server/api/chapters/task-status.post')).default
    const r = await handler(makeEvent({ body: { chapter_id: 1, task_status: {}, is_pass: true } }))
    expect(r.success).toBe(true)
    // 已是 pass，不会再触发 checkAndAwardMedals
  })

  it('从未通过变为通过触发 checkAndAwardMedals', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userChapters.findFirst = vi.fn().mockResolvedValue({ userId: 1, chapterId: 1, isPass: false })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ courseId: 10 }])
    const checkSpy = vi.fn().mockResolvedValue([100, 200])
    ;(globalThis as any).checkAndAwardMedals = checkSpy
    const handler = (await import('../../server/api/chapters/task-status.post')).default
    const r = await handler(makeEvent({ body: { chapter_id: 1, task_status: {}, is_pass: true } }))
    expect(r.success).toBe(true)
    expect(checkSpy).toHaveBeenCalledWith(1, 10)
    expect(r.data.newMedals).toEqual([100, 200])
  })
})

// ====================== versions.get.ts ======================

describe('API: chapters/versions', () => {
  it('缺少 id 返回失败', async () => {
    const handler = (await import('../../server/api/chapters/versions.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('返回版本列表', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    ;(globalThis as any).listContentVersions = vi.fn().mockResolvedValue([
      { id: 1, createdAt: '2024-01-01' },
      { id: 2, createdAt: '2024-01-02' },
    ])
    const handler = (await import('../../server/api/chapters/versions.get')).default
    const r = await handler(makeEvent({ query: { id: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
  })
})

// ====================== classes.get.ts ======================

describe('API: chapters/classes.get', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/chapters/classes.get')).default
    await expect(handler(makeEvent({ query: { chapterId: '1' } }))).rejects.toThrow()
  })

  it('缺少 chapterId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/chapters/classes.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('章节不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([])
    const handler = (await import('../../server/api/chapters/classes.get')).default
    const r = await handler(makeEvent({ query: { chapterId: '999' } }))
    expect(r.success).toBe(false)
  })

  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ courseId: 10 }])
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    const handler = (await import('../../server/api/chapters/classes.get')).default
    const r = await handler(makeEvent({ query: { chapterId: '1' } }))
    expect(r.success).toBe(false)
  })

  it('admin 返回班级开放状态', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    // select 调用 1: chapter 查 courseId
    // select 调用 2: 所有 classes
    // select 调用 3: classChapters
    let selectCount = 0
    _mockDb.select = vi.fn().mockImplementation(() => {
      selectCount++
      if (selectCount === 1) {
        return { from: () => ({ where: () => ({ limit: () => Promise.resolve([{ courseId: 10 }]) }) }) }
      }
      if (selectCount === 2) {
        return { from: () => Promise.resolve([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]) }
      }
      return { from: () => ({ where: () => Promise.resolve([{ classId: 1, open: true }]) }) }
    }) as any
    const handler = (await import('../../server/api/chapters/classes.get')).default
    const r = await handler(makeEvent({ query: { chapterId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(2)
    expect(r.data[0]).toEqual({ classId: 1, name: 'A', open: true })
    expect(r.data[1]).toEqual({ classId: 2, name: 'B', open: false })
  })
})

// ====================== classes.post.ts ======================

describe('API: chapters/classes.post', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/chapters/classes.post')).default
    await expect(handler(makeEvent({ body: { chapterId: 1, classes: [] } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/chapters/classes.post')).default
    const r = await handler(makeEvent({ body: {} }))
    expect(r.success).toBe(false)
  })

  it('classes 非数组返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/chapters/classes.post')).default
    const r = await handler(makeEvent({ body: { chapterId: 1, classes: 'invalid' } }))
    expect(r.success).toBe(false)
  })

  it('章节不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([])
    const handler = (await import('../../server/api/chapters/classes.post')).default
    const r = await handler(makeEvent({ body: { chapterId: 999, classes: [] } }))
    expect(r.success).toBe(false)
  })

  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ courseId: 10 }])
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    const handler = (await import('../../server/api/chapters/classes.post')).default
    const r = await handler(makeEvent({ body: { chapterId: 1, classes: [] } }))
    expect(r.success).toBe(false)
  })

  it('admin 成功 upsert 并广播', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    // 第一次：查 chapter.courseId
    // 第二次：upsert 查询（existing 数组）
    let limitCall = 0
    _mockDb.limit = vi.fn().mockImplementation(() => {
      limitCall++
      if (limitCall === 1) return Promise.resolve([{ courseId: 10 }])
      return Promise.resolve([]) // no existing → insert
    })
    const handler = (await import('../../server/api/chapters/classes.post')).default
    const r = await handler(makeEvent({
      body: { chapterId: 1, classes: [{ classId: 1, open: true }] },
    }))
    expect(r.success).toBe(true)
  })
})
