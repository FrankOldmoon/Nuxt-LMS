import { resolve, extname, basename } from 'node:path'
import { createReadStream, access } from 'node:fs'
import { sendStream, setResponseHeader, createError } from 'h3'

/**
 * 按 pathname 流式返回上传文件（兼容旧路由 /api/file，等价于 /api/files/serve）
 * path-traversal 守卫 + 按扩展名设 Content-Type + 强缓存
 */
const UPLOAD_ROOT = resolve('./storage')

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp', '.ico': 'image/x-icon',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/plain',
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.xml': 'application/xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.zip': 'application/zip', '.rar': 'application/vnd.rar', '.7z': 'application/x-7z-compressed',
}

export default eventHandler(async (event) => {
  await requireAuth(event)

  const pathname = getQuery(event).pathname as string
  if (!pathname) {
    throw createError({ statusCode: 400, message: '缺少 pathname 参数' })
  }

  // 安全校验：去除前导 / 避免 resolve 当作绝对路径，拼接后必须以 UPLOAD_ROOT 开头
  const safePathname = pathname.replace(/^\/+/, '')
  const absolutePath = resolve(UPLOAD_ROOT, safePathname)
  if (!absolutePath.startsWith(UPLOAD_ROOT + '/') && absolutePath !== UPLOAD_ROOT) {
    throw createError({ statusCode: 403, message: '禁止的路径访问' })
  }

  // 检查文件是否存在
  try {
    await new Promise<void>((resolve, reject) => {
      access(absolutePath, (err) => err ? reject(err) : resolve())
    })
  } catch {
    throw createError({ statusCode: 404, message: '文件不存在' })
  }

  const ext = extname(safePathname).toLowerCase()
  const fileName = basename(safePathname)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  setResponseHeader(event, 'Content-Type', contentType)
  // 上传文件内容不变，缓存一年
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  setResponseHeader(
    event,
    'Content-Disposition',
    `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  )

  const stream = createReadStream(absolutePath)
  return sendStream(event, stream)
})
