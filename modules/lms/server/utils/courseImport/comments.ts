/**
 * 课程导入：批量插入评论
 *
 * 评论可能有 parentId 指向另一条评论，所以需要两遍处理：
 *   1. 插入顶层（parentId = null）
 *   2. 插入子级（parentId 来自 commentMap）
 *
 * 使用 currentUser.id 作为 userId（原用户可能不存在）。
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

  // 顶层
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

  // 子级：parentId 来自 commentMap
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
