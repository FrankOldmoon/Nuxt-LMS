import { db, schema } from '@nuxthub/db'

/**
 * 批量导入用户
 *
 * body: { users: [{ username, email, password?, name?, prefer_name?, english_name?, class?, ... }] }
 *
 * base 只负责 users 表插入；班级/关联表等扩展由后续模块
 * 通过 registerOnUserImported 钩子处理（如 lms 创建班级、关联 userClasses）。
 */
export default eventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { users: rawUsers } = body

  if (!Array.isArray(rawUsers) || !rawUsers.length) {
    return cResp(null, 'users 不能为空', false)
  }

  const errors: string[] = []
  const toInsert: any[] = []

  for (let i = 0; i < rawUsers.length; i++) {
    const u = rawUsers[i]
    const line = i + 1
    const username = String(u.username || '').trim()
    const email = String(u.email || '').trim()
    const password = String(u.password || '').trim() || 'REDACTED'
    const name = String(u.name || '').trim()
    const preferName = String(u.prefer_name || '').trim() || null
    const englishName = String(u.english_name || '').trim() || null

    // 必填校验
    if (!username) { errors.push(`第${line}行: username 不能为空`); continue }
    if (!email) { errors.push(`第${line}行: email 不能为空`); continue }

    const hashedPwd = await hashPassword(password)

    toInsert.push({
      username,
      email,
      password: hashedPwd,
      name: name || username,
      preferName,
      englishName,
      avatarImg: '/avatar.webp',
    })
  }

  if (errors.length) {
    return cResp({ errors }, `第${errors.length}条数据校验失败`, false)
  }

  // 批量插入用户
  const inserted = await db.insert(schema.users).values(toInsert).returning({ id: schema.users.id })

  // 跨模块扩展钩子（如 lms 创建班级、关联 userClasses）
  await runOnUserImported(inserted, rawUsers)

  return cResp({ count: inserted.length }, `成功导入 ${inserted.length} 位用户`)
})
