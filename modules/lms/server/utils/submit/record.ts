/**
 * Submit API common record lookup
 *
 * The primary key of all userXxx tables is (userId, courseId, xxxCid), and the findFirst logic is exactly the same,
 * extracted as a common utility to avoid repeating the same where construction in every submit.
 *
 * TABLES uses lazy initialization (getter pattern), allowing tests to mock only some userXxx tables.
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

export type RecordType = 'question' | 'homework' | 'quiz' | 'race'

export interface SubmitRecordTable {
  table: any
  userIdField: any
  courseIdField: any
  cidField: any
}

/** Lazily construct the TABLES view for the specified type on demand (avoids requiring all userXxx tables to be mocked at module load time) */
function buildTable(type: RecordType): SubmitRecordTable {
  switch (type) {
    case 'question':
      return {
        table: schema.userQuestions,
        userIdField: schema.userQuestions.userId,
        courseIdField: schema.userQuestions.courseId,
        cidField: schema.userQuestions.questionCid,
      }
    case 'homework':
      return {
        table: schema.userHomeworks,
        userIdField: schema.userHomeworks.userId,
        courseIdField: schema.userHomeworks.courseId,
        cidField: schema.userHomeworks.homeworkCid,
      }
    case 'quiz':
      return {
        table: schema.userQuizzes,
        userIdField: schema.userQuizzes.userId,
        courseIdField: schema.userQuizzes.courseId,
        cidField: schema.userQuizzes.quizCid,
      }
    case 'race':
      return {
        table: schema.userRaces,
        userIdField: schema.userRaces.userId,
        courseIdField: schema.userRaces.courseId,
        cidField: schema.userRaces.raceCid,
      }
  }
}

/** Get the db.query.<name> reference by type */
function buildQuery(type: RecordType): any {
  const map: Record<RecordType, any> = {
    question: db.query.userQuestions,
    homework: db.query.userHomeworks,
    quiz:     db.query.userQuizzes,
    race:     db.query.userRaces,
  }
  return map[type]
}

/**
 * Common findFirst: returns the entire row when userId + courseId + cid matches, otherwise null.
 *   const existing = await findUserSubmitRecord(user.id, courseId, 'question', questionCid)
 */
export async function findUserSubmitRecord(
  userId: number,
  courseId: number,
  type: RecordType,
  cid: number,
) {
  const t = buildTable(type)
  const q = buildQuery(type)
  if (!t || !q) throw new Error(`[submit] unknown record type: ${type}`)
  return q.findFirst({
    where: and(
      eq(t.userIdField, userId),
      eq(t.courseIdField, courseId),
      eq(t.cidField, cid),
    ),
  })
}

/** Synchronous access to TABLES (only used for dispatching by type in other utilities like submit/questions). Note: only available when all 4 tables are mocked. */
export const SUBMIT_RECORD_TABLES: Record<RecordType, SubmitRecordTable | undefined> = new Proxy({} as any, {
  get(_target, prop: string) {
    return buildTable(prop as RecordType)
  },
})
