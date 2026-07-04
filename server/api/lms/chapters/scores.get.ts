/**
 * 章节得分：获取指定班级所有学生在某章节的得分及题目/作业/评论完成状态
 * GET /api/lms/chapters/scores?chapterId=1&classId=2&courseId=3
 *
 * 返回每个学生的章节分数 + 各 task（question/homework/comment）状态，
 * 前端用 taskDot 组件渲染状态点。
 * 仅教师/管理员可调用。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

type ItemStatus = 'done' | 'partial' | 'todo'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const chapterId = Number(query.chapterId)
  const classId = Number(query.classId) || 0
  const courseId = Number(query.courseId) || 0
  if (!chapterId) return cResp(null, '缺少 chapterId', false)
  if (!classId) return cResp(null, '缺少 classId', false)

  // 权限校验：教师或管理员
  const canView = user.roles.includes('admin') || (courseId > 0 && await isCourseTeacher(user.id, courseId))
  if (!canView) return cResp(null, '无权限', false)

  // 获取章节的 task IDs
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

  if (!chapter[0]) return cResp(null, '章节不存在', false)

  const ch = chapter[0]
  const cid = ch.courseId
  const qIds = (ch.questionIds as number[] | null) || []
  const hIds = (ch.homeworkIds as number[] | null) || []
  const cIds = (ch.commentIds as number[] | null) || []

  // 获取班级学生
  const classUsers = await getClassUsers(classId, cid)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
  if (studentIds.length === 0) return cResp([])

  // 查询章节得分
  const userChapters = await db
    .select({
      userId: schema.userChapters.userId,
      score: schema.userChapters.score,
    })
    .from(schema.userChapters)
    .where(and(
      eq(schema.userChapters.chapterId, chapterId),
      inArray(schema.userChapters.userId, studentIds),
    ))
  const scoreMap = new Map<number, number>()
  for (const uc of userChapters) {
    scoreMap.set(uc.userId, Number(uc.score) || 0)
  }

  // 批量查询题目完成情况
  const questionStatusMap = new Map<string, ItemStatus>() // key: userId:questionCid
  if (qIds.length > 0) {
    const uqs = await db
      .select({
        userId: schema.userQuestions.userId,
        questionCid: schema.userQuestions.questionCid,
        correctRate: schema.userQuestions.correctRate,
      })
      .from(schema.userQuestions)
      .where(and(
        eq(schema.userQuestions.courseId, cid),
        inArray(schema.userQuestions.userId, studentIds),
        inArray(schema.userQuestions.questionCid, [...new Set(qIds)]),
      ))
    for (const q of uqs) {
      const rate = Number(q.correctRate) || 0
      questionStatusMap.set(`${q.userId}:${q.questionCid}`, rate >= 1 ? 'done' : 'partial')
    }
  }

  // 批量查询作业提交情况
  const homeworkStatusMap = new Map<string, ItemStatus>()
  if (hIds.length > 0) {
    const uhs = await db
      .select({
        userId: schema.userHomeworks.userId,
        homeworkCid: schema.userHomeworks.homeworkCid,
      })
      .from(schema.userHomeworks)
      .where(and(
        eq(schema.userHomeworks.courseId, cid),
        inArray(schema.userHomeworks.userId, studentIds),
        inArray(schema.userHomeworks.homeworkCid, [...new Set(hIds)]),
      ))
    for (const h of uhs) {
      homeworkStatusMap.set(`${h.userId}:${h.homeworkCid}`, 'done')
    }
  }

  // 批量查询评论互动情况
  const commentStatusMap = new Map<string, ItemStatus>()
  if (cIds.length > 0) {
    const ucs = await db
      .select({
        userId: schema.userComments.userId,
        commentCid: schema.userComments.commentCid,
      })
      .from(schema.userComments)
      .where(and(
        eq(schema.userComments.courseId, cid),
        inArray(schema.userComments.userId, studentIds),
        inArray(schema.userComments.commentCid, [...new Set(cIds)]),
      ))
    for (const c of ucs) {
      commentStatusMap.set(`${c.userId}:${c.commentCid}`, 'done')
    }
  }

  // 组装结果
  const result = studentIds.map(uid => {
    const items = [
      ...qIds.map(id => ({ id, type: 'question' as const, status: questionStatusMap.get(`${uid}:${id}`) || 'todo' as ItemStatus })),
      ...hIds.map(id => ({ id, type: 'homework' as const, status: homeworkStatusMap.get(`${uid}:${id}`) || 'todo' as ItemStatus })),
      ...cIds.map(id => ({ id, type: 'comment' as const, status: commentStatusMap.get(`${uid}:${id}`) || 'todo' as ItemStatus })),
    ]
    return {
      userId: uid,
      score: scoreMap.get(uid) || 0,
      items,
    }
  })

  return cResp(result)
})
