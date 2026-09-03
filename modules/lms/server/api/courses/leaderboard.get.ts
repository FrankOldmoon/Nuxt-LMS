/**
 * 排行榜：指定班级在本课程排名前10+当前用户排名
 * GET /api/courses/leaderboard?courseId=1&classId=2
 *
 * 仅返回 userId + score，学生信息由前端从 useClassUsers 缓存合并
 * 至少返回10条记录，无成绩者 score=0 补齐
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
    const user = await requireAuth(event)
    const courseId = Number(getQuery(event).courseId)
    const classId = Number(getQuery(event).classId) || 0
    if (!courseId) return cResp(null, '缺少 courseId', false)
    if (!classId) return cResp(null, '缺少 classId', false)

    // 获取该班级所有学生
    const classUsers = await getClassUsers(classId, courseId)
    const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
    if (studentIds.length === 0) return cResp({ top10: [], myRank: null, myInfo: null })

    // 查询这些学生在本课程的得分
    const rows = await db
        .select({
            userId: schema.userCourses.userId,
            score: schema.userCourses.score,
        })
        .from(schema.userCourses)
        .where(and(
            eq(schema.userCourses.courseId, courseId),
            inArray(schema.userCourses.userId, studentIds),
        ))

    // 合并：有成绩的用实际分，无成绩的补0（确保至少10条）
    const scoreMap = new Map(rows.map(r => [r.userId, Number(r.score) || 0]))
    const allStudents = studentIds.map(userId => ({
        userId,
        score: scoreMap.get(userId) ?? 0,
    })).sort((a, b) => b.score - a.score)

    // 我的排名（全程，不含截断）
    const myRank = allStudents.findIndex(s => s.userId === user.id)
    const myInfo = myRank >= 0 ? { userId: user.id, score: allStudents[myRank].score } : null

    return cResp({
        // 只返回前 10 名，供前端排行榜表格展示
        top10: allStudents.slice(0, 10),
        myRank: myRank >= 0 ? myRank + 1 : null,
        myInfo,
    })
})
