/**
 * Image compression utility tests
 * @see modules/base/utils/compressImage.ts
 *
 * Under happy-dom, browser-image-compression does not depend on DOM,
 * just mock Image / canvas / worker.
 */
import { describe, it, expect, vi } from 'vitest'

// Mock browser-image-compression: directly return original file (avoid actual WASM loading)
vi.mock('browser-image-compression', () => {
  return {
    default: vi.fn(async (file: File, _opts: any) => {
      // Simulate a smaller file after compression
      return new File([new Blob(['compressed-data'])], 'compressed.webp', { type: 'image/webp' })
    }),
  }
})

// Mock global $fetch (nuxt-stubs provides stub)
// Here no longer injected via nuxt-stubs, use $fetch from nuxt-stubs.ts

describe('utils/compressImage', () => {
  it('compressImage 返回压缩后的 File 对象', async () => {
    const { compressImage } = await import('../../utils/compressImage')
    const originalFile = new File([new Blob(['original-data-very-large'])], 'photo.png', { type: 'image/png' })
    const compressed = await compressImage(originalFile)
    expect(compressed).toBeInstanceOf(File)
    expect(compressed.name).toBe('photo.webp') // renamed to webp
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
    // When fileType is not webp, do not rename
    expect(result.name).toBe('test.jpg')
  })

  it('压缩后变大时返回原文件', async () => {
    // Override mock so compressed size > original size
    const imageCompression = (await import('browser-image-compression')).default
    const originalFn = (imageCompression as any).getMockImplementation()
    ;(imageCompression as any).mockImplementationOnce(async (file: File) => {
      // Return a file larger than the original
      const big = new File([new ArrayBuffer(1024 * 1024 * 10)], file.name, { type: file.type })
      return big
    })
    const { compressImage } = await import('../../utils/compressImage')
    const file = new File([new Blob(['x'])], 'a.png', { type: 'image/png' })
    const result = await compressImage(file)
    expect(result).toBe(file) // return original file
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
