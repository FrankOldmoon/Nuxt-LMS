import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { resolve, extname, basename } from 'node:path'
import { createReadStream, access } from 'node:fs'
import { sendStream, setResponseHeader, createError } from 'h3'

/**
 * 按 pathname 流式返回上传文件（替代原 /api/file）
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

// 文本 / 代码文件：浏览器直接点击时以文本预览（而非触发下载）
// 这些扩展名若走默认 application/octet-stream 或 application/javascript 会被下载，统一覆盖为 text/plain
const TEXT_PREVIEW_EXTS = new Set([
  '.txt', '.md', '.markdown', '.log', '.csv', '.tsv',
  '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx',
  '.json', '.json5', '.css', '.scss', '.less', '.sass',
  '.html', '.htm', '.xml', '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg', '.env', '.properties',
  '.py', '.java', '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
  '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.kts', '.dart', '.lua', '.r', '.scala', '.groovy',
  '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1',
  '.sql', '.graphql', '.gql', '.proto',
  '.vue', '.svelte', '.astro',
])

// SVG 直开 XSS 兜底：default-src 'none' → script-src 继承 'none'，禁止脚本执行；
// 仅放行内联样式与图片/媒体/字体资源，不影响作为 <img>/<iframe> 正常展示
const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob: https: http:; media-src data: blob: https: http:; font-src data: https: http:"

export default eventHandler(async (event) => {

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
  // 查询数据库获取原始文件名用于下载（DB.path 形如 /{dayDir}/{id}.ext，与 '/' + safePathname 对齐）
  const file = await db.query.files.findFirst({ where: eq(schema.files.path, '/' + safePathname) })
  const fileName = file?.name || basename(safePathname)
  // 文本/代码文件统一以纯文本预览，避免 application/octet-stream / application/javascript 触发下载
  const contentType = TEXT_PREVIEW_EXTS.has(ext)
    ? 'text/plain; charset=utf-8'
    : (MIME_TYPES[ext] || 'application/octet-stream')
  setResponseHeader(event, 'Content-Type', contentType)
  // 上传文件内容不变，缓存一年
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  // 防止 MIME 嗅探将上传内容按 HTML 渲染（存储型 XSS 兜底）
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  // SVG 直开时禁止脚本执行（覆盖历史上已上传的恶意 SVG）
  if (ext === '.svg') {
    setResponseHeader(event, 'Content-Security-Policy', SVG_CSP)
  }
  // ASCII 兜底文件名：去除非 ASCII 与双引号/控制字符，避免 header 出现非 ASCII 触发 ERR_INVALID_CHAR
  // filename* 用 RFC 5987 百分号编码保留完整 UTF-8 原名
  const asciiName = fileName.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '').trim() || 'file'
  setResponseHeader(
    event,
    'Content-Disposition',
    `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  )

  const stream = createReadStream(absolutePath)
  return sendStream(event, stream)
})
