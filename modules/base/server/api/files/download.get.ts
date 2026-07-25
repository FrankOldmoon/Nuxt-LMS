import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { resolve, extname, basename } from 'node:path'
import { createReadStream, access } from 'fs'
import { sendStream, setResponseHeader, createError } from 'h3'

const UPLOAD_ROOT = resolve('./storage')

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/plain',
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.zip': 'application/zip', '.rar': 'application/vnd.rar',
}

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = Number(getQuery(event).id)
  if (!id) throw createError({ statusCode: 400, message: '缺少 id 参数' })

  // 仅允许下载自己的文件
  const file = await db.query.files.findFirst({
    where: and(eq(schema.files.id, id), eq(schema.files.userId, user.id), isNull(schema.files.deletedAt)),
  })
  if (!file) throw createError({ statusCode: 404, message: '文件不存在或无权限' })

  const absolutePath = resolve(UPLOAD_ROOT, file.path.replace(/^\/+/, ''))
  if (!absolutePath.startsWith(UPLOAD_ROOT + '/')) {
    throw createError({ statusCode: 403, message: '禁止的路径访问' })
  }

  try {
    await new Promise<void>((resolve, reject) => {
      access(absolutePath, (err) => err ? reject(err) : resolve())
    })
  } catch {
    throw createError({ statusCode: 404, message: '文件不存在' })
  }

  const ext = extname(file.path).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  setResponseHeader(event, 'Content-Type', contentType)
  // attachment 触发下载，使用原文件名
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.name)}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  )

  const stream = createReadStream(absolutePath)
  return sendStream(event, stream)
})
