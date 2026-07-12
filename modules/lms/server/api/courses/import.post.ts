/**
 * 课程导入：从 export API 输出的 JSON 还原课程
 * POST /api/courses/import
 * body: { data: <export JSON>, categoryId?: number }
 *
 * 鉴权：仅管理员
 *
 * 默认创建一个全新的分类（以课程名命名），将课程放入其中。
 * 若传入 categoryId 则使用指定分类。
 *
 * 还原顺序（事务内）：
 * 1. 创建新分类（或使用指定 categoryId）
 * 2. 创建 course 拿到新 courseId（orders 先写空数组）
 * 3. 批量插入 questions → 建立 oldCid → newCid 映射
 * 4. 批量插入 homeworks / quizzes / races
 * 5. 插入 comments：先顶层后子级，parentId 用映射重写
 * 6. 插入 chapters：content 中 vue 节点引用 cid 用映射重写
 * 7. 更新 course.orders：数字 id（章节）用映射重写
 *
 * 任何一步失败整笔回滚。
 */
import { db } from '@nuxthub/db'
import { resolveCategory, createCourse } from '../../utils/courseImport/category'
import { importQuestions, importHomeworks, importQuizzes, importRaces } from '../../utils/courseImport/entities'
import { importComments } from '../../utils/courseImport/comments'
import { importChapters } from '../../utils/courseImport/chapters'
import { remapOrders, updateCourseOrders } from '../../utils/courseImport/orders'
import type { ExportedData, IdMaps } from '../../utils/courseImport/types'

export default eventHandler(async (event) => {
  const currentUser = await requireAdmin(event)

  const body = await readBody(event)
  const { data, categoryId: overrideCategoryId } = body as { data: ExportedData, categoryId?: number }

  // 1. 顶层校验
  if (!data || !data.course || !Array.isArray(data.chapters)) {
    return cResp(null, '导入数据格式无效', false)
  }
  if (data.version !== 1) {
    return cResp(null, `不支持的导入版本: ${data.version}`, false)
  }

  // 2. 事务：执行整套还原流程
  try {
    const result = await db.transaction(async (tx) => {
      const categoryId = await resolveCategory(tx, data.course, overrideCategoryId)
      const newCourseId = await createCourse(tx, data.course, categoryId)

      // 插入各类型子表，建立 oldCid → newCid 映射
      const questionMap = await importQuestions(tx, data.questions, newCourseId)
      const homeworkMap = await importHomeworks(tx, data.homeworks, newCourseId)
      const quizMap = await importQuizzes(tx, data.quizzes, newCourseId)
      const raceMap = await importRaces(tx, data.races, newCourseId, questionMap)
      const commentMap = await importComments(tx, data.comments, newCourseId, currentUser.id)

      const idMaps: IdMaps = { question: questionMap, homework: homeworkMap, comment: commentMap, quiz: quizMap }
      const chapterIdMap = await importChapters(tx, data.chapters, newCourseId, idMaps)

      // 回填 course.orders（数字 id → 新章节 id）
      const newOrders = remapOrders(data.course.orders as any[], chapterIdMap)
      await updateCourseOrders(tx, newCourseId, newOrders)

      return {
        courseId: newCourseId,
        categoryId,
        chapters: chapterIdMap.size,
        questions: questionMap.size,
        homeworks: homeworkMap.size,
        comments: commentMap.size,
        quizzes: quizMap.size,
        races: raceMap.size,
      }
    })

    // 导入会创建新分类 + 新课程，需要通知所有客户端刷新首页导航
    broadcastToAll({ type: 'home-changed', reason: 'courses.import' })
    return cResp(result)
  } catch (error: any) {
    console.error('课程导入失败:', error)
    return cResp(null, error.message || '导入失败', false)
  }
})
