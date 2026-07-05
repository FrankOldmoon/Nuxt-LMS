import { describe, it, expect, vi, beforeEach } from 'vitest'

// ====================== Mocks ======================

const createErrorMock = vi.fn((opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage)
  ;(err as any).statusCode = opts.statusCode
  throw err
})
vi.stubGlobal('createError', createErrorMock)

// Chainable DB mock with result queue
let chainResults: any[] = []
let chainIndex = 0

function createChain(): any {
  const chain: any = {}
  for (const m of ['select', 'from', 'where', 'limit', 'orderBy', 'innerJoin', 'values', 'returning', 'set', 'onConflictDoUpdate']) {
    chain[m] = vi.fn(() => chain)
  }
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(chainResults[chainIndex++] ?? []).then(resolve, reject)
  return chain
}

const queryMocks = {
  userCourses_findMany: vi.fn().mockResolvedValue([]),
}

const dbMock: any = {
  select: vi.fn(() => createChain()),
  insert: vi.fn(() => createChain()),
  update: vi.fn(() => createChain()),
  delete: vi.fn(() => createChain()),
  query: {
    userCourses: { findMany: queryMocks.userCourses_findMany },
  },
}

const mockSchema = {
  courses: { id: 'id', content: 'content' },
  chapters: { id: 'id', content: 'content' },
  courseVersions: { courseId: 'course_id', id: 'id', content: 'content', createdAt: 'created_at' },
  chapterVersions: { chapterId: 'chapter_id', id: 'id', content: 'content', createdAt: 'created_at' },
  userCourses: { userId: 'user_id', courseId: 'course_id', isTeacher: 'is_teacher', isEditor: 'is_editor', deletedAt: 'deleted_at' },
  userClasses: { userId: 'user_id', classId: 'class_id', isTeacher: 'is_teacher', deletedAt: 'deleted_at' },
  users: { id: 'id', username: 'username', name: 'name', avatarImg: 'avatar_img', preferName: 'prefer_name', englishName: 'english_name', rollNumber: 'roll_number', email: 'email', telephone: 'telephone', loginAt: 'login_at', deletedAt: 'deleted_at', classId: 'class_id' },
  configs: { id: 'id', value: 'value' },
}

vi.mock('@nuxthub/db', () => ({
  db: dbMock,
  schema: mockSchema,
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ op: 'eq', a, b })),
  and: vi.fn((...args) => ({ op: 'and', args })),
  or: vi.fn((...args) => ({ op: 'or', args })),
  not: vi.fn(),
  isNull: vi.fn((a) => ({ op: 'isNull', a })),
  inArray: vi.fn((a, b) => ({ op: 'inArray', a, b })),
  desc: vi.fn((a) => ({ op: 'desc', a })),
  ilike: vi.fn((a, b) => ({ op: 'ilike', a, b })),
  sql: vi.fn(),
}))

const {
  listTable, showTable, addTable, updateTable, batchTable,
  saveContentVersion, listContentVersions, getContentVersion, restoreContentVersion,
  getCourseMembers, updateCourseMember, searchUsers, upsertConfig, getClassUsers,
} = await import('../../server/utils/db')

function resetChains(results: any[] = []) {
  chainResults = results
  chainIndex = 0
  dbMock.select.mockClear()
  dbMock.insert.mockClear()
  dbMock.update.mockClear()
  dbMock.delete.mockClear()
  queryMocks.userCourses_findMany.mockClear()
}

// ====================== Basic CRUD ======================

describe('listTable', () => {
  beforeEach(() => resetChains([[{ id: 1 }, { id: 2 }]]))

  it('returns all records from a table', async () => {
    const result = await listTable('courses')
    expect(result).toEqual([{ id: 1 }, { id: 2 }])
    expect(dbMock.select).toHaveBeenCalled()
  })
})

describe('showTable', () => {
  beforeEach(() => resetChains())

  it('returns first record when found', async () => {
    resetChains([[{ id: 1, name: 'Course' }]])
    const result = await showTable('courses', 1)
    expect(result).toEqual({ id: 1, name: 'Course' })
  })

  it('returns null when no record found', async () => {
    resetChains([[]])
    const result = await showTable('courses', 999)
    expect(result).toBeNull()
  })
})

