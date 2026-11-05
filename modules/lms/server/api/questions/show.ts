import { db, schema } from "@nuxthub/db"
import { eq, and, sql } from "drizzle-orm"
import { resolveOjPid, isOjPlaceholder, fetchOj } from "../../utils/questions/oj"

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

/**
 * 把拉到的题目正文回填到 questions.content。
 *
 * 只在「content 仍是 pid 占位」时才写（SQL 侧带同样的条件做乐观锁），
 * 因此不会覆盖老师手工编辑过的正文；写入后该题后续渲染不再依赖 OJ 在线。
 * 失败只记日志，不影响本次响应。
 */
function backfillOjStatement(courseId: number, cid: number, pid: string, text: string) {
  const col = (schema.questions as any).content
  // 测试桩的 schema 没有 content 列，跳过（生产环境始终存在）
  if (!col) return
  try {
    const query: any = db.update(schema.questions)
      .set({ content: text } as any)
      .where(and(
        eq(schema.questions.courseId, courseId),
        eq(schema.questions.cid, cid),
        // jsonb 里存的是标量字符串，取标量比文本（别用 = $1::jsonb：驱动会把字符串再 JSON 编码一次）
        sql`${col} #>> '{}' = ${pid}::text`,
      ))
    // 不 await：回填失败不该影响本次响应（Promise.resolve 兼容 drizzle 的 thenable 与测试桩）
    Promise.resolve(query)
      .then(() => console.log(`[oj] 已回填题目正文 course=${courseId} cid=${cid} pid=${pid}`))
      .catch((e: any) => console.warn(`[oj] 回填题目正文失败 cid=${cid} pid=${pid} → ${e?.message || e}`))
  } catch (e: any) {
    console.warn(`[oj] 回填题目正文异常 cid=${cid} pid=${pid} → ${e?.message || e}`)
  }
}

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
      if (isOjPlaceholder(data, pid)) {
        // 库里还是 pid 占位：必须等一次拉取（有缓存则瞬间返回，无缓存最多等超时）
        try {
          const ojContent = await fetchOj(pid)
          if (ojContent != null) {
            data.content = ojContent
            backfillOjStatement(Number(course_id), Number(cid), pid, ojContent)
          }
        } catch { /* OJ 拉取失败时保留原始 content（pid） */ }
      } else {
        // 库里已有正文：直接用它渲染，OJ 刷新丢到后台，别让页面等上游
        void fetchOj(pid).catch(() => null)
      }
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
