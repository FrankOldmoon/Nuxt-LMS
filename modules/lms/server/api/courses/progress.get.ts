/**
 * 学习进度：获取当前用户在本课程所有章节的得分 + 题目/作业/评论完成状态
 * GET /api/courses/progress?courseId=1
 *
 * 返回每个 chapter 的 score 及其包含的 question/homework/comment 状态
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

/** 状态枚举 */
type ItemStatus = 'done' | 'partial' | 'todo'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp([], '缺少 courseId', false)

  // 查询课程所有章节（含 questionIds / homeworkIds / commentIds）
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

  // 收集所有需要查询的 item IDs
  const allQuestionCids: number[] = []
  const allHomeworkCids: number[] = []
  const allCommentCids: number[] = []

  for (const ch of chapters) {
    const qIds = ch.questionIds as number[] | null
    const hIds = ch.homeworkIds as number[] | null
    const cIds = ch.commentIds as number[] | null
    if (qIds?.length) allQuestionCids.push(...qIds)
    if (hIds?.length) allHomeworkCids.push(...hIds)
    if (cIds?.length) allCommentCids.push(...cIds)
  }

  // 批量查询用户的题目完成情况
  let questionStatusMap = new Map<number, ItemStatus>()
  if (allQuestionCids.length > 0) {
    const uqs = await db
      .select({ questionCid: schema.userQuestions.questionCid, correctRate: schema.userQuestions.correctRate })
      .from(schema.userQuestions)
      .where(and(
        eq(schema.userQuestions.userId, user.id),
        eq(schema.userQuestions.courseId, courseId),
        inArray(schema.userQuestions.questionCid, [...new Set(allQuestionCids)]),
      ))
    for (const q of uqs) {
      const rate = Number(q.correctRate) || 0
      questionStatusMap.set(q.questionCid, rate >= 1 ? 'done' : 'partial')
    }
  }

  // 批量查询用户的作业提交情况
  let homeworkStatusMap = new Map<number, ItemStatus>()
  if (allHomeworkCids.length > 0) {
    const uhs = await db
      .select({ homeworkCid: schema.userHomeworks.homeworkCid })
      .from(schema.userHomeworks)
      .where(and(
        eq(schema.userHomeworks.userId, user.id),
        eq(schema.userHomeworks.courseId, courseId),
        inArray(schema.userHomeworks.homeworkCid, [...new Set(allHomeworkCids)]),
      ))
    for (const h of uhs) {
      homeworkStatusMap.set(h.homeworkCid, 'done')
    }
  }

  // 批量查询用户的评论互动情况
  let commentStatusMap = new Map<number, ItemStatus>()
  if (allCommentCids.length > 0) {
    const ucs = await db
      .select({ commentCid: schema.userComments.commentCid })
      .from(schema.userComments)
      .where(and(
        eq(schema.userComments.userId, user.id),
        eq(schema.userComments.courseId, courseId),
        inArray(schema.userComments.commentCid, [...new Set(allCommentCids)]),
      ))
    for (const c of ucs) {
      commentStatusMap.set(c.commentCid, 'done')
    }
  }

  // 查询章节得分及通过状态
  const chapterIds = chapters.map(ch => ch.id)
  const userChapters = chapterIds.length > 0
    ? await db
        .select()
        .from(schema.userChapters)
        .where(and(
          eq(schema.userChapters.userId, user.id),
          inArray(schema.userChapters.chapterId, chapterIds)
        ))
    : []

  const scoreMap = new Map()
  const passMap = new Map<number, boolean>()
  for (const uc of userChapters) {
    scoreMap.set(uc.chapterId, Number(uc.score) || 0)
    passMap.set(uc.chapterId, !!uc.isPass)
  }

  // 计算每个章节对当前用户的可访问性（与 courses/show 逻辑一致）
  const isAdmin = user?.roles?.includes('admin')
  const isTeacher = await isCourseTeacher(user.id, courseId)
  const canEditAll = isAdmin || isTeacher

  let accessibleSet: Set<number>
  if (canEditAll) {
    // 教师/管理员：所有章节都可访问
    accessibleSet = new Set(chapters.map(ch => ch.id))
  } else {
    accessibleSet = new Set<number>()
    // 1. is_open=true 的章节
    for (const ch of chapters) {
      if (ch.isOpen) accessibleSet.add(ch.id)
    }
    // 2. 用户班级 open 的章节
    const userClassRows = await db
      .select({ classId: schema.userClasses.classId })
      .from(schema.userClasses)
      .where(eq(schema.userClasses.userId, user.id))
    const userClassIds = userClassRows.map(r => r.classId)

    if (userClassIds.length > 0 && chapterIds.length > 0) {
      const classChapters = await db
        .select({ chapterId: schema.classChapters.chapterId })
        .from(schema.classChapters)
        .where(and(
          inArray(schema.classChapters.classId, userClassIds),
          inArray(schema.classChapters.chapterId, chapterIds),
          eq(schema.classChapters.open, true),
        ))
      for (const cc of classChapters) {
        accessibleSet.add(cc.chapterId)
      }
    }
  }

  const result = chapters.map(ch => {
    const qIds = (ch.questionIds as number[] | null) || []
    const hIds = (ch.homeworkIds as number[] | null) || []
    const cIds = (ch.commentIds as number[] | null) || []

    const items = [
      ...qIds.map(id => ({ id, type: 'question', status: questionStatusMap.get(id) || 'todo' })),
      ...hIds.map(id => ({ id, type: 'homework', status: homeworkStatusMap.get(id) || 'todo' })),
      ...cIds.map(id => ({ id, type: 'comment', status: commentStatusMap.get(id) || 'todo' })),
    ]

    return {
      chapterId: ch.id,
      chapterName: ch.name,
      score: scoreMap.get(ch.id) || 0,
      isPass: passMap.get(ch.id) || false,
      isOpen: !!ch.isOpen,
      accessible: accessibleSet.has(ch.id),
      items,
    }
  })

  return cResp(result)
})
