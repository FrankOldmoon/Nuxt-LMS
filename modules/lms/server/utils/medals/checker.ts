import { db, schema } from '@nuxthub/db'
import { eq, isNull } from 'drizzle-orm'
import type { MedalContent } from './types'
import { collectUserMetrics } from './metrics'

/** Determine whether a single condition is met */
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

/** Determine whether a medal should be awarded */
export function shouldAwardMedal(content: MedalContent, metrics: import('./types').UserMetrics): boolean {
  if (!content.conditions || content.conditions.length === 0) return false
  if (content.logic === 'any') {
    return content.conditions.some(c => checkCondition(c, metrics))
  }
  return content.conditions.every(c => checkCondition(c, metrics))
}

/**
 * Check and award medals to the user
 * @returns Array of newly awarded medal ids
 */
export async function checkAndAwardMedals(userId: number, courseId: number): Promise<number[]> {
  // Get all non-soft-deleted medals
  const allMedals = await db.select().from(schema.medals).where(isNull(schema.medals.deletedAt))
  if (allMedals.length === 0) return []

  // Get medals already owned by the user
  const owned = await db
    .select({ medalId: schema.userMedals.medalId })
    .from(schema.userMedals)
    .where(eq(schema.userMedals.userId, userId))
  const ownedSet = new Set(owned.map(o => o.medalId))

  // Collect metrics
  const metrics = await collectUserMetrics(userId, courseId)

  // Check each unowned medal one by one
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