describe('addTable', () => {
  beforeEach(() => resetChains())

  it('inserts data and returns inserted rows', async () => {
    resetChains([[{ id: 1, name: 'New' }]])
    const result = await addTable('courses', { name: 'New' })
    expect(result).toEqual([{ id: 1, name: 'New' }])
    expect(dbMock.insert).toHaveBeenCalled()
  })
})

describe('updateTable', () => {
  beforeEach(() => resetChains([{ changed: 1 }]))

  it('updates record by id and returns result', async () => {
    const result = await updateTable('courses', 1, { name: 'Updated' })
    expect(result).toEqual({ changed: 1 })
    expect(dbMock.update).toHaveBeenCalled()
  })
})

// ====================== batchTable execution ======================

describe('batchTable - execution', () => {
  beforeEach(() => {
    createErrorMock.mockClear()
    resetChains([{ changed: 1 }])
  })

  it('calls db.update with deletedAt for delete action', async () => {
    await batchTable('courses', [1, 2], 'delete')
    expect(dbMock.update).toHaveBeenCalled()
  })

  it('calls db.delete for remove action', async () => {
    await batchTable('courses', [1, 2], 'remove')
    expect(dbMock.delete).toHaveBeenCalled()
  })

  it('calls db.update with null deletedAt for restore action', async () => {
    await batchTable('courses', [1, 2], 'restore')
    expect(dbMock.update).toHaveBeenCalled()
  })
})

// ====================== Content versions ======================

describe('saveContentVersion', () => {
  beforeEach(() => resetChains())

  it('inserts version and deletes old ones when exceeding maxKeep', async () => {
    resetChains([
      undefined, // insert result
      [{ id: 1 }, { id: 2 }, { id: 3 }], // select all versions (3 > maxKeep=2)
      undefined, // delete old versions
    ])
    await saveContentVersion('course', 1, { content: 'old' }, 2)
    expect(dbMock.insert).toHaveBeenCalledTimes(1)
    expect(dbMock.delete).toHaveBeenCalledTimes(1)
  })

  it('does not delete when within maxKeep', async () => {
    resetChains([
      undefined, // insert
      [{ id: 1 }, { id: 2 }], // only 2 versions (<= maxKeep=10)
    ])
    await saveContentVersion('chapter', 1, { content: 'old' })
    expect(dbMock.insert).toHaveBeenCalledTimes(1)
    expect(dbMock.delete).not.toHaveBeenCalled()
  })

  it('uses courseVersions table for course type', async () => {
    resetChains([undefined, []])
    await saveContentVersion('course', 1, {})
    expect(dbMock.insert).toHaveBeenCalled()
  })

  it('uses chapterVersions table for chapter type', async () => {
    resetChains([undefined, []])
    await saveContentVersion('chapter', 1, {})
    expect(dbMock.insert).toHaveBeenCalled()
  })
})

describe('listContentVersions', () => {
  beforeEach(() => resetChains([[{ id: 1, content: {}, createdAt: new Date() }]]))

  it('returns version list', async () => {
    const result = await listContentVersions('course', 1)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })
})

describe('getContentVersion', () => {
  beforeEach(() => resetChains())

  it('returns version when found', async () => {
    resetChains([[{ id: 1, content: { text: 'hello' } }]])
    const result = await getContentVersion('course', 1)
    expect(result).toEqual({ id: 1, content: { text: 'hello' } })
  })

  it('returns null when version not found', async () => {
    resetChains([[]])
    const result = await getContentVersion('chapter', 999)
    expect(result).toBeNull()
  })
})

describe('restoreContentVersion', () => {
  beforeEach(() => resetChains())

  it('saves current content as version then updates with new content', async () => {
    resetChains([
      [{ id: 1, content: { old: true } }], // showTable: current record
      undefined, // saveContentVersion: insert
      [],        // saveContentVersion: select all versions (no delete needed)
      { changed: 1 }, // updateTable: update result
    ])
    await restoreContentVersion('course', 1, { new: true })
    expect(dbMock.select).toHaveBeenCalled()
    expect(dbMock.update).toHaveBeenCalled()
  })

  it('skips saving version when current content is null', async () => {
    resetChains([
      [{ id: 1, content: null }], // showTable: current record with null content
      { changed: 1 }, // updateTable: update result
    ])
    await restoreContentVersion('course', 1, { new: true })
    expect(dbMock.update).toHaveBeenCalled()
  })

  it('skips saving version when current record is null', async () => {
    resetChains([
      [], // showTable: no record
      { changed: 1 }, // updateTable
    ])
    await restoreContentVersion('chapter', 1, { new: true })
    expect(dbMock.update).toHaveBeenCalled()
  })
})

