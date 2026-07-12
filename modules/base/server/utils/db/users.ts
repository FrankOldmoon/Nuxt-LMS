import { db, schema } from "@nuxthub/db"
import { and, eq, isNull, or, ilike } from "drizzle-orm"

/**
 * 给用户分配指定 code 的角色（幂等：已存在则跳过）
 *
 * @returns true=分配成功（或已存在），false=role code 不存在
 */
export async function assignRoleToUser(userId: number, roleCode: string): Promise<boolean> {
  const roleRows = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.code, roleCode), isNull(schema.roles.deletedAt)))
    .limit(1)

  const roleRow = roleRows[0]
  if (!roleRow) {
    console.warn(`[assignRoleToUser] role code '${roleCode}' 不存在，跳过分配 (userId=${userId})`)
    return false
  }

  await db
    .insert(schema.userRoles)
    .values({ userId, roleId: roleRow.id })
    .onConflictDoNothing()

  return true
}

/**
 * 搜索用户（按用户名或姓名模糊匹配），排除已软删除的
 */
export async function searchUsers(keyword: string, limit = 100) {
  return db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      avatarImg: schema.users.avatarImg,
    })
    .from(schema.users)
    .where(
      and(
        isNull(schema.users.deletedAt),
        or(
          ilike(schema.users.username, `%${keyword}%`),
          ilike(schema.users.name, `%${keyword}%`),
        ),
      ),
    )
    .limit(limit)
}
