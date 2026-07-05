import { describe, it, expect } from 'vitest'
import {
  cResp,
  normalizeCategory,
  normalizeCourseSummary,
  normalizeChapterSummary,
  normalizeCourseDetail,
  normalizeChapterDetail,
} from '../../server/utils/index'

describe('cResp', () => {
  it('returns success response with default msg', () => {
    const result = cResp({ id: 1 })
    expect(result).toEqual({ data: { id: 1 }, msg: '', success: true })
  })

  it('returns error response with custom msg', () => {
    const result = cResp(null, '课程不存在', false)
    expect(result).toEqual({ data: null, msg: '课程不存在', success: false })
  })

  it('returns success response with custom msg', () => {
    const result = cResp([1, 2, 3], '操作成功')
    expect(result).toEqual({ data: [1, 2, 3], msg: '操作成功', success: true })
  })
})

describe('normalizeCategory', () => {
  it('maps DB category to LmsSeries with full data', () => {
    const dbCat = {
      id: 1,
      name: '数学',
      code: 'math',
      order: 5,
      orders: [{ id: '1', label: '代数', order: 1 }],
    }
    const result = normalizeCategory(dbCat)
    expect(result).toEqual({
      id: 1,
      title: '数学',
      code: 'math',
      icon: 'i-lucide-folder',
      order: 5,
      orders: [{ id: '1', label: '代数', order: 1 }],
    })
  })

  it('defaults order to 0 when undefined', () => {
    const result = normalizeCategory({ id: 2, name: '英语', code: 'en' })
    expect(result.order).toBe(0)
  })

  it('defaults orders to empty array when null', () => {
    const result = normalizeCategory({ id: 3, name: '物理', code: 'phy', orders: null })
    expect(result.orders).toEqual([])
  })
})

describe('normalizeCourseSummary', () => {
  it('maps DB course with full config', () => {
    const dbCourse = {
      id: 10,
      name: '高等数学',
      code: 'MATH101',
      categoryId: 1,
      tags: ['微积分', '函数'],
      config: { icon: 'i-lucide-calculator', color: 'success', level: 'advanced', coverImg: '/img/cover.png' },
      chapters: [{ id: 1 }, { id: 2 }, { id: 3 }],
    }
    const teachers = [{ userId: 1, username: 'teacher1', name: '张老师', avatarImg: null, isTeacher: true, isEditor: false }]
    const result = normalizeCourseSummary(dbCourse, undefined, teachers)
    expect(result).toEqual({
      id: 10,
      title: '高等数学',
      code: 'MATH101',
      icon: 'i-lucide-calculator',
      color: 'success',
      level: 'advanced',
      tags: ['微积分', '函数'],
      categoryId: 1,
      chapterCount: 3,
      coverImg: '/img/cover.png',
      teachers,
    })
  })

  it('uses defaults when config is missing', () => {
    const dbCourse = { id: 1, name: '测试课程', code: 'TEST', categoryId: 1, tags: null, config: null }
    const result = normalizeCourseSummary(dbCourse)
    expect(result.icon).toBe('i-lucide-book-open')
    expect(result.color).toBe('primary')
    expect(result.level).toBe('入门')
    expect(result.tags).toEqual([])
    expect(result.coverImg).toBeNull()
    expect(result.teachers).toEqual([])
  })

  it('uses explicit chapterCount over chapters.length', () => {
    const dbCourse = { id: 1, name: 'C', code: null, categoryId: 1, chapters: [{}, {}, {}, {}] }
    const result = normalizeCourseSummary(dbCourse, 99)
    expect(result.chapterCount).toBe(99)
  })

  it('falls back to chapters.length when chapterCount not provided', () => {
    const dbCourse = { id: 1, name: 'C', code: null, categoryId: 1, chapters: [{}, {}] }
    const result = normalizeCourseSummary(dbCourse)
    expect(result.chapterCount).toBe(2)
  })

  it('defaults chapterCount to 0 when no chapters', () => {
    const result = normalizeCourseSummary({ id: 1, name: 'C', categoryId: 1 })
    expect(result.chapterCount).toBe(0)
  })
})

