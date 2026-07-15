/**
 * Upload step 2: size + extension validation + dedup where construction
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { getConfigSync } from '../config/state'
import { formatBytes } from '../../../utils/fileUtils'
import { UploadError } from './parse'

const DANGEROUS_EXTS = ['.exe', '.sh', '.bat', '.cmd', '.ps1', '.php']

/** Size + extension validation, throws UploadError on failure (webp extension skipped) */
export function validateUpload(buffer: Buffer, ext: string) {
  const maxFileSizeMB = Number(getConfigSync('site:maxFileSize')) || 50
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024
  if (buffer.length > maxFileSizeBytes) {
    throw new UploadError(
      `File too large: max allowed ${maxFileSizeMB}MB, current file ${formatBytes(buffer.length)}`,
      'size',
      { maxSize: maxFileSizeMB, actualSize: +(buffer.length / 1024 / 1024).toFixed(1) },
    )
  }
  if (ext !== '.webp' && DANGEROUS_EXTS.includes(ext)) {
    throw new UploadError('This file type is not allowed', 'type')
  }
  const allowed = String(getConfigSync('site:allowedFileTypes') || '').trim()
  if (allowed && ext !== '.webp') {
    const allowedExts = allowed.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    if (allowedExts.length && !allowedExts.includes(ext)) {
      throw new UploadError(`This file type is not allowed: ${ext}`, 'type')
    }
  }
}

/** Dedup where: same hash + group and not soft-deleted (reused by concurrent upload catch branch) */
export function buildDedupWhere(hash: string, group: string) {
  return group
    ? and(eq(schema.files.hash, hash), eq(schema.files.group, group), isNull(schema.files.deletedAt))
    : and(eq(schema.files.hash, hash), isNull(schema.files.group), isNull(schema.files.deletedAt))
}

