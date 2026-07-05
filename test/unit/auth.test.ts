import { describe, it, expect, vi, beforeEach } from 'vitest'

// ====================== Mocks ======================

const createErrorMock = vi.fn((opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage)
  ;(err as any).statusCode = opts.statusCode
  throw err
})

vi.stubGlobal('createError', createErrorMock)

// Chainable DB mock - each query resolves to queuedResults[index]
let queuedResults: any[] = []
let queryIndex = 0

function createChain(): any {
  const chain: any = {}
  for (const m of ['select', 'selectDistinct', 'from', 'where', 'innerJoin', 'limit']) {
    chain[m] = vi.fn(() => chain)
  }
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(queuedResults[queryIndex++] ?? []).then(resolve, reject)
  return chain
}

const dbMock: any = {
  select: vi.fn(() => createChain()),
  selectDistinct: vi.fn(() => createChain()),
  query: {},
}

vi.mock('@nuxthub/db', () => ({
  db: dbMock,
  schema: {
    tokens: { name: 'name', deletedAt: 'deleted_at' },
    users: { id: 'id', username: 'username', name: 'name' },
    userRoles: { userId: 'user_id', roleId: 'role_id' },
    roles: { id: 'id', code: 'code' },
    rolePermissions: { roleId: 'role_id', permissionId: 'permission_id' },
    permissions: { id: 'id', code: 'code' },
    userCourses: { userId: 'user_id', courseId: 'course_id', isTeacher: 'is_teacher', isEditor: 'is_editor' },
    chapters: { id: 'id', courseId: 'course_id' },
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ op: 'eq', a, b })),
  and: vi.fn((...args) => ({ op: 'and', args })),
  isNull: vi.fn((a) => ({ op: 'isNull', a })),
}))

const { hashPassword, verifyPassword, generateToken, getCurrentUser, requireAuth, requireRole, requirePermission, requireAdmin, isCourseTeacher, isCourseEditor, requireCourseTeacher, requireChapterTeacher } =
  await import('../../server/utils/auth')

// ====================== Pure function tests ======================

describe('hashPassword / verifyPassword', () => {
  it('hashes a password and verifies it', async () => {
    const hashed = await hashPassword('mypassword')
    expect(hashed).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)
    expect(await verifyPassword('mypassword', hashed)).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hashed = await hashPassword('correct')
    expect(await verifyPassword('wrong', hashed)).toBe(false)
  })

  it('returns false for malformed hash', async () => {
    expect(await verifyPassword('test', 'no-colon')).toBe(false)
    expect(await verifyPassword('test', '')).toBe(false)
  })

  it('produces different hashes for same password (random salt)', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
  })
})

describe('generateToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces unique tokens', () => {
    const t1 = generateToken()
    const t2 = generateToken()
    expect(t1).not.toBe(t2)
  })
})

// ====================== DB-dependent function tests ======================

describe('isCourseTeacher', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
  })

  it('returns true when user is teacher', async () => {
    queuedResults = [[{ isTeacher: true, isEditor: false }]]
    expect(await isCourseTeacher(1, 10)).toBe(true)
  })

  it('returns true when user is editor', async () => {
    queuedResults = [[{ isTeacher: false, isEditor: true }]]
    expect(await isCourseTeacher(1, 10)).toBe(true)
  })

  it('returns false when user is neither teacher nor editor', async () => {
    queuedResults = [[{ isTeacher: false, isEditor: false }]]
    expect(await isCourseTeacher(1, 10)).toBe(false)
  })

  it('returns false when no user_courses record exists', async () => {
    queuedResults = [[]]
    expect(await isCourseTeacher(1, 10)).toBe(false)
  })
})

describe('isCourseEditor', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
  })

  it('returns true when user is editor', async () => {
    queuedResults = [[{ isEditor: true }]]
    expect(await isCourseEditor(1, 10)).toBe(true)
  })

  it('returns false when user is teacher but not editor', async () => {
    queuedResults = [[{ isEditor: false }]]
    expect(await isCourseEditor(1, 10)).toBe(false)
  })

  it('returns false when no record exists', async () => {
    queuedResults = [[]]
    expect(await isCourseEditor(1, 10)).toBe(false)
  })
})

describe('getCurrentUser', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
    createErrorMock.mockClear()
  })

  it('returns null when no auth_token cookie', async () => {
    vi.stubGlobal('getCookie', () => undefined)
    expect(await getCurrentUser({})).toBeNull()
  })

  it('returns null when token not found in DB', async () => {
    vi.stubGlobal('getCookie', () => 'invalid-token')
    queuedResults = [[]] // tokens query returns empty
    expect(await getCurrentUser({})).toBeNull()
  })

  it('returns null when user not found', async () => {
    vi.stubGlobal('getCookie', () => 'valid-token')
    queuedResults = [
      [{ userId: 1 }], // tokens
      [],              // users (not found)
    ]
    expect(await getCurrentUser({})).toBeNull()
  })

  it('returns full AuthUser with roles and permissions', async () => {
    vi.stubGlobal('getCookie', () => 'valid-token')
    queuedResults = [
      [{ userId: 1 }],                          // tokens
      [{ id: 1, username: 'admin', name: '管理员' }], // users
      [{ code: 'admin' }, { code: 'teacher' }], // roles
      [{ code: 'course.edit' }],                // permissions
    ]
    const user = await getCurrentUser({})
    expect(user).toEqual({
      id: 1,
      username: 'admin',
      name: '管理员',
      roles: ['admin', 'teacher'],
      permissions: ['course.edit'],
    })
  })
})

