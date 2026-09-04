import { getCourseLmsConfig } from '../../utils/lmsConfig/cache/course-merge'

// 读取某课程的 LMS 配置（merge 后），前端弹幕面板等据此读取开关状态
export default eventHandler(async (event) => {
  await requireAuth(event)

  const { course_id } = getQuery(event)
  const cfg = await getCourseLmsConfig(Number(course_id) || 0).catch(() => null)
  return cResp(cfg?.danmaku || {})
})