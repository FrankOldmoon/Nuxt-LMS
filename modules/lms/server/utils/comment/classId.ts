import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

/**
 * 查询用户主班级 id，与前端一致：
 *   classId = user.defaultClass?.id || user.classId || 0
 * 默认展示/选班用的是 users.defaultClass（JSON，含 {id,name}），
 * 未设置时回退到 users.classId（主班级字段）。
 * 评论回复按主班级隔离；无班级返回 null。
 */
export async function getUserClassId(userId: number): Promise<number | null> {
  const rows = await db
    .select({
      defaultClass: schema.users.defaultClass,
      classId: schema.users.classId,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  const defaultClassId = (row.defaultClass as any)?.id
  return defaultClassId ?? row.classId ?? null
}