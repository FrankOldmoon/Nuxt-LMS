/**
 * 图片压缩工具测试
 * @see modules/base/utils/compressImage.ts
 *
 * happy-dom 环境下 browser-image-compression 不依赖 DOM，
 * 用 mock Image / canvas / worker 即可。
 */
import { describe, it, expect, vi } from 'vitest'

// 模拟 browser-image-compression：直接返回原文件（避免实际 WASM 加载）
vi.mock('browser-image-compression', () => {
  return {
    default: vi.fn(async (file: File, _opts: any) => {
      // 模拟压缩后的更小文件
      return new File([new Blob(['compressed-data'])], 'compressed.webp', { type: 'image/webp' })
    }),
  }
})

// 模拟全局 $fetch（nuxt-stubs 提供 stub）
// 这里通过 nuxt-stubs 不再注入，使用 nuxt-stubs.ts 中的 $fetch

describe('utils/compressImage', () => {
  it('compressImage 返回压缩后的 File 对象', async () => {
    const { compressImage } = await import('../../utils/compressImage')
    const originalFile = new File([new Blob(['original-data-very-large'])], 'photo.png', { type: 'image/png' })
    const compressed = await compressImage(originalFile)
    expect(compressed).toBeInstanceOf(File)
    expect(compressed.name).toBe('photo.webp') // 重命名为 webp
  })

  it('compressImage 接受自定义选项', async () => {
    const { compressImage } = await import('../../utils/compressImage')
    const file = new File([new Blob(['test'])], 'test.jpg', { type: 'image/jpeg' })
    const result = await compressImage(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      quality: 0.5,
      fileType: 'image/jpeg',
    })
    expect(result).toBeInstanceOf(File)
    // fileType 不是 webp 时不重命名
    expect(result.name).toBe('test.jpg')
  })

  it('压缩后变大时返回原文件', async () => {
    // 覆盖 mock 让压缩后 size > 原 size
    const imageCompression = (await import('browser-image-compression')).default
    const originalFn = (imageCompression as any).getMockImplementation()
    ;(imageCompression as any).mockImplementationOnce(async (file: File) => {
      // 返回比原文件更大的 file
      const big = new File([new ArrayBuffer(1024 * 1024 * 10)], file.name, { type: file.type })
      return big
    })
    const { compressImage } = await import('../../utils/compressImage')
    const file = new File([new Blob(['x'])], 'a.png', { type: 'image/png' })
    const result = await compressImage(file)
    expect(result).toBe(file) // 返回原文件
  })

  it('压缩失败时返回原文件', async () => {
    const imageCompression = (await import('browser-image-compression')).default
    ;(imageCompression as any).mockImplementationOnce(async () => {
      throw new Error('compression failed')
    })
    const { compressImage } = await import('../../utils/compressImage')
    const file = new File([new Blob(['x'])], 'a.png', { type: 'image/png' })
    const result = await compressImage(file)
    expect(result).toBe(file)
  })

  it('compressAndUpload 上传成功返回 url', async () => {
    const { compressAndUpload } = await import('../../utils/compressImage')
    const { setMockFetchHandler, resetAllStubs } = await import('../../../../test/setup/nuxt-stubs')
    resetAllStubs()
    setMockFetchHandler(async (url, _opts) => {
      if (url === '/api/files/upload') {
        return { data: { url: 'https://cdn.example.com/uploaded.webp' }, success: true, msg: '' }
      }
      return { data: null, success: false, msg: 'unknown' }
    })
    const file = new File([new Blob(['test'])], 'a.png', { type: 'image/png' })
    const url = await compressAndUpload(file)
    expect(url).toBe('https://cdn.example.com/uploaded.webp')
  })

  it('compressAndUpload 上传失败抛错', async () => {
    const { compressAndUpload } = await import('../../utils/compressImage')
    const { setMockFetchHandler, resetAllStubs } = await import('../../../../test/setup/nuxt-stubs')
    resetAllStubs()
    setMockFetchHandler(async () => ({ data: null, success: false, msg: '上传失败' }))
    const file = new File([new Blob(['x'])], 'a.png', { type: 'image/png' })
    await expect(compressAndUpload(file)).rejects.toThrow('上传失败')
  })
})
