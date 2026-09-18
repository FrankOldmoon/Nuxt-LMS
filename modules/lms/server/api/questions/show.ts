import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 题目详情
 * GET /api/questions/show?course_id=&cid=
 *
 * 答案安全：
 *  - 学生/未登录：不返回 answer / explanation（判分由服务端完成，
 *    提交后 /api/questions/submit 响应中带回，供前端显示）
 *  - 教师/管理员：返回明文 answer / explanation（编辑回填与"查看答案"依赖）
 *  - composite 题型：子题 answer 内嵌在 content 数组中，同样按角色剥离
 *  - OJ 题型：content 存 pid，用 fetchOj 拉取题目内容替换供前端展示
 */

export default eventHandler(async (event) => {
  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 id 参数', false)
  }

  const { questions } = schema

  const data = await db.query.questions.findFirst({
    where: and(
      eq(questions.courseId, Number(course_id)),
      eq(questions.cid, Number(cid))
    )
  })
  if (!data) return cResp(null, '题目不存在', false)

  // OJ 题型：pid 取 options.pid（content 可能已被回填为题目正文），
  // 用 fetchOj 拉取题目内容替换 content 供前端展示；
  // 同时把 pid 放入 options，供编辑回填与渲染「前往 OJ」链接使用。
  if (data.type === 'oj') {
    const pid = resolveOjPid(data)
    if (pid) {
      const opts: any = data.options
      if (!opts || typeof opts !== 'object' || Array.isArray(opts) || !opts.pid) {
        data.options = { pid }
      }
      try {
        const ojContent = await fetchOj(pid)
        if (ojContent != null) data.content = ojContent
      } catch { /* OJ 拉取失败时保留原始 content（pid） */ }
    }
  }

  // 角色：教师/管理员可见答案，其他人剥离
  const user = await getCurrentUser(event)
  const canReveal = !!user?.roles?.some((r: string) => r === 'teacher' || r === 'admin')
  if (!canReveal) {
    delete (data as any).answer
    delete (data as any).explanation
    // composite 子题答案内嵌在 content 中，一并剥离
    if (data.type === 'composite' && Array.isArray(data.content)) {
      data.content = (data.content as any[]).map(sub =>
        sub && typeof sub === 'object' ? { ...sub, answer: undefined } : sub
      )
    }
  }

  return cResp(data)
})
