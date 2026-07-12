/**
 * 测验提交：start_only 模式（仅记录开始时间，不计算分数）
 *
 * 三种情况：
 *  1. 已有进行中记录（!existing.submitedAt）→ 不覆盖 startedAt
 *  2. 已有已提交记录 → 重置 startedAt / submitedAt=null / records=[]
 *  3. 完全新记录 → 插入
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
): Promise<StartOnlyResult> {
  // 1. 已有进行中记录 → 不覆盖
  if (existing && !existing.submitedAt) {
    return { startedAt: existing.startedAt, created: false }
  }
  // 2. 已有已提交记录 → 重置
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
