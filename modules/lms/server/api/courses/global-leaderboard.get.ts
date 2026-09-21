/**
 * 全局排行：本课程得分前 10 名学生（跨班级）。
 * GET /api/courses/global-leaderboard?courseId=1
 *
 * 排除教师：
 *  - 课程内的教师 / 编辑者（user_courses.isTeacher / isEditor）
 *  - 拥有 teacher 角色的用户（user_roles → roles.code = 'teacher'）
 *
 * 每行附带班级 id / 班级名称（数据来源 users.class_id）。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
    await requireAuth(event)
    const courseId = Number(getQuery(event).courseId)
    if (!courseId) return cResp(null, '缺少 courseId', false)

    // 该课程所有选课用户及得分（同时取出课程内的教师/编辑者标记）
    const enrolled = await db
        .select({
            userId: schema.userCourses.userId,
            score: schema.userCourses.score,
            exp: schema.userCourses.exp,
            isTeacher: schema.userCourses.isTeacher,
            isEditor: schema.userCourses.isEditor,
        })
        .from(schema.userCourses)
        .where(and(
            eq(schema.userCourses.courseId, courseId),
            isNull(schema.userCourses.deletedAt),
        ))
    if (enrolled.length === 0) return cResp({ rows: [] })

    const userIds = enrolled.map(r => r.userId)

    // 拥有 teacher 角色的用户
    const teacherRoleRows = await db
        .select({ userId: schema.userRoles.userId })
        .from(schema.userRoles)
        .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
        .where(and(
            inArray(schema.userRoles.userId, userIds),
            eq(schema.roles.code, 'teacher'),
        ))
    const teacherIds = new Set<number>(teacherRoleRows.map(r => r.userId))

    // 仅保留学生：排除课程教师/编辑者 与 teacher 角色
    const students = enrolled.filter(r => !r.isTeacher && !r.isEditor && !teacherIds.has(r.userId))

    const classInfo = await getUserClassInfo(students.map(r => r.userId))

    const rows = students
        .map(r => {
            const info = classInfo.get(r.userId)
            return {
                userId: r.userId,
                name: info?.name || `User ${r.userId}`,
                avatarImg: info?.avatarImg ?? null,
                classId: info?.classId ?? null,
                className: info?.className ?? '',
                score: Number(r.score) || 0,
                exp: Number(r.exp) || 0,
            }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((r, i) => ({ ...r, rank: i + 1 }))

    return cResp({ rows })
})
