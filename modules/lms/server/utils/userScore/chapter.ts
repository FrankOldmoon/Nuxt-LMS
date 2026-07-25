/**
 * 章节分数：addChapterScore
 */
import { db, schema } from '@nuxthub/db'
import { findUserChapter, updateUserChapter } from './upsert'

/**
 * 更新 userChapters 的 score（加分）
 */
export async function addChapterScore(userId: number, chapterId: number, score: number) {
  if (!chapterId || score === 0) return
  const existing = await findUserChapter(userId, chapterId)
  if (existing) {
    await updateUserChapter(userId, chapterId, {
      score: String((Number(existing.score) || 0) + score),
    })
  } else {
    await db.insert(schema.userChapters).values({ userId, chapterId, score: String(score) })
  }
}
