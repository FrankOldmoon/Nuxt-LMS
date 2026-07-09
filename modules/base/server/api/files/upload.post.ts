import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"
import { createHash } from "node:crypto"
import { writeFile, mkdir, rename, rm } from "node:fs/promises"
import { join, extname } from "node:path"
import { readMultipartFormData } from "h3"
import { getConfigSync } from "../../utils/config"
import sharp from "sharp"

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

/**
 * 使用 nitro $fetch 下载远程图片并压缩为 webp quality‑85
 * 服务端环境下全局 $fetch 直接可用，不需要导入
 */
async function downloadAndCompressImageToWebp(remoteUrl: string) {
  const arrayBuffer = await $fetch<ArrayBuffer>(remoteUrl, {
    method: "GET",
    timeout: 10000,
    responseType: "arrayBuffer",
    headers: {
      "User-Agent": "Mozilla/5.0 (Node-Nitro)"
    }
  })

  const originBuffer = Buffer.from(arrayBuffer)
  const webpBuffer = await sharp(originBuffer)
    .webp({ quality: 85 })
    .toBuffer()

  const urlObj = new URL(remoteUrl)
  const originNameRaw = urlObj.pathname.split("/").pop() || "image"
  return {
    buffer: webpBuffer,
    originalExt: ".webp",
    originalFilename: originNameRaw,
    mimeType: "image/webp"
  }
}

export default eventHandler(async (event) => {
  // 1. 获取当前用户（必填，网盘空间按用户配额）
  const user = await requireAuth(event)
  const body = await readBody(event)

  let buffer: Buffer
  let originalName: string
  let ext: string
  let fileType: string
  let group = body.group ? String(body.group).trim() : ""

  // 分支1：传入url，下载远端图片并压缩成webp
  if (body.url) {
    try {
      const resData = await downloadAndCompressImageToWebp(body.url)
      buffer = resData.buffer
      originalName = resData.originalFilename
      ext = resData.originalExt
      fileType = resData.mimeType
    } catch (err) {
      return cResp(null, `远程图片获取失败：${(err as Error).message}`, false)
    }
  } else {
    // 分支2：原有表单上传逻辑
    const formData = await readMultipartFormData(event)
    const fileField = formData?.find(f => f.name === "files")
    if (!fileField || !fileField.filename) {
      return cResp(null, "请上传文件", false)
    }
    buffer = fileField.data
    originalName = fileField.filename
    ext = extname(originalName).toLowerCase()
    fileType = fileField.type

    const groupField = formData?.find(f => f.name === "group")
    if (groupField?.data) {
      group = Buffer.from(groupField.data).toString("utf8").trim()
    }

    // 禁止危险后缀
    const dangerous = [".exe", ".sh", ".bat", ".cmd", ".ps1", ".php"]
    if (dangerous.includes(ext)) {
      return cResp(null, "不允许上传该类型文件", false)
    }
  }

  // 3.1 检查单文件大小限制
  const maxFileSizeMB = Number(getConfigSync("site:maxFileSize")) || 50
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024
  if (buffer.length > maxFileSizeBytes) {
    return cResp(
      { maxSize: maxFileSizeMB, actualSize: +(buffer.length / 1024 / 1024).toFixed(1) },
      `文件过大：最大允许 ${maxFileSizeMB}MB，当前文件 ${formatBytes(buffer.length)}`,
      false
    )
  }

  // 3.2 文件白名单（远程图片已经强制webp，这里自动跳过校验）
  const allowed = String(getConfigSync("site:allowedFileTypes") || "").trim()
  if (allowed && ext !== ".webp") {
    const allowedExts = allowed.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
    if (allowedExts.length && !allowedExts.includes(ext)) {
      return cResp(null, `不允许上传该类型文件：${ext}`, false)
    }
  }

  // 3.3 检查网盘空间
  const space = await checkDriveSpace({ id: user.id, roles: user.roles }, buffer.length)
  if (!space.ok) {
    return cResp(
      { quota: space.quota, used: space.used, need: buffer.length },
      `网盘空间不足：已用 ${formatBytes(space.used)}，配额 ${formatBytes(space.quota)}，本次需 ${formatBytes(buffer.length)}`,
      false
    )
  }

  // 4. sha256哈希
  const hash = createHash("sha256").update(buffer).digest("hex")

  // 5. 查重：仅在未删除的记录中匹配（软删除的文件视为不存在，可重新上传）
  const dedupWhere = group
    ? and(eq(schema.files.hash, hash), eq(schema.files.group, group), isNull(schema.files.deletedAt))
    : and(eq(schema.files.hash, hash), isNull(schema.files.group), isNull(schema.files.deletedAt))
  const existing = await db.query.files.findFirst({ where: dedupWhere })
  if (existing) {
    return cResp(
      { url: `/api/files/serve?pathname=${encodeURIComponent(existing.path.replace(/^\/+/, ""))}` },
      "文件已存在",
      true
    )
  }

  // 6. 目录结构
  const baseDate = new Date("2026-01-01T00:00:00Z")
  const now = new Date()
  const daysSinceBase = Math.floor((now.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000))
  const dayDirName = String(daysSinceBase)
  const dayDir = join(UPLOAD_ROOT, dayDirName)
  await mkdir(dayDir, { recursive: true })

  //7.临时文件
  const tempFileName = `${hash}${ext}`
  const tempFilePath = join(dayDir, tempFileName)
  const tempDbPath = `/${dayDirName}/${tempFileName}`
  await writeFile(tempFilePath, buffer)

  //8.插入数据库
  let record
  try {
    ;[record] = await db.insert(schema.files).values({
      name: originalName,
      hash,
      path: tempDbPath,
      type: fileType,
      size: buffer.length,
      userId: user.id,
      group: group || null
    }).returning()
  } catch (error: any) {
    await rm(tempFilePath).catch(() => { })
    const conflict = await db.query.files.findFirst({ where: dedupWhere })
    if (conflict) {
      return cResp({ url: `/api/files/serve?pathname=${encodeURIComponent(conflict.path.replace(/^\/+/, ""))}` }, "文件已存在", true)
    }
    throw error
  }

  //9.重命名为id+后缀
  const finalFileName = `${record.id}${ext}`
  const finalFilePath = join(dayDir, finalFileName)
  const finalDbPath = `/${dayDirName}/${finalFileName}`
  await rename(tempFilePath, finalFilePath)

  // 更新数据库路径
  await db.update(schema.files)
    .set({ path: finalDbPath })
    .where(eq(schema.files.id, record.id))

  return cResp(
    { id: record.id, url: `/api/files/serve?pathname=${encodeURIComponent(finalDbPath.replace(/^\/+/, ""))}` },
    "上传成功",
    true
  )
})
