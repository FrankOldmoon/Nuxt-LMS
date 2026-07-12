/**
 * 章节得分：获取指定班级所有学生在某章节的得分及题目/作业/评论完成状态
 * GET /api/chapters/scores?chapterId=1&classId=2&courseId=3
 *
 * 返回每个学生的章节分数 + 各 task（question/homework/comment）状态，
 * 前端用 taskDot 组件渲染状态点。
 * 仅教师/管理员可调用。
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import {
  queryStudentQuestionStatus,
  queryStudentHomeworkStatus,
  queryStudentCommentStatus,
  queryStudentChapterScores,
} from '../../utils/chapterScores/query'
import { assembleChapterScores } from '../../utils/chapterScores/assemble'


export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const chapterId = Number(query.chapterId)
  const classId = Number(query.classId) || 0
  const courseId = Number(query.courseId) || 0
  if (!chapterId) return cResp(null, '缺少 chapterId', false)
  if (!classId) return cResp(null, '缺少 classId', false)

  // 1. 权限校验：教师或管理员
  const canView = user.roles.includes('admin') || (courseId > 0 && await isCourseTeacher(user.id, courseId))
  if (!canView) return cResp(null, '无权限', false)

  // 2. 章节信息（含 cids 列表）
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

  // 3. 班级学生（排除教师）
  const classUsers = await getClassUsers(classId, cid)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
  if (studentIds.length === 0) return cResp([])

  // 4. 批量查状态 / 得分（并发）
  const [questionStatusMap, homeworkStatusMap, commentStatusMap, scoreMap] = await Promise.all([
    queryStudentQuestionStatus(cid, studentIds, qIds),
    queryStudentHomeworkStatus(cid, studentIds, hIds),
    queryStudentCommentStatus(cid, studentIds, cIds),
    queryStudentChapterScores(chapterId, studentIds),
  ])

  // 5. 装配（含每学生 taskStatus；progress 由前端用章节 headings 计算）
  return cResp(assembleChapterScores(studentIds, qIds, hIds, cIds, scoreMap, questionStatusMap, homeworkStatusMap, commentStatusMap))
})
