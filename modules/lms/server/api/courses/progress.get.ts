/**
 * Learning progress: get the current user's scores for all chapters in this course + question/homework/comment completion status
 * GET /api/courses/progress?courseId=1
 *
 * Returns each chapter's score and the status of the question/homework/comment it contains
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import {
  queryQuestionStatus,
  queryHomeworkStatus,
  queryCommentStatus,
  queryUserChapterScores,
} from '../../utils/courseProgress/query'
import { computeChapterAccessibility } from '../../utils/courseProgress/access'
import { collectAllItemCids, assembleProgress } from '../../utils/courseProgress/assemble'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp([], 'Missing courseId', false)

  // 1. Fetch all chapters of the course + collect all item ids
  const chapters = await db
    .select({
      id: schema.chapters.id,
      name: schema.chapters.name,
      isOpen: schema.chapters.isOpen,
      questionIds: schema.chapters.questionIds,
      homeworkIds: schema.chapters.homeworkIds,
      commentIds: schema.chapters.commentIds,
    })
    .from(schema.chapters)
    .where(eq(schema.chapters.courseId, courseId))

  const { allQuestionCids, allHomeworkCids, allCommentCids } = collectAllItemCids(chapters)
  const chapterIds = chapters.map(ch => ch.id)

  // 2. Batch query status / scores (concurrent)
  const [questionStatusMap, homeworkStatusMap, commentStatusMap, { scoreMap, passMap }] = await Promise.all([
    queryQuestionStatus(user.id, courseId, allQuestionCids),
    queryHomeworkStatus(user.id, courseId, allHomeworkCids),
    queryCommentStatus(user.id, courseId, allCommentCids),
    queryUserChapterScores(user.id, chapterIds),
  ])

  // 3. Accessibility
  const accessibleSet = await computeChapterAccessibility(user, courseId, chapters)

  // 4. Assemble
  return cResp(assembleProgress(chapters, {
    questionStatusMap, homeworkStatusMap, commentStatusMap, scoreMap, passMap, accessibleSet,
  }))
})
