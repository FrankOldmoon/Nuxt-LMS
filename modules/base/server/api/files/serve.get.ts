import { resolve, extname, basename } from 'node:path'
import { createReadStream, access } from 'node:fs'
import { sendStream, setResponseHeader, createError } from 'h3'

/**
 * Stream uploaded file by pathname (replaces the original /api/file)
 * Path-traversal guard + set Content-Type by extension + strong caching
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
    throw createError({ statusCode: 400, message: 'Missing pathname parameter' })
  }

  // Safety check: strip leading / to avoid resolve treating it as absolute path, concatenated path must start with UPLOAD_ROOT
  const safePathname = pathname.replace(/^\/+/, '')
  const absolutePath = resolve(UPLOAD_ROOT, safePathname)
  if (!absolutePath.startsWith(UPLOAD_ROOT + '/') && absolutePath !== UPLOAD_ROOT) {
    throw createError({ statusCode: 403, message: 'Forbidden path access' })
  }

  // Check if file exists
  try {
    await new Promise<void>((resolve, reject) => {
      access(absolutePath, (err) => err ? reject(err) : resolve())
    })
  } catch {
    throw createError({ statusCode: 404, message: 'File does not exist' })
  }

  const ext = extname(safePathname).toLowerCase()
  const fileName = basename(safePathname)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  setResponseHeader(event, 'Content-Type', contentType)
  // Uploaded file content is immutable, cache for one year
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  setResponseHeader(
    event,
    'Content-Disposition',
    `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  )

  const stream = createReadStream(absolutePath)
  return sendStream(event, stream)
})
