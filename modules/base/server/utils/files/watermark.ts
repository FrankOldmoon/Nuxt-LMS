/**
 * 图片水印：给上传图片的右下角叠加半透明 logo（public/logo.webp）
 *
 * 为什么在服务端做：
 * - 图片经 /api/files/serve 统一出口，服务端叠加一次即可覆盖所有引用点
 *   （富文本、作业附件、课程封面、文件列表预览…），前端无需改造；
 * - 上传时改文件会破坏「内容寻址 + 秒传去重」（hash 与文件内容绑定），
 *   也会让历史文件失去水印，故不改上传流程。
 *
 * 设计要点：
 * - 只在「可安全重编码」的光栅格式上加水印（jpg/png/webp/avif/tiff）；
 *   SVG 是矢量（重编码会破坏缩放与 CSP 策略）、GIF/动态 WebP 是多帧（叠加会破坏动画），
 *   一律跳过，按原文件返回。
 * - 头像不走水印（调用方传入 isAvatar 判定，头像属个人隐私且需原图）。
 * - 输出按文件 mtime+size 做进程内 LRU 缓存，同一张图只解码一次；
 *   并发解码限制为 2，避免大图批量请求把内存打满。
 * - 任何失败（logo 缺失、文件损坏、超像素上限）都返回 null，
 *   由调用方回退到原始文件流，绝不因为水印导致图片 500。
 */
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

/** 允许加水印的扩展名（均为可安全重编码的单帧光栅格式） */
export const WATERMARK_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'])

/** 水印不透明度（需求：20%） */
export const WATERMARK_OPACITY = 0.2

/**
 * 水印尺寸上限：长、宽分别不超过原图的 5%（两者同时约束，取更严的一边）。
 * logo 是竖版 1288×2332（宽高比 ≈ 0.552），按高度上限换算宽度通常才是实际生效的那一边。
 */
const MAX_SIZE_RATIO = 0.05
/** 小于该宽度就不画了（再小只是几个像素的噪点，没有识别意义） */
const MIN_MARK_WIDTH = 4
/** 水印与图片边缘的留白：取短边的 3%，且不小于 8px */
const MARGIN_RATIO = 0.03
const MARGIN_MIN = 8
/** 超过该像素数不做水印（解码内存保护，约 40MP） */
const MAX_PIXELS = 40_000_000
/** 缓存上限 */
const CACHE_MAX_BYTES = 96 * 1024 * 1024
const CACHE_MAX_ENTRIES = 200
/** 同时解码的图片数 */
const MAX_CONCURRENCY = 2

type Pipeline = ReturnType<typeof sharp>

/** 该扩展名是否需要加水印 */
export function isWatermarkableImage(ext: string): boolean {
  return WATERMARK_EXTS.has(String(ext || '').toLowerCase())
}

/** logo 候选路径：dev 用 public/，生产可能读 .output/public/ 或相对 server 产物 */
export function resolveLogoPath(): string | null {
  const candidates = [
    resolve(process.cwd(), 'public/logo.webp'),
    resolve(process.cwd(), '.output/public/logo.webp'),
    resolve(process.cwd(), '../public/logo.webp'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

interface LogoInfo {
  buf: Buffer
  width: number
  height: number
}

let logoPromise: Promise<LogoInfo | null> | null = null
let logoWarned = false

/** 读取 logo 源图与尺寸（进程内只读一次；缺失时返回 null 并只告警一次） */
async function loadLogo(): Promise<LogoInfo | null> {
  if (!logoPromise) {
    logoPromise = (async () => {
      const path = resolveLogoPath()
      if (!path) {
        if (!logoWarned) {
          console.warn('[watermark] 未找到 public/logo.webp，图片水印已跳过')
          logoWarned = true
        }
        return null
      }
      try {
        const buf = await readFile(path)
        const meta = await sharp(buf).metadata()
        if (!meta.width || !meta.height) return null
        return { buf, width: meta.width, height: meta.height }
      } catch (e) {
        if (!logoWarned) {
          console.warn('[watermark] 读取 logo 失败，图片水印已跳过', e)
          logoWarned = true
        }
        return null
      }
    })()
  }
  return logoPromise
}

/** 已按宽度渲染好的水印（宽度取整到 8px 分桶，减少重复渲染） */
const markCache = new Map<number, { buf: Buffer; width: number; height: number }>()

/**
 * 把 logo 缩放为目标宽度，并把 alpha 通道整体乘 WATERMARK_OPACITY。
 * 直接改 raw alpha 比 linear()/ensureAlpha() 更可靠：logo 自身带透明像素时
 * 前者只会等比削弱，后者不会覆盖已有 alpha。
 */
async function renderMark(logo: Buffer, targetWidth: number) {
  const width = Math.max(1, Math.round(targetWidth))
  const cached = markCache.get(width)
  if (cached) return cached

  const { data, info } = await sharp(logo)
    .resize({ width, fit: 'inside', withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i]! * WATERMARK_OPACITY)
  }

  const buf = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer()

  const mark = { buf, width: info.width, height: info.height }
  if (markCache.size < 64) markCache.set(width, mark)
  return mark
}

/**
 * 计算水印渲染宽度：宽、高分别不超过原图的 5%，取更严的一边。
 * logo 是竖版（1288×2332），高 5% 通常比宽 5% 更早触顶，因此实际以高度为准。
 */
function markWidthFor(logo: LogoInfo, width: number, height: number): number {
  const aspect = logo.width / logo.height // 宽 / 高
  const byWidth = width * MAX_SIZE_RATIO
  const byHeight = height * MAX_SIZE_RATIO * aspect
  return Math.floor(Math.min(byWidth, byHeight))
}

/** 按扩展名选择编码参数，尽量贴近原图体积 */
function encode(pipeline: Pipeline, ext: string): Pipeline {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return pipeline.jpeg({ quality: 82, mozjpeg: true })
    case '.webp':
      return pipeline.webp({ quality: 82 })
    case '.avif':
      return pipeline.avif({ quality: 55 })
    case '.tif':
    case '.tiff':
      return pipeline.tiff({ quality: 82 })
    default:
      return pipeline.png()
  }
}

/** LRU：key = 路径 + mtime + size */
const cache = new Map<string, Buffer>()
let cacheBytes = 0

function cacheGet(key: string): Buffer | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  // 刷新 LRU 顺序
  cache.delete(key)
  cache.set(key, hit)
  return hit
}

