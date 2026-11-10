import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"
import { resolveOjPid, fetchOjUserRecords, getOjUrl } from "../../utils/questions/oj"

/**
 * 查询 OJ 题在当前班级每个学生上的提交记录（教师/管理员）。
 *
 * 返回 { url, records }：url 为 OJ 基址，records 为 [{ userId, rid, status, score, lang, judgeAt, count }]，
 * 其中 rid 是该生在该题最新一次提交的记录 id，前端据此打开 `${url}/record/${rid}` 查看代码。
 * 仅 OJ 题型有记录可查，其它题型返回空列表。
 */
export default eventHandler(async (event) => {
  const user = await requireTeacherOrObserver(event)

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const courseId = Number(course_id)
  const questionCid = Number(cid)

  const question = await db.query.questions.findFirst({
    where: and(
      eq(schema.questions.courseId, courseId),
      eq(schema.questions.cid, questionCid),
    ),
  })

  const base = getOjUrl()
  const pid = question?.type === 'oj' ? resolveOjPid(question) : ''
  if (!base || !pid) {
    return cResp({ url: base, records: [] })
  }

  // 查询范围与 /api/questions/records 一致：当前教师的 defaultClass
  const userRow = await db.select({ defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const classId = (userRow[0]?.defaultClass as any)?.id
  if (!classId) {
    return cResp({ url: base, records: [] })
  }

  const classUsers = await getClassUsers(classId)
  const students = classUsers.filter(u => !u.isTeacher && u.username)

  const records: any[] = []
  // 分批并发查询 OJ，避免一次性打出过多请求
  const BATCH = 6
  for (let i = 0; i < students.length; i += BATCH) {
    const batch = students.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async (s) => {
      try {
        const rdocs = await fetchOjUserRecords(pid, String(s.username))
        if (!rdocs.length) return null
        // 取最新一次提交
        const latest = rdocs.reduce((a, b) =>
          String(a?.judgeAt || '') >= String(b?.judgeAt || '') ? a : b)
        if (!latest?._id) return null
        return {
          userId: s.id,
          rid: String(latest._id),
          status: latest.status ?? null,
          score: latest.score ?? null,
          lang: latest.lang || '',
          judgeAt: latest.judgeAt || '',
          count: rdocs.length,
        }
      } catch {
        return null
      }
    }))
    for (const r of results) if (r) records.push(r)
  }

  return cResp({ url: base, records })
})
