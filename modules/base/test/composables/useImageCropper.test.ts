/**
 * composables/useImageCropper tests
 * @see modules/base/composables/useImageCropper.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  // happy-dom provides a real URL.createObjectURL (returns blob:nodedata:...),
  // needs to always be overridden with a mock to assert fixed values
  ;(globalThis as any).URL.createObjectURL = vi.fn(() => 'blob:mock')
  ;(globalThis as any).URL.revokeObjectURL = vi.fn()
})

function makeArgs(overrides: Partial<{ aspectRatio: () => any; stencilType: () => any; onUploaded: (url: string) => void }> = {}) {
  return {
    aspectRatio: overrides.aspectRatio ?? (() => undefined),
    stencilType: overrides.stencilType ?? (() => 'rectangle' as const),
    onUploaded: overrides.onUploaded ?? ((_url: string) => {}),
  }
}

describe('composables/useImageCropper - 初始状态', () => {
  it('internalOpen/uploading 初始为 false', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { internalOpen, uploading, imageSrc } = useImageCropper(...Object.values(makeArgs()) as any)
    expect(internalOpen.value).toBe(false)
    expect(uploading.value).toBe(false)
    expect(imageSrc.value).toBeNull()
  })

  it('暴露 Cropper 组件', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { Cropper } = useImageCropper(...Object.values(makeArgs()) as any)
    expect(Cropper).toBeDefined()
  })
})

describe('composables/useImageCropper - stencil', () => {
  it('stencilType=circle 时 stencil 为 CircleStencil', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { stencil } = useImageCropper(...Object.values(makeArgs({ stencilType: () => 'circle' })) as any)
    expect(stencil.value).toBeDefined()
    expect(stencil.value).toBeTruthy()
  })

  it('stencilType=rectangle 时 stencil 为 RectangleStencil', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { stencil } = useImageCropper(...Object.values(makeArgs({ stencilType: () => 'rectangle' })) as any)
    expect(stencil.value).toBeDefined()
    expect(stencil.value).toBeTruthy()
  })

  it('circle 和 rectangle 返回不同的 stencil', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { stencil: circleStencil } = useImageCropper(...Object.values(makeArgs({ stencilType: () => 'circle' })) as any)
    const { stencil: rectStencil } = useImageCropper(...Object.values(makeArgs({ stencilType: () => 'rectangle' })) as any)
    expect(circleStencil.value).not.toBe(rectStencil.value)
  })
})

describe('composables/useImageCropper - stencilProps', () => {
  it('无 aspectRatio 时返回空对象', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { stencilProps } = useImageCropper(...Object.values(makeArgs({ aspectRatio: () => undefined })) as any)
    expect(stencilProps.value).toEqual({})
  })

  it('有 aspectRatio 时返回 { aspectRatio }', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { stencilProps } = useImageCropper(...Object.values(makeArgs({ aspectRatio: () => 1 })) as any)
    expect(stencilProps.value).toEqual({ aspectRatio: 1 })
  })
})

describe('composables/useImageCropper - setImage', () => {
  it('setImage 设置 imageSrc 并打开弹窗', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { setImage, internalOpen, imageSrc } = useImageCropper(...Object.values(makeArgs()) as any)
    const file = new File(['img'], 'pic.jpg', { type: 'image/jpeg' })
    setImage(file)
    expect(internalOpen.value).toBe(true)
    expect(imageSrc.value).toBe('blob:mock')
  })
})

describe('composables/useImageCropper - close', () => {
  it('close 关闭弹窗并清空 imageSrc', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { setImage, close, internalOpen, imageSrc } = useImageCropper(...Object.values(makeArgs()) as any)
    setImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    close()
    expect(internalOpen.value).toBe(false)
    expect(imageSrc.value).toBeNull()
  })
})

describe('composables/useImageCropper - handleCrop', () => {
  it('无 cropperRef 时直接返回', async () => {
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { handleCrop, uploading } = useImageCropper(...Object.values(makeArgs()) as any)
    await handleCrop()
    expect(uploading.value).toBe(false)
  })

  it('裁剪成功后调用 onUploaded 并关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: { url: 'http://cdn.com/cropped.webp' }, success: true, msg: '' }))
    const { useImageCropper } = await import('../../composables/useImageCropper')
    let uploadedUrl = ''
    const args = makeArgs({ onUploaded: (url) => { uploadedUrl = url } })
    const { setImage, handleCrop, cropperRef, internalOpen, uploading } = useImageCropper(...Object.values(args) as any)
    const file = new File(['img'], 'pic.png', { type: 'image/png' })
    setImage(file)
    // Simulate the cropper's getResult
    cropperRef.value = {
      getResult: () => ({
        canvas: {
          toBlob: (cb: (b: Blob) => void) => cb(new Blob(['webp'], { type: 'image/webp' })),
        },
      }),
    }
    await handleCrop()
    expect(uploadedUrl).toBe('http://cdn.com/cropped.webp')
    expect(internalOpen.value).toBe(false)
    expect(uploading.value).toBe(false)
  })

  it('上传失败时弹错误 toast', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'upload failed' }))
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { setImage, handleCrop, cropperRef } = useImageCropper(...Object.values(makeArgs()) as any)
    setImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    cropperRef.value = {
      getResult: () => ({ canvas: { toBlob: (cb: (b: Blob) => void) => cb(new Blob(['x'])) } }),
    }
    await handleCrop()
    const calls = getToastCalls()
    expect(calls[0].color).toBe('error')
    expect(calls[0].title).toBe('upload failed')
  })

  it('裁剪文件名替换为 .webp', async () => {
    let capturedFormData: any
    setMockFetchHandler(async (_url, opts: any) => {
      capturedFormData = opts.body
      return { data: { url: 'http://x/a.webp' }, success: true, msg: '' }
    })
    const { useImageCropper } = await import('../../composables/useImageCropper')
    const { setImage, handleCrop, cropperRef } = useImageCropper(...Object.values(makeArgs()) as any)
    setImage(new File(['x'], 'photo.JPG', { type: 'image/jpeg' }))
    cropperRef.value = {
      getResult: () => ({ canvas: { toBlob: (cb: (b: Blob) => void) => cb(new Blob(['x'])) } }),
    }
    await handleCrop()
    const croppedFile = capturedFormData.get('files')
    expect(croppedFile.name).toBe('photo.webp')
  })
})
