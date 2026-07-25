/**
 * 文件存储工具：远程图片下载 + 压缩
 *
 * 单独抽出以便：
 * 1. unit test 可独立测试（无需 fs / multipart）
 * 2. handler 主流程保持薄
 */
import sharp from 'sharp'

/**
 * 下载远程图片，使用 sharp 压缩为 webp quality=85
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
  const webpBuffer = await sharp(originBuffer)
    .webp({ quality: 85 })
    .toBuffer()

  const urlObj = new URL(remoteUrl)
  const originNameRaw = urlObj.pathname.split('/').pop() || 'image'
  return {
    buffer: webpBuffer,
    originalExt: '.webp',
    originalFilename: originNameRaw,
    mimeType: 'image/webp',
  }
}
