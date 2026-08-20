/**
 * 同伴互评工具
 *
 * 提供：
 * - getCourseStudents：课程学生列表（userCourses 中非教师/编辑者的成员）
 * - validateScores：校验提交的分值（key 必须在配置 options 内，值在 [0, maxScore]）
 * - calcPeerScores：聚合该课程所有 peer_reviews 的评分，计算每人 peer_score（总均分）
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, or } from 'drizzle-orm'

/** 列值不为 true（兼容 false / null） */
function isNotTrue(col: any) {
  return or(isNull(col), eq(col, false))
}

/** 获取课程的普通学生列表（非教师/编辑者） */
export async function getCourseStudents(courseId: number) {
  return db
    .select({
      userId: schema.userCourses.userId,
      username: schema.users.username,
      name: schema.users.name,
      avatarImg: schema.users.avatarImg,
    })
    .from(schema.userCourses)
    .innerJoin(schema.users, eq(schema.userCourses.userId, schema.users.id))
    .where(
      and(
        eq(schema.userCourses.courseId, courseId),
        isNull(schema.userCourses.deletedAt),
        isNotTrue(schema.userCourses.isTeacher),
        isNotTrue(schema.userCourses.isEditor),
      ),
    )
    .orderBy(schema.users.name)
}

/** 校验提交的 scores：key 必须都在配置 options 中，分值 ∈ [0, maxScore]；返回错误信息或 null */
export function validateScores(
  scores: Record<string, number>,
  options: { key: string; label: string; maxScore: number }[],
): string | null {
  if (!scores || typeof scores !== 'object') return '评分数据格式不正确'
  if (options.length === 0) return '评价项未配置'
  const optionMap = new Map(options.map((o) => [o.key, o]))
  for (const [key, value] of Object.entries(scores)) {
    const opt = optionMap.get(key)
    if (!opt) return `存在未知的评价项：${key}`
    const num = Number(value)
    if (Number.isNaN(num)) return `评价项「${opt.label}」分值无效`
    if (num < 0 || num > Number(opt.maxScore)) {
      return `评价项「${opt.label}」分值需在 0~${opt.maxScore} 之间`
    }
  }
  // 允许部分选项未评（缺省按 0 计）；但至少评一项
  if (Object.keys(scores).length === 0) return '请至少评价一项'
  return null
}

export interface PeerScoresMap {
  [targetUserId: number]: number // 该学生收到的 peer_score 均分
}

/**
 * 聚合该课程所有 peer_reviews 评分，计算每个被评学生的 peer_score。
 * 规则：每条评价记录取其所有评分项的平均分，所有记录平均分再平均 = 该学生 peer_score。
 */
export async function calcPeerScores(courseId: number): Promise<PeerScoresMap> {
  const rows = await db
    .select({ targetUserId: schema.peerReviews.targetUserId, scores: schema.peerReviews.scores })
    .from(schema.peerReviews)
    .where(
      and(
        eq(schema.peerReviews.courseId, courseId),
        isNull(schema.peerReviews.deletedAt),
      ),
    )

  const sumMap = new Map<number, { sum: number; count: number }>()
  for (const row of rows) {
    const vals = Object.values((row.scores || {}) as Record<string, number>)
    if (vals.length === 0) continue
    const recordAvg = vals.reduce((a, b) => a + Number(b || 0), 0) / vals.length
    const cur = sumMap.get(row.targetUserId) || { sum: 0, count: 0 }
    cur.sum += recordAvg
    cur.count += 1
    sumMap.set(row.targetUserId, cur)
  }

  const result: PeerScoresMap = {}
  for (const [userId, { sum, count }] of sumMap) {
    result[userId] = Math.round((sum / count) * 100) / 100
  }
  return result
}
