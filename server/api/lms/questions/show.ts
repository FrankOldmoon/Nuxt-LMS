import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"  // 仅需导入 eq 和 and

export default eventHandler(async (event) => {
  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 从 schema 中获取 questions 表（根据实际导出结构调整）
  const { questions } = schema
  console.log({course_id, cid})
  const data = await db.query.questions.findFirst({
    where: and(
      eq(questions.courseId, Number(course_id)),
      eq(questions.cid, Number(cid))
    )
  })

  return cResp(data)
})