/**
 * 条件类型：cids 数组已完成检查
 *
 * 所有类型共享的"value 为 cid 数组，需全部完成"逻辑：
 *  - question: userQuestions.questionCid
 *  - homework: userHomeworks.homeworkCid
 *  - comment:  userComments.commentCid
 *  - quiz:     userQuizzes.quizCid
 *  - race:     userRaces.raceCid
 *
 * 每种类型构造不同的 SELECT 和 IN 字段。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'

type CidTable = {
  table: any
  userIdField: any
  cidField: any
  cidAlias: string
}

/** 把 value 标准化为数字数组，过滤非正整数 */
export function normalizeCidValue(value: any): number[] {
  const raw = Array.isArray(value) ? value : [value]
  return raw.map(Number).filter(Boolean)
}

/** 检查用户是否完成指定 cids 列表中的全部项 */
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

/** 按 condition.type 分发到对应表 */
export async function checkCidsByType(userId: number, type: string, value: any): Promise<boolean> {
  const t = TABLES[type]
  if (!t) return false
  const cids = normalizeCidValue(value)
  return checkAllCidsCompleted(userId, cids, t)
}
