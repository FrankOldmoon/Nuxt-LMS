/**
 * 按 users.class_id 解析用户所属班级（班级名）+ 基础资料。
 *
 * 排行榜「班级名称」列的数据来源即 users.class_id：
 * 取用户在 users 表中的直接归属班级，再查 classes 得到班级名。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, isNull } from 'drizzle-orm'

export interface UserClassInfo {
  classId: number | null
  className: string
  name: string
  avatarImg: string | null
}

/**
 * 批量解析用户班级信息（users.class_id → classes.name）。
 * @returns userId → { classId, className, name, avatarImg }
 */
export async function getUserClassInfo(userIds: number[]): Promise<Map<number, UserClassInfo>> {
  const map = new Map<number, UserClassInfo>()
  if (!userIds.length) return map

  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      avatarImg: schema.users.avatarImg,
      classId: schema.users.classId,
    })
    .from(schema.users)
    .where(and(
      inArray(schema.users.id, userIds),
      isNull(schema.users.deletedAt),
    ))

  const classIds = [...new Set(users.map(u => u.classId).filter((c): c is number => c != null))]
  const classRows = classIds.length
    ? await db
        .select({ id: schema.classes.id, name: schema.classes.name })
        .from(schema.classes)
        .where(inArray(schema.classes.id, classIds))
    : []
  const classNames = new Map(classRows.map(c => [c.id, c.name]))

  for (const u of users) {
    map.set(u.id, {
      classId: u.classId ?? null,
      className: u.classId != null ? (classNames.get(u.classId) ?? '') : '',
      name: u.name,
      avatarImg: u.avatarImg ?? null,
    })
  }
  return map
}
