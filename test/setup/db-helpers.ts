/**
 * Shared test helpers: DB mock factory + LMS auto-import injection
 *
 * Usage:
 * ```ts
 * import { createMockDb, installLmsAutoImports, resetDb } from '../../../../test/setup/db-helpers'
 *
 * const _mockDb = createMockDb()
 * const _mockSchema = { users: { id: 'id' }, chapters: { courseId: 'courseId' } }
 * vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))
 *
 * beforeEach(() => {
 *   resetDb(_mockDb)
 *   installLmsAutoImports()
 * })
 * ```
 */
import { vi } from 'vitest'

/**
 * Create a drizzle-orm style mock DB:
 * - chainable methods(select / from / where / ...)all return this
 * - returning / findFirst / findMany return value can be individually mocked per test case
 * - terminal method(getMockDbResult)must be explicitly set in the case
 */
export function createMockDb(extraQuery: Record<string, any> = {}) {
  const baseChain = () => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      selectDistinct: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      having: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      then: undefined, // avoid being mistaken for a thenable
    }
    return chain
  }
  const db: any = {
    ...baseChain(),
    query: {
      users: { findFirst: vi.fn(), findMany: vi.fn() },
      roles: { findFirst: vi.fn(), findMany: vi.fn() },
      permissions: { findFirst: vi.fn(), findMany: vi.fn() },
      userRoles: { findFirst: vi.fn(), findMany: vi.fn() },
      tokens: { findFirst: vi.fn(), findMany: vi.fn() },
      files: { findFirst: vi.fn(), findMany: vi.fn() },
      courses: { findFirst: vi.fn(), findMany: vi.fn() },
      chapters: { findFirst: vi.fn(), findMany: vi.fn() },
      questions: { findFirst: vi.fn(), findMany: vi.fn() },
      homeworks: { findFirst: vi.fn(), findMany: vi.fn() },
      comments: { findFirst: vi.fn(), findMany: vi.fn() },
      quizzes: { findFirst: vi.fn(), findMany: vi.fn() },
      races: { findFirst: vi.fn(), findMany: vi.fn() },
      classes: { findFirst: vi.fn(), findMany: vi.fn() },
      classChapters: { findFirst: vi.fn(), findMany: vi.fn() },
      userClasses: { findFirst: vi.fn(), findMany: vi.fn() },
      userChapters: { findFirst: vi.fn(), findMany: vi.fn() },
      userCourses: { findFirst: vi.fn(), findMany: vi.fn() },
      userQuestions: { findFirst: vi.fn(), findMany: vi.fn() },
      userHomeworks: { findFirst: vi.fn(), findMany: vi.fn() },
      userQuizzes: { findFirst: vi.fn(), findMany: vi.fn() },
      userRaces: { findFirst: vi.fn(), findMany: vi.fn() },
      userComments: { findFirst: vi.fn(), findMany: vi.fn() },
      commentLikes: { findFirst: vi.fn(), findMany: vi.fn() },
      categories: { findFirst: vi.fn(), findMany: vi.fn() },
      announcements: { findFirst: vi.fn(), findMany: vi.fn() },
      medals: { findFirst: vi.fn(), findMany: vi.fn() },
      userMedals: { findFirst: vi.fn(), findMany: vi.fn() },
      configs: { findFirst: vi.fn(), findMany: vi.fn() },
      messages: { findFirst: vi.fn(), findMany: vi.fn() },
      notifications: { findFirst: vi.fn(), findMany: vi.fn() },
      ...extraQuery,
    },
  }
  return db
}

/**
 * Reset DB mock state in beforeEach
 * - re-initialize mockReturnThis for all chainable methods
 * - re-initialize all query.findFirst/findMany
 */
export function resetDb(db: any, extraQuery: Record<string, any> = {}) {
  const chainMethods = [
    'select', 'selectDistinct', 'from', 'where', 'innerJoin', 'leftJoin',
    'orderBy', 'limit', 'offset', 'groupBy', 'having',
    'insert', 'values', 'update', 'set', 'delete',
    'onConflictDoUpdate', 'onConflictDoNothing',
  ]
  for (const m of chainMethods) {
    db[m] = vi.fn().mockReturnThis()
  }
  db.returning = vi.fn().mockResolvedValue([])
  db.then = undefined // reset thenable flag (some tests need it set to a function so chained queries are awaitable)
  // Re-initialize query
  if (db.query) {
    const queryDefaults: Record<string, any> = {}
    for (const table of Object.keys(db.query)) {
      queryDefaults[table] = { findFirst: vi.fn(), findMany: vi.fn() }
    }
    db.query = { ...queryDefaults, ...extraQuery }
  }
}

