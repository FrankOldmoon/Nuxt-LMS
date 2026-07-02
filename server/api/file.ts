import { join, resolve, extname, basename } from 'path'
import { createReadStream, access } from 'fs'
import { eventHandler, getQuery, sendStream, setResponseHeader, createError } from 'h3'

// 使用绝对路径，避免工作目录切换导致找不到文件
const UPLOAD_ROOT = resolve('./storage')

// 一个简单的 MIME 映射表（补充md）
const MIME_TYPES: Record<string, string> = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.bmp':  'image/bmp',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain',
  '.md':   'text/plain',
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.xml':  'application/xml',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.zip':  'application/zip',
  '.rar':  'application/vnd.rar',
  '.7z':   'application/x-7z-compressed',
}

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const pathname = query.pathname as string

  if (!pathname) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 pathname 参数',
    })
  }

  // 安全校验：去除前导 / 避免 resolve 将其当作绝对路径，拼接后必须以 UPLOAD_ROOT 开头
  const safePathname = pathname.replace(/^\/+/, '')
  const absolutePath = resolve(UPLOAD_ROOT, safePathname)
  if (!absolutePath.startsWith(UPLOAD_ROOT + '/') && absolutePath !== UPLOAD_ROOT) {
    throw createError({
      statusCode: 403,
      statusMessage: '禁止的路径访问',
    })
  }

  // 检查文件是否存在
  try {
    await new Promise<void>((resolve, reject) => {
      access(absolutePath, (err) => err ? reject(err) : resolve())
    })
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: '文件不存在',
    })
  }

  // 根据扩展名设置 Content-Type
  const ext = extname(safePathname).toLowerCase()
  const fileName = basename(safePathname) // 获取原始文件名带后缀
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  setResponseHeader(event, 'Content-Type', contentType)

  // 强缓存：上传文件内容不变，可缓存一年
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

  // 关键：添加下载文件名，浏览器下载会保留完整后缀
  // filename* 兼容中文文件名
  setResponseHeader(
    event,
    'Content-Disposition',
    `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
  )

  // 以流的形式返回文件
  const stream = createReadStream(absolutePath)
  return sendStream(event, stream)
})