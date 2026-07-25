/**
 * 上传步骤 3：落盘 + 写库 + 改名（最终步骤）
 *
 *  1. 写入临时文件 hash.ext
 *  2. 插入 files 表（拿到 id）
 *  3. 重命名为 {id}.ext，更新 db.path
 * 并发插入失败 → 移除临时文件 + 抛错（外层 catch 复用 buildDedupWhere 重新查重）
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

/** 在 UPLOAD_ROOT 下按"距 2026-01-01 天数"生成目录名 */
export function dayDirNameFn(now: Date = new Date()): string {
  const baseDate = new Date('2026-01-01T00:00:00Z')
  const daysSinceBase = Math.floor((now.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000))
  return String(daysSinceBase)
}

/** 把 buffer 落盘为 hash.ext 临时文件，返回 { tempPath, tempDbPath } */
export async function writeTempFile(buffer: Buffer, hash: string, ext: string, dayDir: string, dayDirName: string) {
  const tempFileName = `${hash}${ext}`
  const tempFilePath = join(dayDir, tempFileName)
  // DB path 只保留 UPLOAD_ROOT 之内的相对目录（serve 端会自己拼接 UPLOAD_ROOT）
  const tempDbPath = `/${dayDirName}/${tempFileName}`
  await writeFile(tempFilePath, buffer)
  return { tempFilePath, tempDbPath }
}

/** 落盘 + 写库 + 改名（最终步骤） */
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
  // DB path 只保留 UPLOAD_ROOT 之内的相对路径，避免 URL 里出现 storage 前缀
  const finalDbPath = `/${dayDirName}/${finalFileName}`
  await rename(tempFilePath, finalFilePath)
  await db.update(schema.files)
    .set({ path: finalDbPath })
    .where(eq(schema.files.id, record.id))

  return { id: record.id, finalDbPath }
}
