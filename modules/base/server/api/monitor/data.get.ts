/**
 * 监控页：数据库数据情况（各表行数、存储用量、近 7/30 天新增用户）
 */
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

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  assertMonitorPassword(event, config.monitor?.viewPassword || '')

  const countTasks: Record<string, Promise<number>> = {
    users: countTable(schema.users),
    courses: countTable(schema.courses),
    chapters: countTable(schema.chapters),
    questions: countTable(schema.questions),
    homeworks: countTable(schema.homeworks),
    quizzes: countTable(schema.quizzes),
    races: countTable(schema.races),
    comments: countTable(schema.comments),
    classes: countTable(schema.classes),
    files: countTable(schema.files),
    feedbacks: countTable(schema.feedbacks),
    notifys: countTable(schema.notifys),
    messages: countTable(schema.messages),
    goods: countTable(schema.goods),
    bags: countTable(schema.bags),
    showcases: countTable(schema.showcases),
  }

  const [countValues, storage] = await Promise.all([
    Promise.all(Object.values(countTasks)),
    db
      .select({ total: sql`coalesce(sum(${schema.files.size}), 0)`.as('total') })
      .from(schema.files)
      .where(isNull(schema.files.deletedAt))
      .then((rows) => Number(rows[0]?.total ?? 0)),
  ])
  const counts = Object.fromEntries(Object.keys(countTasks).map((k, i) => [k, countValues[i]]))

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

  return cResp({
    counts,
    storageBytes: storage,
    newUsers7d: Number(r7[0]?.count ?? 0),
    newUsers30d: Number(r30[0]?.count ?? 0),
    checkedAt: new Date().toISOString(),
  })
})