describe('normalizeChapterSummary', () => {
  it('maps DB chapter with isOpen', () => {
    const dbCh = { id: 5, name: '第一章', isOpen: true }
    const result = normalizeChapterSummary(dbCh)
    expect(result).toEqual({ id: 5, title: '第一章', isOpen: true })
  })

  it('defaults isOpen to false when undefined', () => {
    const result = normalizeChapterSummary({ id: 1, name: 'ch' })
    expect(result.isOpen).toBe(false)
  })

  it('includes isPass when userChapter provided', () => {
    const result = normalizeChapterSummary({ id: 1, name: 'ch', isOpen: false }, { isPass: true })
    expect(result.isPass).toBe(true)
  })

  it('omits isPass when no userChapter', () => {
    const result = normalizeChapterSummary({ id: 1, name: 'ch' })
    expect(result.isPass).toBeUndefined()
  })

  it('handles falsy isPass correctly', () => {
    const result = normalizeChapterSummary({ id: 1, name: 'ch' }, { isPass: 0 })
    expect(result.isPass).toBe(false)
  })
})

describe('normalizeCourseDetail', () => {
  it('maps DB course with chapters to LmsCourseDetail', () => {
    const dbCourse = {
      id: 1,
      name: '课程A',
      code: 'A',
      categoryId: 2,
      tags: ['标签1'],
      config: { icon: 'i-lucide-star', color: 'info', level: 'intermediate', coverImg: '/img.png' },
      content: { type: 'doc', content: {} },
      orders: [{ id: '1', label: '章节1', order: 1 }],
      chapters: [
        { id: 1, name: '第一章', isOpen: true },
        { id: 2, name: '第二章', isOpen: false },
      ],
    }
    const result = normalizeCourseDetail(dbCourse)
    expect(result.id).toBe(1)
    expect(result.title).toBe('课程A')
    expect(result.icon).toBe('i-lucide-star')
    expect(result.color).toBe('info')
    expect(result.level).toBe('intermediate')
    expect(result.coverImg).toBe('/img.png')
    expect(result.content).toEqual({ type: 'doc', content: {} })
    expect(result.config).toEqual(dbCourse.config)
    expect(result.chapters).toHaveLength(2)
    expect(result.chapters[0]).toEqual({ id: 1, title: '第一章', isOpen: true })
    expect(result.chapters[1]).toEqual({ id: 2, title: '第二章', isOpen: false })
    expect(result.orders).toEqual([{ id: '1', label: '章节1', order: 1 }])
    expect(result.teachers).toEqual([])
    expect(result.studentCount).toBe(0)
  })

  it('uses defaults for missing config fields', () => {
    const result = normalizeCourseDetail({ id: 1, name: 'C', categoryId: 1 })
    expect(result.icon).toBe('i-lucide-book-open')
    expect(result.color).toBe('primary')
    expect(result.level).toBe('入门')
    expect(result.coverImg).toBeNull()
    expect(result.content).toEqual({})
    expect(result.config).toEqual({})
    expect(result.chapters).toEqual([])
    expect(result.orders).toEqual([])
  })

  it('handles null tags', () => {
    const result = normalizeCourseDetail({ id: 1, name: 'C', categoryId: 1, tags: null })
    expect(result.tags).toEqual([])
  })
})

describe('normalizeChapterDetail', () => {
  it('maps DB chapter with all fields', () => {
    const dbCh = {
      id: 1,
      name: '第一章',
      content: { type: 'doc', content: { text: 'hello' } },
      questionIds: [1, 2, 3],
      homeworkIds: [10, 20],
      commentIds: [100],
    }
    const result = normalizeChapterDetail(dbCh)
    expect(result).toEqual({
      id: 1,
      title: '第一章',
      content: { type: 'doc', content: { text: 'hello' } },
      questionIds: [1, 2, 3],
      homeworkIds: [10, 20],
      commentIds: [100],
    })
  })

  it('defaults arrays to empty when null', () => {
    const result = normalizeChapterDetail({ id: 1, name: 'ch', content: null, questionIds: null, homeworkIds: null, commentIds: null })
    expect(result.content).toEqual({})
    expect(result.questionIds).toEqual([])
    expect(result.homeworkIds).toEqual([])
    expect(result.commentIds).toEqual([])
  })

  it('includes taskStatus and isPass when userChapter provided', () => {
    const result = normalizeChapterDetail(
      { id: 1, name: 'ch', content: {}, questionIds: [], homeworkIds: [], commentIds: [] },
      { taskStatus: { q1: true, q2: false }, isPass: true },
    )
    expect(result.taskStatus).toEqual({ q1: true, q2: false })
    expect(result.isPass).toBe(true)
  })

  it('defaults taskStatus to empty object when userChapter has none', () => {
    const result = normalizeChapterDetail(
      { id: 1, name: 'ch', content: {}, questionIds: [], homeworkIds: [], commentIds: [] },
      { isPass: false },
    )
    expect(result.taskStatus).toEqual({})
    expect(result.isPass).toBe(false)
  })
})
