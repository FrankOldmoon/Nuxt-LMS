export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const body = await readBody(event)

  // Whitelist: only allow updating safe fields
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
    return cResp(null, 'No fields to update', false)
  }

  await updateTable('users', authUser.id, updateData)
  return cResp(null, 'Updated successfully')
})
