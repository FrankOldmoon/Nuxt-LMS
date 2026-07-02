// server/api/upload.post.ts
import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { writeFile, mkdir, rename, rm } from "node:fs/promises"
import { join, extname } from "node:path"
import { readMultipartFormData } from "h3"

// 上传根目录
const UPLOAD_ROOT = './storage/'

export default eventHandler(async (event) => {
  // 1. 获取当前用户（可选）
  const user = await getCurrentUser(event)

  // 2. 解析上传文件
  const formData = await readMultipartFormData(event)
  const fileField = formData?.find(f => f.name === "files")
  if (!fileField || !fileField.filename) {
    return cResp(null, "请上传文件", false)
  }

  const buffer = fileField.data
  const originalName = fileField.filename
  const ext = extname(originalName).toLowerCase()

  // 3. 禁止危险后缀
  const dangerous = [".exe", ".sh", ".bat", ".cmd", ".ps1", ".php"]
  if (dangerous.includes(ext)) {
    return cResp(null, "不允许上传该类型文件", false)
  }

  // 4. 计算 SHA-256 哈希
  const hash = createHash("sha256").update(buffer).digest("hex")

  // 5. 查重：如果已有相同哈希的文件，直接返回
  const existing = await db.query.files.findFirst({
    where: eq(schema.files.hash, hash),
  })
  if (existing) {
    return cResp({ url: `/api/file?pathname=${encodeURIComponent(existing.path.replace(/^\/+/, ''))}` }, "文件已存在", true)
  }

  // 6. 准备日期目录
  const dateStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const dateDir = join(UPLOAD_ROOT, dateStr)
  await mkdir(dateDir, { recursive: true })

  // 7. 临时文件名：以哈希为名，扩展名不变
  const tempFileName = `${hash}${ext}`
  const tempFilePath = join(dateDir, tempFileName)
  const tempDbPath = `/${dateStr}/${tempFileName}`

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
      userId: user?.id ?? null,
    }).returning()
  } catch (error: any) {
    // 路径唯一冲突：说明另一个请求已插入相同哈希的文件
    // 删除我们刚写入的临时文件，查询那条记录并返回
    await rm(tempFilePath).catch(() => { })
    const conflict = await db.query.files.findFirst({
      where: eq(schema.files.hash, hash),
    })
    if (conflict) {
      return cResp({ url: `/api/file?pathname=${encodeURIComponent(conflict.path.replace(/^\/+/, ''))}` }, "文件已存在", true)
    }
    // 其他错误直接抛出
    throw error
  }

  // 10. 重命名为最终文件名：{id}{ext}
  const finalFileName = `${record.id}${ext}`
  const finalFilePath = join(dateDir, finalFileName)
  const finalDbPath = `/${dateStr}/${finalFileName}`

  await rename(tempFilePath, finalFilePath)

  // 11. 更新数据库路径为最终路径
  await db.update(schema.files)
    .set({ path: finalDbPath })
    .where(eq(schema.files.id, record.id))

  // 12. 返回可访问的完整 URL
  return cResp({ url: `/api/file?pathname=${encodeURIComponent(finalDbPath.replace(/^\/+/, ''))}` }, "上传成功", true)
})