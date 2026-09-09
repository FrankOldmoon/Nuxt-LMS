/**
 * courses/class-open-matrix.get.ts 端点测试：课程「章节×班级」开放状态矩阵
 * @see modules/lms/server/api/courses/class-open-matrix.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  chapters: { id: 'id', name: 'name', isOpen: 'isOpen', courseId: 'courseId', deletedAt: 'deletedAt' },
  classes: { id: 'id', name: 'name', deletedAt: 'deletedAt' },
  classChapters: { classId: 'classId', chapterId: 'chapterId', open: 'open' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports({ isCourseTeacher: vi.fn().mockResolvedValue(true) })
})

// 依次 mock where 查询：0) chapters  1) classes  2) class_chapters
function mockWhereSeq(results: any[][]) {
  let i = 0
  _mockDb.where = vi.fn().mockImplementation(() => Promise.resolve(results[i++]))
}

describe('API: courses/class-open-matrix.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/courses/class-open-matrix.get')).default
    await expect(handler(makeEvent({ query: { courseId: '1' } }))).rejects.toThrow()
  })

  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'A', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/courses/class-open-matrix.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('非管理员/非课程教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 'S', roles: ['student'], permissions: [] })
    ;(globalThis as any).isCourseTeacher = vi.fn().mockResolvedValue(false)
    const handler = (await import('../../server/api/courses/class-open-matrix.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(false)
  })

  it('管理员返回章节/班级与开放状态矩阵', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'A', roles: ['admin'], permissions: [] })
    mockWhereSeq([
      // 0. chapters
      [
        { id: 11, name: '第一章', isOpen: false },
        { id: 12, name: '第二章', isOpen: true },
      ],
      // 1. classes：101/102/103 三个班，103 从未被开放
      [
        { id: 101, name: '一班' },
        { id: 102, name: '二班' },
        { id: 103, name: '三班' },
      ],
      // 2. class_chapters
      [
        { classId: 101, chapterId: 11, open: true },
        { classId: 102, chapterId: 11, open: false },
        { classId: 102, chapterId: 12, open: true },
        { classId: 103, chapterId: 11, open: false },
        { classId: 103, chapterId: 12, open: false },
      ],
    ])
    const handler = (await import('../../server/api/courses/class-open-matrix.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.chapters).toHaveLength(2)
    // 只列出开放班级（101 开了 ch11、102 开了 ch12），103 无任何开放 → 排除
    expect(r.data.classes.map((c: any) => c.id)).toEqual([101, 102])
    // 章节11：一班开放 true，二班 false
    expect(r.data.openMap['11']['101']).toBe(true)
    expect(r.data.openMap['11']['102']).toBe(false)
    // 章节12：二班开放 true
    expect(r.data.openMap['12']['102']).toBe(true)
    // 未配置的单元格缺省访问为 undefined（前端按 false 处理）
    expect(r.data.openMap['12']['101']).toBeUndefined()
    // 103 完全不出现在返回中
    expect(r.data.openMap['11']['103']).toBeUndefined()
  })

  it('无开放班级时 classes 为空', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'A', roles: ['admin'], permissions: [] })
    mockWhereSeq([
      // 0. chapters
      [{ id: 11, name: '第一章', isOpen: false }],
      // 1. classes：两个班都未开放
      [
        { id: 101, name: '一班' },
        { id: 102, name: '二班' },
      ],
      // 2. class_chapters：全部 open=false
      [
        { classId: 101, chapterId: 11, open: false },
        { classId: 102, chapterId: 11, open: false },
      ],
    ])
    const handler = (await import('../../server/api/courses/class-open-matrix.get')).default
    const r = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.classes).toEqual([])
    expect(r.data.openMap).toEqual({})
  })
})