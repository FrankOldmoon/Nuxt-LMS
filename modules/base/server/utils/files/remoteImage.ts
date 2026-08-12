/**
 * 文件存储工具：远程图片下载 + 压缩
 *
 * 单独抽出以便：
 * 1. unit test 可独立测试（无需 fs / multipart）
 * 2. handler 主流程保持薄
 */
import sharp from 'sharp'

/** 通过 magic number 判断 buffer 是否为 GIF（GIF87a / GIF89a） */
function isGifBuffer(buf: Buffer): boolean {
  if (buf.length < 6) return false
  const sig = buf.subarray(0, 6).toString('ascii')
  return sig === 'GIF87a' || sig === 'GIF89a'
}

/**
 * 将 GIF 转为 animated webp（保留动画）
 * 压缩后变大或转码失败则回退原 GIF
 * @returns { buffer, ext, mimeType }；非 GIF 原样返回
 */
export async function compressGifBuffer(buffer: Buffer): Promise<{ buffer: Buffer; ext: string; mimeType: string }> {
  const fallback = { buffer, ext: '.gif', mimeType: 'image/gif' }
  if (!isGifBuffer(buffer)) return fallback
  try {
    const webpBuffer = await sharp(buffer, { animated: true })
      .webp({ quality: 85 })
      .toBuffer()
    if (webpBuffer.length >= buffer.length) return fallback
    return { buffer: webpBuffer, ext: '.webp', mimeType: 'image/webp' }
  } catch {
    return fallback
  }
}

/**
 * 下载远程图片，使用 sharp 压缩为 webp quality=85
 * GIF 转为 animated webp（保留动画），变大/失败回退原 GIF
 * 服务端环境下全局 $fetch 可用，无需 import
 */
export async function downloadAndCompressImageToWebp(remoteUrl: string) {
  const arrayBuffer = await $fetch<ArrayBuffer>(remoteUrl, {
    method: 'GET',
    timeout: 10000,
    responseType: 'arrayBuffer',
    headers: { 'User-Agent': 'Mozilla/5.0 (Node-Nitro)' },
  })

  const originBuffer = Buffer.from(arrayBuffer)
  const urlObj = new URL(remoteUrl)
  const originNameRaw = urlObj.pathname.split('/').pop() || 'image'

  // GIF：转 animated webp（保留动画），变大/失败回退原 GIF
  if (isGifBuffer(originBuffer)) {
    const r = await compressGifBuffer(originBuffer)
    return {
      buffer: r.buffer,
      originalExt: r.ext,
      originalFilename: originNameRaw,
      mimeType: r.mimeType,
    }
  }

  const webpBuffer = await sharp(originBuffer)
    .webp({ quality: 85 })
    .toBuffer()

  return {
    buffer: webpBuffer,
    originalExt: '.webp',
    originalFilename: originNameRaw,
    mimeType: 'image/webp',
  }
}
