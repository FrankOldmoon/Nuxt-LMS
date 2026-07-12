/**
 * 上传步骤 2：大小 + 后缀校验 + 查重 where 构造
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { getConfigSync } from '../config/state'
import { formatBytes } from '../../../utils/fileUtils'
import { UploadError } from './parse'

const DANGEROUS_EXTS = ['.exe', '.sh', '.bat', '.cmd', '.ps1', '.php']

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

