/**
 * 各班在本课程的生均得分排行
 * GET /api/courses/class-leaderboard?courseId=1
 *
 * 生均得分 = 该班在本课程选课学生的 score 之和 ÷ 选课学生人数。
 * 仅统计学生成员（排除教师），未在该课程选课的学生不计入该班。
 * 一个用户如属于多个班级，则其得分计入每个所属班。
 *
 * 教师 / 测试 / 观察者等系统班级（class code = teacher / test / observer）不参与班级排名。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, isNull } from 'drizzle-orm'

// 系统/教工班级编码：不参与班级排行（教师班、测试班、观察者班）
const NON_STUDENT_CLASS_CODES = new Set(['teacher', 'test', 'observer'])

export default eventHandler(async (event) => {
    await requireAuth(event)
    const courseId = Number(getQuery(event).courseId)
    if (!courseId) return cResp(null, '缺少 courseId', false)

    // 该课程所有选课用户及得分
    const enrolled = await db
        .select({
            userId: schema.userCourses.userId,
            score: schema.userCourses.score,
        })
        .from(schema.userCourses)
        .where(and(
            eq(schema.userCourses.courseId, courseId),
            isNull(schema.userCourses.deletedAt),
        ))
    if (enrolled.length === 0) return cResp({ rows: [] })

    const userIds = enrolled.map(r => r.userId)
    const scoreMap = new Map(enrolled.map(r => [r.userId, Number(r.score) || 0]))

    // 用户 → 班级映射（合并且仅统计学生成员，教师不计入）
    const userClasses = new Map<number, Set<number>>()
    const addMember = (uid: number, cid: number) => {
        if (!cid || !userIds.includes(uid)) return
        if (!userClasses.has(uid)) userClasses.set(uid, new Set())
        userClasses.get(uid)!.add(cid)
    }

    const relMembers = await db
        .select({
            userId: schema.userClasses.userId,
            classId: schema.userClasses.classId,
            isTeacher: schema.userClasses.isTeacher,
        })
        .from(schema.userClasses)
        .where(and(
            inArray(schema.userClasses.userId, userIds),
            isNull(schema.userClasses.deletedAt),
        ))
    // 教师（在同班级的 user_classes 中标记 isTeacher）不计入生均
    const teacherPairs = new Set<string>()
    for (const m of relMembers) {
        if (m.isTeacher) teacherPairs.add(`${m.userId}:${m.classId}`)
        else addMember(m.userId, m.classId)
    }

    const directMembers = await db
        .select({ id: schema.users.id, classId: schema.users.classId })
        .from(schema.users)
        .where(and(inArray(schema.users.id, userIds), isNull(schema.users.deletedAt)))
    for (const u of directMembers) {
        if (u.classId && !teacherPairs.has(`${u.id}:${u.classId}`)) addMember(u.id, u.classId)
    }

    if (userClasses.size === 0) return cResp({ rows: [] })

    // 按班级汇总：人数 + 总分
    const agg = new Map<number, { count: number, sum: number }>()
    for (const [uid, classSet] of userClasses) {
        const score = scoreMap.get(uid) ?? 0
        for (const cid of classSet) {
            const a = agg.get(cid) || { count: 0, sum: 0 }
            a.count += 1
            a.sum += score
            agg.set(cid, a)
        }
    }

    const classIds = [...agg.keys()]
    const classes = await db
        .select({ id: schema.classes.id, name: schema.classes.name, code: schema.classes.code })
        .from(schema.classes)
        .where(inArray(schema.classes.id, classIds))
    const nameMap = new Map(classes.map(c => [c.id, c.name]))

    // 教师/测试/观察者等系统班级不参与排名（按 code 判断，code 缺失时回退班级名）
    const excludedClassIds = new Set(
        classes
            .filter(c => NON_STUDENT_CLASS_CODES.has(String(c.code || c.name || '').toLowerCase()))
            .map(c => c.id),
    )

    const rows = [...agg.entries()]
        .filter(([classId]) => !excludedClassIds.has(classId))
        .map(([classId, a]) => ({
            classId,
            name: nameMap.get(classId) || `Class ${classId}`,
            studentCount: a.count,
            scoreSum: Number(a.sum.toFixed(1)),
            avg: Number((a.sum / a.count).toFixed(1)),
        }))
        .sort((x, y) => y.avg - x.avg || y.studentCount - x.studentCount)
        .map((r, i) => ({ ...r, rank: i + 1 }))

    return cResp({ rows })
})