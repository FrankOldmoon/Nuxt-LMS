import { db, schema } from '@nuxthub/db'
import { eq, isNull } from 'drizzle-orm'
import type { MedalContent } from './types'
import { collectUserMetrics } from './metrics'

/** 判断单个条件是否满足 */
function checkCondition(cond: MedalContent['conditions'][number], metrics: import('./types').UserMetrics): boolean {
  const val = (metrics as any)[cond.metric]
  if (val === undefined || val === null) return false
  switch (cond.op) {
    case '>=': return val >= cond.value
    case '>': return val > cond.value
    case '<=': return val <= cond.value
    case '<': return val < cond.value
    case '==': return val === cond.value
    default: return false
  }
}

/** 判断奖章是否应该被授予 */
export function shouldAwardMedal(content: MedalContent, metrics: import('./types').UserMetrics): boolean {
  if (!content.conditions || content.conditions.length === 0) return false
  if (content.logic === 'any') {
    return content.conditions.some(c => checkCondition(c, metrics))
  }
  return content.conditions.every(c => checkCondition(c, metrics))
}

/**
 * 检查并授予用户奖章
 * @returns 新授予的 medalId 数组
 */
export async function checkAndAwardMedals(userId: number, courseId: number): Promise<number[]> {
  // 获取所有未软删除的奖章
  const allMedals = await db.select().from(schema.medals).where(isNull(schema.medals.deletedAt))
  if (allMedals.length === 0) return []

  // 获取用户已有奖章
  const owned = await db
    .select({ medalId: schema.userMedals.medalId })
    .from(schema.userMedals)
    .where(eq(schema.userMedals.userId, userId))
  const ownedSet = new Set(owned.map(o => o.medalId))

  // 收集指标
  const metrics = await collectUserMetrics(userId, courseId)

  // 逐个检查未拥有的奖章
  const newMedalIds: number[] = []
  for (const medal of allMedals) {
    if (ownedSet.has(medal.id)) continue
    const content = medal.content as MedalContent
    if (!content || !content.conditions) continue
    if (shouldAwardMedal(content, metrics)) {
      await db.insert(schema.userMedals).values({ userId, medalId: medal.id })
      newMedalIds.push(medal.id)
    }
  }

  return newMedalIds
}
