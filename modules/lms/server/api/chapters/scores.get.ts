/**
 * Chapter scores: get the scores and question/homework/comment completion status of all students in a specified class for a chapter
 * GET /api/chapters/scores?chapterId=1&classId=2&courseId=3
 *
 * Returns each student's chapter score + the status of each task (question/homework/comment),
 * the frontend uses the taskDot component to render status dots.
 * Only teachers/admins can call this.
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import {
  queryStudentQuestionStatus,
  queryStudentHomeworkStatus,
  queryStudentCommentStatus,
  queryStudentChapterScores,
} from '../../utils/chapterScores/query'
import { assembleChapterScores } from '../../utils/chapterScores/assemble'


export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const chapterId = Number(query.chapterId)
  const classId = Number(query.classId) || 0
  const courseId = Number(query.courseId) || 0
  if (!chapterId) return cResp(null, 'Missing chapterId', false)
  if (!classId) return cResp(null, 'Missing classId', false)

  // 1. Permission check: teacher or admin
  const canView = user.roles.includes('admin') || (courseId > 0 && await isCourseTeacher(user.id, courseId))
  if (!canView) return cResp(null, 'No permission', false)

  // 2. Chapter info (including cids list)
  const chapter = await db
    .select({
      id: schema.chapters.id,
      courseId: schema.chapters.courseId,
      questionIds: schema.chapters.questionIds,
      homeworkIds: schema.chapters.homeworkIds,
      commentIds: schema.chapters.commentIds,
    })
    .from(schema.chapters)
    .where(eq(schema.chapters.id, chapterId))
    .limit(1)
  if (!chapter[0]) return cResp(null, 'Chapter does not exist', false)

  const ch = chapter[0]
  const cid = ch.courseId
  const qIds = (ch.questionIds as number[] | null) || []
  const hIds = (ch.homeworkIds as number[] | null) || []
  const cIds = (ch.commentIds as number[] | null) || []

  // 3. Class students (excluding teachers)
  const classUsers = await getClassUsers(classId, cid)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
  if (studentIds.length === 0) return cResp([])

  // 4. Batch query status / scores (concurrent)
  const [questionStatusMap, homeworkStatusMap, commentStatusMap, scoreMap] = await Promise.all([
    queryStudentQuestionStatus(cid, studentIds, qIds),
    queryStudentHomeworkStatus(cid, studentIds, hIds),
    queryStudentCommentStatus(cid, studentIds, cIds),
    queryStudentChapterScores(chapterId, studentIds),
  ])

  // 5. Assemble (including each student's taskStatus; progress is computed by the frontend using chapter headings)
  return cResp(assembleChapterScores(studentIds, qIds, hIds, cIds, scoreMap, questionStatusMap, homeworkStatusMap, commentStatusMap))
})
