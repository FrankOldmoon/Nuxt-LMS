/**
 * Upload step 3: persist to disk + write DB + rename (final step)
 *
 *  1. Write temp file hash.ext
 *  2. Insert into files table (get id)
 *  3. Rename to {id}.ext, update db.path
 * Concurrent insert failure → remove temp file + throw error (outer catch reuses buildDedupWhere to re-dedup)
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { writeFile, mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

/** sha256 hex */
export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/** Generate directory name under UPLOAD_ROOT by "days since 2026-01-01" */
export function dayDirNameFn(now: Date = new Date()): string {
  const baseDate = new Date('2026-01-01T00:00:00Z')
  const daysSinceBase = Math.floor((now.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000))
  return String(daysSinceBase)
}

/** Write buffer to disk as hash.ext temp file, return { tempPath, tempDbPath } */
export async function writeTempFile(buffer: Buffer, hash: string, ext: string, dayDir: string, dayDirName: string) {
  const tempFileName = `${hash}${ext}`
  const tempFilePath = join(dayDir, tempFileName)
  // DB path keeps only the relative directory within UPLOAD_ROOT (serve endpoint will prepend UPLOAD_ROOT itself)
  const tempDbPath = `/${dayDirName}/${tempFileName}`
  await writeFile(tempFilePath, buffer)
  return { tempFilePath, tempDbPath }
}

/** Persist to disk + write DB + rename (final step) */
export async function persistUploadedFile(args: {
  buffer: Buffer
  hash: string
  ext: string
  originalName: string
  fileType: string
  group: string
  userId: number
  uploadRoot: string
}) {
  const { buffer, hash, ext, originalName, fileType, group, userId, uploadRoot } = args
  const dayDirName = dayDirNameFn()
  const dayDir = join(uploadRoot, dayDirName)
  await mkdir(dayDir, { recursive: true })
  const { tempFilePath, tempDbPath } = await writeTempFile(buffer, hash, ext, dayDir, dayDirName)

  let record: any
  try {
    ;[record] = await db.insert(schema.files).values({
      name: originalName,
      hash,
      path: tempDbPath,
      type: fileType,
      size: buffer.length,
      userId,
      group: group || null,
    }).returning()
  } catch (error: any) {
    await rm(tempFilePath).catch(() => {})
    throw error
  }

  const finalFileName = `${record.id}${ext}`
  const finalFilePath = join(dayDir, finalFileName)
  // DB path keeps only the relative path within UPLOAD_ROOT to avoid the storage prefix in the URL
  const finalDbPath = `/${dayDirName}/${finalFileName}`
  await rename(tempFilePath, finalFilePath)
  await db.update(schema.files)
    .set({ path: finalDbPath })
    .where(eq(schema.files.id, record.id))

  return { id: record.id, finalDbPath }
}
