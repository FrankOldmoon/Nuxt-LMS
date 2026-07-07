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
  if (!classId) return cResp(null, '缺少 classId', false)

  // 教师或管理员可查看所有成绩，学生只能看自己的
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
        raceScore: schema.userCourses.raceScore,
        exp: schema.userCourses.exp,
        group: schema.userCourses.group,
      })
      .from(schema.userCourses)
      .where(and(
        eq(schema.userCourses.courseId, courseId),
        eq(schema.userCourses.userId, user.id),
      ))
    if (myGrade.length === 0) return cResp([])
    const r = myGrade[0]
    return cResp([{
      userId: r.userId,
      group: r.group || '',
      score: Number(r.score) || 0,
      questionScore: Number(r.questionScore) || 0,
      homeworkScore: Number(r.homeworkScore) || 0,
      quizScore: Number(r.quizScore) || 0,
      commentScore: Number(r.commentScore) || 0,
      raceScore: Number(r.raceScore) || 0,
      exp: r.exp || 0,
    }])
  }

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
      raceScore: schema.userCourses.raceScore,
      exp: schema.userCourses.exp,
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
      exp: r.exp || 0,
    }))
    .sort((a, b) => b.score - a.score)

  return cResp(result)
})