function cacheSet(key: string, buf: Buffer) {
  if (buf.length > CACHE_MAX_BYTES / 4) return // 单张过大不进缓存
  cache.set(key, buf)
  cacheBytes += buf.length
  while ((cacheBytes > CACHE_MAX_BYTES || cache.size > CACHE_MAX_ENTRIES) && cache.size > 1) {
    const oldest = cache.keys().next().value as string | undefined
    if (oldest === undefined) break
    const evicted = cache.get(oldest)
    cache.delete(oldest)
    if (evicted) cacheBytes -= evicted.length
  }
}

/** 清空缓存（测试 / 更换 logo 后手动失效） */
export function clearWatermarkCache() {
  cache.clear()
  markCache.clear()
  cacheBytes = 0
  logoPromise = null
  logoWarned = false
}

// ---------- 并发闸门 ----------
let active = 0
const waiters: Array<() => void> = []

async function acquire() {
  if (active < MAX_CONCURRENCY) {
    active++
    return
  }
  await new Promise<void>((r) => waiters.push(r))
}

function release() {
  const next = waiters.shift()
  if (next) {
    next() // 名额直接转交，active 不变
    return
  }
  active--
}

/** 同一文件的并发请求合并为一次解码 */
const inflight = new Map<string, Promise<Buffer | null>>()

/**
 * 生成带水印的图片 Buffer。
 * @returns 水印图 Buffer；不可处理（格式不支持 / logo 缺失 / 解码失败 / 超限）时返回 null
 */
export async function applyWatermark(absolutePath: string, ext: string): Promise<Buffer | null> {
  const e = String(ext || '').toLowerCase()
  if (!isWatermarkableImage(e)) return null

  let st
  try {
    st = await stat(absolutePath)
  } catch {
    return null
  }
  if (!st.isFile() || st.size === 0) return null

  const key = `${absolutePath}\u0000${st.mtimeMs}\u0000${st.size}`
  const hit = cacheGet(key)
  if (hit) return hit

  const pending = inflight.get(key)
  if (pending) return pending

  const task = (async (): Promise<Buffer | null> => {
    const logo = await loadLogo()
    if (!logo) return null

    await acquire()
    try {
      const meta = await sharp(absolutePath).metadata()
      // 多帧（GIF / 动态 WebP）不做水印：叠加会破坏动画
      if ((meta.pages || 1) > 1) return null

      let width = meta.width || 0
      let height = meta.height || 0
      // 5-8 表示带 90°/270° 旋转的 EXIF 方向：先按展示方向换算，再 rotate() 后坐标才对齐
      if (meta.orientation && meta.orientation >= 5) {
        [width, height] = [height, width]
      }
      if (!width || !height) return null
      if (width * height > MAX_PIXELS) return null

      const targetW = markWidthFor(logo, width, height)
      // 图太小（水印不足 4px）就不画，几个像素只会变成噪点
      if (targetW < MIN_MARK_WIDTH) return null

      const mark = await renderMark(logo.buf, targetW)
      // 兜底：超出画布（sharp 会直接报错）或超出 5% 上限则不合成
      if (!mark.width || !mark.height || mark.width > width || mark.height > height) return null
      if (
        mark.width > Math.ceil(width * MAX_SIZE_RATIO)
        || mark.height > Math.ceil(height * MAX_SIZE_RATIO)
      ) return null

      const margin = Math.max(MARGIN_MIN, Math.round(Math.min(width, height) * MARGIN_RATIO))
      const left = Math.max(0, width - mark.width - margin)
      const top = Math.max(0, height - mark.height - margin)

      const pipeline = encode(
        sharp(absolutePath, { failOn: 'none' }).rotate().composite([
          { input: mark.buf, left, top, blend: 'over' },
        ]),
        e,
      )
      // 原图无 alpha 时丢掉合成引入的 alpha 通道（否则 PNG 会白白多一通道、体积变大）
      const out = await (meta.hasAlpha ? pipeline : pipeline.removeAlpha()).toBuffer()
      cacheSet(key, out)
      return out
    } catch (err) {
      console.warn('[watermark] 水印生成失败，回退原图', absolutePath, err)
      return null
    } finally {
      release()
    }
  })()

  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}
