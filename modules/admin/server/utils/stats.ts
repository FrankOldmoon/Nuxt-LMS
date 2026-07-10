import { db, schema } from '@nuxthub/db'
import { sql, isNull, gte, and } from 'drizzle-orm'

/** 统计单表未软删除行数 */
async function countTable(table: any): Promise<number> {
  const rows = await db
    .select({ count: sql`count(*)`.as('count') })
    .from(table)
    .where(isNull(table.deletedAt))
  return Number(rows[0]?.count ?? 0)
}

/** 仪表盘统计数据 */
export async function getDashboardStats() {
  // 主要表行数统计
  const counts = {
    users: await countTable(schema.users),
    courses: await countTable(schema.courses),
    chapters: await countTable(schema.chapters),
    questions: await countTable(schema.questions),
    homeworks: await countTable(schema.homeworks),
    quizzes: await countTable(schema.quizzes),
    races: await countTable(schema.races),
    comments: await countTable(schema.comments),
    classes: await countTable(schema.classes),
  }

  // 近 7 / 30 天新增用户
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [r7, r30] = await Promise.all([
    db
      .select({ count: sql`count(*)`.as('count') })
      .from(schema.users)
      .where(and(isNull(schema.users.deletedAt), gte(schema.users.createdAt, d7))),
    db
      .select({ count: sql`count(*)`.as('count') })
      .from(schema.users)
      .where(and(isNull(schema.users.deletedAt), gte(schema.users.createdAt, d30))),
  ])

  // 近 30 天用户增长（按天聚合）
  const growthRows = await db
    .select({
      date: sql<string>`to_char(${schema.users.createdAt}::date, 'YYYY-MM-DD')`.as('date'),
      count: sql`count(*)`.as('count'),
    })
    .from(schema.users)
    .where(and(isNull(schema.users.deletedAt), gte(schema.users.createdAt, d30)))
    .groupBy(sql`${schema.users.createdAt}::date`)
    .orderBy(sql`${schema.users.createdAt}::date`)

  // 角色分布
  const roleRows = await db
    .select({
      name: schema.roles.name,
      count: sql`count(*)`.as('count'),
    })
    .from(schema.userRoles)
    .innerJoin(schema.roles, sql`${schema.userRoles.roleId} = ${schema.roles.id}`)
    .where(and(isNull(schema.userRoles.deletedAt), isNull(schema.roles.deletedAt)))
    .groupBy(schema.roles.name)

  return {
    counts,
    newUsers7d: Number(r7[0]?.count ?? 0),
    newUsers30d: Number(r30[0]?.count ?? 0),
    userGrowth: growthRows.map((r) => ({ date: r.date, count: Number(r.count) })),
    roleDistribution: roleRows.map((r) => ({ name: r.name, value: Number(r.count) })),
  }
}
