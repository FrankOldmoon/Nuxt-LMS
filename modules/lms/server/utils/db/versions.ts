/**
 * Content version snapshot / query / restore
 *
 * saveContentVersion / listContentVersions / getContentVersion / restoreContentVersion
 */
import { showTable, updateTable } from '../../../../base/server/utils/db/crud'
import { db, schema } from "@nuxthub/db"
import { eq, inArray, desc } from "drizzle-orm"

/**
 * Save a content version snapshot, keeping only the latest maxKeep entries
 * Called before updating the content of courses/chapters to record the old content for restoration
 */
export async function saveContentVersion(
  type: 'course' | 'chapter',
  id: number,
  content: any,
  maxKeep = 10,
) {
  const table = type === 'course' ? schema.courseVersions : schema.chapterVersions
  const fk = type === 'course' ? schema.courseVersions.courseId : schema.chapterVersions.chapterId

  // Insert old content snapshot
  if (type === 'course') {
    await db.insert(schema.courseVersions).values({ courseId: id, content })
  } else {
    await db.insert(schema.chapterVersions).values({ chapterId: id, content })
  }

  // Keep the latest maxKeep entries by id descending order, delete earlier versions
  const all = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(fk, id))
    .orderBy(desc(table.id))

  if (all.length > maxKeep) {
    const idsToDelete = all.slice(maxKeep).map((r) => r.id)
    await db.delete(table).where(inArray(table.id, idsToDelete))
  }
}

/**
 * Get the list of historical versions of the content (by id descending order)
 */
export async function listContentVersions(type: 'course' | 'chapter', id: number) {
  const table = type === 'course' ? schema.courseVersions : schema.chapterVersions
  const fk = type === 'course' ? schema.courseVersions.courseId : schema.chapterVersions.chapterId

  return db
    .select({
      id: table.id,
      content: table.content,
      createdAt: table.createdAt,
    })
    .from(table)
    .where(eq(fk, id))
    .orderBy(desc(table.id))
}

/**
 * Get a single version record by versionId
 */
export async function getContentVersion(type: 'course' | 'chapter', versionId: number) {
  const table = type === 'course' ? schema.courseVersions : schema.chapterVersions
  const rows = await db
    .select()
    .from(table)
    .where(eq(table.id, versionId))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Restore content to a specified version
 * First saves the current content as a version snapshot, then writes back the historical version content
 */
export async function restoreContentVersion(type: 'course' | 'chapter', id: number, content: any) {
  const tableName = type === 'course' ? 'courses' : 'chapters'
  const current = await showTable(tableName, id)
  const oldContent = (current as any)?.content
  if (oldContent !== undefined && oldContent !== null) {
    await saveContentVersion(type, id, oldContent)
  }
  await updateTable(tableName, id, { content })
}
