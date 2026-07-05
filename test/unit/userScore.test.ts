import { describe, it, expect, vi, beforeEach } from 'vitest'

// ====================== Mocks ======================

let chainResults: any[] = []
let chainIndex = 0

function createChain(): any {
  const chain: any = {}
  for (const m of ['set', 'where', 'values']) {
    chain[m] = vi.fn(() => chain)
  }
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(chainResults[chainIndex++] ?? []).then(resolve, reject)
  return chain
}

const dbMock: any = {
  insert: vi.fn(() => createChain()),
  update: vi.fn(() => createChain()),
  query: {
    userChapters: { findFirst: vi.fn().mockResolvedValue(null) },
    userCourses: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}

const mockSchema = {
  userChapters: { userId: 'user_id', chapterId: 'chapter_id', score: 'score' },
  userCourses: { userId: 'user_id', courseId: 'course_id', score: 'score', exp: 'exp' },
}

vi.mock('@nuxthub/db', () => ({
  db: dbMock,
  schema: mockSchema,
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ op: 'eq', a, b })),
  and: vi.fn((...args) => ({ op: 'and', args })),
}))

const { addChapterScore, addCourseScore } = await import('../../server/utils/userScore')

function resetChains(results: any[] = []) {
  chainResults = results
  chainIndex = 0
  dbMock.insert.mockClear()
  dbMock.update.mockClear()
  dbMock.query.userChapters.findFirst.mockClear()
  dbMock.query.userCourses.findFirst.mockClear()
}

// ====================== addChapterScore ======================

describe('addChapterScore', () => {
  beforeEach(() => resetChains())

  it('does nothing when chapterId is 0', async () => {
    await addChapterScore(1, 0, 10)
    expect(dbMock.query.userChapters.findFirst).not.toHaveBeenCalled()
  })

  it('does nothing when score is 0', async () => {
    await addChapterScore(1, 5, 0)
    expect(dbMock.query.userChapters.findFirst).not.toHaveBeenCalled()
  })

  it('updates existing record with added score', async () => {
    dbMock.query.userChapters.findFirst.mockResolvedValue({ score: '50' })
    resetChains([{ changed: 1 }])
    await addChapterScore(1, 5, 10)
    expect(dbMock.update).toHaveBeenCalled()
    expect(dbMock.insert).not.toHaveBeenCalled()
  })

  it('inserts new record when not existing', async () => {
    dbMock.query.userChapters.findFirst.mockResolvedValue(null)
    resetChains([undefined])
    await addChapterScore(1, 5, 10)
    expect(dbMock.insert).toHaveBeenCalled()
    expect(dbMock.update).not.toHaveBeenCalled()
  })

  it('handles existing score as null', async () => {
    dbMock.query.userChapters.findFirst.mockResolvedValue({ score: null })
    resetChains([{ changed: 1 }])
    await addChapterScore(1, 5, 10)
    expect(dbMock.update).toHaveBeenCalled()
  })

  it('handles negative score', async () => {
    dbMock.query.userChapters.findFirst.mockResolvedValue({ score: '50' })
    resetChains([{ changed: 1 }])
    await addChapterScore(1, 5, -5)
    expect(dbMock.update).toHaveBeenCalled()
  })
})

// ====================== addCourseScore ======================

describe('addCourseScore', () => {
  beforeEach(() => resetChains())

  it('does nothing when courseId is 0', async () => {
    await addCourseScore(1, 0, 10, 'questionScore')
    expect(dbMock.query.userCourses.findFirst).not.toHaveBeenCalled()
  })

  it('updates existing record with score and exp', async () => {
    dbMock.query.userCourses.findFirst.mockResolvedValue({
      score: '50',
      questionScore: '30',
      exp: 100,
    })
    resetChains([{ changed: 1 }])
    await addCourseScore(1, 5, 10, 'questionScore', 5)
    expect(dbMock.update).toHaveBeenCalled()
    expect(dbMock.insert).not.toHaveBeenCalled()
  })

  it('updates only score when exp is 0', async () => {
    dbMock.query.userCourses.findFirst.mockResolvedValue({
      score: '50',
      questionScore: '30',
      exp: 100,
    })
    resetChains([{ changed: 1 }])
    await addCourseScore(1, 5, 10, 'questionScore', 0)
    expect(dbMock.update).toHaveBeenCalled()
  })

  it('updates only exp when score is 0', async () => {
    dbMock.query.userCourses.findFirst.mockResolvedValue({
      score: '50',
      questionScore: '30',
      exp: 100,
    })
    resetChains([{ changed: 1 }])
    await addCourseScore(1, 5, 0, 'questionScore', 5)
    expect(dbMock.update).toHaveBeenCalled()
  })

  it('does not update when both score and exp are 0', async () => {
    dbMock.query.userCourses.findFirst.mockResolvedValue({
      score: '50',
      questionScore: '30',
      exp: 100,
    })
    resetChains([])
    await addCourseScore(1, 5, 0, 'questionScore', 0)
    expect(dbMock.update).not.toHaveBeenCalled()
    expect(dbMock.insert).not.toHaveBeenCalled()
  })

  it('inserts new record when not existing', async () => {
    dbMock.query.userCourses.findFirst.mockResolvedValue(null)
    resetChains([undefined])
    await addCourseScore(1, 5, 10, 'questionScore', 5)
    expect(dbMock.insert).toHaveBeenCalled()
    expect(dbMock.update).not.toHaveBeenCalled()
  })

  it('inserts new record with only score when exp is 0', async () => {
    dbMock.query.userCourses.findFirst.mockResolvedValue(null)
    resetChains([undefined])
    await addCourseScore(1, 5, 10, 'homeworkScore', 0)
    expect(dbMock.insert).toHaveBeenCalled()
  })

  it('handles null existing score', async () => {
    dbMock.query.userCourses.findFirst.mockResolvedValue({
      score: null,
      questionScore: null,
      exp: null,
    })
    resetChains([{ changed: 1 }])
    await addCourseScore(1, 5, 10, 'questionScore', 5)
    expect(dbMock.update).toHaveBeenCalled()
  })

  it('handles different scoreKey fields', async () => {
    dbMock.query.userCourses.findFirst.mockResolvedValue({
      score: '50',
      homeworkScore: '20',
      exp: 100,
    })
    resetChains([{ changed: 1 }])
    await addCourseScore(1, 5, 10, 'homeworkScore', 0)
    expect(dbMock.update).toHaveBeenCalled()
  })
})
