/**
 * server/utils/normalize/course.ts 测试：normalizeCourseSummary 章节数按目录统计
 */
import { describe, it, expect } from 'vitest'
import { normalizeCourseSummary } from '../../server/utils/normalize/course'

describe('normalizeCourseSummary - 章节数按目录统计', () => {
  it('orders 存在时只统计目录中指向章节的项（排除首页与 custom 块）', () => {
    const course = {
      id: 1,
      name: 'C1',
      code: 'C1',
      categoryId: 1,
      config: {},
      tags: [],
      chapters: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }], // 共 5 章
      orders: [
        { id: 'course', label: '首页', order: 0 },
        { id: 1, label: '第一章', order: 1 },
        { id: 2, label: '第二章', order: 2 },
        { id: 'custom-10', label: '分隔', order: 3 },
        { id: 3, label: '第三章', order: 4 },
      ],
    }
    const r = normalizeCourseSummary(course, 5) // 调用方传全部章节数 5
    // 目录中真实章节 = id 1,2,3 → 3
    expect(r.chapterCount).toBe(3)
  })

  it('orders 为空/未配置时回退调用方传入的章节数', () => {
    const course = { id: 1, name: 'C1', code: 'C1', categoryId: 1, config: {}, tags: [], orders: [] }
    const r = normalizeCourseSummary(course, 7)
    expect(r.chapterCount).toBe(7)
  })

  it('orders 全部为非章节（首页/custom）时回退传入章节数', () => {
    const course = {
      id: 1, name: 'C1', code: 'C1', categoryId: 1, config: {}, tags: [],
      orders: [
        { id: 'course', label: '首页', order: 0 },
        { id: 'custom-1', label: '一', order: 1 },
      ],
    }
    const r = normalizeCourseSummary(course, 4)
    expect(r.chapterCount).toBe(4)
  })
})