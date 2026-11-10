/**
 * 共享测试助手：DB mock 工厂 + LMS auto-import 注入
 *
 * 用法：
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
 * 创建 drizzle-orm 风格的 mock DB：
 * - 链式方法（select / from / where / ...）全部返回 this
 * - returning / findFirst / findMany 可被测试 case 单独 mock 返回值
 * - 终端方法（getMockDbResult）需在 case 中显式设置
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
      then: undefined, // 避免被误认为 thenable
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
      goods: { findFirst: vi.fn(), findMany: vi.fn() },
      bags: { findFirst: vi.fn(), findMany: vi.fn() },
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
 * 在 beforeEach 中重置 DB mock 状态
 * - 重新初始化所有链式方法的 mockReturnThis
 * - 重新初始化所有 query.findFirst/findMany
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
  db.then = undefined // 重置 thenable 标记（个别测试需设为函数使链式查询可 await）
  // 重新初始化 query
  if (db.query) {
    const queryDefaults: Record<string, any> = {}
    for (const table of Object.keys(db.query)) {
      queryDefaults[table] = { findFirst: vi.fn(), findMany: vi.fn() }
    }
    db.query = { ...queryDefaults, ...extraQuery }
  }
}

/**
 * 安装 LMS 模块的所有 auto-import 桩到 globalThis
 * 这些是 lms 服务器端代码使用的全局函数（无显式 import）
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
    getUserClassInfo: vi.fn().mockResolvedValue(new Map()),
    getCourseMembers: vi.fn().mockResolvedValue([]),
    mergeCourseLmsConfig: vi.fn().mockImplementation((def: any, ov: any) => ({ ...def, ...ov })),
    isCourseTeacher: vi.fn().mockResolvedValue(false),
    isCourseStaff: vi.fn().mockResolvedValue(false),
    getConfigByPrefix: vi.fn().mockResolvedValue({}),
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

/** 移除所有 LMS auto-import（test isolation） */
export function uninstallLmsAutoImports() {
  const keys = [
    'getCourseLmsConfig', 'addChapterScore', 'addCourseScore', 'addCourseScoreMax',
    'checkAndAwardMedals', 'getClassUsers', 'getUserClassInfo', 'getCourseMembers', 'mergeCourseLmsConfig',
    'isCourseTeacher', 'isCourseStaff', 'requireChapterTeacher', 'getConfigByPrefix',
    'getContentVersion', 'listContentVersions', 'restoreContentVersion',
    'upsertUserChapter', 'upsertUserCourse',
  ]
  for (const k of keys) {
    delete (globalThis as any)[k]
  }
}

/**
 * 创建 mock event 对象（API endpoint handler 参数）
 * 默认空 query/body/cookies/params，可在 case 中覆盖
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
 * 创建 mock WebSocket peer（用于 WS handler 测试）
 * - send: vi.fn() 捕获所有广播
 * - readyState: 1 (OPEN)
 * - 可设置 _userId / _classId / _userName 等 peer 上的属性
 */
export function makeMockPeer(opts: {
  userId?: number
  userName?: string
  /** 覆盖认证用户（含角色）；缺省时提供 userId 即视为 student 角色 */
  authUser?: { id: number; name?: string; roles?: string[] } | null
  classId?: number
  racePin?: string
  groupId?: string
  lockId?: string
  readyState?: number
} = {}) {
  const authUser = opts.authUser !== undefined
    ? opts.authUser
    : (opts.userId != null
        ? { id: opts.userId, name: opts.userName || 'test-user', roles: ['student'] }
        : null)
  const peer: any = {
    send: vi.fn(),
    readyState: opts.readyState ?? 1,
    _userId: opts.userId,
    _userName: opts.userName || 'test-user',
    _classId: opts.classId,
    _racePin: opts.racePin,
    _groupId: opts.groupId,
    _lockId: opts.lockId,
    // 模拟已通过 WS 认证：提供 userId 即视为已登录用户（registerUser 身份校验用）
    _authResolved: true,
    _authUser: authUser,
    _authUserId: authUser?.id ?? null,
    _authUserName: authUser?.name || null,
  }
  return peer
}
