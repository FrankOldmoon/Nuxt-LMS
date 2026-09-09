/**
 * 课程成绩：获取指定班级在本课程的学生总分及各分项成绩
 * GET /api/courses/grades?courseId=1&classId=2
 *
 * 仅返回 userId + 各分项成绩，学生信息由前端从 useClassUsers 缓存合并
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const courseId = Number(query.courseId)
  const classId = Number(query.classId) || 0
  if (!courseId) return cResp(null, '缺少 courseId', false)

  // 从 records jsonb 中提取 progress（章节通过比，0~100）
  const extractProgress = (records: any): number => {
    if (!records || typeof records !== 'object') return 0
    const p = Number(records.progress)
    return isNaN(p) ? 0 : p
  }

  // 教师或管理员可查看所有成绩，学生只能看自己的
  // 注意：学生自我查询不依赖 classId（未分班学生也可查看自己的学习统计），故 classId 校验放在教师分支
  const isTeacher = await isCourseTeacher(user.id, courseId)
  if (!isTeacher && !user.roles.includes('admin')) {
    // 学生只返回自己的成绩
    const myGrade = await db
      .select({
        userId: schema.userCourses.userId,
        score: schema.userCourses.score,
        questionScore: schema.userCourses.questionScore,
        homeworkScore: schema.userCourses.homeworkScore,
        quizScore: schema.userCourses.quizScore,
        commentScore: schema.userCourses.commentScore,
        altitudeScore: schema.userCourses.altitudeScore,
        externalScore: schema.userCourses.externalScore,
        records: schema.userCourses.records,
        group: schema.userCourses.group,
      })
      .from(schema.userCourses)
      .where(and(
        eq(schema.userCourses.courseId, courseId),
        eq(schema.userCourses.userId, user.id),
      ))
    // 附带课程的评分标准（grade_criteria），供前端换算等第
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
        altitudeScore: Number(r.altitudeScore) || 0,
        externalScore: Number(r.externalScore) || 0,
        progress: extractProgress(r.records),
      }],
      gradeCriteria: courseRow[0]?.gradeCriteria ?? null,
    })
  }

  // 教师分支：需按班级列出学生，classId 必填
  if (!classId) return cResp(null, '缺少 classId', false)

  // 获取该班级学生 userIds
  const classUsers = await getClassUsers(classId, courseId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
  if (studentIds.length === 0) return cResp([])

  // 查询这些学生在本课程的成绩
  const rows = await db
    .select({
      userId: schema.userCourses.userId,
      score: schema.userCourses.score,
      questionScore: schema.userCourses.questionScore,
      homeworkScore: schema.userCourses.homeworkScore,
      quizScore: schema.userCourses.quizScore,
      commentScore: schema.userCourses.commentScore,
      altitudeScore: schema.userCourses.altitudeScore,
      externalScore: schema.userCourses.externalScore,
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
      altitudeScore: Number(r.altitudeScore) || 0,
      externalScore: Number(r.externalScore) || 0,
      progress: extractProgress(r.records),
    }))
    .sort((a, b) => b.score - a.score)

  // 附带课程的评分标准（grade_criteria），供前端换算等第
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
