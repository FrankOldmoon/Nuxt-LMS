/**
 * 课程导入：批量插入章节
 *
 * 章节 content 中 vue 节点引用 cid 需要用 maps 全部重写。
 * 同时记录「旧 chapter id → 新 chapter id」映射（用于回填 course.orders）。
 */
import { db, schema } from '@nuxthub/db'
import type { ChapterIdMap, IdMaps } from './types'
import { remapContentIds, remapIdArray } from './remap'

export async function importChapters(
  tx: typeof db,
  chapters: any[],
  newCourseId: number,
  maps: IdMaps,
): Promise<ChapterIdMap> {
  const chapterIdMap: ChapterIdMap = new Map()
  for (const ch of chapters) {
    const oldChapterId = Number(ch.id)
    const newContent = remapContentIds(ch.content, {
      question: maps.question,
      homework: maps.homework,
      comment: maps.comment,
      quiz: maps.quiz,
    })
    const [inserted] = await tx.insert(schema.chapters).values({
      name: ch.name,
      code: ch.code || null,
      content: newContent,
      tags: ch.tags || [],
      questionIds: remapIdArray(ch.questionIds, maps.question),
      homeworkIds: remapIdArray(ch.homeworkIds, maps.homework),
      commentIds: remapIdArray(ch.commentIds, maps.comment),
      quizIds: remapIdArray(ch.quizIds, maps.quiz),
      objectives: ch.objectives || [],
      tasks: ch.tasks || [],
      courseId: newCourseId,
      isOpen: !!ch.isOpen,
    }).returning()
    if (inserted && Number.isFinite(oldChapterId) && oldChapterId > 0) {
      chapterIdMap.set(oldChapterId, inserted.id)
    }
  }
  return chapterIdMap
}
