export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const body = await readBody(event)

  // 白名单：只允许更新安全字段
  const allowedFields = [
    'name',
    'preferName',
    'englishName',
    'email',
    'gender',
    'rollNumber',
    'classId',
    'telephone',
    'defaultClass',
    'defaultLocale',
    'avatarImg',
  ]

  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return cResp(null, '没有需要更新的字段', false)
  }

  await updateTable('users', authUser.id, updateData)
  return cResp(null, '更新成功')
})
