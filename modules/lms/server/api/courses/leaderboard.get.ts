/**
 * Leaderboard: top 10 + current user's rank for a class in a course
 * GET /api/courses/leaderboard?courseId=1&classId=2
 *
 * Returns only userId + score; student info is merged by the frontend from useClassUsers cache
 * Returns at least 10 records; students without a score get score=0 to fill the slots
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
    const user = await requireAuth(event)
    const courseId = Number(getQuery(event).courseId)
    const classId = Number(getQuery(event).classId) || 0
    if (!courseId) return cResp(null, 'Missing courseId', false)
    if (!classId) return cResp(null, 'Missing classId', false)

    // Get all students in this class
    const classUsers = await getClassUsers(classId, courseId)
    const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
    if (studentIds.length === 0) return cResp({ top10: [], myRank: null, myInfo: null })

    // Query the scores of these students in this course
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

    // Merge: use actual score when present, otherwise 0 (ensures at least 10)
    const scoreMap = new Map(rows.map(r => [r.userId, Number(r.score) || 0]))
    const allStudents = studentIds.map(userId => ({
        userId,
        score: scoreMap.get(userId) ?? 0,
    })).sort((a, b) => b.score - a.score)

    // Return all students (with scores, padded with 0); the frontend ClassUsersTable shows the full table
    const myRank = allStudents.findIndex(s => s.userId === user.id)
    const myInfo = myRank >= 0 ? { userId: user.id, score: allStudents[myRank].score } : null

    return cResp({
        top10: allStudents,
        myRank: myRank >= 0 ? myRank + 1 : null,
        myInfo,
    })
})
