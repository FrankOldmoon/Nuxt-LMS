import { describe, it, expect, vi, beforeEach } from 'vitest'

// ====================== Mocks ======================

const createErrorMock = vi.fn((opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage)
  ;(err as any).statusCode = opts.statusCode
  throw err
})

vi.stubGlobal('createError', createErrorMock)

vi.mock('@nuxthub/db', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue({}) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue({}) })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) })),
    query: { configs: { findFirst: vi.fn().mockResolvedValue(null) }, courses: { findFirst: vi.fn().mockResolvedValue(null) } },
  },
  schema: {
    courses: { id: 'id' },
    chapters: { id: 'id' },
    courseVersions: { courseId: 'course_id', id: 'id' },
    chapterVersions: { chapterId: 'chapter_id', id: 'id' },
    configs: { id: 'id', value: 'value' },
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ op: 'eq', a, b })),
  and: vi.fn((...args) => ({ op: 'and', args })),
  or: vi.fn(),
  not: vi.fn(),
  isNull: vi.fn(),
  inArray: vi.fn(),
  desc: vi.fn(),
  ilike: vi.fn(),
  sql: vi.fn(),
}))

const { batchTable } = await import('../../server/utils/db')
const { getLmsConfigSync, mergeCourseLmsConfig, DEFAULT_LMS_CONFIG } = await import('../../server/utils/lmsConfig')
const { getSiteConfigSync, DEFAULT_SITE_CONFIG } = await import('../../server/utils/siteConfig')

// ====================== batchTable validation ======================

describe('batchTable - validation', () => {
  beforeEach(() => {
    createErrorMock.mockClear()
  })

  it('throws 400 when ids is empty array', async () => {
    await expect(batchTable('courses', [], 'delete')).rejects.toThrow('ids 不能为空')
    expect(createErrorMock).toHaveBeenCalledWith({ statusCode: 400, statusMessage: 'ids 不能为空' })
  })

  it('throws 400 when ids is null', async () => {
    await expect(batchTable('courses', null as any, 'delete')).rejects.toThrow('ids 不能为空')
  })

  it('throws 400 when ids is not an array', async () => {
    await expect(batchTable('courses', 'not-array' as any, 'delete')).rejects.toThrow('ids 不能为空')
  })

  it('throws 400 when ids is undefined', async () => {
    await expect(batchTable('courses', undefined as any, 'delete')).rejects.toThrow('ids 不能为空')
  })

  it('throws 400 for invalid action', async () => {
    await expect(batchTable('courses', [1, 2], 'invalid' as any)).rejects.toThrow('无效的 action: invalid')
    expect(createErrorMock).toHaveBeenCalledWith({
      statusCode: 400,
      statusMessage: '无效的 action: invalid，可选值: delete, remove, restore',
    })
  })

  it('does not throw for valid ids and action (delete)', async () => {
    await expect(batchTable('courses', [1, 2], 'delete')).resolves.toBeDefined()
  })

  it('does not throw for valid ids and action (remove)', async () => {
    await expect(batchTable('courses', [1], 'remove')).resolves.toBeDefined()
  })

  it('does not throw for valid ids and action (restore)', async () => {
    await expect(batchTable('courses', [1, 2, 3], 'restore')).resolves.toBeDefined()
  })
})

// ====================== LMS config sync functions ======================

describe('getLmsConfigSync', () => {
  it('returns DEFAULT_LMS_CONFIG when cache is empty', () => {
    // Module cache is null at import time (no reloadLmsConfig called)
    const config = getLmsConfigSync()
    expect(config).toBe(DEFAULT_LMS_CONFIG)
  })

  it('has all expected config sections', () => {
    const config = getLmsConfigSync()
    expect(config).toHaveProperty('question')
    expect(config).toHaveProperty('homework')
    expect(config).toHaveProperty('comment')
    expect(config).toHaveProperty('chapter')
    expect(config).toHaveProperty('race')
    expect(config).toHaveProperty('quiz')
    expect(config).toHaveProperty('general')
    expect(config).toHaveProperty('course')
    expect(config).toHaveProperty('chapterBtns')
    expect(config).toHaveProperty('courseBtns')
    expect(config).toHaveProperty('storage')
  })

  it('has correct default values for question config', () => {
    const config = getLmsConfigSync()
    expect(config.question.submitExp).toBe(2)
    expect(config.question.correctBonusExp).toBe(5)
    expect(config.question.firstCorrectBonusExp).toBe(10)
    expect(config.question.maxSubmitCount).toBe(999)
  })

  it('has correct default values for course switches', () => {
    const config = getLmsConfigSync()
    expect(config.course.showDanmaku).toBe(true)
    expect(config.course.showAnnouncement).toBe(true)
    expect(config.course.showComments).toBe(true)
    expect(config.course.showProgress).toBe(false)
    expect(config.course.defaultChapterOpen).toBe(true)
  })
})

describe('mergeCourseLmsConfig', () => {
  it('returns global config when courseConfig has no lmsConfig', () => {
    const result = mergeCourseLmsConfig({ icon: 'star', color: 'primary' })
    expect(result).toEqual(getLmsConfigSync())
  })

  it('returns global config when courseConfig is null', () => {
    const result = mergeCourseLmsConfig(null)
    expect(result).toEqual(getLmsConfigSync())
  })

  it('returns global config when courseConfig is undefined', () => {
    const result = mergeCourseLmsConfig(undefined)
    expect(result).toEqual(getLmsConfigSync())
  })

  it('merges course lmsConfig overrides over global defaults', () => {
    const result = mergeCourseLmsConfig({
      lmsConfig: {
        question: { submitExp: 10 },
        course: { showDanmaku: false },
      },
    })
    // Overridden values
    expect(result.question.submitExp).toBe(10)
    expect(result.course.showDanmaku).toBe(false)
    // Non-overridden values keep defaults
    expect(result.question.correctBonusExp).toBe(5)
    expect(result.course.showAnnouncement).toBe(true)
    expect(result.homework.submitExp).toBe(5)
  })

  it('deep-merges nested objects', () => {
    const result = mergeCourseLmsConfig({
      lmsConfig: {
        chapter: { readExp: 5, passScore: 70 },
      },
    })
    expect(result.chapter.readExp).toBe(5)
    expect(result.chapter.passScore).toBe(70)
    expect(result.chapter.readTimeThreshold).toBe(30)
    expect(result.chapter.readThresholdExp).toBe(10)
  })
})

// ====================== Site config sync ======================

describe('getSiteConfigSync', () => {
  it('returns DEFAULT_SITE_CONFIG when cache is empty', () => {
    const config = getSiteConfigSync()
    expect(config).toBe(DEFAULT_SITE_CONFIG)
  })

  it('has all expected fields', () => {
    const config = getSiteConfigSync()
    expect(config).toHaveProperty('siteTitle')
    expect(config).toHaveProperty('siteDescription')
    expect(config).toHaveProperty('allowRegistration')
    expect(config).toHaveProperty('siteLogo')
    expect(config).toHaveProperty('pageSize')
    expect(config).toHaveProperty('mail')
  })

  it('has correct default values', () => {
    const config = getSiteConfigSync()
    expect(config.siteTitle).toBe('Nuxt Hub')
    expect(config.allowRegistration).toBe(true)
    expect(config.pageSize).toBe(20)
  })

  it('has correct mail defaults', () => {
    const config = getSiteConfigSync()
    expect(config.mail.port).toBe(465)
    expect(config.mail.secure).toBe(true)
    expect(config.mail.host).toBe('')
  })
})