// ====================== Course members ======================

describe('getCourseMembers', () => {
  beforeEach(() => resetChains([[
    { userId: 1, isTeacher: true, isEditor: false, username: 'teacher1', name: '张老师', avatarImg: '/img.png' },
  ]]))

  it('returns teachers and editors for a course', async () => {
    const result = await getCourseMembers(1)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('张老师')
  })
})

describe('updateCourseMember', () => {
  beforeEach(() => resetChains())

  it('updates existing record when user_courses exists', async () => {
    resetChains([
      [{ id: 1, isTeacher: false }], // existing record
      { changed: 1 }, // update result
    ])
    await updateCourseMember(1, 5, 'teacher', 'add')
    expect(dbMock.update).toHaveBeenCalled()
    expect(dbMock.insert).not.toHaveBeenCalled()
  })

  it('inserts new record when not existing and action is add', async () => {
    resetChains([
      [], // no existing record
      undefined, // insert result
    ])
    await updateCourseMember(1, 5, 'editor', 'add')
    expect(dbMock.insert).toHaveBeenCalled()
    expect(dbMock.update).not.toHaveBeenCalled()
  })

  it('does nothing when not existing and action is remove', async () => {
    resetChains([[]]) // no existing record
    await updateCourseMember(1, 5, 'teacher', 'remove')
    expect(dbMock.insert).not.toHaveBeenCalled()
    expect(dbMock.update).not.toHaveBeenCalled()
  })
})

// ====================== User search ======================

describe('searchUsers', () => {
  beforeEach(() => resetChains([[
    { id: 1, username: 'john', name: 'John', avatarImg: null },
    { id: 2, username: 'johnny', name: 'Johnny', avatarImg: '/img.png' },
  ]]))

  it('returns matching users', async () => {
    const result = await searchUsers('john')
    expect(result).toHaveLength(2)
    expect(result[0].username).toBe('john')
  })
})

// ====================== Config upsert ======================

describe('upsertConfig', () => {
  beforeEach(() => resetChains([undefined]))

  it('calls insert with onConflictDoUpdate', async () => {
    await upsertConfig('site_config', { title: 'Test' })
    expect(dbMock.insert).toHaveBeenCalled()
  })
})

// ====================== Class users ======================

describe('getClassUsers', () => {
  beforeEach(() => {
    resetChains()
    queryMocks.userCourses_findMany.mockResolvedValue([])
  })

  it('merges relUsers and directUsers with dedup', async () => {
    resetChains([
      [{ id: 1, username: 'rel_user', name: 'Rel', isTeacher: true }], // relUsers
      [{ id: 1, username: 'rel_user', name: 'Rel' }, { id: 2, username: 'direct', name: 'Direct' }], // directUsers
    ])
    const result = await getClassUsers(1)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[0].isTeacher).toBe(true) // from relUsers
    expect(result[1].id).toBe(2)
    expect(result[1].isTeacher).toBeNull() // from directUsers, no isTeacher
  })

  it('queries userCourses when courseId provided', async () => {
    resetChains([
      [{ id: 1, username: 'u1', name: 'U1' }], // relUsers
      [], // directUsers (empty)
    ])
    queryMocks.userCourses_findMany.mockResolvedValue([
      { userId: 1, number: '01', group: 'A' },
    ])
    const result = await getClassUsers(1, 10) as any[]
    expect(queryMocks.userCourses_findMany).toHaveBeenCalled()
    expect(result[0].number).toBe('01')
    expect(result[0].group).toBe('A')
  })

  it('does not query userCourses when courseId is 0', async () => {
    resetChains([
      [{ id: 1, username: 'u1', name: 'U1' }], // relUsers
      [], // directUsers
    ])
    await getClassUsers(1, 0)
    expect(queryMocks.userCourses_findMany).not.toHaveBeenCalled()
  })

  it('returns empty array when no users found', async () => {
    resetChains([[], []])
    const result = await getClassUsers(999)
    expect(result).toEqual([])
  })

  it('handles empty merged list with courseId', async () => {
    resetChains([[], []])
    await getClassUsers(1, 10)
    expect(queryMocks.userCourses_findMany).not.toHaveBeenCalled()
  })
})
