import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, chapter_id, homework_cid, files, content } = body

  if (!course_id || !homework_cid) {
    return cResp(null, '缺少 course_id 或 homework_cid 参数', false)
  }

  const courseId = Number(course_id)
  const chapterId = Number(chapter_id) || 0

  // 读取课程级 LMS 配置
  const config = await getCourseLmsConfig(courseId)
  const hConfig = config.homework

  try {
    // 查找是否已有提交记录
    const existing = await db.query.userHomeworks.findFirst({
      where: and(
        eq(schema.userHomeworks.userId, user.id),
        eq(schema.userHomeworks.courseId, courseId),
        eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
      )
    })

    // 计算经验值：首次提交 vs 重新提交 + 次数上限防刷
    // 持久化重提交次数：使用 userHomeworks.record._submitCount 字段
    // （_ 前缀表示内部使用，前端 records.get 不应依赖该字段）
    // maxResubmitCount 默认 3（可由 homework 配置覆盖），超出后 gainedExp=0
    const maxResubmitCount = Number(hConfig.maxResubmitCount ?? 3)
    const recordMeta: any = (existing?.record && typeof existing.record === 'object') ? existing.record : {}
    const prevResubmitCount = Number(recordMeta._submitCount || 0)
    const nextResubmitCount = prevResubmitCount + 1
    let gainedExp: number
    if (!existing) {
      // 首次提交
      gainedExp = hConfig.submitExp
    } else if (nextResubmitCount > maxResubmitCount) {
      // 超出重提交上限，不再发经验（仍允许更新内容）
      gainedExp = 0
    } else {
      // 在允许重提交次数内
      gainedExp = hConfig.resubmitExp
    }

    if (existing) {
      // 已有记录：更新
      const newRecord = { ...recordMeta, _submitCount: nextResubmitCount }
      await db.update(schema.userHomeworks).set({
        files: files || null,
        content: content || null,
        record: newRecord,
      }).where(and(
        eq(schema.userHomeworks.userId, user.id),
        eq(schema.userHomeworks.courseId, courseId),
        eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
      ))
    } else {
      // 新记录：插入
      const newRecord = { _submitCount: 0 }
      await db.insert(schema.userHomeworks).values({
        userId: user.id,
        courseId,
        homeworkCid: Number(homework_cid),
        files: files || null,
        content: content || null,
        record: newRecord,
      })
    }

    // 作业提交不直接加分（分数由教师打分后通过 score API 更新）
    // 只更新经验值
    await addCourseScore(user.id, courseId, 0, 'homeworkScore', gainedExp)

    // 检查并授予奖章
    await checkAndAwardMedals(user.id, courseId)

    return cResp({ gainedExp })
  } catch (error: any) {
    console.error('提交作业失败:', error)
    return cResp(null, error.message || '提交失败', false)
  }
})
