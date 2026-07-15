/**
 * File storage utility: remote image download + compression
 *
 * Extracted separately so that:
 * 1. unit tests can run independently (no fs / multipart needed)
 * 2. handler main flow stays thin
 */
import sharp from 'sharp'

/**
 * Download remote image, compress to webp quality=85 using sharp
 * In server environment, global $fetch is available, no import needed
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
