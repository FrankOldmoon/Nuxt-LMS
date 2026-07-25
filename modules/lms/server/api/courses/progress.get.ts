/**
 * 学习进度：获取当前用户在本课程所有章节的得分 + 题目/作业/评论完成状态
 * GET /api/courses/progress?courseId=1
 *
 * 返回每个 chapter 的 score 及其包含的 question/homework/comment 状态
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import {
  queryQuestionStatus,
  queryHomeworkStatus,
  queryCommentStatus,
  queryUserChapterScores,
} from '../../utils/courseProgress/query'
import { computeChapterAccessibility } from '../../utils/courseProgress/access'
import { collectAllItemCids, assembleProgress } from '../../utils/courseProgress/assemble'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp([], '缺少 courseId', false)

  // 1. 拉取课程所有章节 + 收集所有 item ids
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

  const { allQuestionCids, allHomeworkCids, allCommentCids } = collectAllItemCids(chapters)
  const chapterIds = chapters.map(ch => ch.id)

  // 2. 批量查状态 / 得分（并发）
  const [questionStatusMap, homeworkStatusMap, commentStatusMap, { scoreMap, passMap }] = await Promise.all([
    queryQuestionStatus(user.id, courseId, allQuestionCids),
    queryHomeworkStatus(user.id, courseId, allHomeworkCids),
    queryCommentStatus(user.id, courseId, allCommentCids),
    queryUserChapterScores(user.id, chapterIds),
  ])

  // 3. 可访问性
  const accessibleSet = await computeChapterAccessibility(user, courseId, chapters)

  // 4. 装配
  return cResp(assembleProgress(chapters, {
    questionStatusMap, homeworkStatusMap, commentStatusMap, scoreMap, passMap, accessibleSet,
  }))
})
