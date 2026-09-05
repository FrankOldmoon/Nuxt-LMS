import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

// 文件元数据查询：按存储路径返回原始文件名与大小，供历史 url 补全展示
// GET /api/files/meta?pathname=<storage 相对路径（可为编码形式）>
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const { pathname } = getQuery(event)
  if (!pathname) return cResp(null, '缺少 pathname 参数', false)

  const filePath = decodeURIComponent(String(pathname)).replace(/^\/+/, '')
  const row = await db.query.files.findFirst({ where: eq(schema.files.path, filePath) })
  if (!row) return cResp(null, '文件不存在', false)

  return cResp({ name: row.name, size: row.size ?? 0 })
})