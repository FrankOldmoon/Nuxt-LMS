import { join, resolve, extname } from 'path'
import { createReadStream, access } from 'fs'
import { eventHandler, getQuery, sendStream, setResponseHeader, createError } from 'h3'

// 使用绝对路径，避免工作目录切换导致找不到文件
const UPLOAD_ROOT = './storage'

// 一个简单的 MIME 映射表（可按需扩充）
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

  // 安全校验：拼接绝对路径后，必须仍以 UPLOAD_ROOT 开头
  const absolutePath = resolve(UPLOAD_ROOT, pathname)
  if (!absolutePath.startsWith(UPLOAD_ROOT + '/')) {
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
  const ext = extname(pathname).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  setResponseHeader(event, 'Content-Type', contentType)

  // 强缓存：上传文件内容不变，可缓存一年
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

  // 以流的形式返回文件
  const stream = createReadStream(absolutePath)
  return sendStream(event, stream)
})