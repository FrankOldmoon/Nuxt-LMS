/**
 * 文件上传 API
 * POST /api/files/upload
 *
 * 两种来源：
 *  1) JSON body: { url }        - 远程图片下载 + sharp webp 压缩
 *  2) multipart: files[] + group - 原始表单上传
 *
 * 流程：解析来源 → 校验 → 配额 → 哈希+查重 → 落盘写库
 */
import { db } from '@nuxthub/db'
import { resolveUploadSource, UploadError } from '../../utils/upload/parse'
import { compressGifBuffer } from '../../utils/files/remoteImage'
import {
  validateUpload, isSvgContent, sanitizeSvg, buildDedupWhere,
} from '../../utils/upload/validate'
import { sha256Hex, persistUploadedFile } from '../../utils/upload/persist'
import { formatBytes } from '../../../utils/fileUtils'
const UPLOAD_ROOT = './storage/'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  // 1. 解析来源
  let source: any
  try {
    source = await resolveUploadSource(event, body)
  } catch (e: any) {
    if (e instanceof UploadError && e.code === 'empty') return cResp(null, e.message, false)
    return cResp(null, `远程图片获取失败：${e?.message || e}`, false)
  }
  let { buffer, originalName, ext, fileType, group } = source

  // 1.5 GIF → animated webp 转码（保留动画，变大/失败回退原 GIF）
  if (ext === '.gif' || fileType === 'image/gif') {
    const r = await compressGifBuffer(buffer)
    buffer = r.buffer
    ext = r.ext
    fileType = r.mimeType
  }

  // 2. 校验（大小 + 后缀）
  try {
    validateUpload(buffer, ext)
  } catch (e: any) {
    return cResp(e.extra || null, e.message, false)
  }

  // 2.5 SVG：MIME 嗅探 + 消毒（移除脚本/事件处理器/javascript: URL）
  if (ext === '.svg' || fileType === 'image/svg+xml') {
    if (!isSvgContent(buffer)) {
      return cResp(null, '非法的 SVG 文件内容', false)
    }
    buffer = sanitizeSvg(buffer)
  }

  // 3. 网盘配额
  const space = await checkDriveSpace({ id: user.id, roles: user.roles }, buffer.length)
  if (!space.ok) {
    return cResp(
      { quota: space.quota, used: space.used, need: buffer.length },
      `网盘空间不足：已用 ${formatBytes(space.used)}，配额 ${formatBytes(space.quota)}，本次需 ${formatBytes(buffer.length)}`,
      false,
    )
  }

  // 4. 哈希 + 查重
  const hash = sha256Hex(buffer)
  const dedupWhere = buildDedupWhere(hash, group)
  const existing = await db.query.files.findFirst({ where: dedupWhere })
  if (existing) {
    return cResp({ url: `/api/files/serve?pathname=${encodeURIComponent(existing.path.replace(/^\/+/, ''))}` }, '文件已存在', true)
  }

  // 5. 落盘 + 写库（path 唯一冲突在 persist 内恢复：软删记录复活 / 复用现有记录）
  try {
    const { id, finalDbPath, deduplicated } = await persistUploadedFile({
      buffer, hash, ext, originalName, fileType, group,
      userId: user.id, uploadRoot: UPLOAD_ROOT,
    })
    return cResp(
      {
        id,
        url: `/api/files/serve?pathname=${encodeURIComponent(finalDbPath.replace(/^\/+/, ''))}`,
        // 原始文件名 + 落盘字节数：前端列表展示用（历史数据可经 /api/files/meta 补全）
        name: originalName,
        size: buffer.length,
      },
      deduplicated ? '文件已存在' : '上传成功', true,
    )
  } catch (err: any) {
    const conflict = await db.query.files.findFirst({ where: dedupWhere })
    if (conflict) {
      return cResp({ url: `/api/files/serve?pathname=${encodeURIComponent(conflict.path.replace(/^\/+/, ''))}` }, '文件已存在', true)
    }
    throw err
  }
})
