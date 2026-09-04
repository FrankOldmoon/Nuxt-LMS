import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

// 更新某课程的 LMS 配置局部（如弹幕开关），合并写入 courses.config.lmsConfig
// body: { course_id, danmaku: { enableDanmaku?, studentCanSend?, ... } }
export default eventHandler(async (event) => {
  const body = await readBody(event)
  const courseId = Number(body.course_id)
  if (!courseId) {
    return cResp(null, '缺少 course_id', false)
  }

  await requireCourseTeacher(event, courseId)

  // 仅接受本接口支持的配置节（白名单，防止误写其他配置）
  const danmaku = body.danmaku
  if (!danmaku || typeof danmaku !== 'object' || Array.isArray(danmaku)) {
    return cResp(null, '缺少有效的 danmaku 配置', false)
  }

  try {
    const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, courseId) })
    const config: any = course?.config || {}
    const lms: any = config.lmsConfig || {}
    lms.danmaku = { ...(lms.danmaku || {}), ...danmaku }
    await db.update(schema.courses).set({ config: { ...config, lmsConfig: lms } }).where(eq(schema.courses.id, courseId))
    return cResp(lms.danmaku)
  } catch (error: any) {
    console.error('更新课程弹幕配置失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})