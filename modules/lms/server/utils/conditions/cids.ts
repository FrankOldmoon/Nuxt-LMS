/**
 * Condition type: cids array completion check
 *
 * The "value is a cid array, all must be completed" logic shared by all types:
 *  - question: userQuestions.questionCid
 *  - homework: userHomeworks.homeworkCid
 *  - comment:  userComments.commentCid
 *  - quiz:     userQuizzes.quizCid
 *  - race:     userRaces.raceCid
 *
 * Each type constructs a different SELECT and IN field.
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'

type CidTable = {
  table: any
  userIdField: any
  cidField: any
  cidAlias: string
}

/** Normalize value to a numeric array, filtering out non-positive integers */
export function normalizeCidValue(value: any): number[] {
  const raw = Array.isArray(value) ? value : [value]
  return raw.map(Number).filter(Boolean)
}

/** Check whether the user has completed all items in the specified cids list */
export async function checkAllCidsCompleted(
  userId: number,
  cids: number[],
  { table, userIdField, cidField, cidAlias }: CidTable,
): Promise<boolean> {
  if (!cids.length) return false
  const rows = await db
    .select({ [cidAlias]: cidField })
    .from(table)
    .where(and(eq(userIdField, userId), inArray(cidField, cids)))
  const doneSet = new Set(rows.map(r => Number(r[cidAlias])))
  return cids.every(id => doneSet.has(id))
}

const TABLES: Record<string, CidTable> = {
  question: { table: schema.userQuestions, userIdField: schema.userQuestions.userId, cidField: schema.userQuestions.questionCid, cidAlias: 'questionCid' },
  homework: { table: schema.userHomeworks, userIdField: schema.userHomeworks.userId, cidField: schema.userHomeworks.homeworkCid, cidAlias: 'homeworkCid' },
  comment:  { table: schema.userComments,  userIdField: schema.userComments.userId,  cidField: schema.userComments.commentCid,  cidAlias: 'commentCid' },
  quiz:     { table: schema.userQuizzes,   userIdField: schema.userQuizzes.userId,   cidField: schema.userQuizzes.quizCid,   cidAlias: 'quizCid' },
  race:     { table: schema.userRaces,     userIdField: schema.userRaces.userId,     cidField: schema.userRaces.raceCid,     cidAlias: 'raceCid' },
}

/** Dispatch to the corresponding table by condition.type */
export async function checkCidsByType(userId: number, type: string, value: any): Promise<boolean> {
  const t = TABLES[type]
  if (!t) return false
  const cids = normalizeCidValue(value)
  return checkAllCidsCompleted(userId, cids, t)
}
