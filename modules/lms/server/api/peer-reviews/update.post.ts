import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 更新同伴互评活动配置
 * POST /api/peer-reviews/update
 * body: { course_id, cid, name?, options? }
 * 权限：教师/管理员
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const courseId = Number(body?.course_id)
  const peerCid = Number(body?.cid)
  if (!courseId || !peerCid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const updateData: Record<string, any> = {}
  if (typeof body.name === 'string') updateData.name = body.name.trim()
  if (Array.isArray(body.options)) {
    updateData.options = body.options.map((o: any, i: number) => ({
      key: String(o.key || `item${i + 1}`),
      label: String(o.label || `评价项${i + 1}`),
      maxScore: Number(o.maxScore) || 10,
    }))
  }
  if (Object.keys(updateData).length === 0) {
    return cResp(null, '没有需要更新的字段', false)
  }

  await db.update(schema.peerReviewConfigs)
    .set(updateData)
    .where(and(
      eq(schema.peerReviewConfigs.courseId, courseId),
      eq(schema.peerReviewConfigs.cid, peerCid),
    ))

  return cResp(null, '已保存', true)
})
