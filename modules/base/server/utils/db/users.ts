import { db, schema } from "@nuxthub/db"
import { and, eq, isNull, or, ilike } from "drizzle-orm"

/**
 * 给用户分配指定 code 的角色（幂等：已存在则跳过）
 *
 * 特例：observer 是「只读观察者」，绝不给它补 teacher 角色 ——
 * 否则 requireRole(['teacher','admin']) 的写接口会对它放行（历史 bug 就是这么来的）。
 *
 * @returns true=分配成功（或已存在），false=role code 不存在 / 被只读策略拒绝
 */
export async function assignRoleToUser(userId: number, roleCode: string): Promise<boolean> {
  // 只读观察者不得获得教师角色
  if (roleCode === 'teacher') {
    const observerRow = await db
      .select({ id: schema.userRoles.userId })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(and(eq(schema.userRoles.userId, userId), eq(schema.roles.code, 'observer')))
      .limit(1)
    if (observerRow.length > 0) {
      console.warn(`[assignRoleToUser] 用户 ${userId} 是 observer（只读观察者），拒绝分配 teacher 角色`)
      return false
    }
  }

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
      avatarFrame: schema.users.avatarFrame,
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
