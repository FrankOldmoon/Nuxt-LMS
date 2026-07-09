import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"
import { createHash } from "node:crypto"
import { writeFile, mkdir, rename, rm } from "node:fs/promises"
import { join, extname } from "node:path"
import { readMultipartFormData } from "h3"
import { getConfigSync } from "../../utils/config"

// 字节格式化（用于空间不足提示）
function formatBytes(n: number): string {
  if (!n || n < 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// 上传根目录
const UPLOAD_ROOT = './storage/'

export default eventHandler(async (event) => {
  // 1. 获取当前用户（必填，网盘空间按用户配额）
  const user = await requireAuth(event)

  // 2. 解析上传文件
  const formData = await readMultipartFormData(event)
  const fileField = formData?.find(f => f.name === "files")
  if (!fileField || !fileField.filename) {
    return cResp(null, "请上传文件", false)
  }

  const buffer = fileField.data
  const originalName = fileField.filename
  const ext = extname(originalName).toLowerCase()

  // 可选：小组网盘空间标识（设置后文件归属到小组共享空间）
  const groupField = formData?.find(f => f.name === "group")
  const group = groupField?.data ? String(Buffer.from(groupField.data).toString('utf8')).trim() : ''

  // 3. 禁止危险后缀
  const dangerous = [".exe", ".sh", ".bat", ".cmd", ".ps1", ".php"]
  if (dangerous.includes(ext)) {
    return cResp(null, "不允许上传该类型文件", false)
  }

  // 3.1 检查单文件大小限制
  const maxFileSizeMB = Number(getConfigSync('site:maxFileSize')) || 50
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024
  if (buffer.length > maxFileSizeBytes) {
    return cResp(
      { maxSize: maxFileSizeMB, actualSize: +(buffer.length / 1024 / 1024).toFixed(1) },
      `文件过大：最大允许 ${maxFileSizeMB}MB，当前文件 ${formatBytes(buffer.length)}`,
      false,
    )
  }

  // 3.2 检查允许的文件类型白名单（逗号分隔扩展名，如 ".jpg,.png,.pdf"；为空则不限制）
  const allowed = String(getConfigSync('site:allowedFileTypes') || '').trim()
  if (allowed) {
    const allowedExts = allowed.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    if (allowedExts.length && !allowedExts.includes(ext)) {
      return cResp(null, `不允许上传该类型文件：${ext}`, false)
    }
  }

  // 3.3 检查个人网盘空间是否足够（admin 不限）
  const space = await checkDriveSpace({ id: user.id, roles: user.roles }, buffer.length)
  if (!space.ok) {
    return cResp(
      { quota: space.quota, used: space.used, need: buffer.length },
      `网盘空间不足：已用 ${formatBytes(space.used)}，配额 ${formatBytes(space.quota)}，本次需 ${formatBytes(buffer.length)}`,
      false,
    )
  }

  // 4. 计算 SHA-256 哈希
  const hash = createHash("sha256").update(buffer).digest("hex")

  // 5. 查重：小组文件按 hash + group 去重；个人文件按 hash + group IS NULL 去重
  const dedupWhere = group
    ? and(eq(schema.files.hash, hash), eq(schema.files.group, group))
    : and(eq(schema.files.hash, hash), isNull(schema.files.group))
  const existing = await db.query.files.findFirst({
    where: dedupWhere,
  })
  if (existing) {
    return cResp({ url: `/api/files/serve?pathname=${encodeURIComponent(existing.path.replace(/^\/+/, ''))}` }, "文件已存在", true)
  }

  // 6. 准备目录：以距离 2026-01-01 的天数为目录名
  const baseDate = new Date('2026-01-01T00:00:00Z')
  const now = new Date()
  const daysSinceBase = Math.floor((now.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000))
  const dayDirName = String(daysSinceBase)
  const dayDir = join(UPLOAD_ROOT, dayDirName)
  await mkdir(dayDir, { recursive: true })

  // 7. 临时文件名：以哈希为名，扩展名不变
  const tempFileName = `${hash}${ext}`
  const tempFilePath = join(dayDir, tempFileName)
  const tempDbPath = `/${dayDirName}/${tempFileName}`

  // 8. 写入临时文件
  await writeFile(tempFilePath, buffer)

  // 9. 插入数据库（临时路径，path 唯一约束会拦截并发重复）
  let record
  try {
    ;[record] = await db.insert(schema.files).values({
      name: originalName,
      hash,
      path: tempDbPath,
      type: fileField.type,
      size: buffer.length,
      userId: user.id,
      group: group || null,
    }).returning()
  } catch (error: any) {
    // 路径唯一冲突：说明另一个请求已插入相同哈希的文件
    // 删除我们刚写入的临时文件，查询那条记录并返回
    await rm(tempFilePath).catch(() => { })
    const conflict = await db.query.files.findFirst({
      where: dedupWhere,
    })
    if (conflict) {
      return cResp({ url: `/api/files/serve?pathname=${encodeURIComponent(conflict.path.replace(/^\/+/, ''))}` }, "文件已存在", true)
    }
    // 其他错误直接抛出
    throw error
  }

  // 10. 重命名为最终文件名：{id}{ext}
  const finalFileName = `${record.id}${ext}`
  const finalFilePath = join(dayDir, finalFileName)
  const finalDbPath = `/${dayDirName}/${finalFileName}`

  await rename(tempFilePath, finalFilePath)

  // 11. 更新数据库路径为最终路径
  await db.update(schema.files)
    .set({ path: finalDbPath })
    .where(eq(schema.files.id, record.id))

  // 12. 返回可访问的完整 URL
  return cResp({ url: `/api/files/serve?pathname=${encodeURIComponent(finalDbPath.replace(/^\/+/, ''))}` }, "上传成功", true)
})
