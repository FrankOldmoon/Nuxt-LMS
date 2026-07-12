/**
 * 内容版本快照 / 查询 / 恢复
 *
 * saveContentVersion / listContentVersions / getContentVersion / restoreContentVersion
 */
import { showTable, updateTable } from '../../../../base/server/utils/db/crud'
import { db, schema } from "@nuxthub/db"
import { eq, inArray, desc } from "drizzle-orm"

/**
 * 保存内容版本快照，并只保留最新的 maxKeep 条
 * 在更新 courses/chapters 的 content 之前调用，记录旧内容以便恢复
 */
export async function saveContentVersion(
  type: 'course' | 'chapter',
  id: number,
  content: any,
  maxKeep = 10,
) {
  const table = type === 'course' ? schema.courseVersions : schema.chapterVersions
  const fk = type === 'course' ? schema.courseVersions.courseId : schema.chapterVersions.chapterId

  // 插入旧内容快照
  if (type === 'course') {
    await db.insert(schema.courseVersions).values({ courseId: id, content })
  } else {
    await db.insert(schema.chapterVersions).values({ chapterId: id, content })
  }

  // 按 id 倒序保留最新 maxKeep 条，删除更早的版本
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
 * 获取内容的历史版本列表（按 id 倒序）
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
 * 按 versionId 获取单个版本记录
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
 * 恢复内容到指定版本
 * 先将当前内容保存为版本快照，再写回历史版本内容
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
