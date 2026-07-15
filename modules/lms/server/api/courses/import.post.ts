/**
 * Course import: restore a course from the JSON output of the export API
 * POST /api/courses/import
 * body: { data: <export JSON>, categoryId?: number }
 *
 * Auth: admin only
 *
 * By default creates a brand new category (named after the course) and places the course in it.
 * If categoryId is provided, the specified category is used.
 *
 * Restore order (within a transaction):
 * 1. Create a new category (or use the specified categoryId)
 * 2. Create the course to get the new courseId (orders is written as an empty array first)
 * 3. Batch insert questions → build oldCid → newCid mapping
 * 4. Batch insert homeworks / quizzes / races
 * 5. Insert comments: top-level first then children, parentId rewritten via the mapping
 * 6. Insert chapters: cid references in vue nodes within content are rewritten via the mapping
 * 7. Update course.orders: numeric ids (chapters) are rewritten via the mapping
 *
 * Any step failure rolls back the entire transaction.
 */
import { db } from '@nuxthub/db'
import { resolveCategory, createCourse } from '../../utils/courseImport/category'
import { importQuestions, importHomeworks, importQuizzes, importRaces } from '../../utils/courseImport/entities'
import { importComments } from '../../utils/courseImport/comments'
import { importChapters } from '../../utils/courseImport/chapters'
import { remapOrders, updateCourseOrders } from '../../utils/courseImport/orders'
import type { ExportedData, IdMaps } from '../../utils/courseImport/types'

export default eventHandler(async (event) => {
  const currentUser = await requireAdmin(event)

  const body = await readBody(event)
  const { data, categoryId: overrideCategoryId } = body as { data: ExportedData, categoryId?: number }

  // 1. Top-level validation
  if (!data || !data.course || !Array.isArray(data.chapters)) {
    return cResp(null, 'Invalid import data format', false)
  }
  if (data.version !== 1) {
    return cResp(null, `Unsupported import version: ${data.version}`, false)
  }

  // 2. Transaction: execute the entire restore flow
  try {
    const result = await db.transaction(async (tx) => {
      const categoryId = await resolveCategory(tx, data.course, overrideCategoryId)
      const newCourseId = await createCourse(tx, data.course, categoryId)

      // Insert each typeof sub-table, building oldCid → newCid mappings
      const questionMap = await importQuestions(tx, data.questions, newCourseId)
      const homeworkMap = await importHomeworks(tx, data.homeworks, newCourseId)
      const quizMap = await importQuizzes(tx, data.quizzes, newCourseId)
      const raceMap = await importRaces(tx, data.races, newCourseId, questionMap)
      const commentMap = await importComments(tx, data.comments, newCourseId, currentUser.id)

      const idMaps: IdMaps = { question: questionMap, homework: homeworkMap, comment: commentMap, quiz: quizMap }
      const chapterIdMap = await importChapters(tx, data.chapters, newCourseId, idMaps)

      // Backfill course.orders (numeric id → new chapter id)
      const newOrders = remapOrders(data.course.orders as any[], chapterIdMap)
      await updateCourseOrders(tx, newCourseId, newOrders)

      return {
        courseId: newCourseId,
        categoryId,
        chapters: chapterIdMap.size,
        questions: questionMap.size,
        homeworks: homeworkMap.size,
        comments: commentMap.size,
        quizzes: quizMap.size,
        races: raceMap.size,
      }
    })

    // Import creates a new category + new course, need to notify all clients to refresh the home navigation
    broadcastToAll({ type: 'home-changed', reason: 'courses.import' })
    return cResp(result)
  } catch (error: any) {
    console.error('Course import failed:', error)
    return cResp(null, error.message || 'Import failed', false)
  }
})
