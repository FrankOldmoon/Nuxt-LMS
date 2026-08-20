/**
 * 文件存储工具：远程图片下载 + 压缩
 *
 * 单独抽出以便：
 * 1. unit test 可独立测试（无需 fs / multipart）
 * 2. handler 主流程保持薄
 *
 * 安全（H2 SSRF）：
 * - assertSafeRemoteUrl：仅允许 http/https，禁止访问内网/保留地址（IP 字面量 + DNS 解析后校验）
 * - sniffImageMime：图片格式白名单（仅接受真实图片 magic number），非图片内容直接拒绝
 */
import sharp from 'sharp'
import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

/** 通过 magic number 判断 buffer 是否为 GIF（GIF87a / GIF89a） */
function isGifBuffer(buf: Buffer): boolean {
  if (buf.length < 6) return false
  const sig = buf.subarray(0, 6).toString('ascii')
  return sig === 'GIF87a' || sig === 'GIF89a'
}

/**
 * 判断 IP 是否为内网/保留地址（禁止作为 SSRF 目标）。
 * node:net 的 isPrivate 在当前运行环境不可用，这里手动按 CIDR 判断。
 */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const octets = v4.slice(1).map(Number)
    if (octets.some(n => Number.isNaN(n) || n > 255)) return true
    const [a, b] = octets
    // 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.2/24, 192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4
    if (a === 0) return true
    if (a === 10) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 0 && octets[2] === 2) return true
    if (a === 192 && b === 168) return true
    if (a === 198 && (b === 18 || b === 19)) return true
    if (a === 198 && b === 51 && octets[2] === 100) return true
    if (a === 203 && b === 0 && octets[2] === 113) return true
    if (a >= 224) return true
    return false
  }
  // IPv6：::1 / :: / ULA fc00::/7 / 链路本地 fe80::/10 / 组播 ff00::/8
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::' || lower.startsWith('::ffff:0:0')) return true
  if (/^fc/.test(lower) || /^fd/.test(lower)) return true
  if (/^fe[89ab]/.test(lower)) return true
  if (lower.startsWith('ff')) return true
  return false
}

/** 主机名黑名单：localhost 与内网专用顶级域 */
const BLOCKED_HOSTNAME_RE = /(^|\.)(localhost|local|internal|home|lan|corp)(\.|$)|^localhost$/i

/**
 * 校验远程 URL 可安全访问（SSRF 防护）：
 * 1. 仅允许 http/https
 * 2. IP 字面量：直接拒绝内网/保留地址
 * 3. 主机名：黑名单（localhost 等）+ DNS 解析后逐一校验（防 DNS rebinding 至内网）
 */
export async function assertSafeRemoteUrl(remoteUrl: string) {
  let url: URL
  try {
    url = new URL(remoteUrl)
  } catch {
    throw new Error('非法的远程 URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('仅允许 http/https 协议的远程图片')
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error('不允许访问内网地址')
    }
    return
  }
  if (BLOCKED_HOSTNAME_RE.test(hostname)) {
    throw new Error('不允许访问内网主机')
  }
  let addresses: string[] = []
  try {
    addresses = (await lookup(hostname, { all: true })).map(r => r.address)
  } catch {
    throw new Error('无法解析远程地址')
  }
  if (addresses.length === 0 || addresses.some(addr => isIP(addr) && isPrivateAddress(addr))) {
    throw new Error('不允许访问内网地址')
  }
}

/** 图片 magic number 白名单：返回 MIME 或 null（非图片） */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image/png'
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif'
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4D) return 'image/bmp'
  return null
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
  // H2 SSRF 防护：协议 + 内网地址校验（IP 字面量 / 主机名黑名单 / DNS 解析后校验）
  await assertSafeRemoteUrl(remoteUrl)

  const arrayBuffer = await $fetch<ArrayBuffer>(remoteUrl, {
    method: 'GET',
    timeout: 10000,
    responseType: 'arrayBuffer',
    headers: { 'User-Agent': 'Mozilla/5.0 (Node-Nitro)' },
  })

  const originBuffer = Buffer.from(arrayBuffer)
  const urlObj = new URL(remoteUrl)
  const originNameRaw = urlObj.pathname.split('/').pop() || 'image'

  // H2 图片格式白名单：仅接受真实图片 magic number（非图片内容直接拒绝，避免解析内部服务响应）
  if (!sniffImageMime(originBuffer)) {
    throw new Error('远程内容不是有效的图片文件')
  }

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
