import { db, schema } from '@nuxthub/db'
import { eq, or } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { users: rawUsers } = body

  if (!Array.isArray(rawUsers) || !rawUsers.length) {
    return cResp(null, 'users 不能为空', false)
  }

  // 收集所有需要查询的班级名称/代码
  const classNames = [...new Set(rawUsers.map((u: any) => String(u.class || '').trim()).filter(Boolean))]
  // 查询 classes 表获取 id
  const classRows = classNames.length
    ? await db
        .select({ id: schema.classes.id, name: schema.classes.name, code: schema.classes.code })
        .from(schema.classes)
        .where(
          or(
            ...classNames.map((n: string) => eq(schema.classes.name, n)),
            ...classNames.map((n: string) => eq(schema.classes.code, n)),
          ),
        )
    : []

  // 班级映射：按 name 优先，再按 code
  const classMap = new Map<string, number>()
  for (const row of classRows) {
    if (!classMap.has(row.name)) classMap.set(row.name, row.id)
    if (!classMap.has(row.code)) classMap.set(row.code, row.id)
  }

  const errors: string[] = []
  const toInsert: any[] = []
  const toLink: { classId: number }[] = []

  for (let i = 0; i < rawUsers.length; i++) {
    const u = rawUsers[i]
    const line = i + 1
    const username = String(u.username || '').trim()
    const email = String(u.email || '').trim()
    const password = String(u.password || '').trim() || 'REDACTED'
    const className = String(u.class || '').trim()

    // 必填校验
    if (!username) { errors.push(`第${line}行: username 不能为空`); continue }
    if (!email) { errors.push(`第${line}行: email 不能为空`); continue }
    if (!className) { errors.push(`第${line}行: class 不能为空`); continue }

    // 班级不存在则自动新建
    let classId = classMap.get(className)
    if (!classId) {
      const [created] = await db
        .insert(schema.classes)
        .values({ name: className, code: className })
        .returning({ id: schema.classes.id })
      classId = created.id
      classMap.set(className, classId)
    }

    const name = String(u.name || '').trim()
    const preferName = String(u.prefer_name || '').trim() || null
    const englishName = String(u.english_name || '').trim() || null

    const hashedPwd = await hashPassword(password)

    toInsert.push({
      username,
      email,
      password: hashedPwd,
      name: name || username,
      preferName,
      englishName,
      classId,
      avatarImg: '/avatar.webp',
    })
    toLink.push({ classId })
  }

  if (errors.length) {
    return cResp({ errors }, `第${errors.length}条数据校验失败`, false)
  }

  // 批量插入用户
  const inserted = await db.insert(schema.users).values(toInsert).returning({ id: schema.users.id })

  // 插入 userClasses 关联
  if (inserted.length) {
    const ucValues = inserted.map((row, i) => ({
      userId: row.id,
      classId: toLink[i].classId,
    }))
    await db.insert(schema.userClasses).values(ucValues).onConflictDoNothing()
  }

  return cResp({ count: inserted.length }, `成功导入 ${inserted.length} 位用户`)
})
