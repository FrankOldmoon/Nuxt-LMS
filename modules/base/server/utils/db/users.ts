import { db, schema } from "@nuxthub/db"
import { and, eq, isNull, or, ilike } from "drizzle-orm"

/**
 * Assign a role with the specified code to a user (idempotent: skip if exists)
 *
 * @returns true=assigned successfully (or already exists), false=role code does not exist
 */
export async function assignRoleToUser(userId: number, roleCode: string): Promise<boolean> {
  const roleRows = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.code, roleCode), isNull(schema.roles.deletedAt)))
    .limit(1)

  const roleRow = roleRows[0]
  if (!roleRow) {
    console.warn(`[assignRoleToUser] role code '${roleCode}' does not exist, skip assignment (userId=${userId})`)
    return false
  }

  await db
    .insert(schema.userRoles)
    .values({ userId, roleId: roleRow.id })
    .onConflictDoNothing()

  return true
}

/**
 * Search users (fuzzy match by username or name), excluding soft-deleted
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
