import { db, schema } from '@nuxthub/db'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'

/**
 * 批量导入用户
 *
 * body: { users: [{ username, email, name?, password?, class? }] }
 *
 * base 负责：
 * - users 表插入；插入前做 username/email 的批次内 + 库内唯一性校验，
 *   避免因单条重复触发 DB 唯一约束导致整批回滚、用户无法定位错误行。
 * - 班级处理：按 class 名查找/创建 classes，关联 userClasses，回填 users.classId。
 *
 * 跨模块扩展钩子 runOnUserImported 保留，供后续模块在用户导入后做额外处理。
 */
export default eventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { users: rawUsers } = body

  if (!Array.isArray(rawUsers) || !rawUsers.length) {
    return cResp(null, 'users 不能为空', false)
  }

  const errors: string[] = []
  const seenUsernames = new Set<string>()
  const seenEmails = new Set<string>()
  // 未显式提供密码时使用的默认密码，由环境变量配置（不写入仓库）
  const defaultPassword = process.env.NUXT_IMPORT_DEFAULT_PASSWORD || ''

  // 1. 解析 + 必填校验 + 批次内去重
  const parsed: { line: number; username: string; email: string; password: string; name: string; className: string }[] = []
  for (let i = 0; i < rawUsers.length; i++) {
    const u = rawUsers[i]
    const line = i + 1
    const username = String(u.username || '').trim()
    const email = String(u.email || '').trim()
    const password = String(u.password || '').trim() || defaultPassword
    const name = String(u.name || '').trim()
    const className = String(u.class || '').trim()

    if (!username) { errors.push(`第${line}行: username 不能为空`); continue }
    if (!email) { errors.push(`第${line}行: email 不能为空`); continue }
    if (!password) { errors.push(`第${line}行: password 不能为空（未配置 NUXT_IMPORT_DEFAULT_PASSWORD 时必须显式提供）`); continue }
    if (seenUsernames.has(username)) { errors.push(`第${line}行: username '${username}' 在本次导入中重复`); continue }
    if (seenEmails.has(email)) { errors.push(`第${line}行: email '${email}' 在本次导入中重复`); continue }
    seenUsernames.add(username)
    seenEmails.add(email)

    parsed.push({ line, username, email, password, name, className })
  }

  // 2. 库内唯一性校验（排除已软删除）
  if (parsed.length) {
    const existing = await db
      .select({ username: schema.users.username, email: schema.users.email })
      .from(schema.users)
      .where(
        and(
          isNull(schema.users.deletedAt),
          or(
            inArray(schema.users.username, parsed.map(p => p.username)),
            inArray(schema.users.email, parsed.map(p => p.email)),
          ),
        ),
      )
    const existUsernames = new Set(existing.map((r: any) => r.username))
    const existEmails = new Set(existing.map((r: any) => r.email))
    for (const p of parsed) {
      if (existUsernames.has(p.username)) errors.push(`第${p.line}行: username '${p.username}' 已存在`)
      else if (existEmails.has(p.email)) errors.push(`第${p.line}行: email '${p.email}' 已存在`)
    }
  }

  if (errors.length) {
    return cResp({ errors }, `共 ${errors.length} 条数据校验失败`, false)
  }

  // 3. 哈希密码 + 组装插入数据
  const toInsert = []
  for (const p of parsed) {
    toInsert.push({
      username: p.username,
      email: p.email,
      password: await hashPassword(p.password),
      name: p.name || p.username,
      avatarImg: '/avatar.webp',
    })
  }

  // 4. 批量插入用户（捕获 DB 异常，避免 500 整批回滚无提示）
  let inserted: any[]
  try {
    inserted = await db.insert(schema.users).values(toInsert).returning({ id: schema.users.id })
  } catch (e: any) {
    return cResp({ errors: [e.message || '数据库插入失败'] }, '导入失败，可能存在重复数据', false)
  }

  // 5. 班级处理：按 class 名查找/创建 classes，关联 userClasses，回填 users.classId
  const classMap = new Map<string, number>()
  const classNames = [...new Set(parsed.map(p => p.className).filter(Boolean))]
  if (classNames.length) {
    const existingClasses = await db
      .select({ id: schema.classes.id, name: schema.classes.name })
      .from(schema.classes)
      .where(and(inArray(schema.classes.name, classNames), isNull(schema.classes.deletedAt)))
    for (const c of existingClasses) classMap.set(c.name, c.id)

    const toCreate = classNames.filter(n => !classMap.has(n))
    if (toCreate.length) {
      const created = await db
        .insert(schema.classes)
        .values(toCreate.map(name => ({ name, code: name })))
        .returning({ id: schema.classes.id, name: schema.classes.name })
      for (const c of created) classMap.set(c.name, c.id)
    }

    const userClassRows: { userId: number; classId: number; isTeacher: boolean }[] = []
    inserted.forEach((u: any, idx: number) => {
      const classId = classMap.get(parsed[idx].className)
      if (classId) userClassRows.push({ userId: u.id, classId, isTeacher: false })
    })
    if (userClassRows.length) {
      await db.insert(schema.userClasses).values(userClassRows).onConflictDoNothing()
      // 回填主班级 classId
      for (const r of userClassRows) {
        await db.update(schema.users).set({ classId: r.classId }).where(eq(schema.users.id, r.userId))
      }
    }
  }

  // 6. 跨模块扩展钩子（保留供后续模块扩展）
  await runOnUserImported(inserted, rawUsers)

  return cResp({ count: inserted.length }, `成功导入 ${inserted.length} 位用户`)
})
