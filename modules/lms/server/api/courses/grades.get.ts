/**
 * Course grades: get the total score and sub-item scores of students in the specified class for this course
 * GET /api/courses/grades?courseId=1&classId=2
 *
 * Only returns userId + sub-item scores; student info is merged by the frontend from the useClassUsers cache
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const courseId = Number(query.courseId)
  const classId = Number(query.classId) || 0
  if (!courseId) return cResp(null, 'Missing courseId', false)
  if (!classId) return cResp(null, 'Missing classId', false)

  // Extract progress (chapter pass ratio, 0~100) from the records jsonb
  const extractProgress = (records: any): number => {
    if (!records || typeof records !== 'object') return 0
    const p = Number(records.progress)
    return isNaN(p) ? 0 : p
  }

  // Teachers or admins can view all grades; students can only view their own
  const isTeacher = await isCourseTeacher(user.id, courseId)
  if (!isTeacher && !user.roles.includes('admin')) {
    // Only return the student's own grades
    const myGrade = await db
      .select({
        userId: schema.userCourses.userId,
        score: schema.userCourses.score,
        questionScore: schema.userCourses.questionScore,
        homeworkScore: schema.userCourses.homeworkScore,
        quizScore: schema.userCourses.quizScore,
        commentScore: schema.userCourses.commentScore,
        raceScore: schema.userCourses.raceScore,
        marksScore: schema.userCourses.marksScore,
        extraScore: schema.userCourses.extraScore,
        records: schema.userCourses.records,
        group: schema.userCourses.group,
      })
      .from(schema.userCourses)
      .where(and(
        eq(schema.userCourses.courseId, courseId),
        eq(schema.userCourses.userId, user.id),
      ))
    // Attach the course's grading criteria (grade_criteria) for the frontend to convert to grade levels
    const courseRow = await db
      .select({ gradeCriteria: schema.courses.gradeCriteria })
      .from(schema.courses)
      .where(eq(schema.courses.id, courseId))
      .limit(1)
    if (myGrade.length === 0) return cResp({ grades: [], gradeCriteria: courseRow[0]?.gradeCriteria ?? null })
    const r = myGrade[0]!
    return cResp({
      grades: [{
        userId: r.userId,
        group: r.group || '',
        score: Number(r.score) || 0,
        questionScore: Number(r.questionScore) || 0,
        homeworkScore: Number(r.homeworkScore) || 0,
        quizScore: Number(r.quizScore) || 0,
        commentScore: Number(r.commentScore) || 0,
        raceScore: Number(r.raceScore) || 0,
        marksScore: Number(r.marksScore) || 0,
        extraScore: Number(r.extraScore) || 0,
        progress: extractProgress(r.records),
      }],
      gradeCriteria: courseRow[0]?.gradeCriteria ?? null,
    })
  }

  // Get student userIds of this class
  const classUsers = await getClassUsers(classId, courseId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
  if (studentIds.length === 0) return cResp([])

  // Query the grades of these students in this course
  const rows = await db
    .select({
      userId: schema.userCourses.userId,
      score: schema.userCourses.score,
      questionScore: schema.userCourses.questionScore,
      homeworkScore: schema.userCourses.homeworkScore,
      quizScore: schema.userCourses.quizScore,
      commentScore: schema.userCourses.commentScore,
      raceScore: schema.userCourses.raceScore,
      marksScore: schema.userCourses.marksScore,
      extraScore: schema.userCourses.extraScore,
      records: schema.userCourses.records,
      group: schema.userCourses.group,
    })
    .from(schema.userCourses)
    .where(and(
      eq(schema.userCourses.courseId, courseId),
      inArray(schema.userCourses.userId, studentIds),
    ))

  const result = rows
    .map(r => ({
      userId: r.userId,
      group: r.group || '',
      score: Number(r.score) || 0,
      questionScore: Number(r.questionScore) || 0,
      homeworkScore: Number(r.homeworkScore) || 0,
      quizScore: Number(r.quizScore) || 0,
      commentScore: Number(r.commentScore) || 0,
      raceScore: Number(r.raceScore) || 0,
      marksScore: Number(r.marksScore) || 0,
      extraScore: Number(r.extraScore) || 0,
      progress: extractProgress(r.records),
    }))
    .sort((a, b) => b.score - a.score)

  // Attach the course's grading criteria (grade_criteria) for the frontend to convert to grade levels
  const courseRow = await db
    .select({ gradeCriteria: schema.courses.gradeCriteria })
    .from(schema.courses)
    .where(eq(schema.courses.id, courseId))
    .limit(1)

  return cResp({
    grades: result,
    gradeCriteria: courseRow[0]?.gradeCriteria ?? null,
  })
})
