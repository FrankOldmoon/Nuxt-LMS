/**
 * 图片水印工具测试
 * @see modules/base/server/utils/files/watermark.ts
 *
 * 用 sharp 现场生成图片，验证：
 * - 格式白名单（矢量/多帧不处理）
 * - 右下角像素确实被改写、左上角不受影响、尺寸不变
 * - 缓存命中（同一文件只解码一次）
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import sharp from 'sharp'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { applyWatermark, isWatermarkableImage, clearWatermarkCache, MAX_SIZE_RATIO, WATERMARK_OPACITY } from '../../server/utils/files/watermark'

let dir = ''

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'wm-test-'))
})

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
})

describe('watermark: isWatermarkableImage', () => {
  it('光栅单帧格式返回 true', () => {
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.tif', '.tiff', '.PNG']) {
      expect(isWatermarkableImage(ext)).toBe(true)
    }
  })

  it('矢量 / 多帧 / 非图片返回 false', () => {
    for (const ext of ['.svg', '.gif', '.mp4', '.pdf', '.ico', '']) {
      expect(isWatermarkableImage(ext)).toBe(false)
    }
  })
})

describe('watermark: applyWatermark', () => {
  it('非白名单格式直接返回 null（不重编码）', async () => {
    const p = join(dir, 'a.gif')
    await writeFile(p, Buffer.from('GIF89a'))
    expect(await applyWatermark(p, '.gif')).toBeNull()
  })

  it('文件不存在返回 null（不抛错）', async () => {
    expect(await applyWatermark(join(dir, 'nope.png'), '.png')).toBeNull()
  })

  it('PNG：右下角被叠加水印，左上角与尺寸保持不变', async () => {
    const src = join(dir, 'plain.png')
    await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 40, g: 90, b: 200 } },
    }).png().toFile(src)

    const out = await applyWatermark(src, '.png')
    expect(out).toBeInstanceOf(Buffer)
    expect(out!.length).toBeGreaterThan(0)

    const before = await sharp(src).raw().toBuffer({ resolveWithObject: true })
    const after = await sharp(out!).raw().toBuffer({ resolveWithObject: true })

    // 尺寸不变
    expect(after.info.width).toBe(before.info.width)
    expect(after.info.height).toBe(before.info.height)

    const ch = after.info.channels
    const px = (buf: Buffer, x: number, y: number, channels = ch) => {
      const i = (y * after.info.width + x) * channels
      return [buf[i], buf[i + 1], buf[i + 2]]
    }

    // 左上角（无水印区）像素不变
    expect(px(after.data, 2, 2)).toEqual(px(before.data, 2, 2, before.info.channels))

    // 右下角区域存在被改写的像素
    let changed = 0
    const w = after.info.width
    const h = after.info.height
    for (let y = Math.floor(h * 0.7); y < h; y++) {
      for (let x = Math.floor(w * 0.7); x < w; x++) {
        const a = px(after.data, x, y)
        const b = px(before.data, x, y)
        if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) changed++
      }
    }
    expect(changed).toBeGreaterThan(0)
  })

  it('JPEG：重编码后仍为 JPEG', async () => {
    const src = join(dir, 'plain.jpg')
    await sharp({
      create: { width: 320, height: 240, channels: 3, background: { r: 200, g: 200, b: 200 } },
    }).jpeg().toFile(src)

    const out = await applyWatermark(src, '.jpg')
    expect(out).toBeInstanceOf(Buffer)
    const meta = await sharp(out!).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBe(320)
    expect(meta.height).toBe(240)
  })

  it('尺寸约束：水印外接框宽、高都不超过原图的 5%，且贴右下角', async () => {
    const src = join(dir, 'size.png')
    await sharp({
      create: { width: 1000, height: 600, channels: 3, background: { r: 0, g: 0, b: 0 } },
    }).png().toFile(src)

    const out = await applyWatermark(src, '.png')
    expect(out).toBeInstanceOf(Buffer)

    const before = await sharp(src).raw().toBuffer({ resolveWithObject: true })
    const after = await sharp(out!).raw().toBuffer({ resolveWithObject: true })
    const w = after.info.width
    const h = after.info.height
    const ch = after.info.channels

    let minX = w, minY = h, maxX = -1, maxY = -1, maxVal = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * ch
        const b = (y * w + x) * before.info.channels
        const d = Math.abs(after.data[i]! - before.data[b]!)
          + Math.abs(after.data[i + 1]! - before.data[b + 1]!)
          + Math.abs(after.data[i + 2]! - before.data[b + 2]!)
        if (d === 0) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        maxVal = Math.max(maxVal, after.data[i]!, after.data[i + 1]!, after.data[i + 2]!)
      }
    }

    expect(maxX).toBeGreaterThanOrEqual(0)
    // 宽高各自 ≤ MAX_SIZE_RATIO（+1 容忍渲染取整）
    expect(maxX - minX + 1).toBeLessThanOrEqual(Math.ceil(w * MAX_SIZE_RATIO) + 1)
    expect(maxY - minY + 1).toBeLessThanOrEqual(Math.ceil(h * MAX_SIZE_RATIO) + 1)
    // 贴右下角：起点都落在右下 20% 区域
    expect(minX).toBeGreaterThan(w * 0.8)
    expect(minY).toBeGreaterThan(h * 0.8)
    // 半透明：黑底上最亮像素应接近 255×不透明度，而不是不透明的 255
    expect(maxVal).toBeLessThanOrEqual(Math.ceil(255 * WATERMARK_OPACITY) + 12)
  })

  it('缓存：同一文件第二次调用命中缓存（返回同一 Buffer 实例）', async () => {
    const src = join(dir, 'cache.png')
    await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 10, b: 10 } },
    }).png().toFile(src)

    clearWatermarkCache()
    const a = await applyWatermark(src, '.png')
    const b = await applyWatermark(src, '.png')
    expect(a).toBeInstanceOf(Buffer)
    expect(b).toBe(a)
  })
})
