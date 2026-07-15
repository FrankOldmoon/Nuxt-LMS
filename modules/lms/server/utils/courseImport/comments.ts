/**
 * Course import: batch insert comments
 *
 * Comments may have a parentId pointing to another comment, so two passes are needed:
 *   1. Insert top-level (parentId = null)
 *   2. Insert children (parentId comes from commentMap)
 *
 * Use currentUser.id as userId (the original user may not exist).
 */
import { db, schema } from '@nuxthub/db'

export async function importComments(
  tx: typeof db,
  items: any[],
  newCourseId: number,
  currentUserId: number,
): Promise<Map<number, number>> {
  const allComments = (items || []) as any[]
  const topLevel = allComments.filter((c) => c.parentId == null)
  const childLevel = allComments.filter((c) => c.parentId != null)

  const map = new Map<number, number>()
  let nextCid = 0

  // Top-level
  for (const c of topLevel) {
    nextCid++
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, cid: _cid, courseId: _cId, userId: _u, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = c
    const [inserted] = await tx.insert(schema.comments).values({
      ...rest,
      courseId: newCourseId,
      cid: nextCid,
      parentId: null,
      userId: currentUserId,
    }).returning()
    if (inserted) map.set(Number(c.cid), inserted.cid)
  }

  // Children: parentId comes from commentMap
  for (const c of childLevel) {
    nextCid++
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, cid: _cid, courseId: _cId, userId: _u, createdAt: _ca, updatedAt: _ua, deletedAt: _da, parentId, ...rest } = c
    const newParentId = map.get(Number(parentId)) || null
    const [inserted] = await tx.insert(schema.comments).values({
      ...rest,
      courseId: newCourseId,
      cid: nextCid,
      parentId: newParentId,
      userId: currentUserId,
    }).returning()
    if (inserted) map.set(Number(c.cid), inserted.cid)
  }

  return map
}
