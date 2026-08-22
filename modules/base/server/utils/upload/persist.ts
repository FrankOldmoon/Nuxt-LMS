/**
 * 上传步骤 3：落盘 + 写库（最终步骤）
 *
 *  1. 写入文件 hash.ext（sha256 内容哈希作为文件名，不再改名为 {id}.ext）
 *  2. 插入 files 表
 *
 * hash 命名的安全收益：serve 端点无需鉴权（公开读取），
 * 但路径含 64 位十六进制内容哈希，不可枚举猜测。
 * path 唯一冲突（23505）→ 软删记录复活 / 复用现有记录（物理文件内容一致，不删除）
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, isNotNull } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { writeFile, mkdir, rm } from 'node:fs/promises'
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

/** 落盘 + 写库（最终步骤，文件名保持 hash.ext） */
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
    // drizzle 把驱动错误包装成 DrizzleQueryError（message 为 "Failed query: ..."），
    // 真实 PostgresError 在 error.cause 上，需解包判断错误码/约束名
    const pgErr = error?.cause ?? error
    // path 唯一冲突：path 内容寻址（hash 命名），磁盘上已是同一份文件，绝不能 rm 物理文件
    if (pgErr?.code === '23505' && pgErr?.constraint_name === 'files_path_unique') {
      try {
        // 1) 旧记录已被软删（delete 仅标记 deletedAt、保留物理文件）→ 复活并更新元数据
        const [revived] = await db.update(schema.files)
          .set({
            deletedAt: null,
            name: originalName,
            type: fileType,
            size: buffer.length,
            userId,
            group: group || null,
          })
          .where(and(eq(schema.files.path, tempDbPath), isNotNull(schema.files.deletedAt)))
          .returning()
        if (revived) {
          return { id: revived.id, finalDbPath: tempDbPath, deduplicated: true }
        }
        // 2) 未软删但被查重条件漏掉（如同 hash 不同 group 的并发上传）→ 复用现有记录
        const existing = await db.query.files.findFirst({ where: eq(schema.files.path, tempDbPath) })
        if (existing) {
          return { id: existing.id, finalDbPath: tempDbPath, deduplicated: true }
        }
      } catch {
        // 恢复查询失败：DB 中确定存在冲突行（约束已触发），物理文件不能删，抛原始错误
        throw error
      }
      throw error
    }
    // 其他错误：物理文件与任何库记录无关，安全移除
    await rm(tempFilePath).catch(() => {})
    throw error
  }

  // 文件名即 hash.ext（内容寻址）：serve 公开访问但路径不可枚举
  const finalDbPath = tempDbPath

  return { id: record.id, finalDbPath }
}
