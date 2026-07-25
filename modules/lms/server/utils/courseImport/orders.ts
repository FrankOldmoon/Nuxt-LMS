/**
 * 课程导入：orders 重新映射 + 回写 course
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { ChapterIdMap } from './types'
import { remapOrderEntry } from './remap'

export function remapOrders(oldOrders: any[], chapterIdMap: ChapterIdMap): any[] {
  return (oldOrders || []).map((o) => remapOrderEntry(o, chapterIdMap))
}

export async function updateCourseOrders(
  tx: typeof db,
  courseId: number,
  newOrders: any[],
): Promise<void> {
  await tx.update(schema.courses)
    .set({ orders: newOrders })
    .where(eq(schema.courses.id, courseId))
}
