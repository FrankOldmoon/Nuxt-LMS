import { db, schema } from '@nuxthub/db'
import { and, isNull, eq, ne } from 'drizzle-orm'

export default eventHandler(async (event) => {
  // 可见性：归档(archived) 所有角色均不可见；草稿(draft) 仅管理员可见；已发布(published) 全员可见
  const user = await getCurrentUser(event)
  const isAdmin = !!user?.roles.includes('admin')
  const data = await db.query.courses.findMany({
    where: isAdmin
      ? and(isNull(schema.courses.deletedAt), ne(schema.courses.status, 'archived'))
      : and(isNull(schema.courses.deletedAt), eq(schema.courses.status, 'published')),
  })
  return cResp(data)
})