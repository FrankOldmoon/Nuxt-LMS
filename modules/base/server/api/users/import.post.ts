import { db, schema } from '@nuxthub/db'

/**
 * Batch import users
 *
 * body: { users: [{ username, email, password?, name?, prefer_name?, english_name?, class?, ... }] }
 *
 * base only handles users table insertion; class/association table extensions are handled by subsequent modules
 * via the registerOnUserImported hook (e.g. lms creates classes, associates userClasses).
 */
export default eventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { users: rawUsers } = body

  if (!Array.isArray(rawUsers) || !rawUsers.length) {
    return cResp(null, 'users cannot be empty', false)
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

    // Required field validation
    if (!username) { errors.push(`Row ${line}: username cannot be empty`); continue }
    if (!email) { errors.push(`Row ${line}: email cannot be empty`); continue }

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
    return cResp({ errors }, `${errors.length} rows failed validation`, false)
  }

  // Batch insert users
  const inserted = await db.insert(schema.users).values(toInsert).returning({ id: schema.users.id })

  // Cross-module extension hook (e.g. lms creates classes, associates userClasses)
  await runOnUserImported(inserted, rawUsers)

  return cResp({ count: inserted.length }, `Successfully imported ${inserted.length} users`)
})
