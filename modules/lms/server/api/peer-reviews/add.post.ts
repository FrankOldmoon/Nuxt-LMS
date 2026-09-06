import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

/**
 * 新建同伴互评活动（配置）
 * POST /api/peer-reviews/add
 * body: { course_id, name, options: [{ key, label, maxScore }] }
 * 权限：管理员或该课程的教师/编辑者
 */
export default eventHandler(async (event) => {
  const body = await readBody(event)
  const courseId = Number(body?.course_id)
  if (!courseId) {
    return cResp(null, '缺少 course_id 参数', false)
  }
  await requireCourseTeacher(event, courseId)
  const name = String(body?.name || '').trim()
  const options = Array.isArray(body?.options) ? body.options : []
  if (!name) return cResp(null, '缺少活动名称', false)
  if (options.length === 0) return cResp(null, '请至少配置一个评价项', false)

  const maxCidResult = await db.select({ cid: schema.peerReviewConfigs.cid })
    .from(schema.peerReviewConfigs)
    .where(eq(schema.peerReviewConfigs.courseId, courseId))
    .orderBy(desc(schema.peerReviewConfigs.cid))
    .limit(1)
  const newCid = (maxCidResult[0]?.cid ?? 0) + 1

  const result = await db.insert(schema.peerReviewConfigs).values({
    courseId,
    cid: newCid,
    name,
    options: options.map((o: any, i: number) => ({
      key: String(o.key || `item${i + 1}`),
      label: String(o.label || `评价项${i + 1}`),
      maxScore: Number(o.maxScore) || 10,
    })),
  }).returning()

  return cResp(result[0])
})
