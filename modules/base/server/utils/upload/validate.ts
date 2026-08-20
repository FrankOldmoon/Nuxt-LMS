/**
 * 上传步骤 2：大小 + 后缀校验 + 查重 where 构造
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { getConfigSync } from '../config/state'
import { formatBytes } from '../../../utils/fileUtils'
import { UploadError } from './parse'

const DANGEROUS_EXTS = ['.exe', '.sh', '.bat', '.cmd', '.ps1', '.php']

/**
 * SVG 消毒：移除 <script>/<foreignObject>、事件处理器属性(on*)与 javascript: URL，
 * 防止存储型 XSS（浏览器直接打开上传的 .svg 时脚本在站内执行）。
 * 仅用于 .svg 上传内容，防御纵深之一（serve 端另有 CSP 兜底）。
 */
export function sanitizeSvg(buffer: Buffer): Buffer {
  let text = buffer.toString('utf8')
  // 去除 <script>...</script> 及自闭合 <script/>
  text = text.replace(/<script[\s\S]*?<\/script\s*>/gi, '')
  text = text.replace(/<script[^>]*\/?>/gi, '')
  // 去除 foreignObject（可内嵌 HTML/脚本）
  text = text.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
  // 去除所有事件处理器属性 on*=
  text = text.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  // 去除 javascript: 伪协议 URL（href / xlink:href / src），保留属性名
  text = text.replace(/(\b(?:href|xlink:href|src)\s*=\s*)["']\s*javascript:[^"']*["']/gi, (match, prefix) => `${prefix}""`)
  return Buffer.from(text, 'utf8')
}

/** 校验 .svg 文件内容确为 SVG（MIME 嗅探），防止伪装成 SVG 的其他文档直开 */
export function isSvgContent(buffer: Buffer): boolean {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '').trimStart()
  return /<svg[\s>]/i.test(text)
}

/** 大小 + 后缀两道校验，失败抛 UploadError（webp 后缀跳过） */
export function validateUpload(buffer: Buffer, ext: string) {
  const maxFileSizeMB = Number(getConfigSync('site:maxFileSize')) || 50
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024
  if (buffer.length > maxFileSizeBytes) {
    throw new UploadError(
      `文件过大：最大允许 ${maxFileSizeMB}MB，当前文件 ${formatBytes(buffer.length)}`,
      'size',
      { maxSize: maxFileSizeMB, actualSize: +(buffer.length / 1024 / 1024).toFixed(1) },
    )
  }
  if (ext !== '.webp' && DANGEROUS_EXTS.includes(ext)) {
    throw new UploadError('不允许上传该类型文件', 'type')
  }
  const allowed = String(getConfigSync('site:allowedFileTypes') || '').trim()
  if (allowed && ext !== '.webp') {
    const allowedExts = allowed.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    if (allowedExts.length && !allowedExts.includes(ext)) {
      throw new UploadError(`不允许上传该类型文件：${ext}`, 'type')
    }
  }
}

/** 查重 where：同 hash + group 且未软删（并发上传 catch 分支复用） */
export function buildDedupWhere(hash: string, group: string) {
  return group
    ? and(eq(schema.files.hash, hash), eq(schema.files.group, group), isNull(schema.files.deletedAt))
    : and(eq(schema.files.hash, hash), isNull(schema.files.group), isNull(schema.files.deletedAt))
}