/**
 * Install all LMS module auto-import stubs onto globalThis
 * These are global functions used by LMS server-side code (no explicit import)
 */
export function installLmsAutoImports(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    getCourseLmsConfig: vi.fn().mockResolvedValue({
      chapter: { passScore: 60, defaultChapterOpen: true },
      question: { submitExp: 2, maxSubmitCount: 5, recordWrong: true },
      homework: { submitExp: 5, maxSubmitCount: 3, passScore: 60, passBonusExp: 10 },
      comment: { publishExp: 3, maxCommentCount: 50 },
      quiz: { submitExp: 3, passScore: 60, passBonusExp: 10 },
      race: { submitExp: 2, baseScore: 10 },
      ai: { mode: 'api', model: 'glm-4.5-air' },
    }),
    addChapterScore: vi.fn().mockResolvedValue(undefined),
    addCourseScore: vi.fn().mockResolvedValue(undefined),
    addCourseScoreMax: vi.fn().mockResolvedValue(undefined),
    checkAndAwardMedals: vi.fn().mockResolvedValue(undefined),
    getClassUsers: vi.fn().mockResolvedValue([]),
    getCourseMembers: vi.fn().mockResolvedValue([]),
    mergeCourseLmsConfig: vi.fn().mockImplementation((def: any, ov: any) => ({ ...def, ...ov })),
    isCourseTeacher: vi.fn().mockResolvedValue(false),
    requireChapterTeacher: vi.fn().mockImplementation(async (event: any, _chapterId?: number) => {
      const { requireRole } = await import('./nuxt-stubs')
      return requireRole(event, ['teacher', 'admin'])
    }),
    getContentVersion: vi.fn().mockResolvedValue(null),
    listContentVersions: vi.fn().mockResolvedValue([]),
    restoreContentVersion: vi.fn().mockResolvedValue(undefined),
    upsertUserChapter: vi.fn().mockResolvedValue(undefined),
    upsertUserCourse: vi.fn().mockResolvedValue(undefined),
  }
  for (const [k, v] of Object.entries({ ...defaults, ...overrides })) {
    ;(globalThis as any)[k] = v
  }
  return defaults
}

/** Remove all LMS auto-imports (test isolation) */
export function uninstallLmsAutoImports() {
  const keys = [
    'getCourseLmsConfig', 'addChapterScore', 'addCourseScore', 'addCourseScoreMax',
    'checkAndAwardMedals', 'getClassUsers', 'getCourseMembers', 'mergeCourseLmsConfig',
    'isCourseTeacher', 'requireChapterTeacher',
    'getContentVersion', 'listContentVersions', 'restoreContentVersion',
    'upsertUserChapter', 'upsertUserCourse',
  ]
  for (const k of keys) {
    delete (globalThis as any)[k]
  }
}

/**
 * Create a mock event object (API endpoint handler argument)
 * Empty query/body/cookies/params by default; can be overridden per case
 */
export function makeEvent(opts: {
  query?: Record<string, any>
  body?: any
  cookies?: Record<string, any>
  params?: Record<string, any>
} = {}) {
  return {
    query: opts.query || {},
    body: opts.body,
    cookies: opts.cookies || {},
    params: opts.params || {},
    node: { req: {}, res: {} },
    context: {},
  } as any
}

/**
 * Create a mock WebSocket peer (for WS handler tests)
 * - send: vi.fn() captures all broadcasts
 * - readyState: 1 (OPEN)
 * - can set properties on peer such as _userId / _classId / _userName
 */
export function makeMockPeer(opts: {
  userId?: number
  userName?: string
  classId?: number
  racePin?: string
  groupId?: string
  lockId?: string
  readyState?: number
} = {}) {
  const peer: any = {
    send: vi.fn(),
    readyState: opts.readyState ?? 1,
    _userId: opts.userId,
    _userName: opts.userName || 'test-user',
    _classId: opts.classId,
    _racePin: opts.racePin,
    _groupId: opts.groupId,
    _lockId: opts.lockId,
  }
  return peer
}