describe('requireAuth', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
    createErrorMock.mockClear()
  })

  it('throws 401 when not logged in', async () => {
    vi.stubGlobal('getCookie', () => undefined)
    await expect(requireAuth({})).rejects.toThrow('请先登录')
    expect(createErrorMock).toHaveBeenCalledWith({ statusCode: 401, statusMessage: '请先登录' })
  })

  it('returns user when logged in', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'user', name: 'User' }],
      [],
      [],
    ]
    const user = await requireAuth({})
    expect(user.id).toBe(1)
  })
})

describe('requireRole', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
    createErrorMock.mockClear()
  })

  it('returns user when they have the required role', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'admin', name: 'Admin' }],
      [{ code: 'admin' }],
      [],
    ]
    const user = await requireRole({}, ['admin'])
    expect(user.roles).toContain('admin')
  })

  it('throws 403 when missing required role', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'student', name: 'Student' }],
      [{ code: 'student' }],
      [],
    ]
    await expect(requireRole({}, ['admin'])).rejects.toThrow('无权限执行此操作')
    expect(createErrorMock).toHaveBeenCalledWith({ statusCode: 403, statusMessage: '无权限执行此操作' })
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
    createErrorMock.mockClear()
  })

  it('returns user when admin', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'admin', name: 'Admin' }],
      [{ code: 'admin' }],
      [],
    ]
    const user = await requireAdmin({})
    expect(user.roles).toContain('admin')
  })

  it('throws 403 when not admin', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'user', name: 'User' }],
      [{ code: 'student' }],
      [],
    ]
    await expect(requireAdmin({})).rejects.toThrow('无权限执行此操作')
  })
})

describe('requirePermission', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
    createErrorMock.mockClear()
  })

  it('returns user when they have the required permission', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'user', name: 'User' }],
      [],
      [{ code: 'course.edit' }],
    ]
    const user = await requirePermission({}, ['course.edit'])
    expect(user.permissions).toContain('course.edit')
  })

  it('throws 403 when missing required permission', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'user', name: 'User' }],
      [],
      [{ code: 'other.perm' }],
    ]
    await expect(requirePermission({}, ['course.edit'])).rejects.toThrow('无权限执行此操作')
  })
})

describe('requireCourseTeacher', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
    createErrorMock.mockClear()
  })

  it('returns user when admin', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'admin', name: 'Admin' }],
      [{ code: 'admin' }],
      [],
    ]
    const user = await requireCourseTeacher({}, 10)
    expect(user.roles).toContain('admin')
  })

  it('returns user when course editor', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'editor', name: 'Editor' }],
      [{ code: 'teacher' }],
      [],
      [{ isEditor: true }], // isCourseEditor query
    ]
    const user = await requireCourseTeacher({}, 10)
    expect(user.id).toBe(1)
  })

  it('throws 403 when not admin and not editor', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'student', name: 'Student' }],
      [{ code: 'student' }],
      [],
      [{ isEditor: false }], // isCourseEditor query
    ]
    await expect(requireCourseTeacher({}, 10)).rejects.toThrow('无权限：仅管理员或课程编辑者可操作')
  })
})

describe('requireChapterTeacher', () => {
  beforeEach(() => {
    queryIndex = 0
    queuedResults = []
    createErrorMock.mockClear()
  })

  it('returns user when admin', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'admin', name: 'Admin' }],
      [{ code: 'admin' }],
      [],
    ]
    const user = await requireChapterTeacher({}, 5)
    expect(user.roles).toContain('admin')
  })

  it('throws 404 when chapter not found', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'user', name: 'User' }],
      [{ code: 'teacher' }],
      [],
      [], // chapters query returns empty
    ]
    await expect(requireChapterTeacher({}, 999)).rejects.toThrow('章节不存在')
  })

  it('returns user when editor of chapter course', async () => {
    vi.stubGlobal('getCookie', () => 'token')
    queuedResults = [
      [{ userId: 1 }],
      [{ id: 1, username: 'editor', name: 'Editor' }],
      [{ code: 'teacher' }],
      [],
      [{ courseId: 10 }], // chapter query
      [{ isEditor: true }], // isCourseEditor query
    ]
    const user = await requireChapterTeacher({}, 5)
    expect(user.id).toBe(1)
  })
})
