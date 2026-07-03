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

    // 计算经验值：首次提交 vs 重新提交
    const gainedExp = existing ? hConfig.resubmitExp : hConfig.submitExp

    if (existing) {
      // 已有记录：更新
      await db.update(schema.userHomeworks).set({
        files: files || null,
        content: content || null,
      }).where(and(
        eq(schema.userHomeworks.userId, user.id),
        eq(schema.userHomeworks.courseId, courseId),
        eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
      ))
    } else {
      // 新记录：插入
      await db.insert(schema.userHomeworks).values({
        userId: user.id,
        courseId,
        homeworkCid: Number(homework_cid),
        files: files || null,
        content: content || null,
      })
    }

    // 作业提交不直接加分（分数由教师打分后通过 score API 更新）
    // 只更新经验值
    await addCourseScore(user.id, courseId, 0, 'homeworkScore', gainedExp)

    return cResp({ gainedExp })
  } catch (error: any) {
    console.error('提交作业失败:', error)
    return cResp(null, error.statusMessage || '提交失败', false)
  }
})
