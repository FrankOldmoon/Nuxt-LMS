import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSchema = {
  courses: {},
  chapters: {},
  users: {},
  categories: {},
  classes: {},
  questions: {},
  homeworks: {},
  quizzes: {},
  announcements: {},
  tokens: {},
  roles: {},
  permissions: {},
  userRoles: {},
  userClasses: {},
  userCourses: {},
  userChapters: {},
  classChapters: {},
  files: {},
  medals: {},
  userMedals: {},
  messages: {},
  notifys: {},
  configs: {},
  chapterVersions: {},
  courseVersions: {},
}

vi.mock('@nuxthub/db', () => ({
  db: {},
  schema: mockSchema,
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  not: vi.fn(),
  isNull: vi.fn(),
  inArray: vi.fn(),
  desc: vi.fn(),
  ilike: vi.fn(),
  sql: vi.fn(),
}))

const createErrorMock = vi.fn((opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage)
  ;(err as any).statusCode = opts.statusCode
  throw err
})

vi.stubGlobal('createError', createErrorMock)

const { validateTable } = await import('../../server/utils/db')

describe('validateTable', () => {
  beforeEach(() => {
    createErrorMock.mockClear()
  })

  it('returns valid table name', () => {
    expect(validateTable('courses')).toBe('courses')
    expect(validateTable('chapters')).toBe('chapters')
    expect(validateTable('users')).toBe('users')
  })

  it('returns table name for all known schema tables', () => {
    for (const tableName of Object.keys(mockSchema)) {
      expect(validateTable(tableName)).toBe(tableName)
    }
  })

  it('throws 400 for unknown table name', () => {
    expect(() => validateTable('unknownTable')).toThrow('无效的表名: unknownTable')
    expect(createErrorMock).toHaveBeenCalledWith({
      statusCode: 400,
      statusMessage: '无效的表名: unknownTable',
    })
  })

  it('throws 400 for undefined table name', () => {
    expect(() => validateTable(undefined)).toThrow('无效的表名: undefined')
    expect(createErrorMock).toHaveBeenCalledWith({
      statusCode: 400,
      statusMessage: '无效的表名: undefined',
    })
  })

  it('throws 400 for empty string', () => {
    expect(() => validateTable('')).toThrow('无效的表名: ')
    expect(createErrorMock).toHaveBeenCalledWith({
      statusCode: 400,
      statusMessage: '无效的表名: ',
    })
  })

  it('does not throw for valid tables', () => {
    expect(() => validateTable('courses')).not.toThrow()
    expect(() => validateTable('chapters')).not.toThrow()
    expect(createErrorMock).not.toHaveBeenCalled()
  })
})
