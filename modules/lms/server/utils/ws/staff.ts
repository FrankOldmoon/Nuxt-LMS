import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

/**
 * 判断用户是否为教师/管理员（用于弹幕发送鉴权等 WS 场景，
 * 该场景没有 HTTP event，需直接按 userId 查角色）。
 */
export async function isStaffUser(userId: number | null | undefined): Promise<boolean> {
  if (!userId) return false
  try {
    const rows = await db
      .select({ code: schema.roles.code })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.userRoles.userId, userId))
    return rows.some((r: any) => r.code === 'teacher' || r.code === 'admin')
  } catch {
    return false
  }
}