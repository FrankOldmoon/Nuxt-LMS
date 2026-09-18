import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"
import { findUserSubmitRecord } from "../../utils/submit/record"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, cid, skip_oj } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const courseId = Number(course_id)
  const questionCid = Number(cid)

  // OJ 题型：hover 时实时查询 OJ 通过状态，按 pass 值更新 user_question
  // （pid 取 options.pid，content 可能是已回填的题目正文）。仅首次通过时计入课程分项分，避免重复加分。
  const question = await db.query.questions.findFirst({
    where: and(
      eq(schema.questions.courseId, courseId),
      eq(schema.questions.cid, questionCid)
    )
  })
  if (question?.type === 'oj' && !skip_oj) {
    const pid = resolveOjPid(question)
    if (pid) {
      try {
        const passed = await getOjStatus(pid, user.username)
        if (passed) {
          const existing = await findUserSubmitRecord(user.id, courseId, 'question', questionCid)
          // 已记录为通过则跳过写入，避免每次 hover 都打 DB
          if (!existing || !existing.firstRight || String(existing.correctRate) !== '1') {
            const point = Number(question.point) || 0
            const { scoreDelta } = await upsertUserQuestion({
              userId: user.id,
              courseId,
              questionCid,
              rate: 1,
              score: point,
              isCorrect: true,
              records: [1],
              trackWrongCount: false,
              trackSubmitCount: false,
            })
            if (scoreDelta > 0) {
              await notifyCourseProgress({
                userId: user.id,
                courseId,
                score: scoreDelta,
                scoreKey: 'questionScore',
                exp: 0,
                coin: 0,
              })
            }
          }
        }
      } catch { /* OJ 查询失败时静默，返回已有记录 */ }
    }
  }

  const data = await findUserSubmitRecord(user.id, courseId, 'question', questionCid)
  return cResp(data)
})
