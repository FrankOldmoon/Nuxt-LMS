import { db, schema } from '@nuxthub/db'
import { cResp } from '../../utils/index'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)

  // 仅管理员可查看系统配置
  if (!authUser.roles.includes('admin')) {
    return cResp(null, '无权限', false)
  }

  const configRows = await db
    .select()
    .from(schema.configs)
    .orderBy(schema.configs.order)

  return cResp(configRows)
})
