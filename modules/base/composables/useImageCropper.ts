import { Cropper, CircleStencil, RectangleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

/**
 * 图片裁剪弹窗：设置图片 + 裁剪 + 上传
 */
export function useImageCropper(
  aspectRatio: () => number | null | undefined,
  stencilType: () => 'circle' | 'rectangle' | undefined,
  onUploaded: (url: string) => void,
  outputSize?: () => { width: number; height: number } | null | undefined,
) {
  const internalOpen = ref(false)
  const imageSrc = ref<string | null>(null)
  const originalFile = ref<File | null>(null)
  const uploading = ref(false)
  const cropperRef = ref<any>(null)

  const stencil = computed(() =>
    stencilType() === 'circle' ? CircleStencil : RectangleStencil,
  )
  const stencilProps = computed(() => {
    if (aspectRatio()) return { aspectRatio: aspectRatio() }
    return {}
  })

  function setImage(file: File) {
    originalFile.value = file
    imageSrc.value = URL.createObjectURL(file)
    internalOpen.value = true
  }

  function close() {
    internalOpen.value = false
    if (imageSrc.value) {
      URL.revokeObjectURL(imageSrc.value)
      imageSrc.value = null
      originalFile.value = null
    }
  }

  async function handleCrop() {
    if (!cropperRef.value || !originalFile.value) return

    uploading.value = true
    try {
      const { canvas } = cropperRef.value.getResult()
      const finalCanvas = applyOutputSize(canvas, outputSize?.() ?? null)

      const blob = await new Promise<Blob>((resolve) => {
        finalCanvas.toBlob(resolve, 'image/webp', 0.8)
      })

      const webpName = originalFile.value.name.replace(/\.(png|jpg|jpeg|gif|bmp|webp)$/i, '.webp')
      const croppedFile = new File([blob], webpName, { type: 'image/webp' })

      const formData = new FormData()
      formData.append('files', croppedFile)
      const res = await $fetch<{ data: { url: string }; success: boolean; msg: string }>('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.success) {
        throw new Error(res.msg || '上传失败')
      }

      onUploaded(res.data.url)
      close()
    } catch (e: any) {
      useToast().add({ title: e.message || '裁剪上传失败', color: 'error' })
    } finally {
      uploading.value = false
    }
  }

  return {
    Cropper,
    internalOpen, imageSrc, cropperRef, uploading,
    stencil, stencilProps,
    setImage, close, handleCrop,
  }
}

/**
 * 将裁剪结果 canvas 缩放到指定尺寸（如头像 128x128）；不传 size 则原样返回
 */
function applyOutputSize(
  src: HTMLCanvasElement,
  size: { width: number; height: number } | null | undefined,
): HTMLCanvasElement {
  if (!size) return src
  const target = document.createElement('canvas')
  target.width = size.width
  target.height = size.height
  const ctx = target.getContext('2d')
  if (!ctx) return src
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, size.width, size.height)
  return target
}
