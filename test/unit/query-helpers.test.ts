import { describe, it, expect, vi, beforeEach } from 'vitest'

// ====================== Mocks ======================

vi.mock('@nuxthub/db', () => ({
  db: { query: {} },
  schema: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  isNull: vi.fn(),
}))

// Stub mergeCourseLmsConfig so normalizeChapterPageData can call it
const mergeCourseLmsConfigMock = vi.fn(() => ({
  course: {
    showDanmaku: true,
    showAnnouncement: true,
    showComments: true,
    showProgress: false,
    defaultChapterOpen: true,
  },
  chapterBtns: {
    showPlay: true,
    showScore: true,
    showSelect: true,
    showTimer: true,
    showInvite: true,
    showDanmaku: true,
    showVote: true,
    showQuickAnswer: true,
  },
  courseBtns: {
    showProgress: true,
    showLeaderboard: true,
    showGroups: true,
    showGrades: true,
    showAnnouncements: true,
  },
}))

vi.stubGlobal('mergeCourseLmsConfig', mergeCourseLmsConfigMock)

const { getQueryId, requireQueryId, normalizeChapterPageData } = await import('../../server/utils/index')

// ====================== getQueryId / requireQueryId ======================

describe('getQueryId', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    // Re-stub mergeCourseLmsConfig since unstubAllGlobals clears it
    vi.stubGlobal('mergeCourseLmsConfig', mergeCourseLmsConfigMock)
  })

  it('returns numeric id from query', () => {
    vi.stubGlobal('getQuery', () => ({ id: '42' }))
    expect(getQueryId({})).toBe(42)
  })

  it('returns NaN for missing id', () => {
    vi.stubGlobal('getQuery', () => ({}))
    expect(getQueryId({})).toBeNaN()
  })

  it('returns NaN for non-numeric id', () => {
    vi.stubGlobal('getQuery', () => ({ id: 'abc' }))
    expect(getQueryId({})).toBeNaN()
  })

  it('returns NaN for undefined id', () => {
    vi.stubGlobal('getQuery', () => ({ id: undefined }))
    expect(getQueryId({})).toBeNaN()
  })
})

describe('requireQueryId', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('mergeCourseLmsConfig', mergeCourseLmsConfigMock)
  })

  it('returns numeric id for valid id', () => {
    vi.stubGlobal('getQuery', () => ({ id: '42' }))
    expect(requireQueryId({})).toBe(42)
  })

  it('returns null for missing id', () => {
    vi.stubGlobal('getQuery', () => ({}))
    expect(requireQueryId({})).toBeNull()
  })

  it('returns null for non-numeric id', () => {
    vi.stubGlobal('getQuery', () => ({ id: 'abc' }))
    expect(requireQueryId({})).toBeNull()
  })

  it('returns null for id=0', () => {
    vi.stubGlobal('getQuery', () => ({ id: '0' }))
    expect(requireQueryId({})).toBeNull()
  })
})

// ====================== normalizeChapterPageData ======================

describe('normalizeChapterPageData', () => {
  beforeEach(() => {
    vi.stubGlobal('mergeCourseLmsConfig', mergeCourseLmsConfigMock)
    mergeCourseLmsConfigMock.mockClear()
  })

  it('maps chapter + course + userChapter to page data', () => {
    const dbChapter = {
      id: 1,
      name: '第一章',
      content: { type: 'doc', content: {} },
      questionIds: [1, 2],
      homeworkIds: [10],
      commentIds: [100],
      courseId: 5,
    }
    const dbCourse = {
      id: 5,
      name: '课程A',
      config: { icon: 'i-lucide-star', color: 'info' },
      chapters: [
        { id: 1, name: '第一章', isOpen: true },
        { id: 2, name: '第二章', isOpen: false },
      ],
    }
    const userChapter = { taskStatus: { q1: true }, isPass: true }

    const result = normalizeChapterPageData(dbChapter, dbCourse, userChapter)

    expect(result.chapter.id).toBe(1)
    expect(result.chapter.title).toBe('第一章')
    expect(result.chapter.content).toEqual({ type: 'doc', content: {} })
    expect(result.chapter.questionIds).toEqual([1, 2])
    expect(result.chapter.homeworkIds).toEqual([10])
    expect(result.chapter.commentIds).toEqual([100])
    expect(result.chapter.taskStatus).toEqual({ q1: true })
    expect(result.chapter.isPass).toBe(true)

    expect(result.course.id).toBe(5)
    expect(result.course.title).toBe('课程A')
    expect(result.course.icon).toBe('i-lucide-star')
    expect(result.course.color).toBe('info')
    expect(result.course.showDanmaku).toBe(true)
    expect(result.course.chapters).toHaveLength(2)
    expect(result.course.chapters[0]).toEqual({ id: 1, title: '第一章', isOpen: true })
    expect(result.course.chapters[1]).toEqual({ id: 2, title: '第二章', isOpen: false })

    expect(mergeCourseLmsConfigMock).toHaveBeenCalledWith({ icon: 'i-lucide-star', color: 'info' })
  })

  it('uses default icon/color when config missing', () => {
    const result = normalizeChapterPageData(
      { id: 1, name: 'ch', content: {}, questionIds: [], homeworkIds: [], commentIds: [] },
      { id: 5, name: 'Course', config: null, chapters: [] },
    )
    expect(result.course.icon).toBe('i-lucide-book-open')
    expect(result.course.color).toBe('primary')
  })

  it('works without userChapter', () => {
    const result = normalizeChapterPageData(
      { id: 1, name: 'ch', content: {}, questionIds: [], homeworkIds: [], commentIds: [] },
      { id: 5, name: 'Course', config: {}, chapters: [] },
    )
    expect(result.chapter.taskStatus).toBeUndefined()
    expect(result.chapter.isPass).toBeUndefined()
  })
})
