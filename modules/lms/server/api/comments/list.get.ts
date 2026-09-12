import { db, schema } from "@nuxthub/db"
import { eq, and, inArray } from "drizzle-orm"
import { getUserClassId } from "../../utils/comment/classId"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // 审核可见性：老师/管理员可看到全部（含待审核），普通用户只看到已过审（published）的评论
  const isStaff = user.roles?.some((r) => ['teacher', 'admin'].includes(r))

  // 1. 查询该评论自身（root comment / 主评论，课程级共享，始终显示，不做班级过滤）
  const root = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid),
      ...(isStaff ? [] : [eq(schema.comments.status, 'published')]),
    )
  })

  if (!root) return cResp({ root: null, children: [] })

  // 2. 查询所有 parentId 为该 cid 的子评论
  let children = await db.query.comments.findMany({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.parentId, commentCid),
      ...(isStaff ? [] : [eq(schema.comments.status, 'published')]),
    )
  })

  // 3. 学生/老师/管理员都只显示「本班级」的子评论（主评论始终显示，见上方 root 不做班级过滤）：
  //    用户主班级 = users.defaultClass.id || users.classId（getUserClassId）。
  //    取每条回复作者的「主班级」，与当前用户主班级相等才显示。
  {
    const viewerClassId = await getUserClassId(user.id)
    if (viewerClassId) {
      const authorIds = [...new Set(children.map((c: any) => c.userId))]
      const authorRows = authorIds.length
        ? await db.query.users.findMany({
            where: inArray(schema.users.id, authorIds),
          })
        : []
      const authorClassMap = new Map(
        (authorRows as any[]).map((u: any) => [u.id, (u.defaultClass?.id ?? u.classId ?? null)]),
      )
      // 只保留作者主班级 = 当前用户主班级的回复
      children = children.filter((c) => authorClassMap.get(c.userId) === viewerClassId)
    } else {
      children = []
    }
  }

  // 3. 收集所有 userId，批量查询用户信息
  const allComments = [root, ...children]
  const userIds = [...new Set(allComments.map(c => c.userId))]
  const users = await db.query.users.findMany({
    where: inArray(schema.users.id, userIds),
  })
  const userMap = new Map(users.map(u => [u.id, u]))

  // 4. 查询所有 userComments（点赞记录，用于统计每条评论的赞数 + 当前用户点赞状态）
  const commentCids = [root.cid, ...children.map(c => c.cid)]
  const allUserComments = commentCids.length > 0
    ? await db.query.userComments.findMany({
        where: and(
          eq(schema.userComments.courseId, courseId),
          inArray(schema.userComments.commentCid, commentCids),
          eq(schema.userComments.like, true)
        )
      })
    : []

  // 每条评论的总赞数
  const likeCountMap = new Map()
  for (const uc of allUserComments) {
    likeCountMap.set(uc.commentCid, (likeCountMap.get(uc.commentCid) || 0) + 1)
  }

  // 当前用户的点赞状态
  const likedMap = new Map()
  for (const uc of allUserComments) {
    if (uc.userId === user.id) likedMap.set(uc.commentCid, true)
  }

  // 5. 组合：评论 + 用户信息 + 点赞状态 + 赞数
  const combine = (c: any) => {
    const u = userMap.get(c.userId)
    return {
      ...c,
      userName: u?.name || '',
      avatarImg: u?.avatarImg || null,
      avatarFrame: u?.avatarFrame || null,
      liked: likedMap.get(c.cid) === true,
      likeCount: likeCountMap.get(c.cid) || 0,
    }
  }

  // 6. 子评论排序：已批准（published）优先，再按赞数降序，最后按发表时间升序
  const sortedChildren = (children as any[])
    .map(combine)
    .sort((a, b) => {
      // 已批准(老师能看到的 published)排在最前，待审核(audit)排在后面
      const pa = a.status === 'published' ? 0 : 1
      const pb = b.status === 'published' ? 0 : 1
      if (pa !== pb) return pa - pb
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })

  return cResp({
    root: combine(root),
    children: sortedChildren,
  })
})
