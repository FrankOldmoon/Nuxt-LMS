import { db, schema } from "@nuxthub/db"
import { eq, and, desc, sql } from "drizzle-orm"
import { validateCommentContent, isCommentEmpty } from "../../utils/comment/validate"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, content } = body

  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  // 评论内容不能为空（纯文本空白 / UMO 文档无可见文本均拒绝）
  if (isCommentEmpty(content)) {
    return cResp(null, '评论内容不能为空', false)
  }

  // H3：富文本内容安全校验（禁止 iframe/script 等危险节点）
  const contentError = validateCommentContent(content)
  if (contentError) {
    return cResp(null, contentError, false)
  }

  try {
    // 父评论 id（回复的"主题"）：顶层评论 parentId 为空，不受此限制
    const parentId = body.parentId ? Number(body.parentId) : null

    // 每主题回复数上限（配置 maxCommentCount，默认 50）：
    // 限制"每个用户在同一个父 comment 下最多回复几条"，防止灌水刷回复奖励；
    // 顶层评论（新开主题）不限制
    const cfg = await getCourseLmsConfig(course_id).catch(() => null)
    const cConfig = cfg?.comment
    const maxCommentCount = Number(cConfig?.maxCommentCount) || 0
    if (maxCommentCount > 0 && parentId) {
      const countRows = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.comments)
        .where(and(
          eq(schema.comments.userId, user.id),
          eq(schema.comments.courseId, Number(course_id)),
          eq(schema.comments.parentId, parentId),
        ))
      if (Number(countRows[0]?.n) >= maxCommentCount) {
        return cResp(null, '评论数量已达上限', false)
      }
    }

    // 查询该课程中最大的 cid
    const maxCidResult = await db.select({ cid: schema.comments.cid })
      .from(schema.comments)
      .where(eq(schema.comments.courseId, course_id))
      .orderBy(desc(schema.comments.cid))
      .limit(1)

    const newCid = (maxCidResult[0]?.cid ?? 0) + 1

    const insertData = {
      courseId: course_id,
      cid: newCid,
      name: body.name || '',
      content: content || '',
      userId: user.id,
      parentId: body.parentId || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      // 安全：point/status 由服务端固定默认值，不接受客户端自设（防止自定分值/状态）
      point: 1,
      // 新评论默认待审核（audit），过审后（status=published）才对普通用户可见
      status: 'audit',
    }

    const result = await db.insert(schema.comments).values(insertData).returning()

    // 发评论/回复奖励延后到审核通过时发放（见 approve.post.ts）：
    // 未过审不奖励，防止灌水刷分；通过后按 publish/reply 发放 exp/coin + 课程/章节分

    return cResp(result[0])
  } catch (error: any) {
    console.error('新增评论失败:', error)
    return cResp(null, error.message || '新增失败', false)
  }
})
