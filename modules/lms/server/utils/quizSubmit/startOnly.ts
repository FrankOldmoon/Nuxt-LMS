/**
 * 测验提交：start_only 模式（仅记录开始时间，不计算分数）
 *
 * 三种情况：
 *  1. 已有进行中且未超时的记录（!existing.submitedAt）→ 不覆盖 startedAt
 *  2. 已有已提交记录，或进行中但已超时的记录 → 重置 startedAt / submitedAt=null / records=[]
 *  3. 完全新记录 → 插入
 *
 * 超时重置（timeLimit>0 且已用时长超过时限）保证"超时作废后重试"能拿到一段新的计时，
 * 否则旧 startedAt 会被保留，重试后一提交就又被判超时。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

export type StartOnlyResult = { startedAt: Date; created: boolean }

export async function handleQuizStartOnly(
  userId: number,
  courseId: number,
  quizCid: number,
  existing: { startedAt: Date; submitedAt: Date | null } | null,
  now: Date = new Date(),
  timeLimit = 0,
): Promise<StartOnlyResult> {
  const expired = !!existing && !existing.submitedAt && timeLimit > 0 && !!existing.startedAt
    && (now.getTime() - new Date(existing.startedAt).getTime()) / 1000 > timeLimit
  // 1. 已有进行中且未超时的记录 → 不覆盖
  if (existing && !existing.submitedAt && !expired) {
    return { startedAt: existing.startedAt, created: false }
  }
  // 2. 已有已提交记录，或进行中但已超时 → 重置
  if (existing) {
    await db.update(schema.userQuizzes).set({
      startedAt: now,
      submitedAt: null,
      records: [],
    }).where(and(
      eq(schema.userQuizzes.userId, userId),
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid),
    ))
    return { startedAt: now, created: false }
  }
  // 3. 新建进行中记录
  await db.insert(schema.userQuizzes).values({
    userId,
    courseId,
    quizCid,
    records: [],
    score: '0',
    submitCount: 0,
    startedAt: now,
    submitedAt: null,
  })
  return { startedAt: now, created: true }
}
